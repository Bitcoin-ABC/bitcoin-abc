// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { ThemeProvider } from 'styled-components';
import { ecash } from '/styles/theme';
import GlobalCSS from '/styles/global';

export default function App({ Component, pageProps }) {
    return (
        <ThemeProvider theme={ecash}>
            <GlobalCSS />
            <Component {...pageProps} />
        </ThemeProvider>
    );
}
