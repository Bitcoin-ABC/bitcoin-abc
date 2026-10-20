# alp-fusion privacy expectations

## Abstract

Alp-fusion is worth building.

A completed round hides which input paid which output. The amounts stay on
the ledger. Anyone can count the supply of a token.

That hiding reaches the published counts for Monero and for Zcash.

Monero hides one spend among 16 outputs. One fusion round of 16
participants, one input each, leaves 16 possible sources. A possible source
is an input an observer cannot rule out. That round fits in one transaction.

Zcash, for a small common amount, has thousands of shields into Orchard or
Ironwood that moved at least that amount. Fusion reaches that count when
that many different inputs have entered its rounds. Fusing the same inputs
again does not raise the count. New inputs do.

The control session is separate from the coin data. The covert channel
carries the coin data over Tor. The coordinator does not learn which control
session owns which input.

## Terms

| Symbol | Meaning                                                                           |
| ------ | --------------------------------------------------------------------------------- |
| `N`    | Participants in one round. Each contributes one eligible input.                   |
| `U`    | Distinct eligible inputs that have entered rounds for this token and amount tier. |
| `R`    | Successive rounds completed by the same coins.                                    |

A participant contributes one input in a round, and may contribute a
different input in a later round. Each new input raises `U`.

The default value of `N` is 8. A round starts when `N` participants are
online.

## One round

One round of `N` participants leaves `N` possible sources for each fused
output. Two conditions apply. Output amounts do not identify an owner.
Outputs pay fresh addresses.

A spend that joins a fused output to an unfused output keeps the history of
the unfused output.

## Further rounds

A later round adds a source only by adding an input the observer cannot
already rule out.

The same inputs, fused again, still leave the same number of sources.

A second round of 8 that adds 7 new inputs leaves at most 15 sources.

`N^R` counts linkage paths, not distinct inputs. It applies only when every
input in each later round comes from its own separate fusion of size `N`,
with no shared inputs. Distinct sources cannot exceed `U`.

## Transaction size

One ALP transaction holds at most 29 token outputs. The cap limits outputs,
not participants. Budgets for one transaction are in [SPEC.md](./SPEC.md).

| Participants | Token outputs each | Token outputs | Fits in one transaction |
| ------------ | ------------------ | ------------- | ----------------------- |
| 8            | 3                  | 24            | yes                     |
| 8            | 4                  | 32            | no                      |
| 12           | 2                  | 24            | yes                     |
| 16           | 1                  | 16            | yes                     |

## Monero

The Monero ring size is 16. The ring is the spent output plus 15 others
([ring size](https://www.getmonero.org/resources/moneropedia/ring-size.html)).

| Case                               | Possible sources |
| ---------------------------------- | ---------------- |
| One round of 16                    | 16               |
| One round of 8                     | 8                |
| Two rounds of 8, with 7 new inputs | 15               |

One round of 16 has the same count as the ring. Two rounds of 8 do not.

## Zcash

The linked chart counts shields into Orchard or Ironwood that moved at least
a chosen amount. The count is the full history of those shields. It does not
shrink. The chart calls it a lower bound on deshield cover. Small common
amounts have thousands of such shields. Unusual amounts have fewer
([shielded anonymity set](https://zecstats.com/chart/anonymity)).

The fusion count is `U`, the distinct inputs that have entered the rounds.
New inputs raise it. The same inputs do not.

## Result

| Published count                       | What reaches it                                       |
| ------------------------------------- | ----------------------------------------------------- |
| Monero ring of 16                     | One round of 16 participants, one input each.         |
| Zcash count for a small common amount | That many distinct inputs admitted across the rounds. |

Both counts are reachable. Amounts stay visible, so the supply of the token
stays auditable. That is why alp-fusion is worth building.
