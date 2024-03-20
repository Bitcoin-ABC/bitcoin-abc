// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const NavbarOuter = styled.div`
    position: fixed;
    top: 0;
    width: 100%;
    z-index: 9999;
`;

export const NavbarCtn = styled.div`
    width: 100%;
    background-color: ${props =>
        props.navBackground
            ? props.theme.colors.navbarBackground
            : 'transparent'};
    position: relative;
    padding: 0 24px;

    .navbar {
        width: 100%;
        max-width: 1400px;
        margin: auto;
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 200ms ease-in-out;
    }

    .nav_logo {
        width: 110px;
        height: 33px;
        position: relative;
        ${props => props.theme.filters.grayscale};
    }

    .navbar_links_ctn {
        display: flex;
        align-items: center;
    }

    .navbar_links_ctn .nav_item:hover + .nav_dropdown_ctn,
    .nav_dropdown_ctn:hover {
        display: flex;
    }

    .navbar_links_ctn .nav_item:hover .majabar {
        height: 2px;
        background-color: ${props => props.theme.colors.accent};
    }

    .nav_outer {
        position: relative;
        display: flex;

        .nav_item {
            color: ${props => props.theme.colors.contrast};
            font-size: 15px;
            font-weight: 500;
            letter-spacing: 1px;
            position: relative;
            transition: all 200ms ease-in-out;
            cursor: pointer;
            padding: ${props =>
                props.navBackground ? '28px 20px' : '36px 20px'};
        }
    }

    .nav_dropdown_ctn {
        position: absolute;
        flex-direction: column;
        top: ${props => (props.navBackground ? '80px' : '90px')};
        left: 0;
        width: 300px;
        z-index: 99;
        transition: all ease-in-out 200ms;
        display: none;
    }

    .navbar_outer_scroll .nav_dropdown_ctn {
        top: 80px;
    }

    .dropdown_nav_item {
        background-color: ${props => props.theme.colors.contrast};
        width: 100%;
        padding: 25px 20px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid rgba(0, 0, 0, 0.13);
        color: ${props => props.theme.colors.darkBackground};
        line-height: 1;
        font-weight: 500;
        font-size: 14px;
        transition: all ease-in-out 200ms;
    }

    .dropdown_nav_item:last-child {
        border-bottom: none;
    }

    .dropdown_icon_ctn {
        width: 35px;
        height: 35px;
        position: relative;
        margin-right: 10px;
    }

    .dropdown_nav_item img {
        object-fit: contain;
        ${props => props.theme.filters.grayscale};
    }

    .dropdown_nav_item:hover {
        padding-left: 30px;
        background-color: #f0f0f0;
    }

    .navbar_links_ctn .nav_item:hover + .nav_dropdown_ctn,
    .nav_dropdown_ctn:hover {
        display: flex;
    }

    .majabar {
        position: absolute;
        left: 0%;
        top: auto;
        right: 0%;
        bottom: 0%;
        width: 100%;
        height: 0px;
        background-color: ${props => props.theme.colors.accent}
        transition: all ease-in-out 300ms;
    }

    .navbar_links_ctn .nav_item:hover .majabar {
        height: 2px;
    }

    .pricelink_ctn {
        position: relative;
        padding: 16px 23px;
        background-color: rgba(0, 0, 0, 0.5);
        transition: all 300ms ease-in-out;
        color: ${props => props.theme.colors.contrast};
        font-weight: 400;
        text-decoration: none;
        font-size: 14px;
    }

    .pricelink_ctn:hover {
        box-shadow: inset 0 0 13px 2px hsla(0, 0%, 100%, 0.73),
            inset 0 0 0 1px #fff;
    }

    .lefttop {
        position: absolute;
        left: 0%;
        top: 0%;
        right: auto;
        bottom: auto;
        width: 10px;
        height: 10px;
        border-top: 1px solid #fff;
        border-left: 1px solid #fff;
    }

    .leftdown {
        position: absolute;
        left: 0%;
        top: auto;
        right: auto;
        bottom: 0%;
        width: 10px;
        height: 10px;
        border-bottom: 1px solid #fff;
        border-left: 1px solid #fff;
    }

    .righttop {
        position: absolute;
        left: auto;
        top: 0%;
        right: 0%;
        bottom: auto;
        width: 10px;
        height: 10px;
        border-top: 1px solid #fff;
        border-right: 1px solid #fff;
    }

    .rightdown {
        position: absolute;
        left: auto;
        top: auto;
        right: 0%;
        bottom: 0%;
        width: 10px;
        height: 10px;
        border-right: 1px solid #fff;
        border-bottom: 1px solid #fff;
    }

    .menubtn_ctn_outer {
        display: none;
    }

    ${props => props.theme.breakpoint.medium} {
        padding: 15px 20px;

        .navbar {
            position: unset;
        }

        .navbar_links_ctn {
            background-color: ${props => props.theme.colors.darkBackground};
            position: absolute;
            left: 0;
            top: 0px;
            flex-direction: column;
            width: calc(100% - 60px);
            max-width: 400px;
            min-height: 100vh;
            align-items: flex-start;
            transition: all ease-in-out 200ms;
            overflow-y: scroll;
            height: 100%;
            padding-bottom: 100px;
        }

        .nav_outer {
            width: 100%;
            flex-direction: column;
            background-color: ${props => props.theme.colors.darkBackground};
        }

        .nav_outer .nav_item {
            font-size: 15px;
            padding: 16px 0 16px 40px;
            text-align: left;
            transition: all 200ms ease-in-out;
            width: 100%;
            border-bottom: 1px solid rgba(255, 255, 255, 0.13);
        }

        .dropdown_indicator::after {
            content: '';
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid ${props => props.theme.colors.contrast};
            position: absolute;
            right: 20px;
            top: 25px;
            opacity: 0.5;
        }

        .nav_dropdown_ctn {
            position: unset;
            width: 100%;
        }

        .navbar_links_ctn .nav_item:hover + .nav_dropdown_ctn,
        .nav_dropdown_ctn:hover {
            display: none;
        }

        .dropdown_nav_item {
            padding: 15px 0 15px 40px;
            width: 100%;
        }

        .dropdown_nav_item:hover {
            padding-left: 45px;
        }

        .dropdown_icon_ctn {
            width: 25px;
            height: 25px;
            margin-right: 8px;
        }

        .pricelink_ctn {
            display: none;
        }

        /****************************************  HAMBURGER  ****************************************/

        .menubtn_ctn_outer {
            position: relative;
            height: 100%;
            width: 40px;
            display: block;
        }

        .menubtn_ctn {
            opacity: 0;
            top: 0px;
            right: 0px;
            width: 40px !important;

            margin: 0 !important;
            border: none !important;
            background-color: transparent;
            padding: 0 !important;
        }
        .menubtn_ctn:checked + .menu_btn > span {
            transform: rotate(45deg);
        }
        .menubtn_ctn:checked + .menu_btn > span::before {
            top: 0;
            transform: rotate(0deg);
            width: 100%;
        }
        .menubtn_ctn:checked + .menu_btn > span::after {
            top: 0;
            transform: rotate(90deg);
            width: 100%;
        }

        .menu_btn {
            position: absolute;
            top: -5px;
            right: 0px;
            width: 30px;
            height: 40px;
            cursor: pointer;
            z-index: 99999;
        }
        .menu_btn > span,
        .menu_btn > span::before,
        .menu_btn > span::after {
            display: block;
            position: absolute;
            width: 100%;
            height: 3px;
            background-color: ${props => props.theme.colors.contrast};
            transition-duration: 0.25s;
            top: 19px;
            border-radius: 4px;
        }
        .menu_btn > span::before {
            content: '';
            top: -8px;
            width: 80%;
        }
        .menu_btn > span::after {
            content: '';
            top: 8px;
            width: 60%;
        }
    }
`;

export const EnvVarMessage = styled.div`
    font-size: 10px;
    position: absolute;
    top: 0;
    left: 5px;
    top: 4px;
    :nth-child(2) {
        top: 14px;
    }
`;

export const SocialCtn = styled.div`
    display: flex;
    width: 100%;
    margin-top: 10px;
    padding-left: 40px;
    flex-wrap: wrap;
    max-width: 200px;

    a {
        width: 22px;
        height: 22px;
        position: relative;
        margin-right: 20px;
        transition: all ease-in-out 200ms;
        margin-top: 20px;

        :hover {
            transform: scale(1.4);
        }

        :hover img {
            filter: invert(32%) sepia(76%) saturate(5535%) hue-rotate(189deg)
                brightness(93%) contrast(101%);
        }
    }
`;
