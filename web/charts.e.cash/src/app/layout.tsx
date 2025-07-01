// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'eCash (XEC) Charts & Analytics - Real-time Network Data',
    description:
        'Live eCash (XEC) network analytics, transaction charts, and blockchain data. From the bitcoin genesis block thru right now. Track eCash network activity, transaction volume, and market metrics in real-time.',
    icons: {
        icon: '/favicon.png',
    },
    openGraph: {
        title: 'eCash (XEC) Charts & Analytics - Real-time Network Data',
        description:
            'Live eCash (XEC) network analytics, transaction charts, and blockchain data. From the bitcoin genesis block thru right now. Track eCash network activity, transaction volume, and market metrics in real-time.',
        url: 'https://charts.e.cash',
        siteName: 'eCash Charts',
        images: [
            {
                url: '/ecash-charts-social-card.png',
                width: 1200,
                height: 630,
                alt: 'eCash (XEC) Charts & Analytics Dashboard',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'eCash (XEC) Charts & Analytics - Real-time Network Data',
        description:
            'Live eCash (XEC) network analytics, transaction charts, and blockchain data. From the bitcoin genesis block thru right now.',
        images: ['/ecash-charts-social-card.png'],
        creator: '@eCash',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <div className="min-h-screen bg-gray-50">{children}</div>
                {process.env.NEXT_PUBLIC_GA_ID && (
                    <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
                )}
            </body>
        </html>
    );
}
