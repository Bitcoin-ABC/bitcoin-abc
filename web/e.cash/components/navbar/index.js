import s from './navbar.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { navitems } from '../../data/navitems';

export default function Navbar({ announcementbar }) {
    const [priceLinkText, setPriceLinkText] = useState('Buy XEC');
    const [mobileMenu, setMobileMenu] = useState(false);
    const [selectedDropDownMenu, setSelectedDropDownMenu] = useState(-1);
    const [windowWidth, setWindowWidth] = useState('');

    const handleResize = () => {
        setWindowWidth(window.innerWidth);
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
        // add event listeners for resize so we can update the screen width
        window.addEventListener('resize', handleResize);
        // get XEC price
        getPrice();
        // remove the event listener after mount to avoid memory leak
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className={s.navbar_outer}>
            {announcementbar && (
                <Link
                    href={announcementbar.link}
                    className={s.announcementbar_ctn}
                    target="_blank"
                    rel="noreferrer"
                >
                    {announcementbar.text}
                </Link>
            )}
            <div className={s.navbar_ctn}>
                <div className={s.navbar}>
                    <Link href="/" className={s.nav_logo}>
                        <Image
                            src="/images/ecash-logo.svg"
                            alt="ecash logo"
                            fill
                        />
                    </Link>
                    <nav
                        role="navigation"
                        className={s.navbar_links_ctn}
                        style={{ left: mobileMenu ? '0' : '-400px' }}
                    >
                        {navitems.map((navitem, index) => (
                            <div className={s.nav_outer} key={navitem.nav_item}>
                                {navitem.link ? (
                                    <Link
                                        className={s.nav_item}
                                        href={navitem.link}
                                    >
                                        {navitem.nav_item}
                                        <div className={s.majabar} />
                                    </Link>
                                ) : (
                                    <>
                                        <div
                                            className={s.nav_item}
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
                                            className={s.nav_dropdown_ctn}
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
                                                            className={
                                                                s.dropdown_nav_item
                                                            }
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
                                                            <div
                                                                className={
                                                                    s.dropdown_icon_ctn
                                                                }
                                                            >
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
                    <Link href="/" className={s.pricelink_ctn}>
                        <div className={s.righttop}></div>
                        <div className={s.rightdown}></div>
                        <div className={s.leftdown}></div>
                        <div className={s.lefttop}></div>
                        <div>{priceLinkText}</div>
                    </Link>
                    <div className={s.menubtn_ctn_outer}>
                        <input
                            id="menu__toggle"
                            className={s.menubtn_ctn}
                            type="checkbox"
                            onClick={() => setMobileMenu(!mobileMenu)}
                        />
                        <label className={s.menu_btn} htmlFor="menu__toggle">
                            <span></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
