const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['js/vendor/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        gsap: 'readonly',
        particlesJS: 'readonly',
        emailjs: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      strict: ['error', 'function'],
    },
  },
  {
    files: ['eslint.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
];
