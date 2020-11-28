import styled from 'styled-components';
import { Collapse } from 'antd';

export const StyledCollapse = styled(Collapse)`
    background: #fbfcfd !important;
    border: 1px solid #eaedf3 !important;

    .ant-collapse-content {
        border: 1px solid #eaedf3;
        border-top: none;
    }

    .ant-collapse-item {
        border-bottom: none !important;
    }

    * {
        color: rgb(62, 63, 66) !important;
    }
`;
