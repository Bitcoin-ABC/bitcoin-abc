// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Image from 'next/image';
import Link from 'next/link';
import Layout from '/components/layout';
import SubPageHero from '/components/sub-page-hero';
import H3 from '/components/h3';
import { Container, CenterImage, GradientSpacer } from '/components/atoms';
import robothand from '/public/animations/robot-hand.json';
import logodiagram from '/public/images/logo-diagram.svg';
import logodiagram2 from '/public/images/logo-diagram-2.svg';
import logodiagram3 from '/public/images/logo-diagram-3.svg';
import {
    TextBlock,
    LogoRow,
    RowName,
    LogoTileCtn,
    LogoTile,
    LinkCtn,
    ImageCtn,
    ColorRow,
    ColorTileCtn,
    ColorTile,
    Swatch,
    ColorValues,
    FontLink,
} from '/styles/pages/ecash-brand.js';

export default function EcashBrand() {
    const logos = [
        {
            type: 'logo-primary-horizontal',
            variations: ['dark-text', 'black', 'white-text', 'white'],
            row_name: 'Primary Horizontal',
        },
        {
            type: 'logo-primary-vertical',
            variations: ['dark-text', 'black', 'white-text', 'white'],
            row_name: 'Primary Vertical',
        },
        {
            type: 'logo-secondary-horizontal',
            variations: ['dark-text', 'black', 'white-text', 'white'],
            row_name: 'Secondary Horizontal',
        },
        {
            type: 'logo-secondary-vertical',
            variations: ['dark-text', 'black', 'white-text', 'white'],
            row_name: 'Secondary Vertical',
        },
        {
            type: 'square-icon',
            variations: [
                'blue-gradient',
                'blue',
                'white-blue-gradient',
                'white-blue',
            ],
            row_name: 'Square Icon',
        },
        {
            type: 'icon',
            variations: ['blue-gradient', 'blue', 'black', 'white'],
            row_name: 'Icon',
        },
        {
            type: 'circle-icon',
            variations: ['blue-gradient', 'blue', 'black', 'white'],
            row_name: 'Round Icon',
        },
    ];

    const lightbackgrounds = ['dark-text', 'black'];

    const primaryColors = [
        {
            hex: '#001137',
            rgb: 'R:0 G:17 B:55',
            cmyk: 'C:100 M:68 Y:67 K:90',
        },
        {
            hex: '#273498',
            rgb: 'R:39 G:52 B:152',
            cmyk: 'C:100 M:94 Y:1 K:0',
        },
        {
            hex: '#0074C2',
            rgb: 'R:0 G:116 B:194',
            cmyk: 'C:86 M:51 Y:0 K:0',
        },
        {
            hex: '#00ABE7',
            rgb: 'R:0 G:171 B:231',
            cmyk: 'C:71 M:14 Y:0 K:0',
        },
    ];

    const secondaryColors = [
        {
            hex: '#CD0BC3',
            rgb: 'R:205 G:11 B:195',
            cmyk: 'C:33 M:89 Y:0 K:0',
        },
        {
            hex: '#FF21D0',
            rgb: 'R:255 G:33 B:208',
            cmyk: 'C:14 M:84 Y:0 K:0',
        },
        {
            hex: '#231F20',
            rgb: 'R:35 G:31 B:32',
            cmyk: 'C:70 M:67 Y:64 K:74',
        },
        {
            hex: '#FFFFFF',
            rgb: 'R:255 G:255 B:255',
            cmyk: 'C:0 M:0 Y:0 K:0',
        },
    ];

    return (
        <Layout
            metaTitle="eCash Brand"
            metaDescription="We’ve created this guide to help you use some of our core brand elements and our logo. Definitely check it out before you get started."
        >
            <SubPageHero
                image={robothand}
                imagereverse
                imagespeed={0.7}
                h2subtext="eCash Brand"
                h2text="Introduction"
            >
                <p>
                    We’ve created this guide to help you use some of our core
                    brand elements and our logo. Definitely check it out before
                    you get started.
                </p>
            </SubPageHero>
            <GradientSpacer />
            <Container narrow>
                <TextBlock>
                    <H3 text="eCash Logo" />
                    <p>
                        Our logo identifies, expresses, and distinguishes us.
                        It’s one of the first things people see and one of the
                        first things people remember when they think about us.
                        It’s what enables us to stand out from the rest.
                    </p>
                    <p>
                        When we introduced the new logo, we wanted to make sure
                        it accurately represents the essence of eCash, showing
                        the world our boldness and dynamism.
                    </p>
                    <p>
                        The letters “e” & “c” are among the most recognizable
                        symbols in the world. Combined with the block and
                        hexagon elements, we created a logo that is instantly
                        recognizable in a way that identifies the project like
                        never before.
                    </p>
                    <CenterImage height="500px">
                        <Image src={logodiagram} alt="eCash" fill />
                    </CenterImage>
                </TextBlock>

                <TextBlock>
                    <H3 text="eCash Logo Construction" />
                    <p>
                        The eCash logo should always be afforded a predetermined
                        area of breathing space, referred to as clear space.
                        This ensures that the identity maintains its hierarchy
                        and is not overwhelmed by other visual elements.
                    </p>
                    <CenterImage height="400px">
                        <Image src={logodiagram2} alt="eCash logo" fill />
                    </CenterImage>
                    <CenterImage height="400px">
                        <Image src={logodiagram3} alt="eCash logo" fill />
                    </CenterImage>
                </TextBlock>

                <TextBlock>
                    <H3 text="eCash Logo Assets" />
                    <p>
                        There are several variations of the logo: primary,
                        secondary, and icon.
                    </p>
                    {logos.map(logo => (
                        <>
                            <RowName>{logo.row_name}</RowName>
                            <LogoRow>
                                {logo.variations.map((variation, index) => (
                                    <LogoTileCtn key={`${variation}_${index}`}>
                                        <LogoTile
                                            lightbackground={lightbackgrounds.includes(
                                                variation,
                                            )}
                                        >
                                            <ImageCtn>
                                                <Image
                                                    src={`/images/logos/ecash-${logo.type}-${variation}.png`}
                                                    alt="eCash logo"
                                                    fill
                                                />
                                            </ImageCtn>
                                            <LinkCtn>
                                                <Link
                                                    href={`/images/logos/ecash-${logo.type}-${variation}.png`}
                                                    alt="eCash Logo"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    [PNG]
                                                </Link>
                                                <Link
                                                    href={`/images/logos/ecash-${logo.type}-${variation}.svg`}
                                                    alt="eCash Logo"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    [SVG]
                                                </Link>
                                            </LinkCtn>
                                        </LogoTile>
                                    </LogoTileCtn>
                                ))}
                            </LogoRow>
                        </>
                    ))}
                </TextBlock>

                <TextBlock>
                    <H3 text="eCash Brand Colors" />
                    <h4>PRIMARY COLORS</h4>
                    <p>
                        The primary colors are the major identity color which
                        will be most use in different situation. They are to be
                        used across all communications and applications,
                        including as background colors and body copy.
                    </p>
                    <ColorRow>
                        {primaryColors.map((color, index) => (
                            <ColorTileCtn key={`${color}_${index}`}>
                                <ColorTile>
                                    <Swatch color={color.hex} />
                                    <ColorValues>
                                        <span>{color.hex}</span>
                                        <span>{color.rgb}</span>
                                        <span>{color.cmyk}</span>
                                    </ColorValues>
                                </ColorTile>
                            </ColorTileCtn>
                        ))}
                    </ColorRow>

                    <h4>SECONDARY COLORS</h4>
                    <p>
                        The secondary colors are used to support the primary
                        color, usually as either a subtle backdrop or to
                        immediately attract the eye.
                    </p>
                    <ColorRow>
                        {secondaryColors.map((color, index) => (
                            <ColorTileCtn key={`secondary_${color}_${index}`}>
                                <ColorTile>
                                    <Swatch color={color.hex} />
                                    <ColorValues>
                                        <span>{color.hex}</span>
                                        <span>{color.rgb}</span>
                                        <span>{color.cmyk}</span>
                                    </ColorValues>
                                </ColorTile>
                            </ColorTileCtn>
                        ))}
                    </ColorRow>
                </TextBlock>

                <TextBlock>
                    <H3 text="eCash Official Fonts" />
                    <p>
                        For logotype, subtitle and heading materials, the
                        primary font Montserrat should be used. For the logotype
                        please set the tracking to 50.
                    </p>
                    <FontLink
                        href="https://fonts.google.com/specimen/Montserrat"
                        target="_blank"
                        rel="noreferrer"
                        montserrat
                    >
                        Montserrat
                    </FontLink>
                    <p>
                        For paragraph and other text elements, the secondary
                        font Poppins should be used.
                    </p>
                    <FontLink
                        href="https://fonts.google.com/specimen/Poppins"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Poppins
                    </FontLink>
                    <p>
                        For more information, please download the{' '}
                        <Link
                            href="/images/eCash-visual-identity-kit.pdf"
                            target="_blank"
                            rel="noreferrer"
                        >
                            VISUAL IDENTITY GUIDELINE
                        </Link>
                        . Alternatively, you can reach out to{' '}
                        <Link href="mailto:contact@e.cash">contact@e.cash</Link>{' '}
                        if you have any questions.
                    </p>
                </TextBlock>
            </Container>
        </Layout>
    );
}
