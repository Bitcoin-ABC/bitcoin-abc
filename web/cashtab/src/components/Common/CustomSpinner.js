import * as React from 'react';
import styled from 'styled-components';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

export const CashSpinIcon = (
    <LoadingOutlined style={{ fontSize: 24, color: '#ff8d00' }} spin />
);
export const CashSpin = styled(Spin)`
    svg {
        width: 50px;
        height: 50px;
        fill: #ff8d00;
    }
`;
