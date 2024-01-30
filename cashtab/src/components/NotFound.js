import React from 'react';
import { Row, Col } from 'antd';

const NotFound = () => (
    <Row data-testid="not-found" justify="center" type="flex">
        <Col span={8}>
            <h1>Page not found</h1>
        </Col>
    </Row>
);

export default NotFound;
