// @flow

import React from 'react';
import styled from 'styled-components';

import colors from '../styles/colors';

const Svg = styled.svg`
    fill: ${colors.success700};
`;

const CheckSVG = () => (
    <Svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
    >
        <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z" />
    </Svg>
);

export default CheckSVG;
