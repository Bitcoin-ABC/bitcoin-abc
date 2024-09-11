// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import { ChronikClient } from 'chronik-client';
import CodeBlock from '@theme/CodeBlock';

const chronik = new ChronikClient(['https://chronik-native1.fabien.cash']);

const Json = props => {
    const [result, setResult] = useState(undefined);
    const [error, setError] = useState(undefined);
    useEffect(() => {
        props
            .fn()
            .then(result => {
                setResult(result);
                setError(undefined);
            })
            .catch(err => {
                setResult(undefined);
                setError(err);
            });
    }, []);

    if (error !== undefined) {
        return <div className="error">{`${error}`}</div>;
    }

    const resultJson = JSON.stringify(result, undefined, 2);
    return <CodeBlock language="json">{resultJson}</CodeBlock>;
};

// Add react-live imports you need here
const ReactLiveScope = {
    React,
    ...React,
    ChronikClient,
    Json,
    chronik,
};
export default ReactLiveScope;
