import styled from 'styled-components';

export const TextBlock = styled.div`
    width: 100%;
    margin-bottom: 150px;
    position: relative;

    ${props => props.theme.breakpoint.medium} {
        margin-bottom: 90px;
    }
`;
