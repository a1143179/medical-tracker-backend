module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    },
    requireConfigFile: false
  },
  plugins: ['react'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'no-unused-vars': 'warn'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  overrides: [
    {
      files: [
        'frontend/cypress/**/*.js',
        'frontend/cypress/**/*.cy.js',
        'frontend/cypress/**/e2e/*.js',
        'frontend/cypress/**/e2e/*.cy.js',
        'frontend/cypress/support/*.js'
      ],
      env: {
        'cypress/globals': true
      },
      globals: {
        cy: 'readonly',
        Cypress: 'readonly'
      },
      plugins: ['cypress'],
      extends: ['plugin:cypress/recommended'],
      rules: {
        'cypress/no-unnecessary-waiting': 'warn'
      }
    }
  ]
}; 