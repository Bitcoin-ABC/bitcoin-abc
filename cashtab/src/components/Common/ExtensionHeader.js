// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import Cashtab from 'assets/cashtab_xec.png';
import PopOut from 'assets/popout.svg';
import PropTypes from 'prop-types';

const OpenInTabBtn = styled.button`
    background: none;
    border: none;
`;

const CashtabLogo = styled.img`
    width: 120px;
    @media (max-width: 768px) {
        width: 110px;
    }
`;

const LogoCtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    width: 100%;
    div {
        flex-grow: 3;
    }
    ${CashtabLogo} {
        flex: 2;
        text-align: center;
    }
    ${OpenInTabBtn} {
        flex: 3;
        text-align: right;
    }
`;

const ExtTabImg = styled.img`
    max-width: 20px;
`;

const FlexSpacer = styled.div``;

const ExtensionHeader = ({ selectedKey }) => {
    // openInTab is an extension-only method
    const openInTab = () => {
        window.open(`index.html#/${selectedKey}`);
    };
    return (
        <LogoCtn>
            <FlexSpacer />
            <CashtabLogo src={Cashtab} alt="cashtab" />
            <OpenInTabBtn data-tip="Open in tab" onClick={() => openInTab()}>
                <ExtTabImg src={PopOut} alt="Open in tab" />
            </OpenInTabBtn>
        </LogoCtn>
    );
};

ExtensionHeader.propTypes = {
    selectedKey: PropTypes.string,
};

export default ExtensionHeader;
