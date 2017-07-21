Bitcoin ABC UAHF-relevant DNS seed information
==============================================

Bitcoin ABC uses special seeds under the control of the
UAHF supporting operators, to increase the chance of a smooth
separation of the UAHF network from the non-UAHF-supporting
parts of the network.

The seeds used by ABC should distribute peers fairly but in a
manner which increases the likelihood that ABC nodes are able
to connect to UAHF compatible peers.

This may mean that in the beginning, they might serve only
peers that are known to be compatible with UAHF.
Over time, once the UAHF network is stable, criteria in these
peers may be relaxed to approach regular Bitcoin network
conditions and expectations.


General expectations for DNS Seed operators
===========================================

Bitcoin attempts to minimize the level of trust in DNS seeds,
but DNS seeds still pose a small amount of risk for the network.
As such, DNS seeds must be run by entities which have some minimum
level of trust within the Bitcoin community.

Other implementations of Bitcoin software may also use the same
seeds and may be more exposed. In light of this exposure, this
document establishes some basic expectations for operating dnsseeds.

0. A DNS seed operating organization or person is expected to follow good
host security practices, maintain control of applicable infrastructure,
and not sell or transfer control of the DNS seed. Any hosting services
contracted by the operator are equally expected to uphold these expectations.

1. The DNS seed results must consist exclusively of fairly selected and
functioning Bitcoin nodes from the public network to the best of the
operator's understanding and capability.

2. For the avoidance of doubt, the results may be randomized but must not
single-out any group of hosts to receive different results unless due to an
urgent technical necessity and disclosed.

3. The results may not be served with a DNS TTL of less than one minute.

4. Any logging of DNS queries should be only that which is necessary
for the operation of the service or urgent health of the Bitcoin
network and must not be retained longer than necessary nor disclosed
to any third party.

5. Information gathered as a result of the operators node-spidering
(not from DNS queries) may be freely published or retained, but only
if this data was not made more complete by biasing node connectivity
(a violation of expectation (1)).

6. Operators are encouraged, but not required, to publicly document the
details of their operating practices.

7. A reachable email contact address must be published for inquiries
related to the DNS seed operation.

If these expectations cannot be satisfied the operator should
discontinue providing services and contact the active Bitcoin
development teams as well as posting on
[bitcoin-dev](https://lists.linuxfoundation.org/mailman/listinfo/bitcoin-dev).
and
[bitcoin-ml](https://lists.linuxfoundation.org/mailman/listinfo/bitcoin-ml).

Behavior outside of these expectations may be reasonable in some
situations but should be discussed in public in advance.

See also
----------
- [bitcoin-seeder](https://github.com/sipa/bitcoin-seeder) is a reference implementation of a DNS seed.
