// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import Link from 'next/link';

export const FooterCtn = styled.div`
    width: 100%;
    height: auto;
    padding: 40px 40px 20px;
    background-color: ${props => props.theme.colors.black};
    color: #fff;
    clip-path: polygon(
        0 0,
        18% 0,
        19% 20px,
        81% 20px,
        82% 0,
        100% 0,
        100% 100%,
        0 100%
    );
    margin-top: -20px;
    ${props => props.theme.filters.grayscale};

    ${props => props.theme.breakpoint.medium} {
        padding: 40px 0 20px;
    }
`;

export const LogoCtn = styled.div`
    width: 100%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    margin-bottom: 30px;
    > div {
        width: 130px;
        height: 100px;
        position: relative;

        ${props => props.theme.breakpoint.medium} {
            width: 100px;
        }
    }
`;

export const ContentCtn = styled.div`
    display: flex;
    justify-content: space-between;

    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;
    }
`;

export const NavItem = styled.div`
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    margin-bottom: 5px;
`;

export const SocialCtn = styled.div`
    display: flex;
    width: 400px;
    height: 30px;
    margin-top: 10px;

    ${props => props.theme.breakpoint.medium} {
        width: 100%;
        flex-wrap: wrap;
        height: auto;
    }

    a {
        width: 20px;
        height: 20px;
        position: relative;
        margin-right: 20px;
        transition: all ease-in-out 200ms;

        :hover {
            transform: scale(1.4);
        }

        :hover img {
            filter: invert(32%) sepia(76%) saturate(5535%) hue-rotate(189deg)
                brightness(93%) contrast(101%);
        }

        ${props => props.theme.breakpoint.medium} {
            margin-bottom: 15px;
            margin-right: 15px;
        }
    }
`;

export const ContactLink = styled(Link)`
    opacity: 0.5;
    font-size: 14px;
    color: #fff;
    line-height: 1.9em;

    :hover {
        opacity: 1;
        color: var(--bluelight);
    }
`;

export const LinksCtn = styled.div`
    display: flex;

    ${props => props.theme.breakpoint.medium} {
        flex-direction: column;
        margin-top: 50px;
    }

    > div {
        padding: 0;
        margin-left: 60px;
        ${props => props.theme.breakpoint.medium} {
            margin-left: 0;
            margin-bottom: 20px;
        }

        > div:first-child {
            font-size: 14px;
            font-weight: 500;
            color: #fff;
            margin-bottom: 5px;
        }
    }
`;

export const DropdownCtn = styled.div`
    display: flex;
    flex-direction: column;

    a {
        opacity: 0.5;
        font-size: 14px;
        color: #fff;
        line-height: 1.9em;

        :hover {
            opacity: 1;
            color: ${props => props.theme.colors.primaryLight};
        }
    }
`;

export const Copyright = styled.div`
    width: 100%;
    font-size: 14px;
    text-align: center;
    color: #fff;
    opacity: 0.3;
    margin: 50px 0 0px;
`;
