// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { type ReactNode } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router';
import appConfig from 'config/app';
import {
    ContactsIcon,
    AirdropIcon,
    ThemedSignAndVerifyMsg,
    RewardIcon,
    TokensIcon,
    SwapIcon,
} from 'components/Common/CustomIcons';
import { ReactComponent as StakeIcon } from 'assets/stake.svg';
import { ReactComponent as ReceiveIcon } from 'assets/qr-code.svg';
import { ReactComponent as SendIcon } from 'assets/send-icon.svg';
import { ReactComponent as NftIcon } from 'assets/nft-icon.svg';

export interface ActionButtonItem {
    icon: ReactNode;
    label: string;
    to: string;
    /** Optional click handler; use preventDefault() to stay on page and toggle content */
    onClick?: (e: React.MouseEvent) => void;
}

export type ActionButtonRowVariant =
    | 'homepage'
    | 'sendReceive'
    | 'tools'
    | 'agora';

const showRewardsLink =
    import.meta.env.VITE_BUILD_ENV !== 'extension' &&
    import.meta.env.VITE_TESTNET !== 'true';

interface ActionButtonRowProps {
    /** Which predefined button set to use */
    variant: ActionButtonRowVariant;
    /** Index of the button to show as active/highlighted (0-based) */
    activeIndex?: number;
}

function getButtonsForVariant(
    variant: ActionButtonRowVariant,
): ActionButtonItem[] {
    switch (variant) {
        case 'homepage': {
            const base = [
                {
                    icon: <ReceiveIcon />,
                    label: 'Receive',
                    to: '/receive',
                },
                {
                    icon: <SendIcon />,
                    label: 'Send',
                    to: '/send',
                },
                {
                    icon: <StakeIcon />,
                    label: 'Stake',
                    to: `/token/${appConfig.vipTokens.xecx.tokenId}`,
                },
            ];
            if (showRewardsLink) {
                base.push({
                    icon: <RewardIcon />,
                    label: 'Rewards',
                    to: '/rewards',
                });
            }
            return base;
        }
        case 'sendReceive': {
            return [
                {
                    icon: <ReceiveIcon />,
                    label: 'Receive',
                    to: '/receive',
                },
                {
                    icon: <SendIcon />,
                    label: 'Send',
                    to: '/send',
                },
                {
                    icon: <SendIcon />,
                    label: 'Send Token',
                    to: '/send?mode=token',
                },
            ];
        }
        case 'tools': {
            const base: ActionButtonItem[] = [
                {
                    icon: <ContactsIcon />,
                    label: 'Contacts',
                    to: '/contacts',
                },
                {
                    icon: <AirdropIcon />,
                    label: 'Airdrop',
                    to: '/airdrop',
                },
                {
                    icon: <ThemedSignAndVerifyMsg />,
                    label: 'Sign & Verify',
                    to: '/signverifymsg',
                },
            ];
            if (showRewardsLink) {
                base.push({
                    icon: <RewardIcon />,
                    label: 'Rewards',
                    to: '/rewards',
                });
            }
            return base;
        }
        case 'agora': {
            return [
                {
                    icon: <TokensIcon />,
                    label: 'Token Market Place',
                    to: '/agora',
                },
                {
                    icon: <NftIcon />,
                    label: 'Listed NFTs',
                    to: '/nfts',
                },
                {
                    icon: <SwapIcon />,
                    label: 'AlpSwap',
                    to: '/alpswap',
                },
            ];
        }
        default:
            return [];
    }
}

const Row = styled.div<{ $tabNav?: boolean }>`
    display: flex;
    align-items: stretch;
    gap: 10px;
    width: 100%;
    margin: 0 auto;
    margin-bottom: 10px;
    @media (max-width: 768px) {
        gap: 6px;
        margin-bottom: 6px;
    }

    ${props =>
        props.$tabNav &&
        `
        align-items: flex-end;
        justify-content: flex-start;
        gap: 4px;
        margin-top: 8px;
        margin-bottom: 16px;
        padding-bottom: 0;
        border-bottom: 1px solid ${props.theme.border};
        @media (max-width: 768px) {
            margin-top: 4px;
            margin-bottom: 12px;
        }
    `}
`;

const Button = styled(Link)<{
    $active?: boolean;
    $tabNav?: boolean;
}>`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 15px 10px;
    background-color: ${props =>
        props.$tabNav
            ? 'transparent'
            : props.$active
              ? props.theme.accent
              : 'rgba(255, 255, 255, 0.14)'};
    border-radius: ${props => (props.$tabNav ? '8px 8px 0 0' : '10px')};
    color: ${props => props.theme.primaryText};
    text-decoration: none;
    font-size: var(--text-sm);
    line-height: 1em;
    transition:
        background-color 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease;
    svg {
        fill: currentColor;
        height: 20px;
        width: 20px;
    }
    span {
        opacity: ${props =>
            props.$tabNav
                ? props.$active
                    ? 1
                    : 0.75
                : props.$active
                  ? 1
                  : 0.6};
    }
    :hover {
        background-color: ${props =>
            props.$tabNav
                ? props.$active
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(255, 255, 255, 0.06)'
                : props.theme.accent};
        color: ${props => props.theme.primaryText};
        span {
            opacity: 1;
        }
    }

    ${props =>
        props.$tabNav &&
        `
        flex: 1;
        min-width: 0;
        flex-direction: row;
        margin-bottom: -1px;
        padding: 8px 6px;
        font-size: 12px;
        font-weight: ${props.$active ? 600 : 400};
        background-color: ${
            props.$active ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
        };
        border-bottom: 2px solid ${
            props.$active ? props.theme.accent : 'transparent'
        };
        svg {
            height: 18px;
            width: 18px;
            flex-shrink: 0;
        }
        :hover {
            border-bottom-color: ${
                props.$active ? props.theme.accent : 'transparent'
            };
        }
        @media (min-width: 769px) {
            flex: 0 1 auto;
            min-width: auto;
            padding: 10px 16px;
            font-size: var(--text-sm);
            svg {
                height: 20px;
                width: 20px;
            }
        }
    `}

    @media (max-width: 768px) {
        ${props =>
            !props.$tabNav &&
            `
            padding: 15px;
            font-size: 12px;
            flex-direction: column;
            svg {
                height: 24px;
                width: 24px;
            }
        `}
    }
`;

const ActionButtonRow: React.FC<ActionButtonRowProps> = ({
    variant,
    activeIndex,
}) => {
    const buttons = getButtonsForVariant(variant);
    if (!buttons.length) return null;
    const tabNav =
        variant === 'sendReceive' || variant === 'tools' || variant === 'agora';
    return (
        <Row $tabNav={tabNav}>
            {buttons.map(({ icon, label, to, onClick }, index) => (
                <Button
                    key={`${to}-${index}`}
                    to={to}
                    $active={activeIndex === index}
                    $tabNav={tabNav}
                    onClick={onClick}
                >
                    {icon}
                    <span>{label}</span>
                </Button>
            ))}
        </Row>
    );
};

export default ActionButtonRow;
