// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const QuestionBlock = styled.div`
    width: 100%;
    margin-bottom: 100px;
    position: relative;

    span {
        font-weight: 600;
        font-size: 18px;
    }

    ${props => props.theme.breakpoint.medium} {
        margin-bottom: 90px;
    }
`;

export const Blob = styled.div`
    background-color: white;
    height: 400px;
    aspect-ratio: 1;
    position: absolute;
    left: ${props => props.left};
    top: ${props => props.top};
    border-radius: 50%;
    background: linear-gradient(
        to right,
        ${props => props.theme.colors.primary},
        ${props => props.theme.colors.primaryLight}
    );
    opacity: 0.5;
    filter: blur(150px);
`;

export const ContentCtn = styled.div`
    height: 100%;
    width: 100%;
    position: relative;
    padding-bottom: 150px;
    padding-top: 100px;
`;
