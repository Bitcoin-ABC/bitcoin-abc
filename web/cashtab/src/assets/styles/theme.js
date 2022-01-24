export const theme = {
    primary: '#00ABE7',
    brandSecondary: '#CD0BC3',
    contrast: '#fff',
    app: {
        sidebars: `url("/cashtab_bg.png")`,
        background: '#fbfbfd',
    },
    wallet: {
        background: '#fff',
        encryption: '#DC143C',
        text: {
            primary: '#273498',
            secondary: '#273498',
        },
        switch: {
            activeCash: {
                shadow: 'inset 8px 8px 16px #0074C2, inset -8px -8px 16px #273498',
            },
            activeToken: {
                background: '#CD0BC3',
                shadow: 'inset 5px 5px 11px #FF21D0, inset -5px -5px 11px #CD0BC3',
            },
            inactive: {
                background: 'linear-gradient(145deg, #eeeeee, #c8c8c8)',
            },
        },
        borders: { color: '#e2e2e2' },
        shadow: 'rgba(0, 0, 0, 1)',
    },
    tokenListItem: {
        background: '#ffffff',
        color: '',
        boxShadow:
            'rgb(136 172 243 / 25%) 0px 10px 30px,rgb(0 0 0 / 3%) 0px 1px 1px, rgb(0 51 167 / 10%) 0px 10px 20px',
        border: '#e9eaed',
        hoverBorder: '#231F20',
    },
    footer: {
        background: '#fff',
        navIconInactive: '#949494',
    },
    forms: {
        error: '#FF21D0',
        border: '#e7edf3',
        text: '#001137',
        addonBackground: '#f4f4f4',
        addonForeground: '#3e3f42',
        selectionBackground: '#fff',
        darkLabel: '#0074c2',
        lightLabel: '#c0c0c0',
    },
    icons: { outlined: '#273498' },
    modals: {
        buttons: { background: '#fff' },
    },
    settings: {
        delete: '#CD0BC3',
        background: '#eee',
    },
    qr: {
        copyBorderCash: '#00ABE7',
        copyBorderToken: '#FF21D0',
        background: '#fff',
        token: '#231F20',
        shadow: 'rgb(136 172 243 / 25%) 0px 10px 30px, rgb(0 0 0 / 3%) 0px 1px 1px, rgb(0 51 167 / 10%) 0px 10px 20px',
    },
    buttons: {
        primary: {
            backgroundImage:
                'linear-gradient(270deg, #0074C2 0%, #273498 100%)',
            color: '#fff',
            hoverShadow: '0px 3px 10px -5px rgba(0, 0, 0, 0.75)',
            disabledOverlay: 'rgba(255, 255, 255, 0.5)',
        },
        secondary: {
            background: '#e9eaed',
            color: '#444',
            hoverShadow: '0px 3px 10px -5px rgba(0, 0, 0, 0.75)',
            disabledOverlay: 'rgba(255, 255, 255, 0.5)',
        },
    },
    collapses: {
        background: '#fbfcfd',
        expandedBackground: '#fff',
        border: '#eaedf3',
        color: '#3e3f42',
    },
    generalSettings: {
        item: {
            icon: '#949494',
            title: '#949494',
        },
        background: '#fff',
    },
};
