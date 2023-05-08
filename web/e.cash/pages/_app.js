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
