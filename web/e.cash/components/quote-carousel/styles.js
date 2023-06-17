// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const QuoteCarouselCtn = styled.div`
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    height: 230px;
    margin-bottom: 60px;
    margin-top: 60px;

    ${props => props.theme.breakpoint.medium} {
        height: 200px;
    }

    @media (max-width: 500px) {
        height: 300px;
    }

    @media (max-width: 350px) {
        height: 400px;
    }
`;

export const QuoteCtn = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const Quote = styled.div`
    position: absolute;
    top: ${props => (props.active ? '0' : '60px')};
    left: 0px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: ${props => (props.active ? '1' : '0')};
    transition: all 0.5s ease-in-out;

    p {
        font-style: italic;
        color: #fff;
        font-size: 16px;
        font-weight: 500;
        padding: 30px 50px;
        border: 2px solid ${props => props.theme.colors.primaryLight};
        width: 100%;
        margin-bottom: 10px;

        ${props => props.theme.breakpoint.medium} {
            padding: 20px 20px;
            border: 1px solid ${props => props.theme.colors.primaryLight};
            font-size: 14px;
        }
    }

    span {
        color: #fff;
        font-size: 14px;
        opacity: 0.6;
        text-align: right;
        width: 100%;

        ${props => props.theme.breakpoint.medium} {
            width: 100%;
            display: inline-block;
        }
    }
`;

export const DotsCtn = styled.div`
    display: flex;
    justify-content: center;
    margin-top: 10px;
`;

export const Dot = styled.div`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #fff;
    margin: 0 10px;
    cursor: pointer;
    opacity: ${props => (props.active ? '1' : '0.2')};
    background-color: ${props =>
        props.active
            ? props.theme.colors.primaryLight
            : props.theme.colors.contrast};
`;
