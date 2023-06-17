// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { ecash, stealth } from '/styles/theme';
import GlobalCSS from '/styles/global';
import { ThemeSwitch } from '/components/atoms';

export default function App({ Component, pageProps }) {
    const [theme, setTheme] = useState(ecash);

    const HandleThemeChange = () => {
        setTheme(theme === ecash ? stealth : ecash);
    };

    return (
        <ThemeProvider theme={theme}>
            <GlobalCSS />
            <Component {...pageProps} />
            <ThemeSwitch onClick={HandleThemeChange} />
        </ThemeProvider>
    );
}
