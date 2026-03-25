import htmlPlugin from 'eslint-plugin-html';

export default [
  {
    files: ['**/*.html'],
    plugins: {
      html: htmlPlugin,
    },
    processor: 'html/html',
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        Promise: 'readonly',
        URL: 'readonly',
        indexedDB: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        Element: 'readonly',
        Node: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        HTMLInputElement: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'warn',
      'arrow-spacing': ['warn', { before: true, after: true }],
      'comma-dangle': ['warn', 'always-multiline'],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'semi': ['warn', 'always'],
      'indent': ['warn', 2],
      'no-multiple-empty-lines': ['warn', { max: 2 }],
      'eol-last': ['warn', 'always'],
    },
  },
];
