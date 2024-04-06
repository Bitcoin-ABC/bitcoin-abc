// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import React, { createContext, useState, useContext, useEffect } from 'react';

const ApiDataContext = createContext();

export const ApiDataProvider = ({ children }) => {
    const [priceLinkText, setPriceLinkText] = useState('Buy XEC');
    const [blockHeight, setBlockHeight] = useState(0);

    const getPrice = () => {
        const api =
            'https://api.coingecko.com/api/v3/simple/price?ids=ecash&vs_currencies=usd';
        fetch(api)
            .then(response => response.json())
            .then(data =>
                setPriceLinkText(`1 XEC = $${data.ecash.usd.toFixed(6)}`),
            )
            .catch(err => console.log(err));
    };

    const getBlockHeight = () => {
        const api = 'https://api.blockchair.com/ecash/stats';
        fetch(api)
            .then(response => response.json())
            .then(data => setBlockHeight(data.data.best_block_height))
            .catch(err => console.log(err));
    };

    useEffect(() => {
        getPrice();
        getBlockHeight();
    }, []);

    return (
        <ApiDataContext.Provider value={{ priceLinkText, blockHeight }}>
            {children}
        </ApiDataContext.Provider>
    );
};

export const useApiData = () => useContext(ApiDataContext);
