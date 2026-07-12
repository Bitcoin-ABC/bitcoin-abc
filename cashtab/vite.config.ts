// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin, loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname, join } from 'path';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);

// Resolve shim paths once at config load time
const pluginPath = dirname(
    dirname(require.resolve('vite-plugin-node-polyfills')),
);
const bufferShimPath = resolve(pluginPath, 'shims/buffer/dist/index.js');
const processShimPath = resolve(pluginPath, 'shims/process/dist/index.js');

// Custom plugin to resolve shim imports for CommonJS resolver
function shimResolver(): Plugin {
    return {
        name: 'shim-resolver',
        resolveId(id) {
            if (id === 'vite-plugin-node-polyfills/shims/buffer') {
                return bufferShimPath;
            }
            if (id === 'vite-plugin-node-polyfills/shims/process') {
                return processShimPath;
            }
            return null;
        },
    };
}

function firebaseServiceWorkerEnv(mode: string): Plugin {
    const replacements: Record<string, string> = {
        __VITE_FIREBASE_API_KEY__: 'VITE_FIREBASE_API_KEY',
        __VITE_FIREBASE_AUTH_DOMAIN__: 'VITE_FIREBASE_AUTH_DOMAIN',
        __VITE_FIREBASE_PROJECT_ID__: 'VITE_FIREBASE_PROJECT_ID',
        __VITE_FIREBASE_MESSAGING_SENDER_ID__:
            'VITE_FIREBASE_MESSAGING_SENDER_ID',
        __VITE_FIREBASE_APP_ID__: 'VITE_FIREBASE_APP_ID',
        __VITE_TOKEN_ICONS_URL__: 'VITE_TOKEN_ICONS_URL',
    };

    const envDefaults: Record<string, string> = {
        VITE_TOKEN_ICONS_URL: 'https://icons.etokens.cash',
    };

    const injectEnv = (source: string): string => {
        const env = loadEnv(mode, process.cwd(), '');
        let output = source;
        for (const [placeholder, envKey] of Object.entries(replacements)) {
            output = output
                .split(placeholder)
                .join(env[envKey] ?? envDefaults[envKey] ?? '');
        }
        return output;
    };

    return {
        name: 'firebase-service-worker-env',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url !== '/firebase-messaging-sw.js') {
                    next();
                    return;
                }
                const filePath = join(
                    process.cwd(),
                    'public/firebase-messaging-sw.js',
                );
                const source = fs.readFileSync(filePath, 'utf8');
                res.setHeader('Content-Type', 'application/javascript');
                res.end(injectEnv(source));
            });
        },
        generateBundle() {
            const filePath = join(
                process.cwd(),
                'public/firebase-messaging-sw.js',
            );
            const source = fs.readFileSync(filePath, 'utf8');
            this.emitFile({
                type: 'asset',
                fileName: 'firebase-messaging-sw.js',
                source: injectEnv(source),
            });
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [
        // Resolve shims before other plugins (must be first)
        shimResolver(),
        nodePolyfills({
            // Globally inject Buffer and process polyfills
            globals: {
                Buffer: true,
                process: true, // Required for react-router v7 which imports the process shim
            },
            // Include buffer and process modules for polyfill
            include: ['buffer', 'process'],
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
        firebaseServiceWorkerEnv(mode),
    ],
    resolve: {
        alias: {
            // Mock assets in tests (matching Jest's moduleNameMapper)
            // Explicitly resolve shims - needed for Docker builds where Rollup can't resolve package.json exports
            // Resolve the shim paths by finding the plugin's main entry (dist/index.cjs) and going up to package root
            'vite-plugin-node-polyfills/shims/buffer': resolve(
                dirname(dirname(require.resolve('vite-plugin-node-polyfills'))),
                'shims/buffer/dist/index.js',
            ),
            'vite-plugin-node-polyfills/shims/process': resolve(
                dirname(dirname(require.resolve('vite-plugin-node-polyfills'))),
                'shims/process/dist/index.js',
            ),
        },
    },
    // Force optimizeDeps to pre-bundle local file: dependencies
    // This transforms CommonJS to ESM so they work properly
    optimizeDeps: {
        include: [
            'ecash-lib',
            'ecash-parse',
            'ecash-wallet',
            'ecash-agora',
            'b58-ts',
            'chronik-client',
            'ecashaddrjs',
            // Include buffer and process so the polyfill shims can resolve
            'buffer',
            'process',
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
                /.*[/\\]ecash-parse[/\\].*/,
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
            format: {
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
}));
