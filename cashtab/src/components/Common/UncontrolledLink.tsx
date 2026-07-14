// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import styled from 'styled-components';

import Modal from 'components/Common/Modal';

/**
 * Cashtab may render links create from user input, e.g. tokenUrls in
 * token genesis txs, or any link in an OP_RETURN msg (Cashtab msg,
 * airdrop msg, any arbitrary data)
 *
 * For good UX, we want users to see the URL. However, due to the
 * proliferation of scams in crypto, we must show an alert and some
 * kind of action required modal before navigating away from Cashtab
 */

// Need to use a Button that looks like a Link to get Modal with onClick
const LinkButton = styled.button`
    background: none;
    border: none;
    padding: 0;
    color: ${props => props.theme.primaryText};
    font-size: var(--text-sm);
    text-decoration: underline;
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover {
        color: ${props => props.theme.accent};
        text-decoration: underline;
    }
`;

const Wrapper = styled.div`
    display: inline;
`;

const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
`;

/**
 * We cannot use Alert from components/Common as we need strict styles for this modal
 */
const LinkAlert = styled.div`
    background-color: #fff2f0;
    border-radius: 12px;
    color: red;
    padding: 12px;
    margin: 12px 0;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    overflow-wrap: break-word;
    word-break: normal;
    white-space: normal;
`;

const ModalText = styled.div`
    text-align: center;
    color: ${props => props.theme.error};
    overflow-wrap: break-word;
    white-space: normal;
    max-width: 100%;
`;

interface UncontrolledLinkProps {
    url: string;
}

/**
 * Domains that will open in a new tab without any modal warning.
 * Matches the hostname with or without a www. prefix, case insensitive.
 */
const APPROVED_DOMAINS = [
    'agora.cash',
    'cashtab.com',
    'firma.cash',
    'firmaprotocol.com',
    'proofofwriting.com',
    'stakedxec.com',
];

const normalizeDomain = (hostname: string): string => {
    const lowerHostname = hostname.toLowerCase();
    return lowerHostname.startsWith('www.')
        ? lowerHostname.slice(4)
        : lowerHostname;
};

const isApprovedUrl = (linkUrl: string): boolean => {
    try {
        const { hostname } = new URL(linkUrl);
        const domain = normalizeDomain(hostname);
        return APPROVED_DOMAINS.includes(domain);
    } catch {
        return false;
    }
};

const UncontrolledLink: React.FC<UncontrolledLinkProps> = ({ url }) => {
    const [showModal, setShowModal] = useState<boolean>(false);

    const handleLinkClick = () => {
        if (isApprovedUrl(url)) {
            window.open(url, '_blank');
        } else {
            setShowModal(true);
        }
    };

    // To save screen space, we do not render http:// or https:// for links
    // parsed from eCash txs
    // But we do render every other part of the url
    const renderedUrl = `${url?.slice(
        url.startsWith('https://') ? 8 : url.startsWith('http://') ? 7 : 0,
    )}`;

    return (
        <Wrapper>
            {showModal && (
                <Modal
                    title="Uncontrolled Link"
                    handleOk={() => {
                        window.open(url, '_blank');
                        setShowModal(false);
                    }}
                    handleCancel={() => setShowModal(false)}
                    showCancelButton
                >
                    <ModalContent>
                        <ModalText>⚠️⚠️⚠️</ModalText>
                        <ModalText>{url}</ModalText>
                        <LinkAlert>
                            You are about to open a link that doesn't belong to
                            cashtab.com.{' '}
                        </LinkAlert>
                        <LinkAlert>
                            This link has not been reviewed or approved in any
                            way, and can contain phishing material or
                            inappropriate content.
                        </LinkAlert>
                    </ModalContent>
                </Modal>
            )}
            <LinkButton onClick={handleLinkClick}>{renderedUrl}</LinkButton>
        </Wrapper>
    );
};

export default UncontrolledLink;
