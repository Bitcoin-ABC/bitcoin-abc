# Seeds

Utility to generate the seeds.txt list that is compiled into the client
(see [src/chainparamsseeds.h](/src/chainparamsseeds.h) and other utilities in [contrib/seeds](/contrib/seeds)).

Be sure to update `PATTERN_AGENT` in `makeseeds.py` to include the current version,
and remove old versions as necessary (at a minimum when GetDesireableServiceFlags
changes its default return value, as those are the services which seeds are added
to addrman with).

The seeds compiled into the release are created from the `dnsseed.dump` output file of a
[Bitcoin ABC Seeder](/src/seeder) that has been running for at least 30 days. The scripts
below assume that the `dnsseed.dump` file from the mainnet seeder has been copied to
`seeds_main.txt` and the `dnsseed.dump` file from the testnet seeder has been copied to
`seeds_test.txt`.

    python3 makeseeds.py < seeds_main.txt > nodes_main.txt
    python3 makeseeds.py < seeds_test.txt > nodes_test.txt
    python3 generate-seeds.py . > ../../src/chainparamsseeds.h

## Dependencies

Ubuntu:

    sudo apt-get install python3-dnspython
