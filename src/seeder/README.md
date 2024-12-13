bitcoin-seeder
==============

Bitcoin-seeder is a crawler for the eCash network, which exposes a list
of reliable nodes via a built-in DNS server. It is derived from Pieter Wuille's
bitcoin-seeder, modified for use on the eCash network.

Features:
* regularly revisits known nodes to check their availability
* bans nodes after enough failures, or bad behaviour
* uses the eCash Magic when establishing connections
* keeps statistics over (exponential) windows of 2 hours, 8 hours,
  1 day and 1 week, to base decisions on.
* very low memory (a few tens of megabytes) and cpu requirements.
* multithreaded crawlers run in parallel.

REQUIREMENTS
------------

    sudo apt-get install build-essential libboost-dev libssl-dev

USAGE
-----

Assuming you want to run a dns seed on dnsseed.example.com, you will
need an authoritative NS record in example.com's domain record, pointing
to for example vps.example.com:

    dig -t NS dnsseed.example.com

    ;; ANSWER SECTION
    dnsseed.example.com.   86400    IN      NS     vps.example.com.

On the system vps.example.com, you can now run bitcoin-seeder:

    ./bitcoin-seeder -host=dnsseed.example.com -ns=vps.example.com

If you want the DNS server to report SOA records, please provide an
e-mail address (with the `@` part replaced by `.`) using `-mbox`.

TESTING
-------

It's sometimes useful to test `bitcoin-seeder` locally to ensure it's giving good
output (either as part of development or sanity checking). You can inspect
`dnsseed.dump` to inspect all nodes being tracked for crawling, or you can
issue DNS requests directly. Example:

$ dig @:: -p 15353 dnsseed.example.com
       ^       ^    ^
       |       |    |__ Should match the host (-h) argument supplied to bitcoin-seeder
       |       |
       |       |_______ Port number (example uses the user space port; see below)
       |
       |_______________ Explicitly call the DNS server on localhost


RUNNING AS NON-ROOT
-------------------

Typically, you'll need root privileges to listen to port 53 (name service).

One solution is using an iptables rule (Linux only) to redirect it to
a non-privileged port:

    iptables -t nat -A PREROUTING -p udp --dport 53 -j REDIRECT --to-port 15353

If properly configured, this will allow you to run bitcoin-seeder in userspace, using
the `-port=15353` option.

Generate Seed Lists
-------------------

Bitcoin-seeder is also be used to generate the seed lists that are compiled
into every Bitcoin ABC release. It produces the `dnsseed.dump` files that are
used as inputs to the scripts in [contrib/seeds](/contrib/seeds) to generate
the seed lists. To generate seed lists, the seeder should be run continuously
for 30 days or more.

