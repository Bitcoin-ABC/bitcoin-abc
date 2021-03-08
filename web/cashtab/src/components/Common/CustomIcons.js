import * as React from 'react';
import styled from 'styled-components';
import {
    CopyOutlined,
    DollarOutlined,
    LoadingOutlined,
    WalletOutlined,
    QrcodeOutlined,
} from '@ant-design/icons';

export const CashLoadingIcon = (
    <LoadingOutlined
        style={{
            fontSize: 48,
            color: '#ff8d00',
        }}
    />
);

export const ThemedCopyOutlined = styled(CopyOutlined)`
    color: ${props => props.theme.iconOutlined} !important;
`;
export const ThemedDollarOutlined = styled(DollarOutlined)`
    color: ${props => props.theme.iconOutlined} !important;
`;
export const ThemedWalletOutlined = styled(WalletOutlined)`
    color: ${props => props.theme.iconOutlined} !important;
`;
export const ThemedQrcodeOutlined = styled(QrcodeOutlined)`
    color: ${props => props.theme.iconOutlined} !important;
`;

export const LoadingBlock = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    flex-direction: column;
    svg {
        width: 50px;
        height: 50px;
        fill: #ff8d00;
    }
`;

export const CashLoader = () => (
    <LoadingBlock>
        <LoadingOutlined />
    </LoadingBlock>
);
