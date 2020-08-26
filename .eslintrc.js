// const OFF = 0;
// const WARNING = 1;
const ERROR = 2;

module.exports = {
    extends: '@vimeo/eslint-config-player/es6',
    parserOptions: {
        ecmaVersion: 8,
        sourceType: 'module',
        allowImportExportEverywhere: true
    },
    env: {
        browser: true,
        node: true
    },
    plugins: ['compat'],
    globals: {
        XDomainRequest: false
    },
    rules: {
        'compat/compat': ERROR
    },
    settings: {
        polyfills: [
            'Promise'
        ]
    }
};
