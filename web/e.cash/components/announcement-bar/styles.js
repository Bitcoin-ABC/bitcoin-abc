// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const AnnouncementBarCtn = styled.div`
    a,
    div {
        width: 100%;
        background-color: ${props => props.theme.colors.black};
        padding: 0px 24px;
        text-align: center;
        color: ${props => props.theme.colors.contrast};
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
        font-size: 14px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 200ms ease-in-out;
        margin-top: ${props => (props.navBackground ? '-34px' : '0')};
    }
    a {
        :hover {
            background-color: ${props => props.theme.colors.accent};
            color: ${props => props.theme.colors.contrast};
        }
    }

    ${props => props.theme.breakpoint.medium} {
        a,
        div {
            padding: 0px 10px;
            font-size: 12px;
            height: 30px;
        }
    }
`;
