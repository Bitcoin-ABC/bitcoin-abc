// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';
import Link from 'next/link';

export const TextBlock = styled.div`
    width: 100%;
    margin-bottom: 150px;
    position: relative;

    ${props => props.theme.breakpoint.medium} {
        margin-bottom: 90px;
    }
`;

export const LogoRow = styled.div`
    width: 100%;
    display: flex;
    box-sizing: border-box;
    flex-wrap: wrap;
`;

export const RowName = styled.div`
    font-size: 18px;
    padding-left: 5px;
    margin-top: 10px;
    opacity: 0.8;
`;

export const LogoTileCtn = styled.div`
    padding: 5px;
    width: 25%;
    position: relative;
    ${props => props.theme.breakpoint.medium} {
        width: 50%;
    }
`;

export const LogoTile = styled.div`
    background-color: ${props =>
        props.lightbackground
            ? props.theme.colors.contrast
            : props.theme.colors.black};
    padding: 30px 10px;
    width: 100%;
    position: relative;
    cursor: pointer;
`;

export const ImageCtn = styled.div`
    position: relative;
    height: 110px;

    img {
        object-fit: contain;
    }
`;

export const LinkCtn = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.9);
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all ease-in-out 200ms;
    a {
        font-size: 16px;
        font-weight: 600;
    }
    a:last-child {
        color: ${props => props.theme.colors.accentDark};
    }
    a:last-child:hover {
        color: ${props => props.theme.colors.accent};
    }
    :hover {
        opacity: 1;
    }
`;

export const ColorRow = styled.div`
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 50px;
`;

export const ColorTileCtn = styled.div`
    padding: 5px;
    width: 25%;
    position: relative;
    ${props => props.theme.breakpoint.medium} {
        width: 50%;
    }
`;

export const ColorTile = styled.div`
    width: 100%;
    position: relative;
    border: 1px solid ${props => props.theme.colors.contrast};
`;

export const Swatch = styled.div`
    background-color: ${props => props.color};
    width: 100%;
    height: 120px;
`;

export const ColorValues = styled.div`
    background-color: ${props => props.theme.colors.colorSwatchBackground};
    width: 100%;
    padding: 15px;
    display: flex;
    flex-direction: column;
    ${props => props.theme.breakpoint.medium} {
        padding: 10px;
    }

    span {
        font-size: 14px;

        ${props => props.theme.breakpoint.medium} {
            font-size: 12px;
        }
    }
`;

export const FontLink = styled(Link)`
    font-size: 60px;
    font-family: ${props => (props.montserrat ? 'Montserrat' : 'Poppins')};
    color: ${props =>
        props.montserrat
            ? props.theme.colors.primary
            : props.theme.colors.accent};
    font-weight: 600;
    margin-bottom: 30px;
    display: block;

    ${props => props.theme.breakpoint.medium} {
        font-size: 45px;
    }
`;
