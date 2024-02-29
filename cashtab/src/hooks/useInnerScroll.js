// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { useEffect } from 'react';

export const useInnerScroll = () =>
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => (document.body.style.overflow = '');
    }, []);
