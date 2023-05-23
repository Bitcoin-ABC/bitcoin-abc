import styled from 'styled-components';

export const StyledH3 = styled.h3`
    margin: 0;
    margin-bottom: 20px;
    font-size: 38px;
    font-weight: 600;
    line-height: 1.2;
    color: ${props => props.theme.colors.contrast};
    position: relative;

    ${props => props.theme.breakpoint.medium} {
        font-size: 28px;
    }
`;
