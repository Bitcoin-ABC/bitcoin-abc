// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const Pre = styled.pre`
    background: ${props => props.theme.colors.black};
    width: 100%;
    overflow-x: scroll;
    padding: 20px;
`;
