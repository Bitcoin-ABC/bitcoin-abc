// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { Row, Col } from 'antd';

const NotFound = () => (
    <Row justify="center" type="flex">
        <Col span={8}>
            <h1>Page not found</h1>
        </Col>
    </Row>
);

export default NotFound;
