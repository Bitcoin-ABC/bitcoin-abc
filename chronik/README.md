![Chronik Logo](chroniklogo.png "Chronik")

(Logo design by Alita Yin [ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv](https://explorer.e.cash/address/ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv))

# Chronik

Chronik is an indexer built directly into the Bitcoin ABC node.

You can read about the reasoning behind this indexer in [this article by Mengerian](https://mengerian.medium.com/why-i-am-excited-about-the-ecash-chronik-project-1401b945eb21).

The code in this repository is for the integration into the node, which is currently unfinished. However, you can use these experimental versions:

1. Chronik via NNG interface (recommended, for now): https://github.com/raipay/chronik/
2. Experimental Chronik built into Bitcoin ABC (not recommended, but easier to set-up): https://github.com/raipay/bitcoin-abc/tree/chronik

You can also join the Chronik Work Group on Telegram if you have issues, contact Tobias Ruck to add you.

## Known limitations

### On 32-bit systems
On 32-bit systems, once an address reaches 4294967295 transactions, the paginated `/address/...` or `/script/...` APIs will return empty pages for queries trying to fetch transactions beyond this limit.

At the time of writing (Apr 2023), the address with the most transactions is around 3000000, so we're far away from that limit.
