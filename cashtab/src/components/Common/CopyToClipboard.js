// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

const CopyToClipboard = ({
    data,
    showToast = false,
    customMsg = false,
    children,
}) => {
    return (
        <div
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
        </div>
    );
};

CopyToClipboard.propTypes = {
    data: PropTypes.string,
    showToast: PropTypes.bool,
    customMsg: PropTypes.oneOf(PropTypes.false, PropTypes.string),
    children: PropTypes.node,
};

export default CopyToClipboard;
