# Package Mempool Accept

## Definitions

A **package** is an ordered list of transactions, representable by a connected Directed Acyclic
Graph (a directed edge exists between a transaction that spends the output of another transaction).

For every transaction `t` in a **topologically sorted** package, if any of its parents are present
in the package, they appear somewhere in the list before `t`.

A **child-with-unconfirmed-parents** package is a topologically sorted package that consists of
exactly one child and all of its unconfirmed parents (no other transactions may be present).
The last transaction in the package is the child, and its package can be canonically defined based
on the current state: each of its inputs must be available in the UTXO set as of the current chain
tip or some preceding transaction in the package.

## Package Mempool Acceptance Rules

The following rules are enforced for all packages:

* Packages cannot exceed `MAX_PACKAGE_COUNT=50` count and `MAX_PACKAGE_SIZE=101KvB` total size

   - *Rationale*: This is already enforced as mempool ancestor/descendant limits. If
     transactions in a package are all related, exceeding this limit would mean that the package
     can either be split up or it wouldn't pass individual mempool policy.

   - Note that, if these mempool limits change, package limits should be reconsidered. Users may
     also configure their mempool limits differently.

* Packages must be topologically sorted.

* Packages cannot have conflicting transactions, i.e. no two transactions in a package can spend
   the same inputs. Packages cannot have duplicate transactions.

* No transaction in a package can conflict with a mempool transaction.

* When packages are evaluated against ancestor/descendant limits, the union of all transactions'
  descendants and ancestors is considered.

   - *Rationale*: This is essentially a "worst case" heuristic intended for packages that are
     heavily connected, i.e. some transaction in the package is the ancestor or descendant of all
     the other transactions.

The following rules are only enforced for packages to be submitted to the mempool (not enforced for
test accepts):

* Packages must be child-with-unconfirmed-parents packages. This also means packages must contain at
  least 2 transactions.

   - *Rationale*: This allows for fee-bumping by CPFP. Allowing multiple parents makes it possible
     to fee-bump a batch of transactions. Restricting packages to a defined topology is easier to
     reason about and simplifies the validation logic greatly.

   - Warning: Batched fee-bumping may be unsafe for some use cases. Users and application developers
     should take caution if utilizing multi-parent packages.

* Transactions in the package that have the same txid as another transaction already in the mempool
  will be removed from the package prior to submission ("deduplication").

   - *Rationale*: Node operators are free to set their mempool policies however they please, nodes
     may receive transactions in different orders, and malicious counterparties may try to take
     advantage of policy differences to pin or delay propagation of transactions. As such, it's
     possible for some package transaction(s) to already be in the mempool, and there is no need to
     repeat validation for those transactions or double-count them in fees.

   - *Rationale*: We want to prevent potential censorship vectors. We should not reject entire
     packages because we already have one of the transactions. Also, if an attacker first broadcasts
     a competing package or transaction, even though the two transactions are conflicting and cannot
     replace each other, the honest package should still be considered for acceptance.

### Package Fees and Feerate

*Package Feerate* is the total modified fees (base fees + any fee delta from
`prioritisetransaction`) divided by the total virtual size of all transactions in the package.
If any transactions in the package are already in the mempool, they are not submitted again
("deduplicated") and are thus excluded from this calculation.

To meet the dynamic mempool minimum feerate, i.e., the feerate determined by the transactions
evicted when the mempool reaches capacity (not the static minimum relay feerate), the total package
feerate instead of individual feerate can be used. For example, if the mempool minimum feerate is
5sat/vB and a 1sat/vB parent transaction has a high-feerate child, it may be accepted if
submitted as a package.

*Rationale*: This can be thought of as "CPFP within a package," solving the issue of a presigned
transaction (i.e. in which a replacement transaction with a higher fee cannot be signed) being
rejected from the mempool when transaction volume is high and the mempool minimum feerate rises.

Note: Package feerate cannot be used to meet the minimum relay feerate (`-minrelaytxfee`)
requirement. For example, if the mempool minimum feerate is 5sat/vB and the minimum relay feerate is
set to 5sat/B, a 1sat/B parent transaction with a high-feerate child will not be accepted, even if
submitted as a package.

*Rationale*: Avoid situations in which the mempool contains non-bumped transactions below min relay
feerate (which we consider to have pay 0 fees and thus receiving free relay). While package
submission would ensure these transactions are bumped at the time of entry, it is not guaranteed
that the transaction will always be bumped. For example, a later transaction could replace the
fee-bumping child without still bumping the parent. These no-longer-bumped transactions should be
removed during a replacement, but we do not have a DoS-resistant way of removing them or enforcing a
limit on their quantity. Instead, prevent their entry into the mempool.

Implementation Note: Transactions within a package are always validated individually first, and
package validation is used for the transactions that failed. Since package feerate is only
calculated using transactions that are not in the mempool, this implementation detail affects the
outcome of package validation.

*Rationale*: It would be incorrect to use the fees of transactions that are already in the mempool, as
we do not want a transaction's fees to be double-counted.

*Rationale*: Packages are intended for incentive-compatible fee-bumping: transaction B is a
"legitimate" fee-bump for transaction A only if B is a descendant of A and has a *higher* feerate
than A. We want to prevent "parents pay for children" behavior; fees of parents should not help
their children, since the parents can be mined without the child.  More generally, if transaction A
is not needed in order for transaction B to be mined, A's fees cannot help B. In a
child-with-parents package, simply excluding any parent transactions that meet feerate requirements
individually is sufficient to ensure this.

*Rationale*: We must not allow a low-feerate child to prevent its parent from being accepted; fees
of children should not negatively impact their parents, since they are not necessary for the parents
to be mined. More generally, if transaction B is not needed in order for transaction A to be mined,
B's fees cannot harm A. In a child-with-parents package, simply validating parents individually
first is sufficient to ensure this.

*Rationale*: As a principle, we want to avoid accidentally restricting policy in order to be
backward-compatible for users and applications that rely on p2p transaction relay. Concretely,
package validation should not prevent the acceptance of a transaction that would otherwise be
policy-valid on its own. By always accepting a transaction that passes individual validation before
trying package validation, we prevent any unintentional restriction of policy.
