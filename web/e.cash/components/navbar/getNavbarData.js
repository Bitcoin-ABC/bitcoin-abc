// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import React, { createContext, useState, useContext, useEffect } from 'react';

const ApiDataContext = createContext();

export const ApiDataProvider = ({ children }) => {
    const [priceLinkText, setPriceLinkText] = useState('Buy XEC');

    const getPrice = () => {
        const api = 'https://avalanche.cash/api/pricebydate/XEC';
        fetch(api)
            .then(response => response.json())
            .then(data =>
                setPriceLinkText(
                    `1 XEC = $${parseFloat(data.Price_in_USD).toFixed(6)}`,
                ),
            )
            .catch(err => console.log(err));
    };

    useEffect(() => {
        getPrice();
    }, []);

    return (
        <ApiDataContext.Provider value={{ priceLinkText }}>
            {children}
        </ApiDataContext.Provider>
    );
};

export const useApiData = () => useContext(ApiDataContext);
