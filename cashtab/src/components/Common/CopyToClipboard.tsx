// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { toast } from 'react-toastify';
import styled from 'styled-components';

const CopyWrapper = styled.div`
    cursor: pointer;
`;

interface CopyToClipboardProps {
    data: string;
    showToast?: boolean;
    customMsg?: string;
    children: React.ReactNode;
}
const CopyToClipboard: React.FC<CopyToClipboardProps> = ({
    data,
    showToast = false,
    customMsg = false,
    children,
}) => {
    return (
        <CopyWrapper
            onClick={() => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(data);
                }
                if (showToast) {
                    const toastMsg = customMsg
                        ? customMsg
                        : `"${data}" copied to clipboard`;
                    toast.success(toastMsg);
                }
            }}
        >
            {children}
        </CopyWrapper>
    );
};

export default CopyToClipboard;
