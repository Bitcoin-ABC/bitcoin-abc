import styled from 'styled-components';

export const LoadingCtn = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 400px;
    flex-direction: column;

    svg {
        width: 50px;
        height: 50px;
        fill: ${props => props.theme.primary};
    }
`;

export const BalanceHeaderWrap = styled.div`
    color: ${props => props.theme.wallet.text.primary};
    width: 100%;
    font-size: 30px;
    font-weight: bold;
    @media (max-width: 768px) {
        font-size: 23px;
    }
`;

export const BalanceHeaderFiatWrap = styled.div`
    color: ${props => props.theme.wallet.text.secondary};
    width: 100%;
    font-size: 18px;
    margin-bottom: 20px;
    font-weight: bold;
    @media (max-width: 768px) {
        font-size: 16px;
    }
`;

export const ZeroBalanceHeader = styled.div`
    color: ${props => props.theme.wallet.text.primary};
    width: 100%;
    font-size: 14px;
    margin-bottom: 5px;
`;

export const TokenParamLabel = styled.span`
    font-weight: bold;
`;

export const AlertMsg = styled.p`
    color: ${props => props.theme.forms.error} !important;
`;

export const ConvertAmount = styled.div`
    color: ${props => props.theme.wallet.text.secondary};
    width: 100%;
    font-size: 14px;
    margin-bottom: 10px;
    font-weight: bold;
    @media (max-width: 768px) {
        font-size: 12px;
    }
`;
