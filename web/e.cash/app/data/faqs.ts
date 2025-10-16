// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export interface FAQ {
  question: string;
  answer: string;
}

export const faqs: FAQ[] = [
  {
    question: "What is eCash?",
    answer:
      "eCash is a cryptocurrency that's designed to be used as electronic cash. Just like the invention of emails made it possible to send direct messages online, eCash makes it possible to send money directly to other people online. This includes being able to use eCash to pay for goods and services.",
  },
  {
    question: "How do I get eCash?",
    answer:
      "Since eCash transactions go directly between you and whoever you're paying or getting paid by, you don't need a bank account to own it. Instead, you just need an electronic wallet. Once you have a wallet, you can get eCash by buying it on a cryptocurrency exchange and then sending it to your wallet. Other people can also send eCash to your wallet.",
  },
  {
    question: "What can I use eCash for?",
    answer:
      "You can use eCash to send and receive payments without the need for a bank account. It's available in every country, and you can use it to send and receive cross-border payments anywhere in the world.",
  },
  {
    question:
      "Where can I find eCash price information compared to other cryptocurrencies?",
    answer:
      "eCash price information is available at all leading crypto research sources, like [Coingecko](https://www.coingecko.com/en/coins/ecash), [Coinmarketcap](https://coinmarketcap.com/currencies/ecash/), and [Crypto.com](https://crypto.com/price/ecash).",
  },
  {
    question: "What is the supply of eCash?",
    answer:
      "eCash has the same fixed supply as bitcoin. The default base unit of eCash has 2 decimal places (100 satoshis). The default base unit of bitcoin (BTC) has 8 decimal places (100,000,000 satoshis).\n\n90% of all the eCash that will ever exist has already been mined. The inflation rate for eCash is already low (less than 1% as of 2025), and will decrease to zero.",
  },
  {
    question: "Will XEC be burned to decrease supply?",
    answer:
      "No. We think XEC is valuable, and therefore we will not burn any.\n\nIt is also important to realize that eCash is different from other new tokens where the founding teams often hold a large proportion of the total supply. In those other coins, the large amount of coins that the team holds is still waiting to be released into the market, causing future inflation. XEC, on the other hand, is already about [90% issued](https://ecash.supply/), and the dev team holds only a small amount relative to total supply. This means that new supply of XEC into the market will continue to be very limited.",
  },
  {
    question: "What is the contract address?",
    answer:
      'XEC is not an ERC-20 token, it is its own blockchain similar to Bitcoin (BTC).\n\nThere is a "Wrapped XEC" token available on the Binance Smart Chain, with contract address [0x0Ef2e7602adD1733Bfdb17aC3094d0421B502cA3](https://github.com/binance-chain/bep20-issue-mirror-stats/blob/master/bep20-issue-mirror-stats.csv). Users should recognize that holding this BEP-20 token, or similar "wrapped XEC" products, has custodial risk as you have to trust that the custodian (in this case Binance) will hold the full reserves of native XEC safely. For this reason, we recommend that users hold their coins as real native XEC, in a wallet where they control the keys.\n\nTo hold native XEC yourself, you can use a supporting wallet (wallets.html). Write down the "seed phrase" for your wallet and store that in a safe place. This is usually 12 words. The 12 words contain enough information to restore the private keys of the wallet in case you need to recover them in the future.',
  },
  {
    question: "What is the base unit of eCash?",
    answer:
      "eCash (XEC) uses a base unit of 100 satoshis, which makes it easy to send small payments because you no longer have to handle unwieldy decimal places. For instance, instead of sending 0.00001000 bitcoins (which was the base unit used by BCHA), you'll simply send 10 XEC!",
  },
  {
    question: "How do I protect myself from scammers?",
    answer:
      "The exponential growth in crypto has unfortunately led to similar growth in scams. Here are some common ones to watch out for.\n\nEmail Phishing\nSome scammers will send you an email impersonating a member of an official team and ask for money, a 12-word wallet seed, or a private key. Official team members will never send you an unsolicited email. For tech support, we will never ask for your wallet seed or private key. Never share your private key or your wallet seed with anyone.\n\nURL Phishing\nScammers may send you a link to a website that looks like an official crypto website but does not have the same URL. You may think you are sending funds to your own wallet, for example, but are in fact sending them to a cloned page that is not your wallet. Always make sure the URL in your browser URL bar is correct. Always confirm a scanned QR code address matches what you expected.\n\nFake wallets\nAlways verify the SHA256 hash when you are downloading an official cryptocurrency wallet.",
  },
  {
    question: "Is eCash using the Avalanche blockchain?",
    answer:
      'No, eCash is its own blockchain.\nIt is important to differentiate the Avalanche protocol, from the cryptocurrency project known as "Avalanche" or "AVAX".\neCash\'s Avalanche implementation is completely separate and distinct from the Avalanche (AVAX) project. They have no connection, other than both using the protocol described in the [Avalanche whitepaper](https://ipfs.io/ipfs/QmUy4jh5mGNZvLkjies1RWM4YuvJh5o2FYopNPVYwrRVGV). Avalanche on eCash is an entirely new implementation which was developed from scratch by the Bitcoin ABC team. This is important as it puts eCash in a technology leadership role, rather than having to rely on the innovation of others.',
  },
  {
    question: "Where did eCash come from?",
    answer:
      "On November 15, 2020, the Bitcoin Cash (BCH) blockchain split into two chains. One of those chains was called BCHA for a time. This chain was what eventually became eCash.",
  },
  {
    question: "What's the difference between eCash and Bitcoin ABC?",
    answer:
      "eCash is a cryptocurrency, whereas Bitcoin ABC is the software businesses use to interact with and maintain the eCash network. The team behind the Bitcoin ABC software also operates under the same name.\n\nYou can learn more about Bitcoin ABC at [bitcoinabc.org](https://www.bitcoinabc.org/).",
  },
  {
    question: "Why is eCash listed as BCHA on some exchanges?",
    answer:
      "eCash was briefly known as Bitcoin Cash ABC (BCHA). The eCash branding came into effect on July 1, 2021. Exchanges are strongly encouraged to update their older listings accordingly. You may still see eCash listed as BCHA on some exchanges if they haven't yet made the switch.",
  },
  {
    question:
      "I have coins on the Bitcoin Cash (BCH) network. How do I retrieve my eCash?",
    answer: `If you have Bitcoin Cash from before November 15th 2020, it is possible that you also have corresponding eCash (XEC). This is because eCash and Bitcoin Cash share a common history, and became separate currencies via a blockchain split. You can split the coins and retrieve your eCash by following the instructions in [this article](${process.env.NEXT_PUBLIC_SITE_URL}/blog/splitting-ecash-bch).`,
  },
  {
    question: "What's the best way to get technical support?",
    answer:
      "You can reach out to us directly via the official eCash Telegram (https://t.me/eCash) or Discord (https://discord.gg/ecash-official-852595915159896114). You can also email us at contact@e.cash.",
  },
];
