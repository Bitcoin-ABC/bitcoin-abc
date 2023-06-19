// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const GridCtn = styled.div`
    margin-top: 30px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, 1fr);
    grid-column-gap: 16px;
    grid-row-gap: 16px;

    .grid-item-feature {
        background-color: ${props => props.theme.colors.primary};
        background-image: linear-gradient(
            135deg,
            #273498,
            ${props => props.theme.colors.primary} 54%,
            #00abe7
        );
        transition: background-color 0.3s ease-in-out;
        color: ${props => props.theme.colors.contrast};
        text-align: left;
        text-decoration: none;
        display: flex;
        justify-content: flex-end;
        flex-direction: column;
        padding: 40px;
        position: relative;
        overflow: hidden;
    }

    .grid-item-feature:hover {
        background-image: none;
        background-color: ${props => props.theme.colors.featureTileHover};
    }

    .feature-tile-image-ctn {
        width: 140%;
        height: 100%;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        margin-left: -20%;
        margin-right: auto;
    }

    .feature-tile-image-ctn img {
        object-fit: contain;
    }

    .grid-item-feature h3 {
        margin: 0;
        font-size: 40px;
        font-weight: 600;
        position: relative;
        text-transform: uppercase;
    }

    .grid-item-feature h3::after {
        content: '';
        width: 20px;
        height: 1px;
        background-color: ${props => props.theme.colors.contrast};
        position: absolute;
        bottom: -10px;
        left: 0;
    }

    .grid-item {
        border: 2px solid ${props => props.theme.colors.primary};
        background-color: rgba(0, 0, 0, 0.51);
        transition: 0.3s ease-in-out;
        color: #fff;
        text-align: left;
        text-decoration: none;
        display: flex;
        align-items: flex-start;
        flex-direction: column;
        padding: 20px 20px 200px 20px;
        position: relative;
    }

    .grid-item:hover {
        border-color: ${props => props.theme.colors.contrast};
        background-color: rgba(0, 0, 0, 0.75);
    }

    .grid-item-feature {
        grid-area: 1 / 1 / 3 / 1;
    }
    .grid-item:nth-child(1) {
        grid-area: 1 / 2 / 1 / 3;
    }
    .grid-item:nth-child(2) {
        grid-area: 1 / 3 / 1 / 4;
    }
    .grid-item:nth-child(3) {
        grid-area: 2 / 2 / 3 / 3;
    }
    .grid-item:nth-child(4) {
        grid-area: 2 / 3 / 2 / 4;
    }

    .grid-item h4 {
        margin: 0;
        margin-bottom: 6px;
        color: ${props => props.theme.colors.primaryLight};
        font-size: 18px;
        line-height: 1.2;
        font-weight: 600;
    }

    .grid-item p {
        font-size: 14px;
        position: relative;
    }

    .grid-item p::after {
        content: '';
        width: 20px;
        height: 1px;
        background-color: ${props => props.theme.colors.contrast};
        position: absolute;
        bottom: -10px;
        left: 0;
    }

    .tile-image-ctn {
        width: 70%;
        height: 200px;
        position: relative;
        position: absolute;
        bottom: 0;
        right: 0;
    }

    .tile-image-ctn img {
        object-fit: contain;
    }

    ${props => props.theme.breakpoint.medium} {
        .grid-item-feature {
            grid-area: 1 / 1 / 2 / 4;
        }
        .grid-item:nth-child(1) {
            grid-area: 2 / 1 / 3 / 4;
        }
        .grid-item:nth-child(2) {
            grid-area: 3 / 1 / 4 / 4;
        }
        .grid-item:nth-child(3) {
            grid-area: 4 / 1 / 5 / 4;
        }
        .grid-item:nth-child(4) {
            grid-area: 5 / 1 / 6 / 4;
        }

        .tile-image-ctn {
            width: 90%;
            max-width: 300px;
        }

        .grid-item-feature h3 {
            line-height: 1.2em;
        }
    }
`;
