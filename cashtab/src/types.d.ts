// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

declare module '*.png';
declare module '*.webp';
declare module '*.svg' {
    const content: string;
    export default content;
    export const ReactComponent: React.ComponentType<
        React.SVGProps<SVGSVGElement> & { title?: string }
    >;
}
