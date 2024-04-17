// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const LinkSection = styled.div`
    margin-top: 60px;
    :last-child {
        margin-bottom: 200px;
    }
`;

export const LinkArrow = styled.div`
    position: absolute;
    right: 40px;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    transition: all ease-in-out 200ms;
    h3 {
        margin: 0;
        font-size: 45px;
        ${props => props.theme.breakpoint.medium} {
            font-size: 25px;
        }
    }
`;

export const InnerBuildLinkCtn = styled.div`
    background-color: ${props => props.theme.colors.darkBlue};
    display: flex;
    justify-content: center;
    flex-direction: column;
    color: ${props => props.theme.colors.contrast};
    padding: 10px 60px 10px 20px;
    width: auto;
    height: 100%;
    clip-path: polygon(
        100% 0,
        100% calc(100% - 16px),
        calc(100% - 20px) 100%,
        0 100%,
        0 0
    );
    h4 {
        margin: 0;
        font-size: 24px;
        transition: all ease-in-out 200ms;
        ${props => props.theme.breakpoint.medium} {
            font-size: 18px;
        }
    }
    p {
        opacity: 0.6;
        margin: 0;
        transition: all ease-in-out 200ms;
        ${props => props.theme.breakpoint.medium} {
            font-size: 16px;
        }
    }
`;

export const BuildLinkCtn = styled.div`
    width: 100%;
    position: relative;
    background-color: ${props => props.theme.colors.primary};
    padding: 2px;
    margin-bottom: 15px;
    clip-path: polygon(
        100% 0,
        100% calc(100% - 16px),
        calc(100% - 20px) 100%,
        0 100%,
        0 0
    );
    :hover {
        background-color: ${props => props.theme.colors.accent};
        ${LinkArrow} {
            h3 {
                color: ${props => props.theme.colors.accent};
            }
            transform: translateX(10px);
        }
        ${InnerBuildLinkCtn} {
            h4 {
                color: ${props => props.theme.colors.accent};
            }
            p {
                opacity: 1;
            }
        }
    }
`;
