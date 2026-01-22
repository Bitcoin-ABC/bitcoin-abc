// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        nodePolyfills({
            // Globally inject Buffer polyfill - this makes Buffer available everywhere
            globals: {
                Buffer: true,
            },
            // Include buffer module for polyfill
            include: ['buffer'],
        }),
        tsconfigPaths({
            ignoreConfigErrors: true,
        }),
        react({
            // Enable JSX in .js files (for test files)
            // @vitejs/plugin-react should handle .js files by default, but ensure it does
        }),
        svgr({
            include: '**/*.svg',
            svgrOptions: {
                prettier: false,
                svgo: false,
                titleProp: true,
                ref: true,
                exportType: 'named',
                namedExport: 'ReactComponent',
            },
        }),
    ],
    resolve: {
        alias: {
            // Mock assets in tests (matching Jest's moduleNameMapper)
            // Ensure polyfill shims are resolved during dev server pre-bundling
            'vite-plugin-node-polyfills/shims/buffer': 'buffer',
        },
    },
    // Force optimizeDeps to pre-bundle local file: dependencies
    // This transforms CommonJS to ESM so they work properly
    optimizeDeps: {
        include: [
            'ecash-lib',
            'ecash-wallet',
            'ecash-agora',
            'b58-ts',
            'chronik-client',
            'ecashaddrjs',
            // Include buffer so the polyfill shim can resolve
            'buffer',
        ],
        esbuildOptions: {
            // Ensure proper CommonJS interop
            format: 'esm',
        },
    },
    build: {
        target: ['chrome87', 'firefox78', 'safari14', 'edge88'],
        outDir: 'build',
        sourcemap: process.env.GENERATE_SOURCEMAP !== 'false',
        chunkSizeWarningLimit: 1000,
        // Ensure assets are copied correctly
        assetsDir: 'assets',
        commonjsOptions: {
            // Transform all CommonJS modules, especially from local file: dependencies
            include: [
                /node_modules\/.*/,
                /.*[/\\]modules[/\\].*/,
                /.*[/\\]ecash-lib[/\\].*/,
                /.*[/\\]ecash-wallet[/\\].*/,
                /.*[/\\]ecash-agora[/\\].*/,
                /.*[/\\]b58-ts[/\\].*/,
                /.*[/\\]chronik-client[/\\].*/,
                /.*[/\\]ecashaddrjs[/\\].*/,
            ],
            transformMixedEsModules: true,
            strictRequires: false,
            defaultIsModuleExports: 'auto',
            esmExternals: false,
            requireReturnsDefault: 'auto',
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                },
            },
        },
        cssCodeSplit: true,
        minify: 'terser',
        terserOptions: {
            compress: {
                // All console logs in the code appear in dev and prod
                drop_console: false,
                drop_debugger: process.env.NODE_ENV === 'production',
                ecma: 5,
                comparisons: false,
                inline: 2,
            },
            mangle: {
                safari10: true,
                reserved: ['BigInteger'],
            },
            output: {
                ecma: 5,
                comments: false,
                ascii_only: true,
            },
        },
    },
    css: {
        // Disable CSS source maps to reduce memory usage
        devSourcemap: false,
    },
    define: {
        global: 'globalThis',
    },
    server: {
        port: 3000,
        fs: {
            // Allow serving files from monorepo root (needed for file: deps)
            allow: ['..'],
        },
    },
});
