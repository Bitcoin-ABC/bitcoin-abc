import styled from 'styled-components';
import { Collapse } from 'antd';

export const StyledCollapse = styled(Collapse)`
    background: ${props => props.theme.collapses.background} !important;
    border: 1px solid ${props => props.theme.collapses.border} !important;

    .ant-collapse-content {
        border: 1px solid ${props => props.theme.collapses.border};
        border-top: none;
    }

    .ant-collapse-item {
        border-bottom: none !important;
    }

    * {
        color: ${props => props.theme.collapses.color} !important;
    }
`;
