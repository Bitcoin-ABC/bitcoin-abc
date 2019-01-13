bitcoin-seeder
==============

Bitcoin-seeder is a crawler for the Bitcoin Cash network, which exposes a list
of reliable nodes via a built-in DNS server. It is derived from Pieter Wuille's
bitcoin-seeder, modified for use on the Bitcoin Cash network.

Features:
* regularly revisits known nodes to check their availability
* bans nodes after enough failures, or bad behaviour
* uses the Cash Magic when establishing connections.
* keeps statistics over (exponential) windows of 2 hours, 8 hours,
  1 day and 1 week, to base decisions on.
* very low memory (a few tens of megabytes) and cpu requirements.
* crawlers run in parallel (by default 24 threads simultaneously).

REQUIREMENTS
------------

$ sudo apt-get install build-essential libboost-all-dev libssl-dev

USAGE
-----

Assuming you want to run a dns seed on dnsseed.example.com, you will
need an authorative NS record in example.com's domain record, pointing
to for example vps.example.com:

$ dig -t NS dnsseed.example.com

;; ANSWER SECTION
dnsseed.example.com.   86400    IN      NS     vps.example.com.

On the system vps.example.com, you can now run dnsseed:

./bitcoin-seeder -h dnsseed.example.com -n vps.example.com

If you want the DNS server to report SOA records, please provide an
e-mail address (with the @ part replaced by .) using -m.


RUNNING AS NON-ROOT
-------------------

Typically, you'll need root privileges to listen to port 53 (name service).

One solution is using an iptables rule (Linux only) to redirect it to
a non-privileged port:

$ iptables -t nat -A PREROUTING -p udp --dport 53 -j REDIRECT --to-port 5353

If properly configured, this will allow you to run dnsseed in userspace, using
the -p 5353 option.

Generate Seed Lists
-------------------

Bitcoin-seeder is also be used to generate the seed lists that are compiled
into every Bitcoin ABC release. It produces the `dnsseed.dump` files that are
used as inputs to the scripts in [contrib/seeds](/contrib/seeds) to generate
the seed lists. To generate seed lists, the seeder should be run continuously
for 30 days or more.

