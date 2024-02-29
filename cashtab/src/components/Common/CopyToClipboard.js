// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { generalNotification } from './Notifications';
import PropTypes from 'prop-types';

const CopyToClipboard = ({ data, optionalOnCopyNotification, children }) => {
    return (
        <div
            onClick={() => {
                let result = { title: '', msg: '' };

                if (navigator.clipboard) {
                    navigator.clipboard.writeText(data);
                }
                if (optionalOnCopyNotification) {
                    if (
                        optionalOnCopyNotification.msg &&
                        optionalOnCopyNotification.msg.length > 0
                    ) {
                        result.msg = optionalOnCopyNotification.msg;
                    }
                    if (
                        optionalOnCopyNotification.title &&
                        optionalOnCopyNotification.title.length > 0
                    ) {
                        result.title = optionalOnCopyNotification.title;
                    }
                    generalNotification(result.msg, result.title);
                }
            }}
        >
            {children}
        </div>
    );
};

CopyToClipboard.propTypes = {
    data: PropTypes.string,
    optionalOnCopyNotification: PropTypes.shape({
        title: PropTypes.string,
        msg: PropTypes.string,
    }),
    children: PropTypes.node,
};

export default CopyToClipboard;
