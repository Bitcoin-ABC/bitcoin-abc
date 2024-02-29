// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Card, Modal } from 'antd';

const CropModal = styled(Modal)`
    .ant-modal-close-x {
        font-size: 2px;
    }
`;

export const CropperContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 175px;
`;
export const ControlsContainer = styled.div`
    position: absolute;
    padding: 12px;
    bottom: 0;
    left: 50%;
    width: 50%;
    transform: translateX(-50%);
    height: 175px;
    display: block;
    align-items: center;
`;

export const CropControlModal = ({
    expand,
    renderExpanded = () => null,
    onClose,
    style,
    ...otherProps
}) => {
    return (
        <CropModal
            width={'90vw'}
            height={600}
            open={expand}
            centered
            footer={null}
            onCancel={onClose}
            {...otherProps}
        >
            <Card style={{ ...style, width: '100%', height: 600 }}>
                {renderExpanded()}
            </Card>
        </CropModal>
    );
};
CropControlModal.propTypes = {
    expand: PropTypes.bool,
    renderExpanded: PropTypes.func,
    onClose: PropTypes.func,
    style: PropTypes.object,
};
