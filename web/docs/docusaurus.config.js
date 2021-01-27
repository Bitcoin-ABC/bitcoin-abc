module.exports = {
    title: 'Build on BCHA',
    tagline: 'Add cash payments to your website',
    url: 'https://bitcoinabc.org/bcha',
    baseUrl: '/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    favicon: 'img/favicon.ico',
    organizationName: 'bitcoin-abc',
    projectName: 'cashtab',
    themeConfig: {
        navbar: {
            title: 'Cashtab',
            logo: {
                alt: 'Cashtab Logo',
                src: 'img/logo.svg',
            },
            items: [
                {
                    to: 'docs/',
                    activeBasePath: 'docs',
                    label: 'Docs',
                    position: 'left',
                },
                {
                    href: 'https://github.com/bitcoin-abc/bitcoin-abc',
                    label: 'GitHub',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Docs',
                    items: [
                        {
                            label: 'Overview',
                            to: 'docs/',
                        },
                        {
                            label: 'cashtab-components',
                            to: 'docs/components-overview/',
                        },
                    ],
                },
                {
                    title: 'Community',
                    items: [
                        {
                            label: 'Twitter',
                            href: 'https://twitter.com/Bitcoin_ABC',
                        },
                    ],
                },
                {
                    title: 'More',
                    items: [
                        {
                            label: 'BCHA',
                            href: 'https://bitcoinabc.org/BCHA',
                        },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Bitcoin ABC.`,
        },
    },
    presets: [
        [
            '@docusaurus/preset-classic',
            {
                docs: {
                    sidebarPath: require.resolve('./sidebars.js'),
                    editUrl: 'https://github.com/bitcoin-abc/bitcoin-abc/',
                },
                theme: {
                    customCss: require.resolve('./src/css/custom.css'),
                },
            },
        ],
    ],
};
