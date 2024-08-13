// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { ButtonCtn, ButtonMain, ButtonInner } from './styles.js';

/****** 
Button Props 
text = String: the text that will be displayed in the button
link = String: the link for the button
corner = String: accepts "topLeft", "topRight", "bottomRight", "bottomLeft", clips the corner of the button
color = String: accepts "accent" or "white". If no option is given button defaults to primary theme color
glow = Boolean: adds a glow behind the button
id = String: optional id tag
******/

<Button text="Example Text" link="/" color="accent" glow />;

export default function Button({
    text = 'Button',
    link = '/',
    openInNewTab = false,
    corner = null,
    color = null,
    glow = false,
    id,
}) {
    const corners = {
        topLeft: {
            outer: 'polygon(20px 0, 100% 0, 100% 100%, 0 100%, 0 20px)',
            inner: 'polygon(19px 0, 100% 0, 100% 100%, 0 100%, 0 19px)',
        },
        topRight: {
            outer: 'polygon(0 0, calc(100% - 20px) 0%, 100% calc(0% + 20px), 100% 100%, 0 100%)',
            inner: 'polygon(0 0, calc(100% - 19px) 0%, 100% calc(0% + 19px), 100% 100%, 0 100%)',
        },
        bottomRight: {
            outer: 'polygon(100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 0',
            inner: 'polygon(100% 0, 100% calc(100% - 19px), calc(100% - 19px) 100%, 0 100%, 0 0',
        },
        bottomLeft: {
            outer: 'polygon(100% 0, 100% 100%, 20px 100%, 0 calc(100% - 20px), 0 0',
            inner: 'polygon(100% 0, 100% 100%, 19px 100%, 0 calc(100% - 19px), 0 0',
        },
    };
    return (
        <ButtonCtn color={color} glow={glow}>
            <ButtonMain
                id={id}
                href={link}
                target={openInNewTab ? '_blank' : undefined}
                color={color}
                style={corner ? { clipPath: corners[corner].outer } : null}
            >
                <ButtonInner
                    color={color}
                    style={corner ? { clipPath: corners[corner].inner } : null}
                >
                    {text}
                </ButtonInner>
            </ButtonMain>
        </ButtonCtn>
    );
}
