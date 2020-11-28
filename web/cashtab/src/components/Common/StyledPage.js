import styled from 'styled-components';

const StyledPage = styled.div`
    .ant-card {
        background: #ffffff;
        box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.04);
        overflow: hidden;

        &:hover {
            box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.1);
        }

        * {
            color: rgb(62, 63, 66);
        }

        .ant-card-head {
            color: #6e6e6e !important;
            background: #fbfcfd;
            border-bottom: 1px solid #eaedf3;
        }

        .ant-alert {
            background: #fbfcfd;
            border: 1px solid #eaedf3;
        }
    }
    .ant-card-body {
        border: none;
    }
    .ant-collapse {
        background: #fbfcfd;
        border: 1px solid #eaedf3;

        .ant-collapse-content {
            border: 1px solid #eaedf3;
            border-top: none;
        }

        .ant-collapse-item {
            border-bottom: 1px solid #eaedf3;
        }

        * {
            color: rgb(62, 63, 66) !important;
        }
    }
`;

export default StyledPage;
