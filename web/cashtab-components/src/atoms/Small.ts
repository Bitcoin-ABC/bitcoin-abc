import styled, { css } from 'styled-components';

const Small = styled('span')<{ muted?: boolean }>`
    font-size: 12px;
    font-weight: 700;
    line-height: 10px;
    ${props =>
        props.muted &&
        css`
            font-weight: 500;
            opacity: 0.55;
        `}
`;
export default Small;
