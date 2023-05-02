import styled from 'styled-components';

export const Hero = styled.div`
    width: 100%;
    height: 100vh;
    min-height: 600px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
    z-index: 1;

    .social-ctn {
        display: flex;
        align-items: center;
        position: absolute;
        bottom: 30px;
        left: 20px;
        right: 0;
        margin: auto;
        max-width: 1400px;
    }

    .social-icon-ctn {
        width: 20px;
        height: 20px;
        position: relative;
        margin-right: 20px;
        transition: all ease-in-out 200ms;
    }

    .social-icon-ctn:hover {
        transform: scale(1.4);
    }

    h1 {
        font-family: 'Montserrat', sans-serif;
        font-size: 7.5vw;
        line-height: 0.8;
        font-weight: 700;
        text-shadow: 6px 6px 12px rgb(0 0 0 / 70%);
        margin: 0;
        text-align: center;
        display: flex;
        justify-content: center;
        margin-bottom: 40px;
    }

    @media screen and (min-width: 2000px) {
        h1 {
            font-size: 120px;
        }
    }

    h1 span {
        margin-right: 20px;
        font-weight: 400;
    }

    ${props => props.theme.breakpoint.medium} {
        h1 {
            font-size: 14vw;
            line-height: 1;
            display: inline-block;
            text-align: center;
            margin-bottom: 10px;
        }

        h1 span {
            margin-right: 0;
        }
    }

    @media (max-width: 480px) {
        .social-ctn {
            display: none;
        }
    }
`;

export const ButtonCtn = styled.div`
    display: flex;
    justify-content: center;
    margin-top: 40px;
`;
