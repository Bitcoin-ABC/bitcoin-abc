import { useState } from 'react';
import '../styles/global.css';
import styled, { ThemeProvider } from 'styled-components';
import { ecash, stealth } from '../styles/theme';

const ThemeSwitch = styled.div`
    position: fixed;
    bottom: 30px;
    width: 40px;
    height: 40px;
    z-index: 9999;
    background: rgba(255, 255, 255, 0.1);
    right: 30px;
`;

export default function App({ Component, pageProps }) {
    const [theme, setTheme] = useState(ecash);

    const HandleThemeChange = () => {
        setTheme(theme === ecash ? stealth : ecash);
    };

    return (
        <ThemeProvider theme={theme}>
            <Component {...pageProps} />
            <ThemeSwitch onClick={HandleThemeChange} />
        </ThemeProvider>
    );
}
