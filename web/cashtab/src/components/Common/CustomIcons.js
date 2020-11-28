import * as React from 'react';
import styled from 'styled-components';
import { Icon, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

export const CashLoadingIcon = (
    <LoadingOutlined style={{ fontSize: 24, color: '#ff8d00;' }} spin />
);

export const CashSpin = styled(Spin)`
    svg {
        width: 50px;
        height: 50px;
        fill: #ff8d00;
    }
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

const hammer = () => (
    <svg viewBox="0 0 576 512" width="18" height="18">
        <path
            fill="currentColor"
            d="M571.31 193.94l-22.63-22.63c-6.25-6.25-16.38-6.25-22.63 0l-11.31 11.31-28.9-28.9c5.63-21.31.36-44.9-16.35-61.61l-45.25-45.25c-62.48-62.48-163.79-62.48-226.28 0l90.51 45.25v18.75c0 16.97 6.74 33.25 18.75 45.25l49.14 49.14c16.71 16.71 40.3 21.98 61.61 16.35l28.9 28.9-11.31 11.31c-6.25 6.25-6.25 16.38 0 22.63l22.63 22.63c6.25 6.25 16.38 6.25 22.63 0l90.51-90.51c6.23-6.24 6.23-16.37-.02-22.62zm-286.72-15.2c-3.7-3.7-6.84-7.79-9.85-11.95L19.64 404.96c-25.57 23.88-26.26 64.19-1.53 88.93s65.05 24.05 88.93-1.53l238.13-255.07c-3.96-2.91-7.9-5.87-11.44-9.41l-49.14-49.14z"
        ></path>
    </svg>
);

export const CashLoader = () => (
    <LoadingBlock>
        <Icon type="loading" theme="outlined" />
    </LoadingBlock>
);

const plane = () => (
    <svg height="18" width="18" viewBox="0 0 691.2 650.24">
        <defs id="defs74">
            <style id="style72" type="text/css" />
            <clipPath id="clipPath89" clipPathUnits="userSpaceOnUse">
                <rect
                    y="192"
                    x="177.60765"
                    height="638.46899"
                    width="654.39233"
                    id="rect91"
                    fill="currentColor"
                />
            </clipPath>
            <clipPath id="clipPath93" clipPathUnits="userSpaceOnUse">
                <rect
                    y="192"
                    x="177.60765"
                    height="638.46899"
                    width="654.39233"
                    id="rect95"
                    fill="currentColor"
                />
            </clipPath>
        </defs>
        <g transform="translate(-176.38277,-186.3533)" id="g99">
            <path
                fill="currentColor"
                d="M 192,499.2 404,592.6 832,192 Z"
                p-id="9782"
                id="path76"
                clipPath="url(#clipPath93)"
            />
            <path
                fill="currentColor"
                d="M 832,192 435.8,623.4 539.6,832 Z"
                p-id="9783"
                id="path78"
                clipPath="url(#clipPath89)"
            />
        </g>
    </svg>
);

const fire = () => (
    <svg
        viewBox="64 64 896 896"
        focusable="false"
        class=""
        data-icon="fire"
        width="18"
        height="18"
        fill="#F34745"
        aria-hidden="true"
    >
        <path d="M834.1 469.2A347.49 347.49 0 0 0 751.2 354l-29.1-26.7a8.09 8.09 0 0 0-13 3.3l-13 37.3c-8.1 23.4-23 47.3-44.1 70.8-1.4 1.5-3 1.9-4.1 2-1.1.1-2.8-.1-4.3-1.5-1.4-1.2-2.1-3-2-4.8 3.7-60.2-14.3-128.1-53.7-202C555.3 171 510 123.1 453.4 89.7l-41.3-24.3c-5.4-3.2-12.3 1-12 7.3l2.2 48c1.5 32.8-2.3 61.8-11.3 85.9-11 29.5-26.8 56.9-47 81.5a295.64 295.64 0 0 1-47.5 46.1 352.6 352.6 0 0 0-100.3 121.5A347.75 347.75 0 0 0 160 610c0 47.2 9.3 92.9 27.7 136a349.4 349.4 0 0 0 75.5 110.9c32.4 32 70 57.2 111.9 74.7C418.5 949.8 464.5 959 512 959s93.5-9.2 136.9-27.3A348.6 348.6 0 0 0 760.8 857c32.4-32 57.8-69.4 75.5-110.9a344.2 344.2 0 0 0 27.7-136c0-48.8-10-96.2-29.9-140.9z"></path>
    </svg>
);

export const HammerIcon = props => <Icon component={hammer} {...props} />;

export const PlaneIcon = props => <Icon component={plane} {...props} />;

export const FireIcon = props => <Icon component={fire} {...props} />;
