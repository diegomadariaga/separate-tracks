/* eslint-disable */
module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
    browser: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: false,
    ecmaFeatures: { jsx: true }
  },
  plugins: ['@typescript-eslint','react','react-hooks','import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier'
  ],
  settings: {
    react: { version: 'detect' }
  },
  rules: {
    'react/react-in-jsx-scope': 'off'
  },
  ignorePatterns: ['dist','build','node_modules']
};
