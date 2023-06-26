// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * @generated from https://strapi.fabien.cash/api/posts
 */

export const mockBlogPosts1 = [
    {
        id: 84,
        attributes: {
            title: 'eCash Aliases Development Sneak Peek',
            content:
                '<p>Another powerful feature is on the horizon!</p><p>Join our sneak peek into the eCash Alias development and get ready to say goodbye to complicated crypto addresses</p><p>And say hi to customizable &amp; tradable usernames for your eCash transactions</p><p>Crypto has always had a UX problem.</p><p>Cryptography is complicated. It\'s important to design systems where the user has total control of their funds. But it\'s also important to make the user experience as accessible as possible.</p><p>For now, the most user-friendly crypto products tend to be custodial. The most secure options are often too complicated for new users.</p><p>Crypto addresses in particular are a big problem because they\'re meant for machines, making them difficult to read, remember, and use.</p><p>Usernames &amp; passwords are a growing hassle. Credit cards remain the go-to option for internet payments, despite often requiring private info.</p><p>Imagine how difficult it would be to use the internet — filling out forms, registering for services... — if email addresses were required to be byzantine cryptographic strings like \'0x6eA158159...\', they probably wouldn\'t have become the dominant username of the internet.</p><figure class="w-richtext-figure-type-image w-richtext-align-center" data-rt-type="image" data-rt-align="center"><div><img src="/images/64912e5dd3154796a0512835_Joey%20Aliases.jpg" loading="lazy" width="auto" height="auto"></div><figcaption>Cashtab Lead Dev - Joey King</figcaption></figure><p>Crypto can improve both of these experiences with the right UI/UX tools.</p><p>Ethereum\'s ENS has done this successfully, allowing users to register a handle like they would a domain or address. Similar efforts on bitcoin were throttled by on-chain scaling challenges.</p><p>eCash aliases offer the best of ENS, with a roadmap to fully customizable and tradable aliases. </p><p>Unlike ENS, phase 1 alias registrations last forever - there is no annual maintenance fee.</p><p>Full feature parity with ENS will take additional tools and protocol work, so we\'re launching in phases.</p><p>In phase one, users will be able to register an alias for a fee based on length. In later phases, we plan to support tradeable, NFT-based aliases.</p><h2>So, how will Phase 1 Aliases work?</h2><p>The eCash Alias system uses an eCash transaction to register an alias to an address on-chain. Because the blockchain is permanent, registrations cannot be reversed. If you buy an alias, it\'s yours (unless &amp; until you decide to sell it).</p><p>The specs can be found at: https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/doc/standards/ecash-alias.md</p><p>An open-source reference indexer (Chronik) is being built out to support easy implementation of aliases for eCash wallets.</p><p><a href="https://cashtab.com">Cashtab wallet</a> will support registering and using aliases as soon as the protocol is live.</p><figure class="w-richtext-figure-type-image w-richtext-align-center" data-rt-type="image" data-rt-align="center"><div><img src="/images/64912eadd08ddae77bd3e09c_Cashtab%20Aliases.png" loading="lazy"></div><figcaption>A preview of eCash Aliases</figcaption></figure><p>To claim your alias, you will simply visit the new "Alias" page in <a href="https://cashtab.com">Cashtab</a>, type in your desired alias, &amp; click "register".</p><p>If the alias hasn\'t been taken yet, it\'s yours. Because the alias is stored on the blockchain, it\'s yours everywhere on the web — not just in Cashtab.</p><h2>What\'s next?</h2><p>Moving forward, eCash will match popular features of ENS, like an Alias marketplace. To prioritize a professional, permanent feature, we will launch phase 1 before introducing a user-friendly interface for trading aliases.</p><p>UTXO chains like eCash are capable of matching many ETH-like features, in addition to reaching world scale without the need for Layer 2 solutions.</p><p>eCash Aliases is only the first of many apps and smart contract like features that will be built out on eCash!</p><p>Phase 1 of eCash Aliases could have been released a few months ago. However, taking the time to evaluate the spec and build out the supporting app infrastructure — while ensuring no introduction of technical debt — is the right way to do it.</p><figure class="w-richtext-figure-type-image w-richtext-align-center" data-rt-type="image" data-rt-align="center"><div><img src="/images/64912ef8ce1ed295b0c842af_24561114-PvUAtYCP.gif" loading="lazy"></div></figure><p>⚙️ Up next, we need to build an API for the alias-server to best support implementing wallets. This was completed already for an earlier version of the spec, so no major roadblocks are expected.</p><p>We\'re already able to register Alias txs according to the spec, although the price schedule has not been finalized.</p><blockquote>"We could get it out this month if we rushed it, but we aren\'t going to rush it." - Cashtab lead dev Joey King</blockquote><p>So as always no ETA, but #Soon</p><p>For more XECiting info on developments, check out our <a href="https://e.cash/blog/chronik-indexer-development-sneak-peek-may-2023">Chronik Development Sneak Peek</a>, and don’t forget to join our official communities!</p><p>➡️ <a href="http://ecash.community">http://ecash.community</a></p><p>Follow dev progress:</p><p>➡️ <a href="https://reviews.bitcoinabc.org/feed/">https://reviews.bitcoinabc.org/feed/</a></p>',
            short_content:
                'Get ready to say goodbye to complicated crypto addresses and say to customizable & tradable usernames for your eCash transactions.',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Tue Jun 20 2023 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-aliases-development-sneak-peek-june-2023',
            createdAt: '2023-06-20T23:06:17.686Z',
            updatedAt: '2023-06-21T21:22:52.794Z',
            publishedAt: '2023-06-20T23:06:17.677Z',
            legacy_image:
                '/images/64912df9bc3c386ace3fc41e_Aliases%20Dev%20Update.jpg',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 82,
                    attributes: {
                        name: '64912df9bc3c386ace3fc41e_Aliases%20Dev%20Update.jpg',
                        alternativeText: null,
                        caption: null,
                        width: 1920,
                        height: 1080,
                        formats: {
                            large: {
                                ext: '.jpg',
                                url: '/uploads/large_64912df9bc3c386ace3fc41e_Aliases_20_Dev_20_Update_0fd8ce5805.jpg',
                                hash: 'large_64912df9bc3c386ace3fc41e_Aliases_20_Dev_20_Update_0fd8ce5805',
                                mime: 'image/jpeg',
                                name: 'large_64912df9bc3c386ace3fc41e_Aliases%20Dev%20Update.jpg',
                                path: null,
                                size: 112.52,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.jpg',
                                url: '/uploads/small_64912df9bc3c386ace3fc41e_Aliases_20_Dev_20_Update_0fd8ce5805.jpg',
                                hash: 'small_64912df9bc3c386ace3fc41e_Aliases_20_Dev_20_Update_0fd8ce5805',
                                mime: 'image/jpeg',
                                name: 'small_64912df9bc3c386ace3fc41e_Aliases%20Dev%20Update.jpg',
                                path: null,
                                size: 29.22,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.jpg',
                                url: '/uploads/medium_64912df9bc3c386ace3fc41e_Aliases_20_Dev_20_Update_0fd8ce5805.jpg',
                                hash: 'medium_64912df9bc3c386ace3fc41e_Aliases_20_Dev_20_Update_0fd8ce5805',
                                mime: 'image/jpeg',
                                name: 'medium_64912df9bc3c386ace3fc41e_Aliases%20Dev%20Update.jpg',
                                path: null,
                                size: 64.92,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.jpg',
                                url: '/uploads/thumbnail_64912df9bc3c386ace3fc41e_Aliases_20_Dev_20_Update_0fd8ce5805.jpg',
                                hash: 'thumbnail_64912df9bc3c386ace3fc41e_Aliases_20_Dev_20_Update_0fd8ce5805',
                                mime: 'image/jpeg',
                                name: 'thumbnail_64912df9bc3c386ace3fc41e_Aliases%20Dev%20Update.jpg',
                                path: null,
                                size: 8.36,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '64912df9bc3c386ace3fc41e_Aliases_20_Dev_20_Update_0fd8ce5805',
                        ext: '.jpg',
                        mime: 'image/jpeg',
                        size: 384.84,
                        url: '/uploads/64912df9bc3c386ace3fc41e_Aliases_20_Dev_20_Update_0fd8ce5805.jpg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:02:40.141Z',
                        updatedAt: '2023-06-21T20:02:40.141Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 83,
        attributes: {
            title: 'What the Future Holds for eCash',
            content:
                '<p>In the fast-paced blockchain sphere, <a href="https://e.cash/" target="_blank"><strong>eCash</strong></a> has emerged as a significant contender. As a rebrand of Bitcoin ABC, it’s enhancing as an electronic cash system through key developments such as Avalanche Post-Consensus integration, offering enhanced security and transaction speed.</p><p>Future innovations include the Pre-Consensus milestone, user-friendly Aliases, and the introduction of staking rewards. Together, these enhancements aim to secure eCash’s place as an optimally usable and scalable form of electronic cash. Let’s delve deeper into what the future holds for eCash.</p><h2><strong>1. Avalanche Post-Consensus Integration</strong></h2><p>The recent integration of Avalanche Post-Consensus protocol is key to eCash’s evolution. Avalanche, a groundbreaking consensus protocol from 2018, offers a unique counterpart to the Nakamoto consensus that Bitcoin and eCash use. While Nakamoto secures transactions over long timeframes, Avalanche excels in short-term security. This blend in <a href="https://swapzone.io/exchange/ecash"><strong>eCash</strong></a> capitalizes on the strengths of both while reducing their weaknesses. </p><p>Avalanche enhances eCash’s consensus speed, security, and extensibility, while Nakamoto maintains the trustless blockchain nature for node bootstrapping. This integration of Avalanche consensus on eCash should not be confused with the AVAX Avalanche project. The eCash project has independently incorporated the same consensus protocol that AVAX utilizes.</p><p>However, eCash uniquely combines this Avalanche consensus with its base Nakamoto protocol. This integration signifies a big leap in eCash’s development, charting the path for long-term scaling and future enhancements.</p><h2><strong>2. Upcoming Developments in eCash</strong></h2><p>eCash is on track to redefine the electronic cash system with several key developments on the horizon.</p><p>The Pre-Consensus milestone, one of the most awaited, promises nearly instantaneous transactions, eliminating long waiting times for exchange deposits and significantly improving user experience.</p><p>Subsequent to this milestone, Avalanche consensus integration will enable Subchain technology, allowing applications or protocols to run on their own subchains, rather than on the base layer. This introduces promising possibilities like Ethereum Virtual Machine (EVM) and a Zero-Knowledge Subchain, improving chain extensibility, interoperability, and privacy.</p><p>The Avalanche integration also simplifies chain upgrades, eliminating the need for coordinated hard-forks. These future advancements reinforce eCash’s dedication to ongoing innovation in the realm of electronic cash systems.</p><h2><strong>3. Aliases Protocol and .xec Namespaces</strong></h2><p>In the pursuit of enhancing user experience and transaction convenience, <a href="https://swapzone.io/exchange/btc/xec" target="_blank">eCash</a> is introducing the Aliases protocol, providing an option to acquire .xec namespaces for eCash addresses. Simplifying the complex, long address strings that typically characterize cryptocurrencies, this innovation is a significant step towards user-friendly blockchain technology.</p><p>Instead of using traditional address strings such as “ecash:qrxu0ytqnea7…”, users can buy an alias like “johndoe.xec” and associate it with their eCash address. It allows users to share their alias instead of a complicated address, making the process of sending and receiving eCash or eTokens straightforward and intuitive.</p><p>This feature is nearing completion, with an already functional Minimum Viable Product (MVP) in place. The initial implementation will be in eCash’s reference wallet, Cashtab.com, followed by a broader rollout to other wallets.</p><p>One of the noteworthy aspects of the Aliases protocol is its on-chain storage of the relevant lookup data. This approach ensures that it’s an open protocol, enabling any eCash wallet to integrate it seamlessly. For the user, this means they can buy and, in the future, potentially sell aliases directly through the Cashtab.com app.</p><p>In essence, the Aliases protocol and .xec namespaces are game-changers. They not only offer a much simpler user experience but also pave the way for the future tokenization of aliases, enabling users to trade their aliases with each other.</p><figure class="w-richtext-figure-type- " data-rt-type="" data-rt-align=""><div><img src="/images/6490367941ddf0fbd9006b83_exchange-monero-to-ethereum-e1624194649599-1024x261-1-3.png" alt="" width="auto" height="auto" loading="auto"></div></figure><h2><strong>4. Chronik Indexer and Its Role</strong></h2><p>Adding to its arsenal of innovative developments, eCash is introducing the Chronik Indexer, a project approved and funded by the eCash Global Network Council (GNC). The role of a blockchain indexer is fundamental—it keeps track of copious amounts of aggregated information about transactions and blocks. However, the eCash Chronik project brings a unique twist to this crucial infrastructure.</p><p>Instead of operating as a separate entity, the Chronik Indexer is integrated directly into the Bitcoin ABC node software, which simplifies the logic and prevents the duplication of tasks undertaken by the node. This novel approach has been proposed multiple times on Bitcoin, but it’s the eCash network that is bringing this idea to fruition.</p><p>This integration significantly eases the building of applications that interact directly with the eCash blockchain. Developers and entrepreneurs aiming to build atop eCash can run their Bitcoin ABC node with specific flags turned on to activate the indexing functions they require, creating a streamlined and user-friendly process.</p><p>The overarching goal of the Chronik Indexer and other similar innovations is to create a technical infrastructure that enables eCash to compete with Central Bank Digital Currencies (CBDCs). The Indexer is a critical piece of this puzzle, contributing towards the robust and efficient infrastructure that makes eCash a viable and appealing digital currency choice.</p><h2><strong>5. Staking Rewards on eCash</strong></h2><p><br>A forward-thinking innovation that eCash plans to integrate into its ecosystem is staking rewards, a feature that is particularly unique for a Bitcoin-based chain. Before diving into the eCash-specific application, it is crucial to understand the concept of staking within blockchain networks.</p><p>Staking generally involves participants, or “stakers,” locking up a portion of their cryptocurrency in the network to support operations such as validating transactions. In return, these stakers receive rewards, incentivizing their participation and contribution to network security.</p><p>The introduction of staking rewards in <a href="https://swapzone.io/exchange/btc/xec" target="_blank">eCash</a> is primarily designed to incentivize the operation of well-connected Avalanche-enabled nodes. By doing so, the network is expected to become more agile and secure. An interesting twist to eCash’s approach to staking is that the coins do not need to be locked up or sent to anyone in any way. Instead, the stake proofs, whether delegated or not, remain valid as long as the coins do not move.</p><p>In practice, this means that participants simply hold their coins on a specific address, generate a stake proof, and use it for their eCash node with Avalanche enabled. This method presents a potentially simpler and less restrictive approach to staking compared to other networks.</p><p>While the exact implementation of staking rewards is still being discussed by the team, its introduction is progressing and has a high priority on the list of upcoming features. As such, staking rewards are likely to play a significant role in shaping the future of eCash.</p><h2><strong>Conclusion</strong></h2><p>In conclusion, the future of eCash looks remarkably promising with its innovative fusion of Avalanche and Nakamoto consensus, the development of subchain technologies, user-friendly aliases, the state-of-the-art Chronik Indexer, and anticipated staking rewards. Each of these features brings eCash a step closer to becoming a robust, scalable, and user-friendly digital currency ecosystem.</p><p>As we continue to witness these developments unfold, eCash is positioning itself not only as a viable alternative to Central Bank Digital Currencies but also as a leader in blockchain innovation.</p>',
            short_content:
                'In the fast-paced blockchain sphere, eCash has emerged as a significant contender. Let’s delve deeper into what the future holds for eCash.',
            type: 'News',
            media_link:
                'https://swapzone.io/blog/what-the-future-holds-for-ecash',
            publish_date:
                'Mon Jun 19 2023 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'what-the-future-holds-for-ecash',
            createdAt: '2023-06-20T23:06:02.404Z',
            updatedAt: '2023-06-21T21:23:18.831Z',
            publishedAt: '2023-06-20T23:06:02.398Z',
            legacy_image:
                '/images/649035f618828135d86fd926_What%20the%20future%20holds%20for%20eCash.png',
            legacy_media_logo: '/images/6490364e4935bc235319a162_Swapzone.svg',
            image: {
                data: {
                    id: 80,
                    attributes: {
                        name: '649035f618828135d86fd926_What%20the%20future%20holds%20for%20eCash.png',
                        alternativeText: null,
                        caption: null,
                        width: 1200,
                        height: 630,
                        formats: {
                            large: {
                                ext: '.png',
                                url: '/uploads/large_649035f618828135d86fd926_What_20the_20future_20holds_20for_20e_Cash_7588d3c7ab.png',
                                hash: 'large_649035f618828135d86fd926_What_20the_20future_20holds_20for_20e_Cash_7588d3c7ab',
                                mime: 'image/png',
                                name: 'large_649035f618828135d86fd926_What%20the%20future%20holds%20for%20eCash.png',
                                path: null,
                                size: 430.31,
                                width: 1000,
                                height: 525,
                            },
                            small: {
                                ext: '.png',
                                url: '/uploads/small_649035f618828135d86fd926_What_20the_20future_20holds_20for_20e_Cash_7588d3c7ab.png',
                                hash: 'small_649035f618828135d86fd926_What_20the_20future_20holds_20for_20e_Cash_7588d3c7ab',
                                mime: 'image/png',
                                name: 'small_649035f618828135d86fd926_What%20the%20future%20holds%20for%20eCash.png',
                                path: null,
                                size: 112.65,
                                width: 500,
                                height: 263,
                            },
                            medium: {
                                ext: '.png',
                                url: '/uploads/medium_649035f618828135d86fd926_What_20the_20future_20holds_20for_20e_Cash_7588d3c7ab.png',
                                hash: 'medium_649035f618828135d86fd926_What_20the_20future_20holds_20for_20e_Cash_7588d3c7ab',
                                mime: 'image/png',
                                name: 'medium_649035f618828135d86fd926_What%20the%20future%20holds%20for%20eCash.png',
                                path: null,
                                size: 244.81,
                                width: 750,
                                height: 394,
                            },
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_649035f618828135d86fd926_What_20the_20future_20holds_20for_20e_Cash_7588d3c7ab.png',
                                hash: 'thumbnail_649035f618828135d86fd926_What_20the_20future_20holds_20for_20e_Cash_7588d3c7ab',
                                mime: 'image/png',
                                name: 'thumbnail_649035f618828135d86fd926_What%20the%20future%20holds%20for%20eCash.png',
                                path: null,
                                size: 35.89,
                                width: 245,
                                height: 129,
                            },
                        },
                        hash: '649035f618828135d86fd926_What_20the_20future_20holds_20for_20e_Cash_7588d3c7ab',
                        ext: '.png',
                        mime: 'image/png',
                        size: 98.76,
                        url: '/uploads/649035f618828135d86fd926_What_20the_20future_20holds_20for_20e_Cash_7588d3c7ab.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:02:39.209Z',
                        updatedAt: '2023-06-21T21:23:10.086Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 82,
        attributes: {
            title: 'eCash Monthly Recap - May 2023',
            content:
                '<p>With a new month on the horizon, it\'s time for our Monthly Recap to keep you in the loop with all that\'s been happening in the eCash ecosystem!</p><p>Let’s recap!</p><p>‍</p><h2>Key Highlights - <a href="https://cashtab.com/">Cashtab Wallet</a></h2><p>‍</p><p>The Alias specification has been enhanced to support the registration of third-party addresses</p><p>⚙️ Necessary specification improvements implemented in Alias-server and Cashtab wallet</p><p>‍</p><h2>Key Highlights - Bitcoin ABC Node Software</h2><p>‍</p><p><a href="http://bitcoinabc.org/">Bitcoin ABC</a> releases versions 0.27.4, 0.27.5, and 0.27.6 bringing RPC changes, improvements, and adding a checkpoint after the May 15th, 2023 network upgrade.</p><p><a href="https://www.bitcoinabc.org/releases/">https://www.bitcoinabc.org/releases/</a>&nbsp;</p><p>‍</p><p>Chronik development is 70% complete, with integration into the Bitcoin ABC node and essential components like resync handling and query management in place.</p><p><strong>Learn more:</strong> <a href="https://e.cash/blog/chronik-indexer-development-sneak-peek-may-2023">Chronik Indexer Development Sneak Peek</a></p><p>‍</p><h2>Key Highlights - eCash Network Upgrade</h2><p>‍</p><p>The planned network upgrade for May 15th was successfully completed! </p><p><a href="https://bitcoinabc.org/upgrade/">https://bitcoinabc.org/upgrade/</a>&nbsp;</p><p>‍</p><p>If you forgot to upgrade &amp; are still running version 0.26.x, you can use the <a href="https://www.bitcoinabc.org/releases/#0.27.5">0.27.5 release</a> to get back to the correct chain.</p><p>‍</p><h2>eCash Avalanche Network Overview</h2><figure class="w-richtext-figure-type-image w-richtext-align-center" data-rt-type="image" data-rt-align="center"><div><img src="/images/64777bf7f9e1a03adea13c29_6d77a077.png" width="auto" height="auto" loading="auto"></div></figure><p>‍</p><p>Total Staked: 74.9B XEC</p><p>Number of Nodes: 30</p><p>Number of Peers: 19</p><p>‍</p><p><a href="https://avalanche.cash">https://Avalanche.cash</a></p><p>‍</p><h2>Key Highlights - News/Media</h2><p>‍</p><p>Gate.io exchange announced support for the eCash network upgrade!</p><p><a href="https://gate.io/article/30672">https://gate.io/article/30672</a>&nbsp;</p><p>‍</p><p>Stack Wallet integrated eCash (XEC), introducing our cute eChan mascot!</p><p>Find her on <a href="https://stackwallet.com/">https://stackwallet.com/</a>&nbsp;</p><p>‍</p><h2>Key Highlights - Community &amp; Milestones</h2><p>‍</p><p><a href="https://coinmarketcap.com/community/profile/eCash">eCash\'s CMC community</a> reached 25K+ followers!</p><p><a href="https://coinmarketcap.com/community/profile/eCash/">https://coinmarketcap.com/community/profile/eCash/</a>&nbsp;</p><p>‍</p><p><a href="https://twitter.com/eCashCommunity">@eCashCommunity</a>OORAH Medal Airdrop 🪂</p><p>‍</p><p>eCash Translation &amp; Reviews Program contributors were rewarded for their contributions!</p><p>‍</p><p>That\'s a wrap on our monthly recap!</p><p>eCash Army, don\'t forget to follow and join our official social media accounts and community groups for more updates!</p><p>‍<a href="https://ecash.community/">https://ecash.community/</a></p>',
            short_content:
                "With a new month on the horizon, it's time for our Monthly Recap to keep you in the loop with all that's been happening!",
            type: 'Blog',
            media_link: '',
            publish_date:
                'Wed May 31 2023 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-monthly-recap-may-2023',
            createdAt: '2023-06-20T23:05:49.504Z',
            updatedAt: '2023-06-21T21:23:39.412Z',
            publishedAt: '2023-06-20T23:05:49.498Z',
            legacy_image: '/images/64777b60bae9bea8fe114a4c_May.jpg',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 79,
                    attributes: {
                        name: '64777b60bae9bea8fe114a4c_May.jpg',
                        alternativeText: null,
                        caption: null,
                        width: 1920,
                        height: 1080,
                        formats: {
                            large: {
                                ext: '.jpg',
                                url: '/uploads/large_64777b60bae9bea8fe114a4c_May_4e4997c90b.jpg',
                                hash: 'large_64777b60bae9bea8fe114a4c_May_4e4997c90b',
                                mime: 'image/jpeg',
                                name: 'large_64777b60bae9bea8fe114a4c_May.jpg',
                                path: null,
                                size: 59.02,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.jpg',
                                url: '/uploads/small_64777b60bae9bea8fe114a4c_May_4e4997c90b.jpg',
                                hash: 'small_64777b60bae9bea8fe114a4c_May_4e4997c90b',
                                mime: 'image/jpeg',
                                name: 'small_64777b60bae9bea8fe114a4c_May.jpg',
                                path: null,
                                size: 19.57,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.jpg',
                                url: '/uploads/medium_64777b60bae9bea8fe114a4c_May_4e4997c90b.jpg',
                                hash: 'medium_64777b60bae9bea8fe114a4c_May_4e4997c90b',
                                mime: 'image/jpeg',
                                name: 'medium_64777b60bae9bea8fe114a4c_May.jpg',
                                path: null,
                                size: 37.87,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.jpg',
                                url: '/uploads/thumbnail_64777b60bae9bea8fe114a4c_May_4e4997c90b.jpg',
                                hash: 'thumbnail_64777b60bae9bea8fe114a4c_May_4e4997c90b',
                                mime: 'image/jpeg',
                                name: 'thumbnail_64777b60bae9bea8fe114a4c_May.jpg',
                                path: null,
                                size: 6.22,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '64777b60bae9bea8fe114a4c_May_4e4997c90b',
                        ext: '.jpg',
                        mime: 'image/jpeg',
                        size: 167.09,
                        url: '/uploads/64777b60bae9bea8fe114a4c_May_4e4997c90b.jpg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:02:38.830Z',
                        updatedAt: '2023-06-21T20:02:38.830Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 81,
        attributes: {
            title: 'Chronik Indexer Development Sneak Peek',
            content:
                '<p>Avalanche is not the only XECeptional infrastructure upgrade the eCash dev team is bringing to the table.</p><p>Developments on Chronik indexer are also in the late stages and thus we wanted to share some insights with you all!</p><p>Let\'s dive right into it!</p><p>An indexer is a basic infrastructure tool that keeps track of addresses, transactions, blocks, and their states. Chronik is an indexer integrated right into the eCash node software (<a href="https://bitcoinabc.org/">Bitcoin ABC</a>).</p><p>A built-in indexer is something that has been proposed on Bitcoin Core several times but never came to fruition.</p><p>Learn more: <a href="https://mengerian.medium.com/why-i-am-excited-about-the-ecash-chronik-project-1401b945eb21">https://mengerian.medium.com/why-i-am-excited-about-the-ecash-chronik-project-1401b945eb21</a></p><p>By running a node with the desired indexing functions, Chronik will provide a significant boost for developers and businesses! Eliminating the need to deal with multiple applications results in simpler logic, excluding possible syncing errors or version incompatibilities.</p><p>Chronik operates at super speeds due to its efficient code written in Rust, utilization of a rapid key-value store, and smart architecture that fetches data directly from the node!</p><p>Kudos to dev <a href="https://twitter.com/TobiasRuck/">@TobiasRuck</a> for his high-quality code.</p><p>Chronik development is 70% complete, with integration into the node and essential components like resync handling and query management in place.</p><p>Websockets have also been established for full compatibility with Avalanche Pre-Consensus.</p><p>Overall, Chronik is simple, convenient, robust, and efficient, making it an empowering tool for developers!</p><p>The <a href="https://cashtab.com">Cashtab.com</a> wallet already uses an external Chronik instance, allowing users to experience its benefits when making transactions.</p><p>For more XECiting info on developments, check out our <a href="https://e.cash/blog/avalanche-pre-consensus-development-sneak-peek-march-2023">Avalanche Development Sneak Peek</a>, and don’t forget to join our official Discord and Telegram communities!</p><p><a href="https://ecash.community">ecash.community</a></p>',
            short_content:
                'Chronik indexer developments on eCash are in the late stages and thus we wanted to share some insights with you all!',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Wed May 03 2023 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'chronik-indexer-development-sneak-peek-may-2023',
            createdAt: '2023-06-20T23:05:37.998Z',
            updatedAt: '2023-06-21T21:23:53.232Z',
            publishedAt: '2023-06-20T23:05:37.989Z',
            legacy_image:
                '/images/645131690ea813bd217effd9_Chronik%20Dev%20Update2.jpg',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 78,
                    attributes: {
                        name: '645131690ea813bd217effd9_Chronik%20Dev%20Update2.jpg',
                        alternativeText: null,
                        caption: null,
                        width: 1920,
                        height: 1080,
                        formats: {
                            large: {
                                ext: '.jpg',
                                url: '/uploads/large_645131690ea813bd217effd9_Chronik_20_Dev_20_Update2_19821ee028.jpg',
                                hash: 'large_645131690ea813bd217effd9_Chronik_20_Dev_20_Update2_19821ee028',
                                mime: 'image/jpeg',
                                name: 'large_645131690ea813bd217effd9_Chronik%20Dev%20Update2.jpg',
                                path: null,
                                size: 110.99,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.jpg',
                                url: '/uploads/small_645131690ea813bd217effd9_Chronik_20_Dev_20_Update2_19821ee028.jpg',
                                hash: 'small_645131690ea813bd217effd9_Chronik_20_Dev_20_Update2_19821ee028',
                                mime: 'image/jpeg',
                                name: 'small_645131690ea813bd217effd9_Chronik%20Dev%20Update2.jpg',
                                path: null,
                                size: 29.98,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.jpg',
                                url: '/uploads/medium_645131690ea813bd217effd9_Chronik_20_Dev_20_Update2_19821ee028.jpg',
                                hash: 'medium_645131690ea813bd217effd9_Chronik_20_Dev_20_Update2_19821ee028',
                                mime: 'image/jpeg',
                                name: 'medium_645131690ea813bd217effd9_Chronik%20Dev%20Update2.jpg',
                                path: null,
                                size: 64.64,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.jpg',
                                url: '/uploads/thumbnail_645131690ea813bd217effd9_Chronik_20_Dev_20_Update2_19821ee028.jpg',
                                hash: 'thumbnail_645131690ea813bd217effd9_Chronik_20_Dev_20_Update2_19821ee028',
                                mime: 'image/jpeg',
                                name: 'thumbnail_645131690ea813bd217effd9_Chronik%20Dev%20Update2.jpg',
                                path: null,
                                size: 8.81,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '645131690ea813bd217effd9_Chronik_20_Dev_20_Update2_19821ee028',
                        ext: '.jpg',
                        mime: 'image/jpeg',
                        size: 337.16,
                        url: '/uploads/645131690ea813bd217effd9_Chronik_20_Dev_20_Update2_19821ee028.jpg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:02:38.765Z',
                        updatedAt: '2023-06-21T20:02:38.765Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 80,
        attributes: {
            title: 'eCash Monthly Recap - April 2023',
            content:
                '<p><strong>April was a MASSIVE month for the eCash ecosystem!</strong></p><p>1 new exchange listing, 2 new wallet integrations, 2 exchanges supporting the eCash address format, and more...</p><p>Did you miss any of the updates?</p><p>Let’s take you through a recap!</p><p>‍</p><h2>Key Highlights - Cashtab Wallet</h2><p></p><p>Bitgojs library implementation</p><p>Support for longer Cashtab messages</p><p>‍</p><h2>Key Highlights - Bitcoin ABC Node Software</h2><p></p><p><a href="https://twitter.com/bitcoin_abc">@Bitcoin_ABC</a> releases versions 0.27.2 and 0.27.3, bringing a new Avalanche-related RPC field, bug fixes and various under-the-hood improvements.</p><p><a href="https://www.bitcoinabc.org/releases/">https://www.bitcoinabc.org/releases/</a>&nbsp;</p><p></p><h2>Key Highlights - eCash Network Upgrade</h2><p></p><p>On May 15th, 2023, the eCash network will undergo an upgrade on its regular 6-month schedule.</p><p>If you\'re running an eCash node make sure to upgrade to the latest version (0.27.x) before May 15th.</p><p><a href="https://e.cash/blog/ecash-network-upgrade-may-15th-2023">https://e.cash/blog/ecash-network-upgrade-may-15th-2023</a>&nbsp;</p><p></p><h2>Key Highlights - Avalanche on eCash</h2><p></p><p>The backports of all \'Mempool-related improvements done in Bitcoin Core\' are completed</p><p>The dev team is now working to improve the Mempool structures</p><p>Learn more: <a href="https://e.cash/blog/avalanche-pre-consensus-development-sneak-peek-march-2023">https://e.cash/blog/avalanche-pre-consensus-development-sneak-peek-march-2023</a>&nbsp;</p><p></p><h2>eCash Avalanche Network Overview</h2><figure class="w-richtext-figure-type-image w-richtext-align-center" data-rt-type="image" data-rt-align="center"><div><img src="/images/644e93b1a0c93f426f938fb8_7ba30f60.png" width="auto" height="auto" loading="auto"></div></figure><p>Total Staked: 74.5B XEC</p><p>Number of Nodes: 33</p><p>Number of Peers: 22</p><p><a href="https://avalanche.cash">https://avalanche.cash</a>&nbsp;</p><p>‍</p><h2>Key Highlights - News/Media</h2><p>‍</p><p>SuperEx exchange listed eCash (XEC)!</p><p><a href="https://superex.com/trade/XEC_USDT">https://superex.com/trade/XEC_USDT</a>&nbsp;</p><p>‍</p><p><a href="https://scorecard.cash/exchange/okx">OKX exchange</a> added support for the eCash address format.</p><p>‍</p><p>Arctic Walet integrated eCash (XEC)!</p><p> <a href="https://arcticwallet.io/">https://arcticwallet.io/</a>&nbsp;</p><p>‍</p><p><a href="https://scorecard.cash/exchange/gate-io">Gate.io exchange</a> added support for the eCash address format and reduced eCash withdrawal fees to just 6 XEC!</p><p>‍</p><p>Unstoppable Wallet integrated eCash (XEC)!</p><p><a href="https://unstoppable.money">https://unstoppable.money</a>&nbsp;</p><p>‍</p><h2>Key Highlights - Community &amp; Milestones</h2><p>‍</p><p>eCash\'s new CMC community reached 20K+ followers!</p><p><a href="https://coinmarketcap.com/community/profile/eCash/">https://coinmarketcap.com/community/profile/eCash/</a>&nbsp;</p><p>‍</p><p>SuperEx X eCash AMA</p><p><a href="https://proofofwriting.com/154/">https://proofofwriting.com/154/</a>&nbsp;</p><p>‍</p><p>That\'s a wrap on our monthly recap!</p><p>‍</p><p>#eCashArmy, don\'t forget to follow and join our official social media accounts and community groups for more updates!</p><p>‍<a href="https://ecash.community/">https://ecash.community/</a></p>',
            short_content:
                'April was a MASSIVE month for the eCash ecosystem! Did you miss any of the updates? Let’s take you through a recap!',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Sun Apr 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-monthly-recap-april-2023',
            createdAt: '2023-06-20T23:05:26.937Z',
            updatedAt: '2023-06-21T21:24:23.319Z',
            publishedAt: '2023-06-20T23:05:26.932Z',
            legacy_image: '/images/644e9371c07a88603239d707_April.jpg',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 81,
                    attributes: {
                        name: '644e9371c07a88603239d707_April.jpg',
                        alternativeText: null,
                        caption: null,
                        width: 3840,
                        height: 2160,
                        formats: {
                            large: {
                                ext: '.jpg',
                                url: '/uploads/large_644e9371c07a88603239d707_April_a97391101f.jpg',
                                hash: 'large_644e9371c07a88603239d707_April_a97391101f',
                                mime: 'image/jpeg',
                                name: 'large_644e9371c07a88603239d707_April.jpg',
                                path: null,
                                size: 58.09,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.jpg',
                                url: '/uploads/small_644e9371c07a88603239d707_April_a97391101f.jpg',
                                hash: 'small_644e9371c07a88603239d707_April_a97391101f',
                                mime: 'image/jpeg',
                                name: 'small_644e9371c07a88603239d707_April.jpg',
                                path: null,
                                size: 19.64,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.jpg',
                                url: '/uploads/medium_644e9371c07a88603239d707_April_a97391101f.jpg',
                                hash: 'medium_644e9371c07a88603239d707_April_a97391101f',
                                mime: 'image/jpeg',
                                name: 'medium_644e9371c07a88603239d707_April.jpg',
                                path: null,
                                size: 37.01,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.jpg',
                                url: '/uploads/thumbnail_644e9371c07a88603239d707_April_a97391101f.jpg',
                                hash: 'thumbnail_644e9371c07a88603239d707_April_a97391101f',
                                mime: 'image/jpeg',
                                name: 'thumbnail_644e9371c07a88603239d707_April.jpg',
                                path: null,
                                size: 6.36,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '644e9371c07a88603239d707_April_a97391101f',
                        ext: '.jpg',
                        mime: 'image/jpeg',
                        size: 404.32,
                        url: '/uploads/644e9371c07a88603239d707_April_a97391101f.jpg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:02:39.516Z',
                        updatedAt: '2023-06-21T20:02:39.516Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 79,
        attributes: {
            title: 'Avalanche Pre-Consensus Development Sneak Peek',
            content:
                '<p>Our dev team has been busy building, and we wanted to share some insights with you on the Avalanche development progress on eCash!</p><p></p><p><strong>Let\'s dive right into it!</strong></p><figure class="w-richtext-figure-type-image w-richtext-align-center" data-rt-type="image" data-rt-align="center"><div><img src="/images/642e9d005b4feac25ad7b0af_Avalanche%20Dev%20Update.png" loading="lazy" width="auto" height="auto"></div></figure><p>The backports of all \'Mempool-related improvements done in Bitcoin Core\' are completed!</p><p>This was the essential engineering work required to lay the foundation for the Avalanche Pre-Consensus integration.</p><p></p><p><strong>The dev team is now working on the Mempool structures to:</strong></p><p>1. Store conflicting transactions so they can be polled (instead of the first-seen rule)</p><p>2. Store finalized transactions so that conflicting transactions and blocks that contain such transactions can be rejected</p><p> The Mempol structure that holds finalized transactions will also be used to construct the block template.</p><p>This will make the block template generation super fast which will allow scaling when blocks get bigger!</p><p></p><p>Avalanche Pre-Consensus won\'t be part of the upcoming <a href="https://e.cash/blog/ecash-network-upgrade-may-15th-2023">May 15th upgrade</a>, but its development is in full swing and the devs are doubling down efforts to complete it as soon as possible.</p><p>Learn more<a href="https://avalanche.cash">https://avalanche.cash</a></p><p></p><p>Stay tuned for more updates!</p>',
            short_content:
                'Our dev team has been busy building, and we wanted to share some insights with you on the Avalanche development progress on eCash!',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Thu Apr 06 2023 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'avalanche-pre-consensus-development-sneak-peek-march-2023',
            createdAt: '2023-06-20T23:05:13.488Z',
            updatedAt: '2023-06-21T21:24:38.169Z',
            publishedAt: '2023-06-20T23:05:13.481Z',
            legacy_image:
                '/images/642e9c353549ce03b63710a1_Avalanche%20Dev%20Sneak%20Peek.jpg',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 83,
                    attributes: {
                        name: '642e9c353549ce03b63710a1_Avalanche%20Dev%20Sneak%20Peek.jpg',
                        alternativeText: null,
                        caption: null,
                        width: 1920,
                        height: 1080,
                        formats: {
                            large: {
                                ext: '.jpg',
                                url: '/uploads/large_642e9c353549ce03b63710a1_Avalanche_20_Dev_20_Sneak_20_Peek_9fc08b5697.jpg',
                                hash: 'large_642e9c353549ce03b63710a1_Avalanche_20_Dev_20_Sneak_20_Peek_9fc08b5697',
                                mime: 'image/jpeg',
                                name: 'large_642e9c353549ce03b63710a1_Avalanche%20Dev%20Sneak%20Peek.jpg',
                                path: null,
                                size: 116.07,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.jpg',
                                url: '/uploads/small_642e9c353549ce03b63710a1_Avalanche_20_Dev_20_Sneak_20_Peek_9fc08b5697.jpg',
                                hash: 'small_642e9c353549ce03b63710a1_Avalanche_20_Dev_20_Sneak_20_Peek_9fc08b5697',
                                mime: 'image/jpeg',
                                name: 'small_642e9c353549ce03b63710a1_Avalanche%20Dev%20Sneak%20Peek.jpg',
                                path: null,
                                size: 30.55,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.jpg',
                                url: '/uploads/medium_642e9c353549ce03b63710a1_Avalanche_20_Dev_20_Sneak_20_Peek_9fc08b5697.jpg',
                                hash: 'medium_642e9c353549ce03b63710a1_Avalanche_20_Dev_20_Sneak_20_Peek_9fc08b5697',
                                mime: 'image/jpeg',
                                name: 'medium_642e9c353549ce03b63710a1_Avalanche%20Dev%20Sneak%20Peek.jpg',
                                path: null,
                                size: 67.35,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.jpg',
                                url: '/uploads/thumbnail_642e9c353549ce03b63710a1_Avalanche_20_Dev_20_Sneak_20_Peek_9fc08b5697.jpg',
                                hash: 'thumbnail_642e9c353549ce03b63710a1_Avalanche_20_Dev_20_Sneak_20_Peek_9fc08b5697',
                                mime: 'image/jpeg',
                                name: 'thumbnail_642e9c353549ce03b63710a1_Avalanche%20Dev%20Sneak%20Peek.jpg',
                                path: null,
                                size: 8.79,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '642e9c353549ce03b63710a1_Avalanche_20_Dev_20_Sneak_20_Peek_9fc08b5697',
                        ext: '.jpg',
                        mime: 'image/jpeg',
                        size: 392.23,
                        url: '/uploads/642e9c353549ce03b63710a1_Avalanche_20_Dev_20_Sneak_20_Peek_9fc08b5697.jpg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:03:07.788Z',
                        updatedAt: '2023-06-21T20:03:07.788Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 78,
        attributes: {
            title: 'eCash Monthly Recap - March 2023',
            content:
                '<p>As we are on the edge of a new month, it\'s time for our monthly recap to keep you in the loop on all the latest eCash developments and news!</p><p></p><p>Here\'s a quick recap of everything that went down in March! </p><p></p><h2>Key Highlights - Cashtab Wallet</h2><p>eCash Herald: A new Telegram channel that publishes the eCash Blockchain updates in real-time, developed by the Cashtab team.</p><p>➡️ Subscribe here: <a href="https://t.me/eCashHerald">https://t.me/eCashHerald</a>&nbsp;</p><p></p><p> Cashtab wallet’s \'eCash address alias\' feature is in live beta testing.</p><p></p><p>ecashaddrjs (the eCash address format for Node.js and web browsers) library was upgraded and added to the <a href="https://twitter.com/bitcoin_abc">@Bitcoin_ABC</a> Monorepo.</p><p> <a href="https://github.com/Bitcoin-ABC/bitcoin-abc/tree/424f228023ec4cf9f98b6543af49f334a76336e7/web/ecashaddrjs">https://github.com/Bitcoin-ABC/bitcoin-abc/tree/424f228023ec4cf9f98b6543af49f334a76336e7/web/ecashaddrjs</a>&nbsp;</p><p></p><h2>Key Highlights - Bitcoin ABC Node Software</h2><p><a href="https://twitter.com/bitcoin_abc">@Bitcoin_ABC</a> releases versions 0.27.0 &amp; 0.27.1, implementing the May 15th, 2023 eCash network upgrade and bringing minor fixes and improvements.</p><p>🔗 <a href="https://www.bitcoinabc.org/releases/">https://www.bitcoinabc.org/releases/</a>&nbsp;</p><p></p><h2>Key Highlights - eCash Network Upgrade</h2><figure class="w-richtext-figure-type-image w-richtext-align-center" data-rt-type="image" data-rt-align="center"><div><img src="/images/6427093765a8000f53e36cc7_UDaiwph-hfrHetd3CMmckfR31CGxQN0QntFHM0LAlL3eC_-QBOjOLimSTSthnB2z8WNklfEUQonEl72iTX9zAjX9k9dH0EICEqccL-aUR9lG5rXUZv2Kf_PLWjiD5N3RZzuYV0yo3tgbdygr7gmlH8I.jpeg" width="auto" height="auto" loading="auto"></div></figure><p></p><p>⚙️ The eCash network May 15th, 2023 upgrade was announced. Anyone running a <a href="http://bitcoinabc.org/">Bitcoin ABC</a> node is required to upgrade to the latest major version (0.27.x) before May 15th!</p><p>➡️ <a href="https://e.cash/blog/ecash-network-upgrade-may-15th-2023">https://e.cash/blog/ecash-network-upgrade-may-15th-2023</a>&nbsp;</p><p></p><h2>eCash Avalanche Network Overview</h2><figure class="w-richtext-figure-type-image w-richtext-align-center" data-rt-type="image" data-rt-align="center"><div><img src="/images/64270937e2a4e4145b37b616_qwU3vqT3DbL_O6NpYep6J3F3y2-gpKpOKZajEW4X83MDLRoilp6ScHyy3kc7eOPKk_cghvSTc5jl0rzUI5OqG8VNnLKuqMSKXpQU8cciKfjsZvzuaZxdksPY0XaVS_4p2r0gr11z0X9VNdQsmLQghgI.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>Total Staked: 74.5B XEC</p><p>Number of Nodes: 34</p><p>Number of Peers: 22</p><p>🗻 <a href="https://avalanche.cash">https://Avalanche.cash</a>&nbsp;</p><p></p><h2>Key Highlights - Community &amp; Milestones</h2><p>eCash\'s new <a href="https://coinmarketcap.com/community/profile/eCash">CMC community</a> surpassed 15K followers!</p><p>eCash\'s official <a href="https://www.facebook.com/groups/ecashofficial">Facebook community</a> reached 5K+ members!</p><p>#eCashArmy finished in 3rd place in the Crypto World Cup event organized by <a href="https://twitter.com/ultimateCrypto7/">@UltimateCrypto7</a> 🫡</p><p></p><p>That\'s a wrap on our monthly recap!</p><p>#eCashArmy, don\'t forget to follow and join our official social media accounts and community groups for more updates!</p><p><a href="https://ecash.community/">https://ecash.community/</a></p>',
            short_content:
                "As we are on the edge of a new month, it's time for our monthly recap to keep you in the loop on all the latest eCash developments and news!",
            type: 'Blog',
            media_link: '',
            publish_date:
                'Fri Mar 31 2023 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-monthly-recap-march-2023',
            createdAt: '2023-06-20T23:05:00.185Z',
            updatedAt: '2023-06-21T21:25:00.035Z',
            publishedAt: '2023-06-20T23:05:00.177Z',
            legacy_image: '/images/642708df386043294a8c3c58_March.jpg',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 74,
                    attributes: {
                        name: '642708df386043294a8c3c58_March.jpg',
                        alternativeText: null,
                        caption: null,
                        width: 3840,
                        height: 2160,
                        formats: {
                            large: {
                                ext: '.jpg',
                                url: '/uploads/large_642708df386043294a8c3c58_March_09d99ae289.jpg',
                                hash: 'large_642708df386043294a8c3c58_March_09d99ae289',
                                mime: 'image/jpeg',
                                name: 'large_642708df386043294a8c3c58_March.jpg',
                                path: null,
                                size: 59.1,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.jpg',
                                url: '/uploads/small_642708df386043294a8c3c58_March_09d99ae289.jpg',
                                hash: 'small_642708df386043294a8c3c58_March_09d99ae289',
                                mime: 'image/jpeg',
                                name: 'small_642708df386043294a8c3c58_March.jpg',
                                path: null,
                                size: 20.03,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.jpg',
                                url: '/uploads/medium_642708df386043294a8c3c58_March_09d99ae289.jpg',
                                hash: 'medium_642708df386043294a8c3c58_March_09d99ae289',
                                mime: 'image/jpeg',
                                name: 'medium_642708df386043294a8c3c58_March.jpg',
                                path: null,
                                size: 37.75,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.jpg',
                                url: '/uploads/thumbnail_642708df386043294a8c3c58_March_09d99ae289.jpg',
                                hash: 'thumbnail_642708df386043294a8c3c58_March_09d99ae289',
                                mime: 'image/jpeg',
                                name: 'thumbnail_642708df386043294a8c3c58_March.jpg',
                                path: null,
                                size: 6.56,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '642708df386043294a8c3c58_March_09d99ae289',
                        ext: '.jpg',
                        mime: 'image/jpeg',
                        size: 452.46,
                        url: '/uploads/642708df386043294a8c3c58_March_09d99ae289.jpg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:52.081Z',
                        updatedAt: '2023-06-21T20:01:52.081Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 77,
        attributes: {
            title: 'eCash Network Upgrade May 15th, 2023',
            content:
                '<h2>Who needs to upgrade?</h2><p>All operators of a Bitcoin ABC full node must upgrade to the latest major version (0.27.x). This includes Avalanche staking nodes, Miners and Exchanges. The up-to-date node version is available at our <a href="https://www.bitcoinabc.org/releases/">Releases</a> page.</p><p>‍</p><h2>Exactly when will the upgrade activate?</h2><p>In order to activate reliably at a predictable time, the network upgrade uses the "Median Time Past" mechanism. The upgrade activates when the median of the last 11 blocks reaches timestamp 1684152000 (12:00:00 UTC on May 15th, 2023). This means that the upgrade doesn\'t actually activate exactly at that time, but typically about one hour later, when 6 blocks with timestamps greater than the activation time have been produced.</p><p>‍</p><h2>What features are included in the Network Upgrade?</h2><h3>Consensus-enforced transaction version</h3><p>The version field of eCash transactions will be restricted to versions 1 or 2 by the consensus rules. This means that blocks containing a transaction with a different version number can no longer be mined. The purpose of this change is to pave the way for future implementation of a new transaction format. It will allow the new transaction format to use a version number that has never been used before in the eCash blockchain. This rule was previously enforced by policy, so no wallet update is required.</p><h3>Miner fund moved out of consensus rules</h3><p>The miner fund, part of the block reward that is funding eCash network development, will no longer be enforced by consensus. It will be enforced by policy, and a block that contains an invalid or no miner fund output will be rejected by Avalanche Post-Consensus. This will make it easier for updating the miner fund parameters such as the acceptable addresses.</p><h3>Removed chained transactions limits</h3><p>After the upgrade activates, Bitcoin ABC nodes will start accepting an unlimited number of chained transactions in the mempool. This was limited to 50 transactions before the upgrade. Note that this is a policy change and has no impact on the consensus rules.</p><p>‍</p><h2>How do I upgrade?</h2><p>The process of upgrading your node is straightforward: simply stop the currently running node, download the new version, and start the new version. Here are some example instructions for upgrading from version 0.26.13 to the latest version (0.27.0) on Linux:</p><ul><li>Shut down the node: ./bitcoin-abc-0.26.13/bin/bitcoin-cli stop</li><li>Download the new version archive from the website: wget https://download.bitcoinabc.org/0.27.0/linux/bitcoin-abc-0.27.0-x86_64-linux-gnu.tar.gz</li><li>Extract the archive: tar xzf bitcoin-abc-0.27.0-x86_64-linux-gnu.tar.gz</li><li>Restart the node with the new version: ./bitcoin-abc-0.27.0/bin/bitcoind -daemon</li><li>Clean up old version and archives (optional):</li><li>rm -rf bitcoin-abc-0.26.13</li><li>rm -f bitcoin-abc-0.26.13-x86_64-linux-gnu.tar.gz</li><li>rm -f bitcoin-abc-0.27.0-x86_64-linux-gnu.tar.gz</li></ul><h2>Do I need to upgrade my wallet?</h2><p>The network upgrade only affects full nodes. Other eCash software, including wallets such as <a href="https://www.bitcoinabc.org/electrum/">Electrum ABC</a> are not affected by the network upgrade.</p><p>‍</p><p><em>More information: </em><a href="https://www.bitcoinabc.org/upgrade/"><em>https://www.bitcoinabc.org/upgrade/</em></a></p>',
            short_content:
                'On May 15th, 2023, the eCash network will undergo an upgrade on its regular 6-month schedule.',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Wed Mar 08 2023 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-network-upgrade-may-15th-2023',
            createdAt: '2023-06-20T22:54:07.602Z',
            updatedAt: '2023-06-21T21:25:52.638Z',
            publishedAt: '2023-06-20T22:54:07.593Z',
            legacy_image:
                '/images/6408e5fbbf69629828101edc_May%2015th%20Upgrade.jpg',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 73,
                    attributes: {
                        name: '6408e5fbbf69629828101edc_May%2015th%20Upgrade.jpg',
                        alternativeText: null,
                        caption: null,
                        width: 978,
                        height: 613,
                        formats: {
                            small: {
                                ext: '.jpg',
                                url: '/uploads/small_6408e5fbbf69629828101edc_May_2015th_20_Upgrade_8747fedeae.jpg',
                                hash: 'small_6408e5fbbf69629828101edc_May_2015th_20_Upgrade_8747fedeae',
                                mime: 'image/jpeg',
                                name: 'small_6408e5fbbf69629828101edc_May%2015th%20Upgrade.jpg',
                                path: null,
                                size: 15.05,
                                width: 500,
                                height: 313,
                            },
                            medium: {
                                ext: '.jpg',
                                url: '/uploads/medium_6408e5fbbf69629828101edc_May_2015th_20_Upgrade_8747fedeae.jpg',
                                hash: 'medium_6408e5fbbf69629828101edc_May_2015th_20_Upgrade_8747fedeae',
                                mime: 'image/jpeg',
                                name: 'medium_6408e5fbbf69629828101edc_May%2015th%20Upgrade.jpg',
                                path: null,
                                size: 27.12,
                                width: 750,
                                height: 470,
                            },
                            thumbnail: {
                                ext: '.jpg',
                                url: '/uploads/thumbnail_6408e5fbbf69629828101edc_May_2015th_20_Upgrade_8747fedeae.jpg',
                                hash: 'thumbnail_6408e5fbbf69629828101edc_May_2015th_20_Upgrade_8747fedeae',
                                mime: 'image/jpeg',
                                name: 'thumbnail_6408e5fbbf69629828101edc_May%2015th%20Upgrade.jpg',
                                path: null,
                                size: 5.48,
                                width: 245,
                                height: 153,
                            },
                        },
                        hash: '6408e5fbbf69629828101edc_May_2015th_20_Upgrade_8747fedeae',
                        ext: '.jpg',
                        mime: 'image/jpeg',
                        size: 39.78,
                        url: '/uploads/6408e5fbbf69629828101edc_May_2015th_20_Upgrade_8747fedeae.jpg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:51.123Z',
                        updatedAt: '2023-06-21T20:01:51.123Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 76,
        attributes: {
            title: 'eCash Monthly Recap - February 2023',
            content:
                '<p>It\'s eCash Monthly Recap time!</p><p>Lots of stuff has happened in the eCash ecosystem this month, so there\'s plenty to catch up on. </p><p>Let\'s take a look back at February!</p><p>‍</p><h2> Key Highlights - Cashtab Wallet</h2><p>‍</p><p> Emoji and non-English language support added to eCash aliases</p><p>eCash aliases development (90% complete)</p><p>‍ eCash transaction support added to BitGoJS dev library </p><p><a href="https://github.com/BitGo/BitGoJS/">https://github.com/BitGo/BitGoJS/</a></p><p>⚙️ Improved Chronik reliability</p><p>‍</p><h2> Key Highlights - Electrum ABC Wallet</h2><p>‍</p><p>  Electrum ABC 5.2.2 is released, fixing support for Ledger and Trezor hardware wallets (broken in version 5.2.1).</p><p><a href="https://www.bitcoinabc.org/electrum/">https://www.bitcoinabc.org/electrum/</a></p><p>‍</p><h2> Key Highlights - Bitcoin ABC Node Software</h2><p>‍</p><p> Bitcoin ABC releases versions 0.26.12 &amp; 0.26.13, deprecating the 10-block finalization feature (superseded by Avalanche Post-Consensus) and bringing several RPC and under-the-hood improvements.</p><p><a href="https://www.bitcoinabc.org/releases/">https://www.bitcoinabc.org/releases/</a></p><p>‍</p><h2> Key Highlights - Avalanche on eCash</h2><p>‍</p><p> LBank and Gate.io exchanges started offering 1-confirmation XEC deposits powered by Avalanche Post-Consensus on eCash! </p><p> <a href="https://scorecard.cash/exchange/lbank">https://scorecard.cash/exchange/lbank</a></p><p> <a href="https://scorecard.cash/exchange/gate-io">https://scorecard.cash/exchange/gate-io</a>&nbsp;</p><p>‍</p><h2> eCash Avalanche Network Overview</h2><figure class="w-richtext-figure-type-image w-richtext-align-center" data-rt-type="image" data-rt-align="center"><div><img src="/images/63fe0e1e107b8c15e11beb25_Avalanche%20Stats%20Feb.jpg" loading="lazy" width="auto" height="auto"></div></figure><p>Total Staked: 74.9B XEC</p><p>Number of Nodes: 35</p><p>Number of Peers: 23</p><p> <a href="https://Avalanche.cash">https://Avalanche.cash</a></p><p>‍</p><h2> Key Highlights - News/Media</h2><p>‍</p><p> Community Artist, Morazán Primary Landlord, Adds eCash and eLPS Support</p><p><a href="https://www.morazan.city/community-artist-morazan-primary-landlord-adds-ecash-and-elps-support/">https://www.morazan.city/community-artist-morazan-primary-landlord-adds-ecash-and-elps-support/</a></p><p>‍</p><p>UNoticias: "eCash, an alternative to Bitcoin with low commissions"</p><p><a href="https://en.ultimasnoticias.com.ve/news/fintech/ecash-an-alternative-to-bitcoin-with-low-commissions/">https://en.ultimasnoticias.com.ve/news/fintech/ecash-an-alternative-to-bitcoin-with-low-commissions/</a></p><p>‍</p><h2> Key Highlights - Community &amp; Milestones</h2><p>‍</p><p> <a href="https://coinmarketcap.com/community/profile/eCash">eCash\'s new CMC community</a> surpasses 9K followers!</p><p> <a href="https://t.me/eCash">@eCash</a> is our new Telegram handle!</p><p> #eCashArmy participates in the eCash Wave community rewards program!</p><p>➡️ <a href="https://ecashwave.com/">https://ecashwave.com/</a>&nbsp;</p><p>‍</p><p>And that’s a wrap!</p><p> #eCashArmy, don\'t forget to follow and join our official social media accounts and community groups for more updates!</p><p><a href="https://ecash.community/">https://ecash.community/</a></p><p>‍</p>',
            short_content:
                "Lots of cool stuff has happened in the eCash ecosystem this month, so there's plenty to catch up on. Let's take a look back at February!",
            type: 'Blog',
            media_link: '',
            publish_date:
                'Tue Feb 28 2023 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-monthly-recap-2023-02',
            createdAt: '2023-06-20T22:53:54.802Z',
            updatedAt: '2023-06-21T21:26:36.774Z',
            publishedAt: '2023-06-20T22:53:54.792Z',
            legacy_image: '/images/63fe0d80660bc4c1e6164a7d_Feb.jpg',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 75,
                    attributes: {
                        name: '63fe0d80660bc4c1e6164a7d_Feb.jpg',
                        alternativeText: null,
                        caption: null,
                        width: 3840,
                        height: 2160,
                        formats: {
                            large: {
                                ext: '.jpg',
                                url: '/uploads/large_63fe0d80660bc4c1e6164a7d_Feb_177ed509a4.jpg',
                                hash: 'large_63fe0d80660bc4c1e6164a7d_Feb_177ed509a4',
                                mime: 'image/jpeg',
                                name: 'large_63fe0d80660bc4c1e6164a7d_Feb.jpg',
                                path: null,
                                size: 60.8,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.jpg',
                                url: '/uploads/small_63fe0d80660bc4c1e6164a7d_Feb_177ed509a4.jpg',
                                hash: 'small_63fe0d80660bc4c1e6164a7d_Feb_177ed509a4',
                                mime: 'image/jpeg',
                                name: 'small_63fe0d80660bc4c1e6164a7d_Feb.jpg',
                                path: null,
                                size: 20.8,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.jpg',
                                url: '/uploads/medium_63fe0d80660bc4c1e6164a7d_Feb_177ed509a4.jpg',
                                hash: 'medium_63fe0d80660bc4c1e6164a7d_Feb_177ed509a4',
                                mime: 'image/jpeg',
                                name: 'medium_63fe0d80660bc4c1e6164a7d_Feb.jpg',
                                path: null,
                                size: 39.13,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.jpg',
                                url: '/uploads/thumbnail_63fe0d80660bc4c1e6164a7d_Feb_177ed509a4.jpg',
                                hash: 'thumbnail_63fe0d80660bc4c1e6164a7d_Feb_177ed509a4',
                                mime: 'image/jpeg',
                                name: 'thumbnail_63fe0d80660bc4c1e6164a7d_Feb.jpg',
                                path: null,
                                size: 6.92,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '63fe0d80660bc4c1e6164a7d_Feb_177ed509a4',
                        ext: '.jpg',
                        mime: 'image/jpeg',
                        size: 457.93,
                        url: '/uploads/63fe0d80660bc4c1e6164a7d_Feb_177ed509a4.jpg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:52.103Z',
                        updatedAt: '2023-06-21T20:01:52.103Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 75,
        attributes: {
            title: 'eCash Monthly Recap - January 2023',
            content:
                '<p>The new year is off to a great start for eCash and the eCash ecosystem! </p><p>‍</p><p>A lot has happened in the first month of the year. Did you miss any of the updates? </p><p>‍</p><p>Let\'s dive in and check out all that happened! </p><p>‍</p><h2> Key Highlights - Cashtab Wallet</h2><p>‍</p><p>eCash aliases development is underway</p><p><a href="https://reviews.bitcoinabc.org/D12972">https://reviews.bitcoinabc.org/D12972</a>&nbsp;</p><p>‍</p><p>‍ Work is underway to upgrade XEC transaction creation methods to the latest dev libraries</p><p>‍</p><p>‍ eCash transaction support PR submitted for review at Bitgo library</p><p>‍</p><h2> Key Highlights - Electrum ABC Wallet</h2><p>‍</p><p>  Electrum ABC 5.2.0 &amp; 5.2.1 are released bringing bug fixes, privacy &amp; CashFusion CLI improvements, and a new feature to display the XEC amount for selected coins and addresses in the status bar.</p><p><a href="https://www.bitcoinabc.org/electrum/">https://www.bitcoinabc.org/electrum/</a></p><p>‍</p><h2> Key Highlights - Bitcoin ABC Node Software</h2><p>‍</p><p> <a href="https://twitter.com/bitcoin_abc">@Bitcoin_ABC</a> releases versions 0.26.10 and 0.26.11 adding a connectivity check for Avalanche staking nodes and bringing various RPC and performance improvements.</p><p>‍</p><p><a href="https://www.bitcoinabc.org/releases/">https://www.bitcoinabc.org/releases/</a>&nbsp;</p><p>‍</p><h2> Key Highlights - Avalanche on eCash</h2><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1600px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1600px"><div><img src="/images/63d90ab272f34b93db1e5687_tQdCb52pGKxaTzwi-qgO60Ozi3Hi23YkltexHSK0IV2PGhNhGCn2LuveORjGBgIq-ZWNk1Z3o6I7PyxrPfkh7BRyjP3xFPa-B93SZqqAVngUn6aygZ3PkNy8KKo9Et92mqqzNmw3R0gatF-WAFfHyiQ.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>‍</p><p>‍ The development of Avalanche Pre-Consensus on eCash is underway.</p><p>‍</p><p>Coming Soon:</p><p> Instant Transaction Finality ⚡️</p><p> Real-time Transaction Processing</p><p>‍</p><p>diffs on <a href="https://avalanche.cash">https://Avalanche.cash</a>&nbsp;</p><p>‍</p><h2> eCash Avalanche Network Overview</h2><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1600px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1600px"><div><img src="/images/63d90ab2c6813a600985d4e1_lGP94ObGA_lu143v2ishkvB8kDpHOXCO5pqXvzZ5_uZyVf1OsRJ9kxGq3GbdDqnCRySnkjlvv0A0yQD_b_g-ivIPgWSMOSRD5XiKdaznTXla3bBNoRTWo6JIMJOtGxsIxfDRBVE0HIlzBoofLIVrwNU.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>Total Staked: 85.4B XEC</p><p>Number of Nodes: 38</p><p>Number of Peers: 23</p><p>‍</p><p><a href="https://avalanche.cash">https://Avalanche.cash</a>&nbsp;</p><p>‍</p><h2> Key Highlights - News/Media</h2><p>‍</p><p>&nbsp;Changelly exchange lists eCash (XEC)! </p><p> <a href="https://changelly.page.link/exchange-xec">https://changelly.page.link/exchange-xec</a>&nbsp;</p><p>‍</p><p> MSN: <a href="https://www.msn.com/en-us/money/markets/ethereum-tops-this-major-level-ecash-becomes-top-gainer/">Ethereum Tops This Major Level; eCash Becomes Top Gainer</a></p><p>‍</p><p>️ A new starter guide for devs by Cashtab lead developer <a href="https://twitter.com/bytesofman">Joey King</a> explaining how to create an eCash app using the Chronik Indexer:</p><p>‍</p><p> <a href="https://e.cash/blog/building-on-ecash-january-2023">https://e.cash/blog/building-on-ecash-january-2023</a>&nbsp;</p><p>‍</p><h2> Key Highlights - Community &amp; Milestones</h2><p>‍</p><p>eCash\'s new <a href="https://coinmarketcap.com/community/profile/eCash">Coin Market Cap Community</a> is now verified ☑️</p><p>‍</p><p> eCash\'s new CMC community surpasses 2.9K followers.</p><p>‍</p><p>Follow<a href="https://coinmarketcap.com/community/profile/eCash">https://coinmarketcap.com/community/profile/eCash</a></p><p>‍</p><p> Lunar Crush data shows a surge in the eCash (XEC) social metrics! </p><p><a href="https://lunarcrush.com/coins/xec/ecash?metric=social_score%2Csocial_volume">https://lunarcrush.com/coins/xec/ecash?metric=social_score%2Csocial_volume</a>&nbsp;</p><p>‍</p><p>That is all for this month. </p><p>‍</p><p>Exciting times ahead, the eCash team has a lot in store planned for 2023. Stay tuned! </p><p>‍</p>',
            short_content:
                'The new year is off to a great start for eCash and the eCash ecosystem!  A lot has happened in the first month of the year. Did you miss',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Tue Jan 31 2023 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-monthly-recap-2023-01',
            createdAt: '2023-06-20T22:53:41.598Z',
            updatedAt: '2023-06-21T21:26:50.532Z',
            publishedAt: '2023-06-20T22:53:41.593Z',
            legacy_image:
                '/images/63d90a99600f576a34707b39_Screenshot%202023-01-31%20at%204.33.17%20AM.png',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 76,
                    attributes: {
                        name: '63d90a99600f576a34707b39_Screenshot%202023-01-31%20at%204.33.17%20AM.png',
                        alternativeText: null,
                        caption: null,
                        width: 988,
                        height: 554,
                        formats: {
                            small: {
                                ext: '.png',
                                url: '/uploads/small_63d90a99600f576a34707b39_Screenshot_202023_01_31_20at_204_33_17_20_AM_37b250f10f.png',
                                hash: 'small_63d90a99600f576a34707b39_Screenshot_202023_01_31_20at_204_33_17_20_AM_37b250f10f',
                                mime: 'image/png',
                                name: 'small_63d90a99600f576a34707b39_Screenshot%202023-01-31%20at%204.33.17%20AM.png',
                                path: null,
                                size: 251.03,
                                width: 500,
                                height: 280,
                            },
                            medium: {
                                ext: '.png',
                                url: '/uploads/medium_63d90a99600f576a34707b39_Screenshot_202023_01_31_20at_204_33_17_20_AM_37b250f10f.png',
                                hash: 'medium_63d90a99600f576a34707b39_Screenshot_202023_01_31_20at_204_33_17_20_AM_37b250f10f',
                                mime: 'image/png',
                                name: 'medium_63d90a99600f576a34707b39_Screenshot%202023-01-31%20at%204.33.17%20AM.png',
                                path: null,
                                size: 532.4,
                                width: 750,
                                height: 421,
                            },
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_63d90a99600f576a34707b39_Screenshot_202023_01_31_20at_204_33_17_20_AM_37b250f10f.png',
                                hash: 'thumbnail_63d90a99600f576a34707b39_Screenshot_202023_01_31_20at_204_33_17_20_AM_37b250f10f',
                                mime: 'image/png',
                                name: 'thumbnail_63d90a99600f576a34707b39_Screenshot%202023-01-31%20at%204.33.17%20AM.png',
                                path: null,
                                size: 68.86,
                                width: 245,
                                height: 137,
                            },
                        },
                        hash: '63d90a99600f576a34707b39_Screenshot_202023_01_31_20at_204_33_17_20_AM_37b250f10f',
                        ext: '.png',
                        mime: 'image/png',
                        size: 193.66,
                        url: '/uploads/63d90a99600f576a34707b39_Screenshot_202023_01_31_20at_204_33_17_20_AM_37b250f10f.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:53.713Z',
                        updatedAt: '2023-06-21T20:01:53.713Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 74,
        attributes: {
            title: 'Building on eCash: Creating a Demo App Using the Chronik Indexer',
            content:
                "<h3><strong>Building on eCash: Creating a Demo App Using the Chronik Indexer</strong></h3><p><strong><em>— </em></strong><a href=\"https://twitter.com/bytesofman\" target=\"_blank\"><strong><em>Joey</em></strong></a><strong><em>, lead dev, Cashtab</em></strong></p><p>Last month, I wrote about <a href=\"https://e.cash/blog/building-on-ecash-2022-12\" target=\"_blank\">available tools and libraries for developers</a> looking to get started with eCash. This month, let’s put together a quick demo app using the chronik indexer.</p><p>Here are some basic bash command prompt instructions. You will need <a href=\"https://github.com/nvm-sh/nvm\" target=\"_blank\">nodejs</a> to follow the example here.</p><p>First, we create the directory for our app, initialize an npm module, install chronik, and create our first script.</p><p>{% c-block language=\"bash\"%}<br>$ mkdir node-chronik-testdrive<br>$ cd chronik-node-testdrive<br>$ npm init<br>$ npm i chronik-client<br>$ touch getDetailsFromTxid.js<br>{% c-block-end %}</p><p>Next, let's write a function that queries {% c-line %}chronik{% c-line-end %} &nbsp;for information about a transaction.</p><p>{% c-block language=\"js\" %}<br>/*getDetailsFromTxid.js*/<br>const { ChronikClient } = require('chronik-client');<br>const chronik = new ChronikClient('https://chronik.fabien.cash');<br>async function getTxDetails(txid) {<br> &nbsp; &nbsp;let txDetails;<br> &nbsp; &nbsp;try {<br> &nbsp; &nbsp; &nbsp; &nbsp;txDetails = await chronik.tx(txid);<br> &nbsp; &nbsp; &nbsp; &nbsp;console.log(txDetails);<br> &nbsp; &nbsp;} catch (err) {<br> &nbsp; &nbsp; &nbsp; &nbsp;console.log(`Error in chronik.tx(${txid})`);<br> &nbsp; &nbsp; &nbsp; &nbsp;console.log(err);<br> &nbsp; &nbsp;}<br>}<br>getTxDetails(process.env.TXID);<br>{% c-block-end %}</p><p>Now we can run the script from the command line by entering a txid as an env variable.</p><p>{% c-block language=\"bash\"%}<br>$ TXID=3c8f39cbfb663312010fe9279e99d147c0a676416ebd131df746081f41fdce8c node getDetailsFromTxid.js<br>$ {<br> &nbsp;txid: '3c8f39cbfb663312010fe9279e99d147c0a676416ebd131df746081f41fdce8c',<br> &nbsp;version: 2,<br> &nbsp;inputs: [<br> &nbsp; &nbsp;{<br> &nbsp; &nbsp; &nbsp;prevOut: [Object],<br> &nbsp; &nbsp; &nbsp;inputScript: '48304502210097277ddff25681cc5e303de359e7812364b7b2adc179081e9652fede69d97b5b02200f029c01eae95787ae6e9cf477999e5e3db081f631184933b2e16dd0e5414f484121020cba405a7e2396485b94d70a21dbdba29fb6a61970ed3a210dc30bf879f1059d',<br> &nbsp; &nbsp; &nbsp;outputScript: '76a914e0a3c5d6dc80ee3a2e084dca41a6ac9a4bf3f2e288ac',<br> &nbsp; &nbsp; &nbsp;value: '428143644042',<br> &nbsp; &nbsp; &nbsp;sequenceNo: 4294967295,<br> &nbsp; &nbsp; &nbsp;slpBurn: undefined,<br> &nbsp; &nbsp; &nbsp;slpToken: undefined<br> &nbsp; &nbsp;}<br> &nbsp;],<br> &nbsp;outputs: [<br> &nbsp; &nbsp;{<br> &nbsp; &nbsp; &nbsp;value: '10848865900',<br> &nbsp; &nbsp; &nbsp;outputScript: '76a9145511fb10a3de1ade2ecde41176139b1425e1b21788ac',<br> &nbsp; &nbsp; &nbsp;slpToken: undefined,<br> &nbsp; &nbsp; &nbsp;spentBy: [Object]<br> &nbsp; &nbsp;},<br> &nbsp; &nbsp;{<br> &nbsp; &nbsp; &nbsp;value: '417294777712',<br> &nbsp; &nbsp; &nbsp;outputScript: '76a914e0a3c5d6dc80ee3a2e084dca41a6ac9a4bf3f2e288ac',<br> &nbsp; &nbsp; &nbsp;slpToken: undefined,<br> &nbsp; &nbsp; &nbsp;spentBy: [Object]<br> &nbsp; &nbsp;}<br> &nbsp;],<br> &nbsp;lockTime: 0,<br> &nbsp;slpTxData: undefined,<br> &nbsp;slpErrorMsg: undefined,<br> &nbsp;block: {<br> &nbsp; &nbsp;height: 776279,<br> &nbsp; &nbsp;hash: '00000000000000000639809bb892ddd9f739ab18bf6a734ee07299965affac1a',<br> &nbsp; &nbsp;timestamp: '1674602795'<br> &nbsp;},<br> &nbsp;timeFirstSeen: '1674602114',<br> &nbsp;size: 226,<br> &nbsp;isCoinbase: false,<br> &nbsp;network: 'XEC'<br>}<br>{% c-block-end %}</p><p>Great! Now we can use this script to get tx details for any given txid.&nbsp;</p><p>What else can we do with chronik?</p><p>To build a basic wallet app, you need to know how much eCash is available to spend at the wallet's address. Spendable eCash is stored in objects called \"utxos,\" or \"unspent transaction outputs.\" Let’s write a simple script to get utxos from a wallet:</p><p>{% c-block language=\"bash\"%}<br>$ touch getUtxosFromAddress.js<br>{% c-block-end %}</p><p>{% c-block language=\"js\" %}<br>/*getUtxosFromAddress.js*/<br>const { ChronikClient } = require('chronik-client');<br>const chronik = new ChronikClient('https://chronik.fabien.cash');<br><br>async function getUtxos(address) {<br> &nbsp; &nbsp;/*Note:&nbsp;chronik requires a hash160, but this function accepts an address input<br> &nbsp; &nbsp;We'll need some way of converting an address to a hash160*/<br> &nbsp; &nbsp;let hash160 = someFunctionOfAddress(address);<br> &nbsp; &nbsp;let utxos;<br><br> &nbsp; &nbsp;try {<br> &nbsp; &nbsp; &nbsp; &nbsp;utxos = await chronik.script('p2pkh', hash160).utxos();<br> &nbsp; &nbsp; &nbsp; &nbsp;console.log(utxos[0].utxos);<br> &nbsp; &nbsp;} catch (err) {<br> &nbsp; &nbsp; &nbsp; &nbsp;console.log(`Error in chronik.utxos(${hash160})`);<br> &nbsp; &nbsp; &nbsp; &nbsp;console.log(err);<br> &nbsp; &nbsp;}<br>}<br>getUtxos(process.env.ADDRESS);<br>{% c-block-end %}<br>While we are used to thinking of wallets and addresses, chronik accesses information about an address at a lower level. So, for a typical wallet address, we’ll need to first get the hash160 before we can see its utxo set. Let's write a helper function to get the hash160 from an eCash address.<br></p><p>{% c-block language=\"bash\"%}<br>$ npm i ecashaddrjs bs58<br>$&nbsp;touch helperFunctions.js<br>{% c-block-end %}</p><p>{% c-block language=\"js\" %}<br>/*helperFunctions.js*/<br>const ecashaddr = require('ecashaddrjs');<br>const bs58 = require('bs58');<br>module.exports = {<br> &nbsp; &nbsp;addressToHash160: function (address) {<br> &nbsp; &nbsp; &nbsp; &nbsp;try {<br> &nbsp; &nbsp; &nbsp; &nbsp;/* decode address hash */<br> &nbsp; &nbsp; &nbsp; &nbsp;const { hash } = ecashaddr.decode(address);<br> &nbsp; &nbsp; &nbsp; &nbsp;/* encode the address hash to legacy format (bitcoin) */<br> &nbsp; &nbsp; &nbsp; &nbsp;const legacyAdress = bs58.encode(hash);<br> &nbsp; &nbsp; &nbsp; &nbsp;/* convert legacy to hash160 */<br> &nbsp; &nbsp; &nbsp; &nbsp;const hash160 = Buffer.from(bs58.decode(legacyAdress)).toString(<br> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;'hex',<br> &nbsp; &nbsp; &nbsp; &nbsp;);<br> &nbsp; &nbsp; &nbsp; &nbsp;return hash160;<br> &nbsp; &nbsp;} catch (err) {<br> &nbsp; &nbsp; &nbsp; &nbsp;console.log('Error converting address to hash160');<br> &nbsp; &nbsp; &nbsp; &nbsp;throw err;<br> &nbsp; &nbsp;}<br> &nbsp; &nbsp;},<br>};<br>{% c-block-end %}</p><p>Now we can go back and include the helper function {% c-line %}addressToHash160{% c-line-end %} in getUtxosFromAddress.js</p><p>{% c-block language=\"js\" %}<br>/* getUtxosFromAddress.js */<br>const { ChronikClient } = require('chronik-client');<br>const chronik = new ChronikClient('https://chronik.fabien.cash');<br>const { addressToHash160 } = require('./helperFunctions');<br>async function getUtxos(address) {<br> &nbsp;/* Convert address to hash160 */<br> &nbsp;const hash160 = addressToHash160(address);<br> &nbsp;let utxos;<br> &nbsp;try {<br> &nbsp; &nbsp; &nbsp;utxos = await chronik.script('p2pkh', hash160).utxos();<br> &nbsp; &nbsp; &nbsp;console.log(utxos[0].utxos);<br> &nbsp;} catch (err) {<br> &nbsp; &nbsp; &nbsp;console.log(`Error in chronik.utxos(${hash160})`);<br> &nbsp; &nbsp; &nbsp;console.log(err);<br> &nbsp;}<br>}<br>getUtxos(process.env.ADDRESS);<br>{% c-block-end %}</p><p>...so now, we can get the utxo set of an eCash address by running this script from the command line.</p><p>{% c-block language=\"bash\"%}<br>$ ADDRESS=ecash:qzqk7ephyf66s8829ywcjv52fuut35q77u8hqcpvdq node getUtxosFromAddress.js<br>$ [<br> &nbsp;{<br> &nbsp; &nbsp;outpoint: {<br> &nbsp; &nbsp; &nbsp;txid: '3e3cc96ae606653159a6a4920915742a3a3591609a269d623c2bda26339ed9aa',<br> &nbsp; &nbsp; &nbsp;outIdx: 1<br> &nbsp; &nbsp;},<br> &nbsp; &nbsp;blockHeight: -1,<br> &nbsp; &nbsp;isCoinbase: false,<br> &nbsp; &nbsp;value: '546',<br> &nbsp; &nbsp;slpMeta: {<br> &nbsp; &nbsp; &nbsp;tokenType: 'FUNGIBLE',<br> &nbsp; &nbsp; &nbsp;txType: 'SEND',<br> &nbsp; &nbsp; &nbsp;tokenId: '98183238638ecb4ddc365056e22de0e8a05448c1e6084bae247fae5a74ad4f48',<br> &nbsp; &nbsp; &nbsp;groupTokenId: undefined<br> &nbsp; &nbsp;},<br> &nbsp; &nbsp;slpToken: { amount: '1234', isMintBaton: false },<br> &nbsp; &nbsp;network: 'XEC'<br> &nbsp;},<br> &nbsp;{<br> &nbsp; &nbsp;outpoint: {<br> &nbsp; &nbsp; &nbsp;txid: '816d32c855e40c4221482eb85390a72ba0906360197c297a787125e6979e674e',<br> &nbsp; &nbsp; &nbsp;outIdx: 0<br> &nbsp; &nbsp;},<br> &nbsp; &nbsp;blockHeight: -1,<br> &nbsp; &nbsp;isCoinbase: false,<br> &nbsp; &nbsp;value: '1200000',<br> &nbsp; &nbsp;slpMeta: undefined,<br> &nbsp; &nbsp;slpToken: undefined,<br> &nbsp; &nbsp;network: 'XEC'<br> &nbsp;}<br>]<br>{% c-block-end %}</p><p>Great! What about tx history?</p><p>{% c-block language=\"bash\"%}<br>$ touch getTxHistoryFromAddress.js<br>{% c-block-end %}</p><p>{% c-block language=\"js\" %}<br>/* getTxHistoryFromAddress.js */<br>const { ChronikClient } = require('chronik-client');<br>const chronik = new ChronikClient('https://chronik.fabien.cash');<br>const { addressToHash160 } = require('./helperFunctions');<br>async function getTxHistory(address) {<br> &nbsp;const hash160 = addressToHash160(address)<br> &nbsp; &nbsp;let history;<br> &nbsp; &nbsp;try {<br> &nbsp; &nbsp; &nbsp; &nbsp;history = await chronik<br> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;.script('p2pkh', hash160)<br> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;.history(/*page=*/ 0, /*page_size=*/ 10);<br> &nbsp; &nbsp; &nbsp; &nbsp;console.log(history);<br> &nbsp; &nbsp;} catch (err) {<br> &nbsp; &nbsp; &nbsp; &nbsp;console.log(`Error in chronik.script('p2pkh', ${hash160}).history()`);<br> &nbsp; &nbsp; &nbsp; &nbsp;console.log(err);<br> &nbsp; &nbsp;}<br>}<br>getTxHistory(process.env.ADDRESS);<br>{% c-block-end %}</p><p>{% c-block language=\"bash\"%}<br>$ ADDRESS=ecash:qzqk7ephyf66s8829ywcjv52fuut35q77u8hqcpvdq node getTxHistoryFromAddress.js<br>$ {<br> &nbsp;txs: [<br> &nbsp; &nbsp;{<br> &nbsp; &nbsp; &nbsp;txid: '3e3cc96ae606653159a6a4920915742a3a3591609a269d623c2bda26339ed9aa',<br> &nbsp; &nbsp; &nbsp;version: 2,<br> &nbsp; &nbsp; &nbsp;inputs: [Array],<br> &nbsp; &nbsp; &nbsp;outputs: [Array],<br> &nbsp; &nbsp; &nbsp;lockTime: 0,<br> &nbsp; &nbsp; &nbsp;slpTxData: [Object],<br> &nbsp; &nbsp; &nbsp;slpErrorMsg: undefined,<br> &nbsp; &nbsp; &nbsp;block: undefined,<br> &nbsp; &nbsp; &nbsp;timeFirstSeen: '1674687524',<br> &nbsp; &nbsp; &nbsp;size: 481,<br> &nbsp; &nbsp; &nbsp;isCoinbase: false,<br> &nbsp; &nbsp; &nbsp;network: 'XEC'<br> &nbsp; &nbsp;},<br> &nbsp; &nbsp;{<br> &nbsp; &nbsp; &nbsp;txid: '816d32c855e40c4221482eb85390a72ba0906360197c297a787125e6979e674e',<br> &nbsp; &nbsp; &nbsp;version: 2,<br> &nbsp; &nbsp; &nbsp;inputs: [Array],<br> &nbsp; &nbsp; &nbsp;outputs: [Array],<br> &nbsp; &nbsp; &nbsp;lockTime: 0,<br> &nbsp; &nbsp; &nbsp;slpTxData: undefined,<br> &nbsp; &nbsp; &nbsp;slpErrorMsg: undefined,<br> &nbsp; &nbsp; &nbsp;block: undefined,<br> &nbsp; &nbsp; &nbsp;timeFirstSeen: '1674687499',<br> &nbsp; &nbsp; &nbsp;size: 226,<br> &nbsp; &nbsp; &nbsp;isCoinbase: false,<br> &nbsp; &nbsp; &nbsp;network: 'XEC'<br> &nbsp; &nbsp;}<br> &nbsp;],<br> &nbsp;numPages: 1<br>}<br>{% c-block-end %}</p><p>The final app is available <a href=\"https://github.com/BytesOfMan/chronik-node-testdrive\" target=\"_blank\">here.</a> You could also check out <a href=\"https://github.com/Bitcoin-ABC/bitcoin-abc/tree/master/web/cashtab\" target=\"_blank\">Cashtab's source code</a> to see how to use chronik in a React app. Or check out the <a href=\"https://t.me/eCashDevelopment\" target=\"_blank\">eCash development telegram chat</a> if you have any questions about using these tools to build on eCash.</p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p>",
            short_content:
                'This month, let’s put together a quick demo app using the chronik indexer.',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Mon Jan 30 2023 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'building-on-ecash-january-2023',
            createdAt: '2023-06-20T22:53:27.535Z',
            updatedAt: '2023-06-21T21:27:28.865Z',
            publishedAt: '2023-06-20T22:53:27.529Z',
            legacy_image: '/images/639a5f3223919f932878474a_Poster.png',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 77,
                    attributes: {
                        name: '639a5f3223919f932878474a_Poster.png',
                        alternativeText: null,
                        caption: null,
                        width: 1600,
                        height: 900,
                        formats: {
                            large: {
                                ext: '.png',
                                url: '/uploads/large_639a5f3223919f932878474a_Poster_3b26f5e6fc.png',
                                hash: 'large_639a5f3223919f932878474a_Poster_3b26f5e6fc',
                                mime: 'image/png',
                                name: 'large_639a5f3223919f932878474a_Poster.png',
                                path: null,
                                size: 983.48,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.png',
                                url: '/uploads/small_639a5f3223919f932878474a_Poster_3b26f5e6fc.png',
                                hash: 'small_639a5f3223919f932878474a_Poster_3b26f5e6fc',
                                mime: 'image/png',
                                name: 'small_639a5f3223919f932878474a_Poster.png',
                                path: null,
                                size: 302.88,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.png',
                                url: '/uploads/medium_639a5f3223919f932878474a_Poster_3b26f5e6fc.png',
                                hash: 'medium_639a5f3223919f932878474a_Poster_3b26f5e6fc',
                                mime: 'image/png',
                                name: 'medium_639a5f3223919f932878474a_Poster.png',
                                path: null,
                                size: 598.03,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_639a5f3223919f932878474a_Poster_3b26f5e6fc.png',
                                hash: 'thumbnail_639a5f3223919f932878474a_Poster_3b26f5e6fc',
                                mime: 'image/png',
                                name: 'thumbnail_639a5f3223919f932878474a_Poster.png',
                                path: null,
                                size: 69.03,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '639a5f3223919f932878474a_Poster_3b26f5e6fc',
                        ext: '.png',
                        mime: 'image/png',
                        size: 339.39,
                        url: '/uploads/639a5f3223919f932878474a_Poster_3b26f5e6fc.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:02:20.655Z',
                        updatedAt: '2023-06-21T20:02:20.655Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 73,
        attributes: {
            title: 'eCash Monthly Recap - December 2022',
            content:
                '<p>December was a MASSIVE month for the eCash ecosystem! </p><p>‍</p><p>2 new GNC projects, 3 exchanges activating 1-block finality for XEC deposits, 2 releases of eCash node software, and more... </p><p>‍</p><p>Did you miss any of the updates? </p><p>‍</p><p>Let’s take you through a recap!&nbsp; </p><p>‍</p><h2> Key Highlights - Cashtab Wallet</h2><p>‍</p><p>Cashtab wallet\'s Chronik integration is complete:</p><p>⚡️ Improved loading speed</p><p> Optimized transaction history</p><p>⚙️ Efficient all-in-one backend</p><p>Instant notifications</p><p>‍ Significant optimization &amp; simplification of the codebase</p><p>‍</p><h2> Key Highlights - GNC (Global Network Council)</h2><p>‍</p><p> <a href="https://gnc.e.cash">eCash\'s GNC</a> approved and funded a new project: P2P Electronic Cash Research in Ciudad Morazán, Honduras!</p><p>‍</p><p><a href="https://e.cash/blog/ecashs-global-network-council-gnc-to-fund-p2p-electronic-cash-research-in-ciudad-morazan">https://e.cash/blog/ecashs-global-network-council-gnc-to-fund-p2p-electronic-cash-research-in-ciudad-morazan</a></p><p>‍</p><p> A minimal eToken explorer app funded by the GNC, was developed and released:</p><p>‍</p><p><a href="https://etokens.info">eTokens.info</a>&nbsp;</p><p>‍</p><h2> Key Highlights - Bitcoin ABC Node Software</h2><p>‍</p><p> <a href="https://twitter.com/bitcoin_abc">Bitcoin ABC</a> releases versions 0.26.8 and 0.26.9 bringing new RPCs for requesting a specific block from a specific peer, restoring a wallet from a backup file, and several other improvements.</p><p>‍</p><p><a href="https://www.bitcoinabc.org/releases/">https://www.bitcoinabc.org/releases/</a>&nbsp;</p><h2> Key Highlights - Avalanche on eCash</h2><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1600px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1600px"><div><img src="/images/6388d5f13da41f37032adf10_hRvZoMZLSednx3mHjFmxPk_fxRhb83V4D1eHxlfzCy5_-cs3LHzRQJBeO5aFkqh8EdCUTitdaxIgXdKhviepF5t9xgL5A9bPyRLepawwpPa9X0ctBHZsRm-E1Yn_jN0HdBQ_Ak6Qyr-9hbCyGctXF6bEnXPjOTX9zapEIm7kYyyIyu4WnCZjgK4Bv6CT1A.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>‍</p><p> Bitrue, CoinEx, and SouthXChange joined the growing 1-conf club and started offering 1-confirmation XEC deposits, secured by Avalanche Post-Consensus on eCash! </p><p>‍</p><p> <a href="https://scorecard.cash">https://scorecard.cash</a>&nbsp;</p><p>‍</p><h2> eCash Avalanche Network Overview</h2><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1600px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1600px"><div><img src="/images/63afd48def34794fc7d277d5__4uGM5bXDKMNQ1VgrE_l5vlY6-54DfADF0AyPeFfy-iTeVSb4-6-5ZvBpVPx9rRMTWrLswJhk6n2z7QwrOXGJm3zNTwdhpuQkcSiNqOY5_THb1yyuEZjRL1tunJUBPs9hoYua0kFNzZvE9RXAzfrHkI-ai8jGU8J2GK5YQB2McofzpZeq01afq0wtHwBMg.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>Total Staked: 85.3B XEC</p><p>Number of Nodes: 37</p><p>Number of Peers: 22</p><p>‍</p><p><a href="https://avalanche.cash">https://avalanche.cash</a>&nbsp;</p><h2> Key Highlights - News/Media</h2><p>‍</p><p> Hotbit exchange reduces the number of confirmations required for XEC deposits from 10 down to 2. </p><p>‍</p><p> FMFW.io exchange reduces the number of confirmations required for XEC deposits from 10 down to 5. </p><p>‍</p><p>️ A new starter guide by Cashtab lead dev <a href="https://twitter.com/bytesofman">Joey King</a> for developers that want to build on eCash:</p><p>‍</p><p> <a href="https://e.cash/blog/building-on-ecash-2022-12">https://e.cash/blog/building-on-ecash-2022-12</a>&nbsp;</p><p>‍</p><p>Episode of eCash Why Crypto series: WAR</p><p> <a href="https://youtube.com/watch?v=Tf020EUz6tw">https://youtube.com/watch?v=Tf020EUz6tw</a>&nbsp;</p><p>‍</p><h2> Key Highlights - Community &amp; Milestones</h2><p>‍</p><p> Team <a href="https://twitter.com/gorbeious">@Gorbeious</a> launches a new wallet enabling users to swap eTokens on the eCash network in a  trustless and peer-to-peer manner. </p><p>‍</p><p><a href="https://gorbeious.cash">Gorbeious.cash</a></p><p>‍</p><p> The first season of the eCash Contribution Rewards program was successfully concluded! </p><p>‍</p><p>100M in XEC rewards were awarded to the top contributors in the two categories of #XECartisan and #XECengineer/p><p>‍</p><p>ℹ<a href="https://ecash.community/gallery">https://ecash.community/gallery</a></p><p>‍</p><h2>Towards January 2023</h2><p>‍</p><p> It\'s been an eventful and incredible year of building for eCash! ️</p><p>‍</p><p>We are well placed for bright days ahead, thank you for your support and company throughout the year.</p><p>‍</p><p>Happy new year #eCashArmy!</p><p>‍</p>',
            short_content:
                'December was a MASSIVE month for the eCash ecosystem! ',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Sat Dec 31 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-monthly-recap-2022-12',
            createdAt: '2023-06-20T22:53:16.602Z',
            updatedAt: '2023-06-21T21:27:51.437Z',
            publishedAt: '2023-06-20T22:53:16.594Z',
            legacy_image:
                '/images/63afd46eef3479c263d277d4_Screenshot%202022-12-30%20at%2010.18.59%20PM.png',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 70,
                    attributes: {
                        name: '63afd46eef3479c263d277d4_Screenshot%202022-12-30%20at%2010.18.59%20PM.png',
                        alternativeText: null,
                        caption: null,
                        width: 1002,
                        height: 564,
                        formats: {
                            large: {
                                ext: '.png',
                                url: '/uploads/large_63afd46eef3479c263d277d4_Screenshot_202022_12_30_20at_2010_18_59_20_PM_48e329ca95.png',
                                hash: 'large_63afd46eef3479c263d277d4_Screenshot_202022_12_30_20at_2010_18_59_20_PM_48e329ca95',
                                mime: 'image/png',
                                name: 'large_63afd46eef3479c263d277d4_Screenshot%202022-12-30%20at%2010.18.59%20PM.png',
                                path: null,
                                size: 568.19,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.png',
                                url: '/uploads/small_63afd46eef3479c263d277d4_Screenshot_202022_12_30_20at_2010_18_59_20_PM_48e329ca95.png',
                                hash: 'small_63afd46eef3479c263d277d4_Screenshot_202022_12_30_20at_2010_18_59_20_PM_48e329ca95',
                                mime: 'image/png',
                                name: 'small_63afd46eef3479c263d277d4_Screenshot%202022-12-30%20at%2010.18.59%20PM.png',
                                path: null,
                                size: 191.14,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.png',
                                url: '/uploads/medium_63afd46eef3479c263d277d4_Screenshot_202022_12_30_20at_2010_18_59_20_PM_48e329ca95.png',
                                hash: 'medium_63afd46eef3479c263d277d4_Screenshot_202022_12_30_20at_2010_18_59_20_PM_48e329ca95',
                                mime: 'image/png',
                                name: 'medium_63afd46eef3479c263d277d4_Screenshot%202022-12-30%20at%2010.18.59%20PM.png',
                                path: null,
                                size: 389.8,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_63afd46eef3479c263d277d4_Screenshot_202022_12_30_20at_2010_18_59_20_PM_48e329ca95.png',
                                hash: 'thumbnail_63afd46eef3479c263d277d4_Screenshot_202022_12_30_20at_2010_18_59_20_PM_48e329ca95',
                                mime: 'image/png',
                                name: 'thumbnail_63afd46eef3479c263d277d4_Screenshot%202022-12-30%20at%2010.18.59%20PM.png',
                                path: null,
                                size: 58.43,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '63afd46eef3479c263d277d4_Screenshot_202022_12_30_20at_2010_18_59_20_PM_48e329ca95',
                        ext: '.png',
                        mime: 'image/png',
                        size: 142.89,
                        url: '/uploads/63afd46eef3479c263d277d4_Screenshot_202022_12_30_20at_2010_18_59_20_PM_48e329ca95.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:26.180Z',
                        updatedAt: '2023-06-21T20:01:26.180Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 72,
        attributes: {
            title: 'Building on eCash ',
            content:
                '<h3><strong>Building on eCash </strong></h3><p><strong><em>— </em></strong><a href="https://twitter.com/bytesofman"><strong><em>Joey</em></strong></a><strong><em>, lead dev, Cashtab</em></strong></p><p>In crypto, the incentives to talk about working (without working at all) are perhaps higher than any other field of human achievement. Tweets can and do move billions of dollars. Crypto attracts the most ambitious scam artists.</p><p>“Building” is one of the great filters in cryptocurrency. In crypto, it’s also uniquely accessible. <strong>You can start right away,</strong> and make meaningful contributions in days to months (depending on your experience). </p><p>This isn’t true for almost every other profession, especially those that touch and handle money. Most are gated in some way, requiring tests, certifications, connections, and approvals.</p><p>Crypto builders have impact beyond the scope of crypto. The most recent bull run owes much of its fire to the legions of Ethereum app devs who made DeFi possible. This in turn sparked huge VC competition among the “ETH killers” over the appearance of their own dev community powerhouse (in crypto, the arms race is not just for dev mindshare, but also the appearance of winning dev mindshare).<br><br></p><h3><strong>A lot with a little</strong></h3><p>There are many good reasons to start creating software. <em>Leverage</em> is one of the best. A single app written by a single dev can reach billions of customers overnight. </p><p>Execution is not so simple. The exact app that will become an overnight success is not built in a day. There is a process.</p><p><em>Build something. </em></p><p><em>Get feedback. </em></p><p><em>Improve. </em></p><p><em>Get feedback. </em></p><p><em>Improve. </em></p><p><em>Fail. </em></p><p><em>Build something else.</em></p><p>So, reducing the cycle time of the “build something” step is critical. In engineering, this is called <a href="https://en.wikipedia.org/wiki/Rapid_prototyping"><strong>rapid prototyping</strong></a>.</p><p>eCash has some of the most impressive rapid prototyping on the market. It has the potential for the best. Today, interested developers can build powerful apps that send and receive money instantly. It can take less than a few hours to get an MVP online and available to users.<br><br></p><h3><strong>Building on eCash today</strong></h3><p>The same dev stack that powers Cashtab is also open source and available for anyone to use (or improve). You can find the packages on npm:</p><ul><li><a href="https://www.npmjs.com/package/chronik-client"><strong>chronik-client</strong></a> - access to an indexer to get information about balances, addresses, eTokens, and transaction history</li><li><a href="https://www.npmjs.com/package/ecashjs-lib"><strong>ecashjs-lib</strong></a> - a javascript library for creating wallets and eCash transactions</li></ul><p>You can see how Cashtab uses these tools to create and send transactions, parse messages, and more by checking out (or forking) <a href="https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/CONTRIBUTING.md"><strong>the code.<br><br></strong></a></p><p>We’re working to improve documentation and examples. This is why I don’t argue that eCash has <em>the best</em> rapid prototyping in crypto. Not yet.</p><p>Despite this, there is a benefit to starting now. Developers have an incredible amount of influence, leverage, and resources available early on. </p><p>Anyone can receive personalized answers to development questions. Check out the <a href="https://t.me/eCashDevelopment"><strong>official development Telegram channel</strong></a>. </p><p>eCash is receptive both to constructive support and game-changing features. </p><p>eCash’s tools are, in one sense, “new.” There is much room for improvement and for all kinds of new features.</p><p>eCash\'s tools are also quite old. They evolved from Bitcoin dev tools. Bitcoin dev tools have more real world use than any other crypto tools. Their development iterates against real world use. They are time-tested with real money balances.</p><p>So, the eCash dev stack may not look like much on the surface. But a closer look reveals powerful and battle-hardened tools capable of surprising speed.</p><h3>‍</h3><figure class="w-richtext-figure-type- w-richtext-align-fullwidth" style="max-width:2400px" data-rt-type="" data-rt-align="fullwidth" data-rt-max-width="2400px"><div><img src="/images/639a5f0c97839295cc251246_6398ee24d60f67e7375c9ea0_6398e8f74287b580c9031f72_Millennium-Falcon_018ea796.0.1412663280.jpeg" alt="" width="auto" height="auto" loading="auto"></div><figcaption><strong><em>“She may not look like much, but she\'s got it where it counts, kid. I\'ve made a lot of special modifications myself.”</em></strong></figcaption></figure><p>‍</p><h3><strong>The future of building on eCash</strong></h3><p>“Potentially the best at rapid prototyping” is all well and good. Execution is what counts. </p><p>We\'ll build and document the dependencies necessary for developers to get started. These tools don’t need to arise in-house. eCash’s native indexer, Chronik, was developed externally and funded by the GNC.</p><p>But offering the best rapid prototyping tools in crypto is not enough. Such tools are worthless if nobody is using them. So, incentivizing, funding, and promoting an app ecosystem is also a crucial step.</p><h3><strong>How to get started right now</strong></h3><p>A number of devs have <a href="https://ecash.community/gallery"><strong>made contributions</strong></a> over the past two years. The <a href="https://twitter.com/gorbeious/status/1600386181530689537"><strong>Gorbeious</strong></a> wallet from <a href="https://twitter.com/thetectosage"><strong>tectosage</strong></a> offers a decentralized, peer to peer eToken exchange. It was bootstrapped and developed in a couple of months. Dev <a href="https://github.com/samrock5000/"><strong>samrock5000 </strong></a>has worked with <a href="https://cashscript.org/"><strong>cashscript</strong></a> to prototype escrow smart contracts on eCash. </p><p>Some good first steps for interested devs:<br><br></p><ul><li>Check out the <a href="https://github.com/Bitcoin-ABC/bitcoin-abc/blob/master/CONTRIBUTING.md"><strong>contribution guidelines</strong></a> in the Bitcoin ABC monorepo<br><br></li><li>Pull down Cashtab. Run it locally.<br><br></li><li>Add <a href="https://www.npmjs.com/package/cashtab-components"><strong>cashtab-components</strong></a> to your webpage to accept eCash payments.<br><br></li><li>Build a website that connects to the Cashtab browser extension.<br><br></li><li>Have an idea? Build a simple MVP and <a href="http://gnc.e.cash/"><strong>apply to the GNC for funding</strong></a></li></ul><p>Going forward, we will also release our own example apps and tutorials to make onboarding as easy as possible.</p><h3>‍</h3>',
            short_content:
                'In crypto, the incentives to talk about working (without working at all) are perhaps higher than any other field of human achievement. ',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Tue Dec 13 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'building-on-ecash-2022-12',
            createdAt: '2023-06-20T22:53:02.628Z',
            updatedAt: '2023-06-21T21:28:01.680Z',
            publishedAt: '2023-06-20T22:53:02.620Z',
            legacy_image: '/images/639a5f3223919f932878474a_Poster.png',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 77,
                    attributes: {
                        name: '639a5f3223919f932878474a_Poster.png',
                        alternativeText: null,
                        caption: null,
                        width: 1600,
                        height: 900,
                        formats: {
                            large: {
                                ext: '.png',
                                url: '/uploads/large_639a5f3223919f932878474a_Poster_3b26f5e6fc.png',
                                hash: 'large_639a5f3223919f932878474a_Poster_3b26f5e6fc',
                                mime: 'image/png',
                                name: 'large_639a5f3223919f932878474a_Poster.png',
                                path: null,
                                size: 983.48,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.png',
                                url: '/uploads/small_639a5f3223919f932878474a_Poster_3b26f5e6fc.png',
                                hash: 'small_639a5f3223919f932878474a_Poster_3b26f5e6fc',
                                mime: 'image/png',
                                name: 'small_639a5f3223919f932878474a_Poster.png',
                                path: null,
                                size: 302.88,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.png',
                                url: '/uploads/medium_639a5f3223919f932878474a_Poster_3b26f5e6fc.png',
                                hash: 'medium_639a5f3223919f932878474a_Poster_3b26f5e6fc',
                                mime: 'image/png',
                                name: 'medium_639a5f3223919f932878474a_Poster.png',
                                path: null,
                                size: 598.03,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_639a5f3223919f932878474a_Poster_3b26f5e6fc.png',
                                hash: 'thumbnail_639a5f3223919f932878474a_Poster_3b26f5e6fc',
                                mime: 'image/png',
                                name: 'thumbnail_639a5f3223919f932878474a_Poster.png',
                                path: null,
                                size: 69.03,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '639a5f3223919f932878474a_Poster_3b26f5e6fc',
                        ext: '.png',
                        mime: 'image/png',
                        size: 339.39,
                        url: '/uploads/639a5f3223919f932878474a_Poster_3b26f5e6fc.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:02:20.655Z',
                        updatedAt: '2023-06-21T20:02:20.655Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 71,
        attributes: {
            title: 'eCash’s Global Network Council “GNC” to Fund P2P Electronic Cash Research in Ciudad Morazán',
            content:
                '<h2>eCash’s Global Network Council “GNC” to Fund P2P Electronic Cash Research in Ciudad Morazán</h2><p><a href="https://www.morazan.city/ecashs-global-network-council-gnc-to-fund-p2p-electronic-cash-research-in-ciudad-morazan/">03/12/2022</a><a href="https://www.morazan.city/author/jbrand/">JOYCE BRAND</a></p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1200px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1200px"><div><img src="/images/638eed900e012201ff0537e6_FjOPZlxXoAItmTp.jpeg" loading="lazy"></div></figure><p><a href="https://e.cash/">eCash</a> is a fork of Bitcoin Cash created by Amaury Séchet with the goal of fulfilling the Bitcoin Whitepaper’s vision of peer-to-peer electronic cash. Its roadmap includes scaling the blockchain to handle five million transactions per second on-chain by using both Nakamoto and Avalanche consensus protocols, providing instant and secure transactions within 3 seconds, and establishing fork-free future upgrades. While the technology, roadmap, and progress of eCash is exciting, what is especially exciting is the opportunity for Morazán to be a part of that journey!</p><p>Earlier this month, eCash’s Global Network Council (GNC) decided to fund research in Morazán. The goal of the research is to better understand how to build eCash ecosystems and spread peer-to-peer electronic cash. In particular, the research will focus on tokenomics, merchant adoption, and becoming more familiar with the needs and concerns of real-world users.</p><p>Ciudad Morazán was selected for a number of reasons. Chief among them were its accessible and open-minded city operator, its residents’ genuine need for safe, fast, and cheap financial services, and its innovative and permissive regulatory environment. </p><p>In the coming months, eCash researchers will work with businesses and residents of Morazán to try to better understand how to build peer-to-peer electronic cash ecosystems, and how eCash can help benefit the residents of Morazán and the people of Honduras more generally.</p><p>Stay tuned for further updates!</p><p>‍</p>',
            short_content:
                'eCash is a fork of Bitcoin Cash created by Amaury Séchet with the goal of fulfilling the Bitcoin Whitepaper’s vision of peer-to-peer ...',
            type: 'Blog',
            media_link:
                'https://www.morazan.city/ecashs-global-network-council-gnc-to-fund-p2p-electronic-cash-research-in-ciudad-morazan/',
            publish_date:
                'Mon Dec 05 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecashs-global-network-council-gnc-to-fund-p2p-electronic-cash-research-in-ciudad-morazan',
            createdAt: '2023-06-20T22:52:51.604Z',
            updatedAt: '2023-06-21T21:28:19.029Z',
            publishedAt: '2023-06-20T22:52:51.600Z',
            legacy_image:
                '/images/638eed900e012201ff0537e6_FjOPZlxXoAItmTp.jpeg',
            legacy_media_logo:
                '/images/638eedf6956003240a3dcdf6_Logo%20white.png',
            image: {
                data: {
                    id: 72,
                    attributes: {
                        name: '638eed900e012201ff0537e6_FjOPZlxXoAItmTp.jpeg',
                        alternativeText: null,
                        caption: null,
                        width: 1200,
                        height: 675,
                        formats: {
                            large: {
                                ext: '.jpeg',
                                url: '/uploads/large_638eed900e012201ff0537e6_Fj_OP_Zlx_Xo_A_Itm_Tp_65e71f2b2d.jpeg',
                                hash: 'large_638eed900e012201ff0537e6_Fj_OP_Zlx_Xo_A_Itm_Tp_65e71f2b2d',
                                mime: 'image/jpeg',
                                name: 'large_638eed900e012201ff0537e6_FjOPZlxXoAItmTp.jpeg',
                                path: null,
                                size: 103.08,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.jpeg',
                                url: '/uploads/small_638eed900e012201ff0537e6_Fj_OP_Zlx_Xo_A_Itm_Tp_65e71f2b2d.jpeg',
                                hash: 'small_638eed900e012201ff0537e6_Fj_OP_Zlx_Xo_A_Itm_Tp_65e71f2b2d',
                                mime: 'image/jpeg',
                                name: 'small_638eed900e012201ff0537e6_FjOPZlxXoAItmTp.jpeg',
                                path: null,
                                size: 31.1,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.jpeg',
                                url: '/uploads/medium_638eed900e012201ff0537e6_Fj_OP_Zlx_Xo_A_Itm_Tp_65e71f2b2d.jpeg',
                                hash: 'medium_638eed900e012201ff0537e6_Fj_OP_Zlx_Xo_A_Itm_Tp_65e71f2b2d',
                                mime: 'image/jpeg',
                                name: 'medium_638eed900e012201ff0537e6_FjOPZlxXoAItmTp.jpeg',
                                path: null,
                                size: 63.13,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.jpeg',
                                url: '/uploads/thumbnail_638eed900e012201ff0537e6_Fj_OP_Zlx_Xo_A_Itm_Tp_65e71f2b2d.jpeg',
                                hash: 'thumbnail_638eed900e012201ff0537e6_Fj_OP_Zlx_Xo_A_Itm_Tp_65e71f2b2d',
                                mime: 'image/jpeg',
                                name: 'thumbnail_638eed900e012201ff0537e6_FjOPZlxXoAItmTp.jpeg',
                                path: null,
                                size: 8.39,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '638eed900e012201ff0537e6_Fj_OP_Zlx_Xo_A_Itm_Tp_65e71f2b2d',
                        ext: '.jpeg',
                        mime: 'image/jpeg',
                        size: 144.58,
                        url: '/uploads/638eed900e012201ff0537e6_Fj_OP_Zlx_Xo_A_Itm_Tp_65e71f2b2d.jpeg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:29.505Z',
                        updatedAt: '2023-06-21T20:01:29.505Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 70,
        attributes: {
            title: 'eCash Monthly Recap - November 2022',
            content:
                '<p> November was a phenomenal &amp; action-packed month for eCash, where we achieved huge milestones! </p><p>‍</p><p>Did you miss any of the updates? </p><p>‍</p><p>Let’s take you through a recap!&nbsp; </p><p>‍</p><h2> Key Highlights - Cashtab Wallet</h2><p>‍</p><p> Toggle hide/show balance feature</p><p> Support for receiving both XEC and eTokens at your eCash address</p><p>️ Bug fixes and various improvements</p><p>‍</p><h2> Key Highlights - eCash Network Upgrade</h2><p>‍</p><p>⚙️ The planned eCash network upgrade for Nov 15th has been successfully completed.</p><p>‍</p><p><a href="https://bitcoinabc.org/upgrade/"> https://bitcoinabc.org/upgrade/</a></p><p>‍</p><h2> Key Highlights - Bitcoin ABC Node Software</h2><p>‍</p><p> Bitcoin ABC releases version 0.26.5 bringing minor bug fixes and under-the-hood improvements!</p><p>‍</p><p> Bitcoin ABC releases versions 0.26.6 adding a new checkpoint after the Nov 15th eCash network upgrade.</p><p>‍</p><p> Bitcoin ABC releases version 0.26.7 bringing various RPC improvements, a new -daemonwait option, support for User-space, Statically Defined Tracing (USDT), and enabling Avalanche by default.</p><p>‍</p><p><a href="https://www.bitcoinabc.org/releases/">https://www.bitcoinabc.org/releases/</a></p><p>‍</p><h2> Key Highlights - Electrum ABC Wallet</h2><p>‍</p><p>  Electrum ABC 5.1.6 is released bringing bug fixes, UI improvements for generating auxiliary keys for Avalanche Proofs &amp; Delegations, and updates to the command line interface..</p><p>‍</p><p><a href="https://www.bitcoinabc.org/electrum/">https://www.bitcoinabc.org/electrum/</a></p><h2> Key Highlights - Avalanche on eCash</h2><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1600px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1600px"><div><img src="/images/6388d5f13da41f37032adf10_hRvZoMZLSednx3mHjFmxPk_fxRhb83V4D1eHxlfzCy5_-cs3LHzRQJBeO5aFkqh8EdCUTitdaxIgXdKhviepF5t9xgL5A9bPyRLepawwpPa9X0ctBHZsRm-E1Yn_jN0HdBQ_Ak6Qyr-9hbCyGctXF6bEnXPjOTX9zapEIm7kYyyIyu4WnCZjgK4Bv6CT1A.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>‍</p><p> Indodax, Binance and Huobi became the first exchanges to offer 1-confirmation XEC deposits, secured by Avalanche Post-Consensus on eCash! </p><p>‍</p><p><a href="https://scorecard.cash">https://scorecard.cash</a></p><h2> eCash Avalanche Network Overview</h2><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1600px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1600px"><div><img src="/images/6388d5f2a59f661ee478a021_oCxa8E2-Gtg2uJxYYTYePXCzreXrADzqNN-1bt749BQVl-v06Su_oJfKG1w0mQxJ1PBnZKNZBOqcRT_MudMW3nz6BkdAylETdnvRIZb9syTvQKN5RBzxQfqs4oIoiEzdwq2oTXd8QjsJzcD-jaF2XlCCi5-PVNiXoI7s05gjNb9NTag9z1SIh7GJCsgmeQ.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>‍</p><p>Total Staked: 86.9B XEC</p><p>Number of Nodes: 39</p><p>Number of Peers: 23</p><p>‍</p><p><a href="https://avalanche.cash‍">https://avalanche.cash</a></p><p>‍</p><h2> Key Highlights - News/Media </h2><p>‍</p><p> eCash founder Amaury Séchet, was featured on a number of podcasts &amp; a TV show discussing the latest events in the crypto space, eCash, DeFi, and CBDCs.</p><p>‍</p><p><a href="https://www.youtube.com/playlist?list=PLRLNXURl9_x6RzZx2zgnIIKwrnI8gnUOq">https://www.youtube.com/playlist?list=PLRLNXURl9_x6RzZx2zgnIIKwrnI8gnUOq</a></p><p>‍</p><p>FMFW.io exchange lists eCash (XEC)! </p><p>‍</p><p> HitBTC opens eCash (XEC) deposits and withdrawals!</p><p>‍</p><p> Cyprian talks about Web3 and more importantly Web5, and how eCash is a much better fit for it than the Lightning Network on BTC.</p><p>‍</p><p> <a href="https://www.youtube.com/watch?v=WvcFQOnWREY">https://www.youtube.com/watch?v=WvcFQOnWREY</a></p><p>‍</p><figure class="w-richtext-figure-type-video w-richtext-align-fullwidth" style="padding-bottom:56.206088992974244%" data-rt-type="video" data-rt-align="fullwidth" data-rt-max-width="" data-rt-max-height="56.206088992974244%" data-rt-dimensions="854:480" data-page-url="https://www.youtube.com/watch?v=WvcFQOnWREY"><div><iframe allowfullscreen="true" frameborder="0" scrolling="no" src="https://www.youtube.com/embed/WvcFQOnWREY" title="&quot;Web3 on eCash&quot; (eCC 2022) | Cyprian (aka Vin Armani)"></iframe></div></figure><p>‍</p><h2> Key Highlights - Community &amp; Milestones</h2><p>‍</p><p> #BinanceXEC </p><p>‍</p><p>The eCash Contribution Rewards program participants were rewarded for their valuable contributions! </p><p>‍</p><p>ℹ<a href="https://ecash.community/contribution-rewards-program">https://ecash.community/contribution-rewards-program</a></p><p>‍</p><h2> Towards December</h2><p>‍</p><p>What a month it\'s been for eCash! </p><p>‍</p><p>We\'d like to thank the eCash community for all their support! Building continues, much more to come in December. Stay tuned! </p><p>‍</p>',
            short_content:
                ' November was a phenomenal & action-packed month for eCash, where we achieved huge milestones! ',
            type: 'Blog',
            media_link:
                'https://twitter.com/eCashOfficial/status/1597990619418398722?s=20&t=bc7cpJopDcgcFvLealhopg',
            publish_date:
                'Wed Nov 30 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-monthly-recap-2022-11',
            createdAt: '2023-06-20T22:52:37.598Z',
            updatedAt: '2023-06-21T21:28:36.497Z',
            publishedAt: '2023-06-20T22:52:37.592Z',
            legacy_image:
                '/images/6388d59a9413d866e89ff1ba_Screenshot%202022-12-01%20at%208.25.47%20AM.png',
            legacy_media_logo:
                '/images/6388d72dd1786303318ae2ab_twitter_PNG31%20white.png',
            image: {
                data: {
                    id: 68,
                    attributes: {
                        name: '6388d59a9413d866e89ff1ba_Screenshot%202022-12-01%20at%208.25.47%20AM.png',
                        alternativeText: null,
                        caption: null,
                        width: 990,
                        height: 548,
                        formats: {
                            small: {
                                ext: '.png',
                                url: '/uploads/small_6388d59a9413d866e89ff1ba_Screenshot_202022_12_01_20at_208_25_47_20_AM_09259d7c1a.png',
                                hash: 'small_6388d59a9413d866e89ff1ba_Screenshot_202022_12_01_20at_208_25_47_20_AM_09259d7c1a',
                                mime: 'image/png',
                                name: 'small_6388d59a9413d866e89ff1ba_Screenshot%202022-12-01%20at%208.25.47%20AM.png',
                                path: null,
                                size: 188.51,
                                width: 500,
                                height: 277,
                            },
                            medium: {
                                ext: '.png',
                                url: '/uploads/medium_6388d59a9413d866e89ff1ba_Screenshot_202022_12_01_20at_208_25_47_20_AM_09259d7c1a.png',
                                hash: 'medium_6388d59a9413d866e89ff1ba_Screenshot_202022_12_01_20at_208_25_47_20_AM_09259d7c1a',
                                mime: 'image/png',
                                name: 'medium_6388d59a9413d866e89ff1ba_Screenshot%202022-12-01%20at%208.25.47%20AM.png',
                                path: null,
                                size: 388.62,
                                width: 750,
                                height: 415,
                            },
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_6388d59a9413d866e89ff1ba_Screenshot_202022_12_01_20at_208_25_47_20_AM_09259d7c1a.png',
                                hash: 'thumbnail_6388d59a9413d866e89ff1ba_Screenshot_202022_12_01_20at_208_25_47_20_AM_09259d7c1a',
                                mime: 'image/png',
                                name: 'thumbnail_6388d59a9413d866e89ff1ba_Screenshot%202022-12-01%20at%208.25.47%20AM.png',
                                path: null,
                                size: 56.98,
                                width: 245,
                                height: 136,
                            },
                        },
                        hash: '6388d59a9413d866e89ff1ba_Screenshot_202022_12_01_20at_208_25_47_20_AM_09259d7c1a',
                        ext: '.png',
                        mime: 'image/png',
                        size: 141.05,
                        url: '/uploads/6388d59a9413d866e89ff1ba_Screenshot_202022_12_01_20at_208_25_47_20_AM_09259d7c1a.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:25.842Z',
                        updatedAt: '2023-06-21T20:01:25.842Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 69,
        attributes: {
            title: 'Is the crypto space really learning a lesson? | SUPER EXCITED w/Stefan Rust',
            content:
                '<figure class="w-richtext-figure-type-video w-richtext-align-fullwidth" style="padding-bottom:56.206088992974244%" data-rt-type="video" data-rt-align="fullwidth" data-rt-max-width="" data-rt-max-height="56.206088992974244%" data-rt-dimensions="854:480" data-page-url="https://www.youtube.com/watch?v=6ArDLIUxGeI"><div><iframe allowfullscreen="true" frameborder="0" scrolling="no" src="https://www.youtube.com/embed/6ArDLIUxGeI" title="Is the crypto space really learning a lesson? | SUPER EXCITED w/Stefan Rust"></iframe></div></figure><p>Amaury Séchet made his first big splash in cryptoland as a lead developer on Bitcoin Cash, and then as a lead on Bitcoin ABC which morphed into Ecash, his current project. Realizing the vision of the legendary Milton Friedman, eCash is taking financial freedom to a level never before seen. With eCash, sending money is now as simple as sending an email.</p><p>Amaury Séchet on Twitter:<a href="https://www.youtube.com/redirect?event=video_description&redir_token=QUFFLUhqbHAzRTRLSVFvam4tSXB0dngydmRxR2lJYS1GUXxBQ3Jtc0tsa3NlVU16OTdCNjRLcFJibHZ1SnhzYnZjSzgwekRpcG1RYzJKYUt5a2d5dlhzbC1qajBfT3dpZlV1a19JeUpKNWxpeEtwUWV0dFUxazEyOFF0TmNpNUUyYWljb2VPaUc3bkFwUGdOaTk4WVV0ZUxBUQ&q=https%3A%2F%2Ftwitter.com%2Fdeadalnix&v=6ArDLIUxGeI" target="_blank">https://twitter.com/deadalnix</a></p><p><a href="https://www.youtube.com/redirect?event=video_description&redir_token=QUFFLUhqbHAzRTRLSVFvam4tSXB0dngydmRxR2lJYS1GUXxBQ3Jtc0tsa3NlVU16OTdCNjRLcFJibHZ1SnhzYnZjSzgwekRpcG1RYzJKYUt5a2d5dlhzbC1qajBfT3dpZlV1a19JeUpKNWxpeEtwUWV0dFUxazEyOFF0TmNpNUUyYWljb2VPaUc3bkFwUGdOaTk4WVV0ZUxBUQ&q=https%3A%2F%2Ftwitter.com%2Fdeadalnix&v=6ArDLIUxGeI" target="_blank">‍</a>eCash on Twitter:<a href="https://www.youtube.com/redirect?event=video_description&redir_token=QUFFLUhqbnNHVnlXWEs4R05ieUNMQS1lWVlWZExfcTZOUXxBQ3Jtc0tudjVObnBsLXY5SW5OMkZZWnpVZTJ6ZFAzZU9jcGxsbXlzUTlnRkM0M2hXSi1tQjFTSmQyRk5kcEtaaklrV1hOQTlSeUhvZFJHd1gtRWZ1aE9zZVVoZFYxV2xtUFZrZk1INTRrRGNSLTRVVDlKTjd6bw&q=https%3A%2F%2Ftwitter.com%2FeCashOfficial&v=6ArDLIUxGeI" target="_blank">https://twitter.com/eCashOfficial</a></p><p><a href="https://www.youtube.com/redirect?event=video_description&redir_token=QUFFLUhqbnNHVnlXWEs4R05ieUNMQS1lWVlWZExfcTZOUXxBQ3Jtc0tudjVObnBsLXY5SW5OMkZZWnpVZTJ6ZFAzZU9jcGxsbXlzUTlnRkM0M2hXSi1tQjFTSmQyRk5kcEtaaklrV1hOQTlSeUhvZFJHd1gtRWZ1aE9zZVVoZFYxV2xtUFZrZk1INTRrRGNSLTRVVDlKTjd6bw&q=https%3A%2F%2Ftwitter.com%2FeCashOfficial&v=6ArDLIUxGeI" target="_blank">‍</a>Stefan on Twitter:<a href="https://www.youtube.com/redirect?event=video_description&redir_token=QUFFLUhqbU1laGRWZE1WNlUwWFFiZTZtTWpBWGE5M25kQXxBQ3Jtc0ttRWdlV1NfbGpyb3pZekN5ZC1ITmdIejFHY1hjWkZvMHNzWjZ2WFdMY0JraENOajBKOFd4Y1AyWmRWR0F0MzJPM21sSC12T2ZSeENDSXZjMUJ1RHBscGludEFwbTNUZlZVNmhzRktiQjNFakQ1TEVaTQ&q=https%3A%2F%2Ftwitter.com%2Fsrust99&v=6ArDLIUxGeI" target="_blank">https://twitter.com/srust99</a></p><p><a href="https://www.youtube.com/redirect?event=video_description&redir_token=QUFFLUhqbU1laGRWZE1WNlUwWFFiZTZtTWpBWGE5M25kQXxBQ3Jtc0ttRWdlV1NfbGpyb3pZekN5ZC1ITmdIejFHY1hjWkZvMHNzWjZ2WFdMY0JraENOajBKOFd4Y1AyWmRWR0F0MzJPM21sSC12T2ZSeENDSXZjMUJ1RHBscGludEFwbTNUZlZVNmhzRktiQjNFakQ1TEVaTQ&q=https%3A%2F%2Ftwitter.com%2Fsrust99&v=6ArDLIUxGeI" target="_blank">‍</a><a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=0s">00:00</a> Introductions </p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=60s">01:00</a> eCash &amp; Bitcoin Cash BCH</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=340s">5:40</a> AVAX &amp; Consensus Algorithm </p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=560s">09:20</a> p2p Electronic Cash</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=665s">11:05</a> Incentive Developers</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=860s">14:20</a> BCH Ecosystem Issues</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=1035s">17:15</a> Future of eCash &amp; Nakamoto Consensus</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=1360s">22:40</a> Developer Funds &amp; Indexing Transactions</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=1635s">27:15</a> DeFi &amp; Financial Innovation</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=1920s">32:00</a> Potential with EVMs</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=2000s">33:20</a> Staking &amp; Dangers of High Yield</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=2166s">36:06</a> Lack of Financial Education</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=2470s">41:10</a> DeFi doesn\'t need Tradfi</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=2720s">45:20</a> Tornado Cash, Privacy &amp; Transparency in Crypto</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=3290s">54:50</a> Hacking Improving Code</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=3390s">56:30</a> Governments Scared of Crypto &amp; CBDC</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=3570s">59:30</a> Governments Just Want to Protect Us</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=3780s">01:03:00</a> More Pain &amp; Regulations Coming</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=3950s">01:05:50</a> Building in Bear Markets</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=4140s">01:09:00</a> Learn to USE Crypto &amp; DeFi</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=4290s">01:11:30</a> Still Early in Crypto</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=4380s">01:13:00</a> Always DYOR</p><p>‍<a href="https://www.youtube.com/watch?v=6ArDLIUxGeI&t=4580s">01:16:20</a> Conclusion</p><p>‍<a href="https://www.youtube.com/hashtag/cryptopodcast">#cryptopodcast</a><a href="https://www.youtube.com/hashtag/blockchain">#blockchain</a><a href="https://www.youtube.com/hashtag/blockchaintechnology">#blockchaintechnology</a></p>',
            short_content:
                'Amaury Séchet made his first big splash in cryptoland as a lead developer on Bitcoin Cash, and then as a lead on Bitcoin ABC which morphed..',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Mon Nov 21 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'is-the-crypto-space-really-learning-a-lesson-super-excited-w-stefan-rust',
            createdAt: '2023-06-20T22:52:24.593Z',
            updatedAt: '2023-06-21T21:29:01.600Z',
            publishedAt: '2023-06-20T22:52:24.586Z',
            legacy_image:
                '/images/637bd6afa16f7f54d41e59c8_Screenshot%202022-11-21%20at%2011.49.49%20AM.png',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 69,
                    attributes: {
                        name: '637bd6afa16f7f54d41e59c8_Screenshot%202022-11-21%20at%2011.49.49%20AM.png',
                        alternativeText: null,
                        caption: null,
                        width: 630,
                        height: 342,
                        formats: {
                            small: {
                                ext: '.png',
                                url: '/uploads/small_637bd6afa16f7f54d41e59c8_Screenshot_202022_11_21_20at_2011_49_49_20_AM_e2ee41de35.png',
                                hash: 'small_637bd6afa16f7f54d41e59c8_Screenshot_202022_11_21_20at_2011_49_49_20_AM_e2ee41de35',
                                mime: 'image/png',
                                name: 'small_637bd6afa16f7f54d41e59c8_Screenshot%202022-11-21%20at%2011.49.49%20AM.png',
                                path: null,
                                size: 235.37,
                                width: 500,
                                height: 271,
                            },
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_637bd6afa16f7f54d41e59c8_Screenshot_202022_11_21_20at_2011_49_49_20_AM_e2ee41de35.png',
                                hash: 'thumbnail_637bd6afa16f7f54d41e59c8_Screenshot_202022_11_21_20at_2011_49_49_20_AM_e2ee41de35',
                                mime: 'image/png',
                                name: 'thumbnail_637bd6afa16f7f54d41e59c8_Screenshot%202022-11-21%20at%2011.49.49%20AM.png',
                                path: null,
                                size: 65.22,
                                width: 245,
                                height: 133,
                            },
                        },
                        hash: '637bd6afa16f7f54d41e59c8_Screenshot_202022_11_21_20at_2011_49_49_20_AM_e2ee41de35',
                        ext: '.png',
                        mime: 'image/png',
                        size: 100.66,
                        url: '/uploads/637bd6afa16f7f54d41e59c8_Screenshot_202022_11_21_20at_2011_49_49_20_AM_e2ee41de35.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:26.166Z',
                        updatedAt: '2023-06-21T20:01:26.166Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 68,
        attributes: {
            title: 'eCash Monthly Recap - October 2022',
            content:
                '<p>We’re back with another monthly recap! </p><p>‍</p><p>In October we\'ve accomplished a lot and before we move on, let\'s have a quick look at all that went down in this exciting month! </p><p>‍</p><h2> Key Highlights - Cashtab Wallet</h2><p>‍</p><p> Chronik implementation for transaction history has been completed</p><p>‍</p><p>Cashtab now shows all incoming/outgoing airdrop txs as \'Airdrop\' in the txs history</p><p>‍</p><p>Equal distribution ratio for Airdrops feature was introduced</p><p>‍</p><h2> Key Highlights - Bitcoin ABC Node Software</h2><p>‍</p><p>  Bitcoin ABC releases version 0.26.3 bringing several RPC &amp; P2P/network improvements &amp; a new RPC command for retrieving Avalanche proof IDs.</p><p>‍</p><p>  Bitcoin ABC releases version 0.26.4 bringing P2P /network improvements, enabling the node to connect to peers listening on non-default ports more easily.</p><p>‍</p><p> The Bitcoin ABC eCash node software &amp; wallet are now available as a package for Ubuntu 22.04 LTS too. ‍&nbsp;</p><p>‍</p><p><a href="https://bitcoinabc.org/releases/">https://bitcoinabc.org/releases/</a></p><p>‍</p><p> All Bitcoin ABC node operators are required to update to version 0.26.x or higher before November 15th in order to remain in sync with the eCash network.&nbsp;</p><p>‍</p><p><a href="https://bitcoinabc.org/upgrade/">https://bitcoinabc.org/upgrade/</a></p><p>‍</p><h2> eCash Avalanche Network Overview</h2><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1600px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1600px"><div><img src="/images/638a0a9c9a25b6832b925999_Ok7f_vxm_exx-TxAyHGtMqmqwNbCOTeQ-sISBA6tMIjFgsHNY6tkGjD6WYmu0zCFnpFVPGrv_0_x9AgQ8ubMpzzBGmprdEFEFg32JwJlHSI_aRPVhz05B5fs3smNiDw2JlzRt7IIVJvqlC0o4QWDUnbObsDXtO3amgmZ7C9osPnpbDoYg_aQjKqYnCMnjw.png" width="auto" height="auto" loading="auto"></div></figure><p>‍</p><p>Total Staked: 86.7B XEC&nbsp;</p><p>Number of Nodes: 43</p><p>Number of Peers: 26</p><p>‍</p><p><a href="https://Avalanche.cash‍">https://Avalanche.cash</a></p><p>‍</p><h2> Key Highlights - News/Media</h2><p>‍</p><p> eCash founder Amaury Séchet, discussed the PayPal "fining" policy and blockchain decentralization on Channels Television.</p><p><a href="https://youtube.com/watch?v=Egy3po4iry0">https://youtube.com/watch?v=Egy3po4iry0</a></p><p>‍</p><p> Episode 5 of the Why Crypto series is out!</p><p><a href="https://youtube.com/watch?v=gKzy3rgAyC0">https://youtube.com/watch?v=gKzy3rgAyC0</a></p><figure class="w-richtext-figure-type-video w-richtext-align-fullwidth" style="padding-bottom:56.206088992974244%" data-rt-type="video" data-rt-align="fullwidth" data-rt-max-width="" data-rt-max-height="56.206088992974244%" data-rt-dimensions="854:480" data-page-url="https://youtube.com/watch?v=gKzy3rgAyC0"><div><iframe allowfullscreen="true" frameborder="0" scrolling="no" src="https://www.youtube.com/embed/gKzy3rgAyC0" title="Why Crypto - Episode 5: Shortage"></iframe></div></figure><p>‍</p><p>Instant swap exchange Lets Exchange listed eCash (XEC)! </p><p>‍</p><p><a href="https://letsExchange.io/exchange/btc-to-xec">https://letsExchange.io/exchange/btc-to-xec</a></p><p>‍</p><h2> Key Highlights - Community &amp; Milestones</h2><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1600px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1600px"><div><img src="/images/638a0a9c7e1096f47e2190fc_JrvwvP46dSwScXZCkvdN0RwTutt7a4bUNGfSk5b-Qpyx8HPba8S9B6kxyUGG6AW85UYFyIo1bMjF-T31X0bUXKOwLptoHDWG7xjLce_obBjM1_NVBT6tsvOnl5fWVKT-Mu3PvDgXosB6PoWHG57QXnyyogmFu2yV3vgjnf1SuDRE5nndbiGGbX3bgGqlZg.png" width="auto" height="auto" loading="auto"></div></figure><p>‍</p><p>Creative artists that have participated in the GNC funded 100M XEC Contribution Rewards program were rewarded for their valuable contributions for the month of Sept!</p><p>‍</p><p><a href="https://ecash.community/contribution-rewards-program‍">https://ecash.community/contribution-rewards-program</a></p><p>‍</p><p> eCash hits 5K+ followers on Facebook</p><p>‍</p><p> eCash Army supports eCash in the Binance Community Showdown - #BinanceXEC </p><p>‍</p><h2> Towards November</h2><p>‍</p><p>October was a productive month, with lots of good news and advancements. November will be even better!​ </p><p>‍</p><p>As always building continues...</p><p>‍</p>',
            short_content:
                "In October we've accomplished a lot and before we move on, let's have a quick look at all that went down in this exciting month! ",
            type: 'Blog',
            media_link:
                'https://twitter.com/eCashOfficial/status/1587103907985211393',
            publish_date:
                'Mon Oct 31 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-monthly-recap-2022-10',
            createdAt: '2023-06-20T22:52:12.593Z',
            updatedAt: '2023-06-21T21:29:22.211Z',
            publishedAt: '2023-06-20T22:52:12.586Z',
            legacy_image:
                '/images/638a0a83c37c773f88ae41c9_FgaGgacWYAEqJHD.jpeg',
            legacy_media_logo:
                '/images/6388d72dd1786303318ae2ab_twitter_PNG31%20white.png',
            image: {
                data: {
                    id: 65,
                    attributes: {
                        name: '638a0a83c37c773f88ae41c9_FgaGgacWYAEqJHD.jpeg',
                        alternativeText: null,
                        caption: null,
                        width: 1200,
                        height: 675,
                        formats: {
                            large: {
                                ext: '.jpeg',
                                url: '/uploads/large_638a0a83c37c773f88ae41c9_Fga_Ggac_WYA_Eq_JHD_b3e353f156.jpeg',
                                hash: 'large_638a0a83c37c773f88ae41c9_Fga_Ggac_WYA_Eq_JHD_b3e353f156',
                                mime: 'image/jpeg',
                                name: 'large_638a0a83c37c773f88ae41c9_FgaGgacWYAEqJHD.jpeg',
                                path: null,
                                size: 51.91,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.jpeg',
                                url: '/uploads/small_638a0a83c37c773f88ae41c9_Fga_Ggac_WYA_Eq_JHD_b3e353f156.jpeg',
                                hash: 'small_638a0a83c37c773f88ae41c9_Fga_Ggac_WYA_Eq_JHD_b3e353f156',
                                mime: 'image/jpeg',
                                name: 'small_638a0a83c37c773f88ae41c9_FgaGgacWYAEqJHD.jpeg',
                                path: null,
                                size: 18.34,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.jpeg',
                                url: '/uploads/medium_638a0a83c37c773f88ae41c9_Fga_Ggac_WYA_Eq_JHD_b3e353f156.jpeg',
                                hash: 'medium_638a0a83c37c773f88ae41c9_Fga_Ggac_WYA_Eq_JHD_b3e353f156',
                                mime: 'image/jpeg',
                                name: 'medium_638a0a83c37c773f88ae41c9_FgaGgacWYAEqJHD.jpeg',
                                path: null,
                                size: 33.67,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.jpeg',
                                url: '/uploads/thumbnail_638a0a83c37c773f88ae41c9_Fga_Ggac_WYA_Eq_JHD_b3e353f156.jpeg',
                                hash: 'thumbnail_638a0a83c37c773f88ae41c9_Fga_Ggac_WYA_Eq_JHD_b3e353f156',
                                mime: 'image/jpeg',
                                name: 'thumbnail_638a0a83c37c773f88ae41c9_FgaGgacWYAEqJHD.jpeg',
                                path: null,
                                size: 6.2,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '638a0a83c37c773f88ae41c9_Fga_Ggac_WYA_Eq_JHD_b3e353f156',
                        ext: '.jpeg',
                        mime: 'image/jpeg',
                        size: 69.24,
                        url: '/uploads/638a0a83c37c773f88ae41c9_Fga_Ggac_WYA_Eq_JHD_b3e353f156.jpeg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:05.096Z',
                        updatedAt: '2023-06-21T20:01:05.096Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 67,
        attributes: {
            title: 'eCash Avalanche Tutorial',
            content:
                '<h1>eCash Avalanche Tutorial</h1><h2>How to Generate Stake Proofs and Run an Avalanche Node</h2><h6><em>Posted on September 7, 2022</em></h6><p>The goal of this article is to explain how the eCash Avalanche protocol works, and give basic step-by-step instructions for getting started.</p><p>After reading this article, the reader should be able to:</p><ul><li>Understand the basics of how eCash’s Avalanche protocol works</li><li>Understand the role of Proofs, Delegations, and Nodes</li><li>Become familiar with the Electrum ABC Proof Editor</li><li>Generate your own Avalanche Proof</li><li>Use your Avalanche Proof to run a Bitcoin ABC node with Avalanche enabled</li></ul><p>In addition to this tutorial, there are also video guides explaining how to <a href="https://youtu.be/ls88OH3eGwQ">set up an eCash Avalanche node using a Virtual Private Server</a>, and how to <a href="https://youtu.be/3k5M4k8OF-I">create a Stake Proof for your eCash Node</a>.</p><p><strong>Note:</strong> There are no staking rewards at this time. Creating a Stake Proof simply allows you to run an eCash Avalanche node and have that node participate in Post-Consensus. This benefits the eCash network, and gives you some influence over consensus formation to decide which blocks are finalized in Post-Consensus. But it does not result in direct rewards from staking.</p><h2>What is Avalanche?</h2><p>Avalanche is a network protocol whose main property is to provide fast convergence between the participants. These participants are requested to vote on items and will eventually flip their position according to the vote result. Once a vote is conclusive, there is no way back and the voted item state is considered final. Avalanche provides a Byzantine fault tolerant protocol with well defined safety guarantees, as laid out in its <a href="https://ipfs.io/ipfs/QmUy4jh5mGNZvLkjies1RWM4YuvJh5o2FYopNPVYwrRVGV">white paper</a>.</p><p>In the context of eCash, the Avalanche protocol is being used in conjunction with Nakamoto consensus. This means that all items being voted on must follow the consensus rules, and Avalanche can take care of solving the conflicts. There are several use cases where the Avalanche protocol brings improvement to Nakamoto consensus:</p><p><strong>Post-Consensus:</strong> this refers to the decisions that occur after a block gets mined. This includes voting on the blocks to prevent reorgs.</p><p><strong>Pre-Consensus:</strong> this refers to the decisions that occur before a block gets mined. This includes voting on transactions to prevent double spends.</p><p>The eCash network roadmap plans for both the above mechanisms and more. At this stage only Post-Consensus is implemented.</p><h2>Stake Proofs</h2><p>While the Avalanche protocol itself has well defined safety guarantees, it requires some sort of method for Sybil resistance. In order to provide this Sybil resistance, the eCash avalanche network requires that every Peer that participates in Avalanche voting has an associated “Stake Proof”. More than one Avalanche Node can be associated with the same Proof, and from the perspective of the Avalanche voting protocol, the group of nodes associated with the same Proof is called an “Avalanche Peer”.</p><p>The Proof provides Sybil resistance by being associated with eCash coins (UTXOs). The Proof contains signatures from the private spending key for those coins. This means that only the person who knows the private key for the coin can add Stakes to the Proof. One Proof can be tied to many coins, which means that the coins don’t have to be moved in order to create the Stake Proof.</p><p>The mechanism by which Nodes are associated with a Proof uses Public Key Cryptography in which the Node signs messages that prove it possesses the private key corresponding to the Proof, known as the “Proof Master Key”. To facilitate key management, there are also “Delegations” which allow different nodes associated with the same Proof to use different keys. The relationship between Coins, Proofs, Delegations, and Nodes is shown below:</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1280px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1280px"><div><img src="/images/635046bb6586721fe904b05f_avalanche-proof.jpeg" alt="eCash Avalanche Proofs, Nodes and Delegations" width="auto" height="auto" loading="auto"></div></figure><p>Note the one-to-many relationship between Nodes, the Proof, and staked coins (UTXOs) in this image. One Avalanche Proof can be used by several different eCash nodes. This is useful for providing redundancy, geographic diversity, and load balancing. Each Node, however, can only use one Proof. If you wish to use several staked coins with the same Node, even coins held in different wallets by different people, this can be done by adding all the different coin stakes into one Proof.</p><h2>Proof Format</h2><p>The Avalanche Proofs contain information within them in various fields as follows:</p><p><strong>Proof Sequence:</strong> This number is intended to be used when you want to replace a proof with another one. Once a UTXO has been embedded into a proof, it cannot be part of another proof. If 2 or more proofs are claiming the same UTXO, then the following rule applies:</p><ul><li>If the proof public key is identical, the highest sequence number takes precedence.</li><li>If the public key differs, the total staked amount takes precedence.</li><li>In practice, it is advised to use a sequence number of 0 for building your proof. Then if at some point you intend to make another one, for example to include more coins, you can increase the number to 1 to let the network know that it’s a deliberate move. Note that your earlier revision proof will be invalidated by the network and you should update all the nodes using it to the new revision.</li></ul><p><strong>Expiration:</strong> This sets a time at which your proof will be considered invalid.</p><p><strong>Master Public Key:</strong> This is the Master Key for the Proof. When generating a new Proof, Electrum ABC will automatically generate a Private Key from the wallet’s derivation path at <strong>.../2/0</strong>. The associated Public Key is included in the Proof. This Key is used by the Avalanche Node to prove that it has authority to participate in the protocol as a Peer representing this Proof.</p><p><strong>Payout Address:</strong> This is a valid XEC address that will be used to send the staking rewards (not available yet). Can be any standard type address that you own and want the coins to be sent to.</p><p><strong>Stakes:</strong> This is an array of the UTXOs to be attached to the proof. There are some limitations to these UTXOs:</p><ul><li>Limited to 1000 UTXOs per proof.</li><li>Each UTXO must have an amount greater or equal to 100 MegXEC (aka 100,000,000.00 XEC).</li><li>Each UTXO must have 2016 or more confirmations in the blockchain. This means that the coin must not have moved within the previous 2 weeks.</li><li>Only P2PKH UTXO type is supported, you cannot stake P2SH (often used for multisig) coins.</li></ul><h2>Generate a Proof using Electrum ABC</h2><p>As of version 5.1.5, Electrum ABC includes the Avalanche Proofs Editor for use with eCash Avalanche. The Proof Editor is a general tool that can be used to generate new Proofs, as well as load existing Proofs to inspect their contents and modify them to create new Proofs. For example, you could load an existing Proof, and add coins from the wallet to stake in the Proof.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:769px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="769px"><div><img src="/images/635046bb8237624cd8608b66_proof-editor-blank.jpeg" alt="Electrum ABC Proof editor" width="auto" height="auto" loading="auto"></div></figure><p>In this tutorial, we will use two Electrum ABC wallets, along with the Proof Editor, to generate a Stake Proof. The reason for using two wallets is to keep the coin spending keys separate from the wallet that controls the Proof Master Key. This allows the Private Keys associated with spending the coins to be managed securely. The instructions here will assume that you are using an offline computer for the coin-holding wallet.</p><p>In order to manage these wallets separately, we will create Proof in a 3-step process:</p><ol><li>In the Proof wallet, create a skeleton Proof.</li><li>In the Coin-holding wallet, add Stakes to the Proof.</li><li>In the Proof wallet, sign the Proof with Proof Master Key.</li></ol><h3>Step 1: Create the Skeleton Proof</h3><p>This step is done on a regular computer connected to the internet. This will create a wallet that can be used to manage your Proofs, and create Delegations if you decide to do that later. Simply follow these steps:</p><ol><li>Create a new wallet. This will be your “Proof wallet”.</li><li>Open Tools &gt; Avalanche Proof Editor.</li><li>Review the fields and adjust them if desired. For example, you may want to change the Payout Address to one in another wallet, or adjust the expiration time.</li><li>Click Generate proof.</li><li>Save the Proof.</li></ol><h3>Step 2: Add Stakes to the Proof</h3><p>Online portion:</p><ol><li>Open a watch-only version of your coin-holding wallet. For example, this could be your regular Trezor wallet within Electrum ABC.</li><li>Open the ‘Coins’ tab, select the coins you want to stake, right click and click ‘Export coin details’ to export coins file. Make sure the coins you select meet the requirements for Staking: each coin must be at least 100,000,000.00 XEC and have at least 2016 confirmations.</li></ol><p>For the next steps, move to an offline computer. For example, you could use a “Live CD” to temporarily recreate your hardware wallet (Trezor or Ledger) within Electrum ABC, without saving the wallet or connecting to the internet. When moving to the offline computer, the information you will need is:</p><ul><li>Electrum ABC 5.1.5</li><li>The saved Proof</li><li>Coin details file</li></ul><p>You can save these to a memory stick for use on the offline computer.</p><p>Once you have recreated the coin-holding wallet on your offline computer, follow these steps to add your coins as Stakes in the Proof.</p><ol><li>In the Proof editor, click on the “Load proof” button.</li><li>Click OK on warning. It’s OK that this wallet doesn’t have the Proof Master Key, it just means you won’t be able to sign the final Proof at the end from this wallet.</li><li>Add coins from the Coin Details file you saved previously.</li><li>Click Generate proof.</li><li>Click Save Proof, Click OK on warning. You will need to save the Proof to a memory stick, or other medium to transfer it back to your online computer.</li><li>After the Proof has been saved, you can delete the wallet and/or wipe the entire offline computer.</li></ol><h3>Step 3: Sign the Proof with Proof Master Key</h3><ol><li>Back on your online computer, open Avalanche Proof wallet again.</li><li>Load the unsigned Proof that was saved from the offline computer (You should now see the private key in that field).</li><li>Click on Generate Proof. This will actually sign the entire Proof with the Proof Master Key.</li><li>Save the signed Proof</li></ol><p>Now you have an Avalanche Proof, and can run an eCash Avalanche node!</p><h2>Run an eCash Avalanche Node</h2><p>To run Avalanche, use <a href="https://www.bitcoinabc.org/releases/#0.26.0">Bitcoin ABC version 0.26.0</a> or greater, and simply restart your node with the following added to your bitcoin.conf file:</p><blockquote>avalanche=1<br>debug=avalanche<br># Proof dependent parameters<br>avaproof=&lt;your hex Proof&gt;<br>avamasterkey=&lt;your Master Private Key, WIF format&gt;<br></blockquote><p>(debug=avalanche is not strictly necessary, but will let you see Avalanche related message in your <strong>debug.log</strong> file. This line can be omitted if desired)</p><h3>Ensure the Node is Well Connected</h3><p>One thing to note, is that the Avalanche protocol relies on the node being well connected to the rest of the network. This is quite different from Nakamoto consensus, which only needs enough connectivity to be confident that it can get the longest Proof-of-Work chain. For your Avalanche to function effectively, and be of greatest value to the network, check the following:</p><ul><li>It should accept incoming connections. If it is behind a firewall, adjust the firewall settings to allow incoming connections.</li><li>Sometimes people run eCash nodes behind another “bridge node”. Running an Avalanche node with a Proof behind a bridge node is not helpful to the rest of the Avalanche network, since that node won’t be able to participate properly in Avalanche voting rounds.</li><li>Make sure that the <strong>maxconnections</strong> parameter isn’t set in your bitcoin.conf file. This can interfere with the proper functioning of the Avalanche networking code.</li><li>The Avalanche node should have high uptime, and be able to run continuously.</li></ul><h3>Adding a Delegation</h3><p>Another consideration is the option of running multiple nodes using Delegations. To Delegate your Proof to someone else’s node do the following:</p><ol><li>Ask the node operator for a Delegation PubKey.</li><li>Use Electrum ABC to Generate a Delegation to that PubKey by clicking “Generate a Delegation” within the Proof Editor.</li></ol><p>Then the person running the Delegated node can use the same Proof without having access to the Proof Master Key, by adding these lines to their bitcoin.conf file:</p><blockquote>avalanche=1<br>debug=avalanche<br># Proof dependent parameters<br>avaproof=&lt;the hex Proof&gt;<br>avadelegation=&lt;the hex Delegation&gt;<br>avamasterkey=&lt;the Master Private Key for the Delegation, WIF format&gt;<br></blockquote><h2>Monitoring your Avalanche Node</h2><p>Now that you have your node running, with Avalanche enabled and a Stake Proof, your node will be participating in the Avalanche protocol and helping to finalize blocks. You are now part of the network of Avalanche nodes that are enabling 1-block finalization, and protecting the network from 51% attacks.</p><p>To observe the status of Avalanche on your node, you can try some of the following commands:</p><p>./bitcoin-cli getavalancheinfo<br>./bitcoin-cli getavalanchepeerinfo<br>tail -n 100 ~/.bitcoin/debug.log<br></p><p>For more questions and to ask for help, you can join the <a href="https://discord.gg/d5EHW3PgTy">eCash Discord</a>. For questions and issues specific to the Bitcoin ABC node, try the <a href="https://t.me/eCashDevelopment">eCash Development Telegram group</a>. For questions and issues related to Electrum ABC, try the <a href="https://t.me/ElectrumABC">Electrum ABC Telegram group</a>. To monitor development progress, see <a href="https://www.avalanche.cash/">Avalanche.cash</a></p>',
            short_content:
                'The goal of this article is to explain how the eCash Avalanche protocol works, and give basic step-by-step instructions for getting started.',
            type: 'Blog',
            media_link:
                'https://www.bitcoinabc.org/2022-09-07-avalanche-tutorial/',
            publish_date:
                'Wed Oct 19 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-avalanche-tutorial',
            createdAt: '2023-06-20T22:51:57.607Z',
            updatedAt: '2023-06-21T21:30:07.293Z',
            publishedAt: '2023-06-20T22:51:57.600Z',
            legacy_image:
                '/images/63504652ae517fd14a9f4cf5_avalanche-proof.jpeg',
            legacy_media_logo:
                '/images/6218a8f444fd6d1db2b4531d_60d1114fcb4e3e2b46511622_bitcoinabclogo-white.png',
            image: {
                data: {
                    id: 66,
                    attributes: {
                        name: '63504652ae517fd14a9f4cf5_avalanche-proof.jpeg',
                        alternativeText: null,
                        caption: null,
                        width: 1280,
                        height: 922,
                        formats: {
                            large: {
                                ext: '.jpeg',
                                url: '/uploads/large_63504652ae517fd14a9f4cf5_avalanche_proof_78eaeb90cd.jpeg',
                                hash: 'large_63504652ae517fd14a9f4cf5_avalanche_proof_78eaeb90cd',
                                mime: 'image/jpeg',
                                name: 'large_63504652ae517fd14a9f4cf5_avalanche-proof.jpeg',
                                path: null,
                                size: 82.65,
                                width: 1000,
                                height: 720,
                            },
                            small: {
                                ext: '.jpeg',
                                url: '/uploads/small_63504652ae517fd14a9f4cf5_avalanche_proof_78eaeb90cd.jpeg',
                                hash: 'small_63504652ae517fd14a9f4cf5_avalanche_proof_78eaeb90cd',
                                mime: 'image/jpeg',
                                name: 'small_63504652ae517fd14a9f4cf5_avalanche-proof.jpeg',
                                path: null,
                                size: 27.66,
                                width: 500,
                                height: 360,
                            },
                            medium: {
                                ext: '.jpeg',
                                url: '/uploads/medium_63504652ae517fd14a9f4cf5_avalanche_proof_78eaeb90cd.jpeg',
                                hash: 'medium_63504652ae517fd14a9f4cf5_avalanche_proof_78eaeb90cd',
                                mime: 'image/jpeg',
                                name: 'medium_63504652ae517fd14a9f4cf5_avalanche-proof.jpeg',
                                path: null,
                                size: 52.57,
                                width: 750,
                                height: 540,
                            },
                            thumbnail: {
                                ext: '.jpeg',
                                url: '/uploads/thumbnail_63504652ae517fd14a9f4cf5_avalanche_proof_78eaeb90cd.jpeg',
                                hash: 'thumbnail_63504652ae517fd14a9f4cf5_avalanche_proof_78eaeb90cd',
                                mime: 'image/jpeg',
                                name: 'thumbnail_63504652ae517fd14a9f4cf5_avalanche-proof.jpeg',
                                path: null,
                                size: 6.9,
                                width: 217,
                                height: 156,
                            },
                        },
                        hash: '63504652ae517fd14a9f4cf5_avalanche_proof_78eaeb90cd',
                        ext: '.jpeg',
                        mime: 'image/jpeg',
                        size: 117.24,
                        url: '/uploads/63504652ae517fd14a9f4cf5_avalanche_proof_78eaeb90cd.jpeg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:05.403Z',
                        updatedAt: '2023-06-21T20:01:05.403Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 66,
        attributes: {
            title: 'eCash Monthly Recap - September 2022',
            content:
                '<p>September was a phenomenal month where we were able to achieve huge milestones! </p><p>‍</p><p>Did you miss any of the updates? </p><p>‍</p><p>Let’s take you through a recap!&nbsp; </p><p>‍</p><h2> Key Highlights - Cashtab Wallet</h2><p>‍</p><p>Chronik implementation milestones:</p><p>UTXO handling migration to Chronik (completed)</p><p>Transaction history via Chronik (50% complete)</p><p>‍</p><p>UX Improvements:</p><p> Real-time user update notifications</p><p> New hamburger menu</p><p>‍</p><h2> Key Highlights - Bitcoin ABC Node Software</h2><p>‍</p><p>  Bitcoin ABC releases versions 0.26.0 introducing Avalanche Post-Consensus — bringing 1-block finality and 51% attack prevention to eCash!</p><p>‍</p><p>  Bitcoin ABC releases versions 0.26.1 &amp; 0.26.2 bringing several RPC and logging improvements and new RPCs allowing node operators easily query if a transaction/block is finalized by Avalanche voting.</p><p>‍</p><p><a href="https://bitcoinabc.org/releases/">https://bitcoinabc.org/releases/</a></p><p>‍</p><p>‍ eCash JSON-RPC Libary for developers by eCash dev <a href="https://twitter.com/pungentaura">@pungentaura</a></p><p>‍</p><p>This library serves as a tiny layer between an application and an eCash node daemon.</p><p>‍</p><p>JavaScript: <a href="https://www.npmjs.com/package/ecash-rpc">https://www.npmjs.com/package/ecash-rpc</a></p><p>Python: <a href="https://pypi.org/project/ecashrpc/">https://pypi.org/project/ecashrpc/</a></p><p>‍</p><h2> Key Highlights - Electrum ABC Wallet</h2><p>‍</p><p>  Electrum ABC 5.1.5 is released bringing improvements to the Avalanche Proof Editor tool, minor bug fixes, and making explorer.e.cash the default block explorer.</p><p>‍</p><p><a href="https://www.bitcoinabc.org/electrum/">https://www.bitcoinabc.org/electrum/</a></p><p>‍</p><h2> Key Highlights - Avalanche on eCash</h2><p>‍</p><p>⚙️ On Sep 14th at 12:00 UTC, Avalanche Post-Consensus went live on eCash Mainnet! </p><p>‍</p><p> Avalanche.cash</p><p>‍</p><p> eCash Avalanche Staking Tutorial&nbsp;</p><p> <a href="https://www.bitcoinabc.org/2022-09-07-avalanche-staking-tutorial/">https://www.bitcoinabc.org/2022-09-07-avalanche-staking-tutorial/</a></p><p>‍</p><p> Avalanche Post-Consensus on eCash - Benefits for Miners, Exchanges, and Everyday People</p><p> https://www.bitcoinabc.org/2022-09-29-avalanche-post-consensus/</p><p>‍</p><p>eCash Avalanche Node Setup Part 1: Learn How to Setup a VPS eCash Node</p><p> https://youtube.com/watch?v=ls88OH3eGwQ&nbsp;</p><p>‍</p><p>eCash Avalanche Node Setup Part 2: Learn How to Stake your XEC Coins by Creating an Avalanche Stake Proof &amp; Configuring your Node to Use it:&nbsp;</p><p> <a href="https://www.youtube.com/watch?v=3k5M4k8OF-I&t=0s">https://www.youtube.com/watch?v=3k5M4k8OF-I&amp;t=0s</a></p><figure class="w-richtext-figure-type-video w-richtext-align-fullwidth" style="padding-bottom:56.206088992974244%" data-rt-type="video" data-rt-align="fullwidth" data-rt-max-width="" data-rt-max-height="56.206088992974244%" data-rt-dimensions="854:480" data-page-url="https://www.youtube.com/watch?v=3k5M4k8OF-I&t=0s"><div><iframe allowfullscreen="true" frameborder="0" scrolling="no" src="https://www.youtube.com/embed/3k5M4k8OF-I?start=0" title="Avalanche Node Setup Part 2: Create a Stake Proof for your eCash Node"></iframe></div></figure><p>‍</p><h2> eCash Avalanche Network Overview</h2><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1600px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1600px"><div><img src="/images/638a09b4e1c2981bb850eca9_jEQnt_lutcJ40mgQxGo2qhoxBJWd34cIJty29uQuFXcnM7p6DMpRqodwXazhgP66Io6i9KukUP2lqFIKHnlMWFW7fxaS6e2Lf8sItLZFQgiSEMm7OD8jIBDlH5ajObk_7Sh4r4KmDO3MO0BAE_zlbZAh1TZPJg_3LE5F2rICqvNPc5YghAOwdpiKXIYHUw.png" width="auto" height="auto" loading="auto"></div></figure><p>‍</p><p>Total Staked: 84.3B XEC</p><p>Number of Nodes: 38</p><p>Number of Peers: 22</p><p>‍</p><p>Avalanche.cash</p><p>‍</p><h2> Key Highlights - News/Media</h2><p>‍</p><p>eCash founder Amaury Séchet &amp; eCash dev Antony Zegers joined Hayden Otto to discuss Avalanche Post-Consensus on eCash!</p><p> <a href="https://www.youtube.com/watch?v=cbhXNfSznAI">https://www.youtube.com/watch?v=cbhXNfSznAI</a></p><figure class="w-richtext-figure-type-video w-richtext-align-fullwidth" style="padding-bottom:56.206088992974244%" data-rt-type="video" data-rt-align="fullwidth" data-rt-max-width="" data-rt-max-height="56.206088992974244%" data-rt-dimensions="854:480" data-page-url="https://www.youtube.com/watch?v=cbhXNfSznAI"><div><iframe allowfullscreen="true" frameborder="0" scrolling="no" src="https://www.youtube.com/embed/cbhXNfSznAI" title="Avalanche Post-Consensus on eCash (XEC) w/ Amaury Séchet & Antony Zegers"></iframe></div></figure><p>‍</p><p> 이캐시, 오는 14일 아발란체 메인넷 도입</p><p> <a href="http://datanet.co.kr/news/articleView.html?idxno=176340">http://datanet.co.kr/news/articleView.html?idxno=176340</a></p><p>‍</p><p>上线雪崩共识，eCash迎来里程碑时刻</p><p><a href="https://mp.weixin.qq.com/s/v3AmSoz40gR946dMpIiLig">https://mp.weixin.qq.com/s/v3AmSoz40gR946dMpIiLig</a></p><p>‍</p><h2> Key Highlights - Community &amp; Milestones</h2><p>‍</p><p> We officially kicked off the Contribution Rewards Program, welcoming everyone to contribute and win from our 100M XEC reward pool.</p><p>‍</p><p> eCash hits 6K+ members milestone on r/eCash!</p><p>‍</p><h2>Towards October</h2><p>‍</p><p>What a month it\'s been for eCash! </p><p>‍</p><p>We\'d like to thank the eCash community for all their support! Building continues, much more to come in October. Stay tuned!</p><p>‍</p>',
            short_content:
                'September was a phenomenal month where we were able to achieve huge milestones!',
            type: 'Blog',
            media_link:
                'https://twitter.com/eCashOfficial/status/1575874191248834560',
            publish_date:
                'Fri Sep 30 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-monthly-recap-2022-09',
            createdAt: '2023-06-20T22:51:43.602Z',
            updatedAt: '2023-06-21T21:30:40.767Z',
            publishedAt: '2023-06-20T22:51:43.596Z',
            legacy_image:
                '/images/638a098b121a3b9af0e9714d_Fd6gUtkXwAAsJtP.jpeg',
            legacy_media_logo:
                '/images/6388d72dd1786303318ae2ab_twitter_PNG31%20white.png',
            image: {
                data: {
                    id: 64,
                    attributes: {
                        name: '638a098b121a3b9af0e9714d_Fd6gUtkXwAAsJtP.jpeg',
                        alternativeText: null,
                        caption: null,
                        width: 1200,
                        height: 675,
                        formats: {
                            large: {
                                ext: '.jpeg',
                                url: '/uploads/large_638a098b121a3b9af0e9714d_Fd6g_Utk_Xw_A_As_Jt_P_6f465cdecb.jpeg',
                                hash: 'large_638a098b121a3b9af0e9714d_Fd6g_Utk_Xw_A_As_Jt_P_6f465cdecb',
                                mime: 'image/jpeg',
                                name: 'large_638a098b121a3b9af0e9714d_Fd6gUtkXwAAsJtP.jpeg',
                                path: null,
                                size: 53.61,
                                width: 1000,
                                height: 563,
                            },
                            small: {
                                ext: '.jpeg',
                                url: '/uploads/small_638a098b121a3b9af0e9714d_Fd6g_Utk_Xw_A_As_Jt_P_6f465cdecb.jpeg',
                                hash: 'small_638a098b121a3b9af0e9714d_Fd6g_Utk_Xw_A_As_Jt_P_6f465cdecb',
                                mime: 'image/jpeg',
                                name: 'small_638a098b121a3b9af0e9714d_Fd6gUtkXwAAsJtP.jpeg',
                                path: null,
                                size: 18.66,
                                width: 500,
                                height: 281,
                            },
                            medium: {
                                ext: '.jpeg',
                                url: '/uploads/medium_638a098b121a3b9af0e9714d_Fd6g_Utk_Xw_A_As_Jt_P_6f465cdecb.jpeg',
                                hash: 'medium_638a098b121a3b9af0e9714d_Fd6g_Utk_Xw_A_As_Jt_P_6f465cdecb',
                                mime: 'image/jpeg',
                                name: 'medium_638a098b121a3b9af0e9714d_Fd6gUtkXwAAsJtP.jpeg',
                                path: null,
                                size: 34.61,
                                width: 750,
                                height: 422,
                            },
                            thumbnail: {
                                ext: '.jpeg',
                                url: '/uploads/thumbnail_638a098b121a3b9af0e9714d_Fd6g_Utk_Xw_A_As_Jt_P_6f465cdecb.jpeg',
                                hash: 'thumbnail_638a098b121a3b9af0e9714d_Fd6g_Utk_Xw_A_As_Jt_P_6f465cdecb',
                                mime: 'image/jpeg',
                                name: 'thumbnail_638a098b121a3b9af0e9714d_Fd6gUtkXwAAsJtP.jpeg',
                                path: null,
                                size: 6.44,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '638a098b121a3b9af0e9714d_Fd6g_Utk_Xw_A_As_Jt_P_6f465cdecb',
                        ext: '.jpeg',
                        mime: 'image/jpeg',
                        size: 71.43,
                        url: '/uploads/638a098b121a3b9af0e9714d_Fd6g_Utk_Xw_A_As_Jt_P_6f465cdecb.jpeg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:05.084Z',
                        updatedAt: '2023-06-21T21:30:31.074Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 65,
        attributes: {
            title: 'Avalanche Post-Consensus on eCash',
            content:
                '<p>Avalanche is here.</p><p>On September 14th 2022, the <a href="https://e.cash/">eCash</a> network was upgraded to support the finalization of blocks using Avalanche Post-Consensus.</p><p>The launch of Avalanche Post-Consensus on the eCash Mainnet is a significant achievement, bringing tangible benefits for eCash miners, exchanges, and everyday users.</p><p>As of the writing of this article, over 80 Billion XEC has been staked to run voting Avalanche nodes and support the eCash network. For live Avalanche network statistics and to track the development of upcoming milestones, see <a href="https://avalanche.cash/">avalanche.cash</a>.</p><h2>Benefits for Miners</h2><p>Avalanche Post-Consensus brings 51% attack prevention to eCash. This is particularly important for miners. Because eCash is a minority chain sharing the same SHA256 mining algorithm as Bitcoin (BTC), it is more vulnerable to a malicious non-economically motivated attacker, who could attempt a blockchain reorganization. Though the network as a whole can recover from such an attack, it would be particularly disruptive to miners, who could lose blocks, costing them money.</p><p>Avalanche Post-Consensus solves this problem. Nodes come to consensus to “finalize” the blocks that they see on the network. In other words, it allows nodes to know that the blocks they see are also seen and accepted by the rest of the network. If conflicting blocks appear later, the Avalanche-using miners will come to consensus and ignore the late-appearing blocks. In this way, they defend the network against block withholding attacks, and blockchain reorganizations.</p><h2>Benefits for Exchanges</h2><p>Avalanche Post-Consensus also brings significant benefit for exchanges by bringing 1-block finality to eCash. This enables 1-confirmation deposits.</p><p>It is very important for exchanges to ensure that deposits are secure before they allow trading and withdrawal. This is typically done by requiring that deposit transactions have a certain number of blockchain confirmations before the funds can be traded.</p><p>With Avalanche Post-Consensus, there is now a secure way to verify customer deposits, using the Avalanche finalization status instead of “number of confirmations”. This will also cause deposits to be finalized with only 1 block confirmation. This will enhance exchange security by preventing re-org attacks and increase customer satisfaction by reducing deposit confirmation times. It will also enable easier arbitrage for traders, driving more volume and liquidity to the exchange. Happier customers are good for exchanges.</p><p>To start benefitting from Post-Consensus, exchanges should set up their eCash node to run Avalanche, and use the new isfinaltransaction RPC command to check whether deposits have been finalized or not. The isfinaltransaction RPC is forwards-compatible with future Avalanche upgrades.</p><h2>Benefits for Users</h2><p>In its current state, eCash already offers a cash-like experience for peer-to-peer transfers. For users sending XEC directly using a wallet such as <a href="https://cashtab.com/">Cashtab</a>, payments typically show up in a matter of seconds, with sub-cent fees.</p><p>What users can expect from the Avalanche Post-Consensus is that the cash-like experience will improve further as exchanges and other eCash services take advantage of the re-org protection and 1-block finality offered by Avalanche Post-Consensus. This will enable services to offer a faster and more cash-like payment experience.</p><p>Looking further into the future, the eCash experience should continue to improve even more with Pre-Consensus and other technologies in the pipeline. The purpose of all of these developments is to pursue eCash’s goal of being the most usable, secure and scalable form of electronic cash possible.</p><h2>Running Avalanche on eCash</h2><p>eCash node operators can activate Avalanche by upgrading to Bitcoin ABC 0.26.2 or higher, and setting the <strong>avalanche=1 </strong>parameter in their <strong>bitcoin.conf</strong> file. This will activate Avalanche in “poll only” mode, which means the node can query the network to find the finalization staus of blocks, but does not contribute to the Avalanche consensus.</p><p>Node operators who wish to contribute to the eCash network by participating in Avalanche can set up a staking node by following our written <a href="https://www.bitcoinabc.org/2022-09-07-avalanche-staking-tutorial/">Avalanche Staking Tutorial</a>, and the <a href="https://youtu.be/3k5M4k8OF-I">Stake Proof video guide</a>.</p><p>One of the characteristics of the Avalanche protocol is that its security relies on the nodes being well connected to the rest of the network. This means that it’s important, especially for staking nodes, to have a reliable internet connection, and to accept inbound connections. If you have a firewall, make sure to open port 8333. Also ensure that the <strong>maxconnections</strong> parameter is not set in your bitcoin.conf file.</p><p>For large stakers, it’s also a good idea to run more than one node for each Proof. A good option is to use remotely hosted servers. We have created a video guide to help users <a href="https://youtu.be/ls88OH3eGwQ">set up an eCash Avalanche node using a Virtual Private Server</a>.</p><h2>About Post-Consensus</h2><p>Post-Consensus is named that way because it is dealing with blocks <em>after</em> they are produced by miners. By contrast, Pre-Consensus (not yet implemented) is when the Avalanche protocol is used by nodes to come to consensus on transactions <em>before</em> blocks are produced.</p><p>With Avalanche Post-Consensus, nodes can come to consensus on the current live status of blocks that are visible on the eCash network. In other words, it allows nodes to know that the blocks they see are also accepted by the rest of the network. This information can then be used to defend the network against block withholding attacks, and blockchain reorganization attacks.</p><p>After Pre-Consensus is implemented in Bitcoin ABC, Post-Consensus will also be used to reject blocks that include transactions that conflict with transactions that were finalized via Pre-Consensus. This will allow users of the eCash network to benefit from near-instant transaction finalization, with confidence that finalized transactions cannot be reversed.</p><h2>About Avalanche</h2><p>Using a fast consensus protocol to do Pre-Consensus has been a long-standing item on the <a href="https://e.cash/roadmap-explained">eCash Roadmap</a> (and previously on the Bitcoin Cash roadmap). This is one of the improvements needed to power eCash to be a competitor and alternative to Central Bank Digital Currencies (CBDCs). When the <a href="https://ipfs.io/ipfs/QmUy4jh5mGNZvLkjies1RWM4YuvJh5o2FYopNPVYwrRVGV">Avalanche whitepaper</a> appeared in 2018, eCash founder Amaury Séchet and the Bitcoin ABC team recognized that this new protocol was what they had been searching for, as it fulfilled the needed requirements.</p><p>It should be noted that eCash’s Avalanche implementation is completely separate and distinct from the AVAX Avalanche project. They have no connection, other than both using the protocol described in the Avalanche whitepaper. Avalanche on eCash is an entirely new implementation which had to be developed from scratch by the Bitcoin ABC team.</p><p>In the case of eCash, Avalanche consensus is used for fast and live consensus needs, such as fast transaction finality. Proof-of-work based Nakamoto consensus is retained where it is superior, providing objective consensus criterion to enable decentralized node bootstrapping.</p><p>For more info and to monitor development progress, see <a href="https://www.avalanche.cash/">Avalanche.cash</a></p><p>‍</p>',
            short_content:
                'On September 14th 2022, the eCash network was upgraded to support the finalization of blocks using Avalanche Post-Consensus.',
            type: 'Blog',
            media_link:
                'https://www.bitcoinabc.org/2022-09-29-avalanche-post-consensus/',
            publish_date:
                'Thu Sep 29 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'avalanche-post-consensus-on-ecash',
            createdAt: '2023-06-20T22:51:31.604Z',
            updatedAt: '2023-06-21T21:31:46.296Z',
            publishedAt: '2023-06-20T22:51:31.596Z',
            legacy_image:
                '/images/6335d9ece86886df3ff2dac7_avalanche-live.jpeg',
            legacy_media_logo:
                '/images/6218a8f444fd6d1db2b4531d_60d1114fcb4e3e2b46511622_bitcoinabclogo-white.png',
            image: {
                data: {
                    id: 63,
                    attributes: {
                        name: '6335d9ece86886df3ff2dac7_avalanche-live.jpeg',
                        alternativeText: null,
                        caption: null,
                        width: 1280,
                        height: 680,
                        formats: {
                            large: {
                                ext: '.jpeg',
                                url: '/uploads/large_6335d9ece86886df3ff2dac7_avalanche_live_03aba50e03.jpeg',
                                hash: 'large_6335d9ece86886df3ff2dac7_avalanche_live_03aba50e03',
                                mime: 'image/jpeg',
                                name: 'large_6335d9ece86886df3ff2dac7_avalanche-live.jpeg',
                                path: null,
                                size: 72.57,
                                width: 1000,
                                height: 531,
                            },
                            small: {
                                ext: '.jpeg',
                                url: '/uploads/small_6335d9ece86886df3ff2dac7_avalanche_live_03aba50e03.jpeg',
                                hash: 'small_6335d9ece86886df3ff2dac7_avalanche_live_03aba50e03',
                                mime: 'image/jpeg',
                                name: 'small_6335d9ece86886df3ff2dac7_avalanche-live.jpeg',
                                path: null,
                                size: 24.71,
                                width: 500,
                                height: 266,
                            },
                            medium: {
                                ext: '.jpeg',
                                url: '/uploads/medium_6335d9ece86886df3ff2dac7_avalanche_live_03aba50e03.jpeg',
                                hash: 'medium_6335d9ece86886df3ff2dac7_avalanche_live_03aba50e03',
                                mime: 'image/jpeg',
                                name: 'medium_6335d9ece86886df3ff2dac7_avalanche-live.jpeg',
                                path: null,
                                size: 46.3,
                                width: 750,
                                height: 398,
                            },
                            thumbnail: {
                                ext: '.jpeg',
                                url: '/uploads/thumbnail_6335d9ece86886df3ff2dac7_avalanche_live_03aba50e03.jpeg',
                                hash: 'thumbnail_6335d9ece86886df3ff2dac7_avalanche_live_03aba50e03',
                                mime: 'image/jpeg',
                                name: 'thumbnail_6335d9ece86886df3ff2dac7_avalanche-live.jpeg',
                                path: null,
                                size: 7.68,
                                width: 245,
                                height: 130,
                            },
                        },
                        hash: '6335d9ece86886df3ff2dac7_avalanche_live_03aba50e03',
                        ext: '.jpeg',
                        mime: 'image/jpeg',
                        size: 98.27,
                        url: '/uploads/6335d9ece86886df3ff2dac7_avalanche_live_03aba50e03.jpeg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:05.081Z',
                        updatedAt: '2023-06-21T20:01:05.081Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 64,
        attributes: {
            title: '与以太坊同源异流，eCash“PoW+雪崩”组合共识各司其职',
            content:
                '<p>9月15日，全球最大的去中心化互联网平台、最具创新能力的区块链和Web3生态、成立8年的以太坊将完成信标链与原链合并，彻底告别PoW，开启PoS新纪元。42万验证用户、7000多个活跃节点、上万个区块链团队、几乎所有加密和区块链从业者，以及各大主流金融监管机构、半导体巨头、国内外互联网巨头……都在密切关注这一历史性事件。</p><p>赶在以太坊合并前一天，9月14日，比特币“点对点的电子现金系统”理想的继承者、BCH主要缔造者和核心开发组Bitcoin ABC支持的eCash，将在保留PoW共识的基础上，正式启用可实现秒级确认的雪崩共识协议（Avalanche）。</p><p>为解决PoW的效率问题，eCash与以太坊——分别代表两条最早的PoW公链——虽然选择了不同路径，但殊途同归，都在为维护去中心化网络的安全、稳定、高效而探索创新。</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1600px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1600px"><div><img src="/images/632137076be47cb2f2dbae52_e249-d200e56a23490918e1a6bc4fa7062491.jpeg" width="auto" height="auto" loading="auto"></div></figure><p><strong>BCH的夙愿，eCash实现</strong></p><p>雪崩共识协议被认为是继经典共识协议（PBFT）和比特币PoW机制之后的共识机制3.0。其在全球范围内实现结算仅需2-4秒钟，交易确认延迟只有4秒，每秒可处理1000–10000笔交易。</p><p>Avalanche母公司AVA Labs创始人兼CEO、原美国康奈尔大学教授Emin Gün Sirer曾表示：经过亲测，雪崩协议结算速度比Apple Pay更快。</p><p>这一秒级的确认速度受到业内人士广泛推崇，以太坊创始人Vitalik Buterin曾公开表示支持，称“雪崩协议具有和比特币同等的认可度”。</p><p>而对于致力成为全球通用支付货币的BCH而言，引入雪崩协议一度被社区寄予厚望。</p><p>早在2018年Avalanche白皮书发表时，当时服务于BCH的Bitcoin ABC团队便意识到，这种新协议正是他们一直在寻找的，它能满足BCH的需求。</p><p>2019年，国内BCH意见领袖、莱比特矿池创始人江卓尔曾表示：“BCH的预确认（雪崩协议）类似DPoS，由矿池按算力比例做节点，几秒就可确认，然后由确认的（大多数矿池算力）确保打包进区块，是个很天才的设计。”</p><p>2020年8月，有报道称，BCH社区另一位大佬、ViaBTC集团创始人杨海坡和Emin Gün Sirer教授将同台对话，讨论“BCH和Avalanche将如何给60亿人带来金融自由”。</p><p>但世事无常，2020年9月，基于雪崩共识的Avalanche公链（AVAX）主网上线，而BCH却在不久后由于IFP（基础设施融资计划）之争再次迎来分叉，社区分崩离析。分叉后，随着Bitcoin ABC选择支持eCash，BCH引入雪崩共识的夙愿也被eCash继承。</p><p>不久后，Emin Gün Sirer在twiiter上表示：希望BCH ABC（eCash）一切顺利，因为他们选择了最快和最安全的共识协议来耦合到他们基于PoW的系统，这是补充并可能取代中本聪方案的最佳选择。</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:640px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="640px"><div><img src="/images/63213706b3b72db3dbe74e62_c573-720957e978e081b93e48fc982b7c416b.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>分叉伊始，Bitcoin ABC团队在应付完针对eCash的一系列攻击之后，就把重心放在了雪崩协议上。按照计划，eCash本该在2021年夏末就引入雪崩共识，结果迟到了整整一年。</p><p>这并不奇怪，在瞬息万变的区块链行业，计划赶不上变化是常有的事。以太坊2.0多次推迟，波卡（Polkadot）因主网上线时间频繁推迟常以“跳票”被调侃……但这些优秀的项目最终都没有辜负用户的等待。</p><p>与以太坊从PoW转为PoS长路漫漫一样，eCash网络在PoW共识基础上引入雪崩共识，同样是一项任重道远的高难度、复杂性系统工程。</p><p>“关键和复杂的技术升级需要大量的范围界定、测试和构建。”eCash团队解释，固定的时间表可能会限制测试并阻止重要问题的解决，这也是为什么此类升级都是在里程碑式的基础上进行的，以太坊的合并也一样。</p><p>其实eCash很早就已搭建好雪崩共识体系，但这不同于某一项细小功能的升级，它需要经过全方位的测试、调整和改进，确保主网有足够的节点和质押代币，能够100%安全可靠运行之后，才能正式推向大众。</p><p>8月28日，eCash项目创始人、Bitcoin ABC负责人Amaury Séchet（阿毛里）在布拉格电子现金大会上宣布：雪崩共识将在eCash主网正式上线。</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:640px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="640px"><div><img src="/images/6321370513f2558bdab296d2_1cb9-33a6ffc7b99f7be41bc7fac3dd923067.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>eCash的雪崩共识包括后共识（Post-Consensus）和预共识（Pre-consensus）两部分，本次上线的是雪崩后共识。预共识正在开发中，待开发完成上线后，将一起与原有的PoW共同运行，各司其职。</p><p>据了解，就在宣布雪崩上线的前几周，eCash决定将最初计划用于预共识的模块纳入后共识，以进一步提高协议的稳健性。如此一来，虽然增加了后共识的等待时间，但也有效节省了未来预共识的上线时间。</p><p>那么，历时近2年开发部署的雪崩共识协议将为eCash带来什么？</p><p><strong>PoW负责信任，雪崩负责效率</strong></p><p>9月14日12:00 UTC，当eCash官网上的倒计时走到“0”时，雪崩共识实施状态将从“孵化中”变为“上线”，任何人质押1亿个XEC（约5000美元），即可无需许可地连接到网络并参与雪崩共识。</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:640px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="640px"><div><img src="/images/63213706d1c57711abdb4b14_51ef-1c9d9abfdea9cd7d8a4e355932682dd1.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>届时，eCash将是继AVAX公链之后，全网第二个引入雪崩共识的区块链项目，也是唯一一个在PoW系统中引入雪崩共识的项目，而这恰恰是AVAX白皮书发布时的初衷。</p><p>这意味着，eCash已超越AVAX白皮书的愿景，创造性地引入“PoW+雪崩”组合共识，同时发挥两个共识之所长，弥补任意单一共识的局限。</p><p>需要指出的是，eCash的雪崩共识代码完全独立于AVAX，由Bitcoin ABC团队从零开发创建。</p><p>AVAX和eCash使用相同的Avalanche算法，但AVAX只使用了雪崩算法，而eCash将雪崩算法与中本聪共识的核心PoW相结合，兼具PoW的安全性和可信性，以及雪崩共识的效率和速度。</p><p>两者的一个关键的区别是，eCash节点在发现新的peer节点时能够以不信任的方式验证链，而AVAX必须求助于“受祝福的”（“blessed”）节点以信任的方式引导新节点。这意味着，eCash更加去中心化，使eCash节点能够基于比特币共识协议的安全性无需信任地进入Avalanche quorum。</p><p>另一个区别是，eCash是一个“money first”的项目，实施雪崩共识旨在带来额外的智能合约支持和可扩展性，而AVAX作为一个服务于DeFi应用的智能合约平台，重点在于支持智能合约。</p><p>有了雪崩共识加持的eCash，不但显著提升了交易速度，还能预防51%算力攻击，进一步提高网络安全性。同时，雪崩后共识让eCash具备了1个区块确认功能，而预共识将带来近乎即时交易的支付体验，从而大大提高eCash的可用性，使其离“100亿人每天50笔交易”的目标更近一步。</p><p>具体来看，雪崩后共识是指在区块被挖掘后做出决定，包括对区块进行投票，以防止重组。它可以拒绝那些与预共识交易相矛盾的交易区块，这意味着节点之间能相互“通信”，了解区块是否也被网络的其他节点所接受。</p><p>预共识是指在区块被挖掘之前做出决定，包括对交易进行投票，以防止重复支出。换句话说，使用雪崩的节点在区块产生之前就达成交易共识，矿工只需直接打包这个“达成一致的预共识区块”即可。</p><p>雪崩预共识能决定哪些交易在双重支出的情况下进入区块，而后共识决定在竞争链存在的情况下挖哪一条链。这就使得面对重组攻击时，矿工可以就何时拒绝大型重组达成共识，从而避免分叉风险。即使攻击者持续发动51%算力攻击，雪崩共识也为矿工们提供了有效的防护办法。</p><p>此外，与仍然需要6次确认才能确保安全的比特币相比，雪崩预共识将在几秒钟后赋予eCash相同的安全性，这在目前Top 10的加密项目中，无疑是一个巨大的竞争优势。例如，以太坊仍然会遇到交易延迟、高额gas费，甚至交易失败的情况。而雪崩预共识保证每一笔eCash交易都是安全的，并且在几秒钟内完成。</p><p>除了即将上线的雪崩共识，旨在提升eCash网络传输效率的闪电网络（QUIC），提升区块链可用性的混币协议、Chronik索引器等重磅功能也在快速开发中。</p><p>其中，混币协议将为eCash交易提供可选的隐私保护，使其可与Monero、Zcash等匿名币相媲美，提升eCash的抗审查性。</p><p>eCash正在将自己的Chronik索引器直接集成到节点软件中，这将使得交易所和开发人员更容易运行他们的应用程序。即便是一些相对复杂的应用程序，例如涉及支付或支付处理器的游戏，也可以在不到一天时间内部署到eCash上。</p><p>加密领域热点层出不穷，但很多热点都是由一些纯代币项目炮制，以吸引眼球和流量。当潮水退去，我们会发现一些缺乏真正效用的项目不过是又一场资金游戏。尽管如此，这类项目在行业的每一次潮起潮落中都大有市场，因为资本永不眠。</p><p>而Bitcoin ABC是这个浮躁的市场上少有的产品至上的团队，他们在上一轮牛市中近乎沉寂，专注于让eCash朝着“构建全球电子现金系统”“重新定义财富”的目标而日拱一卒地砥砺前行。如今，布局近2年的雪崩共识协议正式上线，eCash做好迎接下一轮加密牛市的准备了吗？</p><p>‍</p>',
            short_content:
                '赶在以太坊合并前一天，9月14日，比特币“点对点的电子现金系统”理想的继承者、BCH主要缔造者和核心开发组Bitcoin ABC支持的eCash，将在保留PoW共识的基础上，正式启用可实现秒级确认的雪崩共识协议（Avalanche）。 ',
            type: 'News',
            media_link:
                'https://t.cj.sina.com.cn/articles/view/5174116327/13466bfe700100z6kz',
            publish_date:
                'Tue Sep 13 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'yu-yi-tai-fang-tong-yuan-yi-liu-ecash-pow-xue-beng-zu-he-gong-shi-ge-si-qi-zhi',
            createdAt: '2023-06-20T22:51:20.602Z',
            updatedAt: '2023-06-21T21:32:37.979Z',
            publishedAt: '2023-06-20T22:51:20.596Z',
            legacy_image:
                '/images/63213649496e602dfb717afa_1cb9-33a6ffc7b99f7be41bc7fac3dd923067.jpeg',
            legacy_media_logo: '/images/632136efec349ea4efe2ebdf_sina.png',
            image: {
                data: {
                    id: 67,
                    attributes: {
                        name: '63213649496e602dfb717afa_1cb9-33a6ffc7b99f7be41bc7fac3dd923067.jpeg',
                        alternativeText: null,
                        caption: null,
                        width: 640,
                        height: 480,
                        formats: {
                            small: {
                                ext: '.jpeg',
                                url: '/uploads/small_63213649496e602dfb717afa_1cb9_33a6ffc7b99f7be41bc7fac3dd923067_83e8371bc9.jpeg',
                                hash: 'small_63213649496e602dfb717afa_1cb9_33a6ffc7b99f7be41bc7fac3dd923067_83e8371bc9',
                                mime: 'image/jpeg',
                                name: 'small_63213649496e602dfb717afa_1cb9-33a6ffc7b99f7be41bc7fac3dd923067.jpeg',
                                path: null,
                                size: 23.08,
                                width: 500,
                                height: 375,
                            },
                            thumbnail: {
                                ext: '.jpeg',
                                url: '/uploads/thumbnail_63213649496e602dfb717afa_1cb9_33a6ffc7b99f7be41bc7fac3dd923067_83e8371bc9.jpeg',
                                hash: 'thumbnail_63213649496e602dfb717afa_1cb9_33a6ffc7b99f7be41bc7fac3dd923067_83e8371bc9',
                                mime: 'image/jpeg',
                                name: 'thumbnail_63213649496e602dfb717afa_1cb9-33a6ffc7b99f7be41bc7fac3dd923067.jpeg',
                                path: null,
                                size: 5.96,
                                width: 208,
                                height: 156,
                            },
                        },
                        hash: '63213649496e602dfb717afa_1cb9_33a6ffc7b99f7be41bc7fac3dd923067_83e8371bc9',
                        ext: '.jpeg',
                        mime: 'image/jpeg',
                        size: 23.6,
                        url: '/uploads/63213649496e602dfb717afa_1cb9_33a6ffc7b99f7be41bc7fac3dd923067_83e8371bc9.jpeg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:01:05.436Z',
                        updatedAt: '2023-06-21T20:01:05.436Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 63,
        attributes: {
            title: '上线雪崩共识，eCash迎来里程碑时刻？',
            content:
                '<p><strong>导语：</strong></p><p>9月是2022年Crypto领域浓墨重彩的一个月，本月15日，以太坊将正式合并信标链与原链，这标志着以太坊彻底与PoW告别，进入到PoS新纪元，同时也意味大量矿工要在短时间内寻找新的“容身之所”。</p><p>在一众老牌PoW项目当中，eCash的身影格外亮眼，因为它在本月也将迎来一个重要的里程碑：9月14日，eCash主网将正式推出雪崩共识（Avalanche）。</p><p>这项新进展对eCash的重要程度类似于ETH2.0之于ETH，这不仅意味着eCash将踏向新的征程，也为PoW领域带来一次具有实验意义的大胆尝试：eCash是行业中首位融合“PoW+ Avalanche”的项目，这一创新被矿业行业人士称为“天才的设计”。</p><p>目标成为全球电子现金系统的eCash为何要采用雪崩共识，两者的结合会为eCash带来何种改变？</p><p>这些改变能否为同类型的PoW项目带来启发？就从eCash项目本身出发，探析这一设计的来龙去脉以及它所带来的转变。</p><p><strong>初识eCash和雪崩</strong></p><p>“eCash”是BCH的分叉币，由原BCH的核心开发组Bitcoin ABC创建。2021年7月1日，品牌全新升级为eCash之时，创始人Amaury Séchet（阿毛里）将引入雪崩共识这一方案公之于众。相信常混迹于Crypto的人，对雪崩协议很熟悉，安全、去中心化、高性能是它不可忽视的三大特性。雪崩的横空出世，一度引发市场和资本的疯狂追逐，使得这个号称“第三代共识机制”的协议在2020年的公链之争中脱颖而出。但eCash与雪崩的缘分早在2018年就埋下种子：雪崩白皮书出现之时， Bitcoin ABC 开发者的负责人Amaury Séchet意识到，这种新协议正是他们一直在寻找的，因为它刚好能满足项目的需求，适合用来做PoW的补充。如果有心留意，之后的两年里，还未分叉的BCH社区和开发者常常会热烈地讨论雪崩共识。只可惜，这项改进还未实现，社区就已分崩离析。直到原BCH的核心开发团队Bitcoin ABC自立门户，真正地投入资源和时间发展eCash，才得以让“PoW+ Avalanche” 这个“未完成的梦”有了落地的机会。需要指出的是，eCash 的雪崩共识完全独立于 AVAX，除了都使用雪崩白皮书中描述的协议外，它们没有任何关系。eCash 上的雪崩是一个全新的、由 Bitcoin ABC 团队从零开发的系统。</p><p><strong>左手PoW，右手雪崩</strong></p><p>当官网的倒数计时器达到0时，eCash的雪崩共识实施状态将从“孵化中”转变为“上线”，所有的eCash节点无需许可就能连接到网络并参与到雪崩共识当中来。</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1000px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1000px"><div><img alt="Image" src="/images/631ffe8ccec72b14992ed790_640.png" width="auto" height="auto" loading="auto"></div></figure><p>前文强调雪崩共识将是PoW共识的补充，那么，从技术的角度来看，eCash到底是如何实现“PoW+ 雪崩共识”这个神奇组合的呢？eCash将雪崩共识分为两部分：雪崩预共识和雪崩后共识，这两个部分与原有的PoW共同运行，其中：<strong>预共识</strong>是指使用雪崩的节点在区块产生之前就交易达成共识，矿工只要直接打包这个“达成一致的预共识区块”就行了。<strong>后共识</strong>是指在矿工生产区块后处理区块。它可以拒绝那些与预共识交易相矛盾的交易区块。换句话说，它意味着节点之间能相互“通信”，了解区块是否也被网络的其他节点所接受。9月14日，eCash推出的雪崩共识中首先进入“上线”状态的是雪崩后共识，而雪崩预共识正在开发中，相信会在不久后上线。回到业界最关心的问题上：雪崩共识将为eCash带来什么改变呢？</p><ul><li><strong>预防51%算力攻击，显著提高网络安全性</strong></li></ul><p>预共识能决定哪些交易在双重支出的情况下进入区块，而后共识决定在竞争链存在的情况下挖哪一条链。这就使得面对重组攻击时，矿工将可以就何时拒绝大型重组达成共识，从而避免分叉风险。即使攻击者持续发动51%算力攻击，雪崩共识也为矿工们提供了有效的防护办法。这对经历过一次人为恶意攻击的eCash非常重要。要成为一个全球的电子现金系统，网络安全是一切的基础。与雪崩的结合，将使eCash的安全性大幅提升，有实力防范来自敌对矿工或黑客的攻击，不会像当初那样处于险境。项目不用陷入无限分叉的泥潭，让能真正做事的人能安心且持续地建造项目。</p><ul><li><strong>更好的可扩展性，满足数亿用户的支付需求</strong></li></ul><p>随着雪崩预共识的部署，它将提高用户的支付体验，允许用户从近乎即时的交易中受益，让eCash成为一个真正实现秒级确认的支付系统。而这种快速达成共识的方式也使矿工的工作得以顺利进行，从而为实现更好的扩展性打下良好基础。在一次关于有向无环图（DAG, Directed Acyclic Graph）的演讲中，Amaury Séchet将雪崩共识称为一个“熵减”的过程，“它能够确保节点在等待区块时保持同步。当一个区块进来时，节点离同步越近，他们收到区块时所要做的重新同步就越少。它允许节点在区块之间完成绝大部分工作，而不是像BTC那样，节点每10分钟就有一大堆工作要做。”比起BTC这样的单一线性链，采用DAG有向无环图技术的雪崩在可扩展性上有很大的弹性，能灵活满足不同开发者的“定制”需求。通过构建完整的雪崩系统，eCash也能享有雪崩的效能，团队根据实际情况引入网络扩展需求，以达到项目的终极目标——满足全球规模的金融需求，为数亿用户提供每人每天50笔交易的支付体验。</p><p><strong>逆风踏上全新征程</strong></p><p>显然，上线雪崩共识是eCash一项重大突破，使得它在同类项目的“军备竞赛”中拔得头筹，踏上全新征程的它也将打造出更好更强大的全球电子现金系统。细看雪崩为eCash带来的长远影响，主要落实在三个方面：</p><ul><li><strong>进入全新发展阶段，为社区和市场注入信心</strong></li></ul><p>在1年多以前，eCash的代币XEC市值还排在200名开外。通过团队在技术迭代、产品升级等方面的不懈努力，XEC排名不断攀升，如今位列55位以内，跻身主流阵营。在宣布上线雪崩共识的当天，eCash更是受到市场的巨大反响：XEC短时间内飙涨76%，社交平台讨论量达到空前新高。</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1080px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1080px"><div><img alt="Image" src="/images/631ffe8c5b244cc1ae20f39e_640.png" width="auto" height="auto" loading="auto"></div></figure><p>有了雪崩共识的加持，eCash为社区和市场注入一针强心剂，不仅展现出团队的技术实力，同时也让大家意识到，团队长期发展的决心以及在竞争市场中强大的突围能力。</p><ul><li><strong>引入全新模式，让安全性得到飞跃</strong></li></ul><p>未来，eCash将引入新的模式，开放Staking功能。这将为eCash生态带来诸多好处：第一，完全防止51%的矿工攻击，使安全性得到飞跃；第二，繁荣生态，让更多人参与到社区治理当中；第三，增强代币价值属性，间接通缩助力币价提升。</p><ul><li><strong>简化网络升级，加快实现全球通用支付货币的目标</strong></li></ul><p>如同Amaury Séchet所说，“随着雪崩的部署，攻击问题将很快成为过去时。”有了雪崩的加持，eCash的安全性得到质的提升，网络升级将被简化，能够实现无分叉升级，未来将不会再出现因意见分歧而导致的硬分叉。BCH的前车之鉴告诉业界，每一次分叉对社区、生态和Token价值都是一次无法挽回的伤害。只有大后方稳固下来，才能让开发人员和社区成员能继续坚定地建设与创造。其实回过头来看，eCash部署雪崩并非业界所见到的那样一帆风顺。这一点多以来，Bitcoin ABC团队的重心一直在雪崩上。但由于工程量巨大，正式上线的时间迟迟未定，因此遭受不少吃瓜群众的嘲讽和质疑，认为Bitcoin ABC团队只是在夸夸其谈。虽然营销不是强项，但好在技术上的事情是Bitcoin ABC这个先后服务了BTC、BCH的团队最拿手的。为了提高工作透明度，eCash甚至专门创建了 avalanche.cash这个网站，向所有人展示正在进行的工作以及未来的路线图。然而，越是重大的举措，越是需要谨慎对待，即便这常常会以牺牲时间为代价，如同以太坊用了几年的时间才正式转向POS，在这期间也受到不少质疑。其实eCash很早就搭建好雪崩共识体系，但这并非是一个细小的功能，它需要进行全方位的测试，进行调整和改进，确保主网有足够的节点和质押代币，能够100%安全可靠地运行，才能正式推向大众。顶着巨大的压力，精简的Bitcoin ABC团队保持无畏的状态，潜心打磨技术，朝着既定目标跨进，这才没有辜负社区和市场的期待，在主网成功推出雪崩共识，兑现了当初的承诺，用实力收获大家的认可。</p><p><strong>结语</strong></p><p>随着雪崩后共识的上线，eCash将发布更多关于如何质押代币和运行雪崩后共识的信息和教程。除此之外，eCash未来还会推出的功能包括用以确定近乎即时交易的预共识、提供雪崩节点服务的激励措施等。两年前备受质疑的eCash，如今迎来华丽转身，抢先实现BCH社区当初对未来的美好构想，将雪崩共识和PoW相结合，最大限度地发挥两者的优势，提升网络安全和性能的同时，有效推动eCash进入良性发展，这样的项目的确值得大家对它的期待。“全球电子现金系统”并非一个口号，它需要一群有想法、有技术实力、负责且坚定的人去实现它。显然，eCash让大家看到了它身上坚守的东西，真正凭借实力在竞争激烈的汪洋里远航，期待未来eCash能让业界看到更多的可能性。<strong>···END···</strong>‍</p>',
            short_content:
                '9月是2022年Crypto领域浓墨重彩的一个月，本月15日，以太坊将正式合并信标链与原链，这标志着以太坊彻底与PoW告别，进入到PoS新纪元，同时也意味大量矿工要在短时间内寻找新的“容身之所”。',
            type: 'News',
            media_link: 'https://mp.weixin.qq.com/s/v3AmSoz40gR946dMpIiLig',
            publish_date:
                'Mon Sep 12 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'shang-xian-xue-beng-gong-shi-ecash-ying-lai-li-cheng-bei-shi-ke',
            createdAt: '2023-06-20T22:51:07.594Z',
            updatedAt: '2023-06-21T21:33:04.624Z',
            publishedAt: '2023-06-20T22:51:07.589Z',
            legacy_image: '/images/631ffe3c65f30f4be5e12b1e_640.png',
            legacy_media_logo:
                '/images/60d90f920743e26430746af3_4-%E5%8D%9A%E9%93%BE%E8%B4%A2%E7%BB%8Flogo.png',
            image: {
                data: {
                    id: 61,
                    attributes: {
                        name: '631ffe3c65f30f4be5e12b1e_640.png',
                        alternativeText: null,
                        caption: null,
                        width: 605,
                        height: 340,
                        formats: {
                            small: {
                                ext: '.png',
                                url: '/uploads/small_631ffe3c65f30f4be5e12b1e_640_eaa143d2c3.png',
                                hash: 'small_631ffe3c65f30f4be5e12b1e_640_eaa143d2c3',
                                mime: 'image/png',
                                name: 'small_631ffe3c65f30f4be5e12b1e_640.png',
                                path: null,
                                size: 302.53,
                                width: 500,
                                height: 281,
                            },
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_631ffe3c65f30f4be5e12b1e_640_eaa143d2c3.png',
                                hash: 'thumbnail_631ffe3c65f30f4be5e12b1e_640_eaa143d2c3',
                                mime: 'image/png',
                                name: 'thumbnail_631ffe3c65f30f4be5e12b1e_640.png',
                                path: null,
                                size: 81.41,
                                width: 245,
                                height: 138,
                            },
                        },
                        hash: '631ffe3c65f30f4be5e12b1e_640_eaa143d2c3',
                        ext: '.png',
                        mime: 'image/png',
                        size: 100.34,
                        url: '/uploads/631ffe3c65f30f4be5e12b1e_640_eaa143d2c3.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:00:24.902Z',
                        updatedAt: '2023-06-21T20:00:24.902Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 62,
        attributes: {
            title: '이캐시, 오는 14일 아발란체 메인넷 도입',
            content:
                '<p>최근 가상자산 시장 전반에 걸쳐 강한 하락의 압박을 받는 가운데 지난달 말부터 이캐시의 가격이 시세 대비 50% 이상 폭등하면서 주목을 받았다. 이는 이캐시 프로젝트의 창시자 아마우리 세쳇(Amaury Séchet)의 발표가 주된 요인으로 풀이된다.</p><p>‍</p><p>아마우리 세쳇은 지난 8월 28일 체코 프라하에서 열린 전자화폐 컨퍼런스(Electronic Cash Conference)에서 아발란체 메인넷 런칭일인 9월 14일에 해당 프로토콜이 이캐시 프로젝트에 적용된다고 발표한 바 있다.</p><p>‍</p><p>같은날 론칭하는 작업증명(PoW) 채굴 방식에서 지분증명(PoS) 방식으로 전환되는 이더리움의 ‘더 머지(The Merge)’ 업그레이드 보다 몇시간 빠르게 아발란체 메인넷이 이캐시에 적용될 예정이다.</p><p>‍</p><p>아발란체 프로토콜의 도입은 트랜잭션 속도 및 메시징 기술 향상이라는 점에 있어 이캐시 프로젝트가 한 단계 나아가는 데 중요한 역할을 한다. 이캐시의 가격 상승은 그동안 이캐시 재단의 공지로만 다양한 기술적 가능성을 시사하며 발표되었던 아발란체 도입이 구체화함에 따라 프로젝트의 가치가 높아졌다는 것이 업계의 평가다.</p><p>‍</p><p>한편 최근 이더리움의 기존 PoW 채굴 방식에서 PoS 방식으로 전환되는 ‘더 머지’ 업그레이드가 주목받으며 이더리움 가상 머신(EVM)과의 호환을 지원하는 아발란체 또한 주목받고 있다.</p><p>‍</p><p>EVM 호환성을 지원하는 가상자산은 이더리움의 가치 변동성에 따라 시세 흐름이 이어진다. 이에 따라 이더리움의 더 머지 업그레이드 이후 아발란체의 사용자 수와 아발란체 네트워크 기반으로 개발되는 앱이 증가할 것으로 전망된다.</p><p>‍</p><p>이캐시의 아발란체 도입은 암호화폐의 대표적인 합의 알고리즘인 POW의 보안성과 POS의 호환성이라는 장점을 모두 적용한다는 점과 POS 방식을 컨센서스 레이어에 도입한다는 점에서 투자자들의 기대가 높아지고 있다.</p><p>‍</p>',
            short_content:
                '최근 가상자산 시장 전반에 걸쳐 강한 하락의 압박을 받는 가운데 지난달 말부터 이캐시의 가격이 시세 대비 50% 이상 폭등하면서 주목을 받았다. 이는 이캐시 프로젝트의 창시자 아마우리 세쳇(Amaury Séchet)의 발표가 주된 요인으로 풀이된다.\n',
            type: 'News',
            media_link:
                'http://www.datanet.co.kr/news/articleView.html?idxno=176340',
            publish_date:
                'Mon Sep 12 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ikaesi-oneun-14il-abalrance-meinnes-doib',
            createdAt: '2023-06-20T22:50:53.605Z',
            updatedAt: '2023-06-21T21:33:41.211Z',
            publishedAt: '2023-06-20T22:50:53.594Z',
            legacy_image:
                '/images/63201b9fa5d8d93a95b96c69_176340_99713_2619.jpeg',
            legacy_media_logo:
                '/images/63201c4ab7246f59df93c949_toplogo_20190719114400-%20white.png',
            image: {
                data: {
                    id: 58,
                    attributes: {
                        name: '63201b9fa5d8d93a95b96c69_176340_99713_2619.jpeg',
                        alternativeText: null,
                        caption: null,
                        width: 598,
                        height: 334,
                        formats: {
                            small: {
                                ext: '.jpeg',
                                url: '/uploads/small_63201b9fa5d8d93a95b96c69_176340_99713_2619_ce6de98f09.jpeg',
                                hash: 'small_63201b9fa5d8d93a95b96c69_176340_99713_2619_ce6de98f09',
                                mime: 'image/jpeg',
                                name: 'small_63201b9fa5d8d93a95b96c69_176340_99713_2619.jpeg',
                                path: null,
                                size: 29.5,
                                width: 500,
                                height: 279,
                            },
                            thumbnail: {
                                ext: '.jpeg',
                                url: '/uploads/thumbnail_63201b9fa5d8d93a95b96c69_176340_99713_2619_ce6de98f09.jpeg',
                                hash: 'thumbnail_63201b9fa5d8d93a95b96c69_176340_99713_2619_ce6de98f09',
                                mime: 'image/jpeg',
                                name: 'thumbnail_63201b9fa5d8d93a95b96c69_176340_99713_2619.jpeg',
                                path: null,
                                size: 10.11,
                                width: 245,
                                height: 137,
                            },
                        },
                        hash: '63201b9fa5d8d93a95b96c69_176340_99713_2619_ce6de98f09',
                        ext: '.jpeg',
                        mime: 'image/jpeg',
                        size: 38.54,
                        url: '/uploads/63201b9fa5d8d93a95b96c69_176340_99713_2619_ce6de98f09.jpeg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:00:23.440Z',
                        updatedAt: '2023-06-21T20:00:23.440Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 61,
        attributes: {
            title: 'This Week in Crypto: Hawkish Fed Adds Pressure to Prevailing Downtrend',
            content:
                '<p>‍</p><h2><strong>Bitcoin Clings Onto $20,000</strong></h2><p>Following a rather gloomy month, Bitcoin (<a href="https://www.tipranks.com/cryptocurrency/btc-usd"><strong>BTC-USD</strong></a>) is trending within a few dollars of $20,000. As the last month of the third quarter commences, the value of the leading crypto token has dropped by 1.30% within the past 24 hours, taking Bitcoin’s 7-day loss close to 8.10%.</p><p>In the past 30 days, Bitcoin has lost nearly 13.00% of its value, primarily due to the uncertainty surrounding the Federal Reserve’s efforts to “tame inflation.” The medium-term downtrend resumed after Federal Reserve Chairman Jerome Powell delivered a hawkish message indicating that “interest rates might stay at a level that restrains growth.” The U.S. stock market responded by tumbling, bringing down Bitcoin and other cryptocurrencies.</p><p>Amid the latest losing streak, Bitcoin’s market dominance (Bitcoin’s share of the total crypto market relative to other tokens and coins) has also taken a sharp dip and is currently hovering around 40%. This drop in dominance was echoed by a recent Arcane Research report highlighting altcoins’ outperformance versus Bitcoin throughout August.</p><h2><strong>Alts Face the Wrath of Bears</strong></h2><p>The last week of August didn’t favor most altcoins. Ethereum (<a href="https://www.tipranks.com/cryptocurrency/eth-usd"><strong>ETH-USD</strong></a>), the largest altcoin by market capitalization, dropped by nearly 9.40% over the past seven sessions as the hype surrounding “The Merge” continues to fade. </p><p>Among the other large-cap altcoins, Solana (SOL) and Avalanche (AVAX) were the biggest losers over the last week. The value of SOL slid by nearly 14.40% during the period, taking its monthly losses to around 23.15%. The decline comes after Solana-based DeFi project OptiFi “accidentally” closed the OptiFi mainnet program during a routine upgrade, leading to a loss of around $661,000.</p><p>Avalanche (AVAX) was one of the steepest underperformers after dropping by around 19.80% this week due to the fresh allegations raised by CryptoLeaks. An unverified video shows Ava Labs legal representative Kyle Roche claiming to “sue Solana on behalf of AVA Labs.” The value of AVAX continued to slide after the whistleblower website released a full report alongside another unverified video featuring Kyle Roche. </p><p>Memecoins DOGE and SHIB continued their downward slide this week, pushing SHIB to the 14th rank in the list of top cryptocurrencies by market capitalization. DeFi tokens and other low-cap altcoins also delivered outsized losses in the double-digits, further contributing to the declining aggregate crypto market capitalization.</p><h2><strong>eCash Sparks New Rally</strong></h2><p>While the broader market is facing an uphill battle, lesser-known altcoin eCash (XEC) registered promising gains this week. XEC has outperformed every token over the past seven sessions, increasing roughly 20.10%. The upward trend has also sparked investor interest as the token’s 24-hour trading volume jumped by nearly 50%.</p><p>A fork of the Bitcoin blockchain, eCash has experienced an increase in on-chain development, with the team recently releasing the Bitcoin ABC 0.25.13 upgrade, implementing several minor bug fixes and improvements, sparking a fresh rally in the XEC token’s value. Overall, August has been an eventful month for the eCash community. The platform unveiled several updates, including the Avalanche Post-Consensus upgrade, new wallets and functionalities, and a $100 million XEC Contribution Rewards Program. </p><h2><strong>Georgia Aims to Become a Global Crypto Hub, and More</strong></h2><p>Seeking to establish itself as one of the most crypto-friendly destinations in the world, Georgia has revealed its plan to synchronize its existing crypto regulations with the new rules implemented across the European Union (EU). Per a statement from Vice Prime Minister and Minister of Economy Levan Davitashvil, a draft bill has already been forwarded to the parliament.</p><p>In gaming news, although investment continues to pour into the blockchain gaming industry, a new report suggests that every Web3 game has an average of 40% bots compared to active users. If true, the report raises serious concerns surrounding fake community engagement and token liquidity. </p><p>Meanwhile, Compound, the third largest DeFi lending platform, is currently dealing with a significant code bug linked to the recent governance proposal to update its price feeds. This problem has halted the Compound Ether (cETH) market. </p><p>Finally, amid Binance’s continued efforts to expand its presence across the Middle East, raise adoption, and spread awareness, UAE business Virtuzone has started accepting cryptocurrencies by integrating Binance Pay. Virtuzone joins the growing list of mainstream UAE-based businesses like JA Resorts and Hotels, Majid Al Futtaim, and others participating in this strategic partnership with Binance.</p><p>‍</p>',
            short_content:
                'While the broader market is facing an uphill battle, lesser-known altcoin eCash (XEC) registered promising gains this week. XEC has....',
            type: 'News',
            media_link:
                'https://www.nasdaq.com/articles/this-week-in-crypto%3A-hawkish-fed-adds-pressure-to-prevailing-downtrend',
            publish_date:
                'Thu Sep 01 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'this-week-in-crypto-hawkish-fed-adds-pressure-to-prevailing-downtrend',
            createdAt: '2023-06-20T22:50:39.613Z',
            updatedAt: '2023-06-21T21:34:04.906Z',
            publishedAt: '2023-06-20T22:50:39.604Z',
            legacy_image: '/images/63119ef5949700f1e33aaa91_-1x-1.jpeg',
            legacy_media_logo:
                '/images/61290b40e2b00590b84eea17_1200px-NASDAQ_Logo%20white.png',
            image: {
                data: {
                    id: 59,
                    attributes: {
                        name: '63119ef5949700f1e33aaa91_-1x-1.jpeg',
                        alternativeText: null,
                        caption: null,
                        width: 1024,
                        height: 682,
                        formats: {
                            large: {
                                ext: '.jpeg',
                                url: '/uploads/large_63119ef5949700f1e33aaa91_1x_1_5d56f69f44.jpeg',
                                hash: 'large_63119ef5949700f1e33aaa91_1x_1_5d56f69f44',
                                mime: 'image/jpeg',
                                name: 'large_63119ef5949700f1e33aaa91_-1x-1.jpeg',
                                path: null,
                                size: 132,
                                width: 1000,
                                height: 666,
                            },
                            small: {
                                ext: '.jpeg',
                                url: '/uploads/small_63119ef5949700f1e33aaa91_1x_1_5d56f69f44.jpeg',
                                hash: 'small_63119ef5949700f1e33aaa91_1x_1_5d56f69f44',
                                mime: 'image/jpeg',
                                name: 'small_63119ef5949700f1e33aaa91_-1x-1.jpeg',
                                path: null,
                                size: 35.94,
                                width: 500,
                                height: 333,
                            },
                            medium: {
                                ext: '.jpeg',
                                url: '/uploads/medium_63119ef5949700f1e33aaa91_1x_1_5d56f69f44.jpeg',
                                hash: 'medium_63119ef5949700f1e33aaa91_1x_1_5d56f69f44',
                                mime: 'image/jpeg',
                                name: 'medium_63119ef5949700f1e33aaa91_-1x-1.jpeg',
                                path: null,
                                size: 77.55,
                                width: 750,
                                height: 500,
                            },
                            thumbnail: {
                                ext: '.jpeg',
                                url: '/uploads/thumbnail_63119ef5949700f1e33aaa91_1x_1_5d56f69f44.jpeg',
                                hash: 'thumbnail_63119ef5949700f1e33aaa91_1x_1_5d56f69f44',
                                mime: 'image/jpeg',
                                name: 'thumbnail_63119ef5949700f1e33aaa91_-1x-1.jpeg',
                                path: null,
                                size: 9.23,
                                width: 234,
                                height: 156,
                            },
                        },
                        hash: '63119ef5949700f1e33aaa91_1x_1_5d56f69f44',
                        ext: '.jpeg',
                        mime: 'image/jpeg',
                        size: 141.85,
                        url: '/uploads/63119ef5949700f1e33aaa91_1x_1_5d56f69f44.jpeg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:00:24.027Z',
                        updatedAt: '2023-06-21T20:00:24.027Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 60,
        attributes: {
            title: 'The total crypto market cap continues to crumble as the dollar index hits a 20 year high',
            content:
                '<p>The total crypto market capitalization dropped by 6.9% in one week, while derivatives metrics reflect increasing demand for bearish bets.</p><p>From a bearish perspective, there\'s a fair probability that the crypto market entered a descending channel (or wedge) on Aug. 15 after it failed to break above the $1.2 trillion total market capitalization resistance. Even if the pattern isn\'t yet clearly distinguishable, the last couple of weeks have not been positive.</p><figure class="w-richtext-figure-type- w-richtext-align-fullwidth" style="max-width:1149px" data-rt-type="" data-rt-align="fullwidth" data-rt-max-width="1149px"><div><img src="/images/6311a04084632bcc826f011e_e39aba2b-055d-4222-819d-0cc99a4e4035.png" width="auto" height="auto" loading="auto"></div><figcaption><em>Total crypto market cap, USD billion. Source: TradingView</em></figcaption></figure><p>For example, the $940 billion total market cap seen on Aug. 29 was the lowest in 43 days. The worsening conditions have been accompanied by a steep correction in traditional markets, and the tech-heavy Nasdaq Composite Index has declined by 12% since Aug. 15 and even WTI oil prices plummeted 11% from Aug. 29 to Sept. 1.</p><p>Investors sought shelter in the dollar and U.S. Treasuries after Federal Reserve Chair Jerome Powell reiterated the bank\'s commitment to <a href="https://cointelegraph.com/news/hawkish-fed-comments-and-bitcoin-derivatives-data-point-to-further-btc-downside">contain inflation by tightening the economy</a>. As a result, investors took profits on riskier assets, causing the U.S. Dollar Index (DXY) to reach its highest level in over two decades at 109.6 on Sept 1. The index measures the dollar\'s strength against a basket of top foreign currencies.</p><p>More importantly, the regulatory newsflow remains largely unfavorable, especially after U.S. federal prosecutors requested internal records from Binance crypto exchange to look deeper into possible money laundering and recruitment of U.S. customers. Since late 2020, authorities have been investigating whether Binance violated the <a href="https://www.reuters.com/technology/exclusive-us-sought-records-binance-ceo-crypto-money-laundering-probe-2022-09-01/" target="_blank">Bank Secrecy Act</a>, according to Reuters.</p><h2>Crypto investor sentiment re-enters the bearish zone</h2><p>The risk-off attitude caused by Federal Reserve tightening led investors to expect a broader market correction and is negatively impacting growth stocks, commodities and cryptocurrencies.</p><figure class="w-richtext-figure-type- w-richtext-align-fullwidth" style="max-width:1039px" data-rt-type="" data-rt-align="fullwidth" data-rt-max-width="1039px"><div><img src="/images/6311a0415d0deaf5d8111de7_20ef1ef2-0686-4866-888b-05a563d040df.png" width="auto" height="auto" loading="auto"></div><figcaption><em>Crypto Fear &amp; Greed Index. Source: Alternative.me</em></figcaption></figure><p>The data-driven sentiment Fear and Greed Index peaked on Aug. 14 as the indicator hit a neutral 47/100 reading, which did not sound very promising either. On Sept. 1 the metric hit 20/100, the lowest reading in 46, and typically deemed a bearish level. </p><p>Below are the winners and losers from the past seven days as the total crypto capitalization declined 6.9% to $970 billion. While Bitcoin (<a href="https://cointelegraph.com/bitcoin-price">BTC</a>) and Ether (<a href="https://cointelegraph.com/ethereum-price">ETH</a>) presented a 7% to 8% decline, a handful of mid-capitalization altcoins dropped 13% or more in the period.</p><figure class="w-richtext-figure-type- w-richtext-align-fullwidth" style="max-width:1257px" data-rt-type="" data-rt-align="fullwidth" data-rt-max-width="1257px"><div><img src="/images/6311a0413971d2a282a129d4_eb5fe155-a4b3-421d-abc8-4f42f8ed677c.png" width="auto" height="auto" loading="auto"></div><figcaption><em>Weekly winners and losers among the top-80 coins. Source: Nomics</em></figcaption></figure><p>eCash (XEC) jumped 16.5% after lead developer Amaury Séchet announced the Avalanche post-consensus launch on eCash Mainnet, expected for Sept. 14. The update aims to bring 1-block finality and increase protection against 51% attacks.</p><p>NEXO gained 3.4% after committing an additional $50 million to its <a href="https://cointelegraph.com/news/amid-crypto-winter-nexo-commits-additional-50m-to-buyback-program">buyback program</a>, giving the company more discretionary ability to repurchase its native token on the open market.</p><p>Helium (HNT) lost 29.3% after core developers proposed <a href="https://cointelegraph.com/news/helium-devs-propose-ditching-its-own-blockchain-for-solana">ditching its own blockchain</a> in favor of Solana’s. If passed, Helium-based HNT, IOT and MOBILE tokens and Data Credits (DCs) would also be transferred to the Solana blockchain.</p><p>Avalanche (<a href="https://cointelegraph.com/avalanche-price-index">AVAX</a>) dropped 18.2% after CryptoLeaks <a href="https://cointelegraph.com/news/avax-price-rebounds-15-after-crypto-leaks-sell-off-but-avalanche-could-still-bury-bulls">released an unverified video</a>showing Kyle Roche, the partner at Roche Freedman, saying that he could sue Solana, one of Avalanche\'s top rivals, on behalf of Ava Labs.</p><h2>Most tokens performed negatively, but retail demand in China slightly improved</h2><p>The OKX Tether (<a href="https://cointelegraph.com/tether-price-index">USDT</a>) premium is a good gauge of China-based retail crypto trader demand. It measures the difference between China-based peer-to-peer (P2P) trades and the United States dollar.</p><p>Excessive buying demand tends to pressure the indicator above fair value at 100%, and during bearish markets, Tether\'s market offer is flooded and causes a 4% or higher discount.</p><figure class="w-richtext-figure-type- w-richtext-align-fullwidth" style="max-width:1238px" data-rt-type="" data-rt-align="fullwidth" data-rt-max-width="1238px"><div><img src="/images/6311a04184632bb2c46f0138_1cfd5694-146a-4de0-98f0-4366d8ee844a.png" width="auto" height="auto" loading="auto"></div><figcaption><em>Tether (USDT) peer-to-peer vs. USD/CNY. Source: OKX</em></figcaption></figure><p>On Oct. 30, the Tether price in Asia-based peer-to-peer markets reached a 0.4% premium, its highest level since mid-June. Curiously, the move happened while the crypto total market cap dropped 18.5% since Aug. 15. Data shows there hasn\'t been panic selling from retail traders, as the index remains relatively neutral.</p><p>Traders must also analyze futures markets to exclude externalities specific to the Tether instrument. Perpetual contracts, also known as inverse swaps, have an embedded rate usually charged every eight hours. Exchanges use this fee to avoid exchange risk imbalances.</p><p>A positive funding rate indicates that longs (buyers) demand more leverage. However, the opposite situation occurs when shorts (sellers) require additional leverage, causing the funding rate to turn negative.</p><figure class="w-richtext-figure-type- w-richtext-align-fullwidth" style="max-width:868px" data-rt-type="" data-rt-align="fullwidth" data-rt-max-width="868px"><div><img src="/images/6311a041c598915e3ef3271a_cbbc6159-d33c-4e70-9a00-64b357217886.png" width="auto" height="auto" loading="auto"></div><figcaption><em>Accumulated perpetual futures funding rate on Sept. 1. Source: Coinglass</em></figcaption></figure><p>Perpetual contracts reflected a moderately bearish sentiment as the accumulated funding rate was negative in every instance. The current fees resulted from an unstable situation with higher demand from leverage shorts, those betting on the price decrease. Still, even the 0.70% negative weekly funding rate for Ethereum Classic (ETC) was not enough to discourage short sellers.</p><h2>Negative regulatory and macroeconomic pin down sentiment</h2><p>The negative 6.9% weekly performance should be investors\' least worry right now because regulators have been targeting major crypto exchanges. For example, they claim that altcoins should have been registered as securities and that the sector has been used to facilitate money laundering.</p><p>Moreover, the weak sentiment metrics and imbalanced leverage data signal investors are worried about the impacts of a global recession. Even though Tether data in Asian markets shows no signs of retail panic selling, there is no evidence of traders having a bullish appetite because the total crypto market cap approached its lowest level in 45 days. Thus, bears have reason to believe that the current descending formation will continue in the upcoming weeks.</p><p>‍</p>',
            short_content:
                'The total crypto market capitalization dropped by 6.9% in one week, while derivatives metrics reflect increasing demand for bearish bets.',
            type: 'News',
            media_link:
                'https://cointelegraph.com/news/the-total-crypto-market-cap-continues-to-crumble-as-the-dollar-index-hits-a-20-year-high',
            publish_date:
                'Thu Sep 01 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'the-total-crypto-market-cap-continues-to-crumble-as-the-dollar-index-hits-a-20-year-high',
            createdAt: '2023-06-20T22:50:25.683Z',
            updatedAt: '2023-06-21T21:34:30.399Z',
            publishedAt: '2023-06-20T22:50:25.676Z',
            legacy_image:
                '/images/63119fc83971d27599a0f75d_Screen%20Shot%202022-09-01%20at%2011.09.57%20PM.png',
            legacy_media_logo:
                '/images/60df9da6caefd427a0ca6fff_cointelegraph-logo-vector.svg',
            image: {
                data: {
                    id: 62,
                    attributes: {
                        name: '63119fc83971d27599a0f75d_Screen%20Shot%202022-09-01%20at%2011.09.57%20PM.png',
                        alternativeText: null,
                        caption: null,
                        width: 630,
                        height: 416,
                        formats: {
                            small: {
                                ext: '.png',
                                url: '/uploads/small_63119fc83971d27599a0f75d_Screen_20_Shot_202022_09_01_20at_2011_09_57_20_PM_eef1074b0b.png',
                                hash: 'small_63119fc83971d27599a0f75d_Screen_20_Shot_202022_09_01_20at_2011_09_57_20_PM_eef1074b0b',
                                mime: 'image/png',
                                name: 'small_63119fc83971d27599a0f75d_Screen%20Shot%202022-09-01%20at%2011.09.57%20PM.png',
                                path: null,
                                size: 318.91,
                                width: 500,
                                height: 330,
                            },
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_63119fc83971d27599a0f75d_Screen_20_Shot_202022_09_01_20at_2011_09_57_20_PM_eef1074b0b.png',
                                hash: 'thumbnail_63119fc83971d27599a0f75d_Screen_20_Shot_202022_09_01_20at_2011_09_57_20_PM_eef1074b0b',
                                mime: 'image/png',
                                name: 'thumbnail_63119fc83971d27599a0f75d_Screen%20Shot%202022-09-01%20at%2011.09.57%20PM.png',
                                path: null,
                                size: 79.82,
                                width: 236,
                                height: 156,
                            },
                        },
                        hash: '63119fc83971d27599a0f75d_Screen_20_Shot_202022_09_01_20at_2011_09_57_20_PM_eef1074b0b',
                        ext: '.png',
                        mime: 'image/png',
                        size: 101.47,
                        url: '/uploads/63119fc83971d27599a0f75d_Screen_20_Shot_202022_09_01_20at_2011_09_57_20_PM_eef1074b0b.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:00:44.690Z',
                        updatedAt: '2023-06-21T20:00:44.690Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
];

export const mockBlogPosts2 = [
    {
        id: 59,
        attributes: {
            title: 'eCash Avalanche Mainnet Launch',
            content:
                '<p>Avalanche Post-Consensus will go live on the <a href="https://e.cash/">eCash</a> Mainnet on Sept 14th. This was <a href="https://twitter.com/eCashOfficial/status/1563813874775851009">announced</a> by Amaury Séchet, founder of the eCash project, at the <a href="https://2022.be.cash/">Electronic Cash Conference</a> in Prague.</p><p>The launch of Avalanche Post-Consensus on the eCash Mainnet is a significant achievement. Post-Consensus brings 51% attack prevention which increases security of the network significantly, bringing it on par with leading Proof-of-Work chains. It also brings 1-block finality to eCash, which opens the door for exchanges to enable 1 confirmation deposits.</p><p>Avalanche Post-Consensus also sets a solid foundation for further enhancements to eCash, such as Pre-Consensus which is currently being developed. Future work will continue to improve the properties of eCash as global electronic cash.</p><p>When the <a href="https://avalanche.cash/">launch countdown timer</a> reaches 0, the status of the eCash Avalanche implementation will change from “Incubating” to “Live”. This milestone was achieved via long and technically challenging work.</p><h2>What does “Incubating” mean?</h2><p>Incubating is a period where the Avalanche Post-Consensus features are feature-complete, but still require testing and shakeout by the team. Several rounds of live testing by the Bitcoin ABC team resulted in several fixes and improvements to the Avalanche Post-Consensus implementation. For more details on the improvements made during the Incubation period, see our Avalanche Development Updates <a href="https://www.bitcoinabc.org/2022-05-02-avalanche-development-update">here</a> and <a href="https://www.bitcoinabc.org/2022-08-03-avalanche-development-update">here</a>.</p><p>The Incubating period is also a time to prepare Avalanche nodes to ensure sufficient quorum for the launch on Mainnet. It is important to have enough nodes and staked coins. This will set up the network for success.</p><h2>What will happen when the countdown reaches 0?</h2><p>At the end of the countdown, Avalanche Post-Consensus will be considered live on the eCash network. This means that there will be sufficient nodes running the protocol, with sufficient XEC staked, for the protocol to run reliably and securely.</p><p>Additionally, Bitcoin ABC 0.26.0 will be released. This release will include the <strong><em>-avalanche</em></strong> parameter as a standard node-configuration option. This means that Avalanche Post-Consensus will be ready for anyone on the eCash network to use. It will still be off-by-default, and considered an optional feature.</p><h2>What is Post-Consensus?</h2><p>Post-Consensus is named that way because it is dealing with blocks <em>after</em> they are produced by miners. By contrast, pre-consensus is when the Avalanche protocol is used by nodes to come to consensus on transactions <em>before</em> blocks are produced.</p><p>With Avalanche Post-Consensus, nodes can come to consensus on the current status of blocks that are visible on the eCash network. In other words, it allows nodes to know that the blocks they see are also accepted by the rest of the network. This information can then be used to defend the network against block withholding attacks, and blockchain reorganization attacks.</p><p>After Pre-Consensus is implemented in Bitcoin ABC, Post-Consensus will also be used to reject blocks that include transactions that conflict with transactions that were finalized via Pre-Consensus. This will allow users of the eCash network to benefit from near-instant transaction finalization, with confidence that finalized transactions cannot be reversed.</p><h2>What comes next?</h2><p>In the coming days, more information and tutorials about how to stake your coins and run Avalanche Post-Consensus will be released.</p><p>Looking farther ahead, the next milestone for Post-Consensus will be to make the protocol run “on-by-default” in the node’s configuration settings. This will be activated after sufficient monitoring of Avalanche Post-Consensus running as an optional setting, and it has proven to be reliable and stable.</p><p>In the meantime, development of further eCash Avalanche capabilities continues. Upcoming capabilities include Pre-Consensus for near-instant transaction finality, and staking rewards to incentivize the provision of Avalanche node services on the network.</p><h2>About Avalanche</h2><p>Using a fast consensus protocol to do Pre-Consensus has been a long-standing item on the <a href="https://e.cash/roadmap-explained">eCash Roadmap</a> (and previously on the Bitcoin Cash roadmap). This is one of the improvements needed to power eCash to be a competitor and alternative to Central Bank Digital Currencies (CBDCs). When the <a href="https://ipfs.io/ipfs/QmUy4jh5mGNZvLkjies1RWM4YuvJh5o2FYopNPVYwrRVGV">Avalanche whitepaper</a> appeared in 2018, eCash founder Amaury Séchet and the Bitcoin ABC team recognized that this new protocol was what they had been searching for, as it fulfilled the needed requirements.</p><p>It should be noted that eCash’s Avalanche implementation is completely separate and distinct from the AVAX Avalanche project. They have no connection, other than both using the protocol described in the Avalanche whitepaper. Avalanche on eCash is an entirely new implementation which had to be developed from scratch by the Bitcoin ABC team.</p><p>In the case of eCash, Avalanche consensus is used for fast and live consensus needs, such as fast transaction finality. Proof-of-work based Nakamoto consensus is retained where it is superior, providing objective consensus criterion to enable decentralized node bootstrapping.</p><p>For more info and to monitor development progress, see <a href="https://www.avalanche.cash/">Avalanche.cash</a></p><p>‍</p>',
            short_content:
                'Avalanche Post-Consensus will go live on the eCash Mainnet on Sept 14th. This was announced by Amaury Séchet, founder of the eCash project, ',
            type: 'Blog',
            media_link:
                'https://www.bitcoinabc.org/2022-08-28-avalanche-post-consensus-launch/',
            publish_date:
                'Sun Aug 28 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-avalanche-mainnet-launch',
            createdAt: '2023-06-20T22:50:13.825Z',
            updatedAt: '2023-06-21T21:35:07.679Z',
            publishedAt: '2023-06-20T22:50:13.820Z',
            legacy_image:
                '/images/630b42067974bbaef1104319_avalanche-post-consensus-mainnet-launch.jpeg',
            legacy_media_logo:
                '/images/6270a4a659ed82066113f0dd_bitcoin-abc256%20white.png',
            image: {
                data: {
                    id: 60,
                    attributes: {
                        name: '630b42067974bbaef1104319_avalanche-post-consensus-mainnet-launch.jpeg',
                        alternativeText: null,
                        caption: null,
                        width: 1280,
                        height: 679,
                        formats: {
                            large: {
                                ext: '.jpeg',
                                url: '/uploads/large_630b42067974bbaef1104319_avalanche_post_consensus_mainnet_launch_3c6715338b.jpeg',
                                hash: 'large_630b42067974bbaef1104319_avalanche_post_consensus_mainnet_launch_3c6715338b',
                                mime: 'image/jpeg',
                                name: 'large_630b42067974bbaef1104319_avalanche-post-consensus-mainnet-launch.jpeg',
                                path: null,
                                size: 76.01,
                                width: 1000,
                                height: 530,
                            },
                            small: {
                                ext: '.jpeg',
                                url: '/uploads/small_630b42067974bbaef1104319_avalanche_post_consensus_mainnet_launch_3c6715338b.jpeg',
                                hash: 'small_630b42067974bbaef1104319_avalanche_post_consensus_mainnet_launch_3c6715338b',
                                mime: 'image/jpeg',
                                name: 'small_630b42067974bbaef1104319_avalanche-post-consensus-mainnet-launch.jpeg',
                                path: null,
                                size: 24.97,
                                width: 500,
                                height: 265,
                            },
                            medium: {
                                ext: '.jpeg',
                                url: '/uploads/medium_630b42067974bbaef1104319_avalanche_post_consensus_mainnet_launch_3c6715338b.jpeg',
                                hash: 'medium_630b42067974bbaef1104319_avalanche_post_consensus_mainnet_launch_3c6715338b',
                                mime: 'image/jpeg',
                                name: 'medium_630b42067974bbaef1104319_avalanche-post-consensus-mainnet-launch.jpeg',
                                path: null,
                                size: 47.51,
                                width: 750,
                                height: 398,
                            },
                            thumbnail: {
                                ext: '.jpeg',
                                url: '/uploads/thumbnail_630b42067974bbaef1104319_avalanche_post_consensus_mainnet_launch_3c6715338b.jpeg',
                                hash: 'thumbnail_630b42067974bbaef1104319_avalanche_post_consensus_mainnet_launch_3c6715338b',
                                mime: 'image/jpeg',
                                name: 'thumbnail_630b42067974bbaef1104319_avalanche-post-consensus-mainnet-launch.jpeg',
                                path: null,
                                size: 7.66,
                                width: 245,
                                height: 129,
                            },
                        },
                        hash: '630b42067974bbaef1104319_avalanche_post_consensus_mainnet_launch_3c6715338b',
                        ext: '.jpeg',
                        mime: 'image/jpeg',
                        size: 106.81,
                        url: '/uploads/630b42067974bbaef1104319_avalanche_post_consensus_mainnet_launch_3c6715338b.jpeg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:00:24.162Z',
                        updatedAt: '2023-06-21T20:00:24.162Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 58,
        attributes: {
            title: 'eCash Avalanche Development Update',
            content:
                '<h1>eCash Avalanche Development Update</h1><h2>Robust Networking and Iterative Improvements</h2><p><em>Posted on August 3, 2022</em></p><p>This article is to bring people up to date on what’s been achieved, and what’s been happening in our development activities on Avalanche for eCash, since the <a href="https://www.bitcoinabc.org/2022-05-02-avalanche-development-update/">previous update</a> from early May 2022.</p><p>The two primary advancements since the last update were:</p><ol><li>Faster and more robust discovery of Proofs from the network. This was accomplished through implementation of a “Compact Proof Request” networking capability which allow nodes to actively request all the Proofs that other node know about, and</li><li>Many cycles of iterative improvements via repeated rounds of testing. The details of these fixes and improvements are expanded later in this article.</li></ol><p>As context for understanding these developments, it may be helpful to explain how the networking requirements for the avalanche protocol differ from traditional Nakamoto consensus.</p><h2>Avalanche Networking</h2><p>The Avalanche protocol and Nakamoto consensus are two different consensus protocols that have different properties and tradeoffs. One of the characteristics of the Avalanche protocol is that its security relies on the nodes being well connected to the rest of the network. This is quite different from Nakamoto consensus, which only needs enough connectivity to be confident that it can get the longest Proof-of-Work chain. In other words, Nakamoto consensus only relies on being connected to at least one good node.</p><p>For Avalanche consensus, on the other hand, the node needs to be well connected to the network. This means that the node should have connections to nodes representing the vast majority of stake on the network. This is because the security model of Avalanche consensus involves randomly polling nodes from the entire set of valid nodes. It can be thought of as random sampling, with a different set of random nodes for each round of polling.</p><p>(It should be noted that the random sampling is weighted by the amount of staked coins associated with the node. A node with twice the stake will be “sampled” twice as often, on average, as a node with half that amount of stake.)</p><p>In the eCash Avalanche protocol, the set of stakers are represented by “Proofs”. These Proofs contain signatures from the staked coins that delegate authority to one or more nodes on the network, via a public key. This means that the set of valid Proofs represents the entities that are participating in the Avalanche protocol, and we call these “Avalanche Peers”. Note that Avalanche Peers can delegate their authority to several physical nodes. This can be done for technical reasons: to spread the load across nodes, and for redundancy.</p><p>Because of this, we can see that it is important for the nodes to be able to reliably obtain the full set of Avalanche Proofs.</p><h2>Compact Proof Requests</h2><p>Because having a complete set of Avalanche Peers is an important security parameter for Avalanche, a more robust method of obtaining Proofs from other nodes was needed. This is what the “Compact Proof Request” mechanism provides.</p><p>Prior to the implementation of Compact Proof Requests, the nodes shared Proofs using a method similar to transaction propagation. For anyone who has used 0-conf transactions, this tends to work well enough that all nodes typically receive any transaction that’s broadcast. But it’s not good enough for the network requirements of Avalanche, especially when considering the case of a bootstrapping node, which needs access to Proofs that may have been originally broadcast far earlier. The protocol needs a way to explicitly request other nodes for a list of all the Proofs they have, and then fetch those Proofs.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:748px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="748px"><div><img src="/images/62eb38492d05f10e94a3251c_avalanche-roadmap-item-compact-proof-requests.jpeg" alt="Compact Proof Requests" width="auto" height="auto" loading="auto"></div></figure><p>Essentially, the way the Compact Proof Requests work is they simply send the request to a node on the network, and this node replies with a list of “short IDs” of the Proofs they have at that time. The “short ID” part of the code is similar to the “Compact Blocks” code, and re-uses that implementation. This is a bandwidth-efficient way to transfer the information over the network.</p><p>Another detail of this protocol that you may notice, is that it uses RCU (Read Copy Update) pointers within a Radix Tree to keep track of the Proofs. When the responding node sends the list of short IDs, it also takes a snapshot of the Proofs at that time. RCU pointers make this snapshot more efficient by not actually making a copy until the original is updated (which it often won’t be). Taking a snapshot in this way will ensure that the responding node still has all the Proofs in the list if/when the requesting node asks for them. Since Proofs can be replaced, or be dropped by the node for other reasons, it keeps the protocol simpler if the node can always respond with the Proofs that are requested (rather than have other special cases, such as telling the requesting node it doesn’t have that Proof anymore for some reason).</p><p>In summary, the Compact Proofs Requests facility is a robust and efficient way for nodes to request Proofs from other nodes on the network.</p><p>The following is a partial list of the Diffs that implemented Compact Proof Requests:</p><ul><li><a href="https://reviews.bitcoinabc.org/D11405">Let the radix tree work with 256 bits keys</a></li><li><a href="https://reviews.bitcoinabc.org/D11450">Maintain a radix tree of the proofs</a></li><li><a href="https://reviews.bitcoinabc.org/D11453">Introduce a CompactProofs class for managing the short proof ids</a></li><li><a href="https://reviews.bitcoinabc.org/D11388">Answer getavaproofs message with short proof ids</a></li><li><a href="https://reviews.bitcoinabc.org/D11463">Use the ProofComparator for sets and maps</a></li><li><a href="https://reviews.bitcoinabc.org/D11466">Turn ProofRef into a RCUPtr</a></li><li><a href="https://reviews.bitcoinabc.org/D11520">Extract proof reception logic out of the avaproof message handling</a></li><li><a href="https://reviews.bitcoinabc.org/D11533">Extract the compact proofs functional test to its own file</a></li><li><a href="https://reviews.bitcoinabc.org/D11545">Request missing proofs from short ids</a></li><li><a href="https://reviews.bitcoinabc.org/D11549">Request compact proofs from our avalanche outbound peers</a></li><li><a href="https://reviews.bitcoinabc.org/D11575">Respond to missing proof indices request</a></li><li><a href="https://reviews.bitcoinabc.org/D11612">Cleanup unrequested radix tree after a timeout</a></li></ul><h2>Using Compact Proof Requests for Bootstrapping</h2><p>Once the Compact Proofs Requests facility was created, the most important place it is used is during the bootstrap phase. This is when a node isn’t yet running the Avalanche protocol, but needs to find the state of the network to be able to start polling. The bootstrap problem is not easy to solve. In the eCash Avalanche implementation, one of the things voted on using Avalanche polling is the Proofs themselves. It’s important for the network to maintain a stable quorum (set of participants), so it makes sense to use Avalanche to vote on Proofs in order to agree on a stable set. But the startup process presents us with a chicken-and-egg problem: We need a stable quorum to start using Avalanche, but we want to use Avalanche polling to maintain the quorum.</p><p>A simple idea would be to simply hard-code a list of nodes to connect to to obtain the initial state. In fact, as far as we understand, this is actually what AVAX does for its bootstrap. But because eCash also has a Proof-of-work blockchain in addition to Avalanche, we can leverage this to provide a good initial state for Avalanche. The node will first do the normal Initial Block Download (IBD), and sync to the heaviest PoW chain. Then it will use the Compact Proofs Requests to ask for Proofs from all the Avalanche-aware nodes it is connected to. Then, once it has reached a good threshold of stake amount and number of connections, it activates Avalanche.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:734px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="734px"><div><img src="/images/62eb3849e7bb481fbcd335e4_avalanche-roadmap-item-request-proofs.jpeg" alt="Request Proofs" width="auto" height="auto" loading="auto"></div></figure><p>What this all means is that the eCash Avalanche implementation is completely trustless and decentralized, with the following security characteristics:</p><ul><li>It follows the heaviest Proof-of-Work chain to get the initial state, and</li><li>Out of the several nodes it connects to, it must connect to at least one good node that will give it the correct set of Proofs.</li></ul><p>Note that these security assumptions are equivalent to those used in the current Nakamoto consensus.</p><h2>Testing and Iterative Improvements</h2><p>In addition to the Compact Proof Request capability, there were many other improvements to the Avalanche implementation in the last few months. These improvements were made by repeatedly testing the software, searching for problems, and then fixing them. In this way, iterative improvements are made, and we can test how the software works in a range of realistic scenarios, as well as unlikely “stress test” and attack scenarios. Live testing is very valuable, as it can reveal issues that are difficult to capture with unit tests, especially when it comes to the interaction of different parts of the system, or networking between different nodes. Over the last several weeks, these tests were typically conducted every two or three days, with rounds of improvements in between.</p><p>Some of the improvements made through this process are listed below. Note that the number of Diffs is too large to list here, only the more significant ones are highlighted. For a more complete picture, feel free to check out <a href="https://github.com/Bitcoin-ABC/bitcoin-abc/commits/master">commits on the Bitcoin ABC Github</a>.</p><ul><li>Handle dangling Proofs (When there is no node on the network associated with the Proof)</li><li><a href="https://reviews.bitcoinabc.org/D11659">Cleanup dangling proofs</a></li><li><a href="https://reviews.bitcoinabc.org/D11738">Don’t register known dangling proofs</a></li><li><a href="https://reviews.bitcoinabc.org/D11745">Don’t consider our local proof as dangling</a></li><li><a href="https://reviews.bitcoinabc.org/D11769">Request more avalanche peers if we have dangling proofs</a></li><li><a href="https://reviews.bitcoinabc.org/D11792">Request more node addresses upon receipt of a dangling proof</a></li><li>Bootstrapping improvements</li><li><a href="https://reviews.bitcoinabc.org/D11601">Use the number of nodes from which we’ve received avaproofs as a criterion for quorum readiness</a></li><li><a href="https://reviews.bitcoinabc.org/D11661">Don’t request compact proofs during IBD</a></li><li><a href="https://reviews.bitcoinabc.org/D11707">Request addresses and proofs from our inbounds while the quorum is not established</a></li><li><a href="https://reviews.bitcoinabc.org/D11816">Don’t download proofs during IBD</a></li><li>Add UTXO age requirement for Proofs</li><li><a href="https://reviews.bitcoinabc.org/D11622">Enforce min UTXO age in avalanche proofs</a></li><li><a href="https://reviews.bitcoinabc.org/D11669">Make the orphan pool only accept proofs that have valid but immature utxos</a></li><li>Seek network Peers and Nodes more aggressively</li><li><a href="https://reviews.bitcoinabc.org/D11666">Aggressively request compact proofs</a></li><li><a href="https://reviews.bitcoinabc.org/D11770">Request more peers for their avalanche nodes</a></li><li>Improvements to poll-only mode (for nodes that don’t have their own Proof)</li><li><a href="https://reviews.bitcoinabc.org/D11723">Send a avahello message when no proof is supplied</a></li><li>Other networking improvements</li><li><a href="https://reviews.bitcoinabc.org/D11766">Don’t consider our quorum valid if we don’t have enough nodes connected</a></li><li><a href="https://reviews.bitcoinabc.org/D11815">Don’t ban a peer sending a proof with an unknown utxo</a></li><li>Logging and debugging improvements.</li><li><a href="https://reviews.bitcoinabc.org/D11696">Add count of conflicting proofs to getavalancheinfo</a></li><li><a href="https://reviews.bitcoinabc.org/D11697">Add count of orphan proofs to getavalancheinfo</a></li><li><a href="https://reviews.bitcoinabc.org/D11721">Get rid of the compact proof cleanup log</a></li><li><a href="https://reviews.bitcoinabc.org/D11729">Add count of finalized proofs to getavalancheinfo</a></li><li><a href="https://reviews.bitcoinabc.org/D11756">Fix an log error during proof rejection</a></li><li><a href="https://reviews.bitcoinabc.org/D11757">Print the proofid in getavalancheoeerinfo</a></li><li><a href="https://reviews.bitcoinabc.org/D11758">Improve RPC fields names and description in getavalanchepeerinfo</a></li><li><a href="https://reviews.bitcoinabc.org/D11782">Add the dangling proofs count to the getavalancheinfo RPC</a></li><li>Various bug fixes, parameter tweaks, and improvements to automated testing.</li><li>Diffs are too numerous to list here. See <a href="https://github.com/Bitcoin-ABC/bitcoin-abc/commits/master">commits on the Bitcoin ABC Github</a>.</li></ul><h2>About Avalanche</h2><p>Using a fast consensus protocol to do Pre-Consensus has been a long-standing item on the <a href="https://e.cash/roadmap-explained">eCash Roadmap</a> (and previously on the Bitcoin Cash roadmap). This is one of the improvements needed to power eCash to be a competitor and alternative to Central Bank Digital Currencies (CBDCs). When the <a href="https://ipfs.io/ipfs/QmUy4jh5mGNZvLkjies1RWM4YuvJh5o2FYopNPVYwrRVGV">Avalanche whitepaper</a> appeared in 2018, eCash founder Amaury Séchet, and the Bitcoin ABC team, recognized that this new protocol was what they had been searching for, as it fulfilled the needed requirements.</p><p>It should be noted that eCash’s Avalanche implementation is completely separate and distinct from the AVAX Avalanche project. They have no connection, other than both using the protocol described in the Avalanche whitepaper. In the case of eCash, Avalanche consensus is used for fast and live consensus needs, such as fast transaction finality. Proof-of-work based Nakamoto consensus is retained where it is superior, providing objective consensus criterion to enable decentralized node bootstrapping.</p><p>Adding the Avalanche protocol has been long and technically challenging work. It is an entirely new consensus protocol which had to be implemented from scratch by the Bitcoin ABC team. While there are still many steps remaining to realize the full benefits of the Avalanche protocol, the upcoming launch of Post-Consensus on the eCash mainnet is a significant achievement, and a solid foundation for further enhancements to build upon.</p><p>For more info and to monitor development progress, see <a href="https://www.avalanche.cash/">Avalanche.cash</a>.</p><p>‍</p>',
            short_content:
                'This article is to bring people up to date on what’s been achieved, and what’s been happening in our development activities on Avalanche...',
            type: 'Blog',
            media_link:
                'https://www.bitcoinabc.org/2022-08-03-avalanche-development-update/',
            publish_date:
                'Wed Aug 03 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-avalanche-development-update-2',
            createdAt: '2023-06-20T22:49:57.692Z',
            updatedAt: '2023-06-21T21:35:49.235Z',
            publishedAt: '2023-06-20T22:49:57.685Z',
            legacy_image:
                '/images/62eb37f5137e8f3c376696ed_avalanche-dev-update1.jpeg',
            legacy_media_logo:
                '/images/6270a4a659ed82066113f0dd_bitcoin-abc256%20white.png',
            image: {
                data: {
                    id: 54,
                    attributes: {
                        name: '62eb37f5137e8f3c376696ed_avalanche-dev-update1.jpeg',
                        alternativeText: null,
                        caption: null,
                        width: 1280,
                        height: 679,
                        formats: {
                            large: {
                                ext: '.jpeg',
                                url: '/uploads/large_62eb37f5137e8f3c376696ed_avalanche_dev_update1_a622eaaf45.jpeg',
                                hash: 'large_62eb37f5137e8f3c376696ed_avalanche_dev_update1_a622eaaf45',
                                mime: 'image/jpeg',
                                name: 'large_62eb37f5137e8f3c376696ed_avalanche-dev-update1.jpeg',
                                path: null,
                                size: 71.37,
                                width: 1000,
                                height: 530,
                            },
                            small: {
                                ext: '.jpeg',
                                url: '/uploads/small_62eb37f5137e8f3c376696ed_avalanche_dev_update1_a622eaaf45.jpeg',
                                hash: 'small_62eb37f5137e8f3c376696ed_avalanche_dev_update1_a622eaaf45',
                                mime: 'image/jpeg',
                                name: 'small_62eb37f5137e8f3c376696ed_avalanche-dev-update1.jpeg',
                                path: null,
                                size: 23.44,
                                width: 500,
                                height: 265,
                            },
                            medium: {
                                ext: '.jpeg',
                                url: '/uploads/medium_62eb37f5137e8f3c376696ed_avalanche_dev_update1_a622eaaf45.jpeg',
                                hash: 'medium_62eb37f5137e8f3c376696ed_avalanche_dev_update1_a622eaaf45',
                                mime: 'image/jpeg',
                                name: 'medium_62eb37f5137e8f3c376696ed_avalanche-dev-update1.jpeg',
                                path: null,
                                size: 44.88,
                                width: 750,
                                height: 398,
                            },
                            thumbnail: {
                                ext: '.jpeg',
                                url: '/uploads/thumbnail_62eb37f5137e8f3c376696ed_avalanche_dev_update1_a622eaaf45.jpeg',
                                hash: 'thumbnail_62eb37f5137e8f3c376696ed_avalanche_dev_update1_a622eaaf45',
                                mime: 'image/jpeg',
                                name: 'thumbnail_62eb37f5137e8f3c376696ed_avalanche-dev-update1.jpeg',
                                path: null,
                                size: 6.99,
                                width: 245,
                                height: 129,
                            },
                        },
                        hash: '62eb37f5137e8f3c376696ed_avalanche_dev_update1_a622eaaf45',
                        ext: '.jpeg',
                        mime: 'image/jpeg',
                        size: 102.07,
                        url: '/uploads/62eb37f5137e8f3c376696ed_avalanche_dev_update1_a622eaaf45.jpeg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:00:02.134Z',
                        updatedAt: '2023-06-21T20:00:02.134Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 57,
        attributes: {
            title: 'SCAM ALERT: Fake Ｗallets',
            content:
                '<h3>SCAM ALERT!</h3><p>⚠️ Be vigilant the following three websites are fake &amp; if you use them ALL of your eCash (XEC)/BCHA will be gone, please don\'t try to access these scam websites:</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1034px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1034px"><div><img alt="r/ecash -  SCAM ALERT: mybchawallet.org and ecashtab.org" src="/images/62618d49b998434122929e1a_ev25l7y3vwu81.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>#1 Review: Scam &amp; Fake website --&gt; mybchawallet . org</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1027px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1027px"><div><img alt="r/ecash -  SCAM ALERT: mybchawallet.org and ecashtab.org" src="/images/62618d49a045533d3b022f57_bi792ov4vwu81.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>#2 Review: Scam &amp; Fake website --&gt; ecashtab . org</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1280px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1280px"><div><img src="/images/62e23b6f3f4c036dd83db49d_2022-07-28%2000.31.34.jpg" loading="lazy" width="auto" height="auto"></div></figure><p>#3 Review: Scam &amp; Fake website --&gt; xecwallet . org<br></p><p><br></p><p>⚠️ <strong>LIST OF FAKE WALLET SITES (DON\'T USE THESE):</strong></p><p> mybchawallet . org <strong>(FAKE)</strong></p><p> ecashtab . org <strong>(FAKE)</strong></p><p> xecwallet . org <strong>(FAKE)</strong></p><p>Please DO NOT interact with them. We are working to get these websites taken down ASAP, always make sure to only use legit wallets.</p><p>‍</p><p>‍</p><h3><strong>Official eCash (XEC) / BCHA wallets:</strong></h3><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1018px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1018px"><div><img alt="r/ecash -  SCAM ALERT: mybchawallet.org and ecashtab.org" src="/images/62618d498aa15b6f3fffdf65_1qnqrtqnvwu81.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>https://www.bitcoinabc.org/electrum/ (OFFICIAL)</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1020px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1020px"><div><img alt="r/ecash -  SCAM ALERT: mybchawallet.org and ecashtab.org" src="/images/62618d496ec9d43c3d0d2483_ilesde2nvwu81.jpeg" width="auto" height="auto" loading="auto"></div></figure><p>https://cashtab.com (OFFICIAL)</p><p> <a href="https://www.bitcoinabc.org/electrum/" target="_blank">https://www.bitcoinabc.org/electrum/</a> <strong>(OFFICIAL)</strong></p><p> <a href="https://cashtab.com/" target="_blank">Cashtab.com</a> <strong>(OFFICIAL)</strong></p><p><strong>Other supported wallets:</strong></p><p> <a href="https://e.cash/wallets" target="_blank">https://e.cash/wallets</a> <strong>(LEGIT)</strong></p><p>‍</p><p><strong>Write down your 12-word secret recovery phrase &amp; stay safe!</strong></p>',
            short_content:
                'Be vigilant guys the following two websites are fake & if you use them ALL of your eCash (XEC)/BCHA will be gone',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Thu Jul 28 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'scam-alert-fake-wallets',
            createdAt: '2023-06-20T22:49:45.654Z',
            updatedAt: '2023-06-21T21:43:03.817Z',
            publishedAt: '2023-06-20T22:49:45.646Z',
            legacy_image:
                '/images/62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse-computer-hacking-shoot.jpg',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 53,
                    attributes: {
                        name: '62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse-computer-hacking-shoot.jpg',
                        alternativeText: null,
                        caption: null,
                        width: 800,
                        height: 534,
                        formats: {
                            small: {
                                ext: '.jpg',
                                url: '/uploads/small_62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse_computer_hacking_shoot_e93ca127ad.jpg',
                                hash: 'small_62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse_computer_hacking_shoot_e93ca127ad',
                                mime: 'image/jpeg',
                                name: 'small_62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse-computer-hacking-shoot.jpg',
                                path: null,
                                size: 22.33,
                                width: 500,
                                height: 334,
                            },
                            medium: {
                                ext: '.jpg',
                                url: '/uploads/medium_62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse_computer_hacking_shoot_e93ca127ad.jpg',
                                hash: 'medium_62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse_computer_hacking_shoot_e93ca127ad',
                                mime: 'image/jpeg',
                                name: 'medium_62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse-computer-hacking-shoot.jpg',
                                path: null,
                                size: 40.2,
                                width: 750,
                                height: 501,
                            },
                            thumbnail: {
                                ext: '.jpg',
                                url: '/uploads/thumbnail_62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse_computer_hacking_shoot_e93ca127ad.jpg',
                                hash: 'thumbnail_62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse_computer_hacking_shoot_e93ca127ad',
                                mime: 'image/jpeg',
                                name: 'thumbnail_62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse-computer-hacking-shoot.jpg',
                                path: null,
                                size: 7.04,
                                width: 234,
                                height: 156,
                            },
                        },
                        hash: '62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse_computer_hacking_shoot_e93ca127ad',
                        ext: '.jpg',
                        mime: 'image/jpeg',
                        size: 25.83,
                        url: '/uploads/62914c981512a36c505bbbc5_62618d23f74dbe2aaab5dc1d_diverse_computer_hacking_shoot_e93ca127ad.jpg',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:00:01.236Z',
                        updatedAt: '2023-06-21T20:00:01.236Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 56,
        attributes: {
            title: 'ईकैश दिवस समारोह के लिए ट्विटर स्पेस और प्रश्न उत्तरी',
            content:
                '<p>1 जुलाई को, हमने eCash दिवस समारोह के लिए Twitter Space और AMA (प्रश्नोत्तर वार्ता) &nbsp;की मेजबानी की। नीचे अधिक विवरण में प्रश्नोत्तर सत्र का संक्षिप्त विवरण दिया गया है।</p><p> </p><p>‍</p><p><strong>1- मुझे पता है कि आप उन समस्याओं को हल कर रहे &nbsp; &nbsp; &nbsp; हैं जिन्हें पहले कभी हल नहीं किया जा सका। आपका काम आसान नहीं है। क्या एवलांच प्रस्तुतीकरण के लिए तैयार है? ताजा स्थिति क्या है? यही वह सवाल है जिसके बारे में हर कोई जानने के लिए सबसे ज्यादा उत्सुक है।</strong></p><p> &nbsp; &nbsp; &nbsp; &nbsp; </p><ul><li>एवलांच &nbsp;प्रस्तुतीकरण के करीब है। बड़ी सावधानी से, हम इस तकनीक को &nbsp;मैननेट पर लाने से पहले अतिरिक्त परीक्षण पूरा होने की प्रतीक्षा कर रहे हैं। लॉन्च के बाद भी विकास जारी रहेगा। लागू करने के लिए अभी और भी कई सुविधाएँ हैं, जिनकी समीक्षा avalanche.cash &nbsp;पर की जा सकती है।</li></ul><p>‍</p><p><strong> </strong></p><p><strong>2- ईकैश के लिए उपलब्ध फंडिंग के बारे में आप हमें क्या बता सकते हैं? जीएनसी (GNC)किस स्तर पर है?</strong></p><p> &nbsp; &nbsp; &nbsp;</p><ul><li>हमें अच्छी संख्या में उच्च गुणवत्ता वाले प्रस्ताव प्राप्त हुए हैं। कई को स्वीकार किया गया है। अभी जीएनसी खर्च राजस्व के अनुरूप है। लेकिन जीएनसी के पास पिछले कुछ वर्षों से संचित अच्छा भंडार है जो अतिरिक्त प्रस्तावों के लिए पर्याप्त समर्थन को आकर्षित करने के लिए भी उपलब्ध हैं।</li></ul><p>‍</p><ul><li>एक संस्था के रूप में GNC अभी भी बहुत नई है। कार्यविधिओं में पर्याप्त सुधार किए गए हैं, और अधिक की योजना बनाई गई है। जीएनसी अपनी संरचना में बहुत ही अद्वितीय है और इसे तरल रूप से काम करने की एक पुनरावृत्त प्रक्रिया है। हम जीएनसी के कार्यों पर काम करते रहेंगे। अंतिम लक्ष्य सबसे कुशल तरीके से ईकैश में मूल्य जोड़ना है।</li></ul><p>‍</p><p><strong>3- क्या आप साप्ताहिक संवादपत्र प्रकाशित करने की योजना बना रहे हैं?</strong></p><p>‍</p><ul><li> हमने अपनी नियमित सूचना सामग्री के अलावा ट्विटर पर नियमित मासिक अपडेट जारी करना शुरू कर दिया है, जिसे अब एक पूर्णकालिक सोशल मीडिया मैनेजर द्वारा प्रबंधित किया जाता है। यदि समुदाय से पर्याप्त रुचि है, तो हम एक ईमेल न्यूज़लेटर भी जारी कर सकते हैं। हमारे सोशल मीडिया जैसे कि ट्विटर और टेलीग्राम समूह अप टू डेट रहने का सबसे अच्छा तरीका है (आप उन सभी को ecash.community पर पा सकते हैं)। हमारे पास पाइपलाइन में कुछ ब्लॉग पोस्ट भी हैं जो जल्द ही सामने आएंगे। हमारा सामुदायिक सदस्य "ईकैश इन्फोर्मर" &nbsp;एक अनौपचारिक न्यूज़लेटर बनाने की योजना बना रहा है, पर्याप्त सब्सक्राइबर &nbsp;होते ही।</li></ul><p>‍</p><p><strong>4- क्या XEC को नए विनिमय पर लिस्ट किया जाएगा? क्या आपके पास इस तरह के मुद्दों पर कोई काम है? ‍</strong></p><p>‍</p><ul><li>ईकैश टीम नियमित व्यापार संचालन के हिस्से के रूप में नए विनिमयो और भागीदारों तक लगातार पहुंच रही है, पाइपलाइन में नई एक्सचेंज लिस्टिंग के साथ। समुदाय और उपयोगकर्ता हमारे अवसरों को बेहतर बनाने के लिए अपने पसंदीदा विनिमय पर ईकैश की सूचीकरण का अनुरोध करने के लिए क्या कर सकते हैं। यदि हम पर्याप्त मांग का संकेत देते हैं, तो विनिमय ईकैश की सूचीकरण को प्राथमिकता देने के लिए इच्छुक महसूस कर सकते हैं।</li></ul><p>‍</p><p><strong>5- BCHA को जुलाई 2021 में eCash XEC के रूप में पुनः नामकरण किया गया। BCHA अभी भी है। मुझे लगता है कि BCHA गंभीर रूप से खून खो रहा है। क्या आपको BCH से &nbsp;शामिल होने का प्रस्ताव मिला है? ‍</strong></p><p>‍</p><ul><li>BCHA और eCash पूरी तरह से अलग परियोजनाएं हैं और उन्हें एक साथ जोड़ने का कोई मौका या तकनीकी तरीका नहीं है &nbsp;</li></ul><p>‍</p><ul><li>कोई भी डेवलपर जो पहले BCHA पर काम कर रहा था, उसका ईकैश पर अपना काम जारी रखने के लिए स्वागत है। चूंकि मूल तकनीक समरूप है, हम BCHA परियोजनाओं का भी स्वागत करते हैं जो ईकैश पर लॉन्च करने के इच्छुक हैं। विशेष रूप से जब ईटोकन परियोजनाओं की बात आती है (इसे सरल &nbsp;प्रपंजी( Ledger) प्रोटोकॉल के रूप में भी जाना जाता है)। ईकैश ईटोकन इन्फ्रास्ट्रक्चर का समर्थन करना जारी रखेगा और पहले से मौजूद कई डेवलपर टूल को सुधारने के लिए एक व्यापक डेवलपर टूलकिट का निर्माण कर रहा है, जिनमें से कई पहले से ही बिटकॉइन डेवलपर्स से परिचित हैं।</li></ul><p>‍</p><p><strong>6- हम एक परिवार बन गए। मैं bitcoinabc.org पर eCash टीम का अनुसरण करता हूं। क्या आपके पास ग्रुप फोटो नहीं है? मैं अन्य डेवलपर टीम के बारे में उत्सुक हूं। मैं आपके कार्यस्थल, आपके कार्य वातावरण को लेकर उत्सुक हूं। ‍</strong></p><p>‍</p><ul><li>हम दुनिया के अलग-अलग हिस्सों में दूर से काम करते हैं, इसलिए हमारे पास अभी तक एक ही समय में एक ही जगह पर टीम का हर सदस्य नहीं है। टीम के कुछ सदस्य गुमनाम होते हैं, हालांकि उनके काम और कोड द्वारा उनका अनुसरण किया जा सकता है। गैर-अनाम सदस्य लिंक्डइन पर हैं।</li></ul><p>‍</p><p><strong>7- क्या ऐसी कोई विशेषताएं हैं जो ईकैश नेटवर्क को बिटकॉइन नेटवर्क से बेहतर बनाती हैं? यदि हां, तो ये विशेषताएं क्या हैं? ‍</strong></p><p>‍</p><ul><li>हमारे पास स्केलेबिलिटी और उपयोगिता पर केंद्रित एक स्पष्ट और प्राप्त करने योग्य रोडमैप है, जिसे हम इन दिनों कई परियोजनाओं के माध्यम से काम कर रहे हैं, रोडमैप को आजकल कई परियोजनाएं किसी प्रकार की मार्केटिंग नौटंकी के रूप में देखते हैं। eCash एक मिशन-संचालित परियोजना है जिसने प्रमुख मील के पत्थर हासिल किए हैं और भविष्य में और अधिक काम करना जारी रखेंगे।</li></ul><p>‍</p><ul><li>eCash प्रोटोकॉल राजस्व एक मंदा बाजार के माहौल में भी राजनीतिक रूप से स्वतंत्र और निरंतर विकास की अनुमति देता है। बिटकॉइन और अन्य परियोजनाओं पर विकास की दिशा अतीत में बड़े दाताओं से प्रभावित हुई है, जिनके हित धारकों के हितों के साथ संरेखित नहीं होते हैं।</li></ul><p>‍</p><ul><li> इन दिनों, अधिकांश क्रिप्टो विश्लेषक बीटीसी को "मूल्य का भंडार" मानते हैं। ईकैश विश्व धन का निर्माण कर रहा है। इसलिए, इसे मूल्य का भंडार होना चाहिए, और विनिमय का एक व्यावहारिक माध्यम भी होना चाहिए"। बीटीसी की तुलना में, यह अधिक विकास कार्य लेता है।</li></ul><p>‍</p><p> &nbsp; &nbsp;ईकैश कैशफ्यूज़न के साथ ऑप्ट-इन गोपनीयता का समर्थन करता है, जो अपेक्षाकृत उच्च लेनदेन शुल्क के कारण बीटीसी पर व्यवहार्य नहीं है।</p><p>‍</p><ul><li>एवलांच के जुड़ने से कई बेहतरीन विशेषताएं जुड़ती हैं जैसे कि तत्काल अंतिमता, उप-श्रृंखला की क्षमता और आसान उन्नयन। यह सुविधा eCash को BTC की प्रमुख सुरक्षा स्थिति के साथ प्रतिस्पर्धा करने की भी अनुमति देगी।</li></ul><p>‍</p><p><strong>8- LUNA UST मुद्दे &nbsp;ने बाजार के भरोसे को ठेस पहुंचाई। बाजार खूनखराबे में तब्दील हो गए हैं। पूरी दुनिया में &nbsp;लोगों को गंभीर नुकसान का सामना करना पड़ा। भविष्य में ऐसे हमलावरों के खिलाफ ईकैश टीम क्या सावधानियां बरतेंगी?</strong></p><p>‍</p><p> 1. eCash बिटकॉइन का एक फोर्क &nbsp;है, जिसका अर्थ है</p><p>‍</p><p> &nbsp;2.यह एक मजबूत तकनीकी नींव पर बनाया गया है जो पहले से ही 12 साल तक चली है, और</p><p>‍</p><ul><li>इसलिए, eCash उस पोंजी योजना की समस्याओं के अधीन नहीं है जिसने क्रिप्टोस्पेस में लूना और अन्य नई परियोजनाओं को त्रस्त कर दिया था। इन सिक्कों पर बहुत ध्यान दिया जाता है क्योंकि ऐसा लगता है कि बहुत सारा "मुफ्त" पैसा दिया जा रहा है। लेकिन आमतौर पर ऐसी परियोजनाओं की आपूर्ति पर संस्थापकों द्वारा अत्यधिक नियंत्रण किया जाता है, जिसके अनुमानित रूप से खराब परिणाम होते हैं।</li></ul><p>‍</p><p><strong>9. आप भविष्य की दुनिया में eCash XEC को कहां देखते हैं? ईकैश भविष्य में किस प्रकार की सुविधाएं प्रदान करेगा? 3 से 10 साल में आप खुद को कहां देखते हैं? ‍</strong></p><p>‍</p><ul><li> eCash दुनिया के लिए अभिवेचन प्रतिरोधी धन का निर्माण कर रहा है। वहां पहुंचने के लिए, हमें प्रमुख विश्व मुद्राओं जैसे यूएसडी, और सोने जैसी लोकप्रिय वैश्विक वस्तुओं के साथ प्रतिस्पर्धी होने की आवश्यकता है। इन दोनों मदों में ज्ञात समस्याएं हैं जिन्हें हम हल करने का प्रयास कर रहे हैं।</li></ul><p> &nbsp; &nbsp;</p><p> &nbsp; USD और अन्य व्यवस्थापत्र मुद्राओं के मामले में, ज्यादातर लोग अपनी बचत को बढ़ाने के लिए केंद्रीय बैंक पर भरोसा &nbsp;करते हैं, साथ ही साथ उनके पड़ोस के बैंक उनके पैसे से &nbsp;जुआ नहीं खेलने के लिए भरोसा करते हैं।</p><p>‍</p><p> सोने के मामले में, यह बढ़ते जटिल कानूनी प्रतिबंधों के अधीन है।</p><p>‍</p><p> &nbsp;ईकैश का उद्देश्य उन सुविधाओं को संरक्षित करना है जो लोगों को धन और सोने के बारे में पसंद हैं - धन, पोर्टेबिलिटी, सुरक्षा, गोपनीयता - राज्यों और विफल बैंकों द्वारा इन प्राचीन तकनीकों पर लगाए गए बढ़ते प्रतिबंधों का मुकाबला करते हुए।</p><p>‍</p><p> &nbsp; &nbsp;ऐसा होने के लिए हमें विश्व स्तर के बुनियादी ढांचे का निर्माण करने की आवश्यकता है और ईकैश का उपयोग करके एक उद्यमी विकासकर्ता संस्कृति निर्माण उत्पादों और सेवाओं की आवश्यकता है। हम इसे बनाने के लिए काम कर रहे हैं उसी समय हम नोड सॉफ्टवेयर बनाने के लिए काम कर रहे हैं</p><p>‍</p><p><strong>10- विनिमयो &nbsp;के पास कितना ईकैश है या उन्हें कितना प्रतिशत दिया गया है? क्या ईकैश भविष्य में विकेंद्रीकृत एक्सचेंज स्थापित करने पर विचार कर रहा है? वे केंद्रीकृत आदान-प्रदान और व्हेल के हेरफेर से कैसे लड़ेंगे?</strong></p><p> &nbsp; &nbsp;</p><p>‍</p><ul><li> ईकैश का पहले से मौजूद वितरण है और आपूर्ति का खनन किया जाता है और किसी व्यक्ति या टीम द्वारा नियंत्रित नहीं किया जाता है। इसलिए विनिमयो &nbsp;के पास केवल वही है जो उन्होंने उपयोगकर्ताओ के जमा और व्यापारो &nbsp;के माध्यम से वर्षों में अर्जित किया है। यह अन्य नई क्रिप्टोकरेंसी की तुलना में ईकैश के लिए एक महत्वपूर्ण अंतर है - ईकैश आपूर्ति टीम द्वारा नियंत्रित नहीं होती है। ईकैश को सूचीबद्ध करने वाले एक्सचेंजों को कोई लिस्टिंग शुल्क या आपूर्ति के किसी भी हिस्से की पेशकश नहीं की गई थी।</li></ul><p>‍</p><p><strong>11- मुझे आर्मरी &nbsp;का काम मानवता के लिए बहुत मूल्यवान लगता है, लेकिन अगर वह ईकैश छोड़ देता है तो ईकैश का क्या होगा। कई परियोजनाओं में, संस्थापक के चले जाने पर परियोजना ढह गई और उसके साथ कुछ बुरा हुआ। क्या ईकैश उसके बिना आगे बढ़ पाएगा?</strong></p><p>‍</p><ul><li>स्टार्टअप कंपनियां इसे "प्रमुख व्यक्ति जोखिम" कहती हैं। हालाँकि, eCash एक कंपनी नहीं है, यह एक ओपन सोर्स प्रोटोकॉल है। अमौरी ईकैश के लिए एक जबरदस्त तकनीकी नेता और संपत्ति है। एक सफल क्रिप्टोक्यूरेंसी को अच्छे नेतृत्व और राजनीतिक स्वतंत्रता दोनों की आवश्यकता होती है। यदि यह एक व्यक्ति की भागीदारी के बिना सफल नहीं हो सकता है, तो यह पहले से ही एक असफल परियोजना है।</li></ul><p>‍</p><p> &nbsp;आप सातोशी नाकामोतो के जाने के बाद बिटकॉइन की सफलता को देख सकते हैं। ईकैश जैसे विकेन्द्रीकृत प्रोटोकॉल की बात यह है कि यह इसके संस्थापक के बिना भी आगे बढ़ सकता है।</p><p>‍</p><p><strong>12- सच कहूं, तो मुझे लगता है कि बिटकॉइन एक घोटाला परियोजना है, हालांकि शुरुआत में यह एक महत्वपूर्ण तकनीक थी। मुझे लगता है कि लगातार हेरफेर के साथ एक्सचेंज गैर-मौजूद बीटीसी बेच रहे हैं। शेयर बाजार में हेरफेर है, लेकिन इतना नहीं। मेरा दिल बीटीसी रीसेट के पक्ष में है। यहां तक ​​​​कि अगर हम एक सुंदर क्रिप्टो दुनिया में रीसेट और रीसेट करते हैं, तो मुझे लगता है कि altcoin राहत की सांस लेगा और वह मूल्य प्राप्त करेगा जिसके वे हकदार हैं। मैं इस पर बिटकॉइन एबीसी टीम की राय के बारे में उत्सुक हूं। क्या क्रिप्टो दुनिया को रीसेट की आवश्यकता है? यदि बीटीसी रीसेट हो जाता है, तो ईकैश, एक बीटीसी फोर्क, कैसे प्रभावित होगा?</strong></p><p>‍</p><ul><li>हम इस बात से सहमत हैं कि बीटीसी एक वैश्विक इलेक्ट्रॉनिक कैश सिस्टम के निर्माण के लक्ष्य से भटक गया है और वास्तव में बिटकॉइन एबीसी परियोजना का जन्म हुआ है, जिससे हम आज ईकैश की ओर अग्रसर हैं। फिर भी, बीटीसी पर हुआ अनुभवजन्य \'वास्तविक दुनिया\' परीक्षण ईकैश जैसी भविष्य की परियोजनाओं के लिए अमूल्य है। काम का सबूत खनन आज सिक्का वितरण के लिए एक परीक्षण किया गया उचित तरीका है, लूना जैसी अन्य योजनाओं के विपरीत, जिसके कारण धन का विनाश हुआ है। क्रिप्टोक्यूरेंसी की सबसे बड़ी विशेषताओं में से एक यह है कि लेनदेन को पूर्ववत नहीं किया जा सकता है। पैसे के साथ राजनीतिक हस्तक्षेप पैदा करने के लिए बैंक और राज्य के अभिनेता आज लेन-देन को उलट रहे हैं - इस प्रभाव से बचने के लिए ईकैश का लक्ष्य है।</li></ul><p>‍</p><p><strong>13- आपका सबसे अच्छा अनुमान क्या है जब eCash 5 मिलियन txs/sec के लक्ष्य तक पहुंच जाएगा? क्या कोई तकनीकी समाधान है, कोई रोडमैप है? या आप एक परीक्षण और त्रुटि विधि के साथ समाप्त करेंगे?</strong></p><p>‍</p><ul><li>हमारे पास एक तकनीकी रोडमैप है जो एक ऐसी प्रणाली तैयार करेगा जो उपयोग के उन स्तरों को संभालने में सक्षम हो। यह महत्वपूर्ण है कि हम प्रमुख तकनीकी परिवर्तनों को ब्लॉकस्पेस की मांग और उपलब्ध संसाधनों के अनुरूप विवेकपूर्ण ढंग से गति दें</li></ul><p>‍</p><p> &nbsp; तो, यह परीक्षण और त्रुटि नहीं है। यह लगातार पुनरावृति कर रहा है और यह सुनिश्चित कर रहा है कि स्केलिंग मांगों के लिए तकनीक हमेशा आराम से आगे है। हमें लगता है कि बीटीसी ने लेनदेन की मांग को अपने समर्थित सॉफ्टवेयर पैमाने से आगे बढ़ने की अनुमति देकर एक बड़ी गलती की है।</p><p>‍</p><p> हालांकि यह सिर्फ एक डेवलपर समस्या नहीं है। अभी के लिए, प्रौद्योगिकी वाणिज्य में क्रिप्टो लेनदेन की वास्तविक दुनिया की मांग से बहुत आगे है। उद्यमी, व्यवसाय और उपयोगकर्ता जो व्यापारियों से अधिक हैं, सभी विश्व स्तर तक पहुंचने में महत्वपूर्ण भूमिका निभाएंगे।</p><p>‍</p><p><strong>14- क्या आप कोड लिखने के मामले में जुलाई 2021 से अब तक के चरण तक पहुँचने में सहज महसूस करते हैं? क्या तकनीक उन्नत हो गई है?</strong></p><p>‍</p><ul><li>सॉफ्टवेयर हमेशा बेहतर हो सकता है। सॉफ्टवेयर भी पृथक्रकरण में मौजूद नहीं है - यह कंप्यूटर पर चलता है, जो हमेशा सुधार और बदलते रहते हैं। इसलिए हमेशा सुधार करना होगा।</li></ul><p>‍</p><p>हमने काफी प्रगति की है, लेकिन साथ ही अभी भी बहुत काम करना बाकी है और हमेशा रहेगा। हम चीजों को तेजी से लागू करना पसंद करेंगे। हालाँकि, क्रिप्टो विकास स्नैपचैट जैसा कुछ नहीं है। अगर हम कुछ जल्दी करते हैं और एक महत्वपूर्ण दोष जारी करते हैं, तो परिणाम किसी के द्वारा अपने फेसबुक प्रोफाइल पर तस्वीर न देखने या गलत डेटा देखने से भी बदतर होंगे। इसलिए, प्रतिकूल वातावरण का परीक्षण और अनुकरण हमारी विकास प्रक्रिया का एक महत्वपूर्ण हिस्सा है।</p><p>‍</p><p> हम टीम का विस्तार करने की भी तलाश कर रहे हैं क्योंकि संसाधन हमें बुनियादी ढांचे के स्तर पर आवश्यक प्रौद्योगिकी उन्नति में अधिक डेवलपर्स का योगदान करने की अनुमति देते हैं।</p><p>‍</p><p><strong>15- आपको क्या उम्मीद है कि ईकैश (और सामान्य रूप से क्रिप्टो) अंततः हासिल करेगा? </strong>‍</p><p>‍</p><ul><li>क्रिप्टो विकास व्यक्तिगत स्वतंत्रता की रक्षा के लिए एक तकनीकी हथियारों की दौड़ है। eCash वित्तीय स्वतंत्रता की तकनीक है।</li></ul><p>‍</p><p> आज, अधिकांश लोगों के पास अपने द्वारा उपयोग किए जाने वाले पैसे के लिए सीमित विकल्प हैं। वे स्थानीय राजनीतिक निर्णयों के प्रति संवेदनशील होते हैं जो उनकी बचत को बढ़ा-चढ़ाकर पेश करते हैं या यहां तक ​​कि उनके फंड को फ्रीज कर देते हैं।</p><p>‍</p><p>ईकैश एक ओपन सोर्स तकनीक है जिसे इन प्रभावों से निपटने के लिए डिज़ाइन किया गया है।</p><p>‍</p><ul><li>ईकैश इस लक्ष्य को प्राप्त करने के विभिन्न तरीके हैं, चाहे इसका उपयोग विश्व धन के रूप में हर जगह स्वीकार किया जाता है या "लाइफबोट" परिदृश्य के रूप में किया जाता है, जहां दुनिया भर के लोग इसे वैकल्पिक अर्थव्यवस्था में फॉलबैक या आपातकालीन तंत्र के रूप में उपयोग कर सकते हैं।</li></ul><p>‍</p><p><strong>16- दुनिया में केंद्रीय धन और बैंकों में विश्वास कम हो रहा है। यह वही है जो लोगों को क्रिप्टो की ओर आकर्षित करता है। क्या आपको लगता है कि बिटकॉइन और भी बढ़ेगा? जैसा कि हाल फिन ने 2009 में कहा था, बिटकॉइन 10 मिलियन डॉलर तक पहुंच जाएगा। क्या आप इस बात से सहमत हैं कि सफल और सुरक्षित बनने के लिए बिटकॉइन को बहुत महंगा होना पड़ता है?</strong></p><p>‍</p><ul><li>बिटकॉइन शायद बढ़ना जारी रखेगा, हालांकि इसकी शुरुआती वृद्धि की तुलना में बहुत धीमी गति से जब यह शहर में एकमात्र गेम था। बिटकॉइन बाजार पर सबसे सम्मोहक तकनीक नहीं है, लेकिन, जैसा कि आप कहते हैं, इसके प्रतियोगी जैसे केंद्रीय बैंक और भी खराब हो रहे हैं।</li></ul><p>‍</p><p> &nbsp;यदि बिटकॉइन उपयोगकर्ता की मांग से मेल खाने के लिए बढ़ाया गया था, तो बिटकॉइन बहुत महंगा होने से वास्तव में इसे और अधिक सफल और अधिक सुरक्षित बना दिया होगा। दुर्भाग्य से, इसका विपरीत प्रभाव पड़ा है। अधिकांश बिटकॉइन बड़े व्हेल के पास होते हैं जो इसके साथ लेन-देन नहीं करते हैं, और छोटे लेनदेन - जो अधिकांश लोगों के लिए दिन-प्रतिदिन की आर्थिक गतिविधियों का भारी बहुमत बनाते हैं - बिटकॉइन पर व्यावहारिक नहीं हैं।</p><p>‍</p><p>एवलांच जैसी क्रिप्टो तकनीक में प्रगति छोटी परियोजनाओं के लिए बिटकॉइन-स्तरीय सुरक्षा की अनुमति देती है। ईकैश के लिए, कीमत और लोकप्रियता में वृद्धि का बिटकॉइन पर हानिकारक प्रभाव नहीं पड़ेगा।</p><p>‍</p><p>1<strong>8- क्या अब हम मंदी के मौसम में हैं, आपको क्या लगता है कि यह कब तक चलेगा?</strong></p><p>‍</p><ul><li>eCash टीम कुछ मन्द बाजारों से गुजरी है। ऐसा लगता है कि हम दूसरे में हैं। आमतौर पर, चीजें अगले पड़ाव तक बग़ल में व्यापार करती हैं। eCash में बिटकॉइन की तरह ही हॉल्टिंग शेड्यूल है। हम इस समय का उपयोग अगली पीढ़ी की क्रिप्टो तकनीक का निर्माण जारी रखने के लिए कर रहे हैं ताकि अगले अप चक्र से पहले उत्पादन तैयार हो सके।</li></ul><p>‍</p><p> &nbsp;बेशक, इन चीजों की भविष्यवाणी करना वास्तव में असंभव है। अगर क्रिप्टो की बढ़ती कीमतें जल्दी आ जाती हैं तो कोई भी परेशान नहीं होगा।</p><p>‍</p><p><strong>19- ऐसी कितनी परियोजनाएँ हैं जो एवलांच सर्वसम्मति को एकीकृत करती हैं जिसे ईकैश अपने नेटवर्क में प्राप्त करने का प्रयास कर रहा है?</strong></p><p>‍</p><ul><li>केवल एक जिसे हम जानते हैं वह AVAX है, जिसे BCH पर तंत्र को शामिल करने के प्रयासों के बाद इसके विशेष उपयोग के लिए इंजीनियर किया गया था।</li></ul><p>‍</p><p>ईकैश का एवलांच सर्वसम्मति कोड Avax से पूरी तरह से अलग है और Bitcoin ABC टीम द्वारा पूरी तरह से स्वतंत्र रूप से बनाया जा रहा है। तो, ईकैश कार्य प्रणाली के प्रमाण पर एवलांच को शामिल करने वाला पहला प्रोजेक्ट होगा (विडंबना यह है कि जब एवलांच श्वेतपत्र सामने आया था तो यह प्रारंभिक इरादा था)। इसका मतलब है कि ईकैश में विकेंद्रीकृत बूटस्ट्रैपिंग है जो ईकैश नोड्स को नाकामोटो आम सहमति की सुरक्षा के आधार पर एवलांच कोरम में अविश्वसनीय रूप से प्रवेश करने में सक्षम बनाता है। इसका मतलब यह भी है कि हम बिटकॉइन की सिद्ध सुरक्षा और आपूर्ति वितरण प्रणाली को बनाए रखते हैं।</p><p>‍</p><p>ईकैश हर एक के लाभ को अधिकतम करने और उनके कमजोर बिंदुओं को कम करने के लिए नाकामोटो आम सहमति के साथ एवलांच की सहमति के संयोजन में अद्वितीय है।</p><p>‍</p><p><strong>20- क्या आभासी दुनिया में कुछ खरीदने के लिए ईकैश का उपयोग मेटावर्स तकनीक में किया जाता है?</strong></p><p>‍</p><ul><li> हम वर्तमान में एक ऐसे प्रोजेक्ट के बारे में नहीं जानते हैं जिसमें इस तरह से ईकैश को एकीकृत किया गया है, लेकिन ईकैश &nbsp;तकनीक इस तरह के एकीकरण के लिए तैयार है। कोई व्यक्ति जो इस प्रकार की प्रणाली का निर्माण करना चाहता है, वह आरंभ करने के लिए GNC पर आवेदन कर सकता है।</li></ul><p>‍</p><p>आगे चलकर हम उम्मीद कर रहे हैं कि कई उद्यमी ईकैश पर सभी प्रकार की परियोजनाओं का निर्माण करेंगे। ईकैश इकोसिस्टम में मूल्य जोड़ने वाली कोई भी परियोजना जीएनसी फंडिंग के लिए आवेदन करनी चाहिए।</p><p>‍</p><p><strong>21- @deadalnix और @AntonyZegers पहली बार कैसे मिले थे? मेरी टिप्पणियों के आधार पर मुझे ऐसा लगता है कि ईकैश इतिहास में एक महत्वपूर्ण क्षण के रूप में याद किया जा सकती है।</strong></p><p>‍</p><ul><li>[एंटनी उत्तर]: ​​अमौरी और मैं 2016 में सैन फ्रांसिस्को में बिटकॉइन अनलिमिटेड (BU) द्वारा आयोजित एक छोटे से बिटकॉइन सम्मेलन में मिले थे।</li></ul><p>‍</p><p><a href="https://medium.com/@peter_r/satoshis-vision-bitcoin-development-scaling-conference-dfb56e17c2d9">https://medium.com/@peter_r/satoshis-vision-bitcoin-development-scaling-conference-dfb56e17c2d9</a></p><p>‍</p><p> &nbsp;उनसे मिलने के बाद, मैंने उनकी प्रतिभा और दृष्टि को पहचाना कि बिटकॉइन को कैसे बढ़ाया जाए, और BU को उनकी मदद स्वीकार करने के लिए मनाने की कोशिश करना शुरू कर दिया, फिर उन्हें बिटकॉइन कैश लॉन्च करने, बिटकॉइन एबीसी चलाने और अंततः ईकैश लॉन्च करने में मदद की।</p><p>‍</p><p><strong>22- वास्तव में मै ईकैश पर एवलांच की प्रतीक्षा कर रहा हु। मुझे इस बारे में और जानना अच्छा लगेगा कि भविष्य की हिस्सेदारी कहां होगी। मुझे एक बड़ा XEC स्टेकिंग पूल पसंद आएगा जिससे हम अपने कैशटैब को जोड़ते हैं। एक्सचेंज द्वारा खातों को फ्रीज करने की स्थिति में हमारी सुरक्षा के लिए!</strong></p><p>‍</p><ul><li> स्टेकिंग पुरस्कार अभी तक लागू नहीं किया गया है, लेकिन इसकी योजना बनाई गई है। विवरण पर काम किया जाना बाकी है। स्टेकिंग केवल सिक्कों को लॉक करने के उद्देश्य से नहीं है। स्टेकर्स के लिए एक मान्य नोड चलाना भी महत्वपूर्ण है जो एवलांच आम सहमति में सक्रिय रूप से भाग लेता है। बिटकॉइन एबीसी नोड वाले तकनीकी उपयोगकर्ताओं के लिए शुरुआत में दांव कुछ अधिक होने की संभावना है। भविष्य में &nbsp;खनन पूल ( mining pool) के समान उभर सकते हैं।</li></ul><p>‍</p><p><strong>23- सभी क्रिप्टो विकेंद्रीकरण की बात करते हैं, लेकिन हम देखते हैं कि वास्तव में ऐसा नहीं है। "यह हमारे &nbsp;CEO" जैसी हेडलाइंस। लेकिन इस संबंध में ईकैश खुद को कैसे बुलाता है?</strong></p><p>‍</p><ul><li>नंबर एक तरीका है कि आप बता सकते हैं कि ईकैश इन परियोजनाओं की तरह नहीं है क्योंकि यह टीम के लिए कोई बदलाव या भत्ते किए बिना बिटकॉइन की आपूर्ति वितरण विरासत में मिला है। यह क्रिप्टो में दुर्लभ है, विशेष रूप से पिछले तेजड़ियों के बाजार में जो "टोकन" परियोजनाओं का प्रभुत्व था, जो संस्थापकों और निवेशकों को सभी प्रकार के टोकन वितरित करते थे। ईकैश ने इस जाल से बचा लिया।</li></ul><p>‍</p><p> बिटकॉइन फोर्क के रूप में ईकैश प्रोटोकॉल बहुत विकेन्द्रीकृत है। एवलांच का कार्यान्वयन भी विश्वास के केंद्रीय बिंदु के बिना पूरी तरह से विकेंद्रीकृत होने के लिए बनाया गया है। बिटकॉइन एबीसी एक ऐसी परियोजना है जो ईकैश पर काम करने के लिए समर्पित है और बिना किसी कॉर्पोरेट समर्थकों के सीधे प्रोटोकॉल से धन प्राप्त करती है, जो इसे ईकैश की सफलता से जुड़े प्रोत्साहनों के साथ बहुत स्वतंत्र बनाती है।</p><p>‍</p><p><strong>24- क्या आपके पास विज्ञापन के बारे में कोई विचार है? आप पूरी दुनिया के लिए ईकैश की घोषणा कैसे करेंगे? जब मैं दुनिया भर की दुकानों को देख सकता हूँ जिस पर "हम #ecash स्वीकार करते हैं" लिखा हुआ चिन्ह है?</strong></p><p>‍</p><ul><li>बाजार को अपनाना एक शक्तिशाली विचार है। हमने उन अभियानों को देखा है जो क्रिप्टो को टॉप-डाउन तरीके से स्वीकार करने के लिए स्टोर प्राप्त करने का प्रयास करते हैं, उन्हें सीमित सफलता मिली है। उदाहरण के लिए, BCH ने इसे अपनी प्रमुख रणनीति के रूप में लिया है, और परिणाम विनाशकारी रहे हैं।</li></ul><p>‍</p><p>ईकैश का उद्देश्य मर्चेंट एडॉप्शन के लिए "बॉटम-अप" ग्रासरूट अप्रोच करना है। आपको ऐसे धन का निर्माण करना होगा जो लोगों को इसका उपयोग करने के लिए पर्याप्त रूप से मजबूर कर सके। फिर दुकानों का पालन करें।</p><p>‍</p><p>हम भविष्य में और अधिक विज्ञापन करने की उम्मीद कर रहे हैं। ईकैश प्रोटोकॉल राजस्व का अच्छा प्रबंधक होना महत्वपूर्ण है, इसे सर्वोत्तम उपलब्ध प्रभाव पर खर्च करना, कुछ मार्केटिंग आवश्यक है, लेकिन केवल यह कहने के लिए कि आपने कुछ किया है (खासकर जब आप परिणाम को माप भी नहीं सकते हैं) वैनिटी प्रोजेक्ट्स या पैसा खर्च करने से बचना महत्वपूर्ण है। सबसे अच्छी मार्केटिंग तब होती है जब आपके पास एक भावुक समुदाय हो। इसके लिए लोग फंडिंग के लिए आवेदन भी कर सकते हैं।</p><p>‍</p><p><strong>25- ईकैश को लेड्जेर वॉलेट में मूल रूप से कब स्टोर किया जा सकेगा?</strong></p><p>‍</p><p>* हम स्थानीय ईकैश समर्थन को लागू करने के लिए लेजर और अन्य वॉलेट प्रदाताओं के साथ सीधे संपर्क में हैं। यह हमारे हाथ में नहीं है कि वॉलेट सेवाओं ने समर्थन को सक्षम करने के लिए कैसे और कब चुना। ईकैश के बारे में अच्छी बात यह है कि एक बिटकॉइन फोर्क के रूप में प्रदाताओं के लिए इसे लागू करना काफी आसान है, केवल उसी बिटकॉइन कोड का पुन: उपयोग करके एंड पॉइंट्स में छोटे बदलाव के साथ। इस बीच, हमने BCH के वर्कअराउंड का उपयोग करके लेड्जेर &nbsp;हार्डवेयर वॉलेट का उपयोग करने के लिए एक गाइड तैयार किया है.</p><p>‍</p><p><strong>26- आप लोग लेन-देन का समय तेजी से प्राप्त करने के लिए काम करते रहें ??</strong></p><p>‍</p><ul><li>हाँ। कम-मूल्य वाले स्थानान्तरण के लिए उपयुक्त 0-पुष्टि के लिए वॉलेट से वॉलेट में लेन-देन पहले से ही तत्काल के करीब है। एवलांच पूर्व-आम सहमति अपडेट के साथ, लेनदेन लगभग तुरंत सुरक्षित रूप से अंतिम रूप दे दिए जाएंगे। अभी कई एक्सचेंज लगभग 10 और उससे अधिक की पुष्टि पर भरोसा करते हैं, लेकिन एवलांच के बाद के अपडेट के साथ एक्सचेंज केवल 1 ब्लॉक के बाद लेनदेन को अंतिम रूप दे सकते हैं। बाद में हम सेकंड के भीतर लेनदेन को तत्काल अंतिम रूप देने में भी सक्षम होंगे। मतलब एक्सचेंज सेकंड के बाद आपकी जमा राशि को सुरक्षित रूप से क्रेडिट कर सकते हैं।</li></ul><p>‍</p><p><strong>27- आपको क्यों लगता है कि एवलांच अन्य शासन सिक्कों से बेहतर है? क्या इसे अलग बनाता है? और क्या आप भी एक स्थिर सिक्का बनाने की योजना बना रहे हैं?</strong></p><p>‍</p><ul><li>हमारा एवलांच आम सहमति कार्यान्वयन AVAX से संबंधित नहीं है। हम अपनी नाकामोटो सर्वसम्मति (कार्य का प्रमाण) के शीर्ष पर सर्वसम्मति प्रोटोकॉल लागू करते हैं, AVAX या किसी भी शासन सिक्के के साथ कोई एकीकरण नहीं है।</li></ul><p>‍</p><p> एवलांच एक बहुत ही नया आविष्कार है और बहुत ही कुशल है। नाकामोटो पुष्टिकरण कैसे काम करता है, इसके विपरीत, नोड्स बहुत जल्दी समन्वय कर सकते हैं और अंतिम सहमति पर आ सकते हैं, जो धीमे हैं। इसका दोष यह है कि यह पूरी तरह से भरोसेमंद नहीं है, लेकिन यह वह जगह है जहां ईकैश की नाकामोटो आम सहमति शुरू होती है। दोनों के संयोजन के लाभ इसे इतना शक्तिशाली बनाते हैं और दोनों आम सहमति तंत्र की कमियों को संतुलित करते हैं।</p><p>‍</p><p> स्थिर सिक्कों के लिए, सबसे अच्छा समाधान यूएसडीसी या किसी अन्य प्रतिष्ठित बड़े स्थिर सिक्के को ईटोकन पर लॉन्च करने के लिए प्रोत्साहित करना होगा। टीथर ने अतीत में ईकैश द्वारा उपयोग किए गए उसी ईटोकन प्रोटोकॉल पर ऐसा किया था, इसलिए हम इस कदम के लिए तकनीकी रूप से पहले से ही तैयार हैं।</p><p>‍</p><p><strong>28- परियोजना के पूरी तरह से चालू होने का अनुमानित समय क्या है?</strong></p><p>‍</p><ul><li>ईकैश पहले से ही \'पूरी तरह से परिचालित\' है, इस अर्थ में कि इसकी तकनीकी क्षमता वर्तमान लेनदेन थ्रूपुट की तुलना में बहुत अधिक है। एवलांच उपयोगकर्ता अनुभव को और भी बढ़ाएगा।</li></ul><p>‍</p><p>सॉफ्टवेयर में हमेशा सुधार किया जा सकता है। अब से दशकों बाद, ईकैश चलाने वाले कंप्यूटर अलग होंगे, और ईकैश विकास उन्नत तकनीक का सर्वोत्तम लाभ उठाने के लिए सुधार करेगा।</p><p>‍</p><p> यह निराशाजनक है कि क्रिप्टो रोडमैप अधिक सटीक नहीं हो सकते। यह पूरे उद्योग में आम है। यहां तक ​​​​कि ईटीएच के प्रमुख ईटीएच 2.0 अपग्रेड के साथ, वर्षों से पाइपलाइन में, कोई सटीक तारीख कभी नहीं रही है। जैसे ही नए मुद्दे और समस्याएं खोजी जाती हैं, उन्हें हल करने के लिए काम किया जाता है। निर्माण जैसे अन्य मानवीय प्रयासों में भी यही होता है। यहां तक ​​​​कि ऐसी चीजें जो अधिक नियमित और योजना बनाने में आसान होती हैं, जैसे एयरलाइन यात्रा, अक्सर निशान से चूक जाती है।</p><p>‍</p><p>आप eCash पर निरंतर Dev प्रगति देख सकते हैं:</p><p><a href="https://reviews.bitcoinabc.org/feed/">https://reviews.bitcoinabc.org/feed/</a></p><p>‍</p><p><strong>29- आप अरबी भाषा का समर्थन क्यों नहीं करते? ‍</strong></p><p>‍</p><ul><li> यदि आपके पास हमारी वेबसाइट या सेवाओं के स्थानीयकरण के लिए कोई सुझाव या अनुरोध है, तो कृपया ट्विटर के माध्यम से हमसे संपर्क करें</li></ul><p>(https://twitter.com/eCashOfficial)</p><p>या टेलीग्राम पर हमारे सामुदायिक प्रबंधकों को(https://t.me/ecash_official)</p><p>और हम जल्द से जल्द आपकी भाषा और संदर्भ मुद्राओं को जोड़ना सुनिश्चित करेंगे। हम एक अनुवाद अभियान भी शुरू कर रहे हैं और समुदाय में किसी का भी स्वागत कर रहे हैं जो इसमें शामिल होने और मुआवजे और पुरस्कारों के साथ अनुवाद करने में मदद करना चाहता है। इस पर और जल्द ही…</p><p>‍</p><p><strong>30- मेरा प्रश्न CashFusion से संबंधित है, यह कैसे काम करेगा? वास्तविक दुनिया में व्यावहारिक अनुप्रयोग क्या होगा?</strong></p><p>‍</p><ul><li> CashFusion पहले से ही वास्तविक दुनिया में काम कर रहा है। आप इलेक्ट्रम वॉलेट का उपयोग करके Cashfusion चला सकते हैं। व्यवहार में, आप बटुए में सिक्के भेजते हैं। वॉलेट तब उन सिक्कों के पिछले लेन-देन के इतिहास को अस्पष्ट करने के लिए कई "संलयन" लेनदेन करता है। इसलिए भविष्य में आप उनके साथ जो भी लेन-देन करते हैं, उन्हें आपकी पहचान से जोड़ना बहुत कठिन होता है।</li></ul><p>‍</p><p><strong>31- मैं विनिमयो के लिए अपना ईकैश टोकन कहां सूचीबद्ध कर सकता हूं?</strong></p><p>‍</p><ul><li> अभी तक कोई ईटोकन विनिमय नहीं हैं। GNC ने अनुमति रहित सॉफ्टवेयर फाउंडेशन से क्रिस ट्राउटनर द्वारा बनाए गए विकेंद्रीकृत ईटोकन एक्सचेंज (DEX) के निर्माण को मंजूरी दी हैI</li></ul><p>(<a href="https://twitter.com/christroutner">https://twitter.com/christroutner</a>)</p><p>‍</p><p><strong>32- क्या आप सुनिश्चित कर सकते हैं कि ईकैश पारिस्थितिकी तंत्र मौजूद रहेगा और बढ़ेगा?</strong></p><p>‍</p><ul><li> हाँ। हमारा वित्त पोषण तंत्र हमारे बुनियादी ढांचे को बनाए रखने और पारिस्थितिकी तंत्र के विस्तार के लिए संसाधन प्रदान करता है। हम दो बार सोचते हैं कि हम क्या लागू करना चाहते हैं, लेकिन जब हम करते हैं, तो हम इसके लिए प्रतिबद्ध होते हैं और सुनिश्चित करते हैं कि यह अच्छी तरह से उत्पादित और बनाए रखा जाएगा। यह ईटोकन प्रोटोकॉल (पूर्व एसएलपी) की निरंतरता हो या इलेक्ट्रम एबीसी वॉलेट सॉफ्टवेयर या कैशफ्यूजन और कई अन्य का कार्यान्वयन।</li></ul><p>‍</p><p><strong>33- मेरा एक प्रश्न है: ईटोकन और XEC के बीच संबंध को कैसे समझें? eToken व्यक्तियों या संगठनों के विचारों के अनुसार बनाया गया है, इसलिए xec प्रोजेक्ट पार्टी यह देखना चाहती है कि किस प्रकार का eToken बनाया गया है। (यह इस सवाल का जवाब देने के लिए भी है कि समर्थकों को XEC परियोजना का समर्थन कैसे करना चाहिए।) और क्या भविष्य में उच्च-गुणवत्ता और संभावित ईटोकन परियोजनाओं के लिए कुछ वित्तीय या तकनीकी सहायता होगी।</strong></p><p>‍</p><ul><li>ईटोकन प्रोटोकॉल एक विकेन्द्रीकृत प्रोटोकॉल है। इसकी अनुमतिहीन प्रकृति के माध्यम से किसी भी प्राधिकरण द्वारा गतिविधियों को अस्वीकार या विनियमित करने का कोई सीधा तरीका नहीं है और इसे इस तरह से डिजाइन किया गया था। ईटोकन प्रोटोकॉल को सुविधाजनक बनाने वाली सेवाओं और उपयोगकर्ताओं को अपने स्वयं के जोखिम शमन और फ़िल्टरिंग के साथ आना होगा। हमें विश्वास है कि सेंसरिंग निकाय के रूप में केंद्रीय प्राधिकरण के बिना, ईटोकन प्रोटोकॉल को सुरक्षित रूप से नेविगेट करने के लिए विभिन्न स्तरों पर तरीके और प्रथाएं हैं।</li></ul><p>‍</p>',
            short_content:
                '1 जुलाई को, हमने eCash दिवस समारोह के लिए Twitter Space और AMA (प्रश्नोत्तर वार्ता) की मेजबानी की। नीचे अधिक विवरण में प्रश्नोत्तर सत्र का ',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Fri Jul 08 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'iikaish-divs-smaaroh-ke-lie-ttvittr-spes-aur-prshn-uttrii',
            createdAt: '2023-06-20T22:49:34.593Z',
            updatedAt: '2023-06-21T21:44:43.717Z',
            publishedAt: '2023-06-20T22:49:34.583Z',
            legacy_image: '/images/62c8a0e03e3cf08827a2fcec_HI.png',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 55,
                    attributes: {
                        name: '62c8a0e03e3cf08827a2fcec_HI.png',
                        alternativeText: null,
                        caption: null,
                        width: 320,
                        height: 192,
                        formats: {
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_62c8a0e03e3cf08827a2fcec_HI_95170603f9.png',
                                hash: 'thumbnail_62c8a0e03e3cf08827a2fcec_HI_95170603f9',
                                mime: 'image/png',
                                name: 'thumbnail_62c8a0e03e3cf08827a2fcec_HI.png',
                                path: null,
                                size: 78.04,
                                width: 245,
                                height: 147,
                            },
                        },
                        hash: '62c8a0e03e3cf08827a2fcec_HI_95170603f9',
                        ext: '.png',
                        mime: 'image/png',
                        size: 43.76,
                        url: '/uploads/62c8a0e03e3cf08827a2fcec_HI_95170603f9.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:00:02.274Z',
                        updatedAt: '2023-06-21T20:00:02.274Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 55,
        attributes: {
            title: 'Twitter Space & eCash Günü Kutlaması İçin Gerçekleşen AMA Etkinliği',
            content:
                "<p><strong>Twitter Space &amp; eCash Günü Kutlaması İçin Gerçekleşen AMA Etkinliği</strong></p><p>‍</p><p>1 Temmuz'da eCash Günü kutlaması için Twitter Space &amp; AMA'ya ev sahipliği yaptık. Aşağıda, Q&amp;A oturumunun daha fazla ayrıntılı olarak ele geçirilmesi bulunmaktadır.</p><p>‍</p><p><strong>1- Daha önce asla çözülemeyen sorunları çözeceğini biliyorum. İşin kolay değil. Çığ (Avalanche) üretime hazır mı? Son durum nedir? Herkesin en çok merak ettiği soru bu.</strong></p><p>‍</p><p>• Çığ yani avalanche, fırlatmaya çok yakın. Bu teknolojiyi ana ağ üzerinden kaydetmeden önce ek testler yürütüyoruz. &nbsp;Testler fırlatmadan sonra devam edecek. Uygulama için daha fazla özellik var ve çığda gözden geçirilebilir.</p><p>‍</p><p><strong>2- Bize eCash için mevcut finansman hakkında ne anlatırsınız? GNC hangi aşamada?</strong></p><p>‍</p><p>İyi bir dizi kaliteli teklif aldık. Birçok kişi kabul edildi. GNC harcamaları şu anda gelirle uyumlu. Ancak GNC'nin son birkaç yıldan itibaren mevcut olan iyi rezervlere sahip olduğu ve ek öneriler yeterli destek çekmesi halinde de mevcut olan iyi rezervlere sahip.</p><p>‍</p><p>Bir kurum olarak GNC hala çok yeni. Süreçler ve prosedürler için gerekli gelişmeler yapıldı ve daha fazlası planlanıyor. GNC yapısında oldukça eşsizdir ve &nbsp;akıcı bir şekilde çalışmasını sağlamanın iteratif bir süreci haline getiriyor. GNC için fonksiyonlar üzerinde çalışmaya devam edeceğiz. Nihai hedef, eCash'e mümkün olan en verimli şekilde değer katmaktır.</p><p>‍</p><p><strong>3- Haftalık bir haber bülteni yayınlamayı planlıyor musunuz?</strong></p><p>‍</p><p>Düzenli içeriklerimize ek olarak Twitter'da düzenli aylık güncellemeleri yayınlamaya başladık. Artık tam zamanlı bir sosyal medya müdürü tarafından yönetildik. Eğer toplumun yeterince ilgi varsa, bir e-posta haber bülteni de yayımlayabiliriz. &nbsp;Twitter ve Telegram grupları gibi Sosyal Medyamız güncel kalmanın en iyi yoludur. (Hepsini bulunabilirsiniz <a href=\"https://ecash.community/\">ecash.community</a>). ecash. topluluk. Ayrıca bilgi hattında yakında ortaya çıkacak birkaç blog direğimiz var. Toplum üyemiz eCash Yeterince aboneye denk gelen resmi olmayan bir haber bülteni oluşturmayı planlıyor.</p><p>‍</p><p><strong>4- XEC yeni borsalarda listelenecek mi? Bu ve benzer konular üzerinde bir çalışma var mı?</strong></p><p>‍</p><p>• eCash takımı, çalışma hattında yeni para birimleri listelemeleri ile düzenli &nbsp;işlemler kapsamında sürekli olarak yeni borsalara ve ortaklara ulaşıyor. Toplumun ve kullanıcıların şanslarımızı artırmak için yapabilecekleri şey, en sevdiği takaslarda eCash'in listesini de talep etmektir. Yeterli talep göstersek, alışverişler eCash'in listesini önceliklendirmeye eğilimli hissedebilir.</p><p>‍</p><p><strong>5- BCHA Temmuz 2021'de eCash XEC olarak yeniden ayarlandı. BCH hala orada. Sanırım BCH ciddi şekilde kan kaybediyor. BCH'nin size katılması için bir teklif aldınız mı?</strong></p><p>‍</p><p>• BCH ve eCash tamamen ayrı projeler ve bir araya gelmeleri için bir şans veya teknik bir yol yoktur.</p><p>‍</p><p>• Daha önce BCH üzerinde çalışan herhangi bir geliştirici eCash üzerindeki çalışmalarına devam etmek için hoş karşılanır. Temel teknoloji benzer olduğundan, eCash'te piyasaya sürülmekle ilgilenen BCH projelerini de memnuniyetle karşılıyoruz. Hele de eToken projeleri söz konusu olduğunda (ayrıca Simple Ledger Protokolü olarak da bilinir). eToken altyapısını desteklemeye devam edecek ve bunların çoğu bitcoin geliştiricilerini çoktan alışverişini geliştirmek için kapsamlı bir geliştirici araç araç araç inşa ediyor.</p><p>‍</p><p><strong>6- Biz bir aile olduk. bitcoinabc.org'daki eCash takımını takip ediyorum. Diğer geliştirici takımı merak ediyorum. İşyerini, çalışma ortamını merak ediyorum.</strong></p><p>‍</p><p>• Dünyanın farklı yerlerinde uzaktan çalışıyoruz, bu yüzden aynı anda aynı ortamda her takım üyemiz olmadı. Bazı takım üyeleri isimsiz olmasına rağmen, çalışmaları ve kodu takip edilebilir. İsimsiz olmayan üyeler LinkedIn'de bulunuyor.</p><p>‍</p><p><strong>7- eCash ağını Bitcoin ağınılda &nbsp;üstün kılan &nbsp;özellikleri nelerdir ? </strong></p><p>‍</p><p>• Bu günlerde birçok proje aracılığıyla çalıştığımız ve yol haritasını bir tür pazarlama hilesi olarak görüyoruz. eCash, kilit dönüm noktalarını elde eden ve gelecekte daha çok çalışmaya devam edecek bir misyon güdümlü bir proje.</p><p>‍</p><p>• eCash protokolü gelirleri, ayı pazarı ortamında bile siyasi açıdan bağımsız ve sürdürülebilir gelişmelere olanak sağlar. Bitcoin ve diğer projelerdeki kalkınma yönü geçmişte sahiplerinle uyumlu olmayan büyük donörlerden etkilenmiştir.</p><p>‍</p><p>• Bu günlerde, kripto analistlerin çoğu BTC'yi “değer mağazası olarak görüyor. eCash dünya parası inşa ediyor. Dolayısıyla, değer bir mağazası ve aynı zamanda pratik bir araç olan”'nin de pratik bir orta olması gerekiyor. BTC'ye kıyasla, bu daha fazla gelişme çalışması gerektirir.</p><p>• eCash, nispeten yüksek işlem ücretleri nedeniyle BTC'de uygulanabilir olmayan Cashfusion ile opt kişilik mahremiyet destekler.</p><p>‍</p><p>• Avalanche'nin eklenmesi, anlık finallik, alt zincirler potansiyeli ve daha kolay güncelleme gibi birçok büyük özellik eklenir. Bu özellik ayrıca eCash'in BTC'nin baskın güvenlik pozisyonuyla rekabet etmesine de olanak sağlayacak.</p><p>‍</p><p><strong>8- Luna UST olayı piyasadaki güvene zarar verdi. Piyasalar kan banyosuna dönüştü. Tüm dünyada olduğu gibi, insanlar da ciddi hasarlarla karşı karşıya kaldı. eCash takımı gelecekte bu tür saldırganlara karşı hangi önlemler alacak?</strong></p><p>‍</p><p>• eCash, Bitcoin'in bir çatalıdır, yani;</p><p>‍</p><p>1-12 yıldır süren güçlü bir teknik vakıf üzerine inşa edilmiş ve...</p><p>‍</p><p>2- Bozuklar 12 yıllık çalışma madenciliği kanıtı aracılığıyla oldukça dağıtılıyor.</p><p>‍</p><p>• Bu nedenle, eCash, Luna ve diğer yeni projeleri kriptospace'da salgılayan aynı ponzi şema sorunlarına maruz kalmıyor. Bu paralar çok ilgi çekiyor çünkü bir sürü '“ücretsiz para teslim ediliyor gibi görünüyor. Ancak genellikle bu tür projelerdeki arz, tahmin edilebilir kötü sonuçlar elde ederek kurucuları tarafından çok önemlidir.</p><p>‍</p><p><strong>9- Gelecek dünyasında eCash XEC'i nereden görüyorsunuz? Gelecekte eCash nasıl bir rahatlık sağlayacak? 3-10 yıl içinde kendini nereden görüyorsunuz?</strong></p><p>‍</p><p>• eCash, dünya için sansür dirençli para inşa ediyor. Oraya ulaşmak için, ABD gibi büyük dünya para birimlerine ve altın gibi popüler küresel ürünlerle de rekabetçi olmalıyız. Bu iki ürün de çözmeye çalıştığımız sorunları var.</p><p>‍</p><p>ABD ve diğer fiat para birimleri durumunda, çoğu insan birikimlerini şişirmek için bir merkez bankasına güveniyor ve mahalle bankaları paralarını kumar oynamamak için.</p><p>‍</p><p>Altın durumunda, giderek karmaşık yasal kısıtlamalara tabidir.</p><p>‍</p><p>eCash, insanların para ve altın üzerindeki sevdiği özellikleri korumayı amaçlıyor; zenginlik, taşınabilirlik, güvenlik, mahremiyet ve devletler tarafından bu antik teknolojilere verilen artan kısıtlamalarla mücadele ederken ve başarısız bankalar tarafından mücadele ediyor.</p><p>‍</p><p>• Bunun gerçekleşmesi için dünya çapında altyapı inşa etmemiz ve eCash kullanarak girişimci geliştirici kültür inşa etmek için ürünler ve hizmetler inşa etmemiz gerekiyor. Aynı zamanda bunu inşa etmek için çalışıyoruz. Düğme yazılımını inşa etmek için çalışıyoruz.</p><p>‍</p><p><strong>10- Gelecekte eCash'i nerede görüyorsunuz ? &nbsp;eCash, gelecekte ademi &nbsp;merkeziyetçi bir değişim kurmayı düşünüyor mu? Merkezi borsaların ve balinaların manipülasyonuyla nasıl mücadele edecekler?</strong></p><p>‍</p><p>• eCash'in önceden mevcut bir dağıtımı vardır ve arz madeni ve herhangi bir kişi veya takım tarafından kontrol edilir. Bu nedenle alışverişler sadece kullanıcı mevduatları ve ticaret yoluyla yıllardır kazandıkları şeye sahiptir. Bu, diğer yeni şifreli para birimlerine kıyasla eCash için kilit bir ayrımdır. eCash tedarik takım tarafından kontrol edilemez. eCash listedeki takas, herhangi bir liste ücreti veya arzın herhangi bir kısmı sunulmadı.</p><p>‍</p><p><strong>11- Amaury'nin çalışmalarını insanlık için çok değerli buluyorum ama eCash'den ayrılırsa eCash'e ne olacak. Birçok projede, Kurucunun ayrıldığında proje çöktü ve başına kötü bir şey oldu. eCash onsuz devam edecek mi?</strong></p><p>‍</p><p>• Başlangıç şirketleri buna '“kilit adam riski diyorlar. Ancak eCash bir şirket değil, açık bir kaynak protokolüdür. Amaury, eCash'in muazzam bir teknik lider ve varlıktır. Başarılı bir kripto para biriminin hem iyi bir liderliğe hem de siyasi bağımsızlığa ihtiyacı var. Eğer tek bir kişi tarafından katılım olmadan başarılı olamazsa, o zaman zaten başarısız bir proje.</p><p>‍</p><p>Satoshi Nakamoto'nun gidişinden sonra bitcoin'in keyfini elde ettiği başarıya bakabilirsiniz.</p><p>eCash gibi ademi bir protokolün amacı, kurucusu olmadan bile devam edebilmesidir.</p><p>‍</p><p><strong>12- Açıkçası, Bitcoin, en başta çığır açan bir teknoloji olmasına rağmen bir dolandırıcılık projesi olduğunu düşünüyorum. Bence sürekli manipülasyonla yapılan borsalar mevcut olmayan BTC'ler satıyor. Borsada manipülasyon var ama bu kadar da değil. Kalbim BTC'nin sıfırlamasını destekliyor. Güzel bir kripto dünyasına sıfırlama yaşarsak sanırım altcoinlerde bir rahatlama, bir &nbsp;çeki düzen gelecektir. Bazi onemli Altcoinlerin hak ettikleri değeri elde edecegi bir gercek. Bitcoin ABC takımının bu konudaki görüşünü merak ediyorum. Kripto dünyanın sıfıra ihtiyacı var mı? BTC çatalı olan eCash, BTC sıfırlanırsa nasıl etkilenecek?</strong></p><p>‍</p><p>• BTC'nin küresel bir elektronik nakit sistemi inşa etme hedefinden izini aştığı ve aslında Bitcoin ABC projesi böyle oldu ve bugün de eCash'a yol açtı. Yine de, BTC'de keşfedilen deneysel ‘gerçek dünya testleri eCash gibi gelecekteki projeler için paha biçilmez. İş madenciliğinin kanıtı, Luna gibi diğer şemaların aksine, zenginlik yok edilmesine yol açan diğer şemaların aksine, bugün para dağıtımı için test edilmiş bir adil bir yol. Kriptocurrency'nin en büyük özelliklerinden biri de işlemlerin iptal edilemeyeceğidir. Bankaların ve devlet oyuncularının bugün paraya siyasi müdahale yaratmak için yaptığı şey tersine çevriliyor; eCash'in amacı bu etkiden kaçınmaktır.</p><p>‍</p><p><strong>13- 5 milyon txs/sec hedefine ne zaman ulaşacağına dair en iyi tahmin nedir? Teknik bir çözüm var mı, yol haritası mı? Yoksa bir deneme ve hata yöntemiyle sonuçlanacak mısınız?</strong></p><p>‍</p><p>• Bu kullanım düzeylerini halletebilecek bir sistem oluşturacak teknik bir yol haritamız var. Kuzey blok uzay talebi ve mevcut kaynaklarla uyumlu olarak büyük teknik değişiklikleri ihtiyatlı bir şekilde hızlandırmamız önemlidir.</p><p>‍</p><p>O halde, o, deneme ve hata değildir. Bu, teknolojinin her zaman rahatlıkla talep artırmadan önce sürekli iter ve emin oluyor. BTC'nin işlem talebinin destekli yazılım ölçeğini aşmasına izin vererek büyük bir hata yaptığını düşünüyoruz.</p><p>‍</p><p>Ama sadece bir geliştirici sorunu değil. Teknoloji şu anda ticaret alanındaki kripto işleme yönelik reel dünyanın talebinden çok daha önce. Ticaretçiden daha fazla olan girişimciler, işletmeler ve kullanıcılar dünya ölçeğine ulaşmada önemli bir rol oynayacak.</p><p>‍</p><p><strong>‍14- Temmuz 2021'den bu döneme kadar uzanan süreçte rahat hissediyor musunuz? Teknoloji ilerledi mi?</strong></p><p>‍</p><p>• Yazılım her zaman daha iyi olabilir. Yazılım ayrıca izole edilmiş olarak da yoktur ve &nbsp;her zaman gelişen ve değişen bilgisayarlarda çalışır. Bu yüzden her zaman yapılacak gelişmeler olacak.</p><p>‍</p><p>Büyük bir ilerleme kaydettik ama aynı zamanda hala ve her zaman yapılacak çok iş olacak.</p><p>‍</p><p>İşleri daha hızlı uygulamak isteriz. Bununla birlikte, şifreleme gelişimi Snapchat gibi bir şeyle aynı değildir. Eğer bir şeyi aceleyip kritik bir böcek salırsak, sonuçlar bir fotoğraf görmeyen veya Facebook profillerindeki yanlış verileri görmeyen birinden daha kötü olur. Dolayısıyla, olumsuz çevreyi test etmek ve simülasyon geliştirme sürecimizin önemli bir parçasıdır.</p><p>‍</p><p>Ayrıca kaynaklar, altyapı düzeyinde gerekli teknoloji ilerlemesine katkıda bulunan daha fazla geliştiricinin katkıda bulunmasına olanak sağladığı için takımı genişletmeye çalışıyoruz.</p><p>‍</p><p><strong>15- Eninde sonunda eCash (ve genel olarak şifreleme) ne elde etmesini umuyorsun?</strong></p><p>‍</p><p>• Kripto gelişimi kişisel özgürlüğün korunması için teknolojik bir silah ırkıdır.eCash finansal özgürlük teknolojisidir.</p><p>‍</p><p>Bugün, çoğu insanın kullandığı para söz konusu olduğunda sınırlı bir seçim vardır. Yerel siyasi kararlara karşı savunmasız, tasarruflarını şişirleyen veya hatta fonlarını dondurmaya da dondurmaya karşı hassaslar.</p><p>‍</p><p>eCash, bu etkilerle mücadele etmek için tasarlanmış açık kaynak teknolojisidir.</p><p>‍</p><p>• Dünya çapında insanların alternatif bir ekonomide bir durum veya acil durum mekanizması olarak kullanabileceği bir yaşam teknesi senaryosu olarak kabul edilen ve dünya çapında bir dünya parası olarak kullanılabilmesi için farklı yollar vardır.</p><p>‍</p><p><strong>16- devlet paraları ve bankalara duyulan güven dünyada azalıyor. İnsanları kriptoya çeken şey budur. Bitcoin daha da büyüyecek mi? Hal Finney'in 2009 yılında yaptığı gibi, bitcoin'in 10 milyon dolar'a ulaşacak. Başarılı ve güvenli olmak için bitcoinlerin çok pahalı olması gerektiği konusunda Hal Finney ile hemfikfikirler misiniz ?</strong></p><p>‍</p><p>• Bitcoin muhtemelen büyümeye devam edecek, ancak kasabadaki tek oyun olduğu zaman erken yükselişinden çok daha yavaş bir oranda büyümeye devam edecek. Bitcoin piyasadaki en zorlayıcı teknoloji değil ama dediğiniz gibi, merkez bankaları gibi rakipleri daha da kötüleşiyor.</p><p>‍</p><p>Eğer bitcoin kullanıcı talebine uygun olarak gelişseydi, bitcoin çok pahalı hale gelmesi gerçekten daha başarılı ve daha güvenli hale getirmiş olurdu. Ne yazık ki, tam tersi bir etki yarattı. Bitcoin'in çoğu, onunla hareket etmeyen büyük balinalar ve küçük işlemler tarafından tutulur ve bu da günlük ekonomik faaliyetin çoğunu oluşturan küçük işlemler tarafından yapılır ve bu da bitcoin üzerinde pratik değildir.</p><p>‍</p><p>Avalanche gibi şifreleme teknolojisinde gelişmeler, daha küçük projeler için bitcoin seviyesi güvenliğe olanak sağlar. eCash için, fiyat ve popülerlik artışı bitcoin üzerinde görülen zararlı bir etki yaratmayacak.</p><p>‍</p><p><strong>17- Bu çığır açan bir proje. Merkez bankaları onları radarına koyarak sizi izliyor. Sizin üzerinde siyasi bir baskı var mı?</strong></p><p>‍</p><p>• Satoshi'nin bu konuda doğru fikirleri vardı.yarışmak önemlidir ama bu doymak, etrafta koşmak ve dövüşlere başlamak anlamına gelir. Radar altında ne kadar çok teknoloji gelişirse, gelecekteki etkisiniz o kadar büyük olacak.</p><p>‍</p><p>Her zaman projenin doğasına göre ihtiyatlı olmalıyız. Merkez bankalarıyla rekabet kaçınılmazdır. &nbsp;Bu da başarılı olduğunuz anlamına gelir.</p><p>‍</p><p><strong>18- Ayı sezonunda mıyız, sence bu ne kadar sürecek?</strong></p><p>‍</p><p>• eCash takımı birkaç ayı pazarı geçirdi. Görünen o ki başka bir tanedeyiz. Tipik olarak, bir sonraki yarıya kadar yan yana ticaret yapan eCash'in bitcoin ile aynı programa sahiptir. Bu sefer bir sonraki nesil kripto tekniği inşa etmeye devam etmek için bir sonraki nesil kripto teknolojisini inşa etmeye devam etmek için kullanıyoruz.</p><p>‍</p><p>Tabii ki, &nbsp;bunları gerçekten tahmin etmek imkansız. Yükselen kripto fiyatları erken gelirse kimse üzülmez.</p><p>‍</p><p><strong>19- eCash'in kendi ağlarına ulaşmaya çalıştığı çığ uzlaşmasını entegre eden kaç proje var?</strong></p><p>‍</p><p>• Bildiğimiz tek kişi, BCH hariç tavanının mekanizmasını dahil etme çabaları sonrasında özel kullanımı için tasarlanan AVAX'dır.</p><p>‍</p><p>eCash'in Avalanche Consenssensus kodu Avax'tan tamamen ayrı ve Bitcoin ABC takımı tarafından tamamen bağımsız olarak inşa edilmiştir. Bu nedenle, eCash, Avalanche'i bir çalışma sistemine dahil eden ilk proje olacak (ironik olarak, Avalanche beyaz kağıdı ortaya çıktığında ilk niyetiydi). Bu, eCash'in Nakamoto Consenssensus'un güvenliğine dayanarak, eCash Nodes'un gerçekten Avalanche quorum'a girmesini sağlayan bir şekilde ayırt edici bir şekilde. Ayrıca bitcoin'in ispatlanmış güvenlik ve arz dağıtım sistemini de koruduğumuz anlamına geliyor.</p><p>‍</p><p>• eCash, her birinin avantajlarını maksimum seviyeye çıkarmak ve zayıf noktalarını azaltmak için Avalanche Consensation ile Nakamoto Consenssenssensation'u birleştirmek için eşsizdir.</p><p>‍</p><p><strong>20- eCash, sanal dünyada bir şeyler satın almak için metaverse teknolojisinde mi kullanılıyor?</strong></p><p>‍</p><p>• Biz’şu anda eCash'i bu şekilde entegre eden bir projenin farkında değiliz, ancak eCash teknolojisi bu tür entegrasyon için hazır. Bu tür bir sistemi inşa etmek isteyen biri, başlamak için GNC'ye başvurabilir.</p><p>‍</p><p>• İlerleme doğru, birçok girişimcinin eCash üzerine her türlü proje inşa etmesini umuyoruz. eCash ekosistemine değer katan her proje GNC finansmanı için başvurmalı.</p><p>‍</p><p><strong>21- Endonelder ve Antonyegers ilk kez nasıl bir araya geldi? Gözlemlerime dayanarak, bu toplantının eCash tarihinin önemli bir anı olarak sona erebileceğini hissediyorum.</strong></p><p>‍</p><p>• [Antony Cevap]: Amaury ve ben 2016 yılında San Francisco'da Bitcoin Unlimited (BU) tarafından düzenlenen küçük bir Bitcoin konferansında (<a href=\"https://medium.com/@peter_r/satoshis-vision-bitcoin-development-scaling-conference-dfb56e17c2d9\">https://medium.com/@peter_r/satoshis-vision-bitcoin-development-scaling-conference-dfb56e17c2d9</a>) Onunla tanıştıktan sonra, Bitcoin'i nasıl ölçeceğine ilişkin yeteneklerini ve vizyonunu tanıdığım ve BU'yu yardımını kabul etmeye ikna etmeye başladım, sonra Bitcoin Cash'i piyasaya sürmesine, Bitcoin ABC'yi çalıştırmasına ve sonunda eCash'ı piyasaya sürülmesine yardım etti.</p><p>‍</p><p><strong>22- eCash'te Avalanche'i sabırsızlıkla bekliyor. Gelecekteki tutukluluğun nerede olacağını daha çok bilmek isterim. Kashtab'ımızı bağladığımız büyük bir XEC'in zımbasını çok isterim. Takas hesapları donması durumunda güvenliğimiz için!</strong></p><p>‍</p><p>• Staking ödülleri henüz uygulanmadı ancak planlanmaktadır. Ayrıntılar henüz henüz çözülemedi. Staking sadece paraları kilitlemek amacıyla’değildir. Ayrıca kazıkların Avalanche Consensus'a aktif olarak katılan validating bir düğüm yürütmeleri de önemlidir. Başlangıçta, Bitcoin ABC düğümü olan teknik kullanıcılar için daha fazla bir şey olması muhtemel. Gelecekteki havuzlar, madencilik havuzlarına benzer şekilde ortaya çıkabilir.</p><p>‍</p><p><strong>23- Tüm kriptolar merkeziyetsizlikten bahsederken, fakat bunun aslında böyle olmadığını görüyoruz.ـ manşetler \"İşte CEO'muz\" gibi manşetler vat ama eCash bu konuda kendine nasıl sesleniyor?</strong></p><p>‍</p><p>eCash'in bu projeler gibi olmadığını söyleyebileceğiniz bir numaralı şey, Bitcoin'in arz dağıtımını miras bırakmasıdır. Bu, özellikle de kuruculara ve yatırımcılara her türlü jetin dağıtan son boğa pazarında, özellikle de son boğa pazarında nadiren görülür.</p><p>‍</p><p>Bitcoin Fork olarak eCash protokolü çok decentralize edilir. Ayrıca çığ uygulaması, merkezi bir güven noktası olmadan tamamen ademi olarak inşa edilmiştir. Bitcoin ABC, eCash üzerinde çalışmaya adanmış ve herhangi bir şirket desteği olmadan doğrudan protokollden doğrudan finansman alan ve bu projeden doğrudan fon alan ve eCash'in başarısına hizalanmış teşviklerle çok bağımsız hale getiren projedir.</p><p>‍</p><p><strong>24- Reklam hakkında herhangi bir fikriniz var mı? Tüm dünyaya eCash'i nasıl duyuracaksın? Dünyanın dört bir yanındaki işletmelerin ne zaman \"kabul ediyoruz #ecash\" yazan bir işareti olacak?</strong></p><p>‍</p><p>• Tüccar benimsemek güçlü bir fikirdir. Biz, mağazaların şifreli bir şekilde kabul etmesini sağlamaya çalışan kampanyaların sınırlı bir başarı elde ettiğini gördük. Mesela BCH bunu baskın stratejisi olarak kabul etti ve sonuçlar felaket oldu.</p><p>‍</p><p>• eCash, tüccar kabulüne yönelik bir “;en alt düzey halk yaklaşımını hedefliyor. İnsanların bunu kullanmak için yeterli derecede zorlayıcı bir para inşa etmek zorundasınız.</p><p>‍</p><p>• Gelecekte daha fazla reklam yapmayı umuyoruz. eCash protokolünün iyi kahiaları olmak ve mevcut en iyi etkiye harcamak önemlidir. Bazı pazarlama gereklidir, ancak kibirli projelerden kaçınmak ya da para harcamak için sadece bir şey yaptığını söylemek için (özellikle de sonucu ölçüp ölçüldüğünde). En iyi pazarlama tutkulu bir topluluğunuz olduğu zaman. İnsanlar bunun için de finansman talep edebilirler.</p><p>‍</p><p><strong>25- eCash ne zaman defter cüzdanlarında yerli olarak depolanabilir?</strong></p><p>‍</p><p>• Ledger ve diğer cüzdan sağlayıcılarıyla doğrudan temas halindeyiz. Yerli eCash desteği uygulamak için. Cüzdan hizmetlerinin desteği nasıl ve ne zaman ve ne zaman tercih ettiği elimizde değil. eCash'in iyi yanı, bir Bitcoin çatalı olarak, sağlayıcıların son noktalarındaki küçük değişikliklerle aynı Bitcoin kodunu yeniden kullanarak uygulamasının oldukça kolay olmasıdır. Bu arada, BCH desteğinin bir çalışma çalışması kullanarak Ledger donanım cüzdanını kullanmak için bir rehber hazırladık: <a href=\"https://www.bitcoinabc.org/2022-02-03-hardware-wallet-workarounds/\">https://www.bitcoinabc.org/2022-02-03-hardware-wallet-workarounds/</a></p><p>‍</p><p><strong>26- Sen işlem zamanını daha hızlı hale getirmek için çalışmaya devam ediyorsunuz?</strong>‍</p><p>‍</p><p>• Evet. Cüzdan cüzdan geçerek düşük değerli transferlere uygun 0 onaylama için çoktan yakındır. Avalanche Consenssensus öncesi güncellemesiyle, işlemler neredeyse hemen hemen tamamlanacak</p><p>• Birçok değişim şu anda yaklaşık 10'luk teyitlere dayanıyor, ancak Avalanche Post-Consensus güncelleme borsaları ile işlemi sadece 1 Block'tan sonra tamamlayabilir. Daha sonra da saniyeler içinde işlemlerin anlık finalizasyonunu da elde edeceğiz. Bu yüzden borsalar, depozitlarınızı saniyeler sonra güvence altına alabilirsiniz.</p><p>‍</p><p><strong>27- Neden çığın diğer yönetim bozuk bozukluklarından daha iyi olduğunu düşünüyorsunuz? Bunu ne farklı yapar? Peki da istikrarlı bir para yapmayı mı düşünüyorsunuz?</strong></p><p>‍</p><p>• Bizim çığ Konsantrasyonu uygulamamız AVA ile ilgili değildir. Nakamoto Anlaşması'nın (İş Probasyonu) üzerine uzlaşma protokolünü uygulayacağız, AVA veya herhangi bir yönetim bozukluğuyla entegrasyon yoktur.</p><p>‍</p><p>• Çığ çok yeni bir icat ve çok verimlidir. Nodes, Nakamoto'nun nasıl yavaş çalıştığını aksine, kopyalar ve nihai bir uzlaşmaya çok hızlı bir şekilde bulunabilir. Cüzdanı tamamen doğru değil, ancak eCash; Nakamoto Consenssensus'un tekmelediği yer. İkisini de birleştirmenin yararları bu kadar güçlü kılar ve her iki uzlaşma mekanizmasının dezavantajlarını dengelemektedir.</p><p>‍</p><p>• İstikrarlı paralar için en iyi çözüm, ABD veya diğer itibarlı büyük bir sabit para daha eToken'de fırlatmaya teşvik etmek olacaktır. Tether bunu geçmişte eCash tarafından kullanılan aynı eToken protokolünde yaptı, bu yüzden teknik olarak bu adım için zaten teknik olarak hazırız.</p><p>‍</p><p><strong>28- Projenin tam olarak faaliyete geçmesi tahmin edilen zaman nedir?</strong></p><p>‍</p><p>• eCash, teknik kapasitesinin mevcut işlem sürecinden çok daha büyük olduğu açısından, tam olarak faaliyet göstermektedir. Bu çığ, kullanıcı deneyimini daha da artıracak.</p><p>‍</p><p>• Yazılım her zaman iyileştirilebilir. Bundan sonraki kararlar, eCash'i çalıştıran bilgisayarlar farklı olacak ve eCash gelişimi teknolojinin ilerlemesinden en iyi şekilde yararlanmak için gelişmeler yapacak.</p><p>‍</p><p>• Bu, şifreli yol haritalarının daha kesin olması için hayal kırıklığına uğratıcı. Bu, endüstride yaygındır. ETH'nin en büyük ETH 2.0 güncellemesi ile bile, boru hattında yıllardır tam bir tarih olmadı. Yeni sorunlar ve sorunlar ortaya çıktığında, bunları çözmek için çalışmalar yapılıyor. Aynı şey inşaat gibi diğer insan çabalarında da aynı şey olur. Havayolu yolculuğu gibi planlamak daha rutin ve daha kolay olan şeyler bile genellikle işareti kaçırır.</p><p>‍</p><p>• eCash'te https://reviews. bitcoinabc.org/feed/</p><p> </p><p><strong>29- Neden Arapça dilini desteklemiyorsun?</strong></p><p>‍</p><p>• Eğer web sitemizin veya hizmetlerimizin lokalize edilmesi için bir öneriniz ya da isteğiniz varsa, lütfen Twitter aracılığıyla bize ulaşın(<a href=\"https://twitter.com/eCashOfficial\">https://twitter.com/eCashOfficial</a>) ya da Telegram üzerindeki Toplum Yöneticilerimize (<a href=\"https://t.me/ecash_official\">https://t.me/ecash_official</a>) ve en kısa sürede dilinizi ve referans para birimlerinizi eklemeyi sağlayacağız. Ayrıca bir tercüme kampanyası başlatıyoruz ve toplumdaki tazminat ve ödüllere karşı tercüme edilmesine yardım etmek isteyen herkesi hoş geldiniz. Yakında daha çok şey;</p><p>‍</p><p><strong>30- Benim ve CashFusion ile ilgili, nasıl çalışacak? Gerçek dünyadaki pratik uygulama ne olacak?</strong></p><p>‍</p><p>• Cashfusion zaten gerçek dünyada çalışıyor. Electrum cüzdanını kullanarak Cashfusion'i çalıştırabilirsiniz. Pratik olarak, cüzdana para gönderirsin. Cüzdan daha sonra bu paraların geçmiş işlem tarihini ortaya çıkarmak için bir dizi “füzyon işlemi yürütüyor. Bu yüzden gelecekte onlarla birlikte yaptığınız herhangi bir işlem kimliğinizle bağlantı kurmak çok daha zordur.</p><p>‍</p><p><strong>31- Takaslar için eCash jetimi nereden listeleyebilirim?</strong></p><p>‍</p><p>• Henüz eToken alışverişleri yok. GNC, Chris Troutner tarafından İzinsiz Yazılım Vakfı'ndan oluşturulan Decentralized bir eToken değişimi (DEX) kurulmasını onayladı (<a href=\"https://twitter.com/christroutner\">https://twitter.com/christroutner</a>).</p><p>‍</p><p><strong>32- eCash ekosisteminin var olup büyüyebilir misiniz?</strong></p><p>‍</p><p>• Evet. Finansman mekanizmamız altyapımızı korumak ve ekosistem genişlemesi için kaynaklar sağlar. Uygulamak istediğimiz şeyi iki kez düşünürüz ama bunu yaptığımızda buna kararlıyız ve iyi üretileceğinden emin olun. eToken protokolünün (eski SLP) sürdürülmesi veya Electrum ABC cüzdan yazılımının veya Cashfusion'nin uygulanması ve daha çok daha fazla şekilde uygulanması olsun.</p><p>‍</p><p><strong>33-Sorularımdan biri: etoken ile XEC arasındaki ilişkiyi nasıl anlayacak?</strong></p><p>‍</p><p>eToken bireylerin veya örgütlerin fikirlerine göre yaratılmıştır, bu yüzden xec proje partisi ne tür bir eToken'in kurulduğunu görmek istiyor. (Bu ayrıca destekçilerin XEC projesini nasıl desteklemesi gerektiği sorusuna da cevap vermek için.) ) Ve gelecekte yüksek kaliteli ve potansiyel etoken projelerine bazı finansal veya teknik destek olsun.</p><p>‍</p><p>• eToken protokolü, ademi bir protokoldir. İzinsiz doğası sayesinde faaliyetleri herhangi bir otorite tarafından etkisiz hale getirmek veya düzenlemenin doğrudan yolları yoktur ve bu şekilde tasarlanmıştır. eToken protokolünü kolaylaştıran hizmetler ve kullanıcılar kendi risk hafifletme ve filtreleme ile ilgili bir araya gelmelidir. Farklı düzeyde düzeyde bir sansür organı olarak merkezi bir otorite olmadan eToken protokolünü güvenli bir şekilde yönlendirmenin yolları ve uygulamalarından eminiz.</p><p>‍</p>",
            short_content:
                "Temmuz'da eCash Günü kutlaması için Twitter Space & AMA'ya ev sahipliği yaptık. Aşağıda, Q&A oturumunun daha fazla ayrıntılı olarak ele geçi",
            type: 'Blog',
            media_link: '',
            publish_date:
                'Fri Jul 01 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'twitter-space-ecash-gunu-kutlamasi-icin-gerceklesen-ama-etkinligi',
            createdAt: '2023-06-20T22:49:21.092Z',
            updatedAt: '2023-06-21T21:46:57.047Z',
            publishedAt: '2023-06-20T22:49:21.087Z',
            legacy_image: '/images/62bf74ffb18507c1bea4df90_TR.png',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 56,
                    attributes: {
                        name: '62bf74ffb18507c1bea4df90_TR.png',
                        alternativeText: null,
                        caption: null,
                        width: 320,
                        height: 192,
                        formats: {
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_62bf74ffb18507c1bea4df90_TR_dbe7491818.png',
                                hash: 'thumbnail_62bf74ffb18507c1bea4df90_TR_dbe7491818',
                                mime: 'image/png',
                                name: 'thumbnail_62bf74ffb18507c1bea4df90_TR.png',
                                path: null,
                                size: 77.61,
                                width: 245,
                                height: 147,
                            },
                        },
                        hash: '62bf74ffb18507c1bea4df90_TR_dbe7491818',
                        ext: '.png',
                        mime: 'image/png',
                        size: 43.52,
                        url: '/uploads/62bf74ffb18507c1bea4df90_TR_dbe7491818.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:00:02.524Z',
                        updatedAt: '2023-06-21T20:00:02.524Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 54,
        attributes: {
            title: 'Twitter Space & AMA for the eCash Day Celebration',
            content:
                '<p>On July 1st, we hosted a Twitter Space &amp; AMA for the eCash Day celebration. Below is the recap of the Q&amp;A session in more details.</p><p>‍</p><p><strong>1- I know you are solving problems that could never be solved before. Your job is not easy. </strong><br><strong>Is avalanche ready for production? What is the latest situation? This is the question that everyone is most curious about.</strong></p><p>‍</p><ul><li>Avalanche is close to launch. Out of an abundance of caution, we are waiting to run additional tests before rolling this technology out on mainnet.&nbsp; Development will continue after launch. There are many more features&nbsp; to implement, which can be reviewed at avalanche.cash&nbsp;</li></ul><p>‍</p><p><strong>2- What can you tell us about the available funding for eCash? What stage is GNC at?</strong></p><p>‍</p><ul><li>We have received a good number of high quality proposals. Several have been accepted. Right now GNC spending is about in line with revenue. But the GNC has good reserves accumulated from the last few years which are also available should additional proposals attract enough support.<br><br>The GNC as an institution is still very new. Substantial improvements have been made to processes and procedure, and more are planned.. The GNC is pretty unique in its structure and it’s an iterative process of getting it to work fluidly. We will keep working on functions for the GNC. The ultimate goal is to add value to eCash in the most efficient way possible.<br><br></li></ul><p><strong>3- Do you plan to publish a weekly newsletter?</strong></p><p>‍</p><ul><li>We have started to release regular monthly updates on Twitter in addition to our regular content, now managed by a full time social media manager. If there is enough interest from the community, we can also release an email newsletter.&nbsp; Our Social Media such as Twitter and Telegram groups are the best ways to stay up to date (You can find all of them on <a href="https://ecash.community">ecash.community</a>). We also have a few blog posts in the pipeline which will come out soon. Our Community Member <a href="https://www.getrevue.co/profile/ecashinformer?via=twitter-profile">eCash Informer</a> is planning on creating an unofficial newsletter, when he hits enough subscribers.<br><br></li></ul><p><strong>4- Will XEC be listed on new exchanges? Do you have any work on this and similar issues?</strong></p><p>‍</p><ul><li>The eCash team is continually reaching out to new exchanges and partners as part of regular business operations, with new exchange listings in the pipeline. What the community and users can do to improve our chances is to also request the listing of eCash on their favorite exchange. If we signal enough demand, exchanges might feel inclined to prioritize the listing of eCash.</li></ul><p>‍</p><p><strong>5- BCHA rebranded as eCash XEC in July 2021. BCH is still there. I think BCH is seriously losing blood. Have you received an offer for BCH to join you?</strong></p><p>‍</p><ul><li>BCH and eCash are totally separate projects and there is no chance or technical way to have them join together.</li></ul><p>‍</p><ul><li>Any developer previously working on BCH is welcome to continue their work on eCash. Since the base technology is similar, we also welcome the BCH projects who are interested to launch on eCash. Especially when it comes to eToken projects (Also known as Simple Ledger Protocol). eCash will continue to support eToken infrastructure and is building out a comprehensive developer toolkit to revamp the many already existing developer tools, many of which are already familiar to bitcoin developers.</li></ul><p>‍</p><p><strong>6- We became a family. I follow the eCash team on bitcoinabc.org. Don\'t you have a group photo? I\'m curious about other developer team. I\'m curious about your workplace, your working environment.</strong></p><p>‍</p><ul><li>We work remotely in different parts of the world, so we have not yet had every team member in the same place at the same time. Some team members are anonymous, although they can be followed by their work and code. Non-anonymous members are on LinkedIn.&nbsp;</li></ul><p>‍</p><p><strong>7- Are there any features that make the eCash network superior to the Bitcoin network? If so, what are these features?</strong></p><p>‍</p><ul><li>We have a clear and achievable roadmap focused on scalability and usability, which we have been working through Many projects these days see the roadmap as some kind of marketing gimmick. eCash is a mission-driven project that has achieved key milestones and will continue to work through more in the future.</li></ul><ul><li>eCash protocol revenue allows politically independent and sustained development, even in a bear market environment. Development direction on bitcoin and other projects has in the past been influenced by large donors whose interests do not necessarily align with those of the holders.&nbsp;</li></ul><p>‍</p><ul><li>These days, most crypto analysts consider BTC a “store of value.” eCash is building world money. So, it needs to be a store of value, and also a practical medium of exchange”. Compared to BTC, this takes more development work.</li></ul><p>‍</p><ul><li>eCash supports opt-in privacy with Cashfusion, which is not viable on BTC due to its relatively high transaction fees.</li><li>The addition of Avalanche adds a lot of great features such as instant finality, potential for subchains, and easier upgradability. This feature will also allow eCash to compete with BTC’s dominant security position.</li></ul><p>‍</p><p><strong>8- The Luna UST issue damaged the confidence in the market. Markets have turned into a bloodbath. As in the whole world, people faced serious damages. What precautions will the eCash team take against such attackers in the future? <br><br></strong></p><ul><li>eCash is a fork of Bitcoin, meaning it’s</li></ul><ol><li>It’s built on a strong technical foundation that has lasted for 12 years already, and</li><li>Coins are already fairly distributed through 12 years of proof of work mining. <br><br></li></ol><ul><li>So,eCash is not subject to the same ponzi scheme problems that plagued Luna and other new projects in the cryptospace. These coins get a lot of attention because it looks like a lot of “free” money is being handed out. But usually the supply on such projects is overwhelmingly controlled by the founders, with predictably bad results.</li></ul><p>‍</p><p><strong>9- Where do you see eCash XEC in the world of the future? What kind of conveniences will eCash provide in the future? Where do you see yourself in 3 to 10 years?</strong></p><p>‍</p><ul><li>eCash is building censorship resistant money for the world. To get there, we need to be competitive with major world currencies like the USD, and also popular global commodities like gold. Both of these items have known problems that we are trying to solve. <br><br>In the case of USD and other fiat currencies, most people rely on a central bank not to inflate their savings away, as well as their neighborhood bank not to gamble their money away.<br><br>In the case of gold, it is subject to increasingly complicated legal restrictions.<br><br>eCash aims to preserve the features people love about money and gold – wealth, portability, security, privacy – while combating the increasing restrictions placed on these ancient technologies by states and failing banks.&nbsp;</li></ul><p><br></p><ul><li>For this to happen we need to build world class infrastructure and have an entrepreneurial developer culture building products and services using eCash. We are working to build this at the same time we are working to build the node software.</li></ul><p><br></p><p>‍</p><p><strong>10- How much of eCash do exchanges own or what percentage were given to them? Is eCash considering establishing a decentralized exchange in the future? How will they fight the manipulations of centralized exchanges and whales?</strong></p><p>‍</p><ul><li>eCash has a pre-existing distribution and the supply is mined and not controlled by any person or team. So exchanges only own what they earned over the years through user deposits and trades. This is a key distinction for eCash compared to other new cryptocurrencies – eCash supply is not controlled by the team. Exchanges that list eCash were not offered any listing fee or any portion of the supply.<br></li></ul><p>‍</p><p><strong>11- I find Amaury\'s work very valuable for humanity, but what will happen to eCash if he leaves eCash. In many projects, the project collapsed when the Founder left and something bad happened to him. Will eCash be able to move on without him?</strong></p><p>‍</p><ul><li>Startup companies call this “key man risk.” However, eCash is not a company, it is an open source protocol. Amaury is a tremendous technical leader and asset to eCash. A successful cryptocurrency needs both good leadership and political independence. If it cannot succeed without a single person’s participation, then it is already a failed project.<br><br>You can look to the success enjoyed by bitcoin after the departure of Satoshi Nakamoto. <br>The point of a decentralized protocol like eCash is that it can move on, even without its founder.</li></ul><p>‍</p><p><strong>12- Frankly, I think Bitcoin is a scam project even though it was a groundbreaking technology at the beginning. I think that exchanges with constant manipulation are selling non-existent BTCs. There is manipulation in the stock market, but not this much. My heart is in favor of the BTC reset. Even if we reset and reset to a beautiful crypto world, I think that altcoins will take a sigh of relief and get the value they deserve. I\'m curious about the Bitcoin ABC team\'s opinion on this. Does the crypto world need a reset? How will eCash, a BTC fork, be affected if BTC resets?</strong></p><p>‍</p><ul><li>We agree that BTC got off track from the goal of building a global electronic cash system and that is actually how the Bitcoin ABC project came to be, leading us to eCash today. Still, the empirical ‘real world’ testing that occured on BTC is invaluable for future projects like eCash. Proof of work mining is today a tested fair way for coin distribution, unlike other schemes like Luna which have led to wealth destruction. One of the greatest features of cryptocurrency is that transactions cannot be undone. Reversing transactions is what banks and state actors are doing today to create political interference with money – the goal of eCash is to avoid this influence.<br></li></ul><p>‍</p><p><strong>13- What is your best guess of when eCash will reach the 5 million txs/sec target? Is there a technical solution, a roadmap? Or will you conclude with a trial and error method?</strong></p><p>‍</p><ul><li>We have a technical roadmap that will create a system that is able to handle those levels of usage. It’s important that we pace major technical changes prudently in line with blockspace demand and available resources. <br><br>So, it’s not trial and error. It’s constantly iterating and making sure that the technology is always comfortably ahead of scaling demands. We think BTC made a major mistake by allowing transaction demand to sprint past its supported software scale. <br><br>It’s not just a developer problem though. For now, the technology is far ahead of real world demand for crypto transactions in commerce. Entrepreneurs, businesses, and users who are more than traders will all play an important part in reaching world scale.</li></ul><p>‍</p><p><strong>14- Do you feel comfortable with the stage reached from July 2021 to this time in terms of writing code? Has technology advanced?</strong></p><p>‍</p><ul><li>Software can always be better. Software also does not exist in isolation – it runs on computers, which are always improving and changing. So there will always be improvements to make.<br><br>We have made substantial progress, but at the same time there is still and always will be lots of work to do.<br><br>We would love to implement things faster. However, crypto development isn’t the same as something like Snapchat. If we rush something and release a critical bug, the consequences would be worse than someone not seeing a picture or seeing the wrong data on their Facebook profile. So, testing and simulating adversarial environments are an important part of our development process. <br><br>We are also looking to expand the team as resources allow us to have more developers contribute to the technology advancement needed at the infrastructure level.<br></li></ul><p>‍</p><p><strong>15- What do you hope eCash (and crypto in general) will eventually achieve?</strong></p><p>‍</p><ul><li>Crypto development is a technological arms race for the defense of personal freedom. eCash is the technology of financial freedom.<br><br>Today, most people have limited choice when it comes to the money they use. They are vulnerable to local political decisions inflating their savings away or even freezing their funds. <br><br>eCash is an open source technology designed to combat these effects.&nbsp;</li></ul><p>‍</p><ul><li>There are different ways eCash can achieve this goal, whether it is used as world money accepted everywhere or more of a “lifeboat” scenario, where people around the world can use it as a fallback or emergency mechanism in an alternative economy.</li></ul><p>‍</p><p><strong>16- Confidence in central money and banks is decreasing in the world. This is what attracts people to crypto. Do you think Bitcoin will grow even more? As Hal Finney said in 2009, bitcoin will reach $10 million. Do you agree that bitcoins have to become very expensive in order to become successful and secure?</strong></p><p>‍</p><ul><li>Bitcoin will probably continue to grow, though at a much slower rate than its early rise when it was the only game in town. Bitcoin is not the most compelling technology on the market, but, as you say, its competitors like central banks are getting even worse. <br><br>If bitcoin had scaled to match user demand, then bitcoin becoming very expensive would have indeed made it more successful and more secure. Unfortunately, it’s had the opposite effect. Most bitcoin is held by large whales who do not transact with it, and small transactions – which make up the overwhelming majority of day to day economic activity for most people – are not practical on bitcoin. <br><br>Advances in crypto technology like Avalanche allow bitcoin-level security for smaller projects. For eCash, an increase in price and popularity will not have the detrimental impact seen on bitcoin.&nbsp;</li></ul><p>‍</p><p><strong>17- This is a groundbreaking project. Central banks are watching you by putting them on their radar. Do you feel any political pressure on you?</strong></p><p>‍</p><ul><li>Satoshi had the right ideas about this. It’s important to compete, but that doesn’t mean running around and trying to start fights. The more technology you develop under the radar, the greater your future impact will be.<br><br>We always have to be prudent just by the nature of the project. Competition with central banks is inevitable - it means you are succeeding.</li><li><br></li></ul><p>‍</p><p><strong>18- Are we in the bear season now, how long do you think this will last?</strong></p><p>‍</p><ul><li>The eCash team has been through a few bear markets. It looks like we are in another one. Typically, things trade sideways until the next halvening. eCash has the same halvening schedule as bitcoin. We are using this time to continue building out next-generation crypto tech to be production ready well before the next up cycle.<br><br>Of course, it’s impossible to really predict these things. No one would be upset if rising crypto prices came early.</li></ul><p>‍</p><p><strong>19- How many projects are there that integrate the avalanche consensus that eCash is trying to achieve into their own network?</strong></p><p>‍</p><ul><li>The only one that we know of is AVAX, which was engineered for its exclusive use after efforts to include the mechanism on BCH didn’t pan out. <br><br>eCash\'s Avalanche Consensus code is totally separate from Avax and being built completely independently by the Bitcoin ABC team. So, eCash will be the first project to include Avalanche on a proof of work system (ironically, this was the initial intention when the Avalanche whitepaper came out). This means eCash has decentralized bootstrapping which enables eCash Nodes to trustlessly enter the Avalanche quorum based on the security of Nakamoto Consensus. It also means we retain the proven security and supply distribution system of bitcoin.</li></ul><p><br></p><ul><li>eCash is unique in combining Avalanche Consensus with Nakamoto Consensus to maximize the advantages of each one and mitigate their weak points.<br></li></ul><p>‍</p><p><strong>20- Is eCash used in metaverse technology to buy something in the virtual world?</strong></p><p>‍</p><ul><li>We’re not currently aware of a project that has integrated eCash in this way, but the eCash technology is ready for this kind of integration. Someone looking to build out this kind of system could apply to the GNC to get started.</li></ul><ul><li>Going forward we are hoping to have many entrepreneurs build all kinds of projects on eCash. Any projects that add value to the eCash ecosystem should apply for GNC funding.</li></ul><p><br><br></p><p><strong>21- How did @deadalnix and @AntonyZegers first meet? Based on my observations I feel like that meeting could go down as a pivotal moment in eCash history.</strong></p><p>‍</p><ul><li>[Antony answer]: Amaury and I met in 2016 in San Francisco at a small Bitcoin conference organized by Bitcoin Unlimited (BU) (<a href="https://medium.com/@peter_r/satoshis-vision-bitcoin-development-scaling-conference-dfb56e17c2d9">https://medium.com/@peter_r/satoshis-vision-bitcoin-development-scaling-conference-dfb56e17c2d9</a>). After meeting him, I recognized his talent and vision for how to scale Bitcoin, and started trying to convince BU to accept his help, then helped him launch Bitcoin Cash, run Bitcoin ABC, and eventually launch eCash.</li></ul><p>‍</p><p><strong>22- Really looking forward to Avalanche on eCash. I would love to know more about where the future staking will be. I\'d love a big XEC staking pool that we connect our cashtab to. For our safety in case the exchange freezes accounts!</strong></p><p>‍</p><ul><li>Staking rewards haven’t been implemented yet but it is planned. The details are yet to be worked out. Staking isn’t just for the purpose of locking up coins. It is also important for stakers to run a validating node that participates actively in Avalanche Consensus. At the beginning staking is likely to be more something for technical users with a Bitcoin ABC node. In the future pools may emerge, similar to mining pools.</li></ul><p>&nbsp;</p><p><br><br></p><p><strong>23- All cryptos talk about decentralization, but we see that this is not actually the case.&nbsp; Headlines like "Here\'s our CEO".&nbsp; But how does eCash call itself in this regard?</strong></p><p>‍</p><ul><li>The number one way you can tell that eCash is not like these projects is because it inherited bitcoin’s supply distribution without making any changes or allowances for the team. This is rare in crypto, especially in the last bull market which was dominated by “token” projects distributing all kinds of tokens to founders and investors. eCash avoided this trap.<br><br>The eCash protocol as a Bitcoin Fork is very decentralized. The Avalanche implementation is also built to be completely decentralized without a central point of trust. Bitcoin ABC is the project that is devoted to working on eCash and receives funding directly from the protocol without any corporate backers, which makes it very independent with incentives aligned to eCash’s success.<br><br></li></ul><p><strong>24- Do you have any ideas about advertising? How will you announce eCash to the whole world? When I can see the shops around the world having a sign saying "we accept #ecash"?</strong></p><p>‍</p><ul><li>Merchant adoption is a powerful idea. We’ve seen campaigns that try to get stores to accept crypto in a top-down manner have limited success. For example, BCH has taken this as its dominant strategy, and the results have been disastrous.&nbsp;</li><li>eCash aims for a “bottom-up” grassroots approach to merchant adoption. You have to build money that is compelling enough for people to want to use it. Then stores follow.</li><li>We are hoping to do more advertising in the future. It’s important to be good stewards of eCash protocol revenue, spending it on the best available impact. Some marketing is necessary, but it’s important to avoid vanity projects or spending money just to say you did something (especially when you can’t even measure the result). The best marketing is when you have a passionate community. People can also apply for funding for that.<br><br><strong><br></strong></li></ul><p><strong>25- When will eCash be able to be natively stored on ledger wallets?</strong></p><ul><li>We are in direct contact with Ledger and other wallet providers to implement native eCash support. It is not in our hands how and when wallet services chose to enable support. The good part about eCash is that as a Bitcoin fork it is fairly easy for providers to implement it by simply reusing the same Bitcoin code with small changes in endpoints. In the meantime, we have produced a guide for using Ledger hardware wallet using a workaround of the BCH support: <a href="https://www.bitcoinabc.org/2022-02-03-hardware-wallet-workarounds/">https://www.bitcoinabc.org/2022-02-03-hardware-wallet-workarounds/</a>&nbsp;</li></ul><p>‍</p><p><br><br></p><p><strong>26- You guys keep working to get the time of transaction faster??</strong></p><p>‍</p><ul start="5"><li>Yes. Transactions from wallet to wallet are already near instant for 0-confirmation suitable for low-value transfers. With the Avalanche Pre-Consensus update, transactions will become securely finalized almost instantly. Right now many exchanges rely on confirmations of about 10 and up, but with the Avalanche Post-Consensus update exchanges can finalize the transaction after just 1 Block. Later on we will also enable instant-finalization of transactions within seconds. Meaning exchanges can securely credit your deposits after seconds.<br><br></li></ul><p><strong>27- Why do you think avalanche is better than other governance coins? What makes it different? And are you planning on making a stable coin too?</strong></p><p>‍</p><ul><li>Our Avalanche Consensus implementation is not related to AVAX. We implement the consensus protocol on top of our Nakamoto Consensus (Proof of Work), there is no integration with AVAX or any governance coin.</li><li>Avalanche is a very new invention and very efficient. Nodes can coordinate and come to a finalized consensus very quickly, contrary to how Nakamoto confirmations work, which are slow. Its drawback is that it is not entirely trustless, but that is where eCash’s Nakamoto Consensus kicks in. The benefits of combining both makes it so powerful and balances out the drawbacks of both consensus mechanisms.&nbsp;</li><li>For stable coins, the best solution would likely be to encourage USDC or another reputable large stable coin to launch on eToken. Tether did this in the past on the same eToken protocol used by eCash, so we are already technically ready for this step.</li></ul><p><br><br></p><p><strong>28- What is the estimated time for the project to be fully operational?</strong></p><p>‍</p><ul><li>eCash is already ‘fully operational,’ in the sense that its technical capacity is much greater than current transaction throughput. Avalanche will enhance user experience still further.&nbsp;</li><li>Software can always be improved. Decades from now, the computers running eCash will be different, and eCash development will make improvements to best take advantage of advancing technology.</li><li>It’s frustrating that crypto roadmaps can’t be more exact. This is common across the industry. Even with ETH’s major ETH 2.0 upgrade, in the pipeline for years, there has never been an exact date. As new issues and problems are discovered, work is undertaken to solve them. The same thing happens in other human endeavors like construction. Even things that are more routine and easier to plan, like airline travel, often miss the mark.</li><li>You can see the constant dev progress on eCash at https://reviews.bitcoinabc.org/feed/<br>&nbsp;<br></li></ul><p><strong>29- Why don\'t you support the Arabic language?</strong></p><p>‍</p><ul><li>If you have a suggestion or request for localization of our website or services, please reach out to us via twitter (<a href="https://twitter.com/eCashOfficial">https://twitter.com/eCashOfficial</a>) or to our Community Managers over Telegram (<a href="https://t.me/ecash_official">https://t.me/ecash_official</a>) and we will make sure to add your language and reference currencies as soon as possible. We are also starting a translation campaign and welcoming anyone in the community who is interested to join and help with translating against compensation and rewards. More on that soon…</li></ul><p><br><br></p><p><strong>30- My Question is related to CashFusion, how will it work? What will be the practical application in the real world?&nbsp;</strong></p><ul><li>Cashfusion is already working in the real world. You can run Cashfusion using the Electrum wallet. In practice, you send coins to the wallet. The wallet then conducts a number of “fusion” transactions to obfuscate the past transaction history of those coins. So any transactions you make with them in the future are much harder to link with your identity.</li></ul><p>‍</p><p><strong>31- Where can I list my eCash token for the exchanges?</strong></p><ul><li>There are no eToken exchanges yet. The GNC has approved the creation of a Decentralized eToken exchange (DEX) created by Chris Troutner from the Permissionless Software Foundation (<a href="https://twitter.com/christroutner">https://twitter.com/christroutner</a>).&nbsp;</li></ul><p>‍</p><p><strong>32- Can you ensure the eCash ecosystem will exist and grow?</strong></p><ul><li>Yes. Our funding mechanism provides resources to maintain our infrastructure and for ecosystem expansion. We think twice about what we want to implement, but when we do, we are committed to it and make sure that it will be well produced and maintained. Be it the continuation of the eToken protocol (former SLP) or the implementation of Electrum ABC wallet software or Cashfusion and many more.</li></ul><p><br><br></p><p><strong>33- One of my questions is: how to understand the relationship between etoken and XEC? eToken is created according to the ideas of individuals or organizations, so the xec project party wants to see what kind of eToken is created. (This is also to answer the question of how supporters should support the XEC project.) And whether there will be some financial or technical support for high-quality and potential etoken projects in the future.&nbsp;</strong></p><ul><li>The eToken protocol is a decentralized protocol. Through its permissionless nature there are no direct ways to disallow or regulate activities by any authority and it was designed to be that way. Services and users facilitating the eToken protocol have to come up with their own risk mitigation and filtering. We are confident that there are ways and practices on different levels to safely navigate the eToken protocol, without a central authority as a censoring body.</li></ul><p>‍</p>',
            short_content:
                'On July 1st, we hosted a Twitter Space & AMA for the eCash Day celebration. Below is the recap of the Q&A session in more details.',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Fri Jul 01 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'twitter-space-ama-for-the-ecash-day-celebration',
            createdAt: '2023-06-20T22:49:07.680Z',
            updatedAt: '2023-06-21T21:46:10.691Z',
            publishedAt: '2023-06-20T22:49:07.670Z',
            legacy_image: '/images/62bf1ff47ee2118b5e9adcbb_EN.png',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 57,
                    attributes: {
                        name: '62bf1ff47ee2118b5e9adcbb_EN.png',
                        alternativeText: null,
                        caption: null,
                        width: 320,
                        height: 193,
                        formats: {
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_62bf1ff47ee2118b5e9adcbb_EN_5badc486df.png',
                                hash: 'thumbnail_62bf1ff47ee2118b5e9adcbb_EN_5badc486df',
                                mime: 'image/png',
                                name: 'thumbnail_62bf1ff47ee2118b5e9adcbb_EN.png',
                                path: null,
                                size: 77.47,
                                width: 245,
                                height: 148,
                            },
                        },
                        hash: '62bf1ff47ee2118b5e9adcbb_EN_5badc486df',
                        ext: '.png',
                        mime: 'image/png',
                        size: 43.27,
                        url: '/uploads/62bf1ff47ee2118b5e9adcbb_EN_5badc486df.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T20:00:06.338Z',
                        updatedAt: '2023-06-21T20:00:06.338Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 53,
        attributes: {
            title: 'eCash 日庆祝活动 Twitter Space 和 AMA',
            content:
                '<p>7 月 1 日，我们为 eCash 日庆祝活动举办了 Twitter 空间和 AMA。 以下是问答环节的详细回顾。</p><p>‍</p><p>‍</p><p><strong>1-我知道您正在解决以前无法解决的问题。</strong></p><p><strong>雪崩是否开发完成？最新情况如何？这是大家最好奇的问题。</strong></p><p>‍</p><ul><li>雪崩即将发布。出于谨慎考虑，我们正在等待在主网上推广这项技术之前进行额外的测试。发布后将继续开发。还有更多功能要实现，有兴趣的可以在 avalanche.cash 上查看</li></ul><p>‍</p><p><strong>2- XEC 代币基金的意义何在？ GNC处于什么阶段？</strong></p><p>‍</p><ul><li>我们收到了大量高质量的提案。有几个已被接受了。目前 GNC 的支出与收入差不多。但 GNC 在过去几年中积累了良好的储备，如果其他提案获得足够的支持，也可以使用这些储备。<br></li></ul><ul><li>GNC 作为一个机构仍然很新。已经对流程和程序进行了实质性改进，并且计划进行更多改进。 GNC 在其结构上非常独特，它是一个让它流畅工作的迭代的过程。我们将继续为 GNC 开发功能。最终目标是以最有效的方式为 eCash 增加价值。</li></ul><p><br></p><p><strong>3- 您是否打算再次发布每周时事通讯？</strong></p><p>‍</p><ul><li>除了常规内容外，我们还开始在 Twitter 上发布每月定期更新，现由全职社交媒体经理管理。如果社区有足够的兴趣，我们还可以发布电子邮件通讯。关注我们的社交平台，如 Twitter 和 Telegram 群组是获得最新消息的最佳方式（您可以在 ecash.community 上找到所有这些）。我们还有一些即将发布的博客文章正在准备中。我们的社群成员 eCash Informer 计划在他获得足够多的订阅者时创建一个非官方的时事通讯。<br><br></li></ul><p>‍</p><p><strong>4- XEC 会在新交易所上币吗？你在这个类似的问题上有什么计画吗？</strong></p><p>‍</p><ul><li>作为常规业务运营的一部分，eCash 团队不断接触新的交易所和合作伙伴，大部分新的交易所上市正在筹备中。社群和用户可以做些什么来提高我们的机会，也可以让在他们最喜欢的交易所上币 eCash。如果用戶发出足够的需求，交易所可能会倾向于优先考虑 eCash 的上币。</li></ul><p>‍</p><p><strong>5- BCHA 于 2021 年 7 月更名为 eCash XEC。 BCH 仍然存在。我认为 BCH 正在严重失血。您是否收到来自BCH 团队加入的申请？</strong></p><p>‍</p><ul><li>BCH 和 eCash 是完全独立的项目，无法以技术方式将它们结合在一起</li><li>欢迎任何以前在 BCH 工作过的开发人员继续他们在 eCash 上的工作。由于基础技术类似，我们也欢迎有兴趣在 eCash 上启动的 BCH 项目。特别是在涉及 eToken 项目（也称为简单分类帐协议）。 eCash 将继续支持 eToken 基础设施，并正在构建一个成熟的开发人员工具包，以改造许多现有的开发人员工具，其中许多已经为比特币开发人员所熟悉。</li></ul><p>‍</p><p><strong>6- 我们是一家人。我在 bitcoinabc.org 上关注 eCash 团队，尽管我不了解这项工作。是否有照片？我见过 Amaury，但我对其他开发团队很好奇。我很好奇你的工作场所，你的工作环境。</strong></p><p>‍</p><ul><li>我们在世界不同的地方远程办公，所以我们还没有让每个团队成员同时在同一个地方。一些团队成员是匿名的，尽管如此也可以追踪他们的工作进度和代码。非匿名成员可以在 LinkedIn上找到。</li><li>我们通常在世界不同的地方远程工作， 因此没有集体照片。</li></ul><p>‍</p><p><strong>7- 是否有任何功能使 eCash 网络优于比特币网络？如果有，有哪些功能？</strong></p><ul><li>我们有一个清晰且可实现的路线图，专注于可扩展性和可用性，我们一直在努力实现其他项目方作为营销噱头的产品成为事实。 eCash 是一个任务驱动的项目，已经实现了重要的里程碑，并将在未来继续努力。即使在熊市环境中，eCash 协议收入也允许独立和持续发展。过去，比特币和其他项目发展方向受到大型捐助者的影响，这些捐助者的利益不一定与持有者的利益一致。如今，大多数加密货币分析师认为 BTC 是一种“价值存储”。 eCash 正在建立世界货币。因此，它需要成为一种价值储存手段，同时也是一种实用的交易媒介”。 与 BTC 相比，这需要更多的开发工作。</li></ul><p>‍</p><ul><li>eCash 通过 Cashfusion 支持加入隐私，由于其相对较高的交易费用，这在 BTC 上是无法达成的。</li></ul><p>‍</p><ul><li>随着雪崩的加入，我们添加了许多很棒的功能，例如即时确定性、子链的潜力和更容易升级。此外，它还将能够在安全性方面与 BTC 竞争。</li></ul><p>‍</p><p><strong><br>8- Luna UST 问题损害了市场信心。市场变成了一场恶梦。与全世界一样，土耳其人民也面临着严重的损失。 eCash 团队未来会针对此类攻击者采取哪些预防措施？对此你有什么想说的？</strong></p><p>‍</p><p>eCash 是比特币的一个分支，这意味着它是</p><ul><li>它建立在已经持续了 12 年的强大技术基础之上，并且</li></ul><ul><li>通过 12 年的工作证明挖矿，硬币已经公平分配。</li></ul><p>‍</p><p>因此，eCash 不会受到像 Luna和其他新项目的相同庞氏骗局问题的影响。这些硬币引起了很多关注，因为看起来有很多“免费”的钱正在发放。但通常此类项目的供应绝大多数由创始人控制，结果可想而知。</p><p>‍</p><p><strong>9- 您认为 eCash XEC 在未来世界的应用有哪些方面呢？ eCash 未来会提供什么样的便利功能？您怎么看 3 到 10 年内自己的市场定位？</strong></p><p>‍</p><ul><li>eCash 正在为世界建立抗审查货币。为了实现这一目标，我们需要与美元等主要世界货币以及黄金等流行的全球商品竞争。这两个项目都有我们正在尝试解决的已知问题。在美元和其他法定货币的情况下，大多数人依靠中央银行不夸大他们的储蓄，以及银行不随意他们的钱进行投资。就黄金而言，它受到越来越复杂的法律限制。eCash 旨在保留人们对金钱和黄金的喜爱——财富、便携性、安全性、隐私——同时对抗国家和破产银行对这些古老技术施加的越来越多的限制。</li></ul><p>‍</p><ul><li>为此，我们需要建立一个世界一流的基础设施，并服务于使用 eCash 构建产品的创业开发者。我们正在努力构建它，我们也在努力构建节点软件。</li></ul><p>‍</p><p><strong>10-中心化交易所拥有多少eCash或他们给了他们多少百分比？ eCash 是否考虑在未来建立去中心化交易所？ 他们将如何对抗中心化交易所和鲸鱼的操纵？</strong></p><p>‍</p><ul><li>eCash 具有预先存在的分配，并且供应是开采的，不受任何个人或团队控制。因此，交易所只拥有他们多年来通过用户存款和交易获得的收益。这是 eCash 与其他新加密货币相比的一个关键区别——eCash 的供应不受团队控制。上市 eCash 的交易所没有提供任何上市费用或任何部分供应。</li></ul><p>‍</p><p><strong>11- 我发现 Amaury 的工作对人类非常有价值，但如果他离开 eCash，eCash 会发生什么。 在许多项目中，当创始人离开并且发生了一些不好的事情时，项目就崩溃了。 没有他，eCash 还能继续前进吗？</strong></p><p>‍</p><ul><li>初创公司将此称为“关键人物风险”。 然而，eCash 不是一家公司，它是一个开源协议。 Amaury 是 eCash 的杰出技术领导者和资产。 成功的加密货币需要良好的领导力和政治独立性。 如果没有一个人的参与就无法成功，那么它已经是一个失败的项目。你可以看看中本聪离开后比特币所取得的成功。像 eCash 这样的去中心化协议的重点在于，即使没有创始人，它也可以继续前进。</li></ul><p>‍</p><p><strong>12- 坦率地说，我认为比特币是一个骗局项目，尽管它一开始是一项开创性的技术。我认为不断操纵的交易所正在出售不存在的 BTC。股市存在操纵，但没有这么多。我的赞成 BTC 重置。即使我们重置并重置为一个美丽的加密世界，我认为山寨币也会松一口气，并获得应有的价值。我很好奇比特币 ABC 团队对此的看法。加密世界需要重置吗？如果 BTC 重置，eCash（一个 BTC 分叉）将如何受到影响？</strong></p><p>‍</p><ul><li>我们同意 BTC 偏离了建立全球电子现金系统的目标，这实际上就是比特币 ABC 项目的由来，引領我们今天进入 eCash。 尽管如此，在 BTC 上进行的经验性“现实世界”测试对于 eCash 等未来项目来说是无价的。 与 Luna 等其他导致财富破坏的计划不同，工作量证明挖矿如今是一种经过验证的公平分配硬币的方式。 加密货币的最大特点之一是交易无法撤消。 逆转交易是当今银行和国家行为者为对货币造成政治干预而做的事情——eCash 的目标是避免受到这种影响。</li></ul><p>‍</p><p><strong>13- 您对 eCash 何时达到 500 万笔/秒的目标的最佳猜测是什么？ 是否有技术解决方案、路线图？ 或者你会用试验方法结束吗？</strong></p><p>‍</p><ul><li>我们有一个技术路线图，将创建一个能够处理这些使用级别的系统。 重要的是，我们要根据区块空间需求和可用资源谨慎地调整重大技术变革的步伐。所以，这不是反复试验。 它不断迭代并确保技术始终领先于扩展需求。 我们认为 BTC 犯了一个重大错误，因为它允许交易需求冲刺超过其支持的软件规模。不过，这不仅仅是开发人员的问题。 目前，该技术远远领先于现实世界对商业加密交易的需求。 不仅仅是交易者、企业和用户都将在达到世界规模方面发挥重要作用。</li></ul><p>‍</p><p><strong>14-您对从 2021 年 7 月到现在的代码编写阶段感到满意吗？科技是否进步了？</strong></p><p>‍</p><ul><li>软件总是可以更好的。软件也不是孤立存在的——它运行在不断改进和变化的计算机上。所以总是有改进的余地。我们已经走了很长一段路，但与此同时，还有很多工作要做。我们希望更快地实现它。但是，加密开发与 Snapchat 之类的不同。如果我们急于发布而导致了一个严重错误，后果将比某人看不到照片或他们在 Facebook 个人资料上看到错误数据更糟糕。因此，测试和模拟对抗环境是我们开发过程的重要组成部分。我们还希望扩大团队，使我们能够让更多的开发人员为基础设施级别的需求技术进步做出贡献。</li></ul><p>‍</p><p><strong>15- 你希望 eCash（以及一般的加密货币）最终会实现什么？</strong></p><p>‍</p><ul><li>加密货币开发是一场捍卫个人自由的技术军备竞赛。 eCash 是财务自由的技术。今天，大多数人在使用金钱方面的选择有限。 他们很容易受到地方政治决策的影响，这些决策会夸大他们的储蓄甚至冻结他们的资金。eCash 是一种旨在对抗这些影响的开源技术。eCash 可以通过多种方式实现这一目标，无论是用作世界各地接受的世界货币，还是更多地用作“救生艇”的场景，世界各地的人们都可以将其用作替代经济中的储备或应急机制。</li></ul><p>‍</p><p><strong>16- 全球对中央货币和银行的信心正在下降。 这就是吸引人们使用加密货币的原因。 你认为比特币会增长更多吗？ 正如 Hal Finney 在 2009 年所说，比特币将达到 1000 万美元。 你同意比特币必须变得非常昂贵才能成功和安全吗？</strong></p><p>‍</p><ul><li>比特币可能会继续增长，尽管其增长速度比早期的增长速度要慢得多，但他任然是领先者。比特币并不是市场上最引人注目的技术，但正如你所说，它的竞争对手，比如中央银行，正变得越来越糟。如果比特币的规模可以满足用户需求，那么比特币变得非常昂贵确实会使其更成功、更安全。不幸的是，它产生了相反的效果。大多数比特币由不与之交易的大鲸鱼持有，而小额交易对大多数人来说构成日常经济活动，但绝大多数在比特币上并不实用。Avalanche 等加密技术的进步为小型项目提供了比特币级别的安全性。相对对于 eCash，价格和受欢迎程度的提高不会像一样比特币产生不利影响。</li></ul><p>‍</p><p><strong>17- 这是一个开创性的项目。 中央银行将它们放在他们的雷达上进行监督。 你觉得你有任何政治压力吗？</strong></p><p>‍</p><ul><li>中本聪对此有正确的想法。 竞争很重要，但这并不意味着四处奔波并试图开始战斗。 您在雷达下开发的技术越多，您对未来的影响就越大。我们始终必须谨慎对待项目的性质。 与中央银行的竞争是不可避免的这意味着我们正在成功。</li></ul><p>‍</p><p><strong>18-我们现在处于熊市季节，你认为这个糟糕的过程会持续多久？</strong></p><p><br></p><ul><li>eCash 团队经历了几次熊市。 看起来我们在另一个。 通常情况下，事情会横盘整理，直到下一次减半。 eCash 的减半时间表与比特币相同。 我们正在利用这段时间继续构建下一代加密技术，以便在下一个上升周期之前做好生产准备。当然，要真正预测这些事情是不可能的。 如果加密货币价格上涨来得早，没有人会感到不安。</li></ul><p>‍</p><p><strong>19- 有多少项目将 eCash 试图实现的雪崩共识整合到他们自己的网络中？</strong></p><p>‍</p><ul><li>我们所知道的唯一一个是 AVAX，它是专为自己使用而设计的，因为在 BCH 上包含该机制的努力没有成功。eCash 的雪崩共识代码完全独立于 Avax，由 Bitcoin ABC 团队完全独立构建。因此，eCash 将是第一个在工作量证明系统中包含雪崩的项目（具有讽刺意味的是，这是 Avalanche 白皮书发布时的初衷）。这意味着 eCash 更具有分散的引导，使 eCash 节点能够基于比特币共识协议的安全性无需信任地进入 Avalanche quorum。这也意味着我们保留了经过验证的比特币安全和供应分配系统。</li></ul><p>‍</p><ul><li>eCash 的独特之处在于将 Avalanche 共识与比特币共识协议相结合，以最大限度地发挥各自的优势并减轻各自的弱点。</li></ul><p>‍</p><p><strong>20- eCash 是否能在元宇宙中用于购买东西？</strong></p><p>‍</p><ul><li>我们目前不知道有哪个项目以这种方式整合了 eCash，但 eCash 技术已经为这整合做好了准备。想要建立这种系统的人可以向 GNC 申请。展望未来，我们希望有许多企业家在 eCash 上构建各种项目。任何想为 eCash 生态系统增加价值的项目都应提交申请。</li></ul><p><br></p><p><strong>21- @deadalnix 和 @AntonyZegers 是如何第一次见面的？ 根据我的观察，我觉得那次会议可能会成为 eCash 历史上的关键时刻。</strong></p><p>‍</p><ul><li>[安东尼回答]：Amaury 和我于 2016 年在旧金山举行的由 Bitcoin Unlimited (BU) 组织的小型比特币会议上相识（https://medium.com/@peter_r/satoshis-vision-bitcoin-development-scaling-conference- dfb56e17c2d9)。 见到他后，我认识到他在如何扩展比特币方面的才能和远见，并开始试图说服 BU 接受他的帮助，然后帮助他推出了比特币现金，经营比特币 ABC，并最终推出了 eCash。</li></ul><p>‍</p><p><strong>22- 非常期待eCash 上的雪崩。 我很想知道更多关于未来的质押将在哪里。 我希望我们将 Cashtab 连接到一个大型 XEC 质押池。 为了我们的安全，以防交易所冻结账户！</strong></p><p>‍</p><ul><li>质押奖励尚未实施，但已在计划中。细节还有待制定。质押不仅仅是为了锁定硬币。对于质押者来说，运行一个积极参与雪崩共识的验证节点也很重要。对于拥有比特币 ABC 节点的技术用户来说，一开始的质押需求可能很多。未来可能会出现池，类似于矿池。</li></ul><p>&nbsp;</p><p><strong>23 - 所有加密货币都在谈论去中心化，但我们发现事实并非如此。 像“这是我们的首席执行官”这样的头条新闻。 但是 eCash 在这方面是如何称呼自己的呢？</strong></p><p>‍</p><ul><li>你可以说 eCash 不像其他项目方因为它继承了比特币的供应分配，而没有为团队做任何改变或津贴。这在加密货币中是罕见的，尤其是在上一个由“代币”项目主导的牛市中，向创始人和投资者分发各种代币。 eCash 避开了这个陷阱。</li></ul><p>‍</p><ul><li>作为比特币分叉的 eCash 协议非常去中心化。 Avalanche 实施也被构建为完全去中心化，没有中心信任点。比特币 ABC 是一个致力于开发 eCash 的项目的团队，它直接从协议中获得资金，没有任何企业支持，这使得它非常独立，激励措施与 eCash 的成功相一致。</li></ul><p><br></p><p><strong>24- 你对广告有什么想法吗？您将如何向全世界宣布 eCash？我何时可以看到世界各地的商店 有一个标语写着“我们接受#ecash”的时候？</strong></p><p>‍</p><ul><li>商家采用是一个强大的想法。但我们已经看到试图让商店以自上而下的方式接受加密货币的活动取得了有限的成功。比如BCH就以此为主导策略，结果是灾难性的。</li><li>eCash 旨在为商家采用“自下而上”的草根方法。你必须建立足够吸引人的资金，让人们想要使用它。然后商店紧随其后。</li><li>我们希望在未来做更多的推广。 eCash 协议收入管理很重要需将其效果最大化。一些营销是必要的，但重要的是要避免虚荣或花钱只是为了说你做了某事（尤其是当你甚至无法衡量结果时）。最好的营销是当您拥有一个充满热情的社群时。人们也可以为此申请资金。<strong><br><br></strong></li></ul><p><strong>25- eCash 什么时候可以存储在ledger钱包中？</strong></p><p>‍</p><ul><li>我们与 Ledger 和其他钱包提供商直接联系以实施本地 eCash 支持。 钱包服务如何以及何时选择启用支持并不在我们手中。 eCash 的好处在于，作为比特币分叉，供应商很容易通过简单地重用相同的比特币代码并在端点上进行少量更改来实现它。 同时，我们制作了使用 BCH 支持的变通方法使用 Ledger 硬件钱包的指南：<a href="https://www.bitcoinabc.org/2022-02-03-hardware-wallet-workarounds/">https://www.bitcoinabc.org/2022-02-03-hardware-wallet-workarounds/</a>&nbsp;</li></ul><p><br></p><p><strong>26- 你们是否一直在努力争取更快的交易时间？？</strong></p><p>‍</p><ul><li>是的。从钱包到钱包的交易已经接近即时，适用于低价值转账的 0 确认。随着 Avalanche Pre-Consensus 更新，交易将几乎立即安全地完成。目前，许多交易所依赖于大约 10 次及以上的确认，但通过 Avalanche 共识后更新，交易所可以在 1 个区块后完成交易。稍后，我们还将在几秒钟内实现交易的即时完成。这意味着交易所可以在几秒钟后安全地记入您的存款。<br><br></li></ul><p><strong>27-为什么你认为雪崩比其他治理币更好？是什么让它与众不同？是否有制作稳定币的计画？</strong></p><p>‍</p><ul><li>我们的 Avalanche Consensus 实施与 AVAX 无关。我们在中本聪共识（工作证明）之上实施共识协议，没有与 AVAX 或任何治理币整合。</li><li>雪崩是一项非常新的发明并且非常有效。节点可以非常迅速地协调并达成最终共识，这与 Nakamoto 确认的工作方式相反，后者很慢。它的缺点是它并非完全无需信任，但这正是 eCash 的比特币共识协议 发挥作用的地方。将两者结合的好处使其如此强大，并平衡了两种共识机制的缺点。</li><li>对于稳定币，最好的解决方案可能是鼓励 USDC 或其他知名的大型稳定币在 eToken 上推出。 Tether 过去在 eCash 使用的相同 eToken 协议上执行此操作，因此我们在技术上已经为这一步做好了准备。<br></li></ul><p>‍</p><p><strong>28- 项目全面投入运营的时间预计是什么时候？</strong></p><ul><li>eCash 已经“全面运作”，因为它的技术能力远远大于当前的交易吞吐量。 雪崩将进一步提升用户体验。</li><li>软件总是可以改进的。 几十年后，运行 eCash 的计算机将有所不同，eCash 的开发将进行改进，以最好地利用先进的技术。</li><li>令人沮丧的是，加密路线图的時間無法很精确， 这在整个行业都很普遍。 即使 ETH 的主要 ETH 2.0 升级已经酝酿多年，也从来没有一个确切的日期。 当发现新的问题和问题时，就会着手解决这些问题。 同样的事情也发生在其他人类活动中，比如建筑。 即使是更常规、更容易计划的事情，比如航空旅行，也發生許多不確定性。</li><li>您可以在 https://reviews.bitcoinabc.org/feed/ 上查看 eCash 的持续开发进度</li></ul><p>&nbsp;</p><p><strong>29-为什么不支持阿拉伯语？</strong></p><p>‍</p><ul><li>如果您对我们的网站或服务的本地化有任何建议或要求，请通过 twitter (https://twitter.com/eCashOfficial) 或通过 Telegram (https://t.me/ecash_official) 联系我们的社群经理， 我们将确保尽快添加您的语言和参考货币。 我们还发起了一项翻译活动，并欢迎社区中任何有兴趣加入并帮助翻译补偿和奖励的人。 很快就会有更多信息……</li></ul><p><br></p><p><strong>30- 我的问题与CashFusion有关，它将如何运作？在现实世界中的实际应用是什么？</strong></p><p>‍</p><ul><li>Cashfusion 已经在现实世界中发挥作用。 您可以使用 Electrum 钱包运行 Cashfusion。 在实践中，您将硬币发送到钱包。 然后钱包会进行一些“融合”交易，以混淆这些硬币过去的交易历史。 因此您将来与他们进行的任何交易都很难与您的身份联系起来。</li></ul><p>‍</p><p><strong>31-我创造的eToken可以在哪些交易所上币?</strong></p><p>‍</p><ul><li>目前还没有 eToken 交易所。 GNC 已批准创建由 Permissionless Software Foundation (https://twitter.com/christroutner) 的 Chris Troutner 创建的分散式 eToken 交易所 (DEX)。</li></ul><p>‍</p><p><strong>32- 您能否确保 eCash 生态系统的存在和发展？</strong></p><p>‍</p><ul><li>是的。 我们的筹资机制为维护我们的基础设施和生态系统扩展提供了资源。 我们会三思而后行，但当我们这样做时，我们会致力于它并确保它会得到良好的生产和维护。 无论是 eToken 协议（前 SLP）的延续，还是 Electrum ABC 钱包软件或 Cashfusion 等的实施。</li></ul><p><br><br></p><p><strong>33-我的一个问题是：如何理解etoken和xec的关系？etoken是根据个人或组织的想法去创建，那么xec项目方更想要看到怎么样的etoken被创建出来。（这也是回答支持者们该如何支持xec项目的问题。）以及将来是否会对优质、具有潜力的etoken项目做一些资金或技术上的支持。</strong></p><p>‍</p><ul><li>eToken 协议是一种去中心化的协议。由于其无需许可的性质，没有任何直接的方法可以禁止或规范任何当局的活动，它就是这样设计的。促进 eToken 协议的服务和用户必须提出自己的风险缓解和过滤。我们相信，在没有中央机构作为审查机构的情况下，有不同级别的方法和实践可以安全地引导eToken 的协议。</li></ul><p>‍</p>',
            short_content:
                '7 月 1 日，我们为 eCash 日庆祝活动举办了 Twitter 空间和 AMA。 以下是问答环节的详细回顾。',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Fri Jul 01 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-ri-qing-zhu-huo-dong-twitter-space-he-ama',
            createdAt: '2023-06-20T22:48:56.775Z',
            updatedAt: '2023-06-21T21:47:24.187Z',
            publishedAt: '2023-06-20T22:48:56.769Z',
            legacy_image: '/images/62bf255238587b3932992d1d_CH.png',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 49,
                    attributes: {
                        name: '62bf255238587b3932992d1d_CH.png',
                        alternativeText: null,
                        caption: null,
                        width: 320,
                        height: 193,
                        formats: {
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_62bf255238587b3932992d1d_CH_532c06293f.png',
                                hash: 'thumbnail_62bf255238587b3932992d1d_CH_532c06293f',
                                mime: 'image/png',
                                name: 'thumbnail_62bf255238587b3932992d1d_CH.png',
                                path: null,
                                size: 77.42,
                                width: 245,
                                height: 148,
                            },
                        },
                        hash: '62bf255238587b3932992d1d_CH_532c06293f',
                        ext: '.png',
                        mime: 'image/png',
                        size: 43,
                        url: '/uploads/62bf255238587b3932992d1d_CH_532c06293f.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T19:58:35.267Z',
                        updatedAt: '2023-06-21T19:58:35.267Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 52,
        attributes: {
            title: 'eCash Day 축하 트위터 공간 및 AMA',
            content:
                '<p><strong>1- 아발란체 도입은 모두 준비 완료 되었나요? 현재 상황이 어떻게 되는지 알 수 있을까요? 모두가 궁금해 합니다.&nbsp;</strong></p><p>&nbsp;</p><ul><li>아발란체는 이제 곧 런칭 예정입니다. 주의할 점들이 많아서 메인넷에 출시하기 전에 다양한 테스트 런을 진행하고 있습니다. 런칭 이후에도 개발은 계속 될 예정입니다. 도입해야할 많은 기능들을 있으며 이는 avalanche.cash에서 확인할 수 있습니다.&nbsp;</li></ul><p>‍</p><p><strong>2- XEC 펀드에서 도달한 포인트는 무엇인가요? 현재 GNC는 어떤 단계에 와있나요?</strong></p><p>‍</p><ul><li>현재 저희쪽에 다양한 제안이 왔었습니다. 그리고 그중 몇가지는 받아들여졌었죠. GNC의 지출은 수익과 거이 비슷하지만 지난 몇년동안 자금을 축적하여 추가 제안이 생길 경우 지원할 수 있는 충분한 금액이 있습니다.<br><br>GNC는 아직 신생 조직입니다. 그런것에 비해 조직 운영의 프로세스와 절차가 개선되고 있으며 더 많은 기능 개발이 계획되어 있습니다. GNC 구조는 매우 독특하며 유동적인 프로세스로 작동하도록 구성되어 있습니다. eCash는 GNC를 발전시키기 위해 계속 작업할 것입니다. GNC 운영의 궁극적인 목표는 가능한 가장 효율적인 방법으로 eCash에 가치를 주는 것입니다.<br><br></li></ul><p><strong>3- 주간 뉴스레터를 발간할 계획이 있나요?</strong></p><p>‍</p><ul><li>현재 eCash는 미디어 매니저를 통해 트위터와 정기적인 컨텐츠로 월간 업데이트를 진행하고 있습니다. 만약 커뮤니티에서 뉴스레터 발간에 대한 관심이 충분하다면 이메일 뉴스레터를 발행할 수도 있습니다. 트위터와 텔레그램 그룹과 같은 소셜 미디어에 가장 최신 업데이트를 내용을 업로드 하는 것이 사실 가장 좋긴 합니다.(최신 업데이트는 현재 <a href="https://ecash.community">ecash.community</a> 에서 모두 확인가능). 우리는 또한 곧 발표될 소식에 대한 몇 개의 블로그 포스트 작성이 완료되었습니다. 커뮤니티 회원인 <a href="https://www.getrevue.co/profile/ecashinformer?via=twitter-profile">eCash Informer</a> 의 구독자가 충분하면 비공식 뉴스레터를 만들 계획이 있습니다.</li></ul><p>‍</p><p><strong>4. XEC는 새로운 거래소에 상장될 계획이 있나요? 이와 관련하여 작업이 진행중인것이 있나요?</strong></p><p>‍</p><ul><li>eCash 팀에게 있어 거래소 상장은 유저의 접근성을 높인다는 측면에서 중요한 요소입니다. 따라서 eCash의 정기적인 사업 운영의 일환으로 새로운 거래소 및 파트너와 지속적으로 상장 논의를 진행하고 있으며 사업 진행목록에 새로운 거래소들도 포함되어 있습니다. 커뮤니티와 유저가 XEC의 거래소 상장을 위해 할 수 있는 것은 선호하는 거래소에 eCash 상장에 대해 요청하는 것입니다. eCash 상장에 대한 충분한 수요를 알린다면 거래소는 eCash를 상장 목록의 우선순위에 둘 수 있을 가능성이 높습니다.</li></ul><p>‍</p><p><strong>5 - BCHA는 2021년 7월에 eCash XEC로 리브랜딩 되었습니다. 그런데도 불구라고 BCH는 여전히 존재합니다. BCH가 지금 심각하게 하락중입니다. BCH로부터 합류하라는 제안을 받은적이 있나요?</strong></p><p>‍</p><ul><li>BCH와 eCash는 아얘 다른 프로젝트입니다. 함께할 수 있는 점이 없죠.&nbsp;</li></ul><ul><li>BCH와 eCash의 기본 기술은 비슷하기 때문에 BCH에서 일하던 개발자는 eCash에서 함께 일하겠다면 얼마든지 자리를 만들어 줄 수 있습니다. 저희는 또한 eCash 네트워크에서 런칭할 BCH 프로젝트에 흥미가 있습니다.특히 eToken 프로젝트에 대해서 말이죠. eCash는 eToken 인프라를 계속 지원하면서 비트코인 ​​개발자에게 이미 친숙한 많은 기존 개발자 툴을 개선하기 위한 개발자 툴킷을 구축하고 있습니다.</li></ul><p>‍</p><p><strong>6- 우리는 이제 한 배를 타게 되었는데요. 저는 bitcoinabc.org에서 eCash 팀을 팔로우합니다. 그런데 단체사진은 없나요? 다른 개발팀이 궁금합니다. eCash의 근무 환경이 궁금합니다.</strong></p><p>‍</p><ul><li>eCash팀은 다양한 국가에서 원격으로 근무합니다. 따라서 한 곳에 팀을 모아서 근무를 하고 있지는 않습니다. 몇몇의 개발자는 익명으로 알려지지 않고 업무와 코드를 통해서 소통하고 다른 이름이 알려진 팀원들은 링크드인에서 확인 가능합니다.</li></ul><p>‍</p><p><strong>7- eCash 네트워크를 Bitcoin 네트워크보다 우수하게 만드는 기능이 있나요? 만약에 있다면 해당 기능은 무엇인가요?</strong></p><p>‍</p><ul><li>현재eCash는 확장성과 사용성에 중점을 둔 명확하고 달성 가능한 로드맵을 가지고 있으며 이를 달성하기 위해 지금껏 작업을 진행했습니다. eCash는 주요 마일스톤 달성했으며 앞으로 더 많은 작업을 계속진행하게 될 미션 중심의 프로젝트입니다.</li></ul><p>‍</p><ul><li>eCash 프로토콜 수익은 하락장 환경에서도 독립적이고 지속적인 개발을 가능하게 합니다. 비트코인 및 기타 프로젝트에 대한 개발 방향은 과거에 홀더의 이익과 반드시 ​​일치하지 않는 대형 기부자의 영향을 많이 받았습니다.</li></ul><ul><li>오늘날 대부분의 암호화폐 분석가는 BTC를 "가치 저장고"로 간주합니다. 반면 eCash는 세계 화폐를 구축하고 있습니다. 따라서 가치의 저장고인 동시에 실질적인 교환의 매개체가 되어야 합니다.” 이를 위해선 BTC에 비해 더 많은 개발 작업이 필요합니다.</li></ul><p>‍</p><ul><li>높은 거래 수수료로 인해 BTC에서는 실행 가능하지 않은 Cashfusion을 eCash에서는 실행하여 개인 정보 보호 기능을 지원합니다.</li></ul><ul><li>Avalanche의 도입은 즉각적인 완결성, 하위 체인 및 더 쉬운 업그레이드의 가능성과 같은 많은 기능을 추가할 수 있습니다. 해당 기능을 통해 eCash는 BTC의 지배적인 보안 위치와 경쟁할 수 있습니다.</li></ul><p><br><strong>8- Luna UST 문제로 암호화폐 시장에 대한 신뢰가 깨졌습니다. 전 세계에서 사람들은 심각한 금융 피해를 입었습니다. eCash 팀은 향후 이러한 공격자에 의해 이러한 신뢰가 깨지지 않도록 하기 위한 대책은 무엇인가요?</strong></p><p>‍</p><ul><li>eCash는 비트코인에서 포크되었습니다. 그말은<br>1) 이미 12년 동안 지속된 강력한 기술 기반 위에 구축</li></ul><p> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2) 코인은 이미 12년 간의 작업 증명 마이닝을 통해 공정하게 배포</p><p>&nbsp;</p><ul><li>되었다는 말입니다.&nbsp; 따라서 eCash는 Luna 및 다른 새로운 프로젝트를 괴롭힌 폰지 사기 깉은 문제의 영향을 받지 않습니다. 보통 그런 코인들은 "무료"로 돈이 나눠지는 것처럼 보이기 때문에 많은 관심을 받지만 일반적으로 그러한 프로젝트는 설립자가 압도적으로 공급을 통제하며 안좋은 결과를 초래합니다.</li></ul><p>‍</p><p><strong>9- 미래에 eCash XEC를 어디에서 볼 수 있을까요? eCash는 미래에 어떤 편의를 제공할까요? 3~10년 후의 eCash의 모습은?</strong></p><p>‍</p><ul><li>eCash는 검열 방지 화폐를 구축하고 있습니다. 그것을 달성하려면 USD와 같은 주요 세계 통화나 금과 경쟁해야 합니다. 먼저 이 통화나 금이 가진 문제점이 있습니다.&nbsp; USD 및 기타 명목 화폐의 경우 대부분의 사람들은 중앙 은행이나 다른은행에 대한 의존도가 높습니다. 금의 경우 점점 더 복잡해지는 법적 규제의 대상이라는 점이 있습니다.&nbsp; eCash는 사람들이 돈과 금에 대해 좋아하는 면(부, 이동성, 보안, 개인 정보 보호)을 충족시켜줌과 동시에 은행이나 제도가 이러한 구시대적 기술에 가하는 제한이 증가하는 것을 방지하는 것을 목표로 합니다. 이를 위해서는 세계적 수준의 인프라를 구축하고 eCash를 사용하여 기업가적 개발자 문화를 구축하는 제품 및 서비스를 보유해야 합니다. eCash는 노드 소프트웨어를 구축하기 위해 노력하고 있습니다.</li></ul><p>‍</p><p><strong>10-거래소가 소유하고 있는 eCash의 양 또는 비율은 얼마인가요? eCash는 향후 탈중앙화 거래소 설립을 고려하고 있나요? 그들은 중앙 집중식 거래소와 고래의 조작에 어떻게 대응하려고 하나요?</strong></p><p>‍</p><ul><li>eCash는 기존에 배포가 되어있으며 공급은 채굴로 되며 어떤 사람이나 팀에 의해 제어되지 않습니다. 따라서 거래소는 사용자가 예금 및 거래를 통해 수년 동안 벌어 들인 금액만 소유합니다. 이것은 다른 새로운 암호화폐와 비교할 때 eCash가 가진 주요한 차이점입니다. eCash 공급은 팀에서 제어하지 않습니다. eCash를 상장하는 거래소에는 상장 수수료나 공급의 일부가 제공되지 않았기 때문입니다.</li></ul><p>‍</p><p><strong>11- 저는 Amaury의 작업이 인류에게 매우 가치가 있는 작업이라고 생각하지만 만약 그가 eCash를 떠나면 프로젝트는 어떻게 되나요? 많은 프로젝트에서 설립자가 떠나고 그에게 안 좋은 일이 생겼을 때 프로젝트가 무너졌는데 eCash는 해당 개발자 없이 계속 작업을 진행할 수 있나요?</strong></p><p>‍</p><ul><li>스타트업 기업에서는 이것을 "핵심 인력 위험"이라고 부릅니다. 그러나 eCash는 회사가 아니며 오픈 소스 프로토콜입니다. Amaury는 eCash의 엄청난 기술 리더이자 자산임은 자명한 사실입니다. 하지만 성공적인 암호화폐는 훌륭한 리더십과 정치적 독립성을 모두 필요로 합니다. 한 사람의 참여 없이는 성공할 수 없다면 이미 실패한 프로젝트입니다.</li></ul><p>‍</p><ul><li>나카모토 사토시 퇴임 이후 비트코인이 누리는 성공을 보면 알 수 있듯 eCash와 같은 분산 프로토콜의 또한 설립자가 없어도 계속 진행할 수 있습니다.</li></ul><p>‍</p><p><strong>12- 저는 솔직히 말해서 비트코인은 처음에는 획기적인 기술이었음에도 불구하고 궁극적으로는 사기 라고 생각합니다. 끊임없는 조작을 하는 거래소가 실제로 존재하지 않는 BTC를 팔고 있다고 생각합니다. 주식 시장에도 조작이 있다지만 이 정도는 아닙니다. BTC를 아예 리셋해버였으면 좋겠습니다. 이에 대한 비트코인 ​​ABC 팀의 의견이 궁금합니다. 암호화폐 세계는 리셋이 필요하다고 생각하나요? BTC가 리셋되면 BTC 포크인 eCash가 어떤 영향을 받나요?</strong></p><p>‍</p><ul><li>BTC가 글로벌 전자 화폐 시스템 구축이라는 목표에서 벗어났다는 데 동의합니다. 실제로 이것이 Bitcoin ABC 프로젝트가 생겨난 이유이며 오늘날 우리가 eCash를 운영하도록 합니다. 그러나 BTC에서 발생한 경험적 \'실제 세계\' 테스트는 eCash와 같은 미래 프로젝트에 매우 중요합니다. 작업 증명 마이닝은 오늘날 부를 파괴로 이끄는 Luna와 달리 코인 배포를 위한 공정한 테스트 방식입니다. 암호화폐의 가장 큰 특징 중 하나는 거래를 취소할 수 없다는 것입니다. 거래를 변형시키는 것은 오늘날 은행과 국가 행위자가 돈에 대한 정치적 간섭을 일으키기 위해 하고 있는 일이며 eCash의 목표는 이러한 영향력을 없애는 것입니다.</li></ul><p>‍</p><p><strong>13- eCash가 5백만 txs/sec 목표에 도달할 때가 언제즘 될까요? 기술 솔루션, 로드맵이 있나요? 아니면 시행착오를 통해 결론을 내릴 건가요?</strong></p><p>‍</p><ul><li>eCash는 이미 대량 사용을 처리할 수 있는 시스템을 만들 기술적인 로드맵을 가지고 있습니다. 블록 공간 수요 및 사용 가능한 리소스에 따라 주요 기술 변경을 신중하게 진행하는 것이 중요합니다.결과적으로 말씀드리면 시행 착오가 아닙니다. 지속적으로 반복하고 기술이 확장 요구 사항보다 항상 기술력으로 앞서 있는지 확인합니다.&nbsp; BTC의 문제점은 지원하는 소프트웨어 규모를 넘어서는 거래 수요를 허용하는 중대한 실수를 저질렀다고 생각합니다. 현재 기술은 암호화 거래에 대한 실제 수요보다 훨씬 앞서 있습니다. 상인 이상의 기업가, 비즈니스 및 사용자는 모두 세계 규모에 도달하는 데 중요한 역할을 할 것입니다.</li></ul><p>‍</p><p><strong>14- 2021년 7월부터 지금까지 코드 작성 면에서 달성한 것들이 만족하나요? 기술적인 측면에서 발전이 있었나요?</strong></p><p>‍</p><ul><li>소프트웨어는 언제나 발전이 가능하며 갇혀있지 않습니다. 항상 개선되고 변화합니다. 따라서 항상 개선해야 할 사항이 있습니다. eCash는 상당한 진전을 이루었지만 동시에 여전히 해야 할 일이 많고 앞으로도 계속 될 것입니다. 마음 같아서는 원하는 것을 더 빨리 구현하고 싶지만 개발은 단기간에 이루어질 수 없습니다. 서두르는 바람에 치명적인 버그가 생긴다면 안좋은 결과만 가져올 것입니다. 따라서 무수히 많은 환경을 테스트하고 시뮬레이션하는 것은 개발 프로세스의 중요한 부분입니다. eCash 리소스를 통해 인프라 수준에서 필요한 기술 발전에 더 많은 개발자가 기여할 수 있으므로 팀을 확장하려고 합니다.</li></ul><p>‍</p><p><strong>15- eCash(및 일반적으로 암호화폐)가 궁극적으로 무엇을 달성하기를 바라십니까?</strong></p><p>‍</p><ul><li>암호화폐 개발은 개인의 자유를 보호하기 위한 기술 경쟁입니다. <br>eCash는 부를 재정의하는 프로젝트입니다.<br><br></li></ul><ul><li>오늘날 대부분의 사람들은 자금과 관련하여 선택의 폭이 좁습니다. 저축을 부풀리거나 자금을 동결하는 지역의 정치적 결정에 취약합니다.</li></ul><p>‍</p><ul><li>eCash는 이러한 효과를 방지하기 위해 설계된 오픈 소스 기술입니다.</li></ul><p>‍</p><ul><li>eCash가 이 목표를 달성할 수 있는 다양한 방법이 있습니다. 모든 곳에서 허용되는 세계 화폐로 사용되거나 전 세계 사람들이 대체 경제에서 대체 또는 비상 메커니즘으로 사용할 수 있는 "라이프보트" 시나리오의 구현입니다.&nbsp;</li></ul><p>‍</p><p><strong>16- 중앙 화폐와 은행에 대한 신뢰가 전 세계적으로 감소하고 있습니다.</strong></p><p><strong>이것이 사람들을 암호화폐로 끌어들이는 것입니다. 앞으로 비트코인이 더 성장할 것이라고 생각하나요? Hal Finney가 2009년에 말했듯이 비트코인은 천만 달러에 도달할 것입니다.</strong></p><p>‍<strong>비트코인이 성공하고 안전해지려면 매우 비싸야 한다는 데 동의하시나요?</strong></p><p>‍</p><ul><li>비트코인은 아마도 계속 성장할 것입니다. 비록 그것이 유일한 암호화폐이었을 때의 초기 상승보다는 훨씬 느린 속도 이겠지만 말이죠. 비트코인은 시장에서 가장 매력적인 기술은 아니지만 질문에서처럼 중앙 은행과 같은 경쟁자들에 대한 인식은 점점 더 나빠지고 있습니다.</li></ul><ul><li>비트코인이 사용자 수요에 맞게 확장되었다면 비트코인이 매우 비싸게 되면서 실제로 더 성공적이고 더 안전하게 만들 수 있었을 것이지만 대부분의 비트코인은 거래하지 않는 큰 고래가 보유하고 있으며, 일반 사람들에게 일상적인 경제 활동의 압도적인 부분을 차지하는 소규모 거래는 비트코인이 실용적이지 않습니다.</li></ul><ul><li>Avalanche와 같은 암호화 기술의 발전으로 소규모 프로젝트에 비트코인 ​​수준의 보안이 가능합니다. eCash의 경우 가격과 인기의 증가하더라도 비트코인에서 보는 좋지 않은 모습은 보이지 않을 것입니다.</li></ul><p>‍</p><p><strong>17- eCash는 획기적인 프로젝트라고 생각합니다. 중앙 은행의 압력이 있다고 느끼시나요?</strong></p><p>‍</p><ul><li>Satoshi는 이에 대해 올바른 생각을 가지고 있었습니다. 경쟁하는 것이 중요하지만, 그것이 뛰어다니고 해서 싸움을 시작하려는 것을 의미하지는 않습니다. 더 많은 기술을 개발할수록 미래에 미치는 긍정적인 영향은 더 커질 것입니다. eCash는 프로젝트의 특성상 항상 신중해야 합니다. 중앙 은행과의 경쟁은 불가피하며 이런 경쟁은 성공적인 프로젝트임을 암시하는 것입니다.&nbsp;</li></ul><p>‍</p><p><strong>18- 우리는 지금 하락장에 있습니다. 이게 얼마나 오래 갈 것 같나요?</strong></p><ul><li>eCash 팀은 이미 몇 번의 하락장을 겪었습니다. 또 다시 하락장을 맞이하고 있는데요. 일반적으로 다음 반감기까지 횡보를 하곤합니다. eCash는 비트코인과 동일한 반감기 일정을 가지고 있습니다. eCash는 이러한 하락장의 시간을 다음 상승장 이전에 모든 준비가 완료될 수 있도록 차세대 암호화 기술을 계속 구축하고 있습니다. 물론 정확히 이런 하락장이 얼마나 오래갈지 실제로 예측하는 것은 불가능합니다.&nbsp;</li></ul><p>‍</p><p><strong>19- eCash가 달성하려고 하는 아발란체 합의를 자체 네트워크에 통합하려는 프로젝트가 몇 개나 있나요?<br><br></strong></p><ul><li>eCash의 Avalanche Consensus 코드는 Avax와 완전히 별개이며 Bitcoin ABC 팀에 의해 독립적으로 구축됩니다. 따라서 eCash는 작업 증명 시스템에 Avalanche를 포함하는 첫 번째 프로젝트가 될 것입니다(아이러니하게도 이것은 Avalanche 백서가 나왔을 때 초기 의도였습니다). 이는 eCash에 분산된 부트스트래핑이 있어 eCash 노드가 Nakamoto Consensus의 보안을 기반으로 Avalanche 쿼럼에 신뢰할 수 없이 들어갈 수 있음을 의미합니다. 이는 우리가 비트코인의 검증된 보안 및 공급 분배 시스템을 유지한다는 것을 의미합니다.</li></ul><p>‍</p><ul><li>eCash는 Avalanche Consensus와 Nakamoto Consensus를 결합하여 각각의 장점을 최대화하고 약점을 완화한다는 점에서 매우 유리합니다.</li></ul><p>‍</p><p><strong>20-메타버스 기술에서 eCash가 가상 세계에서 무언가를 구매하는 데 사용할 수 있나요?</strong></p><p>‍</p><ul><li>eCash는 질문하시는 방법으로 eCash를 사용할 수 있는지에 대해서 말씀드리긴 어렵긴 하지만 기술력만 본다면 문의 주신 가상세계에서 무엇을 구매하는데 사용할 수는 있습니다. 이러한 시스템을 구축하고자 하는 사람이 있다면 GNC에 지원할 수 있습니다.</li></ul><p>‍</p><ul><li>앞으로 많은 기업들이 eCash에서 다양한 프로젝트를 구축할 수 있었으면 좋겠습니다. eCash 생태계에 가치를 더하는 모든 프로젝트는 GNC 자금 ​​지원을 신청 후 승인이 나면 진행 가능합니다.</li></ul><p>‍</p><p><strong>21- @deadalnix와 @AntonyZegers는 어떻게 처음 만났나요? 제가 보기엔 따르면 그 회의가 eCash 역사 중 중요한 순간으로 남을 수 있다고 봅니다.&nbsp;</strong></p><p>‍</p><ul><li>[Anthony 답변]: Amaury와 저는 2016년 샌프란시스코에서 Bitcoin Unlimited(BU)가 주최한 Bitcoin 회의에서 만났습니다(https://medium.com/@peter_r/satoshis-vision-bitcoin-development-scaling-conference- dfb56e17c2d9). 그를 만난 후 저는 Bitcoin을 확장하는 방법에 대한 그의 재능과 비전을 확인했고 BU가 그를 인정할 수 있게 설득하기 시작했고 Amaury가 Bitcoin Cash, Bitcoin ABC를 실행 후 결국 eCash를 시작할 수 있도록 제가 도와주었습니다.</li></ul><p>‍</p><p><strong>22-eCash의 Avalanche가 정말 기대됩니다. 저는 미래에 스테이킹이 어떻게 변해있을지 궁금합니다. 거래소가 계정을 동결할 경우에 대비하여 우리의 안전을 위해 저희 캐쉬탭을 연결하는 거대한 XEC 스테이킹 풀이 나왔으면 좋겠습니다.</strong></p><p>‍</p><ul><li>스테이킹에 대한 보상은 아직 구현되지 않았지만 이에 대한 계획은 있습니다. 현재 세부 사항에 대해 논의 중에 있습니다. 스테이킹은 단지 코인을 락업하기 위함이 아닙니다. 스테이커가 Avalanche Consensus에 적극적으로 참여하는 검증 노드를 실행하는 것 또한 고려해야 하는 중요한 사항입니다. 초기에 스테이킹은 비트코인 ​​ABC 노드가 있는 기술적 사용자에게 더 중요한 것이 되겠지만 추후 마이닝 풀과 유사한 풀이 나타날 수 있습니다.</li></ul><p>‍</p><p><strong>23- 모든 암호화폐는 탈중앙화에 대해 이야기하지만 실제로는 그렇지 않다는 것을 알 수 있습니다. "여기 우리 CEO가 있습니다"와 같은 헤드라인. 그러나 eCash는 이와 관련하여 어떻게 생각하고 있나요?</strong></p><p>‍</p><ul><li>eCash가 이러한 프로젝트와 다르다는 것을 알 수 있는 첫 번째 방법은 팀에 대한 변경 없이 비트코인의 공급 분배를 상속했다는 점입니다.&nbsp;이는 암호화폐에서, 특히 설립자와 투자자에게 모든 종류의 토큰을 배포하는 "토큰" 프로젝트가 지배했던 지난 강세장과는 다른점입니다.</li></ul><ul><li>비트코인 포크로서의 eCash 프로토콜은 매우 분산되어 있습니다. Avalanche 구현 또한 중앙 신뢰 지점 없이 완전히 분산되도록 구축되었습니다. Bitcoin ABC는 eCash 작업에 전념하고 기업 후원자 없이 프로토콜에서 직접 자금을 받는 프로젝트이므로 eCash의 성공에 따른 인센티브와는 별개로 매우 독립적입니다.</li><li>‍</li></ul><p><strong>24-홍보에 대한 아이디어가 있나요? eCash를 어떻게 전 세계에 알릴 것인가요? 전 세계의 상점들을 가면 "We accept #ecash" 라는 푯말이 언제쯤 나올까요?</strong></p><p>‍</p><ul><li>판매자가&nbsp; eCash를 채택하는 것은 너무도 좋은 아이디어입니다. 우리는 상점이 탑-다운&nbsp; 방식으로 암호화폐를 받아들이도록 하려는 캠페인이 한정적으로만 성공을 거두는 것을 보았습니다. 예를 들어, BCH는 이를 지배적인 전략으로 삼았고 그 결과는 좋지 않았습니다.</li><li>eCash는 상인 채택에 대한 "바텀-업" 접근 방식을 목표로 합니다. 사람들이 사용하고 싶어할 만큼 충분히 매력적인 화폐로 만들어야 합니다. 그렇게 되면 자연히 상점이 따라옵니다.</li><li>저희는 앞으로 더 많은 홍보를 할 수 있기를 바랍니다. 하지만 그 전에 eCash 프로토콜 수익을 잘 관리하는 것이 중요하며, 최상의 효과를 볼 수 있는 곳에 지출할 예정입니다. 일부 마케팅은 필요하지만, 허영심만으로 가득한 프로젝트나 단지 무언가를 했다고 말하는 데(특히 결과를 측정할 수 없는 경우) 돈을 쓰는 것은 피하는 것은 지양하는 바입니다. 최고의 마케팅은 열정적인 커뮤니티가 있을 때입니다.</li></ul><p>‍</p><p><strong>25-eCash는 언제부터 Ledger 지갑에 기본적으로 저장될 수 있습니까?</strong></p><p>‍</p><ul><li>eCash 지원을 구현하기 위해 Ledger 및 기타 지갑 제공업체와 현재 논의 중에 있습니다. 지갑 서비스가 지원을 활성화하기로 선택한 방법과 시기는 저희도 확답을 드리기가 어렵습니다. eCash의 좋은 점은 비트코인 ​​포크로서 공급자가 엔드포인트에서 약간의 변경으로 동일한 비트코인 ​​코드를 단순히 재사용함으로써 그것을 구현하는 것이 상당히 쉽다는 것입니다. 그동안 BCH 지원의 해결 방법을 사용하여 Ledger 하드웨어 지갑 사용에 대한 가이드를 제작했습니다. <a href="https://www.bitcoinabc.org/2022-02-03-hardware-wallet-workarounds/">https://www.bitcoinabc.org/>2022-02-03-hardware-wallet-workarounds/</a></li></ul><p>‍</p><p><strong>26- 거래 시간을 더 빠르게 하기 위해 계속 노력하고 있나요?</strong></p><p>‍</p><ul><li>내 맞습니다. 지갑에서 지갑으로의 거래는 이미 소액 이체에 적합한 0-컨펌으로 거의 즉각적입니다. Avalanche 사전 합의 업데이트를 통해 거래는 거의 즉시 안전하게 완료됩니다. 현재 많은 거래소가 전송에 약 10개 이상의 확인을 해야하지만 의존하지만 Avalanche Post-Consensus 업데이트를 통해 거래소는 단 1블록 후에 거래를 완료할 수 있습니다. 추후 eCash는 더 빠르게 거래의 즉각적인 처리가 가능하게 될 것입니다.<br>&nbsp;</li></ul><p><strong>27-Avalanche가 다른 거버넌스 코인보다 좋다고 생각하는 이유가 무엇일까요? 무엇이 다른가요? 그리고 스테이블 코인도 만들 계획이신가요?</strong></p><p>‍</p><ul><li>Avalanche Consensus 구현은 AVAX와 관련이 없습니다. 나카모토 합의(Proof of Work) 위에 합의 프로토콜을 구현하며, AVAX 또는 거버넌스 코인과의 통합되는 것은 없습니다.</li><li>Avalanche는 새롭고 효율적인 발명입니다. 나카모토의 합의와 다르게 노드를 매우 빠르게 조정하고 최종 합의에 도달할 수 있습니다. 둘을 결합하는 것의 이점은 매우 강력하게 만들고 두 합의 메커니즘의 단점을 균형있게 만든다는 점입니다.</li><li>스테이블 코인의 경우 가장 좋은 솔루션은 USDC 또는 다른 평판이 좋은 대형 스테이블 코인이 eToken에서 출시되도록 권장하는 것입니다. Tether는 eCash에서 사용하는 것과 동일한 eToken 프로토콜에서 이 작업을 수행했었으므로 이미 이 단계에 대해 기술적인 준비가 되어있습니다.</li></ul><p>‍</p><p><strong>28-프로젝트가 완전히 작동하는 데 예상되는 시간은 얼마나 될까요?</strong></p><p>‍</p><ul><li>eCash의 기술력은 현재 거래 처리량보다 훨씬 크다는 점에서 이미 \'완전히 작동\'하고 있다고 볼 수 있습니다. 추가로 Avalanche가 도입되면 사용자 경험을 더욱 향상시킬 것입니다.</li><li>소프트웨어는 항상 개선될 수 있습니다. 지금부터 수십 년 후에는 eCash를 실행하는 컴퓨터가 달라질 것이며 eCash 개발 또한 첨단 기술을 최대한 활용하기 위해 개선될 것입니다.</li><li>로드맵을 더 세세하게 말씀드릴 수 없다는 것이 사실 안타깝긴 합니다. 이는 업계 전반에 걸쳐 공통적 것인데 ETH를 예로 들면 주요 ETH 2.0 업그레이드에도 불구하고 수년간 파이프라인에서 정확한 날짜는 없었습니다. 새로운 문제와 문제점이 발견되면 이를 해결하기 위한 작업이 수행됩니다.</li><li>eCash의 개발 프로세스는 <a href="https://reviews.bitcoinabc.org/feed/">https://reviews.bitcoinabc.org/feed/</a> 에서 확인 가능합니다. <br><br></li></ul><p>‍</p><p><strong>29-왜 아랍어를 지원하지 않나요?</strong></p><p>‍</p><ul><li>당사 웹사이트 또는 서비스의 현지화에 대한 제안이나 요청이 있는 경우 Twitter(https://twitter.com/eCashOfficial)를 통해 저희에게 연락하거나 Telegram(https://t.me/ecash_official)을 통해 커뮤니티 관리자에게 연락하십시오. ) 가능한 한 빨리 요청주신 언어를 추가하도록 하겠습니다.</li><li>&nbsp;또한 저희는 번역 캠페인을 시작하고 보상 및 보상에 대해 참여하고 번역에 참여하는 데 관심이 있는 커뮤니티의 모든 사람을 환영합니다.</li></ul><p>‍</p><p><strong>30-저는 CashFusion에 대한 질문이 있습니다. 어떻게 작동하나요? 현실 세계에서 실제 적용되는 것은 무엇인가요?</strong></p><p>‍</p><ul><li>Cashfusion은 이미 현실 세계에서 작동하고 있습니다. Electrum 지갑을 사용하여 Cashfusion을 실행할 수 있습니다. 코인을 지갑으로 보내고 지갑은 해당 코인의 과거 거래 내역을 난독화하기 위해 다수의 "융합" 거래를 수행합니다. 이로써 추후 모든 거래는 여러분의 아이덴티티와 연결하기가 더 어려워 집니다.</li></ul><p>‍</p><p><strong>31-거래소용 eCash 토큰을 어디에서 상장할 수 있나요?</strong></p><p>‍</p><ul><li>아직 eToken용 거래소가 없습니다. <br>대신 GNC는 Permissionless Software Foundation(https://twitter.com/christroutner)의 Chris Troutner가 만든 분산형 eToken 교환(DEX)의 생성을 승인했습니다.<br><br></li></ul><p><strong>32-eCash 생태계가 지속하고 성장하도록 보장할 수 있나요?</strong></p><p>‍</p><ul><li>물론입니다. eCash의 자금 조달 메커니즘은 인프라를 유지하고 생태계 확장을 위한 리소스를 제공합니다. 저희가 구현하는 것을 구현하는 경우 이를 위해 최선을 다하고 잘 생산되고 유지되도록 할 것입니다. 저희가 구현하고자 하는 것은 eToken 프로토콜(이전 SLP)의 연속이거나 Electrum ABC 지갑 소프트웨어 또는 Cashfusion 등입니다.</li></ul><p>‍</p><p><strong>33-etoken과 XEC 간의 관계를 어떻게 이해하면 될까요?</strong></p><p><strong>‍<br></strong></p><ul><li>eToken은 개인이나 조직의 아이디어에 따라 생성되므로 xec 프로젝트 당사자는 어떤 eToken이 생성되는지 확인하고 싶어합니다(서포터들이 XEC 프로젝트를 어떻게 지원해야 하는지에 대한 질문에 대한 답변이기도 합니다.). 그리고 향후 고품질 및 잠재적인 etoken 프로젝트에 대한 재정적 또는 기술적 지원이 있는지 여부를 확인하려고 합니다.</li></ul><ul><li>eToken 프로토콜은 탈중앙화 프로토콜입니다. 때문에 어떤 당국의 활동을 금지하거나 규제할 직접적인 방법이 없으며 그렇게 설계되었습니다.</li></ul><ul><li>eToken 프로토콜을 촉진하는 서비스와 사용자는 자체적으로 리스크를 완화하고 필터링을 해야 합니다. eCash는 검열 기관과 같은 중앙 권한 없이 eToken 프로토콜을 안전하게 탐색할 수 있는 다양한 수준의 방법과 관행이 있다고 확신합니다.</li></ul><p>‍</p>',
            short_content:
                '7월 1일 eCash Day 기념 트위터 공간과 AMA를 진행했습니다. 아래는 Q&A 세션을 자세히 요약한 것입니다.',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Fri Jul 01 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-day-cugha-teuwiteo-gonggan-mic-ama',
            createdAt: '2023-06-20T22:48:43.102Z',
            updatedAt: '2023-06-21T21:48:37.997Z',
            publishedAt: '2023-06-20T22:48:43.094Z',
            legacy_image: '/images/62bf299cbdbbe40ce1ccf059_KR.png',
            legacy_media_logo: '',
            image: {
                data: {
                    id: 50,
                    attributes: {
                        name: '62bf299cbdbbe40ce1ccf059_KR.png',
                        alternativeText: null,
                        caption: null,
                        width: 320,
                        height: 193,
                        formats: {
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_62bf299cbdbbe40ce1ccf059_KR_97c89f77cc.png',
                                hash: 'thumbnail_62bf299cbdbbe40ce1ccf059_KR_97c89f77cc',
                                mime: 'image/png',
                                name: 'thumbnail_62bf299cbdbbe40ce1ccf059_KR.png',
                                path: null,
                                size: 77.39,
                                width: 245,
                                height: 148,
                            },
                        },
                        hash: '62bf299cbdbbe40ce1ccf059_KR_97c89f77cc',
                        ext: '.png',
                        mime: 'image/png',
                        size: 43.13,
                        url: '/uploads/62bf299cbdbbe40ce1ccf059_KR_97c89f77cc.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T19:58:35.300Z',
                        updatedAt: '2023-06-21T19:58:35.300Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 51,
        attributes: {
            title: "eCash (XEC) User Guide for D'CENT Hardware Wallets",
            content:
                '<p>Continuing our series of user guides for eCash compatible hardware wallets, we take a look at the <a href="https://dcentwallet.com/products/BiometricWallet">D’CENT biometric hardware wallet</a> which natively supports the eCash blockchain.</p><p>The D’CENT wallet features a built-in fingerprint scanner that adds convenience and enhanced security for fast transaction signing. The seed phrase and private key for the wallet is also generated directly from the device without connecting to additional software.</p><p>This user guide will cover the steps to set up your D’CENT wallet and pairing it for use with your mobile phone via bluetooth. These instructions are also available as a <a href="https://www.youtube.com/watch?v=t6qjjo3K8Xw">video</a>.</p><h2>Biometric Device Setup</h2><p>When you receive your D’CENT wallet there are a few steps to set up both the biometric wallet and your mobile device.</p><p>Starting with the biometric device, upon powering on the device you will be greeted with the option to select your preferred language. Use the arrow keys to cycle through the options and press the OK key on the right to confirm your choice.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:340px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="340px"><div><img src="/images/62a3f5889030700fad4aca48_selectlanguage.png" alt="Select Language" width="auto" height="auto" loading="auto"></div></figure><p>On the following screen, choose the Create Wallet option to generate a new cryptographic wallet and press OK.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:364px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="364px"><div><img src="/images/62a3f588daae3a74d732760a_createwallet.png" alt="Create Wallet" width="auto" height="auto" loading="auto"></div></figure><p>You will then be asked to enter your preferred PIN to secure this device. Use the up and down arrows to select a number and press ok to move onto the next digit. When you have entered 4 digits, you will see an ‘OK’ text on the screen. If you wish to set your PIN to 4-digits long, then press the OK button on the hardware wallet and it will prompt you to verify once more to confirm.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:368px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="368px"><div><img src="/images/62a3f589fb860f9fde0879e3_enterpin.png" alt="Enter Pin" width="auto" height="auto" loading="auto"></div></figure><p>The next step is to register your fingerprint via the biometric scanner. The fingerprint sensor is located in the middle of where the navigational buttons are located. You will need to slightly change the angular positioning of the same finger when scanning and need to repeat this until it displays 100%, which is typically 8 correct scans.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:372px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="372px"><div><img src="/images/62a3f5888b4157dda99a82a6_enrolfinger.png" alt="Enrol Finger" width="auto" height="auto" loading="auto"></div></figure><p>And finally, your wallet will be generated with a 24 word mnemonic seed phrase provided on screen.</p><p><strong>IMPORTANT</strong>: Make sure to write down this seed phrase and keep it in a safe place. Failure to do so could result in the loss of all your coins if you lose access to this wallet.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:368px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="368px"><div><img src="/images/62a3f588a390c3526a619552_recoveryseed.png" alt="Recovery Seed" width="auto" height="auto" loading="auto"></div></figure><p>On the next screen, you will be asked to confirm the 24 words from the seed phrase. When you have selected the first character, press the “OK” button to enter the value. Repeat entering second and third characters.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:339px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="339px"><div><img src="/images/62a3f589915f579ef4961d70_enterseed.png" alt="Enter Seed" width="auto" height="auto" loading="auto"></div></figure><p>Then select the correct word that corresponds to the correct seed position. You will need to do this for all 24 words.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:341px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="341px"><div><img src="/images/62a3f58ac30db2f88f8a63ac_selectseedword.png" alt="Select Seed Word" width="auto" height="auto" loading="auto"></div></figure><p>Once done, your new D’CENT biometric device is now ready for pairing with your mobile phone.</p><h2>Mobile App Setup</h2><p>You will need to download the <a href="https://play.google.com/store/apps/details?id=com.kr.iotrust.dcent.wallet&utm_source=dcentwallet&utm_campaign=mobileapp">Android</a> or <a href="https://apps.apple.com/us/app/dcent-wallet/id1447206611">iOS</a> D’CENT app compatible with your mobile device.</p><p>Once you have installed the mobile app, open it and select the Biometric Wallet option on the welcome screen. This will be followed by a request to register a 6 digit password for the app.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:251px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="251px"><div><img src="/images/62a3f5889e35e434b3be734d_biometricsplash.png" alt="Biometric Splash" width="auto" height="auto" loading="auto"></div></figure><p>You will then be taken to the home screen and the mobile app will request your permission to use bluetooth to communicate with the biometric device. Please ensure you allow this.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:247px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="247px"><div><img src="/images/62a3f5884b62e930f74dd127_biometricbluetooth.png" alt="Biometric Bluetooth" width="auto" height="auto" loading="auto"></div></figure><p>Once you have granted bluetooth permission, click on the bluetooth icon on the top right, which will open a dialogue to scan for nearby biometric devices and select the appropriate wallet to start the bluetooth pairing process.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:258px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="258px"><div><img src="/images/62a3f5894b62e9e1884dd128_biometricpairing.png" alt="Biometric Pairing" width="auto" height="auto" loading="auto"></div></figure><p>Once the device is paired, you will be taken to the home screen. Click on the plus icon on the bottom right to add a new eCash wallet and then search for the eCash XEC blockchain. Please check you’re adding “eCash (XEC)” as there are other token derivatives of eCash in other blockchains that come with custodial risks.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:258px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="258px"><div><img src="/images/62a3f5892aac525b87ffbec2_biometricaddwallet.png" alt="Biometric Add Wallet" width="auto" height="auto" loading="auto"></div></figure><p> </p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:254px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="254px"><div><img src="/images/62a3f5895cf41458df4746b7_biometricselectxec.png" alt="Biometric Select XEC" width="auto" height="auto" loading="auto"></div></figure><p>On the following screen, choose a name for your new eCash wallet based on the naming requirements on screen and then press the Create button. Then wait for the wallet to synchronize with the XEC blockchain. This will take a few seconds depending on the speed of your internet connection.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:250px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="250px"><div><img src="/images/62a3f589a390c3e88d619579_biometricwalletname.png" alt="Biometric Wallet Name" width="auto" height="auto" loading="auto"></div></figure><p>Once your wallet creation is complete, you can then click on the new wallet to show a number of actions. Select the Receive option to display the receiving address of this new eCash wallet. You can click on the copy button below the QR code to copy this address, or scan the QR code displayed.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:242px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="242px"><div><img src="/images/62a3f589903070410a4acb6f_biometricreceive.png" alt="Biometric Receive" width="auto" height="auto" loading="auto"></div></figure><p> </p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:245px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="245px"><div><img src="/images/62a3f589915f57157a961da4_biometricaddress.png" alt="Biometric Address" width="auto" height="auto" loading="auto"></div></figure><p>Clicking on the Send option will take you to the Sending screen where you can either paste in another eCash address via your clipboard, or scan another eCash wallet’s QR code. For this example let’s paste in an eCash address copied from clipboard and click Next.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:251px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="251px"><div><img src="/images/62a3f589c3d172617a84b1ab_biometricsend.png" alt="Biometric Send" width="auto" height="auto" loading="auto"></div></figure><p> </p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:247px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="247px"><div><img src="/images/62a3f589cda180d89e224caa_biometricdestination.png" alt="Biometric Destination" width="auto" height="auto" loading="auto"></div></figure><p>On the next screen, you can specify the amount to send based on XEC or your choice of fiat denomination. You can also adjust the transaction fee, but we suggest leaving it to the default value for now, and click Next.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:249px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="249px"><div><img src="/images/62a3f58aa390c32d22619605_biometricamount.png" alt="Biometric Amount" width="auto" height="auto" loading="auto"></div></figure><p>On the following screen, you will be shown a summary of the transaction. Please check the recipient address, network fee and total XECs being sent. Click Send when you are ready to progress.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:250px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="250px"><div><img src="/images/62a3f589ab8f16ec3f2401ff_biometricsummary.png" alt="Biometric Summary" width="auto" height="auto" loading="auto"></div></figure><p>Upon confirming the transaction within the mobile app, your D’CENT biometric device will now display the same transaction summary for you to double check. When ready, press the OK button on the biometric device.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:573px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="573px"><div><img src="/images/62a3f58a48410fedb1b9aeed_biometricconfirmation.png" alt="Biometric Confirmation" width="auto" height="auto" loading="auto"></div></figure><p>The device will then ask for your fingerprint to authorize this transaction. If your fingerprint matches what was registered with the biometric device, then the transaction will be broadcasted onto the XEC blockchain.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:559px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="559px"><div><img src="/images/62a3f58ae33c8284c059dff8_biometricauthentication.png" alt="Biometric Authentication" width="auto" height="auto" loading="auto"></div></figure><p>So in summary, this biometric wallet provides the extra security in the form of a fingerprint scanner, works in tandem with your mobile device, whilst natively supporting the eCash blockchain. If you have any questions regarding using this wallet for eCash purposes, please hop onto the <a href="https://t.me/ecash_official">Official eCash telegram channel</a>.</p><p>‍</p>',
            short_content:
                'Continuing our series of user guides for eCash compatible hardware wallets, we take a look at the D’CENT biometric hardware wallet which...',
            type: 'Blog',
            media_link:
                'https://www.bitcoinabc.org/2022-06-10-ecash-user-guide-for-dcent-hardware-wallets/',
            publish_date:
                'Fri Jun 10 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-xec-user-guide-for-dcent-hardware-wallets',
            createdAt: '2023-06-20T22:48:29.010Z',
            updatedAt: '2023-06-21T21:49:14.994Z',
            publishedAt: '2023-06-20T22:48:29.003Z',
            legacy_image:
                '/images/62a3f67adaae3a8bbb32ee51_Screen%20Shot%202022-06-10%20at%206.56.23%20PM.png',
            legacy_media_logo:
                '/images/6218a8f444fd6d1db2b4531d_60d1114fcb4e3e2b46511622_bitcoinabclogo-white.png',
            image: {
                data: {
                    id: 51,
                    attributes: {
                        name: '62a3f67adaae3a8bbb32ee51_Screen%20Shot%202022-06-10%20at%206.56.23%20PM.png',
                        alternativeText: null,
                        caption: null,
                        width: 640,
                        height: 393,
                        formats: {
                            small: {
                                ext: '.png',
                                url: '/uploads/small_62a3f67adaae3a8bbb32ee51_Screen_20_Shot_202022_06_10_20at_206_56_23_20_PM_d7e7d61705.png',
                                hash: 'small_62a3f67adaae3a8bbb32ee51_Screen_20_Shot_202022_06_10_20at_206_56_23_20_PM_d7e7d61705',
                                mime: 'image/png',
                                name: 'small_62a3f67adaae3a8bbb32ee51_Screen%20Shot%202022-06-10%20at%206.56.23%20PM.png',
                                path: null,
                                size: 281.38,
                                width: 500,
                                height: 307,
                            },
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_62a3f67adaae3a8bbb32ee51_Screen_20_Shot_202022_06_10_20at_206_56_23_20_PM_d7e7d61705.png',
                                hash: 'thumbnail_62a3f67adaae3a8bbb32ee51_Screen_20_Shot_202022_06_10_20at_206_56_23_20_PM_d7e7d61705',
                                mime: 'image/png',
                                name: 'thumbnail_62a3f67adaae3a8bbb32ee51_Screen%20Shot%202022-06-10%20at%206.56.23%20PM.png',
                                path: null,
                                size: 81.45,
                                width: 245,
                                height: 150,
                            },
                        },
                        hash: '62a3f67adaae3a8bbb32ee51_Screen_20_Shot_202022_06_10_20at_206_56_23_20_PM_d7e7d61705',
                        ext: '.png',
                        mime: 'image/png',
                        size: 90.15,
                        url: '/uploads/62a3f67adaae3a8bbb32ee51_Screen_20_Shot_202022_06_10_20at_206_56_23_20_PM_d7e7d61705.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T19:58:36.023Z',
                        updatedAt: '2023-06-21T19:58:36.023Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 50,
        attributes: {
            title: 'eCash (XEC) User Guide for Satochip Hardware Wallets',
            content:
                '<p><a href="https://satochip.io/">Satochip</a> is one of the first hardware wallet manufacturers to natively support the storing of eCash. Unlike the Ledger or Trezor hardware wallets, the Satochip wallet consists of two separate components.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:465px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="465px"><div><img src="/images/6299045e654c62072f2346e2_card-wallet.png" alt="Card Wallet" width="auto" height="auto" loading="auto"></div></figure><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:393px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="393px"><div><img src="/images/6299045f7489e44c19884591_card-reader.png" alt="Card Reader" width="auto" height="auto" loading="auto"></div></figure><p>‍</p><p>The first component is the card wallet which contains the cryptographic key for your eCash wallet, and the other is the card reader where you insert your card. They both work together to communicate with your Electrum ABC wallet to sign transactions.</p><p>This user guide will help you set up your Satochip wallet, as well as using it in conjunction with the Electrum ABC Desktop Wallet. These instructions are also available as a <a href="https://www.youtube.com/watch?v=wWZshQrcog0">video</a>.</p><h2>Wallet Setup</h2><p>When you receive your Satochip wallet, there are a few steps to set up your wallet for eCash use.</p><p>First, open your Electrum ABC wallet, then click on File, New/Restore, and then give the wallet a name and click Next.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:275px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="275px"><div><img src="/images/6299045f78d254f8a0e5cc43_new-restore.png" alt="New and Restore" width="auto" height="auto" loading="auto"></div></figure><p> </p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:499px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="499px"><div><img src="/images/6299045fd568d895a614bb43_new-wallet-name.png" alt="New Wallet Name" width="auto" height="auto" loading="auto"></div></figure><p>On the next screen, select ‘Standard Wallet’ for the wallet to be created and then click Next.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:602px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="602px"><div><img src="/images/6299045f73c680d67918e6d6_standard-wallet.png" alt="Standard Wallet" width="auto" height="auto" loading="auto"></div></figure><p>On the keystore screen, make sure your Satochip card reader is plugged into your computer if not already, then select “Use a hardware device” and click next.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:601px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="601px"><div><img src="/images/6299045f6cebc636642ed94f_keystore.png" alt="Keystore" width="auto" height="auto" loading="auto"></div></figure><p>On the following screen, insert your Satochip card into the card reader and wait for a few seconds for your computer to recognize your device.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:254px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="254px"><div><img src="/images/6299045f0af4bad7306630e1_insert-card.png" alt="Insert Card" width="auto" height="auto" loading="auto"></div></figure><p> </p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:616px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="616px"><div><img src="/images/6299045f822249d642c6fda0_detect-hardware.png" alt="Detect Hardware" width="auto" height="auto" loading="auto"></div></figure><p>On the following device screen, select the device that corresponds to your Satochip device then click Next.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:620px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="620px"><div><img src="/images/6299045f81764aaa53a868a2_select-device.png" alt="Select Device" width="auto" height="auto" loading="auto"></div></figure><p>You will then be prompted for a PIN to secure your device. The Satochip hardware wallet comes with this extra security feature much like your bank card. This is needed every time you want to open the wallet. Enter your desired PIN and click OK.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:617px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="617px"><div><img src="/images/6299045f52e120c09adb8ad3_enter-pin.png" alt="Enter PIN" width="auto" height="auto" loading="auto"></div></figure><p>Then select Create a new BIP39 seed to generate a new 12 word mnemonic seed phrase for your wallet.</p><p><strong>IMPORTANT: Make sure to write down this seed phrase and keep it in a safe place. Failure to do so could result in the loss of all your coins if you lose your Satochip card</strong>.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:617px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="617px"><div><img src="/images/6299045f35db55a74fc891a2_create-seed.png" alt="Create Seed" width="auto" height="auto" loading="auto"></div></figure><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:619px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="619px"><div><img src="/images/629904600af4ba2b55663269_show-seed.png" alt="Show Seed" width="auto" height="auto" loading="auto"></div></figure><p>Because this seed phrase is the most important thing that Electrum ABC will ask you, you will be asked to type it again to confirm.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:619px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="619px"><div><img src="/images/6299046073c680d3ec18e6fc_confirm-seed.png" alt="Confirm Seed" width="auto" height="auto" loading="auto"></div></figure><p>On the derivation path screen, ensure it is set to the eCash path used by Electrum ABC, being m/44’/899’/0’. Then click Next.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:620px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="620px"><div><img src="/images/6299045f89c519734c127906_derivation-path.png" alt="Derivation Path" width="auto" height="auto" loading="auto"></div></figure><p>On the final screen, you will be asked to confirm whether you want to encrypt the wallet file. It is a recent feature since Electrum ABC version 5.0.3. It uses a special key generated by the hardware wallet to encrypt the wallet file, so that your eCash addresses are not plainly stored on your computer.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:619px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="619px"><div><img src="/images/6299046073c680770b18e6f5_encrypt-wallet.png" alt="Encrypt Wallet" width="auto" height="auto" loading="auto"></div></figure><p>Click Next and you’re now all set up to use your Satochip device with the Electrum ABC wallet.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:864px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="864px"><div><img src="/images/6299045fd05ae1e76fb85c44_setup-complete.png" alt="Setup Complete" width="auto" height="auto" loading="auto"></div></figure><h2>Wallet Usage</h2><p>Now that you’re good to go, getting the receiving address is as easy as clicking on the “Receive” tab of the Electrum ABC wallet. Sending XEC to this eCash address is essentially storing it in the hardware wallet you just set up .</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:866px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="866px"><div><img src="/images/6299046081764a232fa868a3_receive-address.png" alt="Receive Address" width="auto" height="auto" loading="auto"></div></figure><p>When Sending eCash from this hardware wallet, it’s the same as your usual Electrum ABC steps, and as long as your card wallet is inserted into the card reader you won’t need any additional steps.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:865px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="865px"><div><img src="/images/6299046081764ad5cca868a4_wallet-send.png" alt="Wallet Send" width="auto" height="auto" loading="auto"></div></figure><p>You’ll also notice the green satochip logo in the lower right corner of your Electrum ABC wallet. If Electrum was not able to pair correctly with your Satochip wallet, then it will be showing a red indicator.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:581px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="581px"><div><img src="/images/62990460d568d8205f14bdb3_config-icon.png" alt="Config Icon" width="auto" height="auto" loading="auto"></div></figure><p>Clicking on this Satochip logo in the corner will display an advanced configuration tool. At this point in time, the only option we recommend using is the Change PIN option, as the other options are still being refined.</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:635px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="635px"><div><img src="/images/62990460654c622a742347a4_config-tool.png" alt="Config Tool" width="auto" height="auto" loading="auto"></div></figure><p>So there you have it, a hardware wallet that can natively store eCash and serves as an alternative to Ledger and Trezor devices. If you have any technical enquiries regarding the Electrum ABC wallet or the process of using it in conjunction with the Satochip card wallets, please feel free to hop on to the official <a href="https://t.me/ElectrumABC">Electrum ABC Telegram Group</a>.</p><p>‍</p>',
            short_content:
                'Satochip is one of the first hardware wallet manufacturers to natively support the storing of eCash. Unlike the Ledger or Trezor hardware...',
            type: 'Blog',
            media_link:
                'https://www.bitcoinabc.org/2022-06-01-ecash-user-guide-for-satochip-hardware-wallets/',
            publish_date:
                'Wed Jun 01 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-xec-user-guide-for-satochip-hardware-wallets',
            createdAt: '2023-06-20T22:48:18.076Z',
            updatedAt: '2023-06-21T21:49:39.897Z',
            publishedAt: '2023-06-20T22:48:18.067Z',
            legacy_image: '/images/629903ef73c6805b43188b47_card-wallet.png',
            legacy_media_logo:
                '/images/6218a8f444fd6d1db2b4531d_60d1114fcb4e3e2b46511622_bitcoinabclogo-white.png',
            image: {
                data: {
                    id: 48,
                    attributes: {
                        name: '629903ef73c6805b43188b47_card-wallet.png',
                        alternativeText: null,
                        caption: null,
                        width: 465,
                        height: 350,
                        formats: {
                            thumbnail: {
                                ext: '.png',
                                url: '/uploads/thumbnail_629903ef73c6805b43188b47_card_wallet_08b281b50a.png',
                                hash: 'thumbnail_629903ef73c6805b43188b47_card_wallet_08b281b50a',
                                mime: 'image/png',
                                name: 'thumbnail_629903ef73c6805b43188b47_card-wallet.png',
                                path: null,
                                size: 57.9,
                                width: 207,
                                height: 156,
                            },
                        },
                        hash: '629903ef73c6805b43188b47_card_wallet_08b281b50a',
                        ext: '.png',
                        mime: 'image/png',
                        size: 83.05,
                        url: '/uploads/629903ef73c6805b43188b47_card_wallet_08b281b50a.png',
                        previewUrl: null,
                        provider: 'local',
                        provider_metadata: null,
                        createdAt: '2023-06-21T19:58:35.245Z',
                        updatedAt: '2023-06-21T19:58:35.245Z',
                    },
                },
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 49,
        attributes: {
            title: "eCash's GNC Funds PayButton Project - Paving the Way to Mainstream eCash Adoption for Commerce",
            content:
                '<p>Earlier this month, the eCash GNC approved funding for bringing <a href="https://paybutton.org/">PayButton</a> to eCash. PayButton is a free and open-source way to accept crypto on the web. In line with the eCash mission, PayButton will help make it easier and more convenient to do commerce over the internet using eCash.</p><p><br></p><p><a href="https://paybutton.org/">PayButton</a> consists of two separate components:</p><p>- PayButton</p><p>- PayButton-Server</p><p><br></p><p>PayButton is the actual button that people will interact with. PayButton-Server is what each button communicates with to verify payments.</p><p><br></p><p>A key benefit of PayButton is that it’s extremely easy to begin using, while still allowing individuals and businesses to take advantage of more advanced features as they need them.</p><p><br></p><p>The funding approved by the GNC will be used to both bring PayButton to eCash as well as expand on PayButton-Server to allow businesses to manage their buttons and view their payments just like is possible on more traditional platforms.</p><p><br></p><p>The PayButton team knows how important it is that people actually use their coins rather than simply hodling and hoping for adoption to happen on its own. PayButton will be one more tool in our effort to onboard new investors and businesses into the space.<br></p><p><br></p>',
            short_content:
                'Earlier this month, the eCash GNC approved funding for bringing Paybutton to eCash. PayButton is a free and open source way to accept ...',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Tue May 31 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecashs-gnc-funds-paybutton-project-paving-the-way-to-mainstream-ecash-adoption-for-commerce',
            createdAt: '2023-06-20T22:48:03.091Z',
            updatedAt: '2023-06-20T22:48:03.091Z',
            publishedAt: '2023-06-20T22:48:03.084Z',
            legacy_image:
                '/images/6295b70902431a019a5ed519_Poster-paybutton.png',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 48,
        attributes: {
            title: 'XEC Crypto Leads Market Gains as Investors Turn to eCash Network',
            content:
                '<p>XEC is drawing lots of attention as it leads the top crypto projects in gains</p><ul><li>Crypto network <strong>eCash</strong> (<strong>XEC-USD</strong>) is leading the market today with gains of over 17%</li><li>XEC is a transactional crypto focusing on driving crypto as a means of payment</li><li>The XEC crypto is a forked descendent of <strong>Bitcoin </strong>(<a href="https://investorplace.com/cryptocurrency/btc-usd/"><strong>BTC-USD</strong></a>)</li></ul><p>The market is off to another new week, and after the fiasco with stablecoins last week, investors aren’t sure what to expect. Cryptos are largely trading sideways, shaking off consecutive periods of losses recently. Some, though, are seeing sizable price spikes, which, in turn, bring new investors to their projects. The XEC crypto is one such coin, leading the top projects in gains today.</p><p>The eCash network is not new, but it does have a new name. Originally, the network was called <strong>Bitcoin ABC</strong>, and, as the name implies, it was a Bitcoin fork. In July of 2021, Bitcoin ABC <a href="https://www.bitcoinabc.org/bcha/">rebranded into eCash</a>, complete with a redenomination that expanded the XEC supply to a whopping 21 trillion.</p><p>Developers’ reasoning behind the redenomination falls in line with the core goals of the network. Mainly, eCash focuses on driving the adoption of crypto as a means of payment. Since Bitcoin is so large in price, it can be somewhat unwieldy for transactions. If one were to buy a good or service with BTC, they would need to send only a tiny portion of a coin to the vendor. The XEC crypto tries to ease these transactions by allowing transactions to take place without using these tiny fractions.</p><h3>XEC Crypto Builds Sizable Gains After Bearish Market Conditions</h3><p>This week, the XEC crypto is kicking things off as the biggest project to see double-digit gains. Indeed, as most other currencies continue to lick their wounds after a widespread panic last week, eCash is stealing the spotlight and drawing interest from buyers.</p><p>So far today, XEC prices are up more than 17%. Of the top 100 projects by market capitalization, it is far and away the biggest gaining coin. Other projects that are appreciating today, like <strong>Kusama </strong>(<strong>KSM-USD</strong>) and <strong>Algorand </strong>(<a href="https://investorplace.com/cryptocurrency/algo-usd/"><strong>ALGO-USD</strong></a>) are doing so by only a few percentage points.</p><p>The reasons behind eCash’s price catalysts are unclear. It is worth noting that the network just successfully <a href="https://www.bitcoinabc.org/upgrade/">underwent its most recent network upgrade</a> over the weekend. But given that the upgrade only affected miners on the network, it seems unlikely that that is driving the massive influx of trading volume. Indeed, with $29 million XEC trading hands, the coin is seeing a 150% increase over yesterday’s volume.</p>',
            short_content:
                'XEC is drawing lots of attention as it leads the top crypto projects in gains.',
            type: 'News',
            media_link:
                'https://investorplace.com/2022/05/xec-crypto-leads-market-gains-as-investors-turn-to-ecash-network/',
            publish_date:
                'Tue May 17 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'xec-crypto-leads-market-gains-as-investors-turn-to-ecash-network',
            createdAt: '2023-06-20T22:47:48.965Z',
            updatedAt: '2023-06-20T22:47:48.965Z',
            publishedAt: '2023-06-20T22:47:48.959Z',
            legacy_image:
                '/images/62914fbc75fcb73372db7c61_62832a8af1fe235c766cddf8_Screen%20Shot%202022-05-16%20at%209.54.17%20PM.jpg',
            legacy_media_logo:
                '/images/62832b40367c339e7a56466a_IP-horizontal-color.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 47,
        attributes: {
            title: 'eCash Avalanche Development Update ',
            content:
                '<p>For the past year, and more, the Bitcoin ABC team has been working to implement the Avalanche protocol on eCash. The website <a href="https://www.avalanche.cash/">avalanche.cash</a> was created in order to give more transparency into the work being done, show the steps completed and give a sense of the future roadmap and milestones.</p><p>About a month ago, the roadmap items leading up to the Post-consensus milestone turned green, and the eCash project <a href="https://twitter.com/eCashOfficial/status/1508676120224358400">announced</a> that the Avalanche post-consensus implementation had reached Incubating status.</p><p>The purpose of this blog post is to explain what this means, and give some more information and context on the work being done.</p><h2>What is happening during the “Incubating” period?</h2><p>Incubating is a period where the Avalanche post-consensus features are feature-complete, but still require testing and shakeout by the team.</p><p>Since the Incubating period started, Bitcoin ABC has been doing repeated rounds of testing of the Avalanche features of the node. These tests have uncovered some issues that need to be fixed and areas where it needs to be made more robust. While this takes additional time and work, the good news is that the resulting Avalanche implementation is becoming more resilient against potential attacks.</p><p>Some fixes made during the Incubation period are:</p><ul><li>Increase outbound network connection numbers so that nodes can become more connected to the network (<a href="https://reviews.bitcoinabc.org/D11360">D11360</a>, <a href="https://reviews.bitcoinabc.org/D11361">D11361</a>).</li><li>Close some potential Denial of Service vectors (<a href="https://reviews.bitcoinabc.org/D11364">11364</a>).</li><li>Fix poll-only mode, so that non-staking nodes can get the information needed to poll Avalanche nodes (<a href="https://reviews.bitcoinabc.org/D11363">D11363</a>, <a href="https://reviews.bitcoinabc.org/D11365">D11365</a>).</li><li>Fix bootstrap heuristic calculation to account for own Proof (<a href="https://reviews.bitcoinabc.org/D11367">D11367</a>).</li><li>Actively request Proofs from a variety of nodes on the network, in particular during bootstrap. This is needed to have good assurance that the node can bootstrap in a decentralized way, with similar trust assumptions to current (ie, it should work as long as there is a connection to one honest node). This is currently work in progress.</li></ul><p>Anyone interested in more development details can have a look at Bitcoin ABC development activity <a href="https://reviews.bitcoinabc.org/feed/query/all/">here</a>.</p><p>The incubating period is also a time to prepare mainnet Avalanche nodes to ensure sufficient quorum for the launch on Mainnet. It is important to have enough nodes and staked coins. This will set up the network for success.</p><h2>What will happen after the Incubating period?</h2><p>After the Incubating phase, the Avalanche Post-Consensus will be considered live on the eCash network. This means that there will be sufficient nodes running the protocol, with sufficient XEC staked, for the protocol to run reliably and securely.</p><p>Additionally, a version of Bitcoin ABC node software will be released that includes the -avalanche parameter as a standard node-configuration option. This means that Avalanche Post-Consensus will be ready for anyone on the eCash network to use. It will still be off-by-default, and considered an optional feature.</p><h2>What is Post-Consensus?</h2><p>Post-Consensus is named that way because it is dealing with blocks <em>after</em> they are produced by miners. By contrast, Pre-Consensus is when the Avalanche protocol is used by nodes to come to consensus on transactions <em>before</em> blocks are produced.</p><p>With Avalanche Post-Consensus, nodes can come to consensus on the current live status of blocks that are visible on the eCash network. In other words, it allows nodes to know that the blocks they see are also accepted by the rest of the network. This information can then be used to defend the network against block withholding attacks, and blockchain reorganization attacks.</p><p>After Pre-Consensus is implemented in Bitcoin ABC, Post-Consensus will also be used to reject blocks that include transactions that conflict with transactions that were finalized via Pre-Consensus. This will allow users of the eCash network to benefit from near-instant transaction finalization, with confidence that finalized transactions cannot be reversed.</p><h2>What comes next?</h2><p>In the coming weeks, more information and tutorials about how to run Avalanche Post-Consensus will be released.</p><p>Looking farther ahead, the next milestone for Post-Consensus will be to make the protocol run “on-by-default” in the node’s configuration settings. This will be activated after sufficient monitoring of Avalanche Post-Consensus running as an optional setting, and it has proven to be reliable and stable.</p><p>In the meantime, development of further eCash Avalanche capabilities continues. Upcoming capabilities include Pre-Consensus for near-instant transaction finality, and staking rewards.</p><p>For more info and to monitor development progress, see <a href="https://www.avalanche.cash/">Avalanche.cash</a>.</p><h2>About Avalanche</h2><p>Using a fast consensus protocol to do Pre-Consensus has been a long-standing item on the <a href="https://e.cash/roadmap-explained">eCash Roadmap</a> (and previously on the Bitcoin Cash roadmap). This is one of the improvements needed to power eCash to be a competitor and alternative to Central Bank Digital Currencies (CBDCs). When the <a href="https://ipfs.io/ipfs/QmUy4jh5mGNZvLkjies1RWM4YuvJh5o2FYopNPVYwrRVGV">Avalanche whitepaper</a> appeared in 2018, eCash founder Amaury Séchet, and the Bitcoin ABC team, recognized that this new protocol was what they had been searching for, as it fulfilled the needed requirements.</p><p>It should be noted that eCash’s Avalanche implementation is completely separate and distinct from the AVAX Avalanche project. They have no connection, other than both using the protocol described in the Avalanche whitepaper. In the case of eCash, Avalanche consensus is used for fast and live consensus needs, such as fast transaction finality. Proof-of-work based Nakamoto consensus is retained where it is superior, providing objective consensus criterion to enable decentralized node bootstrapping.</p><p>Adding the Avalanche protocol has been long and technically challenging work. It is an entirely new consensus protocol which had to be implemented from scratch by the Bitcoin ABC team. While there are still many steps remaining to realize the full benefits of the Avalanche protocol, the launch of Post-Consensus on the eCash mainnet is a significant achievement, and a solid foundation for further enhancements to build upon.</p><p>‍</p>',
            short_content:
                'For the past year, and more, the Bitcoin ABC team has been working to implement the Avalanche protocol on eCash.',
            type: 'Blog',
            media_link:
                'https://www.bitcoinabc.org/2022-05-02-avalanche-development-update/',
            publish_date:
                'Mon May 02 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-avalanche-development-update',
            createdAt: '2023-06-20T22:47:32.849Z',
            updatedAt: '2023-06-20T22:47:32.849Z',
            publishedAt: '2023-06-20T22:47:32.843Z',
            legacy_image:
                '/images/62914ad31512a3feaa5babad_6270a47895977e3e2cfd2da9_avalanche-dev-update.jpg',
            legacy_media_logo:
                '/images/6270a4a659ed82066113f0dd_bitcoin-abc256%20white.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 46,
        attributes: {
            title: 'eCash 아발란체 개발 업데이트',
            content:
                '<p>지난 1년 동안 Bitcoin ABC 팀은 eCash에서 아발란체 프로토콜의 구현을 위해 노력했습니다.</p><p>[<a href="https://www.avalanche.cash/">avalanche.cash</a>]에서는 현재 진행 중인 아발란체 작업을 투명하고 단계적으로 완료된 부분을 보여주고 추후 로드맵과 마일스톤에 대한 정보 제공을 위해 만들어졌습니다.</p><p>‍</p><p>약 한 달 전 eCash에서는 사후 합의로 마일스톤 부분의 로드맵이 해당 사이트에서 ‘완료(초록색)’로 변경되었고 아발란체 사후 협의 구현이 인큐베이팅 상태에 도달했다고 <a href="https://twitter.com/eCashOfficial/status/1508676120224358400">발표</a>했습니다.</p><p>이번 포스팅에서는 인큐베이팅 상태에 도달한 것이 무엇을 의미하는지에 관해 설명하고 현재 진행 중인 작업에 대한 추가 정보 제공하려 합니다.</p><h2><strong>“인큐베이팅” 기간에 어떤 일이 진행되는가?</strong></h2><p>인큐베이팅은 아발란체 사후 협의 기능에 대해 팀의 테스트와 개편이 진행되는 기간입니다. </p><p>인큐베이팅 기간이 시작된 이후 Bitcoin ABC 팀은 노드의 Avalanche 기능을 반복적으로 테스트해 왔습니다. 해당 테스트를 통해 수정해야 할 문제점과 보강해야 하는 영역을 알 수가 있었습니다. 이러한 문제점과 보완점에 대한 작업이 진행은 비록 시간이 걸릴지 모르지만, 아발란체를 잘 구현하여 잠재적인 공격에 대해 더욱 탄력적으로 대응할 수 있도록 준비할 수가 있습니다.</p><p>인큐베이팅 기간 동안 수정사항은 다음과 같습니다. </p><ul><li>네트워크에 더 많은 노드가 연결될 수 있도록 아웃바운드 네트워크 연결 수를 늘림. (<a href="https://reviews.bitcoinabc.org/D11360">D11360</a>, <a href="https://reviews.bitcoinabc.org/D11361">D11361</a>).</li><li>일부 잠재적 서비스 거부 벡터 닫기 (<a href="https://reviews.bitcoinabc.org/D11364">D11364</a>).</li><li>스테이킹을 하지 않은 노드가 아발란체 노드를 투표하는 데 필요한 정보를 얻을 수 있도록 투표 전용 모드 수정 (<a href="https://reviews.bitcoinabc.org/D11363">D11363</a>, <a href="https://reviews.bitcoinabc.org/D11365">D11365</a>).</li><li>증명을 위한 부트스트랩 휴리스틱 계산 수정(<a href="https://reviews.bitcoinabc.org/D11367">D11367</a>).</li><li>특히 부트스트랩 동안 네트워크의 다양한 노드에서 적극적으로 증명을 요청.<br>이는 노드가 현재와 유사하게 탈중앙화 방식으로 부트스트랩 할 수 있다는 보증을 위해 필요(즉, 하나의 정직한 노드에 연결된 한 작동해야 함). 현재 진행 중인 작업.</li></ul><p>‍</p><p>세부적인 개발 사항은 <a href="https://reviews.bitcoinabc.org/feed/query/all/">Bitcoin ABC 개발 활동 사항</a>에서 확인할 수 있습니다.</p><p>인큐베이팅 기간은 메인넷 출시를 위한 충분한 인원수를 확보하기 위한 메인넷 아발란체 노드를 준비하는 시간이기도 합니다. 충분한 노드와 스테이킹된 코인을 갖는 것은 추후 아발란체를 적용하고 성공적인 네트워크를 설정하여 프로젝트를 운영함에 있어 필수적입니다. </p><h2><strong>인큐베이팅 기간 이후에는 어떻게 되는가?</strong></h2><p>인큐베이팅 단계 후에 아발란체 사후 협의는 eCash 네트워크에서 적용되었다고 간주합니다. 이는 프로토콜이 안정적이고 안전하게 실행될 수 있는 충분한 XEC가 스테이킹되었고 프로토콜을 실행하는 노드가 충분하다는 것을 의미합니다.</p><p>또한 표준 노드 구성 옵션으로 \'-avalanche\' 매개변수를 포함하는 비트코인 ABC 노드 소프트웨어 버전이 출시될 예정입니다. 이는 아발란체 사후 협의가 eCash 네트워크의 &nbsp;모든 사용자가 사용할 수 있도록 준비가 되었음을 뜻합니다. 하지만 아발란체 옵션기능은 표준으로 ‘꺼짐’으로 설정이 되어 사용자가 활성화해야 하는 상태입니다.</p><h2><strong>사후 협의란?</strong></h2><p>먼저 사후 협의라고 명명하는 이유는 채굴자가 블록을 생성한 후 블록을 처리하기 때문입니다. 반대로, 사전 합의는 블록이 생성되기 전에 노드가 트랜잭션에 대한 합의에 도달하기 위해 아발란체 프로토콜을 사용하는 경우입니다.</p><p>아발란체 사후 협의를 통해 노드는 eCash 네트워크에서 볼 수 있는 블록의 현재 라이브 상태에 대한 합의에 도달할 수 있습니다. 다시 말해, 노드는 자신이 보는 블록이 나머지 네트워크에서도 허용된다는 것을 알 수 있는 것입니다. 이러한 정보는 블록 보류 공격 및 블록체인 재구성 공격으로부터 네트워크를 방어하는 데 사용할 수 있습니다.</p><p>사전 합의가 Bitcoin ABC에서 구현된 후 사후 합의는 사전 합의를 통해 완료된 거래와 충돌하는 거래를 포함하는 블록을 거부할 때도 사용될 수 있습니다. </p><p>사전 합의가 Bitcoin ABC에서 구현된 후 사후 합의는 사전 합의를 통해 완료된 거래와 충돌하는 거래를 포함하는 블록을 거부할 때에도 사용될 수 있습니다. 이를 통해 eCash 네트워크 사용자는 완료된 거래를 되돌릴 수 없다는 확신을 가지고 거의 즉각적으로 거래를 완료할 수 있다는 이점이 있습니다.</p><h2><strong>이후 진행되는 상황은?</strong></h2><p>몇 주 안으로 아발란체 사후 협의를 실행하는 방법에 대한 자세한 정보와 튜토리얼이 공개될 예정입니다.<br>더 나아가 사후 협의의 다음 마일스톤으로 노드의 구성 설정에서 프로토콜이 "항시 켜짐"으로 운영될 수 있도록 하는 것입니다.</p><p>물론 아발란체 사후 협의를 선택적으로 설정하고 난 후 충분한 모니터링 후 안정적이라고 확인된 후에 실행될 예정입니다. </p><p>동시에 추가적인 eCash 아발란체 기능 개발이 계속됩니다. <br>조만간 즉각적인 거래 완결성과 스테이킹 보상을 위한 사전 합의 기능이 추가됩니다, </p><p>세부적인 정보와 개발 진행 상황에 대한 확인은 [<a href="https://www.avalanche.cash/">Avalanche.cash</a>]에서 보실 수 있습니다.</p><h2><strong>아발란체</strong></h2><p>사전 합의를 수행하기 위해 빠른 합의 프로토콜을 사용하는 것은 <a href="https://e.cash/roadmap-explained">eCash 로드맵</a>(이전 비트코인 캐시 로드맵)에 지속해서 나와 있던 항목이었습니다.<br>빠른 합의 프로토콜은 eCash가 CBDC(중앙은행 디지털 통화)의 취약점의 대안이 되어 경쟁할 수 있는 꼭 필요한 개선 사항 중 하나입니다.</p><p>2018년, <a href="https://ipfs.io/ipfs/QmUy4jh5mGNZvLkjies1RWM4YuvJh5o2FYopNPVYwrRVGV">아발란체 백서</a>가 처음 나왔을 당시 eCash 설립자 아마우리 세쳇(Amaury Séchet)과 Bitcoin ABC 팀은 이것이 빠른 합의 프로토콜에 필요한 모든 요구사항을 충족하는 것임을 확인하였습니다. 그렇게 아발란체를 eCash 프로젝트에 구현하게 되는 과정을 거치게 됩니다. 다만 eCash의 아발란체 구현은 AVAX 아발란체 프로젝트와 구별됩니다. eCash의 아발란체는 백서에 설명된 프로토콜을 사용한다는 것 외에는 연관성이 없습니다.</p><p>eCash의 경우 아발란체 합의는 빠른 거래 완결성과 같이 빠르고 생생한 합의에 사용됩니다. 작업 증명 기반 나카모토 합의가 유지되어 분산 노드 부트스트랩을 가능하게 하는 객관적인 합의 기준을 제공합니다.</p><p>아발란체 프로토콜을 eCash에 구현하는 것은 길고 기술적으로 어려운 작업이었습니다. Bitcoin ABC 팀이 아발란체 프로토콜을 구현하기 위해 처음부터 새롭게 개발해야 했습니다.</p><p>아발란체 프로토콜의 모든 이점을 실현하기 위해 아직 해결해야 하는 많은 단계가 남아 있지만 eCash 메인넷에서 사후 협의의 출시는 괄목할만한 중요한 성과이며 앞으로 eCash가 개선 사항 이루기 위한 견고한 토대가 됩니다. </p><p>‍</p>',
            short_content:
                '지난 1년 동안 Bitcoin ABC 팀은 Cash에서 아발란체 프로토콜의 구현을 위해 노력했습니다.',
            type: 'Blog',
            media_link:
                'https://www.bitcoinabc.org/2022-05-02-avalanche-development-update/',
            publish_date:
                'Mon May 02 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-abalrance-gaebal-eobdeiteu',
            createdAt: '2023-06-20T22:47:21.592Z',
            updatedAt: '2023-06-20T22:47:21.592Z',
            publishedAt: '2023-06-20T22:47:21.585Z',
            legacy_image:
                '/images/62914ade0d41dc84352534fa_62710c098612b0b49131cce9_2022-05-03%2019.02.jpg',
            legacy_media_logo:
                '/images/6270a4a659ed82066113f0dd_bitcoin-abc256%20white.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 45,
        attributes: {
            title: 'How Chronik Indexer Improves Cashtab Wallet',
            content:
                '<p>eCash\'s GNC recently funded the Chronik Indexer project which will massively improve our existing products.</p><p>‍</p><p>The Cashtab development team has started the implementation of Chronik Indexer. Here\'s how Chronik Indexer will improve Cashtab wallet:</p><h2>1️. Instant Notifications</h2><p>Currently, transaction notiﬁcations are often delayed by many seconds, causing users to worry they sent them to the wrong address. Switching to Chronik will allow instant transaction notiﬁcations through its WebSocket interface.</p><p>‍</p><p>Combined with the messaging features of Cashtab wallet, Chronik will open a whole new avenue of real-time interactions that were previously infeasible. </p><h2>2. Transaction History</h2><p>At the moment, transaction history in CashTab is limited to 5 entries; users often have to go to the explorer to view their entire transaction history, which hides attached messages.</p><p>‍</p><p>The limit in transactions on Cashtab is due to the diﬃcult pagination of the current indexers, and the potentially-large number of transactions that could limit performance.</p><p>‍</p><p>Chronik has built-in pagination that is simple to use in reverse chronological order. That will allow users to browse their entire transaction history, without taking up much bandwidth.</p><h2>3. Efficient All-in-One Backend</h2><p>Cashtab currently uses two separate indexers for transactions, Fulcrum for all transactions, and SLPDB for checking SLP transactions. This is very hard to maintain. For instance: sometimes timing issues between both indexers require a number of crutches to make it work reliably.</p><p>‍</p><p>With Chronik, all of that is gone, and Cashtab will use one backend, which would stay consistent with itself, by design. In addition, Chronik is designed to be forward-looking &amp; upgradable.</p><p>‍</p><p>It allows for a faster, cheaper, &amp; more reliable eCash development &amp; indexing experience. </p><p>‍</p><p><a href="https://reviews.bitcoinabc.org/D11385">https://reviews.bitcoinabc.org/D11385</a></p><p>‍</p>',
            short_content:
                "eCash's GNC recently funded the Chronik Indexer project which will massively improve our existing products.",
            type: 'Blog',
            media_link: '',
            publish_date:
                'Tue Apr 26 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'how-chronik-indexer-improves-cashtab-wallet',
            createdAt: '2023-06-20T22:47:05.961Z',
            updatedAt: '2023-06-20T22:47:05.961Z',
            publishedAt: '2023-06-20T22:47:05.950Z',
            legacy_image:
                '/images/62914c6b008e0406a1e7ca15_62680b52098cf300e29f0a4e_Screen%20Shot%202022-04-26%20at%2011.09.57%20PM.jpg',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 44,
        attributes: {
            title: 'eCash’s GNC Approves Chronik Indexer Project.',
            content:
                '<p>Work is underway on the Chronik Indexer project for eCash. This project was recently funded by the <a href="https://gnc.e.cash/">GNC</a>. The project has multiple stages, the first of which was to open-source the existing Chronik codebase. Subsequent stages comprise development activity to integrate the Chronik Indexer directly into the Bitcoin ABC node software, and provide first-class indexing infrastructure for eCash.</p><h1>What is the Chronik Indexer?</h1><p>‍</p><p>An indexer is one of the most important pieces of software for blockchain applications. It is a critical piece of infrastructure that other applications (such as wallets and explorers) are built on top of. Proper and reliable indexing infrastructure for Bitcoin-like chains has been the dream of developers for years. Current eCash indexers are inefficient, buggy, or have mediocre code quality. By addressing these issues, Chronik allows for a faster, cheaper, and more reliable eCash development and indexing experience. In addition, Chronik is designed to be forward-looking and upgradable, making it well suited to the long-term goals of building an indexer directly into the eCash node, providing first-class Avalanche support, and making the indexing of new protocols as easy as possible.</p><p>‍</p><p>Chronik has the potential to drastically simplify the entire eCash development stack, and cause a cascade of developers to build new protocols on top of eCash — all of which can be indexed by Chronik.</p><p>‍</p><p>“RaiPay shares eCash’s vision of bringing peer-to-peer electronic cash to the world. We’ve been working persistently on realizing this vision, be it in Saipan or anywhere else that we’ve applied our skills. One thing that always has been a huge pain has been the indexer infrastructure. We’ve had some success with BCHD but it always has been lacking. With Chronik we finally have something that won’t have severe downsides. We’re very happy the GNC funded our work and we believe it will greatly propel eCash as one of the most useful chains out there.” - Tobias Ruck of RaiPay</p><h1>Chronik Project details</h1><p>‍</p><p>Currently, Chronik is a stand-alone binary written in Rust, which connects to a</p><p>modified eCash node (bitcoind), such that it exposes an NNG (nanomsg next generation) interface with flatbuffers encoding. As a first step in this project, the source code for Chronik has been open-sourced, and is available at <a href="https://github.com/raipay/chronik">Github</a>.</p><p>‍</p><p>Having two separate executables works well in practice, but in discussions with the ABC team leading up to this proposal, RaiPay and ABC decided that it would be best to include Chronik directly into the eCash node (bitcoind) as one executable. This will make Chronik much more robust, eliminating the need to maintain state in both bitcoind and Chronik separately. This will also make the user experience simpler and less error-prone, having to run only bitcoind rather than juggling two executables. This project finds development work to make this integration happen.</p><p>‍</p><p>The development work for the project will also add first-class Avalanche support to Chronik, and make the indexing of new protocols as easy as possible.</p><p>‍</p><p>Work has already begun on porting Cashtab to use Chronik as its indexer. “Chronik will dramatically increase the speed of Cashtab and also make it easier for developers to rapidly deploy their own eCash apps. Native websocket support will enable instant transaction processing for web and mobile apps.” said Joey King, lead developer of Cashtab.</p><p>‍</p><h1>What does “Chronik” mean?</h1><p>The name “Chronik” was chosen because it is quite easy to pronounce, relatively unused in computer science and especially in blockchain. “Chronik” is German and translates to “History” or “Chronicle”. Since an indexer does exactly what a chronicle does—it arranges the history of a blockchain in an easy to use format—it is the perfect name for the project.</p><p>‍</p><h1>About eCash</h1><p>‍</p><p>eCash is redefining wealth and re-introducing the idea of electronic cash to the crypto space. Now on over 30+ exchanges with the ticker XEC, eCash is making waves through each approved project, step by step, to reinvest and grow its ecosystem. For more information check out <a href="https://e.cash/">https://e.cash/</a>.</p><p>‍</p>',
            short_content:
                'Work is underway on the Chronik Indexer project for eCash. This project was recently funded by the GNC',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Thu Apr 14 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecashs-gnc-approves-chronik-indexer-project',
            createdAt: '2023-06-20T22:46:51.082Z',
            updatedAt: '2023-06-20T22:46:51.082Z',
            publishedAt: '2023-06-20T22:46:51.077Z',
            legacy_image: '/images/6257704aac6e5a3316a11eff_GNC-funded-4.png',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 43,
        attributes: {
            title: 'Explaining Avalanche On eCash w/ Amaury Sechet',
            content:
                '<figure class="w-richtext-figure-type-video w-richtext-align-fullwidth" style="padding-bottom:56.206088992974244%" data-rt-type="video" data-rt-align="fullwidth" data-rt-max-width="" data-rt-max-height="56.206088992974244%" data-rt-dimensions="854:480" data-page-url="https://www.youtube.com/watch?v=AI2S68qsdd0"><div><iframe allowfullscreen="true" frameborder="0" scrolling="no" src="https://www.youtube.com/embed/AI2S68qsdd0" title="Explaining Avalanche On eCash w/ Amaury Sechet"></iframe></div></figure><p>Amaury Sechet, founder of Bitcoin ABC, creator of Bitcoin Cash and eCash, joins me to explain why Avalanche consensus is being implemented on eCash and what benefits users should expect from this implementation.</p><p>Recent, more technical interview on the topics discussed:</p><p>Part 1: <a href="https://www.youtube.com/watch?v=K4nM2VQNTew&t=0s">https://youtu.be/K4nM2VQNTew</a></p><p><a href="https://www.youtube.com/watch?v=K4nM2VQNTew&t=0s">‍</a>Part 2: <a href="https://www.youtube.com/watch?v=SYjF0pqMMDk&t=0s">https://youtu.be/SYjF0pqMMDk</a></p><p><a href="https://www.youtube.com/watch?v=SYjF0pqMMDk&t=0s">‍</a>2018 article explaining Avalanche preconsensus by Chris Pacia:<a href="https://www.youtube.com/redirect?event=video_description&redir_token=QUFFLUhqazN4Z24xNjVlM3RZdUZaV1Y5dkxMRGxuZy1FZ3xBQ3Jtc0ttTlc5MTl3YVRTOHlEaEhPb0dHRXk4eXVoSEN2RFExTXc3blZ1OXR1VWRSWFhQT0VpVXZmUHdYTkxOYXB5XzR3Z0tqOEVNMVhvbTZEOF9UTm11bHlKaU9uQUFJYUo0eG4wa1B1VmdLV0h0Zk1Jd1BoTQ&q=https%3A%2F%2Fchrispacia.medium.com%2Favalanche-pre-consensus-making-zeroconf-secure-ddedec254339" target="_blank">https://chrispacia.medium.com/avalanc...</a></p><p><a href="https://www.youtube.com/redirect?event=video_description&redir_token=QUFFLUhqazN4Z24xNjVlM3RZdUZaV1Y5dkxMRGxuZy1FZ3xBQ3Jtc0ttTlc5MTl3YVRTOHlEaEhPb0dHRXk4eXVoSEN2RFExTXc3blZ1OXR1VWRSWFhQT0VpVXZmUHdYTkxOYXB5XzR3Z0tqOEVNMVhvbTZEOF9UTm11bHlKaU9uQUFJYUo0eG4wa1B1VmdLV0h0Zk1Jd1BoTQ&q=https%3A%2F%2Fchrispacia.medium.com%2Favalanche-pre-consensus-making-zeroconf-secure-ddedec254339" target="_blank">‍</a>eCash Official Twitter: <a href="https://www.youtube.com/redirect?event=video_description&redir_token=QUFFLUhqazZOdmRTU0xCVFB1TlpDWDJqWmNQNU5zSGEzZ3xBQ3Jtc0tsSlk3N0FfNmhJbDEzel9HV1RjNVh4b3JGdlJUdDMyV29WVEFHOGo1RkwzTkRXaHRyZ0Mta05vQUlXZlVEc2VGbmRSdGh5R2RVSUVjQ1J2czdzWHlSQXA1dERCS0xPWFNwaWRSOFNCdFlISXNxUzRJSQ&q=https%3A%2F%2Ftwitter.com%2FeCashOfficial" target="_blank">https://twitter.com/eCashOfficial</a></p><p><a href="https://www.youtube.com/redirect?event=video_description&redir_token=QUFFLUhqazZOdmRTU0xCVFB1TlpDWDJqWmNQNU5zSGEzZ3xBQ3Jtc0tsSlk3N0FfNmhJbDEzel9HV1RjNVh4b3JGdlJUdDMyV29WVEFHOGo1RkwzTkRXaHRyZ0Mta05vQUlXZlVEc2VGbmRSdGh5R2RVSUVjQ1J2czdzWHlSQXA1dERCS0xPWFNwaWRSOFNCdFlISXNxUzRJSQ&q=https%3A%2F%2Ftwitter.com%2FeCashOfficial" target="_blank">‍</a>eCash Telegram Channel: <a href="https://www.youtube.com/redirect?event=video_description&redir_token=QUFFLUhqbl9EQlp1RkpJSGE3alRkVVNsc205WVFRbGVEQXxBQ3Jtc0trbkdkaXRRM3FaWEZESmhCYW82a0I4dmVabFpQOTZrY1gweUVlTVVmOG8ySXA3dFZ6MzZxcFV1bDdwdFNuMHlrdUtjVHMtc1VNUmJpWWpaSWM3aW9DVkZ6U1VZQXpRWFltWU5CR1pqUTZya0pralBEaw&q=http%3A%2F%2Ft.me%2Fecash_official" target="_blank">http://t.me/ecash_official</a></p>',
            short_content:
                'Amaury Sechet, founder of Bitcoin ABC, creator of Bitcoin Cash and eCash...',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Wed Apr 06 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'explaining-avalanche-on-ecash-w-amaury-sechet',
            createdAt: '2023-06-20T22:46:38.083Z',
            updatedAt: '2023-06-20T22:46:38.083Z',
            publishedAt: '2023-06-20T22:46:38.077Z',
            legacy_image:
                '/images/62914cd0abe920ae662d3145_624d60dada82bf3f83e98db4_Screen-Shot-2022-04-06-at-5.34.jpg',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 42,
        attributes: {
            title: 'New eCash Features Address Crypto Shortcomings in Freedom Convoy',
            content:
                '<p>Recent protests in Ottawa and blockades around the Canada-U.S. border caused tension in a three week long tug of war between people and state. Truckers came out in opposition to mask mandates and mandatory vaccinations, drawing a large crowd of supporters in-person and online. Fiat and even crypto donations were flowing into crowdfunding campaigns and wallet addresses. Shortly after, the Canadian government instructed banks to freeze 206 accounts affiliated with the protest. In an unprecedented move, Trudeau signed the <a href="https://www.globenewswire.com/Tracker?data=2n3-fokZ78HFvmPBv9TAKinoc6VbnvBULXpuGlKXaOOW2tIfBSlAgQgv2asgTYAYw5Sk3AyXSiue5v-MiomXw5HweasAwuGB1stH0oaBrnvOa_nTto8RhzW0oqz-PWtWRml1EMosxBmI4pdL9KVqz6-T-sRP9QjL740uNV3lHIU=" target="_blank">Emergencies Act</a>. In a tweet by Ottawa police, they threatened financial sanctions as repercussions and viewed any support as a criminal charge. In recent days, the Emergencies Act has finally been <a href="https://www.globenewswire.com/Tracker?data=5StCi2r4d0pOSjWmj1O_YXTmj-5etzT4nF_Ej-XsHYrgXfHwzY8xMDKy1omj38ta3YEjNGcz0XKfFPUt74rkdyPrbRgPJhlx7E8chaOzFdPyDQerpONwsBzXPr2ZyUzSVIrO0Abnt8XUjVD6MpOTGbAgSEjIyt1QkUKIVi5NxPwxSV8_xMn1CEa2OhBCmn5w" target="_blank">revoked</a>, though bank accounts remain frozen and wallet addresses continue to be blacklisted.</p><p>The Canadian government was able to easily blacklist 253 wallet addresses due to the easily traceable nature of Bitcoin: "The past and present ownership of every Bitcoin—in fact every 10-millionth of a Bitcoin—is dutifully recorded in the blockchain, an ever-growing public ledger shared across the Internet" (<a href="https://www.globenewswire.com/Tracker?data=LgliqpYvmCCeWhfGFCsqnAVRYDSvT8PntERoaSeJvVUshvXA_syHkDHQ7tPpveZ0APW_ApkTNmXCoDDdc03grHzDnqOW7tUvddllr7e3P7NFk9JkEOla7hRy6pEEYdE_nnYC0gCpAFgaNg-2OrxGIQ==" target="_blank">Bohannon</a>). This is why criminals can\'t hide behind Bitcoin, or even Ethereum for that matter on centralized exchanges because of the identity authentication process (Know Your Customer). If another crypto fundraiser were to take place, Bitcoin may not be the answer — its addresses are too transparent on the blockchain.</p><p>The only way to avoid central authority\'s overstep without recourse is to successfully move away from wallets on centralized exchanges. In response to the Emergencies Act, Kraken CEO Jesse Powell advised worried users: "Don\'t keep your funds with any centralized/regulated custodian. We cannot protect you. Get your coins/cash out and only trade p2p," he tweeted. That sure sounds like an easy pivot, yet understanding how decentralized works requires a bit more knowledge and patience. A small token swap on Uniswap may cost hundreds of dollars in <a href="https://www.globenewswire.com/Tracker?data=itZpWuTbSIhv3GHnUU2MI7CkFAzvlmjLhSu7sTrtVEMxi31e3Mn2g2jrbrY8f2V07CHAwhWzKr6N3UvQf6F7hG_JxoTrZ6e_D72QbtzGo3TFnFk-EK7xojCyfx32bomZkRbjBPoDl8F0BVHiL0seoiLyugTbeM783ReqhbyWJ5Fx3qYw2-QzMnhzu4oq4DXt" target="_blank">gas fees on Ethereum</a>, which is again impractical for small traders. If the freedom convoy was to use such crypto proceeds for water, food, or materials to rally continued support—they\'d need a customer and vendor to open their wallets and swap with each other. Inevitably, they\'ll still have to deal with the high fees and slow transaction speeds to make a successful trade.</p><p>Altcoins that have implemented technology to solve government tracking and fee issues remained relatively overlooked in the 2021 bull market. <a href="https://www.globenewswire.com/Tracker?data=RUUMLb7JBQGGHCsNdckKr3aWCZBRuDrBN46PYHGKQ95zZaSB4WfcU95HVNbNB89B" target="_blank">eCash</a>, a previous fork from Bitcoin, implements larger blocks to virtually eliminate throughput scarcity. Privacy is available through the opt-in CashFusion protocol, upgraded in the latest release, which preserves supply auditability. eCash also has the same supply cap and low inflation characteristics as its predecessor, Bitcoin. The latest release of the eCash software also quietly turned every node into an <a href="https://www.globenewswire.com/Tracker?data=k0cFc2ak6ZoQoJ1KxbRFr6kCMz2fP90woY9F1o1BrvipqhDbB0bh9f7Nt1s3l35niqm75uvOcJ0t_mHiTVLioqG7uNp3oiKiL1o1iqGlhRLwpjz1xwEZZQ_ddmy583zmFYPX3BqWJ8o9C_8sXwac9g==" target="_blank">Invisible Internet Project</a> node, allowing users to participate in a separate, uncensorable, private layer of the internet. There are many other altcoins like Monero that claim to be "<a href="https://www.globenewswire.com/Tracker?data=9__siv4OgaGIqY-PQ1Yrdxl2E_oX1rWgy0Fx9mFMs9Uf7CrZliFVAiH4Rm77cle7QuZ6B7F1O38My-znJGuXimTRu_FyNNXcVZeR5hyHWg45F0y6BmyLqDyjI4xRHlRGhHFbnhlS-0D-4UNLpFWUZ16B8wb2yQH8V8SUg-dMJLqHPKGEj1Uy7MVMZgvoDVt9IZ4LoOleU7J1Nl4Qq31Ko5zWJLiT1YqyYvLJQEFaSKDSfKcz08qCxxO5DrDzC97X" target="_blank">private cryptocurrencies</a>" which can shield wallet addresses—yet higher inflation, poor auditability and ties to the darknet cast wariness for adoption and support.</p><p>The trucker\'s freedom convoy in Canada paved the way for an ambitious near-perfect case study for Bitcoin. But the government\'s successful interference of blacklisting wallet addresses exposed its flaws and the problems other altcoins still face. Bitcoin and Ethereum failed to overcome state opposition to their use in a crowdfunding campaign. Next time, we\'ll learn which cryptocurrencies can succeed.</p><p>For more inquiries, contact pr@e.cash.</p><p><br></p>',
            short_content:
                'Recent protests in Ottawa and blockades around the Canada-U.S. border caused tension in a three-week-long tug of war between people and...',
            type: 'News',
            media_link:
                'https://finance.yahoo.com/news/ecash-features-address-crypto-shortcomings-170000425.html',
            publish_date:
                'Sun Mar 13 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'new-ecash-features-address-crypto-shortcomings-in-freedom-convoy',
            createdAt: '2023-06-20T22:46:25.042Z',
            updatedAt: '2023-06-20T22:46:25.042Z',
            publishedAt: '2023-06-20T22:46:25.034Z',
            legacy_image:
                '/images/62914cebb5d4e5dac8f2aed7_622d659e8a73302181089424_Screen%20Shot%202022-03-09%20at%207.31.40%20AM.jpg',
            legacy_media_logo:
                '/images/6108e1a82cc0a775267536a0_60edfdbbc0f5a8b4c7e32e3c_YahooFinanceLogo-p-500.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 41,
        attributes: {
            title: 'Does Bitcoin ACTUALLY fix this? Layah Heilpern, Tobias Ruck & Amaury Sechet',
            content:
                '<figure class="w-richtext-figure-type-video w-richtext-align-fullwidth" style="padding-bottom:56.206088992974244%" data-rt-type="video" data-rt-align="fullwidth" data-rt-max-width="" data-rt-max-height="56.206088992974244%" data-rt-dimensions="854:480" data-page-url="https://www.youtube.com/watch?v=tdrnuMFQJUw&t=4051s"><div><iframe allowfullscreen="true" frameborder="0" scrolling="no" src="https://www.youtube.com/embed/tdrnuMFQJUw?start=4051" title="Does Bitcoin ACTUALLY fix this? Layah Heilpern, Tobias Ruck & Amaury Sechet"></iframe></div></figure><p>With the banning of financial accounts in Canada this week it became clear that America and the broader crypto market was next up. I invited on three of the smartest people I know in the crypto world to help me sort this all out and to discover how we might triumph in the face of it. Layah is a brilliant author and YouTube star, Amaury was the creator of BCH and eCash, Tobias was the programmer on the Lotus and Stamp teams. You can\'t do much better than these three to discuss this stuff.</p>',
            short_content:
                'With the banning of financial accounts in Canada this week it became clear that America and the broader crypto market was next up. ',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Sat Mar 12 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'does-bitcoin-actually-fix-this-layah-heilpern-tobias-ruck-amaury-sechet',
            createdAt: '2023-06-20T22:46:10.543Z',
            updatedAt: '2023-06-20T22:46:10.543Z',
            publishedAt: '2023-06-20T22:46:10.534Z',
            legacy_image:
                '/images/62914cfe461adf27fb19141c_622c3b11ff077b9941d0e753_Screen%20Shot%202022-03-12%20at%202.15.40%20PM.jpg',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 40,
        attributes: {
            title: 'Splitting eCash and BCH coins using Electrum ABC and Electron Cash',
            content:
                '<p>eCash and Bitcoin Cash share a common history, and became separate currencies via a <a href="https://en.wikipedia.org/wiki/Fork_(blockchain)">blockchain split</a> on November 15th, 2020. Because of this, and the fact the both currencies have the same transaction format, it is possible for <a href="https://bitcoin.stackexchange.com/questions/61212/what-is-transaction-replay-and-replay-protection">transaction replay</a> to occur when someone sends coins on either chain.</p><p>This article explains a method to split BCH and eCash from each other using <a href="https://www.bitcoinabc.org/electrum/">Electrum ABC</a> and <a href="https://electroncash.org/">Electron Cash</a> wallets. This allows you to split coins while keeping them under your own control.</p><p><strong>Warning:</strong> There are scammers and thieves who create fake coin splitting tools and services to steal people’s coins. Never send your coins, or enter your private key or recovery words into any site or software unless you are certain that it can be trusted. The scammers create fake social media profiles and Youtube channels, so always double check sources and be careful following any links. Always be very cautious, and ask for help if you are unsure.</p><h2>What is Transaction Replay</h2><p>Transaction Replay affects coins that have not been moved since before the blockchain split. This means that if you have Bitcoin Cash coins that have not moved since before Nov 15th, 2020, you will also have eCash (XEC). If you create a transaction to spend the BCH, or the XEC, the same transaction will be valid on both networks. This means that both the BCH and XEC will be spent, and sent to the same destination address. If the recipient is not expecting coins on both networks, then either the BCH or XEC may be lost. In order to avoid this problem, you should “split” the coins before sending to anyone.</p><h2>How coin splitting works</h2><p>It is important to understand the principle behind splitting your coins. The goal is to create two different transactions, one on Bitcoin Cash and one on eCash, that will confirm on each blockchain separately. Because Electron Cash and Electrum ABC wallets use a block-height-based locktime on transactions, and the BCH and eCash blockchains are at very different heights, BCH coins sent using Electron Cash cannot be replayed on the eCash network for several days. This makes it easy to split coins by sending two separate transactions on the two networks.</p><p>You should be aware that there are also other methods to split coins. But in all cases the goal is that same: create two different transactions on the two networks. One other method is to use “split dust”, and mixing these already-split coins with the one you are spending. A third method is to send the unsplit coins to a service that will split for you. Some exchanges can do this, but it requires trusting that exchange.</p><h2>How to split your coins</h2><p>These are the steps to split XEC from BCH using Electron Cash and Electrum ABC.</p><p><strong>Note:</strong> These instructions work if you are holding unsplit BCH/XEC in a wallet that you control. If the coins are on an exchange, you will not be able to access the unsplit coins, and you will have to rely on the exchange to split the coins for you.</p><h3>Step one: Get your unsplit coins into Electron Cash and Electrum ABC</h3><p>Depending on where your BCH/XEC coins are held, there are different ways to get your unsplit coins into Electron Cash and Electrum ABC wallets.</p><ul><li>If you don’t already have Electron Cash, you can install it from <a href="https://electroncash.org/">here</a>.</li><li>The best method is to import other wallets into Electron Cash by importing your “passphrase”. This is the 12 words you should have written down to back up the wallet. Import that wallet to Electron Cash by selecting “File” then “New/Restore” and following those steps.</li><li>If you can’t restore the wallet from the passphrase, you can try sending the BCH coins to a new Electron Cash wallet. In Electron Cash, go to “File” then “New/Restore”, and make a new wallet. If you do this, make sure you write down the 12-word passphrase, you will need them for Electrum ABC. If you use this method, there’s a chance your coins won’t replay on the eCash network. The transaction can be broadcast manually, but this is more complicated, and therefore it is recommended you use the method where you import the passphrase into Electron Cash directly.</li><li>After the coins are in Electron Cash, you should confirm that the XEC side is now in Electrum ABC. If you do not already have Electrum ABC installed, you can get it <a href="https://www.bitcoinabc.org/electrum/">here</a>. Upon installation, Electrum ABC will copy existing Electron Cash wallets for you.</li><li>If the wallet wasn’t copied automatically, follow that same method you used above to create the same wallet in Electrum ABC. Confirm that you have the XEC side of the unsplit coins in this wallet.</li></ul><h3>Step two: Send BCH to yourself in Electron Cash</h3><ul><li>Now that you have your BCH coins in an Electron Cash wallet, open that wallet.</li><li>To split all the coins in your wallet, go to the “Send” tab and click “Max” after the amount. Alternatively, you can split individual coins from “Addresses” by right-clicking the address you want to split and selecting “Spend from”, and then clicking the “Max” button.</li><li>Go to the “Receive” tab and copy the receiving address.</li><li>Go back to the “Send” tab and paste the address into the “Pay to” field.</li><li>Click on the “Preview” button, and make sure that the address in the “Output” box is colored green. The green address indicates that you are sending the coins to yourself in the same wallet. You can also check that the “Input” coins are the coins that you want to split.</li><li>If everything looks okay, click “Sign” and then “Broadcast”.</li></ul><p><strong>Note:</strong> The reason this method works, and this transaction doesn’t replay on the eCash blockchain, is because Electron Cash inserts a “locktime” in the transaction that prevents it from being spent until a certain block height. Because the eCash blockchain is behind BCH, the transaction created by Electron Cash can’t confirm on the eCash blockchain until a few days later. So you have that time to make a different transaction on eCash. This is not true for most other wallets. It is something specific to Electron Cash and Electrum ABC that they add a locktime to transactions. For this reason, the coin splitting method described in this article only works with Electron Cash and Electrum ABC, and not with most other wallets.</p><h3>Step three: Send coins to yourself in Electrum ABC</h3><ul><li>In Electrum ABC, select the same coin or coins that were split in step one above, and begin a transaction in the “Send” tab.</li><li>Go to the “Address” tab. Right-click and copy the second unused address from the “Receiving” list. Make sure that this address is different than the one used in step one above.</li><li>Go back to the Send tab and paste this different receiving address in the “Pay to” field.</li><li>Click on the “Preview” button to inspect the transaction. Again, check that the “Output” address is green, meaning that you are sending to yourself. Also check that the “Input” addresses are the same, and the “Output” address is different than the ones used when sending coins on the BCH network in Step one.</li><li>If everything looks okay, click “Sign” and then “Broadcast”.</li></ul><h3>Step four: block explorers</h3><ul><li>Wait for confirmations, and check block explorers for both chains. In both Electron Cash and Electrum ABC, this can be done from the “History” tab by right-clicking on the transaction, and choosing “View on block explorer”.</li><li>Make sure that the coins have gone to different addresses on either chain. When you have confirmations on both chains, you have successfully split your coins. Congratulations!</li></ul><p>For more information see <a href="https://e.cash/">e.cash</a>.</p><p>For direct support, please contact us at: <a href="mailto:support@bitcoinabc.org">support@bitcoinabc.org</a>.</p><p>Share: <a href="https://twitter.com/intent/tweet?text=Splitting+eCash+and+BCH+coins+using+Electrum+ABC+and+Electron+Cash+http://www.bitcoinabc.org/2022-02-01-splitting-xec-and-bch/">Twitter</a><br></p>',
            short_content:
                'eCash and Bitcoin Cash share a common history, and became separate currencies via a blockchain split on November 15th, 2020. Because of \b...',
            type: 'Blog',
            media_link:
                'https://www.bitcoinabc.org/2022-02-01-splitting-xec-and-bch/',
            publish_date:
                'Fri Feb 25 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'splitting-ecash-and-bch-coins-using-electrum-abc-and-electron-cash',
            createdAt: '2023-06-20T22:45:59.596Z',
            updatedAt: '2023-06-20T22:45:59.596Z',
            publishedAt: '2023-06-20T22:45:59.587Z',
            legacy_image: '/images/6218a82bf30ff94d3365070b_splitting.jpeg',
            legacy_media_logo:
                '/images/6218a8f444fd6d1db2b4531d_60d1114fcb4e3e2b46511622_bitcoinabclogo-white.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 39,
        attributes: {
            title: '이캐시, 2022년 로드맵 업데이트 완료 작업 순항',
            content:
                '<p>암호화폐 이캐시(eCash)가 2022년 로드맵 업데이트 완료를 위한 작업들이 순조롭게 진행되고 있다고 8일 밝혔다.<br><br>이캐시는 기존에 나와있는 코인보다 기술적으로 뛰어난 것이 특징이다. 실제로 해당 코인은 합의와 보안을 위한 작업 증명과 아발란체 코인(AVAX)의 지분 증명을 기반한 기술을 보유한 유일한 암호화폐다.<br><br><br>최근에는 비트코인의 보안 기술과 이캐시만의 새로운 기술을 합친 하이브리드 작업 증명 작업도 추진 중에 있다.<br><br>또한, 이캐시의 홀더를 위해 스테이킹 보상을 제공하고 있으며, 프로젝트에 확실한 목표의식과 투명성, 신뢰성을 갖고 있어, 향후 암호화폐 투자에 있어 새로운 방향성을 제시할 큰 잠재력을 보유하고 있다고 업계는 평가하고 있다.<br><br>이캐시 설립자이자 책임 개발자 아마우리 세쳇(Amaury Sechet)은 “현재 암호화폐 가격이 많이 내려갔지만 우리에게는 놀라운 일이 아니다”라며, “이캐시는 세계에서 가장 유능한 엔지니어들이 믿을 수 없을 정도로 정교한 개발 작업을 진행하고 있으며, 이더리움이나 비트코인을 능가하기 위해 노력하고 있는 것뿐만 아니라 국가 및 중앙은행과의 시스템을 앞지르기 위해 총력을 다하고 있다”고 이캐시의 높은 발전 가능성에 대해 시사했다<br><br>한편 코인데스크 인터뷰에서 크립토 인베스트먼트 펀드의 CEO 그랙 킹(Greg King)은 “현재 인플레이션이 거시적 관점에서 보면 블록체인 산업과 기술 주식에 영향을 미치고 있기 때문에, 연말에 암호화폐의 가치는 지금보다 훨씬 높을 것으로 기대하고 있다”고 강조했다.<br><br>저작권자 © 아이티비즈 무단전재 및 재배포 금지<br><br><br>출처 : <a href="http://www.it-b.co.kr/news/articleView.html?idxno=56975">아이티비즈(http://www.it-b.co.kr)</a></p>',
            short_content:
                '암호화폐 이캐시(eCash)가 2022년 로드맵 업데이트 완료를 위한 작업들이 순조롭게 진행되고 있다고 8일 밝혔다.\n',
            type: 'News',
            media_link:
                'http://www.it-b.co.kr/news/articleView.html?idxno=56975',
            publish_date:
                'Tue Feb 08 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ikaesi-2022nyeon-rodeumaeb-eobdeiteu-wanryo-jageob-sunhang',
            createdAt: '2023-06-20T22:45:45.801Z',
            updatedAt: '2023-06-20T22:45:45.801Z',
            publishedAt: '2023-06-20T22:45:45.796Z',
            legacy_image:
                '/images/62914d1c95d31d96fdc04969_6201ddab58888d2540842d40_Sample%201-2.jpg',
            legacy_media_logo:
                '/images/61e8e6599bbe7a0bface91cc_toplogo_20200513052047.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 38,
        attributes: {
            title: 'eCash & Other Crypto Upstarts Shrug Bear Threat',
            content:
                '<p>Large price drops in the crypto and stock markets have left investors reeling through the start of 2022. Bitcoin, the largest cryptocurrency by market cap, fell more than 50% to less than $34K, where RSI reached its most ‘oversold’ since the brief crash in March 2020 (Suberg). Traditional equity investments are also in the red, with tech stocks and bond markets hit hardest. The plunge occurred amid threatened interest rate hikes from the U.S. Federal Reserve, decades-high inflation, and supply chain disruption due to the pandemic (Sommer). </p><p>‍<br>A typical investor response — liquidating for cash — is far from a guaranteed safe play in such an inflationary environment. Many still choose to hold onto their assets and hedge against devaluation of the U.S. Dollar. Crypto investors are HODLing before watching the red move to the upside again, and are quietly keeping tabs on tech progress of different blockchain projects through AMAs, community forums, and news reports. Meanwhile, eCash development continues to accelerate through the downturn. Every eCash engineer has worked through at least 1 bear market, and its experienced dev team are on track to complete more ambitious roadmap updates this year, which includes the introduction of bulletproof security and guaranteed transactions.</p><p>‍<br>“Crypto prices are down, but that’s nothing new,” said eCash founder Amaury Sechet. He continues, &nbsp;“Crypto is a competitive place. You have some of the most talented engineers in the world working on incredibly sophisticated products. And you’re not just working to outperform Ethereum or Bitcoin — you are also competing with nation states and central banks.” Indeed, 2021 saw a number of upstart cryptocurrencies outperforming the old guard in both price appreciation and technical performance. Solana (SOL) and Avalanche (AVAX) enjoyed significant gains amid hype for their novel consensus algorithms. These two were voted the best crypto of 2021 by growth rate, but even so, prices came plummeting down &nbsp;— AVAX price dropped by 50%, and SOL by 60% from its highest price point since last November until now. Yes they’ve suffered painful losses, and so have many others. Users are still holding onto their bets, eyeing their favorite cryptocurrencies’ tech and ecosystem potential as key indicators for leading the rebound.</p><p>‍</p><p>eCash (XEC) — is the only cryptocurrency that will use both proof of work as its foundation and Avalanche proof of stake for consensus and security. This will offer some of the same technical advantages of new cryptos like SOL and AVAX, such as staking rewards and near-instant confirmations. Unlike SOL and AVAX, the hybrid proof of work eCash consensus will continue some of the old-school security features that made Bitcoin so successful, like its strong subjectivity, transparency, and reliability. </p><p>‍</p><p>“Investing in crypto is like investing in tech with visibility of what\'s happening as they develop the software, so we all see the fumbles in real time. It produces volatility, but it also brings transparency,” said crypto investment fund CEO Greg King in a recent Coindesk interview. When asked about the bear market, he believes: “End of year crypto values will be much higher than they are now, as inflation is affecting both the blockchain industry as well as traditional tech equities in a macro sense.” </p><p>‍</p><p>eCash, which escaped the technical disruptions of Solana despite being a younger project, is well positioned to catch the next wave of crypto investment. “We are still a new crypto,” continued senior developer Joey King. “We didn’t know there would be a bull market when we started building. Other successful projects — like Avalanche, Solana, and Polkadot — were more mature entering the last bull market, and their price performance reflected that.” For every crypto winter there was an even bigger bull run that followed.</p><p>‍</p><p>And what about the next bull market? </p><p>‍</p><p>“We’re ready.”</p><p>&nbsp;</p><p>Sources:</p><p>1) Coindesk.<a href="https://www.youtube.com/watch?v=xtM4T5Dh9Yw&t=318s"> “Are We In A Crypto Winter?” https://www.youtube.com/watch?v=xtM4T5Dh9Yw&amp;t=318s</a>.<br></p><p>2) Suberg, William. “BTC Price Falls to $34K as Bitcoin RSI Reaches Most ‘Oversold” Since March 2020 Crash”. <a href="https://cointelegraph.com/news/btc-price-falls-to-34k-as-bitcoin-rsi-reaches-most-oversold-since-march-2020-crash">https://cointelegraph.com/news/btc-price-falls-to-34k-as-bitcoin-rsi-reaches-most-oversold-since-march-2020-crash</a>. Jan 22nd, 2022.<br></p><p>3) Sommer, Jeff. “The Markets Tremble As The Fed Lifeline Fades”. <a href="https://www.nytimes.com/2022/01/21/business/economy/stock-markets-down-inflation.html">https://www.nytimes.com/2022/01/21/business/economy/stock-markets-down-inflation.html</a> Jan 21st, 2022. </p><p>‍</p>',
            short_content:
                'Large price drops in the crypto and stock markets have left investors reeling through the start of 2022. Bitcoin, the largest cryptocurrency',
            type: 'News',
            media_link:
                'https://markets.businessinsider.com/news/stocks/ecash-other-crypto-upstarts-shrug-bear-threat-1031155447',
            publish_date:
                'Wed Feb 02 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-other-crypto-upstarts-shrug-bear-threat',
            createdAt: '2023-06-20T22:45:30.841Z',
            updatedAt: '2023-06-20T22:45:30.841Z',
            publishedAt: '2023-06-20T22:45:30.836Z',
            legacy_image:
                '/images/62914d2b38ce5d15be49bab8_61faf8c0fb4f4dd39706b578_3616.jpg',
            legacy_media_logo:
                '/images/61fb5a336eed1c7d122340c4_BI_dark_background_white_vertical.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 37,
        attributes: {
            title: "이캐시 국제 네트워크 의회 'GNC', 라이페이와 블록탐색기 개발 협약 체결",
            content:
                "<p>글로벌 암호화폐 프로젝트 '이캐시(eCash)'의 국제 네트워크 의회 'GNC(Global Network Council)'는 최근 '라이페이(RaiPay)'와 업무협약(MOU)을 체결하고 '라이페이 블록체인 탐색기(Blockchain Explorer, 이하 블록탐색기)' 개발하고 정교화하는 작업을 진행한다고 20일 밝혔다.<br><br>이캐시에 따르면 GNC는 이캐시가 글로벌 디지털 자산으로 도약할 수 있도록 다양한 사업을 전개하고 있다. 실제로 이캐시 개발팀과 채굴 수익 일부를 재투자하는 방식의 '블록 리워드(Block Reward)'를 진행하며 개발자들에게 급여 및 인프라 비용, 운영 및 마케팅 캠페인 관련 필요 자금을 지원하는 것이 특징이다.<br><br><br>GNC는 지속적인 생태계 확장을 위해 라이페이 블록탐색기 개발을 위해 라이페이 팀에게 1 5,000 달러를 지원한다. 이를 통해 탐색기의 기존 코드를 오픈 소스로 전환할 예정이다.<br><br>GNC와 라이페이가 개발하는 블록탐색기는 네트워크 해시 비율, 트랜잭션 증가 및 블록체인 주소 활동 등 블록체인에서 발생한 모든 트랜잭션을 확인할 수 있도록 돕는 블록체인 검색 엔진을 말한다. 특히 암호화폐 거래 유저 등 관련된 이들이 블록탐색기를 활용하여 거래 상태 및 보상 여부 등을 확인할 수 있다. 뿐만 아니라 유동 공급량, 코인 채굴에 필요한 에너지 등을 체크할 수도 있다.<br><br>아울러 이캐시는 내년까지 라이페이 블록탐색기의 기능 편의를 강화하고 최신화를 유지하기 위해 40,000 달러를 추가 지원한다는 계획이다. 이를 바탕으로 모바일 친화적이고 반응이 빠른 인터페이스 제작, 코드 품질 향상 및 문서 추가를 통한 비트코인 ABC팀 및 타개발자들의 개발 환경 개선, Explorer 성능 향상을 위해 BCHD를 고성능 Chronik Indexer로 교체, 데이터의 시각화, 유지 관리 등을 본격 추진한다는 계획이다.<br><br>이캐시 관계자는 \"새로운 블록탐색기의 경우 오픈 소스 블록체인 기술 핵심 기능인 이캐시 네트워크 상의 거래 활동과 관련하여 더욱 투명하고 빠른 정보를 유저에게 제공할 것\"이라고 전했다.<br><br>한편, 이캐시는 현재 30개 이상의 거래소에서 'XEC'로 표기돼 거래 중인 가운데 생태계 성장을 위해 GNC가 승인한 프로젝트를 대상으로 순차적인 투자를 진행하고 있다. <br><br><br><br>출처 : <a href=\"http://www.it-b.co.kr/news/articleView.html?idxno=56563\">아이티비즈(http://www.it-b.co.kr)</a></p>",
            short_content:
                "글로벌 암호화폐 프로젝트 '이캐시(eCash)'의 국제 네트워크 의회 'GNC(Global Network Council)'는 최근 '라이페이(RaiPay)'와 업무협약(MOU)을 체결하고 '라이페이 블록체인 탐색기...",
            type: 'News',
            media_link:
                'http://www.it-b.co.kr/news/articleView.html?idxno=56563',
            publish_date:
                'Thu Jan 20 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ikaesi-gugje-neteuweokeu-yihoe-gnc-raipeiwa-beulrogtamsaeggi-gaebal-hyeobyag-cegyeol',
            createdAt: '2023-06-20T22:45:17.794Z',
            updatedAt: '2023-06-20T22:45:17.794Z',
            publishedAt: '2023-06-20T22:45:17.774Z',
            legacy_image:
                '/images/62914e09c0bf9a165f04a6e1_61e109d8d539fc6eb84443da_GNC-funded-3.jpg',
            legacy_media_logo:
                '/images/61e8e6599bbe7a0bface91cc_toplogo_20200513052047.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 36,
        attributes: {
            title: "RaiPay Block Explorer 2.0 Approved by eCash's GNC",
            content:
                '<p><br>A block explorer is an essential blockchain search engine, similar to Google. It can view all transactions that have taken place on the blockchain, including network hash rate, transaction growth, and even activity on blockchain addresses. Traders, users, miners and crypto enthusiasts all find it useful to check the status of their transactions, confirm block activity in which they may get block rewards from, and even find circulating supply or the amount of energy needed to mine a coin.</p><p>‍<br></p><p>eCash’s Global Network Council is a group of proven stakeholders who approved their next funded project, which is to develop and finesse the RaiPay Block Explorer - a new block explorer that can supports eToken transactions, in addition to only native token ones. For the development of this project, eCash will first fund the RaiPay team $15,000 for open sourcing the explorer’s existing code. Over the next year, eCash will be pooling $40,000 to streamline, modernize and maintain the RaiPay explorer, with the following goals in mind: 1) creating a mobile friendly and responsible interface as a large percentage of crypto users are mobile-first; 2) improving code quality and adding documentation, to make it easy for third-party developers and Team ABC to read and contribute to the explorer; 3) improving performance by replacing BCHD with the highly-performant Chronik Indexer; 4) enhancing user experience by creating fun visuals such as rich list, charts and graphs; 5) routine maintenance such as updating dependencies and fixing bugs.</p><p>‍</p><p>eCash is proud to be working with RaiPay, who first started out as a cryptocurrency enabled PoS terminal connecting merchants to consumers in the form of an online wallet used via smartphone. The new block explorer will provide more transparent and faster information about transaction activities on the eCash network for users, which is the core feature of open-source blockchain technology.</p><p>‍</p><p>eCash believes in redefining wealth and re-introducing the idea of electronic cash to users in the crypto space. Now on over 30+ exchanges with the ticker XEC, eCash is making waves through each approved project, step by step, to reinvest and grow its ecosystem which expands into tech, marketing campaigns, and media partnerships.</p><p>More inquiries about the RaiPay Block Explorer and eCash developments can be sent to <a href="http://pr@e.cash">pr@e.cash</a>.</p><p><br><br><br><br></p>',
            short_content:
                'A block explorer is an essential blockchain search engine, similar to Google. It can view all transactions that have taken place on the...',
            type: 'Blog',
            media_link:
                'https://finance.yahoo.com/news/raipay-block-explorer-2-0-220000229.html?guccounter=1',
            publish_date:
                'Fri Jan 14 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'raipay-block-explorer-2-0-approved-by-ecashs-gnc',
            createdAt: '2023-06-20T22:45:06.163Z',
            updatedAt: '2023-06-20T22:45:06.163Z',
            publishedAt: '2023-06-20T22:45:06.156Z',
            legacy_image:
                '/images/62914e09c0bf9a165f04a6e1_61e109d8d539fc6eb84443da_GNC-funded-3.jpg',
            legacy_media_logo:
                '/images/6108e1a82cc0a775267536a0_60edfdbbc0f5a8b4c7e32e3c_YahooFinanceLogo-p-500.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 35,
        attributes: {
            title: '이캐시(XEC), 리브랜딩으로 토큰 이코노미 새 판 짠다',
            content:
                '<p>[내외경제TV] 여원현 기자 = 이캐시(XEC)가 국제 네트워크 의회 GNC(Global Network Council)를 설립하며 개발자들 사이에서 새로이 주목받고 있다.<br><br>이캐시는 비트코인 캐시 ABC(BCHA)가 지난해 7월 리브랜딩 되어 탄생한 프로젝트다. 비트코인 캐시 ABC와 같은 코인으로, 리브랜딩 과정에서 액면분할을 마쳤다. 1 비트코인 캐시 ABC는 1,000,000 이캐시로 토큰 스왑이 되어 거래 처리 속도와 보완성이 향상되는 등 성공적인 리브랜딩을 마친 것으로 평가받고 있다.<br><br>이와 같은 이캐시가 설립한 GNC는 이캐시가 세계의 디지털 자산이 되는 목표를 달성하기 위해 만들어진 장기적인 대형 투자자 그룹이다. 블록 리워드, 즉 채굴 수익의 일부를 재투자 하는 방식으로 이캐시 개발 팀과 함께 개발자들에게 급여, 인프라 비용, 운영 및 마케팅 캠페인에 필요한 자금을 지원한다. <br><br>이는 블록체인 개발자들이 생태계 확장에 더욱 큰 기여를 할 수 있는 발판으로 여겨지고 있다. 앞서 이더리움, 솔라나, 폴리곤 등 새로운 메인넷 체인들이 등장하면서 초기 비트코인 포크 개발자들은 비교적 수요가 많은 타 메인넷으로 옮겨갔다.<br><br>대다수 블록체인 개발자는 탈중앙화라는 이유로 기부를 통해 지원을 받아왔는데, 이러한 기부형태는 종종 프로젝트의 지향점과 개인의 관심이 일치하지 않아 지속적인 지원이 이뤄지지 않는 경우가 많았다. 하지만 GNC는 일정한 자금을 지원하기 때문에 개발자들이 더욱 개발에 집중할 수 있고 프로젝트가 성장하는 원동력이 된다.<br><br></p><p>특히 이캐시 재단은 아발란체(AVAX)의 합의를 적용하는 막바지 단계에 이르렀으며, 해당 네트워크 예정된 로드맵대로 프로젝트를 운영한다면 화폐를 대신하는 결제 수단으로써 역할을 수행해낼 것으로 기대된다. <br><br>이캐시 관계자는 “이캐시는 초당 500만 건의 거래를 처리할 수 있는 검열 저항성 결제 네트워크를 만드는 동시에 저렴하고 빠르고 신뢰할 수 있는 방식으로 사용하며, 경제적 자유를 전세계에 확산시키는데 도움을 줄 것”이라고 밝혔다.<br><br>이어 “이후 일정으로 탈중앙화 거래소 오픈, NFT 마켓플레이스 론칭 등 구체적인 개발 및 생태계 확장에 대한 논의를 하고 있다”면서 “이캐시에 관심을 갖고 지켜봐주는 전세계 투자자들이 실망하지 않게 최선을 다할 것”이라고 덧붙였다.<br><br>출처 : 내외경제TV(http://www.nbntv.co.kr)</p>',
            short_content:
                '[내외경제TV] 여원현 기자 = 이캐시(XEC)가 국제 네트워크 의회 GNC(Global Network Council)를 설립하며 개발자들 사이에서 새로이 주목받고 있다.',
            type: 'News',
            media_link:
                'http://www.nbntv.co.kr/news/articleView.html?idxno=948554',
            publish_date:
                'Sat Jan 08 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ikaesi-xec-ribeuraendingeuro-tokeun-ikonomi-sae-pan-jjanda',
            createdAt: '2023-06-20T22:44:51.969Z',
            updatedAt: '2023-06-20T22:44:51.969Z',
            publishedAt: '2023-06-20T22:44:51.962Z',
            legacy_image:
                '/images/62914e3c801bc461928f4f9d_61d0e1c04187d94d99ad3574_Screen%20Shot%202022-01-01%20at%203.19.05%20PM.jpg',
            legacy_media_logo:
                '/images/61d92f41b150a9187948399c_printlogo_20210903011424.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
];

export const mockBlogPosts3 = [
    {
        id: 34,
        attributes: {
            title: 'RocketX Enters Partnership with eCash',
            content:
                '<h1><strong>RocketX Enters Partnership with eCash</strong></h1><p>RocketX recently released an official post on its website to announce a partnership with <a href="https://e.cash">eCash</a>. The partnership aims to promote crypto globally while making it more accessible for new users.</p><p>As soon as the news came out, traders searched for an <a href="https://www.cryptonewsz.com/forecast/ecash-price-prediction/">eCash price prediction</a>. RocketX emphasizes Token Transfers and Cross Chain Swaps as a worldwide liquidity aggregator. In seconds, the platform offers access to other ventures across decentralized and centralized exchanges. </p><p>The liquidity aggregator promises minimal slippage and best rates while allowing customers to maintain complete control over their tokens using a non-custodial approach. The latest development will allow RocketX to enhance its exchange and offer low fees, minimal slippage, and the best rates during Swaps.</p><p>Kiran Mannam, RocketX’s Project Lead, talked about the recent development. Kiran showed great excitement in welcoming eCash to boost RocketX’s growth. The venture also plans multiple major integrations in January and February to support XEC. It will also help users get the best rates with decreased gas fees compared to the market. This will add significantly to RocketX’s value proposition while also helping the community.</p><p>The eCash team also showed delight in joining the RocketX ecosystem. The team stated how they are thrilled to join the venture and how it will enable their community to get the best experience.</p><p>Considered to be an on-stop station for value investing and crypto trading needs, RocketX holds major prominence in the market. It allows users to trade any token listed on any exchange without even completing the registration process.</p><p>It is also the first venture that covered the gap between multiple chains via its single-click Cross Chain Swaps. That is why eCash joining hands with RocketX is causing a stir in the industry.</p><p><br></p><p>‍</p>',
            short_content:
                'RocketX announced entering a partnership with eCash to make cryptocurrencies more accessible and drive global adoption.',
            type: 'News',
            media_link:
                'https://www.cryptonewsz.com/rocketx-enters-partnership-with-ecash/',
            publish_date:
                'Mon Jan 03 2022 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'rocketx-enters-partnership-with-ecash',
            createdAt: '2023-06-20T22:44:41.484Z',
            updatedAt: '2023-06-20T22:44:41.484Z',
            publishedAt: '2023-06-20T22:44:41.472Z',
            legacy_image:
                '/images/61d346ca513a60f31fc21e7a_RocketX-Enters-Partnership-with-eCash.jpeg',
            legacy_media_logo:
                '/images/61d3470e20e3c125b5f81555_CryptoNewsZ-Logo-2x.svg',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 33,
        attributes: {
            title: 'GNC Shines Amid High Profile Bitcoin Dev Resignations',
            content:
                '<p>VANCOUVER, British Columbia, Dec. 30, 2021 (GLOBE NEWSWIRE) -- A unique <a href="https://e.cash">eCash</a> feature not found on Bitcoin or Ethereum is beginning to prove its value over tight competition for talented software engineers. Native protocol revenue through block reward reinvestment provides sustainable research and development on eCash, with the potential to be modeled by other leading crypto projects.</p><p>Known in the eCash community as the GNC, or Global Network Council, this is a group of highly qualified eCash mega-whales who have demonstrated long-term commitment to see eCash achieve its goal of becoming digital cash for the world. The GNC funds salaries, infrastructure costs, operations, and marketing campaigns with the eCash development team. A proposal is already approved for the development of a decentralized exchange. A marketing campaign to further promote eCash tech leveraging the Avalanche Protocol will be approved shortly. The Avalanche Protocol, known for its prominent role in the AVAX cryptocurrency, is a proof of stake consensus algorithm that will reduce eCash transaction finality from 10 minutes down to less than 3 seconds. Upcoming proposals to be discussed with the GNC include an NFT marketplace, international marketing campaigns, and growth opportunities in the eCash app ecosystem.</p><p>Most blockchain developers are volunteers, and news reports have stated Bitcoin blockchain project\'s main devs have stepped down from their roles. Many speculated the recent resignations were caused by a lack of funding. Volunteer developers may occasionally be funded by donations, but donations have often come at a price that involves personal interests which may not align with the project\'s main objective. Marketing, engineering, and infrastructure initiatives — paired with a growing developer team — prove the advantages of a protocol revenue approach that allocates a portion of block rewards back into reinvestments and expansion for eCash.</p><p>Inquiries about GNC can be directed to <a href="http://gnc@e.cash">gnc@e.cash</a>. Other questions and comments about project developments can be sent to <a href="http://pr@e.cash">pr@e.cash</a>. </p><p>‍</p>',
            short_content:
                'A unique eCash feature not found on Bitcoin or Ethereum is beginning to prove its value over tight competition for talented software...',
            type: 'News',
            media_link:
                'https://finance.yahoo.com/finance/news/gnc-shines-amid-high-profile-143600530.html',
            publish_date:
                'Thu Dec 30 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'gnc-shines-amid-high-profile-bitcoin-dev-resignations',
            createdAt: '2023-06-20T22:44:27.620Z',
            updatedAt: '2023-06-20T22:44:27.620Z',
            publishedAt: '2023-06-20T22:44:27.613Z',
            legacy_image:
                '/images/62914e3c801bc461928f4f9d_61d0e1c04187d94d99ad3574_Screen%20Shot%202022-01-01%20at%203.19.05%20PM.jpg',
            legacy_media_logo:
                '/images/6108e1a82cc0a775267536a0_60edfdbbc0f5a8b4c7e32e3c_YahooFinanceLogo-p-500.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 32,
        attributes: {
            title: 'eCash Now Shares Latest Updates To Crypto’s 10M Users Via Crypto.com XEC Price Page',
            content:
                '<p>December 21st, 2021</p><p>&nbsp;</p><p>&nbsp;&nbsp;&nbsp;\tThrough Crypto.com\'s <a href="https://crypto.com/price/ecash">eCash XEC Price Page</a>, users can now directly have access to eCash’s RSS news feed. This feature will let<a href="http://crypto.com"> crypto.com</a> community members read eCash’s latest news on the coin, its scalability and tech progress. eCash combines the core tech behind Bitcoin’s success, through proof of work and blockchain with fast transaction speeds leveraging Avalanche protocol. eCash is a digital currency that aims to be an easily accessible form of money transferred from peer-to-peer, with small denominations and fixed supply to maintain its low inflation characteristics.&nbsp;</p><p>&nbsp;&nbsp;&nbsp;\tCrypto.com users will be able to stay on top of the latest news regarding eCash’s products, services and projects. We have roadmap announcements twice a year on our upgrades, and collaborations to share in the coming months. While visiting<a href="http://crypto.com"> Crypto.com</a>\'s site, users can also analyze the latest XEC price, trading volume and supply from its price index (price history, ticker, market cap and live charts).</p><p>&nbsp;&nbsp;&nbsp;\teCash and Crypto.com’s partnership was officially announced in November. eCash is thrilled to be working closely with the world’s fastest growing crypto app, with 10 million users buying and selling 150+ cryptocurrencies at true cost. Crypto.com has many different products and services like its NFT marketplace, visa credit card that allows for up to 8% crypto/fiat back, earn 14.5% per year on its stablecoin holdings, and gives opportunities to monetize on crypto through its loan program. This platform is user-friendly,&nbsp; and easy for crypto users of all levels to trade XEC with no charges via USD, EUR, GBD and over 20+ fiat currencies.&nbsp;&nbsp;</p><p>&nbsp;</p><p><strong>About Crypto.com&nbsp;</strong></p><p>Founded in 2016, Crypto.com has grown into a fully-fledged and well-known international cryptocurrency hub in just a few short years. Its crypto ecosystem consists of the<a href="https://crypto.com/app"> Crypto.com App,</a><a href="https://crypto.com/exchange"> Crypto.com Exchange</a>,<a href="https://crypto.com/defi-wallet"> Crypto.com DeFi Wallet</a>,<a href="https://crypto.com/defi/swap"> DeFi Swap</a>,<a href="https://crypto.com/cards"> Crypto.com Visa Cards,</a><a href="https://crypto.com/defi-wallet#earn"> Crypto Earn,</a><a href="https://crypto.com/credit"> Crypto Credit</a>,<a href="https://crypto.com/price/"> Price Page</a>,<a href="https://crypto.com/nft/marketplace"> NFT marketplace</a>,<a href="https://crypto.com/defi/dashboard/gas-fees"> Ethereum Gas Fees Tracker</a>, and many other services. Crypto.com works with regulatory institutions all over the globe, and aims to bring you the most convenient way to buy, sell, trade, and spend cryptocurrencies. The Crypto.com App allows users to buy over 100 top cryptocurrencies at true cost, to earn high interest on their crypto, to manage their Crypto.com Visa Card, and to easily make crypto payments, along with many other rewarding features. The company’s Crypto.com DeFi Wallet is non-custodial, so users can have full control of their private keys.</p><p>Crypto.com is a highly secure and regulated crypto platform with numerous security certifications and assessments awarded by top security auditors. Crypto.com has obtained the following certificates:</p><p>•&nbsp; &nbsp; &nbsp; \tISO/IEC 27001:2013, ISO/IEC 27701:2019, PCI:DSS 3.2.1, Level 1 compliance and CCSS.</p><p>•&nbsp; &nbsp; &nbsp; \tISO/IEC 27701:2019 Certification for privacy risk management by SGS.</p><p>•&nbsp; &nbsp; &nbsp; \tISO/IEC 27001:2013 Certification for information security management by Bureau Veritas.</p><p>•&nbsp; &nbsp; &nbsp; \tLevel 1 (highest degree) PDC:DSS standard for complying with strict requirements in the payment card industry.</p><p>•&nbsp; &nbsp; &nbsp; \tCCSS (Cryptocurrency Security Standard) — a series of strict security requirements for storing, accepting, and transacting cryptocurrencies.</p><p>•&nbsp; &nbsp; &nbsp; \tAdaptive (Tier 4) rating — National Institute of Standards and Technology (NIST) Privacy Framework</p><p>•&nbsp; &nbsp; &nbsp; \tAdaptive (Tier 4) rating — National Institute of Standards and Technology (NIST) Cybersecurity Framework</p><p><br></p>',
            short_content:
                "Through Crypto.com's eCash XEC Price Page, users can now directly have access to eCash’s RSS news feed. This feature will let crypto.com...",
            type: 'Blog',
            media_link: '',
            publish_date:
                'Tue Dec 21 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-now-shares-latest-updates-to-cryptos-10m-users-via-crypto-com-xec-price-page',
            createdAt: '2023-06-20T22:44:14.745Z',
            updatedAt: '2023-06-20T22:44:14.745Z',
            publishedAt: '2023-06-20T22:44:14.737Z',
            legacy_image: '/images/61c23a5f468d52a227add2c3_Crypto.com_.jpg',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 31,
        attributes: {
            title: '이캐시(eCash), 티커 심볼 등 암호화폐 리브랜딩 완료',
            content:
                '<p>[블록체인투데이 한지혜 기자] 이캐시(<a href="https://e.cash">eCash, XEC</a>)가 로고와 티커 심볼(ticker symbol), 거래 및 투자를 위한 거래소를 현대화하며 암호화폐 리브랜딩을 마쳤다고 지난 14일 공식 발표했다.<br><br>암호화폐 리브랜딩은 2017년 비트코인 캐시(Bitcoin Cash) 설립의 주역이기도 했던 eCash 개발진이 꿈꾸는 비전과 핵심 가치의 연장선상에 있다. 장기 투자자와 지지자에게 헌신하는 eCash 개발진은 초기 프로젝트의 규모와 질을 더욱 끌어올렸다. eCash는 전 세계 사람들을 위해 부와 경제적 자유, 디지털 접근성을 재정의할 전자화폐다.<br><br>오늘날 전통 금융 기관 및 헤지펀드들도 3조달러 규모에 달하는 암호화폐 시장의 문을 속속 두드리고 있다. 그만큼 탈중앙화 플랫폼 지원이 전방위로 거세지고 있으며 디지털 화폐에 대한 투자 매력도 높다. eCash 개발진은 eCash 네트워크에 아발란체(Avalanche) 기술 프로토콜을 접목해 초창기 P2P (peer-to-peer) 디지털 화폐 콘셉트를 완벽에 가까운 수준으로 끌어올렸다.<br><br>아발란체 컨센서스 알고리즘을 활용하면 3초 안에 비트코인보다 빠르게 거래할 수 있으며 전 거래 과정의 안정성 및 프라이버시를 개선하는 한편 분산이 없는(fork-free) 업그레이드를 통해 코인 및 생태계 안정성을 유지할 수 있다.<br><br>eCash의 목표는 모든 사람이 지역과 사회경제적 지위에 상관없이 자신의 돈에 접근할 수 있도록 플랫폼을 민주화하는 것이다. 전자화폐의 가치는 그 취지가 명목화폐와 동일하면서도 더 많은 혜택을 제공하는 데 있다. 명목화폐의 경우 제도권의 규제를 받고, 인플레이션에 취약하며, 지폐의 활용성이 떨어지는 것에 영향을 받는다. 반면 eCash 사용자들은 P2P 거래를 위해 은행 계좌를 개설하거나 신용 카드를 발급받을 필요가 없다. 또한 eCash는 수수료가 0에 가깝고 사용자 간 매입 정보의 상세내역을 보관하지 않는다. eCash는 그 자체로 실질적 가치를 지진 디지털 화폐이자 일상생활에서 더 많은 자원과 지식을 거래할 수 있도록 뒷받침하는 도구 겸 투자 대상이다.<br><br>eCash는 비트코인이나 비트코인 캐시처럼 소수점 이하 8자리가 아닌 2자리로 손쉽게 거래할 수 있도록 시스템을 변경함으로써 비트코인 캐시에서 독립한 이후 단기간에 많은 발전을 일궜다. eCash 개발진은 지난해 코드 라이브러리에 1900개 이상을 커밋(commit)해 eCash 기술 로드맵을 상당히 진전시켰다. 또 사용자들이 eCash를 좀 더 편리하게 이용하고, 코인을 좀 더 쉽게 관리할 수 있도록 캐시탭(Cashtab)과 일렉트룸ABC(Electrum ABC) 월렛을 개선·강화했다.<br><br>eCash에 따르면 비트코인 캐시에서 분사해 독립 프로젝트로 거듭난 2020년 11월 15일과 BCHA에서 eCash로 리브랜딩한 2021년 7월 1일 이후 코인 가격이 각각 1800%, 550% 이상 상승했다. 현재 1BCHA는 100만XEC가 됐다. eCash (XEC)는 리브랜딩 이후 바이낸스(Binance), 후오비(Huobi), 코인엑스(Coinex) 등 30여 곳이 넘는 거래소에 상장했고, 시간이 흘러도 그 가치를 보존할 수 있도록 발행 수량을 21조개로 고정시켜 다른 코인보다 인플레이션 리스크를 낮췄다.<br><br>eCash는 "대규모 로드맵 업데이트를 공개하게 돼 기쁘며, 이는 뛰어난 재정적 접근성과 디지털화로 무장한 미래 세계를 꿈꾸는 eCash에 큰 진전으로, eCash가 경의를 표하던 밀턴 프리드먼(Milton Friedman)이 약 20년 전 예기했던 ‘신뢰할 수 있는 전자화폐’로의 순간이 현실이 되고 있다"고 밝혔다.<br><br>eCash는 NFT를 준비하고 있으며, NFT 거래 시 기존 플랫폼보다 훨씬 낮은 가스비(gas fee, 수수료)가 발생하는 NFT 마켓플레이스를 곧 선보일 예정이다. 트위터에서 ‘eCash’를 팔로우하거나 텔레그램 커뮤니티에 가입하면 더 자세한 정보를 확인할 수 있다.<br><br></p>',
            short_content:
                '[블록체인투데이 한지혜 기자] 이캐시(eCash, XEC)가 로고와 티커 심볼(ticker symbol), 거래 및 투자를 위한 거래소를 현대화하며 암호화폐 리브랜딩을 마쳤다고 지난 14일 공식 발표했다. 출처 : ',
            type: 'News',
            media_link:
                'http://www.blockchaintoday.co.kr/news/articleView.html?idxno=20232',
            publish_date:
                'Wed Dec 15 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ikaesi-ecash-tikeo-simbol-deung-amhohwapye-ribeuraending-wanryo',
            createdAt: '2023-06-20T22:44:01.856Z',
            updatedAt: '2023-06-20T22:44:01.856Z',
            publishedAt: '2023-06-20T22:44:01.851Z',
            legacy_image:
                '/images/62914f62cc46dbc3449bddc0_6193674414dcb859530f678c_Poster%20cover.jpg',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 30,
        attributes: {
            title: 'eCash StealthEx AMA 2021-11-17 ',
            content:
                "<p>Wednesday, Nov 17th, 2021 marks the third AMA(Ask Me Anything) event of eCash, hosted by StealthEX, once again project lead and benevolent dictator Amaury Séchet himself attended the live Q&amp;A session, answering questions from the eCash investors. Below is the recap of the Q&amp;A session:</p><p><br><br><br></p><p>Q1: I am writing this on November 10th and there are five days left before the network update. You are already reading this in the future, I hope everything went smoothly and as you intended. The next major update is worth waiting for on May 15. This date is still far away, but can you share some superficial details about what you are currently working on and what we can expect from spring?</p><p>‍<br></p><p><strong>A1: Well, we are after Nov, 15th, and the network upgrade went perfectly. Right now, the main focus of development is avalanche, and wallet/API.</strong></p><p><br><br><br><br></p><p>Q2: After avalanche post consensus, how long do you think it will be before staking rewards are live? Does enabling staking rewards require a lot of work or will it be relatively easy once post consensus is working?</p><p><br></p><p><strong>A2: The main question about the reward is not so much technical, but what are the specific incentives we want to put in place, make sure the community is happy with them and that they don't encourage perverse behaviour. The best way to move this along is for the community to have a discussion about this and try to come to an agreement.</strong></p><p><br><br><br><br></p><p>Q3: According to the roadmap, eCash's goal is to become a sound currency available to everyone in the world, so can eCash be used as a payment method for Metaverse or NFTs in the future?</p><p><br></p><p><strong>A3: Actually, there is one NFT project that launched a few days ago, but I haven't had the time to look at it personally yet. ecash supports token, and therefore NFT too (NFT are just tokens with a supply of 1). It's really good to see people building on ecash.</strong></p><p><br></p><p><strong>As for payment, I use it as such, but few services supports it as a payment option yet. The community can help on this front to indicate to service providers such as bitpay that there is interest in using their services. The more people do, the more they will notice and the more likely they are to do it.</strong></p><p><br></p><p><strong>One design choice we've made with ecash is to be compatible with BTC and BCH, so any company that supports either can add support for ecash very easily.</strong></p><p><br><br><br><br></p><p>Q4: I think Most people only evaluate projects based on their token value, not the technology the project has. How can @eCashOfficial &nbsp;Founders and team add educational value to their investors so that more people understand the value of your project than the price?</p><p><br></p><p><strong>A4: Well, tokens which do not have a serious technology behind them come and go. When they have good meme attached, they can go pretty high, but then they fall back down.</strong></p><p><br></p><p><strong>Real success is built over time. Bitcoin took more than 10 years to be where it is now. Ultimately, trading meme token for me is like trying to catch falling knives. If your timing fails, you can end up pretty badly hurt.</strong></p><p><br></p><p><strong>The ecash team is really focused on the mission and is focused on delivering things that helps move the mission forward, ignoring the noise. They'll be there during the bear market as much as during the bull market.</strong></p><p><br><br><br><br></p><p>Q5: What is your best estimate as to when eCash will be able to reach its goal of 5M txs/sec?</p><p><br></p><p><strong>A5: It depends on the market more than the tech. When usage grows, resources grow too, and we have a solid plan to make it work.</strong></p><p><br></p><p><strong>So when will people do this many transactions? It depends on so many factors that it is difficult to say. I think we are seeing major economic events profiling themselves. The government has damaged the supply chain and created inflation by printing a ton of money in 2020 and 2021, this kind of event is what gets people to look for alternatives.</strong></p><p><br><br><br><br></p><p>Q6: I know you are getting some fire from people about marketing. Please elaborate on this topic, so they can be satisfied knowing that you are actually doing different marketing projects. Would be nice to read/hear more about this.</p><p><br></p><p><strong>A6: Yes, but it is difficult to predict when exactly. People - including myself - tend to overestimate what will happen short term, and underestimate what is possible long term.</strong></p><p><br></p><p><strong>Anyways, on the marketing front, we are focused on doing something steady more than flashy. Flashy may attract a ton of attention in the moment, but it loses it just as fast, and that's not where we are at. People who expect this to be a 100% marketing project such as SHIBA may be disappointed, but in the end, SHIBA will be long dead that we'll still be there.</strong></p><p><br></p><p>Q7: Following the roadmap I’ve read, is an EVM Subchain will having an advanced feature for eToken like IDE to allow developing, deploying and administering smart contracts? What is the future of eToken?</p><p><br></p><p><strong>A7: Yes, these campaigns attract a lot of people and build a lot of expectations, but ultimately, it all turns into resentment. We prefer being upfront about what we have and what we are building, making realistic promises.</strong></p><p><br></p><p><strong>So there are two things in your next question. First, eToken already exists using the SLP technology. There is work done on making them easier to work within wallets such as cashtab and electrum ABC, but this is a technology that exists today.</strong></p><p><br></p><p><strong>We indeed plan to create an EVM subchain, which would bring full EVM capabilities to ecash, but we must first deploy avalanche for this to be possible.</strong></p><p><br><br><br><br></p><p>Q8: What real advantage does eCash have while sticking with the Nakamoto consensus and incorporating into it the Avalanche consensus as compared to a new cryptocurrency made fully in the Avalanche ecosystem that could also have a denomination like that of eCash?</p><p><br><br></p><p><strong>A8: Avalanche in itself cannot be 100% trustless because there is no way to verify history. For instance, when you start an AVAX node, it connects to trusted servers and downloads a set of trusted peers from there. This means that a powerful actor, such as a state actor, could shut down AVAX. Nakamoto consensus is still required to build a trustless system.</strong></p><p><br></p><p><strong>Another benefit is that the chain remains 100% compatible with BTC and BCH, which makes it much easier to adopt by anyone who already supports these (which is almost everybody in the space).</strong><br></p>",
            short_content:
                'Wednesday, Nov 17th, 2021 marks the third AMA(Ask Me Anything) event of eCash, hosted by StealthEX, once again project lead and benevolent..',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Wed Nov 17 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-stealthex-ama-2021-11-17',
            createdAt: '2023-06-20T22:43:48.137Z',
            updatedAt: '2023-06-20T22:43:48.137Z',
            publishedAt: '2023-06-20T22:43:48.130Z',
            legacy_image:
                '/images/62914f8c34546556e4bd2c1f_61954301524b7fefffd27441_IMG_1244.jpg',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 29,
        attributes: {
            title: 'eCash: One Step Closer To Being The Best Digital Cash In The World',
            content:
                '<p>November 15th, 2021</p><p>\t<a href="https://e.cash/">eCash (XEC)</a> is officially celebrating the completion of its cryptocurrency rebranding, with a modern logo, ticker symbol and top exchanges to trade and invest on. This effort is a continuation of the development team’s vision and core values, who were also the brains behind Bitcoin Cash’s creation back in 2017. With a sincere commitment to longtime supporters and investors, they’ve propelled forward with a bigger and better version of their original project. eCash is an electronic currency that will redefine wealth, economic freedom and digital accessibility to people all over the world.</p><p>\tNow that traditional financial institutions and hedge funds are also dipping their toes into a $3 Trillion cryptocurrency market, there is bigger support for decentralized platforms across all fronts, with a huge appeal for investing in digital currencies. The team working behind eCash has reached another level of perfecting the earliest concepts of peer-to-peer digital currency, leveraging Avalanche technology protocol for the eCash network. This Avalanche consensus algorithm can provide faster transactions than Bitcoin in less than 3 seconds, enhance safety and privacy during the entire process and deliver fork-free upgrades to maintain coin and ecosystem stability.\t</p><p>\teCash’s goal is to democratize the playing field for everyone to have access to their own money, regardless of geography and socio-economic status. The value of digital cash serves the same purpose as fiat with even more benefits; fiat is regulated by authorities, risked by inflation and plagued by the dying relevance of physical money. eCash users do not need a bank account or credit card company to do peer to peer transactions anymore. Its standard is to offer low to zero fees and not store purchasing information details between users. eCash offers itself as a digital currency with intrinsic value, serving as a tool &amp; investment vehicle to trade for more resources and education in one’s daily life.</p><p>\tWithin such a short amount of time, eCash has gone through many improvements since its fork from Bitcoin Cash, by changing to small denominations at 2 decimals for easier transactions, compared to Bitcoin and Bitcoin Cash’s 8 decimals. The development team has made good progress on the eCash technical roadmap, with over 1900 commits to the code repository in the last year. They have also improved and enhanced the Cashtab and Electrum ABC wallets, making it more convenient for people to use eCash and have control over their coins.&nbsp;</p><p>\teCash’s coin launch has proven to be quite profitable over the past year, with price appreciation of +1800% since November 15th, 2020 when it split from Bitcoin Cash and became its own project and +550% since July 1st, 2021 when there was a rebrand launch from BCHA to eCash. Earlier investors of BCHA have benefited greatly, with the redenomination of 1 BCHA = 1 Million XEC. Traders will be happy to know that XEC is now listed on over 30 exchanges after rebranding e.g. Binance, Huobi and Coinex. The appeal of investing in eCash (XEC) is its fixed supply of 21 Trillion XEC - it has low inflation characteristics compared to many other coins, which can help it retain value over time. There are now over 20 press articles of news coverage on eCash’s rebranding, with more updates in the coming months.&nbsp;</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1280px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1280px"><div><img src="/images/6193699dd49c61ad45201813_Poster.png" loading="lazy"></div></figure><p>\teCash team is pleased to share their big roadmap update with users right now. This is a huge leap forward in the future they envision in a more financially accessible and digitally involved world. As a big <a href="https://youtu.be/tAl6sPRFQgk?t=100">homage to Milton Friedman</a>, a “reliable e-cash” that he so hoped for over 20 years ago where people could transfer funds without knowing each other, is a dream coming true. For more information, follow eCash on <a href="https://twitter.com/eCashOfficial">Twitter @eCashOfficial</a> and join its growing community on <a href="https://t.me/ecash_official">Telegram @ecash_official</a>.</p><p><br></p>',
            short_content:
                'eCash (XEC) is officially celebrating the completion of its cryptocurrency rebranding, with a modern logo, ticker symbol and top....',
            type: 'News',
            media_link:
                'https://finance.yahoo.com/news/ecash-one-step-closer-being-130200133.html',
            publish_date:
                'Mon Nov 15 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-one-step-closer-to-being-the-best-digital-cash-in-the-world',
            createdAt: '2023-06-20T22:43:36.283Z',
            updatedAt: '2023-06-20T22:43:36.283Z',
            publishedAt: '2023-06-20T22:43:36.275Z',
            legacy_image:
                '/images/62914f62cc46dbc3449bddc0_6193674414dcb859530f678c_Poster%20cover.jpg',
            legacy_media_logo:
                '/images/6108e1a82cc0a775267536a0_60edfdbbc0f5a8b4c7e32e3c_YahooFinanceLogo-p-500.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 28,
        attributes: {
            title: 'eCash Turkish AMA 2021-10-13 (TR)',
            content:
                "<p>13 Ekim 2021 Çarşamba, eCash'in ikinci topluluğu AMA'yı (Her Şeyi Sor) işaret ediyor, bir kez daha proje lideri ve hayırsever diktatör Amaury Séchet, Türk topluluğunun sorularını yanıtlayan canlı bir Soru-Cevap oturumuna katıldı.&nbsp; Soru-Cevap oturumunun özeti aşağıdadır:</p><p>‍</p><p><strong>Q1. Türkler sizi çok seviyor. &nbsp;Senin bir dahi olduğunu düşünüyorlar. &nbsp;Türkiye'yi ziyaret ettiniz mi? &nbsp;Türk arkadaşın var mı?</strong><br></p><p><strong>A1.</strong>Türkiye'yi birkaç kez ziyaret ettim. Birkaç Türk arkadaşım var, örneğin D programlama dili kitabının yazarı Ali Çehreli ve Emin Gün Sirer.Türkiye, yanlış yönetilen para biriminin neden olabileceği sorunlara iyi bir örnektir. Son yıllarda, bir önceki sürüm neredeyse değersiz hale geldiği için lira değiştirildi. Türkiye'deyken 1,5 milyon otobüs bileti ödediğimi hatırlıyorum, yabancıyken eğlenceli bir merak olsa da, yaşayan ve birikimlerini kaybeden insanlar için yıkıcı bir durum.</p><p><br><br><br></p><p><strong>Q2. xec diğer kurumsal şirketlerle anlaşma yapacak mı? Eğer öyleyse, lütfen birkaç tane belirtin.</strong><br></p><p><strong>A2.</strong> Kasım ayında GNC'de tartışılması gereken konu budur.</p><p><br><br><br></p><p><strong>Q3. Fikir birliği sonrası çığ almaya ne kadar yakınız? &nbsp;Ekim sonuna kadar hazır olur mu?</strong><br></p><p><strong>A3.</strong> Çığ konsensüsünün kendisi orada ve çalışıyor ve aylardır var, ancak hala çalışma gerektiren kısım akran keşfi. Ekim ayının sonunda üretime hazır olması pek olası değil. Ne yazık ki, daha önce hiç çözülmemiş sorunları çözüyoruz, bu nedenle kesin zaman çizelgesini bilmek çok zor. Her durumda, bunu sağlamak için elimizden geldiğince hızlı çalışıyoruz.</p><p><br><br><br></p><p><strong>Q4. Dünyada 7,6 milyar insan tarafından kullanılabilecek evrensel bir dijital para birimi olma konusundaki kişisel görüşünüz nedir? &nbsp;XEC bunu başarabilir mi?</strong><br></p><p><strong>A4. </strong>Benim görüşüm, mevcut para birimlerinin yerini almanın çok zor olduğu. Başarısız olduklarında kaldıkları yerden devam etmeye hazır olmalısınız. Ve fiat para birimi her zaman bir noktada başarısız olur, çünkü güvenilir olması için merkez bankasına güvenirler. Merkez bankasının güvenilmez hale geldiği ve para biriminin değerinin düştüğü her zaman bir nokta vardır. Bu, insanların alternatif istediği ve aradığı zamandır. İnsanlar, günlük olarak kullanılabilen, aynı zamanda tasarruflarını, yok olduklarını görmeden tutabilecekleri bir para birimi istiyorlar. XEC, sabit para olarak iyi özelliklere sahip olacak ve iyi bir değişim aracı olacak şekilde tasarlanmıştır, böylece bunu başarabilir.</p><p><br><br><br></p><p><strong>Q5. Kripto piyasasının tek hakimi olan ve kripto piyasasının tanrısı olarak kabul edilen Bitcoin'den ayrılmanın olumlu yönleri nelerdir?</strong><br></p><p><strong>A5.</strong> Bitcoin değerlidir çünkü en büyük kriptodur. Kardashian gibi: onlar ünlü oldukları için ünlüler. Aynı şekilde Bitcoin de büyük olduğu için büyüktür. Ne yazık ki, Bitcoin iyi bir değişim aracı olmadığı bir yola girdi. Bu, ekosistemi doğrudan Bitcoin kullanmak yerine güvenilir aracıları kullanmaya zorladı. Lightning ağ cüzdanlarının çoğu emanettir ve El Salvador'da gördüğümüz gibi yaygın evlat edinme çabaları da emanettir. Bu, mevcut bankacılık sisteminin yaptığına çok benziyor. Sonunda, aynı sorunları da yaratır.</p><p><br><br><br></p><p><strong>Q6. İnsanlar neden XEC'i seçti? &nbsp;Onu diğerlerinden ayıran en önemli özelliği nedir?</strong><br></p><p><strong>A6. </strong>Çoğu madeni paranın gerçekten benzersiz bir değer teklifi yoktur ve sadece pazarlama yapar. Bu bir süre işe yarar, ancak uzun vadede değil. Bu projeler pompa ve çöplüktür ve bugün kripto pazarının çoğunu oluşturur. XEC bir pompalama ve boşaltma şeması değildir. Bir şeyi çözmeye çalışan madeni paralar için bile, izledikleri yaklaşımın pek mantıklı olmadığını düşünüyorum. Örneğin, BCH iyi bir değişim aracı olmak istediklerini söylüyor, ancak saniyeler içinde onaylanabilecek teknolojileri reddediyor. BTC sansüre dayanıklı olmak istediklerini söylüyor, ancak izledikleri yol aracıları kapı bekçisi yapıyor. 3. büyük proje kategorisi, Ethereum gibi akıllı sözleşme platformlarıdır. Bu projeler çok başarılı olabilir, ancak para sorununu çözmezler. XEC, iyi bir değer saklama aracı ve iyi bir değişim aracı özelliklerine sahiptir, bu da onu daha üstün bir para biçimi yapar.</p><p><br><br><br></p><p><strong>Q7. Küresel patronlar projelerinizi desteklemek istiyor mu? &nbsp;Varsa ne tür talepler var?</strong><br></p><p><strong>A7.</strong> Bunun ne anlama geldiğinden emin değilim. XEC, örneğin BCH'den daha az kurumsal desteğe sahip, ancak diğer yandan, BCH'nin çektiği destek aynı zamanda düşüşüydü. Yanlış insanları cezbetti. XEC ile üzerine inşa edebileceğimiz çok aklı başında bir kültüre sahibiz. Kısa vadede daha zor, ancak daha iyi beklentiler olduğunu düşünüyorum (aslında, XEC değerlemesi BCH'nin şimdiye kadar yaptığından daha fazla büyüdü).</p><p><br><br><br></p><p><strong>Q8. 5 yıl sonra XEC'i nerede görüyorsunuz?</strong><br></p><p><strong>A8.</strong> Umarım, 5 yıl içinde bunun bir hile değil, burada kalacak bir kripto projesi olduğu netleşir. XEC'in şu anda iyi bir yerde olduğunu düşünüyorum ve umarım önümüzdeki yıllarda kültürden ödün vermeden onu çarpıcı biçimde büyütebiliriz.</p><p><br><br><br></p><p><strong>Q9. İnsanlar Google'da eCash yazdığında birçok haberle karşılaşmak istiyorlar. &nbsp;Pazarlama ekibi ne zaman kurulacak?</strong><br></p><p><strong>A9.</strong> Halihazırda yapılan bazı pazarlama çalışmaları var. Birçoğunuzun bu çaba sayesinde burada olduğundan şüpheleniyorum. Çok fazla haber üretmek uzun vadeli bir çaba gerektirir. Kapsamı zamanla biriktireceğiz. Irt'nin aynı anda çok fazla gürültü üretmesi mümkündür, ancak bu stratejideki sorun, sürdürülebilir olmaması ve ardından bir sonraki parlak şeyle değiştirilmenizdir. Sabit olan yarışı kazanır.</p><p><br><br><br></p><p><strong>Q10. eCash, çevrimiçi özelliği ile devrim niteliğindedir.\" Bu devrimi gerçekleştirerek tarihin yeni Satoshi Nakamoto'su olabilirsiniz. Bunun hakkında ne düşünüyorsun? XEC gerçekten bir devrim mi?</strong><br></p><p><strong>A10.</strong>Bunun hakkında fazla düşünmüyorum. Bu olursa yapacağım şeyden çok, projenin onu büyütmek için neye ihtiyacı olduğuna odaklanmaya çalışıyorum. Bu projenin yıllar içinde şimdi olduğundan çok daha fazla büyüme potansiyeline sahip olduğunu düşünüyorum. Topluluk güçlü, yol haritası sağlam ve bence buna meşru bir ihtiyaç var.</p><p><br><br><br></p><p><strong>Q11. CEO'lar sadece Twitter'da kendi ürün ve ürünleri için piyasayı analiz ederken gündeminiz oldukça farklı görünüyor. &nbsp;(Siyaset, Covid ve diğer günlük gelişmeler vb.) Neden XEC hakkında kapsamlı paylaşımlarda bulunmuyorsunuz?</strong><br></p><p><strong>A11.</strong> Julia galef, izci ve savunucu zihniyet hakkında konuşuyor. twitter veya genel olarak medyada birçok kişi savunucu zihniyetini benimsiyor. Başkalarını ikna etmek için buradalar ve gerçekleri bilmeden önce hangi pozisyonda olacaklarını biliyorlar. İzci zihniyetini benimsemeye çalışıyorum. Fikirleri patlatmak ve öğrenmek için buradayım. Bu bir satış taktiği kadar iyi değil, ancak bunu yapmasaydım, dağıtık sistem, ekonomi, kriptografi, bitcoin ve diğer birçok konuyu şu an bulunduğum yere gelmek için ihtiyaç duyacağım derecede anlayamazdım. </p><p><br><br><br></p><p><strong>Q12. eCash dijital nakit olmayı hedefliyor ve gelecekte de bu şekilde kullanılacağını umuyor. Dash ve Bitcoin Cash'te (her ikisi de benzer amaçlara sahip kripto paralar), örneğin tüccarları madeni paralarını mağazalarda kabul etmeye teşvik etmek için ücretli kampanyalar yapıldı. &nbsp;Venezuela ve Kolombiya. &nbsp;Bu tür kampanyaları nasıl değerlendiriyorsunuz ve uzun vadede başarıya ulaşacaklarını düşünüyor musunuz? &nbsp;Diğer bir model ise, örneğin BCH için Townsville gibi çok yerel bir alanda madeni paraların kabulü veya her ikisi de halihazırda aktif bir yerel topluluk etrafında inşa edilmiş gibi görünen BTC için Arnhem'in olduğu günlerde kabul edilmesidir. &nbsp;Bu iki modelden herhangi birini eCash'in denemesi ve kopyalaması için faydalı olacak bir şey olarak görüyor musunuz veya başarıya giden yolun farklı olduğuna inanıyor musunuz?</strong><br></p><p><strong>A12.</strong> Bence Dash gerçekten de ciddi bir rakip. BCH'de değil. BCH topluluğu, dijital nakit olmak istediklerini, ancak madeni paralarının dijital nakit özelliklerini ithal etmek için gerekli adımları atmadıklarını söylüyor. İngilizce'de bir söz vardır: \"Eylemler kelimelerden daha yüksek sesle konuşur\". Bu kriptoda çok yaygındır, bir hedefleri olduğunu düşünürler, ancak daha sonra farklı bir hedef gösterecek şekilde hareket ederler.Evlat edinme söz konusu olduğunda, insanların madalyonun kabul edilmesini sağlamaya çok fazla odaklandıklarını düşünüyorum. Bir tüccarın bir madeni parayı kabul etmesi ve ardından piyasaya sürmesi yardımcı olmuyor. Önemli olan, tüccarın parayı istemesini sağlamaktır, o zaman kabul edeceklerdir. Arnhem Bitcoin şehri ve Townsville bunun için harika. Bitpay gibi genel ödeme işlemcileri de harika bir hizmet sunuyor. Biri hem arzın hem de talebin olduğu bir ekosistem yaratır, diğeri ölçek sağlar.</p><p><br><br><br></p><p><strong>Q13. Avrupa Birliği'nin ortak bir kripto para birimi arayışıyla ilgili haberler yayınlandı. &nbsp;Bir Avrupa vatandaşı olarak eCash hakkında Avrupa Birliği yetkililerini bilgilendirmeyi düşündünüz mü?</strong><br></p><p><strong>A13. </strong>AB gerçekten bir kripto para birimi başlatmayı düşünüyor, ancak aldanmayın, bu projenin kripto para birimi alanıyla hiçbir ilgisi yok. Teknoloji benzer olacak, ancak madeni para %100 ECB'nin kontrolü altında olacak. Bu bir özgürlük aracı değil, tam tersine, halkın parası üzerinde tam kontrol sahibi olmak için bir siyasi merci aracıdır. Bu teknoloji Avrupa vatandaşlarının özgürlüğü için büyük bir tehdit ama saf olmayalım, dünya çapındaki herkesin özgürlüğüne, sanki AB başarılıymış gibi, diğer tüm ülkeler de aynı şeyi yapmak isteyecek. Buna bir alternatif sunmak, XEC'in neden önemli olduğunu düşünmemin önemli bir nedeni.</p><p><br><br><br></p><p><strong>Q14. Mevcut borsalar dışında başka borsalara başvuru olacak mı? coinbase çok talep ediliyor</strong><br></p><p><strong>A14.</strong> Borsalarda XEC almanın en iyi yolu, borsalara talep olduğunu bildirmektir. Bu, topluluğun yardımcı olabileceği bir şeydir. Kullandığınız borsaya XEC'in listelenmesini istediğinizi bildirin. Özellikle coinbase ile ilgili olarak, umarım bir noktada oraya ulaşırız, ancak şu anda paylaşacak bir şeyim yok.</p><p><br><br><br></p><p><strong>Q15. onunla daha fazla şey satın almak isteyen kullanıcılar xec'in 2 sıfır daha sileceğine inanıyor bu konuda ne düşünüyorsunuz</strong><br></p><p><strong>A15. </strong>Asla fiyat tahmini yapmam.</p><p><br><br><br></p><p><strong>Q16. Benim sorum kurumlarla nasıl başa çıkılacağı, kendilerini dünya para birimi olarak kabul ettirmek için nasıl bir vaat ve izlenim verilecek. Paranın ve dünya devi hackerların güvenliğini nasıl sağlayacaksınız?</strong><br></p><p><strong>A16. </strong>Bitcoin ve eCash'e güç veren kriptografi çok sağlam ve şu anda kırılmadı. Bu, borsaların veya cüzdanların çalınmayacağı anlamına gelmez, ancak protokol yıllar boyunca sağlam kalmıştır. Bu şekilde tutmayı düşünüyoruz. Bu çok sağlam ve kanıtlanmış bir teknolojidir.</p><p><br><br><br></p><p><strong>Q17. eCashin upbit dönüşümü neden fiyatı etkilemedi? Upbit borsasındaki hacim neden diğer borsalara yansıtılmıyor?</strong><br></p><p><strong>A17.</strong> Fiyat tahmini yapmıyorum.</p><p><br><br><strong><br></strong></p><p><strong>Q18. Bunlara ne dersiniz: eCash ile ilgili sizi en çok heyecanlandıran şey nedir? Diğer ülkeler Çin gibi kriptoya karşı hareket etmeye başlarsa ne olacağını düşünüyorsunuz? eCash destekçileri projeye en çok yardımcı olmak için ne yapabilir?</strong><br></p><p><strong>A18.</strong> Ülkeler kriptoya karşı harekete geçtiklerinde korktuklarını gösteriyorlar. Bu kötü bir şey ama sürecin gerekli bir parçası. Bir değişiklik olduğunda, yerleşik kişinin yeni gelen hakkında giderek daha güçlü bir şekilde şikayet ettiğini görürsünüz. Ülkelerin yasakladığı kripto, kriptonun artık görmezden gelemeyecekleri kadar büyüdüğünün bir işaretidir. Bu, gazete ve TV'nin Facebook'u suçlamasına çok benzer. Gerçek şu ki, Facebook ve Google, geleneksel olarak gazetelere giden bir ton reklam geliri topladı ve bundan hoşlanmadılar, bu yüzden bu yeni şirketleri kötü bir ışıkta boyadılar.İnsanların şu anda projeye yardımcı olmak için yapabilecekleri, eğer becerileriniz varsa, bunun üzerine şirketler kurmaktır. Desteklenmesini istediğinizi, kullandığınız cüzdanlara, değişikliklere ve diğer hizmetlere bildirin. Ve güçlü bir kültür oluşturmaya ve sürdürmeye yardımcı olun.</p><p><br><br><strong><br></strong></p><p><strong>Q19. XEC'in geleceğin madeni parası olmayı planladığı şey budur. Yatırımcılar olarak buna inandık ve geleceğe yatırım yaptık. XEC, ABD ve SEC düzenlemelerinden etkilenecek mi?</strong><br></p><p><strong>A19.</strong> XEC üzerinde çalışan ekip ABD vatandaşı değil, bu yüzden bu konuda bir endişe yok. Belirteci satmıyoruz - tıpkı Bitcoin gibi mayınlı. SEC'in şu anda bununla bir sorunu yok.</p><p><br><br><br></p><p><strong>Q20. ecash ağı ile çalışan bir internet arama motoru var mı ve ecash ağı elektronik cihazlarla (iota, iotx gibi) etkileşime girebilecek mi?</strong><br></p><p><strong>A20.</strong> Bir arama motorunun XEC veya genel olarak kripto ile ne yapacağından emin değilim. Elektronik cihazların XEC ile etkileşime girmemesi için bir neden yok (örneğin Tobias Ruck, XEC ve eTokens'de ödeme yapabilen NFC kartlarını uygulamıştır). IOTA'nın nesnelerin internetine odaklanması çoğunlukla bir pazarlama hilesidir. gerçek şu ki çoğu kripto bunu yapabilir. Öte yandan, kullandıkları kriptografi geçmişte sıklıkla kırıldığı için IOTA'dan uzak durmanızı tavsiye ederim.</p><p><br><br></p><p>‍</p><p><br></p>",
            short_content:
                "13 Ekim 2021 Çarşamba, eCash'in ikinci topluluğu AMA'yı (Her Şeyi Sor) işaret ediyor, bir kez daha proje lideri ve hayırsever diktatör...",
            type: 'Blog',
            media_link: '',
            publish_date:
                'Wed Oct 13 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-turkish-ama-2021-10-13-tr',
            createdAt: '2023-06-20T22:43:21.296Z',
            updatedAt: '2023-06-20T22:43:21.296Z',
            publishedAt: '2023-06-20T22:43:21.283Z',
            legacy_image: '/images/61673defedc81c2f44f1ee28_Poster-01.png',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 27,
        attributes: {
            title: 'eCash Turkish AMA 2021-10-13 (EN)',
            content:
                "<p>Wednesday, Oct 13th, 2021 marks the second community AMA(Ask Me Anything) event of eCash, once again project lead and benevolent dictator Amaury Séchet himself attended the live Q&amp;A session, answering questions from the Turkish community. Below is the recap of the Q&amp;A session:</p><p>‍</p><p><strong>Q1. Turks love you very much. They think you are a genius. Have you visited Turkey? Do you have a Turkish friend?</strong><br></p><p><strong>A1.</strong> I visited Turkey several times. I have a few Turkish friends, for instance, Ali Çehreli, the author of a book about the D programming language and Emin Gun Sirer.</p><p>Turkey is a good example of the problems that mismanaged currency can cause. In recent years, the lira was changed because the previous version became almost worthless. I remember paying 1.5M for a bus ticket when I was in Turkey, which, while a fun curiosity when you are a foreigner, is devastating for the people living through it and losing their savings.</p><p><br><br><br></p><p><strong>Q2. Will xec make deals with other corporate companies? If so, please specify a few.</strong><br></p><p><strong>A2.</strong> That is the type of matter that should be discussed at the GNC in November.</p><p><br><br><br></p><p><strong>Q3. How close are we to an avalanche after consensus? Will it be ready by the end of October?</strong><br></p><p><strong>A3.</strong> The avalanche consensus itself is there and working and has been for many months, but the part that still requires work is peer discovery. It is unlikely that it'll be production-ready by the end of October. Unfortunately, we are solving problems that have never been solved before, so it is very difficult to know the precise timeline. In any case, we are working as fast as we can to deliver this.</p><p><br><br><br></p><p><strong>Q4. What is your personal view on becoming a universal digital currency that can be used by 7.6 billion people in the world? Can XEC achieve this?</strong><br></p><p><strong>A4. </strong>My view is that it is very difficult to displace existing currencies. You have to be ready to pick up where they left when they fail. And fiat currency always fails at some point, because they rely on the central bank to be trustworthy. There is always a point in time where the central bank becomes untrustworthy and the value of the currency goes down. This is when people want and look for an alternative. People want a currency that is usable on a day-to-day basis, but also where they can keep their savings in without seeing them go away. XEC is designed to have good properties as hard money and be a good medium of exchange, so it can achieve this.</p><p><br><br><br></p><p><strong>Q5. What are the positive aspects of breaking up with Bitcoin, which is the sole ruler of the crypto market and considered the god of the crypto market?</strong><br></p><p><strong>A5.</strong> Bitcoin is valued because it is the biggest crypto. It is like the Kardashians: they are famous because they are famous. In the same way, Bitcoin is big because it is big. Unfortunately, Bitcoin has taken a road where it isn't a good medium of exchange. This forced the ecosystem to use trusted intermediaries instead of using Bitcoin directly. Most lightning network wallets are custodial, and widespread adoption efforts, such as what we see in El Salvador are custodial too. This turns out to be very similar to what the current banking system is doing. In the end, it also creates the same problems.</p><p><br><br><br></p><p><strong>Q6. Why did people choose XEC? What is the most important feature that distinguishes it from others?</strong><br></p><p><strong>A6. </strong>Most coins don't really have any unique value proposition and just do marketing. This works for a while, but not long-term. These projects are pump and dumps, and constitute most of the crypto market today. XEC is not a pump and dump scheme. Even for coins that try to solve something, I think the approach they are taking doesn't make a lot of sense. For instance, BCH says they want to be a good medium of exchange, but rejects technologies that can ensure confirmation in seconds. BTC say they want to be censorship-resistant, but the road they are taking put intermediaries as gatekeeper. The 3rd big category of projects is smart contract platforms such as Ethereum. These projects can be very successful, but they don't solve the problem of money. XEC has the properties of a good store of value and a good medium of exchange, which makes it a superior form of money.</p><p><br><br><br></p><p><strong>Q7. Do global bosses want to support your projects? What kind of demands, if any, are there?</strong><br></p><p><strong>A7.</strong> I'm not sure what this means. XEC has less institutional support than BCH did for instance, but on the other hand, the support BCH attracted also was its downfall. It attracted the wrong people. With XEC we have a very sane culture we can build upon. It's more difficult short term, but I think there are better prospects (in fact, XEC valuation has grown more than BCH's ever did).</p><p><br><br><br></p><p><strong>Q8. Where do you see XEC after 5 years?</strong><br></p><p><strong>A8.</strong> Hopefully, in 5 years, it'll be clear that this is a crypto project that is here to stay and not a gimmick. I think XEC is in a good place now, and I hope we can grow it dramatically over the next years without sacrificing the culture.</p><p><br><br><br></p><p><strong>Q9. When people type eCash on Google, they want to encounter many news. When will the marketing team be established?</strong><br></p><p><strong>A9.</strong> There is already some marketing effort that is being done. I suspect many of you are here thanks to that effort. Producing a lot of news needs to be a long-term effort. We will accumulate coverage over time. It is possible to generate a lot of noise all at once, but the problem with that strategy, is that it is not sustainable, you then get replaced with the next shiny thing. Steady wins the race.</p><p><br><br><br></p><p><strong>Q10. eCash is revolutionary with its online feature.\" By realizing this revolution, you may become the new Satoshi Nakamoto of history. What do you think about this? Is XEC really a revolution?</strong><br></p><p><strong>A10.</strong> I do not think about it too much. I try to focus on what the project needs to make it big more than what I'll do if that happens. I think this project has the potential to grow much bigger than it is now over the years. The community is strong, the roadmap is solid and I think there is a legitimate need for it.</p><p><br><br><br></p><p><strong>Q11. Your agenda looks quite different as CEOs analyze the market for their own products and products only on Twitter. (Politics, Covid and other daily developments etc.) Why don't you share extensively about XEC?</strong><br></p><p><strong>A11.</strong> Julia Galef talks about the scout and the advocate mindset. many people on Twitter or in the media generally adopt the advocate mindset. They are here to convince others and know what position they will have before knowing the facts. I try to adopt the scout mindset. I'm here to bang ideas and learn. This is not as good as a sales tactic, but if I wasn't doing this, then I would not have understood distributed systems, economics, cryptography, bitcoin and many other topics to the degree I would have needed to get where I am now.</p><p><br><br><br></p><p><strong>Q12. eCash aims to be digital cash and the hope is that it will be used as such in the future. In Dash and Bitcoin Cash (both coins with similar goals) there have been paid campaigns to encourage merchants to accept their coins in stores in for instance Venezuela and Columbia. How do you view these types of campaigns and do you think they will lead to long-term success? Another model is acceptance of coins in a very local area like for instance Townsville for BCH or back in the day Arnhem for BTC which both seem to be adoption built around an already active local community. Do you see any of these two models as something that would be beneficial for eCash to try and replicate or do you believe the road to success is a different one</strong><br></p><p><strong>A12.</strong> I think Dash is indeed a serious competitor. BCH is not. The BCH community says they want to be digital cash but are not taking the steps required to improve the digital cash properties of their coin. There is a saying in English: \"Actions speak louder than words\". This is very common in crypto, a project has a goal, but then acts in a way that demonstrates a different goal.</p><p>When it comes to adoption, I think people focus too much on getting the coin to be accepted. Having a merchant accepts a coin and then dump it on the market doesn't help. What is important, is to get the merchant to want the coin, then they will accept it. Arnhem Bitcoin city and Townsville are great for that. Generic payment processors such as bitpay are also providing a great service. One creates an ecosystem where there is both supply and demand, the other provides scale.</p><p><br><br><br></p><p><strong>Q13. News has been published about the European Union's search for a common cryptocurrency. As a European citizen, have you thought about informing the European Union authorities about eCash?</strong><br></p><p><strong>A13. </strong>The EU is indeed considering launching a cryptocurrency, but do not be fooled, this project has nothing to do with the cryptocurrency space. The technology will be similar, but the coin will be 100% under the control of the ECB. This is not a tool of freedom, but to the contrary, a tool for political instance to have total control over the people's money. These technologies are a great threat to the freedom of European citizens, but let's not be naive, to the freedom of everybody worldwide, as if the EU is successful, every other country will want to do the same. Providing an alternative to this is an important reason why I think XEC is important.</p><p><br><br><br></p><p><strong>Q14. Will there be applications to other exchanges other than the current exchanges? coinbase is highly requested</strong><br></p><p><strong>A14.</strong> The best way to get XEC on exchanges is by letting exchanges know that there is demand for it. This is one thing that the community can help with. Let the exchange you use know that you want to have XEC listed. As to coinbase specifically, hopefully, we'll get there at some point, but I do not have anything to share at the moment.</p><p><br><br><br></p><p><strong>Q15.Users who want to buy more stuff with it believe xec will delete 2 more zeros what do you think about itWill there be applications to other exchanges other than the current exchanges? coinbase is highly requested</strong><br></p><p><strong>A15.</strong> I never make price predictions.</p><p><br><br><br></p><p><strong>Q16. My question is how to deal with institutions, what kind of promise and impression will be given to make themselves accepted as the world currency. How will you provide security for money and world giant hackers?</strong><br></p><p><strong>A16. </strong>The cryptography that powers Bitcoin and eCash is very solid and has not been cracked at this time. It doesn't mean that exchanges or wallets don't get stolen, but the protocol has remained solid over the years. We intend to keep it this way. This is a very robust and proven technology.</p><p><br><br><br></p><p><strong>Q17. Why did the eCashin upbit conversion not affect the price? Why is the volume on the Upbit exchange not reflected in other exchanges?</strong><br></p><p><strong>A17.</strong> I do not make price predictions.</p><p><br><br><strong><br></strong></p><p><strong>Q18. How about these: What are you most excited about regarding eCash? What do you think will happen if other countries like China start acting against crypto? What can eCash supporters do to help the project the most?</strong><br></p><p><strong>A18.</strong> When countries act against crypto, they show they are scared. This is a bad thing but it is a necessary part of the process. When there is a change, you see the incumbent complain about the newcomer, in a more and more forceful way. Country banning crypto is a sign that crypto has become big enough so that they cannot ignore it anymore. This is very similar to newspaper and TV blaming Facebook. The reality is that Facebook and Google have collected a ton of ad revenue that traditionally went to newspapers, and they don't like that, so they paint these new companies in a bad light.</p><p>What people can do to help the project at this time is to build companies on it, if they have the skills. Let wallets, exchanges and other services that you use know that you would like to see it supported. And help build and maintain a strong culture.</p><p><br><br><strong><br></strong></p><p><strong>Q19. This is what XEC plans to be the coin of the future. As investors, we believed in this and invested in the future. Will XEC be affected by US and SEC regulations?</strong><br></p><p><strong>A19.</strong> The team working on XEC are not US citizens, so there are no worries on this front. We are not selling the token - it is mined, just like Bitcoin. The SEC does not have a problem with that at the moment.</p><p><br><br><br></p><p><strong>Q20. Is there an internet search engine that works with the ecash network and will the ecash network be able to interact with electronic devices (like iota, iotx)?</strong><br></p><p><strong>A20.</strong> I am not sure what a search engine would do with XEC, or crypto in general. There is no reason electronic devices cannot interact with XEC (for instance Tobias Ruck has implemented NFC cards that can do payments in XEC and eTokens). IOTA's focus on the internet of things is mostly a marketing gimmick. the reality is that most crypto can do this. On an aside, I would recommend staying away from IOTA, as the cryptography they use has often been broken in the past.</p><p><br><br></p>",
            short_content:
                'Wednesday, Oct 13th, 2021 marks the second community AMA(Ask Me Anything) event of eCash, once again project lead and benevolent dictator...',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Wed Oct 13 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-turkish-ama-2021-10-13-en',
            createdAt: '2023-06-20T22:43:09.806Z',
            updatedAt: '2023-06-20T22:43:09.806Z',
            publishedAt: '2023-06-20T22:43:09.800Z',
            legacy_image: '/images/61673defedc81c2f44f1ee28_Poster-01.png',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 26,
        attributes: {
            title: 'eCash XEC interview | New Money From the Creators of Bitcoin Cash',
            content:
                '<figure style="padding-bottom:56.206088992974244%" data-rt-type="video" data-rt-align="fullwidth" data-rt-max-width="" data-rt-max-height="56.206088992974244%" data-rt-dimensions="854:480" data-page-url="https://www.youtube.com/watch?v=SYqY9coBNGw"><div><iframe allowfullscreen="true" frameborder="0" scrolling="no" src="https://www.youtube.com/embed/SYqY9coBNGw"></iframe></div></figure><p>Built by an experienced team of bitcoin developers who founded Bitcoin Cash, eCash is a fork of bitcoin with a more aggressive technical roadmap. Guided by the academic vision of legendary economist Milton Friedman, eCash follows through on key blockchain scaling promises. An innovative Avalanche consensus layer and its own token layer are unique technical highlights of eCash. eCash also aims to introduce features never before seen in a Bitcoin project such as staking, fork-free network upgrades, and subchains.</p><p>Guest: Amaury Séchet, Lead Developer at eCash</p><p>‍<a href="https://www.youtube.com/hashtag/xec">#XEC</a><a href="https://www.youtube.com/hashtag/bitcoincash">#BitcoinCash</a><a href="https://www.youtube.com/hashtag/ecash">#eCash</a>~eCash XEC interview | New Money From the Creators of Bitcoin Cash~</p>',
            short_content:
                'Built by an experienced team of bitcoin developers...',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Fri Oct 08 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-xec-interview-new-money-from-the-creators-of-bitcoin-cash',
            createdAt: '2023-06-20T22:42:56.248Z',
            updatedAt: '2023-06-20T22:42:56.248Z',
            publishedAt: '2023-06-20T22:42:56.242Z',
            legacy_image:
                '/images/6160987ccad1272c3459d661_Screen%20Shot%202021-10-08%20at%2012.11.25%20PM.png',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 25,
        attributes: {
            title: 'eCash AMA 2021-09-27 (KO)',
            content:
                '<p>2021년 9월 27일 월요일에 eCash의 7월 리브랜딩 이후 첫 번째 커뮤니티 AMA 이벤트를 진행했습니다. 프로젝트 리더이자 \'자비로운 독재자\' Amaury Séchet이 직접 라이브 Q&amp;A 세션에 참석하여 한국 커뮤니티를 통해 받은 질문에 답변하였습니다. 다음은 Q&amp;A 세션을 요약한 내용입니다:</p><p>‍<br></p><ul><li><strong>Q 1:<br> KR: XEC와 AVAX 간의 아발란체&nbsp; 구현의 주요 차이점은 무엇입니까?</strong><br></li></ul><ul><li><strong>A 1: </strong><br><strong>KR:</strong> AVAX는 아발란체를 독점적으로 사용합니다. XEC는 아발란체로 개선할 비트코인과 유사한 블록체인입니다. 아발란체의 주요 장점 중 하나는 Bitcoin과 함께 작동하는 모든 시스템이 XEC와 함께 작동하도록 빠르게 적용될 수 있다는 점입니다. 아발란체의 장점을 XEC에 모두 적용될 수는 없겠지만 우선적으로는 약 10분 안으로 모든 거래가 완료 될 수 있다는 이점은 누릴 수가 있습니다.</li></ul><p><br><br></p><ul><li><strong>Q 2: <br>KR: 현재 지식으로 좋은 문화를 육성하기 위해 BCH를 시작할 때 다르게 했을 것이나 문화가 이미 파멸된 것이 있습니까?</strong><br></li></ul><ul><li><strong>A 2: </strong><br><strong>KR: </strong>예, 많은 부분에 있어서 다르게 했습니다. 없앤 문화들은 정확히 기억은 나지 않지만, 원래 저는 가치를 제공하는 것보다 그냥 말만 많은 사람들의 말을 모두 들어주곤 했습니다. 그러다보니 진행을 함에 있어서 괜찮아 보이던 것들이 실질적으로 진행되면서 별로이게 되어 완료 하지 못한 것들도 있긴 했었습니다.<br>결과적으로 좋은 사람들과 함께 좋은 문화를 만드는 것이 가장 좋은 결과를 만들어 주었고 XEC는 그런 면에서 현재 좋은 문화를 만들어 나가고 있습니다.</li></ul><p>‍</p><p><br></p><ul><li><strong>Q 3: <br>KR: 아발란체 이후 XEC 로드맵에서 다음으로 가장 중요한 항목은 무엇이라고 생각하십니까?</strong><br></li></ul><ul><li><strong>A 3:<br>KR: 아발란체는 많은 것을 가능하게 합니다. 그래서 아발란체 이후에 중요한 것은 이를 제대로 구축하는 것이라고 생각합니다. 보안 강화에서 즉각적인 컨펌이 일어나는 부분까지 구축해야할 세세한 부분들이 많고 그 하나하나가 전부 중요합니다.</strong></li></ul><p><br><br></p><ul><li><strong>Q 4: <br>KR: Merklix는 eCash 체인에 어떤 이점이 있습니까? 샤딩에 유용한가요? 구현에 대한 견적이 있습니까?</strong><br></li></ul><ul><li><strong>A 4: <br>KR: </strong>Merklix 트리의 병렬 처리구조는 큰 블록에 이점이 있습니다. <br>XEC는 현재로서는 큰 차이를 만들 정도의 규모로 운영되고 있지는 않습니다만, 추후 XEC가 성공적으로 구현되면 Merklix의 이점이 크게 활용될 것입니다.<br>병렬 처리를 늘리는 것이 같은 시간에 더 많은 것을 처리할 수 있는 유일한 방법입니다.</li></ul><p><br></p><ul><li><strong>Q 5: <br>KR: eCash는 결제용 코인으로서 DeFi를 의식하지 않을 수 없을텐데, 재단에서 구상하는 DeFi 지원 또는 독자적인 유사 탈중앙화금융 시스템 구축 계획은 무엇인지요.</strong><br></li></ul><ul><li><strong>A 5: <br>KR: </strong>DeFi 기능에 대한 계획은 EVM 서브넷을 만드는 것입니다. 오랜 기간동안 사람들은 다르게 작동하는 다른 여러 시스템들과 비트코인을 연결하는 방법을 찾으려 했습니다. 사이드체인이나 드라이브체인과 같은 솔루션은 모두 리버스 페그(즉, 사이드체인에서 메인 체인으로 코인을 다시 가져오는 방법)에 문제가 있습니다. 해당 솔루션은 아발란체로 보다 효과적으로 해결할 수 있습니다.</li></ul><p><br><br></p><ul><li><strong>Q 6: </strong><br><strong>KR: 아발란체 이후 개발 계획은 어떤것이 있나요?</strong><br></li></ul><ul><li><strong>A 6: <br>KR: </strong>무엇보다도 아발란체를 사용하여 보안강화, 컨펌 시간 단축 등 다양한 이점을 제공합니다.<br>이런 여러 작은 부분들이 진행되고 나면 네트워크가 다른 기능을 가진 네트워크에 상호 연결 될 수 있도록 하면서 동일한 코인을 사용할 수 있도록 하겠습니다.<br>가장 가치있는 서브넷 두가지는 프라이버시를 원하는 사람들을 위한 영지식과 발전된 스마트 컨트렉트를 쓸 수 있는 EVM 입니다. 이더리움 처럼 말이죠!</li></ul><p>‍</p><p>‍</p><ul><li><strong>Q 7: </strong><br><strong>KR: 이미 실사용되고있는 리플 등을 뛰어넘기 위한 마케팅 방향을 알고싶네요.</strong><br></li></ul><ul><li><strong>A 7: <br>KR: </strong>최종적으로는 우리가 코인의 가격을 조정하지는 않습니다.<br>우리가 할 수 있는 건 좋은 코인을 만들기 위해 열심히 일하는 것과 사람들이 좋아하는 코인을 만드는 것입니다.<br>이렇게 하는 이유는 코어 기술에 대해서 작업하면서 스케일을 넓힐 수 있으며 더 빠른 컨펌 (2초 미만) 을 가능케 하고 보안성을 높이며 확정성을 좋게 만듭니다.<br>우리는 또한 종종 간과할 수 있지만 기술보다 사실 더 중요할 수 있는 문화를 안정적으로 만들어질 수 있도록 할 것입니다.</li></ul><p><br><br></p><ul><li><strong>Q 8: </strong><br><strong>KR: 이캐시 향후에 소각 계획이 있나요? 그리고 이캐시가 실생활에 활용하기위해 리브랜딩 하는걸로 아는데 실생활에 적용하기위한 프로젝트가 있나요?</strong><br></li></ul><ul><li><strong>A 8: <br>KR: </strong>코인을 소각하는 사람들은 본인들의 코인에 대한 가치를 높게 보지 않는 사람입니다.<br>그 사람들은 투자자들에게 깊은 인상을 주는 마케팅을 하는 것 처럼 보이지만 실질적으로 프로젝트를 버릴 수도 있습니다.<br>저는 XEC가 가치있다고 생각합니다. 그렇기 때문에 소각은 하지 않을 것입니다. <br>소각이 가치 있다고 생각하는 프로젝트 관계자들은 본인들의 코인을 소각하라고 말하고 싶습니다. <br>리브랜딩과 관련해서는 비트코인 ABC 자체가 그다지 좋은 브랜드는 아니어서 그렇습니다.<br>해당 코인이 어떤건지, 무엇을 위한건지, 프로젝트의 가치는 어떤것인지 등 명시되어 있지 않습니다.<br>하지만, eCash는 이에 비해 훨씬 월등합니다.<br>실생활에 활용 되는 것은 화폐를 대신하는 모든 것에 활용 가능하며 해당 이론은 오랜시간동안 유명 경제학자 밀턴 프리드만의 이론이 우리가 원하는 이론을 모두 담고 있다고 말씀드리겠습니다.</li></ul><p><br><br></p><ul><li><strong>Q 9: </strong><br><strong>KR: 이캐쉬 1,000,000 : 1 비율로 리브랜딩하여 코인숫자를 많이 늘린 궁극적인 목표는 무엇인가요?</strong><br></li></ul><ul><li><strong>A 9: <br>KR: </strong>BTC와 BCH는 어떤것을 결제할때 사실 매우 불편합니다.<br>무언가를 사려고 하면 0.00143BTC 처럼 단위가 이상해지죠. 그러다 보면 틀릴 수도 있구요. <br>반면에 통화에 숫자가 큰 것들이 있습니다.한국 원화가 예를 들면 그렇죠.<br>시장을 분석했을때 사람들은 이런것을 선호하는 것으로 판단했고 그래서 코인숫자를 늘리는 방식을 채택하기로 했습니다. <br>코인 가격이 오르면 충분한 마진을 남길 수도 있고 사용하는데 편리하도록 이렇게 변경하였습니다.</li></ul><p>‍</p><p><br></p><ul><li><strong>Q 10: </strong><br><strong>KR: 아발란체 이후 XEC 로드맵에서 다음으로 가장 중요한 항목은 무엇이라고 생각하십니까?</strong><br></li></ul><ul><li><strong>A 10:</strong><br><strong>KR: </strong>우선 사용자에게 가치를 제공하기 위해 아발란체를 적극 활용할 예정입니다.<br>컨펌시간을 단축하고 보안강화 및 서브넷이 가장 중요하다고 생각합니다.</li></ul><p><br><br></p><ul><li><strong>Q 11: </strong><br><strong>KR: 추후에 미국이나 전 세계적으로 CBDC가 도입되었을 때, 이캐시가 공존할 수 있을지 아니면 화폐 기능 대신 이캐시의 어떤 기능이 중심이 될 지 궁금합니다.</strong><br></li></ul><ul><li><strong>A 11:</strong><br><strong>KR: </strong>CDBC는 암호화폐와 동일한 기술을 공유하지만 그렇다고 해서 같은것은 아닙니다.<br>CDBC는 전례 없던 감시와 대중의 재정을 통제하는 데 사용될 것입니다.<br>제 생각에는 eCash는 사람들이 CDBC의 대안으로 가지고 있을 수 있는 화폐이며 그런 대안이 없다면 세계의 재정에 있어서 자유는 크게 줄어들 것입니다.<br>이게 XEC가 존재하는 이유입니다.</li></ul><p><br></p><ul><li><strong>Q 12: </strong><br><strong>KR: 홀더들이 가장 기대하는 것이 스테이킹 보상일건데요.. 현재 발행량의 90%가 유통되고 있는데.. 재단의 보유량, 스테이킹 보상률 및 유지 방안을 알고싶네요.</strong><br></li></ul><ul><li><strong>A 12: </strong><br><strong>KR: </strong>관련해서 아직 결정된 부분은 없으며, 커뮤니티에서 나온 의견을 적극 수렴할 의향이있습니다.</li></ul><p><br><br></p><ul><li><strong>Q 13: </strong><br><strong>KR: 비트코인 정통성을 포기하면서까지 Pos로 전환한 이유와 장점은 무엇인가요?</strong><br></li></ul><ul><li><strong>A 13: </strong><br><strong>KR: </strong>POS로 완전 전환되는것이 아니며 POW는 유지됩니다. <br>POW위에 POS를 활용하는 기능을 추가하는 것입니다.</li></ul><p><br><br></p><p>Korean Telegram Group:<a href="https://t.me/eCashKorea">https://t.me/eCashKorea</a></p>',
            short_content:
                '2021년 9월 27일 월요일에 eCash의 7월 리브랜딩 이후 첫 번째 커뮤니티 AMA 이벤트를 진행했습니다. ',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Mon Sep 27 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-ama-2021-09-27-ko',
            createdAt: '2023-06-20T22:42:42.438Z',
            updatedAt: '2023-06-20T22:42:42.438Z',
            publishedAt: '2023-06-20T22:42:42.419Z',
            legacy_image: '/images/614ab10c87df17510e80fdec_Poster-01.png',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 24,
        attributes: {
            title: 'eCash AMA 2021-09-27 (EN)',
            content:
                "<p>Monday, Sept 27th, 2021 was the first community AMA(Ask Me Anything) event of eCash since the July rebranding, project lead and benevolent dictator Amaury Séchet himself attended the live Q&amp;A session, answering some of the Korean community's most asked questions. Below is the recap of the Q&amp;A session:</p><p>‍<br></p><ul><li><strong>Q 1:<br>EN: What are the key differences between XEC and AVAX in terms of Avalanche implementation?&nbsp;</strong><br></li></ul><ul><li><strong>A 1: </strong><br><strong>EN: </strong>AVAX uses avalanche exclusively. XEC is first and foremost a blockchain that is similar to Bitcoin, which we plan to improve with the avalanche. One of the main advantages of that design is that any system that works with Bitcoin can be very quickly adapted to work with XEC. Obviously, such a system will not have all the advantages avalanche can provide, but it will still be able to benefit from being able to do transactions in about 10 minutes.<br><br></li></ul><p><br></p><ul><li><strong>Q 2: <br>EN: With your current knowledge, is there anything you would have done differently when starting BCH to foster a good culture or was the culture doomed already?</strong><br></li></ul><ul><li><strong>A 2: </strong><br><strong>EN: </strong>Yes, many things. I was too welcoming of many people who didn't contribute a lot of value and generated noise. That being said, it is not a given that even doing it all perfectly, would have been a success, because people are who they are and they bring their culture with them. XEC is in a much better position on that front.<br><br></li></ul><p><br></p><ul><li><strong>Q 3: <br>EN: Ｗhat do you think is the next most important item on the XEC roadmap after Avalanche?</strong><br></li></ul><ul><li><strong>A 3:<br>EN: </strong>Avalanche enables a ton of things, and building these things is the next big thing. There is a ton that can be done, from increasing security to providing instant confirmation. It's not one big thing, but many little ones.</li></ul><p><strong><br></strong><br></p><ul><li><strong>Q 4: <br>EN: How can Merklix benefit the eCash chain? is it useful for sharding? Is there any estimate for its implementation?</strong><br></li></ul><ul><li><strong>A 4: <br>EN: </strong>Merklix tree can be processed in parallel, which is an advantage for very large blocks. XEC is not operating at a scale where this would make a huge difference at this time, but if XEC succeeds, then this will become necessary. increasing parallelism is the only way to process more things in the same amount of time. Implementation is relatively easy, so I'm not worried about it. Deployment would require a hard fork. We have done several in the past, so when the time comes, we'll be able to do this.<strong><br>‍</strong></li></ul><p><strong>‍<br></strong></p><ul><li><strong>Q 5: <br>EN: eCash must be considering DeFi feature as a payment coin. What is the plan to support DeFi or to build its own similar decentralized financial system that you are considering?</strong><br></li></ul><ul><li><strong>A 5: <br>EN: </strong>The plan for DeFi feature is to create an EVM subnet. For a very long time, people have been wondering how to link bitcoin with other systems that work differently. Solutions like side chains or drive chains have been proposed, but they all have a problem with the reverse peg (namely, how to bring back coins from the sidechain to the main chain). This problem can be solved more effectively with an avalanche.</li></ul><p>‍</p><p><br></p><ul><li><strong>Q 6: </strong><br><strong>EN: What is the development plan after Avalanche?</strong>&nbsp;<br></li></ul><ul><li><strong>A 6: <br>EN: </strong>First and foremost, using avalanche to provide all the benefits it can: increased security, faster confirmation time and so on. There are many small things that can be done here. After that, subnets so that the network can interconnect with other networks with different features, but using the same coin at the core. I think the 2 most valuable subnets would be a zero-knowledge one for people who want privacy and an EVM one, so that people can run more evolved smart contracts, just like on Ethereum.</li></ul><p>‍</p><p><br></p><ul><li><strong>Q 7: </strong><br><strong>EN:I&nbsp;would like to know your marketing plan to outperform other coins in the market.</strong><br></li></ul><ul><li><strong>A 7: <br>EN: </strong>At the end of the day, we do not control the price of the coin. What we can do is work hard to try to make a good coin and that people will like it. We do so by working on core technologies that will allow better scalability, faster confirmations (&lt; 2s), better security, and better extensibility. We are also making sure that the culture stays sound, which is something that is too often neglected, but is probably even more important than the tech.</li></ul><p>‍</p><p><br></p><ul><li><strong>Q 8: </strong><br><strong>EN : Do you have any plans to burn eCash in the future? And I know that this eCash is being rebranded to be used in real life. How are you guys managing this?</strong><br></li></ul><ul><li><strong>A 8: <br>EN: </strong>The people who burn their coins think their coins are not valuable. They want to do marketing, a stunt to impress naive investors so they can dump on them. We think XEC is valuable, and therefore we will not burn any. Anyone who thinks burning is valuable can prove us wrong by burning their own coins. As for the rebranding, Bitcoin ABC just isn't a good brand. It doesn't say what it is, what it is for, what the values of the projects are, etc... ecash is much better. eCash can be used everywhere that could replace fiat currency. This is the term that has been used for years, including by famous economist Milton Friedman, and which conveys immediately what we are about.<br>‍</li></ul><p>‍<br></p><ul><li><strong>Q 9: </strong><br><strong>EN: What is the ultimate goal of increasing the number of coins by rebranding eCash at a ratio of 1,000,000: 1</strong><br></li></ul><ul><li><strong>A 9: <br>EN:</strong>With the BTC of BCH, it is very inconvenient to pay for something. The price will be 0.00143 or something like this. One has to count the zeros and it is easy to get it wrong. On the other hand, there are many currencies out there with large numbers. This is the case in Korea for instance. People prefer this. So we made the choice to change the denomination in this way. We made sure we left a good margin for the price to increase and the coins to remain convenient to use.</li></ul><p>‍</p><p><br></p><ul><li><strong>Q 10: </strong><br><strong>EN: What do you think is the next most important point in the XEC roadmap after Avalanche?</strong><br></li></ul><ul><li><strong>A 10:</strong><br><strong>EN: </strong>Leveraging avalanche to provide value to users in general. Faster confirmation time increased security, and subnets are what we are looking at.</li></ul><p>‍</p><p><br></p><ul><li><strong>Q 11: </strong><br><strong>EN: When CBDC appears in the United States and globally, I wonder if eCash can coexist with it or which features of eCash will be the focus instead of the monetary feature.</strong><br></li></ul><ul><li><strong>A 11:</strong><br><strong>EN : </strong>While CDBC shares common technologies with cryptocurrencies, they are not the same thing at all. They will be used to do mass surveillance and to control people's finance to a degree that never existed before. In my view, it is capital that people have an alternative to CDBC available, or freedom in the world will be greatly reduced. This is why XEC exists.</li></ul><p>‍</p><p>‍</p><ul><li><strong>Q 12: </strong><br><strong>EN: The staking reward might be what holders expect the most. 90% of the issued eCash is circulating now in the market. I would like to know the amount of how many eCash that the foundation has and the staking reward rate, and how to maintain it.</strong><br></li></ul><ul><li><strong>A 12: </strong><br><strong>EN:</strong>These decisions have not been settled yet, and input from the community would be welcome.</li></ul><p>‍</p><p><br></p><ul><li><strong>Q 13: </strong><br><strong>EN: What are the reasons and advantages of switching to POS while giving up Bitcoin legitimacy?</strong><br></li></ul><ul><li><strong>A 13: </strong><br><strong>EN: </strong>We are not switching to PoS. PoW is here to stay. We are adding features on top of PoW which leverage PoS.</li></ul><p><br>‍</p><p>Korean Telegram group: <a href=\"https://t.me/eCashKorea\">https://t.me/eCashKorea</a></p><p>‍</p><p>‍<br></p>",
            short_content:
                'Monday, Sept 27th, 2021 was the first community AMA event of eCash since the July rebranding',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Mon Sep 27 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'ecash-ama-2021-09-27-en',
            createdAt: '2023-06-20T22:42:28.642Z',
            updatedAt: '2023-06-20T22:42:28.642Z',
            publishedAt: '2023-06-20T22:42:28.633Z',
            legacy_image: '/images/614ab10c87df17510e80fdec_Poster-01.png',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 23,
        attributes: {
            title: "Amaury Séchet on Bitcoin ABC's Rebirth as eCash and Avalanche's Advantages",
            content:
                '<figure class="w-richtext-figure-type-video w-richtext-align-fullwidth" style="padding-bottom:56.206088992974244%" data-rt-type="video" data-rt-align="fullwidth" data-rt-max-width="" data-rt-max-height="56.206088992974244%" data-rt-dimensions="854:480" data-page-url="https://www.youtube.com/watch?v=DjeES2d26qM&t=2088s"><div><iframe allowfullscreen="true" frameborder="0" scrolling="no" src="https://www.youtube.com/embed/DjeES2d26qM?start=2088"></iframe></div></figure><p>‍</p><p>Amaury Séchet, founder of Bitcoin Cash and now head of Bitcoin ABC relaunch as eCash, a new project dedicated to becoming the best digital cash in the world. We go into the history of Bitcoin Cash, its current development state, and what has happened since the split. We go over what aspects digital cash needs to have in order to achieve wide adoption. And, we go into how eCash uses Avalanche consensus in order to provide a second layer which can advance very quickly and provide services that plain old Nakamoto consensus cannot.<br></p>',
            short_content:
                'Amaury Séchet, founder of Bitcoin Cash and now head of Bitcoin ABC relaunch as eCash, a new project dedicated to becoming the best digital..',
            type: 'Blog',
            media_link: 'https://www.youtube.com/watch?v=DjeES2d26qM&t=2088s',
            publish_date:
                'Sat Aug 28 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'amaury-sechet-on-bitcoin-abcs-rebirth-as-ecash-and-avalanches-advantages',
            createdAt: '2023-06-20T22:42:16.717Z',
            updatedAt: '2023-06-20T22:42:16.717Z',
            publishedAt: '2023-06-20T22:42:16.710Z',
            legacy_image:
                '/images/612aa4591c63184cbe500df2_Screen%20Shot%202021-08-28%20at%202.00.37%20PM.png',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 22,
        attributes: {
            title: 'How Blockchain Will Change the Way We Work, Play and Stay Healthy in the Future',
            content:
                '<p>Blockchain may not be as famous as Bitcoin (<a href="https://www.nasdaq.com/market-activity/cryptocurrency/btc">BTC</a>) and <a href="https://www.nasdaq.com/articles/decoding-crypto%3A-how-to-buy-sell-and-track-cryptocurrencies-2021-08-12">many of the cryptocurrencies</a> that it works to power across an ever-evolving ecosystem, but the technology’s applications may be capable of stretching further than the coins it supports. </p><p>In the post-pandemic world, society is changing at a rapid rate, and so too is the concept of wealth. Where in traditional circles that hinge on fiat money, wealth can equate to cash, property and generational financial security, but cryptocurrency takes the notion of wealth and stretches it further. </p><p>While blockchain-powered cryptocurrency projects can also deliver wealth in a traditional sense, the technology opens the door to other forms of wealth, such as privacy, decentralization, and personal safety from third party and governmental intrusion. </p><p>In the right hands, <a href="https://www.nasdaq.com/articles/mindfulness-industry-to-embrace-crypto-and-blockchains-potential-2021-08-17">blockchain brings</a> new meaning to wealth to a society that has experienced changing values in the wake of the recent health crisis, and the technology will emerge as a disruptive force across a wide range of industries. </p><p>As a peer-to-peer distributed digital ledger of time-stamped transactions, the applications of blockchain are virtually limitless. As <a href="https://cri-lab.net/security-in-blockchain-applications/">data shows</a>, the technology can revolutionize lending, security, consumerism, business models and digital property. And this is just the tip of the iceberg of its wider capabilities. </p><p>The underlying ethos of blockchain-powered cryptocurrencies has been to decentralize power away from central banks through digital finance, making technology a driving force in the fight back against the centralized control of banks and governments. </p><p>In a post-pandemic society that’s becoming increasingly wary of the hegemony of <a href="https://blogs.lse.ac.uk/politicsandpolicy/why-this-government-may-never-regain-the-trust-of-the-people/">global governments</a> and leading institutions, blockchain may be the technology that’s best placed to adapt to these deep rooted cultural changes. Let’s take a look at the many ways blockchain can adapt to a rapidly changing world. </p><h2>The Case for Security</h2><p>Blockchain marketplaces are naturally more secure than their traditional counterparts. The nature of the public ledger is that the data within the blockchain is fully encrypted and protected, meaning that no single party has the power to manipulate the information within, making the technology ideal for startups to leverage. </p><p>We’re already seeing this being applied in the world of gaming and NFTs. Where there had been no truly safe spaces for gamers to trade and conduct transactions on their collectibles, users have been forced to place their trust in shady forums acting as makeshift marketplaces to facilitate demand - opening themselves up to cyber attacks and scammers. </p><p>As <a href="https://interpret.la/as-nfts-boom-gamers-are-driving-cryptocurrency-growth/">data shows</a>, cryptocurrency and gamers are a natural combination, with many significantly higher volumes of users trading cryptocurrencies than non-gamers. </p><p>To help cement the symbiotic relationship between gaming and crypto, blockchain startups like Gameflip have launched their own coin. Gameflips\' FLIP is a token <a href="https://www.inc.com/bill-carmody/3-biggest-ways-blockchain-will-change-society.html">tailor-made for scaling</a> the peer-level buying, selling and trading of goods for video games. </p><p>The goal of these marketplaces is to offer a genuinely safe space for gamers to conduct transactions in confidence, all generated through immutable blockchain technology. </p><p>However, there are many more scenarios where blockchains can be used to provide greater security at a time where privacy is so scarce. </p><p>eCash, pioneered by <a href="https://www.nasdaq.com/articles/bitcoins-blockchain-is-the-timechain-lets-call-it-that-2021-08-14">Bitcoin’s</a> ‘fallen angel’ and one of the ecosystem’s biggest innovators, Amaury Sechet, who diverged from the world’s most famous cryptocurrency to create Bitcoin ABC with the ambition of making the coin far more practical than its predecessor, has been designed with privacy and security as a priority. </p><p>Created using the revolutionary Avalanche blockchain, eCash is built on a consensus algorithm that enables instant transactions, fork-free upgrades and enhanced security. Tapping into the societal concerns about privacy and <a href="https://www.computerweekly.com/news/252494451/Most-British-people-dont-trust-government-with-personal-data">mistrust of centralized powers</a>, eCash’s blockchain focuses on bringing a technically sound, politically decentralized governance protocol to the crypto ecosystem as a means of championing the privacy of its adopters - all through an adaptive blockchain. </p><h2>Supporting a Health-Conscious Culture</h2><p>The Covid-19 pandemic has brought interest in healthcare back to the fore in both the developed and developing world alike. </p><p>The key issue with healthcare systems around the world is that there’s a lot of legacy technology at work when it comes to storing medical records and the transferring of medical data from one specialist to another. </p><p>This means that keeping a full medical record can be tough for patients as their history could span many years of different practitioners trying different treatment approaches and using different medicines along the way. In short, there can be a significant breakdown in essential <a href="https://101blockchains.com/blockchain-change-the-world/#:~:text=With%20blockchain%2C%20real%20estate%20can,and%20real%2Dtime%20payment%20settlements.">collaboration and communication</a> when it comes to maintaining the health of patients.</p><p>Blockchain can help to completely change how healthcare is managed by enabling decentralized record holding with data becoming accessible as and when required. </p><p>This technology can also help to enable health practitioners in learning about patient cases more comprehensively and swiftly - ensuring that they can be treated faster with less waiting time in between gathering and interpreting the information. </p><p>Furthermore, blockchain can also combat the circulation of fraudulent drugs and treatments, due to its immutable qualities.</p><p>In a world that’s evolved to covet privacy and authenticity due to being burdened by an outdated and insecure financial ecosystem, blockchain stands as a leading solution for changing the world in line with societal awareness.</p><p>As we move away from the age of the pandemic and towards the era of the ‘new normal,’ it’s likely that blockchains will be front and center of the progress we make in addressing these new societal concerns and redefining the true meaning of wealth in the brave new world of digital finance. </p><p>‍</p><p>‍</p><p>‍</p>',
            short_content:
                'Blockchain may not be as famous as Bitcoin (BTC) and many of the cryptocurrencies that it works to power across an ever-evolving ecosystem.',
            type: 'News',
            media_link:
                'https://www.nasdaq.com/articles/how-blockchain-will-change-the-way-we-work-play-and-stay-healthy-in-the-future-2021-08-26',
            publish_date:
                'Fri Aug 27 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'how-blockchain-will-change-the-way-we-work-play-and-stay-healthy-in-the-future',
            createdAt: '2023-06-20T22:42:04.529Z',
            updatedAt: '2023-06-20T22:42:04.529Z',
            publishedAt: '2023-06-20T22:42:04.523Z',
            legacy_image:
                '/images/61290b3a2bcc80b599c592fe_technology13-adobe.jpg',
            legacy_media_logo:
                '/images/61290b40e2b00590b84eea17_1200px-NASDAQ_Logo%20white.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 21,
        attributes: {
            title: 'The Future is Borderless: How Digital Finance Can Change Payments Across Europe',
            content:
                '<p>The cryptocurrency landscape is slowly but steadily changing the way that we do business around the world. The notion of having a currency that’s free of governmental influence and the prospect of leveraging payments across borders without the process being impacted by the meddling of banks and bureaucracy is certainly an appealing one, but with the help of <a href="https://www.entrepreneur.com/topic/blockchain" target="_self">blockchain frameworks</a>, we may be heading toward a brave new world of limitless possibilities. </p><p>It was only a matter of a few years ago that the term <em>blockchain</em> was only known to a handful of people outside the fledgling world of cryptocurrencies. Today, the technology has become much more widely known, largely owing to the growth of Bitcoin. Although cryptocurrencies are the best-known application of blockchain today, there’s limitless potential for the technology. As a secure and fully decentralised ledger, blockchain can bring positive change to many industries. </p><p>One sector that’s ripe for innovation can be found in the <a href="https://www.eureporter.co/economy/2020/12/16/the-blockchain-will-transform-cross-border-business/">cross-border money movement</a> in multi-commodity trading business. These companies can involve countless stakeholders, intermediaries and banks all having to push and pull in the same direction to make deals happen. </p><p>As the <a href="https://www.gminsights.com/industry-analysis/blockchain-technology-market">data shows</a>, the European blockchain market is set to experience sustained growth over the course of the decade, opening the door to more comprehensive use cases across the continent. </p><p>We can already see emerging evidence of blockchain-based borderless solutions arriving across Europe and beyond, many of which offer a glimpse into the vast potential of digital finance. </p><h2><strong>Bridging borders throughout Europe.</strong></h2><p>Blockchain-based cryptocurrency transactions are already becoming available across Europe, and companies like Bottlepay have opened the door to a cross-border payment infrastructure across the continent that’s free of silos and middlemen. </p><p>The UK-based app facilitates real-time, cross border transfers of both cryptocurrencies and fiat money and the company has recently expanded its range of services across Europe — paving the way for international payments in both Euros and <a href="https://www.entrepreneur.com/article/368694" target="_self">Bitcoin</a>.</p><p>Both UK and European versions of the app are set to support BTC payments internationally, including the withdrawal of Bitcoin from Crypto ATMs and online merchants. </p><p>Bottlepay is also highly in tune with social networks, and is leveraging payments via Twitter with plans to expand its services to Reddit, Telegram, Discord and Twitch over the coming weeks and months. </p><p>“Bottlepay is attempting to rewrite the rules when it comes to cross-border transactions. Half a billion people across the UK and Europe can now make cost-effective, instant payments to each other with a payments app that’s built on top of the Bitcoin Network,” explained Bottlepay founder, <a href="https://www.electronicpaymentsinternational.com/news/bottlepay-cross-border-transactions-europe/">Pete Cheyne</a>. “By launching in Europe, we are demonstrating the power of Bitcoin as an open-source monetary system.”</p><p>“We have created a payment rail that can process cross border payments immediately, at a low cost. It’s a much-needed update on the clunky, outdated payment systems available up until now, and a leap towards better financial inclusion for everyone.”</p><h2><strong>Championing security across the continent.</strong></h2><p>Blockchain technology can not only make payments across Europe more efficient, but it can also contribute to a much more secure financial ecosystem. </p><p>Records on cross-border blockchains would be secured via cryptography. Network participants have their own private keys assigned to their transactions, which operate in a similar way to digital signatures. If these records are edited in any way, the signature will instantly become invalidated - immediately alerting the peer network to the changes occurring. </p><p>Because blockchains are decentralised and distributed across peer-to-peer networks, the chain is synchronised through many different locations. This means that a blockchain can’t be changed from <a href="https://www.paymenteye.com/2019/05/22/5-ways-blockchain-can-change-the-cross-border-payments-landscape/">any central location</a>, and if a hacker or external party wanted to change the data, they would need to access 51 percent of the participants and alter their information simultaneously — an act that would require immense computing power. </p><p>It’s this attention to privacy that can be invaluable for large-scale cross-border transactions on the continent. The <a href="https://www.entrepreneur.com/article/365984" target="_self">blockchain technology</a> to support such privacy is constantly evolving, too. </p><p>We can see evidence of the future of blockchain in the recent development of Avalanche, the revolutionary consensus algorithm that powers eCash — the new cryptocurrency devised by industry stalwart and innovator, Amaury Sechet. </p><p>Sechet was a central part of Bitcoin ABC movement and is now turning his attention to redefining wealth by creating a pragmatic cryptocurrency that will enable instant, borderless transactions that prioritise security against central influence and fork-free upgrades. </p><h2><strong>Driving emerging technology adoption.</strong></h2><p>Blockchain-powered payments are also helping emerging industries to accelerate their growth across Europe. </p><p>European electric vehicle drivers, for instance, will now be able to recharge their cars through the use of cryptocurrencies after a collaboration between two fintech platforms paved the way for a more universal payment option for 50,000 charging points across the continent. </p><p>Driving this change is Vourity, a Swedish payments firm, and Hips Payment Group in a partnership to empower EV users in Europe. Hips’ network has its own cryptocurrency, MTO, and its blockchain-based payments process intends to match consumer protections offered by credit card providers albeit with more flexibility. </p><p>"We want to make it easy for drivers to charge their car, and offering an open platform that allows for crypto payments is the most logical choice for our next-generation world," said Hans Nottehed, <a href="https://markets.businessinsider.com/currencies/news/europe-electric-vehicle-drivers-pay-recharge-cryptocurrency-crypto-fintech-2021-6">Vourity CEO</a>.</p><p>This development has enabled users around Europe to use cryptocurrency payments as easily as they can use Apple Pay, Google Pay, Swish and Bluecode to charge their cars.</p><p>Although the move is very niche in its application at this stage, it provides valuable options to electric vehicle owners and offers them a consistent choice for payment no matter where they go in Europe — making it the perfect example of the freedom that <a href="https://www.entrepreneur.com/article/374076" target="_self">blockchain-driven cryptocurrencies</a> are capable of providing both businesses and consumers around the continent.</p><p>‍</p><p>‍</p>',
            short_content:
                "We've already seen emerging evidence of blockchain-based borderless solutions arriving across Europe, many of which offer a glimpse into ...",
            type: 'News',
            media_link: 'https://www.entrepreneur.com/article/377924',
            publish_date:
                'Tue Aug 17 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'the-future-is-borderless-how-digital-finance-can-change-payments-across-europe',
            createdAt: '2023-06-20T22:41:50.325Z',
            updatedAt: '2023-06-20T22:41:50.325Z',
            publishedAt: '2023-06-20T22:41:50.317Z',
            legacy_image:
                '/images/612181554cc3ca673eaa5a02_1627071640-GettyImages-1125856232.jpg',
            legacy_media_logo:
                '/images/612184c0a716307f792bd68c_entrepreneur-logo.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 20,
        attributes: {
            title: 'Weownomy Warning ',
            content:
                '<p>Crypto products that offer “investments” without having a product are usually scams</p><p><br></p><p>On Aug 4, a press release announced an unaffiliated project called “Weownomy” will use eCash.</p><p><br></p><p>The eCash team has never been in communication with this project.</p><p><br></p><p>Crypto products that offer “investments” without having a product are usually scams.</p><p><br></p><p>Be careful out there.</p><p><br></p>',
            short_content: 'Weownomy warning!',
            type: 'Blog',
            media_link: '',
            publish_date:
                'Wed Aug 11 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'weownomy-warning',
            createdAt: '2023-06-20T22:41:35.787Z',
            updatedAt: '2023-06-20T22:41:35.787Z',
            publishedAt: '2023-06-20T22:41:35.779Z',
            legacy_image:
                '/images/6115a87e3c9399bb182a7cad_diverse-computer-hacking-shoot.jpeg',
            legacy_media_logo: '',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 19,
        attributes: {
            title: 'Is There a Future for Cryptocurrencies Without Privacy Features?',
            content:
                "<p>The vast majority of crypto assets have no default privacy features, raising questions about how viable this approach is. Everyone in the financial industry can benefit from privacy-oriented solutions, and cryptocurrencies should not be an exception.</p><p><br></p><p><strong>Why Privacy Is Needed In Finance</strong></p><p>There has been a notably higher demand for financial privacy over the past few years. Initiatives such as PrivacyRightsNow illustrate that point perfectly. The goal is to have consumers achieve a higher degree of privacy rather than keep empowering financial institutions and governments. There are many good reasons why financial privacy is a must and should, in theory, be a fundamental right for all humans.</p><p><br></p><p>The first significant issue in the current system comes through telemarketers. As if unwanted emails about loans, savings, and other financial services weren't enough, telemarketer calls make things even more problematic. Whether banks and their affiliates sell this information to telemarketing companies will always remain a guessing game. However, there have been incidents of financial institutions and their affiliates sharing customers' financial data with telemarketers for a fee.&nbsp;</p><p><br></p><p>A second issue is the growing threat of identity theft and stalking. As consumers' financial details are exposed online, criminals can leverage these details to perform identity theft. As the sharing of social security numbers is not entirely uncommon, a very serious problem is created. In the United States, it is no longer allowed to share SSNs with other companies, even though there are still over 400,000 identity theft cases every year.&nbsp; Additionally, there is the threat of stalking, as criminals may keep snooping on one's financials without the victim ever being the wiser.&nbsp;</p><p><br></p><p>Unfortunately, it is complicated to achieve financial privacy through normal means. Banks and governments will not necessarily adjust their operations because a few million people are unhappy. As such, more and more people explore cryptocurrencies, an industry with perceived privacy. Nothing could be further from the truth, though.&nbsp;</p><p><br></p><p><strong>The Current State of Privacy Coins</strong></p><p>Many people think that Bitcoin, Ethereum, and other public blockchains all offer privacy by default. Unfortunately, that is not the case, although users can be pseudonymous when using wallet addresses. However, thanks to the growing popularity of blockchain analysis firms, linking a pseudonymous wallet address to a real-world identity is a lot more straightforward. As a result, there is no absolute privacy to speak of in most coins, although there are exceptions.</p><p><br></p><p>Some currencies provide privacy, either at the protocol level or by having users opt-in. Monero leads the privacy and anonymity race, as it has undergone multiple evolutions to provide financial privacy efficiently. Dash, a currency formerly focused on privacy, is now tackling the payments channel. ZCash, PIVX, and others all have some degree of privacy, with varying success. However, all of these currencies suffer from exchanges delisting them for the sole purpose of being privacy-oriented in some shape or form.</p><p><br></p><p>Despite this uphill battle, one should never give up on financial privacy. If the eCash project is an example, there is a future ahead for privacy coins. However, that will only be possible through scaling, censorship resistance, and protection from inflation. Privacy alone may no longer be sufficient in this ever-changing financial paradigm. Building sound money first is essential, and eCash opts for that route while introducing optional privacy for those who want it.</p><p><br></p><p>To expand the ecosystem, the team also intends to support the Ethereum Virtual Machine, allowing for the development of financial applications, products, and services. Its proof-of-stake consensus layer removes the need for miners, making it different from Bitcoin and Ethereum.</p><p><br></p><p>The biggest change is how it will only have two decimal places instead of eight. Lead developer Amaury Sechet feels that a lower unit price can lead to higher bull market appreciation. Personally, I think eight decimals works fine, even if it is a bit confusing to newcomers at first. Opting for two decimals can make more people acquainted with the concept of digital currency.&nbsp;</p><p><br></p><p><strong>Protecting Against Inflation And Censorship</strong></p><p>In the current financial industry, everyone who owns money is subject to inflation. Whether one wants to admit it or not is irrelevant. Governments and banks continue to print and spend money like there is no tomorrow. Although that approach can give a short-term boost to domestic economies, it will always lead to inflation. For consumers, that means losing purchasing power, requiring them to earn more money to pay for the same goods and services.</p><p><br></p><p>Sound money, on the other hand, will protect users from inflation. Precious metals are often considered a store of value as their prices do not diminish. Cryptocurrencies would be a worthwhile addition to this list were they not so volatile. For me, Bitcoin and other public crypto assets can never be considered a store of value until they achieve the status of \"sound money\".&nbsp; Unfortunately, these assets will always be liable to a sudden appreciation of depreciation in value.</p><p><br></p><p>Changing that narrative will usher in the next generation of crypto assets. While some may see stablecoins as sound money, they often are not. Most stablecoins are backed by fiat currency reserves, the same currency that is subject to inflation. As such, one's stablecoin holdings are equally subject to inflation. It baffles me how few people seem to grasp that concept today.</p><p><br></p><p>Rather than non-privacy coins and stablecoins, building sound money will serve a second purpose. It is crucial to protect consumers from censorship. Giving them a say about how they manage and spend their wealth is very different from today's financial system. banks can prevent customers and corporations from completing purchases for arbitrary reasons.</p><p><br></p><p>&nbsp;Moreover, if one tries to express an opinion online and accepts payments through traditional means, payment processors will stop working with you. WikiLeaks witnessed that first hand, yet Bitcoin offered a viable solution. Imagine if a solution offers optional privacy, sound money, and censorship-resistance all rolled into one? I cannot wait to see what the future holds in this regard.</p><p><br></p><p><strong>Closing Thoughts</strong></p><p><br></p><p>The future of cryptocurrency will require some degree of privacy to protect consumers from prying eyes and censorship. At the same time, the focus needs to shift to provide sound money capable of avoiding inflation. Creating a new currency that will not act as volatile as Bitcoin or Ethereum - even on a good day - will not be easy, but it is possible with the right fundamentals.&nbsp;</p><p><br></p><p>I expect great things in the field as new infrastructure is already under development. However, although I remain a big fan of Bitcoin, no one can look past its shortcomings and inefficiencies. Better ideas and concepts will emerge, providing consumers with the solutions they require in this digital age. That doesn't mean Bitcoin will go away, as some of these under-development features may be integrated in that protocol over time.</p><p>‍</p>",
            short_content:
                'The vast majority of crypto assets have no default privacy features, raising questions about how viable this approach is. Everyone in the...',
            type: 'News',
            media_link:
                'https://hackernoon.com/is-there-a-future-for-cryptocurrencies-without-privacy-features-212337zk',
            publish_date:
                'Tue Aug 10 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'is-there-a-future-for-cryptocurrencies-without-privacy-features',
            createdAt: '2023-06-20T22:41:25.019Z',
            updatedAt: '2023-06-20T22:41:25.019Z',
            publishedAt: '2023-06-20T22:41:25.014Z',
            legacy_image: '/images/611348fa918727ca455767dd_image%20copy.jpg',
            legacy_media_logo: '/images/61134aa73652c46aee9461e4_hn-logo.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 18,
        attributes: {
            title: 'Nakamoto Financial Releases RaiUSD (USDR) Stablecoin',
            content:
                '<p><br></p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1500px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1500px"><div><img alt="" src="/images/610a25a0a6036adf712c4344_raiusd-ecash-banner.jpeg" width="auto" height="auto" loading="auto"></div></figure><h1>Nakamoto Financial Releases RaiUSD (USDR) Stablecoin</h1><p><em>2021 Aug 4. First Stablecoin on the eCash Blockchain</em></p><p><strong>Saipan, CNMI, USA</strong>– Nakamoto Financial LLC is a non-depository financial services, technology, and consulting institution specializing in cryptocurrency and blockchain-based instruments. We are excited to announce the creation of our stablecoin RaiUSD (USDR) which is backed 1:1 by US Dollars. You can find the genesis transaction <a href="https://explorer.be.cash/tx/0daf200e3418f2df1158efef36fbb507f12928f1fdcf3543703e64e75a4a9073">here</a>.</p><p>Stablecoins, cryptocurrencies backed 1:1 by an asset, usually the US Dollar, have exploded in popularity in recent years due to their ability to leverage most of the advantages of traditional cryptocurrencies while minimizing the downsides. As a result, the market capitalization of stablecoins and their usage in commerce are growing rapidly— a trend that will continue until traditional cryptocurrencies can find a way to compete.</p><p>Until then, it is our position that stablecoins are the ideal stepping stone and the way to expand crypto’s utility and appeal. While many stablecoins exist, none of them are ideal for in person commerce in our local market, Saipan. Either a stablecoin lacks robust payment protocols, its network fees are too high, or the on/off ramps are too expensive and inconvenient. RaiUSD was built to solve these problems.</p><p>We chose the eCash blockchain as the ideal choice due to its scalable network, excellent community, and competent and well-funded developer team. eCash allows consumers and merchants to securely make payments in seconds and is well positioned to realize Nakamoto’s vision of peer-to-peer electronic cash.</p><p>“We are very happy that Nakamoto Financial has chosen to build their products on the eCash network. The RaiUSD stablecoin, and the RaiPay wallet promise to bring excellent utility to eCash. We look forward to helping foster their growth, and providing stable high-performance infrastructure for them to build upon. This is a vote of confidence for the budding eCash ecosystem.” — Bitcoin ABC, eCash’s Development Team</p><p>After considerable forethought, the name RaiUSD was chosen to pay homage to the first peer-to-peer public ledger, the Rai Stone. Just like Rai stones, our stablecoin will be recorded on a public ledger and verified by the community. The Rai stone has played an important role in the history of money and the Pacific for hundreds of years. We believe RaiUSD can continue this trend. The past determines the future, and the future is Rai!</p><p><strong>About Nakamoto Financial:</strong> Nakamoto Financial was founded in 2020. It is registered with the United States Treasury Department as a Money Service Business and licensed by the Commonwealth of the Northern Mariana Islands as a Remittance business. Nakamoto Financial delivers AML/KYC, financial accounts, and customer onboarding on a B2B2C platform. Nakamoto Financial is the first modern and innovative blockchain technology company on Saipan who’s leadership consist of top blockchain developers, expert business strategists, and crypto champions: Tobias Ruck, CTO; Perry Inos, CE&amp;FO; Alexander Ugorji, COO.</p><p>‍</p>',
            short_content:
                'Nakamoto Financial LLC is a non-depository financial service, technology, and consulting institution specializing in cryptocurrency...',
            type: 'Blog',
            media_link: 'https://www.nakamotofinancial.co/blog/usdr-release/',
            publish_date:
                'Wed Aug 04 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'nakamoto-financial-releases-raiusd-usdr-stablecoin',
            createdAt: '2023-06-20T22:41:14.439Z',
            updatedAt: '2023-06-20T22:41:14.439Z',
            publishedAt: '2023-06-20T22:41:14.432Z',
            legacy_image: '/images/610a2b92bb5606f7ffa2425c_Poster.png',
            legacy_media_logo:
                '/images/610a284f565cd446f125c019_NF1%20Transparent%20Straight.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 17,
        attributes: {
            title: 'This Bitcoin Pioneer Envisions Future Of Cryptocurrencies As True Digital Cash',
            content:
                '<p>The development of payment options is not always visible and has taken a variety of forms. From crisp banknotes, humanity has moved on to cheques. Increasingly, one or two compact credit cards are used instead of bulky wallets. Rather than passing cash from hand to hand, we are more frequently sending payments by bank transfer. Previously, it wasn\'t always possible to keep track of who created these ideas. And the implementation of innovations has sometimes taken decades.</p><p>Now, in the age of digitalization, fundamental transformations are taking place in the public eye. For the first time, humanity is close to creating a cryptocurrency that can run globally at the same level as cash, or even replace fiat money. And no less important, the ideological leader and chief visionary behind the project is well-known.</p><p>Revival Of Satoshi Nakamoto’s Ideas</p><p><a href="https://www.linkedin.com/in/deadalnix" target="_blank">Amaury Séchet</a> is a man capable of turning the concept of blockchain\'s future in the economy upside down. In his project, we can observe the birth of the technology, which is intended to follow the ideals originally laid down by Satoshi Nakamoto.</p><p>Relieving the Internet of the need for a banking system for online payments is one of the keystone motives behind the creation of Bitcoin. But when looking at today\'s cryptocurrency platforms most of them take the path of least resistance and drag Bitcoin\'s ideals of privacy and security into the realm of ordinary bank payments and accountability to regulators.</p><p>However, Amaury believes that principles should come first. He does not compromise his convictions in order to increase his popularity or to align himself with groups of activists. Cryptocurrencies are about anonymity; about encryption; about the inability of governments and banks to stick their fingers in people\'s wallets. By refusing to support the removal of transactions outside the blockchain network, he has earned a reputation as a man who goes against the system. As he’s said, “You can\'t betray your values and your users.”</p><p>Bitcoin is still popular. But if you ask the average user if he or she wants to pay for goods and services with this cryptocurrency, the answer is likely to be “No” or “No way”. The main reason for that reaction could be the perception that Bitcoin is a speculative tool. Why would you give away something that could increase in price ten times over time? Bitcoin\'s excessive volatility, huge transaction confirmation time, and difficulties in scaling up has led to throngs of competitors who wouldn’t miss the opportunity to carve out their niche in the market.</p><p>Split Up With Bitcoin To Create Something Bitcoin Was Supposed To Be</p><p>Amaury created <a href="https://www.benzinga.com/money/what-is-btc-cash/?utm_campaign=partner_feed&utm_source=yahooFinance&utm_medium=partner_feed&utm_content=site" target="_blank">Bitcoin Cash</a> with the 2017 bitcoin fork, and as its lead developer worked to improve it. He explored all the strengths and weaknesses of the project and he faced the reluctance of the managers to address vulnerabilities in the system. Amaury was not the only person who noticed it. But unlike many, he did not put up with this.</p><p>It might seem to some that quitting this project was not financially beneficial. But when it comes to the opportunity to create the future of the crypto industry — you can\'t just look at the money side of things. As Amaury has admitted, leaving Bitcoin Cash was a difficult step, and building his own project was no less of a challenge. After all, it was aimed at breaking the stereotypes of the existing blockchain ecosystem.</p><p>90% of a start-up\'s success depends on who is at the helm. Amaury Séchet has decades of experience in developing the leading cryptocurrency and is an expert in his field. If you add to that the competent development team with a proven reputation and the initiative to put Bitcoin back at the service of ordinary people, rather than individual governments and corporations, you get <a href="https://www.benzinga.com/markets/cryptocurrency/21/07/21823165/bitcoin-cash-abc-relaunches-as-ecash-integrates-proof-of-stake?utm_campaign=partner_feed&utm_source=yahooFinance&utm_medium=partner_feed&utm_content=site" target="_blank">eCash</a>.</p><p>After a recent rebranding, his company is ready to show the world what blockchain technology can really do. Moving away from the well-trodden path of mining, the start-up is ready to redefine the concept of digital money in the minds of its users.</p><p>Faster Transactions, Lower Fees, And Energy-Saving Technologies</p><p>It took a year to work out all the intricacies of Proof of Stake and protocol management but the result is well worth it. Transaction validation time will be reduced to less than 1 second. In addition, eCash is capable of supporting a huge number of transactions per time unit.<br>Recently, the global community has been concerned about the increasing amount of electricity being consumed by mining, which has a damaging impact on the environment. Truly modern projects are designed to counteract the polluting processes. The result of Amaury\'s work could circumvent the mistakes of its predecessors thanks to the use of Proof of Stake technology.</p><p>The revolutionary consensus algorithm, Avalanche, is particularly noteworthy. It provides increased security and updates without forks. The predecessors of eCash lost a significant part of their followers due to persistent divisions (forks). Avalanche brings technically sound, politically decentralized governance to the eCash protocol.</p><p>It has been four years since the split of the Bitcoin network and the formation of Bitcoin Cash. Amaury Séchet went against everyone when he refused to support the removal of transactions outside the blockchain network. He is still adamant in its philosophy and believes that 99% of crypto projects today have nothing to do with what digital money really should be.</p><p>Innovative and successful technologies have humble beginnings, as do their designers. The process of formation and development of such technologies is often fraught with challenges and involves the banding together of various groups of like-minded individuals. This is exemplified by Skype with its isolated beginning as a tiny Estonia-based project. Amaury Séchet is one such developer who was exiled from the project he created and is now determined to bring cryptocurrencies back to their roots.</p><p>His name is not on the radar of millions of people but Amaury is the man who is dictating the evolution script for blockchain technology. If you met him on the street, you could pass him by without recognizing this extraordinary man. Even in the shadows, he can bring cryptocurrencies back to their origins. History is being made before our eyes. After all, the world has never been so close to forming a publicly available, secure means of payment that is unafraid of government control and censorship. To be silent witnesses of this process or to keep up with the times and join the flow of the first eCash users: the choice is ours.</p><p>‍</p>',
            short_content:
                'The development of payment options is not always visible and has taken a variety of forms. From crisp banknotes, humanity has moved on to...',
            type: 'News',
            media_link:
                'https://finance.yahoo.com/news/bitcoin-pioneer-envisions-future-cryptocurrencies-143348232.html?guccounter=1',
            publish_date:
                'Mon Aug 02 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'this-bitcoin-pioneer-envisions-future-of-cryptocurrencies-as-true-digital-cash',
            createdAt: '2023-06-20T22:41:00.011Z',
            updatedAt: '2023-06-20T22:41:00.011Z',
            publishedAt: '2023-06-20T22:41:00.004Z',
            legacy_image:
                '/images/6108e159a131fe82f3fc899b_f974e04f98cf1dcd651233f22325e485.jpg',
            legacy_media_logo:
                '/images/6108e1a82cc0a775267536a0_60edfdbbc0f5a8b4c7e32e3c_YahooFinanceLogo-p-500.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 16,
        attributes: {
            title: 'eCash (XEC) Mining',
            content:
                '<p><strong>Introduction<br></strong>XEC<br><a href="https://e.cash/faq" target="_blank">Homepage </a> &nbsp;<a href="https://explorer.viawallet.com/xec" target="_blank">Explorer </a> &nbsp;<a href="https://viawallet.com/" target="_blank">Wallets</a> &nbsp; &nbsp;<a href="https://www.coinex.com/" target="_blank">Exchanges</a><br>BitcoinCash ABC(BCHA) has rebranded to eCash(XEC) at the ratio of 1:1,000,000 on July 1, 2021(UTC). Bitcoin Cash ABC is a blockchain and cryptocurrency created on Nov. 15, 2020, as a result of a hard fork in the Bitcoin Cash (BCH) blockchain that split the original chain into two new chains, provisionally called "Bitcoin Cash ABC" and "Bitcoin Cash Node." The latter retained the existing Bitcoin Cash name and ticker, while at the time of the fork, Bitcoin Cash ABC had not yet announced new branding.<br>Bitcoin Cash ABC is based on the Bitcoin Cash protocol, which is itself a fork of the original Bitcoin (BTC) protocol. It is focused on providing a fast, highly scalable, global cryptocurrency in a manner that is sustainable in the long term. As a fork of Bitcoin Cash, Bitcoin Cash ABC retains many of the same characteristics. Its main goal is to create money that is "usable by everyone in the world" and that will "dramatically increase human freedom and prosperity." It uses a larger block size than Bitcoin as a way to increase transaction times and scalability.<br>Bitcoin Cash ABC introduced two main changes to its protocol that differentiate it from Bitcoin Cash: a new mining difficulty adjustment algorithm known as Aserti3--2d, or ASERT, and a requirement that 8% of all newly minted BCHA be allocated to fund the further development of the network. The second change, known as the "coinbase rule," proved to be controversial and was a primary contributor to the fork.<br><br><strong>Applicable Miners</strong><br><a href="https://shop.bitmain.com/" target="_blank">Antminer</a> (e.g. S19 Pro、S19、S17e and etc. )<br><a href="https://www.whatsminer.com/" target="_blank">Whatsminer</a> (e.g. M30S、M20S and etc.)<br><a href="https://www.avalonminer.shop/" target="_blank">Avalon </a>(e.g. A1166 and etc.)<br><br>Find more info at：<a href="https://www.viabtc.com/" target="_blank">Mining Profit Ranking</a></p><p><br><br><strong>Payment Methods and Mining Modes<br></strong>1. Choose a payment method in ViaBTC (<a href="https://support.viabtc.com/hc/en-us/articles/8939716312857-How-to-Choose-the-Optimal-Payment-Method-PPS-PPLNS-SOLO-" target="_blank">How to Choose the Optimal Payment Method (PPS+, PPLNS, SOLO)?</a>)</p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1231px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1231px"><div><img src="/images/60fa0251afc4fe3a197cd9bb_mceclip1.png" alt="mceclip1.png" width="auto" height="auto" loading="auto"></div></figure><p> <br><br></p><p><strong>Mining Setup</strong><br>1. Configure Stratum URL<br>XEC Mining URL:<br></p><p>stratum+tcp://xec.viabtc.com:3333<br>stratum+tcp://xec.viabtc.com:25<br>stratum+tcp://xec.viabtc.com:443</p><p><br><br>2. Create Worker<br>Create a worker in the form of "userID.workerID" and set any password for it. WorkerID should consist of numbers and lowercase letters within 64 characters.<br>E.g. If your user ID is viabtc, your worker name could be "viabtc.001". Password is optional.<br><br>3. Configure Mining<br>Take Antminer as an example here. Log in to your Antminer first, click “Miner Configuration” and enter details as required on the page. Click “Save &amp; Apply” when you finish setup. To ensure stable mining, we recommend users to set multiple ports. When one of them fails to connect, the miner will be automatically switched to the next port and continue mining. <br></p><figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1886px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1886px"><div><img src="/images/60fa0251a3085e12ccbb5d46_Mining_Rig_conrol_panel.png" alt="Mining_Rig_conrol_panel.png" width="auto" height="auto" loading="auto"></div></figure><p><br><br><br><strong>Monitoring &amp; Earnings</strong><br>After the miner has been stabilized for around 10-15 mins , you can check operation status and profits via <a href="https://www.viabtc.com/pool/worker" target="_blank">Workers</a> and <a href="https://www.viabtc.com/pool/profit" target="_blank">Earnings</a> page. You can also download <a href="https://www.viabtc.com/mobile/download" target="_blank">ViaPool</a> to view the related data at any time.<br> <br><br></p><p><strong>Payout</strong><br><a href="https://support.viabtc.com/hc/en-us/articles/900001529386" target="_blank"><strong>Auto Withdrawal </strong></a><strong> &nbsp; &nbsp; (ZERO fee and unified payment everyday, recommended!)<br></strong><a href="https://support.viabtc.com/hc/en-us/articles/900001532383" target="_blank"><strong>Normal Transfer </strong></a><strong> &nbsp; &nbsp; &nbsp;(Transfer anytime but fee is required)</strong><a href="https://support.viabtc.com/hc/en-us/articles/900001532383" target="_blank"><strong><br></strong></a><a href="https://support.viabtc.com/hc/en-us/articles/900001872103" target="_blank"><strong>Inter-user Transfer</strong></a><strong> &nbsp; (ZERO confirmation and fee)</strong><a href="https://support.viabtc.com/hc/en-us/articles/900001872103" target="_blank"><strong><br></strong></a><a href="https://support.viabtc.com/hc/en-us/articles/900001529886" target="_blank"><strong>Transfer to CoinEx</strong></a><strong> &nbsp; &nbsp;(ZERO confirmation and fee)<br><br><br></strong></p><p><strong>Why do I need to set multiple ports?<br></strong>We recommend that users set multiple ports to ensure stable and sustainable mining. Should one of them is inactive, the miner will switch to the next one automatically.<br><br><br><strong>If my miner is disconnected, how to fix it?<br></strong>The status will become active after the miner keep running for around 10 to 20 minutes. &nbsp;<br>If the worker keeps producing invalid shares, please check your settings on the dashboard.<br>If the issue remains unresolved after checking, feel free to send us a <a href="https://support.viabtc.com/hc/en-us/requests/new" target="_blank">ticket</a>.</p><p><br></p>',
            short_content:
                'Bitcoin Cash ABC retains many of the same characteristics. Its main goal is to create money that is "usable by everyone in the world"...',
            type: 'Blog',
            media_link:
                'https://support.viabtc.com/hc/en-us/articles/900004339303-XEC-Mining',
            publish_date:
                'Thu Jul 22 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'xec-ecash-mining',
            createdAt: '2023-06-20T22:40:44.866Z',
            updatedAt: '2023-06-20T22:40:44.866Z',
            publishedAt: '2023-06-20T22:40:44.858Z',
            legacy_image:
                '/images/60fa022577b986eee4ac5b4d_Screen%20Shot%202021-03-03%20at%2012.43.27%20AM.png',
            legacy_media_logo:
                '/images/60fa023aa880c168bdd764ca_08012e108a31e5c6165ae51fa4ae2d48b690d02a.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 15,
        attributes: {
            title: 'Forked Cryptocurrencies Demonstrate Great Price Performance',
            content:
                '<p>Over the past month, the cryptocurrencies of projects undergoing forks have demonstrated considerable growth. Among the reasons for the growing interest among traders towards such assets are the great potential of upgraded blockchains and new characteristics that place forked coins apart from their originals.</p><p>These differences include greater scalability, lower network fees and a higher level of security compared to the previous generation of cryptocurrencies. In addition, the holders of such coins can expect a temporary exemption from tax penalties.</p><h2><strong>eCash</strong></h2><p>On July 1, Bitcoin Cash ABC (BCHA), which had previously forked from both <a href="https://www.investing.com/crypto/bitcoin">Bitcoin</a> and <a href="https://www.investing.com/crypto/bitcoin-cash/bch-usd">Bitcoin Cash</a> (BCH), underwent a significant upgrade. The project was not only rebranded to <a href="https://www.investing.com/crypto/ethereumcash/ecash-usd">eCash</a> (XEC), but has also undergone some major improvements to its code aimed at making the cryptocurrency more spendable, scalable and closer to the original Bitcoin philosophy of digital cash.</p><p>Amaury Sechet, the founder of eCash and ex-lead developer of Bitcoin Cash, announced that the upgraded blockchain would inherit characteristics never before seen in a Bitcoin project, such as convenient units, staking, fork-free network upgrades, and subchains.<br><br>eCash combines Bitcoin’s core features—the same fixed supply, halving schedule, and genesis block—with the latest innovations in Proof of Stake consensus and protocol governance—unprecedented for a Bitcoin network. <br><br>Immediately after the announcement of the rebranding, the exchange rate of the BCHA coin increased by 100% from $17 to $34. XEC—the new coin—is currently trading at $0.000024. The rebranding was supported by over 20 exchanges with all BCHA coins on exchange balances converted to a new ticker at a conversion rate of 1 to 1,000,000.<br><br>Despite the fact that BCHA holders did not receive any additional coins, the launch aroused great interest from traders, as the updated cryptocurrency will offer staking possibilities and Bitcoin-like functionality for the first time. The developers are also promising a greater degree of privacy and security with instant confirmation of transactions.</p><h2>Ethereum</h2><p>Analysts are very bullish ahead of the most anticipated network fork dubbed <a href="https://www.investing.com/news/cryptocurrency-news/ethereums-london-upgrade-deployed-to-final-testnet-ahead-of-august-4-fork-2553567">London</a>—another upgrade to the <a href="https://www.investing.com/crypto/ethereum/eth-usd">Ethereum</a> network as part of its transition to Ethereum 2.0. This is a solution that will scale the original blockchain and make it more user-friendly. The main feature of the update is the network’s transition to the Proof-of-Stake (PoS) consensus algorithm, which will replace the Proof-of-Work (PoW) consensus algorithm the blockchain is currently running on.<br><br>Despite the fact that the cryptocurrency showed a correction last week against the background of the announcement of the postponement of the fork to Aug. 4, some experts note that Ethereum (ETH) could see prices as high as $2,600 and $3,000, if it successfully tests the current resistance level driven by a medium-term allocation of funds to Ethereum.<br><br>In a recent statement, the analysts from Goldman Sachs <a href="https://www.investing.com/news/cryptocurrency-news/goldman-sachs-ethereums-popularity-could-see-eth-become-dominant-store-of-value-2551358">noted</a> that Ether could overtake Bitcoin due to the real use cases of its network. Bitcoin could be held back by its limited use case and slow transaction speeds.<br><br>Despite the bullish sentiments of the analysts, the bears managed to lower the price of Ether by 7.82% last week from the previous week to $2,141. However, if the bulls push the price above the 20-week exponential moving average (EMA) again, it will highlight the fact that traders are accumulating currencies on downturns. A break above $2,410 would clear the path for a possible charge to $2,914.<br><br>Ether is currently trading in the $1,800-$1,900 range. A break above would indicate a short-term bullish advantage and clear the way for a possible rise to $3,000.<br><br>The London hard fork can be called fundamental to the Ethereum blockchain, as the update is intended to make transaction fees more predictable. At the same time, it is unlikely that EIP-1559 will lead to a decrease in mining fees, since the level of fees will most likely be more evenly distributed over the entire volume of transactions.<br><br>A slight decrease in fees may occur as a result of crowding out of unscrupulous miners, which may become an incentive for the growth of Ethereum exchange rates, as users will witness an increase in the efficiency of the ecosystem.<br><br>Together with the expectations of further successful updates within the framework of Ethereum 2.0, this launch can have a synergistic affect and contribute to the progressive movement of the altcoin’s price towards the $3,500 mark in the next couple of months.<br><br>Another driving factor could be the implementation of the EIP-1559 proposal aimed at burning surplus commissions. This initiative will make it possible to limit the emission of coins in the coming months, and in a particular case, even temporarily turn the inflationary model of Ethereum 1.0 into a deflationary one.</p><p>Any restrictions on exchange offerings have a positive effect on the value of tokens. The effect of limiting emissions can manifest itself as early as a month after launch, in early autumn.</p><h2><strong>Ethereum Classic</strong></h2><p>All eyes are now on the upcoming hard fork on the <a href="https://www.investing.com/crypto/ethereum-classic/etc-usd">Ethereum Classic</a> (ETC) network, which is scheduled for July 21. The exchange rate of ETC on some exchanges reached a price maximum of $61 against the background of the expected event on June 30, having almost doubled from $38 in less than a week.<br><br>The update is expected to optimize gas fees coupled with further improvements in the interoperability between the two blockchains. Anticipation of this event is helping the biggest altcoin stay afloat.<br><br>Over the past quarter, ETC has already hit price records multiple times. On May 5, the exchange rate of Ethereum Classic on the Binance exchange was the first to rise above $81.6, having risen in price by almost 15 times since the beginning of this year. The market capitalization of the project currently exceeds $9.8 billion and the coin is currently trading at $46.<br><br>Most likely, the excitement around the upcoming fork has subsided, but it is possible that ETC will attain records immediately after the update is implemented. The price of Ethereum Classic may also be influenced by the growth of its parent cryptocurrency—Ethereum—as the two have historically developed in parallel.</p><h2>Tax relief</h2><p>Traders’ interest in forks may also fuel a possible tax break, as witnessed by the recent Safe Harbor for Taxpayers with Forked Assets bill that was introduced by the congressman of the state of Minnesota in the United States House of Representatives.</p><p>In the current iteration of laws on crypto assets, users who receive additional currency inflows as a result of a fork must declare income that is considered taxable during the fiscal year in which the event took place. If the bill passes, it may be offering holders of forked assets a powerful incentive to migrate to the nontaxable haven and turn even more attention to such coins.</p><p>The bill is already gaining support and has been backed by the Chamber of Digital Commerce, the Coin Center nonprofit crypto advocacy organization, the Blockchain Association, and some Republicans.</p><h2>Final thoughts</h2><p>Hard forks abound on the market and traders have their hands full as their attention is being dissipated by the abundance of potentially profitable offerings. With a new bullish round just around the corner, based on analysis of cyclical chart history, it is logical to expect a deluge of positive news from the major altcoins and market newcomers in the near future.</p><p>‍</p>',
            short_content:
                'Over the past month, the cryptocurrencies of projects undergoing forks have demonstrated considerable growth. Among the reasons for the...',
            type: 'News',
            media_link:
                'https://www.investing.com/analysis/forked-cryptocurrencies-demonstrate-great-price-performance-200592001',
            publish_date:
                'Sat Jul 17 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'forked-cryptocurrencies-demonstrate-great-price-performance',
            createdAt: '2023-06-20T22:40:33.328Z',
            updatedAt: '2023-06-20T22:40:33.328Z',
            publishedAt: '2023-06-20T22:40:33.319Z',
            legacy_image:
                '/images/60f5d2a8b50af9fb39f16790_Screen%20Shot%202021-03-03%20at%201.03.50%20AM.png',
            legacy_media_logo:
                '/images/60f5d30a16b94684f3b022a5_bc47df8209e8fdc0fa8befb6dfc41ae2.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 14,
        attributes: {
            title: '‘Crypto Is an Important Part of Financial Freedom,’ Says Amaury Sechet',
            content:
                '<p><strong>There are people in the blockchain and cryptocurrency industry who are zealous with their ideas and pursue them relentlessly throughout their lives despite popular trends or the prevailing opinion. One such person is Amaury Sechet. </strong></p><p>They do not have millions of subscribers on social networks, like <a href="https://beincrypto.com/elon-musk-advises-caution-for-cryptocurrency-investors/" target="_blank">Elon Musk,</a> and popularity sometimes simply passes them by (temporarily). However, they still have a greater influence on the development of the cryptocurrency industry than all the prominent influencers combined.</p><p>Amaury Sechet, is a Bitcoin pioneer and blockchain developer. He is the man who determined the fate of bitcoin way back in 2017.</p><p>Nowadays, Sechet is building the eCash project, which is a development of Bitcoin ABC. Sechet is just as dedicated to his ideas as he led a development team in dividing bitcoin and creating the novel BCH cryptocurrency.</p><p>The practical experience and knowledge he gained during that process are now helping the eCash team lay the foundations for a new generation of cryptocurrency payments.</p><p>Sechet dislikes publicity, and it took a while and some effort to arrange a call with him. This reclusive ex-Facebook engineer who previously helped build the <a href="https://beincrypto.com/bitcoin-cash-falls-out-of-the-top-10-crypto-market-cap/" target="_blank">Bitcoin Cash core</a> is only just starting to <a href="https://twitter.com/deadalnix?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor" target="_blank">come out of his shell</a> since he left Bitcoin Cash last year.</p><p>Over the past year, he has been writing code virtually non-stop and hasn’t even had time to attend any of the blockchain conferences he is regularly invited to.</p><h2>Bitcoin and countries</h2><p><strong>Julia Magas: </strong><a href="https://beincrypto.com/jpmorgan-challenges-el-salvador-bitcoin-ruling/" target="_blank"><strong>El Salvador</strong></a><strong> became the first country in the world to legalize bitcoin on par with the national currency – the U.S. dollar. Is this an important development?</strong></p><p><strong>Amaury Sechet:</strong> It shows how far crypto has come from earlier bull runs in 2013 and even 2017. However, it’s not a major development. The big changes in crypto happen when technology moves by big enough leaps to make regulatory changes irrelevant. What is important this time around is how much people have been paying attention. But this isn’t because of a new law in El Salvador — this is because more people have a baseline understanding of cryptocurrency.</p><p><strong>JM:</strong> <strong>Why aren’t totalitarian and authoritarian regimes rushing to adopt bitcoin?</strong></p><p><strong>AS:</strong> Totalitarian and authoritarian regimes are not rushing to adopt bitcoin for the same reason that no other governments are rushing to adopt bitcoin. Cryptocurrency brings transparency and accountability to areas that most legacy power structures would prefer to obscure. The potential shifts in power and influence are not fully understood, so it’s understandable that governments would take their time.</p><h2>Cryptocurrency and financial freedom</h2><p><strong>JM:</strong> <strong>Cryptocurrencies are the embodiment of financial freedom, you said. At the same time, is this the goal of your new project?</strong></p><p><strong>AS: </strong>Cryptocurrency is an important part of financial freedom. Especially today, where surveillance is on the rise and privacy is harder to come by, cryptocurrency will become a necessary part of financial freedom.</p><p>However, cryptocurrency is not the whole picture. You also need the tools and ecosystems that can be built on a cryptocurrency, for example, what you see today with DeFi on Ethereum. On top of that, you need to build a culture that understands and wants financial freedom.</p><p>If you can’t do all of these things, then your cryptocurrency will fail. We’ve seen this happen to a lot of cryptocurrencies that seemed big in 2017 but are no longer so impressive. So yes, enabling users to have full financial freedom is the goal of eCash. Cryptocurrencies that do not push forward everything needed for financial freedom will fail. This is why eCash has been designed with careful consideration for the big picture.</p><p><strong>JM:</strong> <strong>Do you think anonymity is what cryptocurrency users need most of all, or is this only one important aspect?</strong></p><p><strong>AS:</strong> Anonymity is an important part of financial freedom, but I don’t think it’s what cryptocurrency users need most of all. A fixed and auditable supply, for example, is more important than anonymity.</p><p>Still, it’s important that anonymity is possible. Users who want to remain anonymous need the appropriate tools. That’s why eCash already supports tools like CashFusion, which can yield anonymity comparable to existing privacy coins. We plan to develop more privacy tools in the future.</p><h2>The fourth financial revolution</h2><p><strong>JM: What role do cryptocurrencies play in the fourth financial revolution that is happening right now? Can we say that one of the fronts of this revolution is the struggle between the banking system and cryptocurrencies?</strong></p><p><strong>AS:</strong> I think cryptocurrency is often framed in this kind of simplistic “old vs. new” competition. That’s a limited way of looking at it.</p><p>If <a href="https://beincrypto.com/its-not-too-late-to-invest-interview-with-stormgain-ceo/" target="_blank">cryptocurrency is successful,</a> it will not be because cryptocurrencies created better banks. Cryptocurrency will succeed by building systems that are ten times better than banks. They aren’t fighting over the same thing. For example, banks are not in the business of enabling financial freedom. Debt is the exact opposite of this.</p><p>So, you could say that there is a kind of struggle between the banking system and cryptocurrency. But the idea that this struggle is competitive is mostly a distraction. Cryptocurrency is a financial revolution. Banks are banks.</p><h2>Thoughts on cryptocurrency ideals</h2><p>After the interview, I thought about what Amaury had said, my impression of him, and what remained outside the scope of this article.</p><p>I started wondering how many people in the blockchain and cryptocurrency world are actually moving the industry down the path of Satoshi’s vision, not for the sake of hype, wealth, and money.</p><p>Do fame and fortune get in the way of doing it right? Do cryptocurrencies need legalization and regulation? Should bitcoin be a copy of the dollar, and do we all really need the ability to buy a cup of coffee using cryptocurrencies, or should we expect something more of them?</p><p>‍</p>',
            short_content:
                'There are people in the blockchain and cryptocurrency industry who are zealous with their ideas and pursue them relentlessly throughout...',
            type: 'News',
            media_link:
                'https://finance.yahoo.com/news/crypto-important-part-financial-freedom-150000872.html',
            publish_date:
                'Tue Jul 13 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'crypto-is-an-important-part-of-financial-freedom-says-amaury-sechet',
            createdAt: '2023-06-20T22:40:18.241Z',
            updatedAt: '2023-06-20T22:40:18.241Z',
            publishedAt: '2023-06-20T22:40:18.235Z',
            legacy_image:
                '/images/60edfdb4c4bd165ede29f818_0b99208995499b668bb8f315bb0fd832.jpg',
            legacy_media_logo:
                '/images/60edfdbbc0f5a8b4c7e32e3c_YahooFinanceLogo.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 13,
        attributes: {
            title: 'July.14.2021 6pm (KST) South Korea Community AMA ',
            content:
                '<p>Join us on Youtube for a Community AMA With Crypto Child &amp; Bitcoin ABC Benevolent Dictator Amaury Séchet.</p><p> </p><h2><strong>Bitcoin ABC의 성공적인 리브랜딩 프로젝트 ‘eCash’</strong></h2><h3>2021년 7월 14일 (수) 6시</h3><figure class="w-richtext-figure-type-video w-richtext-align-fullwidth" style="padding-bottom:56.206088992974244%" data-rt-type="video" data-rt-align="fullwidth" data-rt-max-width="" data-rt-max-height="56.206088992974244%" data-rt-dimensions="854:480" data-page-url="https://www.youtube.com/watch?v=40iFkQsacag&list=PLRLNXURl9_x6RzZx2zgnIIKwrnI8gnUOq"><div><iframe allowfullscreen="true" frameborder="0" scrolling="no" src="https://www.youtube.com/embed/40iFkQsacag"></iframe></div></figure><p>Youtube: <a href="https://shorturl.at/inyCM">https://shorturl.at/inyCM</a></p><p>Telegram: <a href="https://t.me/eCashKorea">https://t.me/eCashKorea</a></p>',
            short_content:
                'Join us on Youtube for a Community AMA With Crypto Child & Bitcoin ABC Benevolent Dictator Amaury Séchet. ',
            type: 'Blog',
            media_link:
                'https://www.youtube.com/watch?v=40iFkQsacag&list=PLRLNXURl9_x6RzZx2zgnIIKwrnI8gnUOq',
            publish_date:
                'Sat Jul 10 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'july-14-2021-6pm-kst-community-ama-with-crypot-child-and-amaury-sechet',
            createdAt: '2023-06-20T22:40:05.321Z',
            updatedAt: '2023-06-20T22:40:05.321Z',
            publishedAt: '2023-06-20T22:40:05.312Z',
            legacy_image:
                '/images/60ea0cfc26b28ee707615399_Event%20poster-01.png',
            legacy_media_logo:
                '/images/60ea0e8f62989473bd79bbf2_YouTube_Logo_2017.svg',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 12,
        attributes: {
            title: 'Interview with Amaury Sechet, Financial Freedom Fighter, and eCash Benevolent Dictator',
            content:
                '<p>Blockchain technology has evolved to not only be a tool for trade but also a much hyped wealth creation machine. However, high cost, increasing energy consumption, and high fees associated with cryptocurrencies like Bitcoin have limited opportunities for building wealth at the individual level. Since 2013, blockchain developers have worked to solve these problems by developing new cryptocurrencies.</p><p>Amaury Sechet, the lead developer of Bitcoin ABC and creator of Bitcoin Cash, has taken the lead with eCash — his latest project. After vanishing from the blockchain radar for two years amid internal political disputes and the challenging crypto market of 2018-19, he’s begun implementing some hard lessons learned. In a follow-up interview, Sechet throws light on the crypto industry and his quest to redefine wealth through his latest eCash venture.</p><p><strong>Why eCash?</strong></p><p>eCash was born from over a decade of challenging technical leadership experiences in the blockchain ecosystem. From fighting software patents before bitcoin even existed, to diving head first into Bitcoin’s code, to launching the first major Bitcoin fork in response to SegWit and the blocksize debate of 2017 — the technical and cypherpunk heritage of eCash founder Amaury Sechet is unmatched in the crypto space. He’s also the self-proclaimed benevolent dictator, a term used less ironically given his reputation for hard (and occasionally unilateral) decision making. Sechet is working to redefine wealth by giving individuals the tools to live their lives the way they want while avoiding the growing constraints of the legacy financial system.</p><p>Typically, wealth means having lots of local currency — having a nice house and a nice car. Few think beyond immediate luxuries and toward higher goals like generational wealth.</p><p>What’s beyond wealth as self care? What about wealth in personal freedom? In privacy, in an increasingly supervised world? In personal safety, when it’s becoming increasingly dangerous to disagree with the majority? Old cliches like “money in the bank” don’t even make sense today. Needs have changed, and the tech to meet those needs will unlock the next crypto boom.</p><p>eCash provides regular people with a tool for personal wealth development and protection, using tools and techniques learned from the hard lessons of crypto conflict.</p><p><strong>Both the government and mega corporations influence wealth development. So how can individuals with different views succeed?</strong></p><p>Under the growing threat of cancel culture, people are finding their worldview increasingly more difficult to share. COVID was only the latest iteration of this phenomenon.</p><p>As the technical arms race continues on both sides of individual liberty, self-censorship is the new normal. It seems inevitable that culture will fragment into incompatible views of what\'s real.</p><p>However, Sechet envisions a world where everybody thinks for themselves and pushes forward a solution to the alternating viewpoints:</p><p>"I think we\'ve lived through a unique period in history, during the early internet, where information was more accessible than it ever was before, or ever will be again."</p><p><strong>Why did Bitcoin Cash fail?</strong></p><p>Sechet, who created Bitcoin Cash, is blunt about its prospects for success after a series of political blunders.</p><p>“Since we left BCH, it dropped from the 5th most valuable coin to the 13th, and all the major contributors left, including the Bitcoin ABC team, which created BCH, but also James Cramer, creator of SLP and many others. Now Bitcoin Unlimited wants to create a new coin.”</p><p><strong>What are some of the challenges you face in starting a new cryptocurrency?</strong></p><p>Leaving an existing project to start a new coin with a new community is a difficult decision, especially in a tech arena where first mover advantage and network effects play such a dominant role.</p><p>“Leaving [the Bitcoin Cash] ecosystem is a big step back, and difficult for me personally. It is always difficult to let your child go, but in this case, there is nothing more I can do to save this child. It has chosen its path.</p><p>On the other hand, eCash is starting much smaller, but is much healthier. The technology is improving fast.”</p><p>Ultimately, the need for technical progress to remain competitive with other leading cryptocurrencies like Ethereum made it necessary to launch eCash.</p><p><strong>How will eCash overcome the roadblocks limiting bitcoin?</strong></p><p>Early cryptocurrencies like bitcoin have suffered recently from limited features and growing public concern over environmental impact. Competitors like Ethereum are taking the lead by moving away from costly mining and offering more powerful features than legacy competitors like bitcoin.</p><p>Sechet is committed to staying competitive at the cutting edge of the crypto space.</p><p>“The second half of the year will see more marketing and technological improvement. First Avalanche will enable instant confirmation, but once this is deployed, we want to focus on deploying an Ethereum Virtual Machine (EVM) based solution that can interact with the eCash chain.</p><p>We think it is important that people can deploy both EVM based projects and Bitcoin-based projects on eCash with as little friction as possible. By doing so, they’ll benefit from much smaller fees, instant confirmations and the capability to interact between systems which have been isolated from each other until now.”</p><p>‍</p>',
            short_content:
                'Blockchai technology has evolved to not only be a tool for trade but also a much hyped wealth creation machine. However, high cost, increasi',
            type: 'News',
            media_link:
                'https://www.ibtimes.com/interview-amaury-sechet-financial-freedom-fighter-ecash-benevolent-dictator-3240931',
            publish_date:
                'Fri Jul 02 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'interview-with-amaury-sechet-financial-freedom-fighter-and-ecash-benevolent-dictator',
            createdAt: '2023-06-20T22:39:53.800Z',
            updatedAt: '2023-06-20T22:39:53.800Z',
            publishedAt: '2023-06-20T22:39:53.792Z',
            legacy_image:
                '/images/60dea05400922c49d7f38060_39d17a78-ab74-4b93-8880-368e5ba28358.jpg',
            legacy_media_logo:
                '/images/60dea0750c025b8f0af45d77_qob3exbt-copy.0.1485859344.0.jpeg',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 11,
        attributes: {
            title: 'Bitcoin may fail to become a true crypto asset',
            content:
                '<p>Even though Bitcoin remains the world\'s leading cryptocurrency by market capitalization, it has not always lived up to its promise of serving as digital cash. Instead, BTC is a store of value and speculative asset above anything else. Other currencies can take their place as leading digital cash as competition continues to heat up in this space.</p><h2><strong>Bitcoin Is Losing Ground</strong></h2><p>Although the price of BTC and overall market cap may not confirm this sentiment, Bitcoin struggles to keep up with other cryptocurrencies. More specifically, the world\'s leading crypto asset has given up its position as digital cash in favor of becoming the next gold and serving as a store of value. Moreover, there is a highly speculative angle to Bitcoin, reducing its chances of ever gaining momentum as a globally accepted payment method.</p><p>Even the not-that-distant fork that created <strong>Bitcoin Cash</strong> has not been sufficient to push the digital cash angle of Bitcoin higher up the agenda. Its scaling and transaction fees remain rather atrocious for a project that has existed for over eleven years. Moreover, the asset has been a thorn in the side of regulators and institutions, further enhancing its speculative aspect rather than its potential utility.</p><p>As a result of this "lack of focus" on what really matters, there are now more competitors on the market than before. More specifically, more viable options can serve as digital cash before Bitcoin ever achieves that status. Opinions on this front may be divided for the most part, yet no one can deny that cryptocurrencies are not gaining too much ground among merchants experimenting with alternative payment options.</p><p>Unfortunately, it has proven very difficult to change that narrative. The inherent <strong>volatility</strong> of Bitcoin remains a problem for merchants, despite payment processing having the option to guarantee a fixed transaction value at all times. Moreover, there seems to be an increase in the number of Bitcoin holders, yet incentivizing people to spend BTC is nearly impossible, primarily because everyone sees this crypto asset as a speculative asset with store-of-value qualities.</p><h3><strong>A Lack of Innovation</strong></h3><p>One can argue that Bitcoin today looks very different from the initial network set up by Satoshi Nakamoto. There are thousands of nodes and the network has achieved upgrades such as Segregated Witness and the Lightning Network. From a scaling viewpoint, those latter two changes are prominent and can make Bitcoin more appealing as a payment tool.</p><p>As is often the case in the industry, SegWit adoption has taken a while to take hold. Leading Bitcoin wallet provider Blockchain.com integrated this technology less than a month ago, despite SegWit residing on the network for years. It goes to show that even service providers — in my opinion — are not willing to push Bitcoin in the direction of digital cash. Unwise, as payment processors will benefit from more people spending BTC rather than hoarding it. Still, even with perfect SegWit adoption, Bitcoin fees would remain high.</p><p>For the Lightning Network, the situation doesn’t look great either. It has taken far too long to finally surpass 300 BTC in <strong>liquidity</strong>. Anyone can set up a Lightning Network node and payment channel — and every should, in my opinion — yet few people go out of their way to support the network. More nodes, payment channels, and liquidity can turn this faster and cheaper way of conducting Bitcoin transfers into a mainstream solution.</p><p>Even though I remain a fan of Bitcoin and consider the asset as a global game changer, the lack of effort by community members and service providers is irksome. There is little sense of community among Bitcoins when the prices are not going up exponentially. Most people forget this network is active 24/7 and needs to keep evolving as such. Sadly, that is not happening, putting the vision of Satoshi Nakamoto out of reach even further.</p><h3><strong>Are There Alternatives?</strong></h3><p>The lack of support from Bitcoin community members and service providers creates an opportunity for alternative currencies to gain momentum. I am not talking about the dime-a-dozen altcoins and tokens that populate the crypto and DeFi space these days. Instead, I actively look for ideas that can align with what Satoshi Nakamoto wanted for Bitcoin: to serve as digital cash first, and a store-of-value second.</p><p>One project capturing my attention is eCash, or Bitcoin ABC as it was known formally. Spearheaded by Amaury Sechet, the Bitcoin ABC team is building a different iteration of Bitcoin that can potentially live up to the “digital cash” label. A competent group of developers with a proven track record always instills some degree of confidence.</p><p>However, eCash also goes much further than just focusing on the financial aspect. It aims to instil a sense of empowerment among community members, creating a new tool for everyday people to tackle our digital world head-on. Under the hood, eCash will serve as scalable and secure low-latency hard digital cash, but one that transcends the “number go up” aspect associated with Bitcoin and other crypto assets.</p><p>Getting people to use this new project and its native asset as a currency will always be the hard part. Cryptocurrencies have a certain unfavorable stigma that needs to be remedied in one way or another. When even assets with bitcoin’s branding cannot succeed as digital cash, the uphill battle will be even steeper for other projects.<br><br>The eCash team recognizes this and in fact, their development budget is related to the price of eCash, so they are highly motivated to build value over the long term. Upcoming features like Avalanche and staking rewards are also designed to attract and retain new users.</p><h3><strong>Closing Thoughts</strong></h3><p>Going beyond the likes of Bitcoin and Ethereum will never be an easy task, regardless of the infrastructure and appeal of a project. However, developers should not abandon the mission to create true "digital cash" either. Forward-thinking remains a crucial aspect for cryptocurrencies, yet very few projects can live up to that standard today, which is rather problematic.</p><p>Personally, I am happy to see new initiatives come to market with a focus on empowering users, rather than serving as the next money grab or “be the next Bitcoin in terms of value appreciation”. The industry needs to move past that stage sooner rather than later.</p><p>‍</p>',
            short_content:
                "Even though Bitcoin remains the world's leading cryptocurrency by market capitalization, it has not always lived up to its promise of ...",
            type: 'News',
            media_link:
                'https://www.fxstreet.com/cryptocurrencies/news/bitcoin-may-fail-to-become-a-true-crypto-asset-202107020116',
            publish_date:
                'Fri Jul 02 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'bitcoin-may-fail-to-become-a-true-crypto-asset',
            createdAt: '2023-06-20T22:39:41.256Z',
            updatedAt: '2023-06-20T22:39:41.256Z',
            publishedAt: '2023-06-20T22:39:41.250Z',
            legacy_image:
                '/images/60df9c373e16fb326d57d77e_bitcoin-arrow-down-laptop-cryptocurrency-fall-value-bitcoin_253401-4683.jpeg',
            legacy_media_logo:
                '/images/60df9c43b5f58a32160a9d4c_fxs_logo_blueback_screen.png',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
    {
        id: 10,
        attributes: {
            title: 'Bitcoin Cash ABC rebrands to ‘eCash’, embraces proof-of-stake — and 2 decimal places',
            content:
                '<p>Bitcoin Cash ABC has rebranded to “eCash,” redenominated its token, and launched a proof-of-stake consensus layer.</p><p>Bitcoin Cash ABC (BCHA), the embattled cryptocurrency project that has forked away from both Bitcoin and Bitcoin Cash, has rebranded to eCash (XEC).</p><p>The project’s re-launch will see it integrate proof-of-stake consensus layer “Avalanche,” introducing staking and greatly increasing the speed of transactions.</p><p>eCash will also reduce its decimal places down from eight to two, with lead developer, Amaury Sechet, <a href="https://e.cash/media/bitcoin-abc-rebrands-to-ecash-becomes-the-first-bitcoin-based-network-to-offer-staking" target="_blank">stating</a>:</p><blockquote><strong>“No other money has eight decimal places. Why should crypto? Cryptocurrencies with a lower unit price also enjoy higher bull market appreciation. Because the eCash team is incentivized by both tech and price improvement, this improvement was a no-brainer.”</strong></blockquote><p>With the upgrade, all users’ BCHA coins will be converted to XEC at a ration of one-to-one million.</p><p>Chinese crypto media, Wu Blockchain, <a href="https://twitter.com/WuBlockchain/status/1410574367004631040" target="_blank">noted</a> the project plans to support EVM-compatibility, signalling eCash hopes to interoperate with Ethereum’s burgeoning DeFi sector.</p><p>Bitcoin ABC proponent, Joannes Vermorel, <a href="https://blog.vermorel.com/journal/2020/7/01/ecash-is-bitcoin.html" target="_blank">articulated</a> five core missions for the project — ensuring transactions are anonymous, immutable, low cost, and secure in less than three seconds, and maintaining infrastructure as “a public good funded through the coin social contract.”</p><p><strong><em>Related: </em></strong><a href="https://cointelegraph.com/news/bitcoin-cash-price-jumps-68-looming-hard-fork-to-boost-bch-user-base"><em>Bitcoin Cash price jumps 68%: Looming hard fork to boost BCH user base?</em></a></p><p>Bitcoin Cash ABC experienced a rocky ride after emerging as the minority chain after <a href="https://cointelegraph.com/news/roger-ver-to-bitcoin-abc-stick-a-fork-in-it-you-re-done">November 2020’s Bitcoin Cash fork</a>. </p><p>The rest of the community did not accept Sechet’s move to <a href="https://cointelegraph.com/news/fork-in-the-node-bitcoin-cash-node-on-track-to-oust-bitcoin-abc">redistribute 8% of newly mined coins</a> to a wallet under his control to fund development. This was implemented into ABC in November.</p><p>According to CoinmarketCap, Bitcoin Cash is currently the 12th-largest crypto asset with a capitalization of $9.2 billion, while Bitcoin Cash ABC ranks 217th with a market cap of $587 million.</p>',
            short_content:
                'Bitcoin Cash ABC has rebranded to “eCash,” redenominated its token, and launched a proof-of-stake consensus layer.',
            type: 'News',
            media_link:
                'https://cointelegraph.com/news/bitcoin-cash-abc-rebrands-to-ecash-embraces-proof-of-stake-and-2-decimal-places',
            publish_date:
                'Fri Jul 02 2021 00:00:00 GMT+0000 (Coordinated Universal Time)',
            slug: 'bitcoin-cash-abc-rebrands-to-ecash-embraces-proof-of-stake-and-2-decimal-places',
            createdAt: '2023-06-20T22:39:28.588Z',
            updatedAt: '2023-06-20T22:39:28.588Z',
            publishedAt: '2023-06-20T22:39:28.583Z',
            legacy_image:
                '/images/60df9e75c9aecc2ce9360924_Screen%20Shot%202021-07-02%20at%204.14.08%20PM.png',
            legacy_media_logo:
                '/images/60df9da6caefd427a0ca6fff_cointelegraph-logo-vector.svg',
            image: {
                data: null,
            },
            media_logo: {
                data: null,
            },
        },
    },
];
