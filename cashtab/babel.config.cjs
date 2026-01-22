// Copyright (c) 2024-2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

module.exports = {
    // Needed for jest tests
    presets: ['react-app'],
    plugins: [
        // Transform import.meta.env to process.env for Jest
        function () {
            return {
                visitor: {
                    MemberExpression(path) {
                        const { node } = path;
                        
                        // Check if this is import.meta.env or import.meta.env.*
                        function isImportMetaEnv(node) {
                            if (node.type === 'MemberExpression') {
                                // Check for import.meta.env.VITE_*
                                if (
                                    node.object.type === 'MemberExpression' &&
                                    node.object.property?.name === 'env' &&
                                    node.object.object?.type === 'MetaProperty' &&
                                    node.object.object.meta?.name === 'import' &&
                                    node.object.object.property?.name === 'meta'
                                ) {
                                    return true;
                                }
                                // Check for import.meta.env (just the env part)
                                if (
                                    node.object.type === 'MetaProperty' &&
                                    node.object.meta?.name === 'import' &&
                                    node.object.property?.name === 'meta' &&
                                    node.property?.name === 'env'
                                ) {
                                    return true;
                                }
                            }
                            return false;
                        }
                        
                        if (isImportMetaEnv(node)) {
                            if (node.property && node.property.name) {
                                // import.meta.env.VITE_* -> process.env.VITE_*
                                const propName = node.property.name;
                                path.replaceWithSourceString(`process.env.${propName}`);
                            } else {
                                // import.meta.env -> process.env
                                path.replaceWithSourceString('process.env');
                            }
                        }
                    },
                },
            };
        },
    ],
};
