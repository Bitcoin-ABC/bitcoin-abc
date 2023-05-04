import styled from 'styled-components';

export const StyledH3 = styled.h3`
    margin: 0;
    font-size: 20px;
    font-weight: 400;
    color: ${props => props.theme.colors.primaryLight};
    line-height: 1em;
    margin-bottom: 10px;
    position: relative;
`;

export const StyledH2 = styled.h2`
    margin: 0;
    font-size: 55px;
    font-weight: 700;
    line-height: 1em;
    position: relative;
    margin-bottom: 70px;
    display: inline-block;
`;

export const H2Image = styled.div`
    width: 380px;
    height: 60px;
    position: absolute;
    top: 40px;
    left: 0;
    ${props => props.theme.filters.grayscale};
`;
