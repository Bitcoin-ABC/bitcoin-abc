// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';
import { Collapse } from 'antd';
import PropTypes from 'prop-types';

const { Panel } = Collapse;

export const StyledCollapse = styled(Collapse)`
    background: ${props => props.theme.collapses.background} !important;
    border: 1px solid ${props => props.theme.collapses.border} !important;

    .ant-collapse-content {
        border-top: none;
        background-color: ${props =>
            props.theme.collapses.expandedBackground} !important;
    }

    .ant-collapse-item {
        border-bottom: none !important;
    }

    *:not(button) {
        color: ${props => props.theme.collapses.color} !important;
    }
`;
const CenteredTitleCollapse = styled.div``;

const CollapseCtn = styled.div`
    .ant-collapse-header {
        .anticon {
            flex: 1;
        }
        ${CenteredTitleCollapse} {
            flex: 2;
        }
    }
    .ant-form-small {
        color: ${props => props.theme.lightGrey} !important;
    }
`;

export const TokenCollapse = styled(Collapse)`
    ${({ disabled = false, ...props }) =>
        disabled === true
            ? `
                background: ${props.theme.buttons.secondary.background} !important;
           .ant-collapse-header {
               font-size: 18px;
               font-weight: bold;
               color: ${props.theme.buttons.secondary.color} !important;
               svg {
                   color: ${props.theme.buttons.secondary.color} !important;
               }
           }
           .ant-collapse-arrow {
               font-size: 18px;
           }
            `
            : `
                background: ${props.theme.eCashBlue} !important;
           .ant-collapse-header {
               font-size: 18px;
               font-weight: bold;
               color: ${props.theme.contrast} !important;
               svg {
                   color: ${props.theme.contrast} !important;
               }
           }
           .ant-collapse-arrow {
               font-size: 18px;
           }
            `}
`;

export const AdvancedCollapse = styled(Collapse)`
    .ant-input-textarea-show-count:after {
        color: ${props => props.theme.lightGrey} !important;
    }
    .ant-collapse-content {
        background-color: ${props =>
            props.theme.advancedCollapse.expandedBackground} !important;
    }
    ${({ disabled = false, ...props }) =>
        disabled === true
            ? `
                background: ${props.theme.buttons.secondary.background} !important;
           .ant-collapse-header {
               font-size: 18px;
               font-weight: normal;
               color: ${props.theme.buttons.secondary.color} !important;
               svg {
                   color: ${props.theme.buttons.secondary.color} !important;
               }
           }
           .ant-collapse-arrow {
               font-size: 18px;
           }
            `
            : `
                background: ${props.theme.advancedCollapse.background} !important;
           .ant-collapse-header {
               font-size: 18px;
               font-weight: bold;
               color: ${props.theme.advancedCollapse.color} !important;
               svg {
                   color: ${props.theme.advancedCollapse.icon} !important;
               }
           }
           .ant-collapse-arrow {
               font-size: 18px;
           }
        
            `}
`;

export const CustomCollapseCtn = ({
    panelHeader,
    children,
    optionalDefaultActiveKey,
    optionalKey,
}) => {
    return (
        <CollapseCtn>
            <AdvancedCollapse
                style={{
                    marginBottom: '24px',
                }}
                defaultActiveKey={optionalDefaultActiveKey}
            >
                <Panel
                    header={
                        <CenteredTitleCollapse>
                            {panelHeader}
                        </CenteredTitleCollapse>
                    }
                    key={optionalKey}
                >
                    {children}
                </Panel>
            </AdvancedCollapse>
        </CollapseCtn>
    );
};

CustomCollapseCtn.propTypes = {
    optionalDefaultActiveKey: PropTypes.arrayOf(PropTypes.string),
    panelHeader: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    children: PropTypes.node,
    optionalKey: PropTypes.string,
};
