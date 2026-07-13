// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';

const CopyWrapper = styled.div`
    cursor: pointer;
`;

interface CopyToClipboardProps {
    data: string;
    children: React.ReactNode;
}
const CopyToClipboard: React.FC<CopyToClipboardProps> = ({
    data,
    children,
}) => {
    return (
        <CopyWrapper
            onClick={() => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(data);
                }
            }}
        >
            {children}
        </CopyWrapper>
    );
};

export default CopyToClipboard;
