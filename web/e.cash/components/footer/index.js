// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Image from 'next/image';
import Link from 'next/link';
import {
    FooterCtn,
    LogoCtn,
    ContentCtn,
    NavItem,
    SocialCtn,
    ContactLink,
    LinksCtn,
    DropdownCtn,
    Copyright,
} from './styles.js';
import { navitems } from '/data/navitems.js';
import { socials } from '/data/socials.js';
import { Container } from '/components/atoms';
import ExternalLink from '/components/external-link';

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const copyrightSymbol = '\u00A9';
    const navitemsWithoutDropdown = navitems.filter(
        navitem => !navitem.dropdown_items,
    );
    return (
        <FooterCtn>
            <Container>
                <div>
                    <LogoCtn>
                        <div>
                            <Image
                                src="/images/ecash-logo.svg"
                                alt="ecash logo"
                                fill
                            />
                        </div>
                    </LogoCtn>
                    <ContentCtn>
                        <div>
                            <NavItem>Stay Connected</NavItem>
                            <SocialCtn>
                                {socials.map(social => (
                                    <Link
                                        href={social.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        key={social.name}
                                    >
                                        <Image
                                            src={`/images/${social.name}.svg`}
                                            alt={social.name}
                                            fill
                                        />
                                    </Link>
                                ))}
                            </SocialCtn>
                            <div>
                                <ContactLink
                                    href="mailto:contact@e.cash"
                                    target="_blank"
                                    title="Send us an email!"
                                >
                                    <div>contact@e.cash</div>
                                </ContactLink>
                            </div>
                        </div>
                        <LinksCtn>
                            {navitems.map(
                                (navitem, index) =>
                                    navitem.dropdown_items && (
                                        <div
                                            key={`${navitem.nav_item}_${index}`}
                                        >
                                            <div>{navitem.nav_item}</div>
                                            <DropdownCtn>
                                                {navitem.dropdown_items.map(
                                                    dropdownitem => (
                                                        <ExternalLink
                                                            href={
                                                                dropdownitem.link
                                                            }
                                                            key={
                                                                dropdownitem.title
                                                            }
                                                        >
                                                            {dropdownitem.title}
                                                        </ExternalLink>
                                                    ),
                                                )}
                                                {index === 0 &&
                                                    navitemsWithoutDropdown.map(
                                                        item => (
                                                            <ExternalLink
                                                                href={item.link}
                                                                key={
                                                                    item.nav_item
                                                                }
                                                            >
                                                                {item.nav_item}
                                                            </ExternalLink>
                                                        ),
                                                    )}
                                            </DropdownCtn>
                                        </div>
                                    ),
                            )}
                        </LinksCtn>
                    </ContentCtn>
                    <Copyright>
                        {copyrightSymbol}
                        {currentYear} Bitcoin ABC. All Rights Reserved.
                    </Copyright>
                </div>
            </Container>
        </FooterCtn>
    );
}
