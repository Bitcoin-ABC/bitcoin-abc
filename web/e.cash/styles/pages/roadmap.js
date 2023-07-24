// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const RoadmapCtn = styled.div`
    background-color: ${props => props.theme.colors.black};
    padding: 100px 0 140px;
    text-align: center;
    h3 {
        display: inline-block;
    }
`;

export const PixelBorder = styled.div`
    width: 100%;
    position: relative;
    margin-top: -120px;
    height: 120px;
    z-index: 99;
    margin-top: 130px;
    background-position: 50% 100%, 0 0;
    background-size: auto, auto;
    background-repeat: repeat-x;
    background-image: url('/images/pixel-border.svg'),
        linear-gradient(180deg, transparent 79%, rgba(0, 0, 0, 0.67) 97%, #000);
`;

export const ListItem = styled.li`
    color: ${props => props.theme.colors.primaryLight};
    margin-bottom: 30px;
    font-weight: 600;
`;
