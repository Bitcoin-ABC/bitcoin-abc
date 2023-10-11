// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { navitems } from '../../data/navitems';
import { NavbarOuter, NavbarCtn, EnvVarMessage } from './styles';
import AnnouncementBar from '/components/announcement-bar';

export default function Navbar({ announcementbar }) {
    const [priceLinkText, setPriceLinkText] = useState('Buy XEC');
    const [mobileMenu, setMobileMenu] = useState(false);
    const [selectedDropDownMenu, setSelectedDropDownMenu] = useState(-1);
    const [windowWidth, setWindowWidth] = useState('');
    const [windowHeight, setWindowHeight] = useState(0);
    const [navBackground, setNavBackground] = useState(false);

    const handleResize = () => {
        setWindowWidth(window.innerWidth);
    };

    const handleScroll = () => {
        setWindowHeight(window.scrollY);
    };

    const getPrice = () => {
        const api =
            'https://api.coingecko.com/api/v3/simple/price?ids=ecash&vs_currencies=usd';
        fetch(api)
            .then(response => response.json())
            .then(data =>
                setPriceLinkText('1 XEC = $' + data.ecash.usd.toFixed(6)),
            )
            .catch(err => console.log(err));
    };

    useEffect(() => {
        // set the window width so logic for mobile or desktop menus is applied correctly
        setWindowWidth(window.innerWidth);
        // add event listener for resize so we can update the screen width
        window.addEventListener('resize', handleResize);
        // add event listerner for scroll so we can change the nav background on scroll
        window.addEventListener('scroll', handleScroll);
        // get XEC price
        getPrice();
        // remove the event listeners after mount to avoid memory leak
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        // change the navBackground state based when windowHeight changes
        if (windowHeight >= 100) {
            setNavBackground(true);
        } else {
            setNavBackground(false);
        }
    }, [windowHeight]);

    return (
        <NavbarOuter navBackground={navBackground}>
            <AnnouncementBar
                href="/upgrade"
                text="Prepare for the eCash network upgrade!"
                navBackground={navBackground}
            />
            {!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
                <EnvVarMessage>
                    Google Analytics is disabled, set the env
                    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID to fix
                </EnvVarMessage>
            )}
            {!process.env.NEXT_PUBLIC_WEGLOT_API_KEY && (
                <EnvVarMessage>
                    Translations are disabled, set the env
                    NEXT_PUBLIC_WEGLOT_API_KEY to fix
                </EnvVarMessage>
            )}
            <NavbarCtn navBackground={navBackground}>
                <div className="navbar">
                    <Link href="/" className="nav_logo">
                        <Image
                            src="/images/ecash-logo.svg"
                            alt="ecash logo"
                            fill
                            priority
                        />
                    </Link>
                    <nav
                        role="navigation"
                        className="navbar_links_ctn"
                        style={{ left: mobileMenu ? '0' : '-400px' }}
                    >
                        {navitems.map((navitem, index) => (
                            <div className="nav_outer" key={navitem.nav_item}>
                                {navitem.link ? (
                                    <Link
                                        className="nav_item"
                                        href={navitem.link}
                                    >
                                        {navitem.nav_item}
                                        <div className="majabar" />
                                    </Link>
                                ) : (
                                    <>
                                        <div
                                            className="nav_item"
                                            onClick={
                                                windowWidth < 920
                                                    ? () =>
                                                          setSelectedDropDownMenu(
                                                              selectedDropDownMenu ===
                                                                  index
                                                                  ? -1
                                                                  : index,
                                                          )
                                                    : null
                                            }
                                        >
                                            {navitem.nav_item}
                                        </div>
                                        <div
                                            className="nav_dropdown_ctn"
                                            style={
                                                selectedDropDownMenu ===
                                                    index && windowWidth < 920
                                                    ? { display: 'flex' }
                                                    : null
                                            }
                                        >
                                            {navitem.dropdown_items.map(
                                                dropdownitem => (
                                                    <div
                                                        key={dropdownitem.title}
                                                    >
                                                        <Link
                                                            className="dropdown_nav_item"
                                                            href={
                                                                dropdownitem.link
                                                            }
                                                            target={
                                                                dropdownitem.link.substring(
                                                                    0,
                                                                    8,
                                                                ) === 'https://'
                                                                    ? '_blank'
                                                                    : null
                                                            }
                                                            rel={
                                                                dropdownitem.link.substring(
                                                                    0,
                                                                    8,
                                                                ) === 'https://'
                                                                    ? 'noreferrer'
                                                                    : null
                                                            }
                                                        >
                                                            <div className="dropdown_icon_ctn">
                                                                <Image
                                                                    src={
                                                                        dropdownitem.icon
                                                                    }
                                                                    alt={
                                                                        dropdownitem.title
                                                                    }
                                                                    fill
                                                                />
                                                            </div>
                                                            {dropdownitem.title}
                                                        </Link>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </nav>
                    <Link href="/get-ecash" className="pricelink_ctn">
                        <div className="righttop"></div>
                        <div className="rightdown"></div>
                        <div className="leftdown"></div>
                        <div className="lefttop"></div>
                        <div>{priceLinkText}</div>
                    </Link>
                    <div className="menubtn_ctn_outer">
                        <input
                            id="menu__toggle"
                            className="menubtn_ctn"
                            type="checkbox"
                            onClick={() => setMobileMenu(!mobileMenu)}
                        />
                        <label className="menu_btn" htmlFor="menu__toggle">
                            <span></span>
                        </label>
                    </div>
                </div>
            </NavbarCtn>
        </NavbarOuter>
    );
}
