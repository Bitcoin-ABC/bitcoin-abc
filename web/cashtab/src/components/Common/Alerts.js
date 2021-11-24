import React from 'react';
import { Alert } from 'antd';

const TokenIconAlert = () => {
    return (
        <>
            <div>
                <Alert
                    style={{ marginBottom: '12px' }}
                    description="If you would like to request an icon for an eToken that has already been created, please email icons@e.cash."
                    type="warning"
                    showIcon
                />
            </div>
        </>
    );
};

export default TokenIconAlert;
