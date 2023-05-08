import styled from 'styled-components';

export const Container = styled.div`
    width: 100%;
    margin: auto;
    max-width: 1500px;
    padding: 0 50px;

    ${props => props.theme.breakpoint.medium} {
        padding: 0 20px;
    }
`;

export const ThemeSwitch = styled.div`
    position: fixed;
    bottom: 30px;
    width: 40px;
    height: 40px;
    z-index: 9999;
    background: rgba(255, 255, 255, 0.1);
    right: 30px;
`;
