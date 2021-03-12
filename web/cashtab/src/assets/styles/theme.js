export const theme = {
    primary: '#ff8d00',
    contrast: '#fff',
    app: {
        sidebars: 'linear-gradient(270deg, #040c3c, #212c6e)',
        background: '#fbfbfd',
    },
    wallet: {
        background: '#fff',
        text: {
            primary: '#000',
            secondary: '#3e3f42',
        },
        switch: {
            activeCash: {
                shadow:
                    'inset 8px 8px 16px #d67600, inset -8px -8px 16px #ffa400',
            },
            activeToken: {
                background: '#5ebd6d',
                shadow:
                    'inset 5px 5px 11px #4e9d5a, inset -5px -5px 11px #6edd80',
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
            'rgba(0, 0, 0, 0.01) 0px 0px 1px, rgba(0, 0, 0, 0.04) 0px 4px 8px,rgba(0, 0, 0, 0.04) 0px 16px 24px, rgba(0, 0, 0, 0.01) 0px 24px 32px',
        border: '#e9eaed',
        hoverBorder: '#5ebd6d',
    },
    footer: {
        background: '#fff',
        navIconInactive: '#949494',
    },
    forms: {
        error: '#f04134',
        border: '#e7edf3',
        addonBackground: '#f4f4f4',
        addonForeground: '#3e3f42',
        selectionBackground: '#fff',
    },
    icons: { outlined: '#3e3f42' },
    modals: {
        buttons: { background: '#fff' },
    },
    settings: { delete: 'red' },
    qr: {
        background: '#fff',
        token: '#5ebd6d',
        shadow:
            'rgba(0, 0, 0, 0.01) 0px 0px 1px, rgba(0, 0, 0, 0.04) 0px 4px 8px, rgba(0, 0, 0, 0.04) 0px 16px 24px, rgba(0, 0, 0, 0.01) 0px 24px 32px',
    },
    buttons: {
        primary: {
            backgroundImage:
                'linear-gradient(270deg, #ff8d00 0%, #bb5a00 100%)',
            color: '#fff',
            hoverShadow: '0px 3px 10px -5px rgba(0, 0, 0, 0.75)',
        },
        secondary: {
            background: '#e9eaed',
            color: '#444',
            hoverShadow: '0px 3px 10px -5px rgba(0, 0, 0, 0.75)',
        },
    },
    collapses: {
        background: '#fbfcfd',
        border: '#eaedf3',
        color: '#3e3f42',
    },
};
