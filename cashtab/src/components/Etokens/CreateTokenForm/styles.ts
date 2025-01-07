// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import styled from 'styled-components';

export const Form = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;
export const SwitchRow = styled.div`
    display: flex;
    flex-direction: row;
    gap: 12px;
    align-items: center;
`;
export const SwitchLabel = styled.div`
    text-align: left;
    color: ${props => props.theme.primaryText};
    font-size: 18px;
`;
export const EditIcon = styled.div`
    cursor: pointer;
    color: ${props => props.theme.primaryText};
    &:hover {
        color: ${props => props.theme.accent};
    }
    word-wrap: break-word;
`;
export const IconModalForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    justify-content: center;
`;
export const IconModalRow = styled.div`
    display: flex;
    width: 100%;
    gap: 3px;
`;
export const SliderLabel = styled.div`
    color: ${props => props.theme.primaryText};
`;
export const SliderBox = styled.div`
    width: 100%;
`;
export const CropperContainer = styled.div`
    height: 200px;
    position: relative;
`;
export const CreateTokenTitle = styled.h3`
    color: ${props => props.theme.primaryText};
`;
export const TokenCreationSummaryTable = styled.div`
    color: ${props => props.theme.primaryText};
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    gap: 3px;
`;
export const SummaryRow = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-start;
    align-items: start;
    width: 100%;
`;
export const TokenParam = styled.div`
    word-break: break-word;
`;
export const ButtonDisabledMsg = styled.div`
    font-size: 14px;
    color: ${props => props.theme.formError};
    word-break: break-all;
`;
export const TokenTypeDescription = styled.div`
    display: flex;
    gap: 12px;
    flex-direction: row;
    flex-wrap: wrap;
`;
export const TokenInfoParagraph = styled.div`
    display: flex;
    width: 100%;
    text-align: justify;
    padding: 0 6px;
    color: ${props => props.theme.primaryText};
`;
export const OuterCtn = styled.div`
    background-color: ${props => props.theme.primaryBackground};
    padding: 20px;
    border-radius: 10px;
`;
