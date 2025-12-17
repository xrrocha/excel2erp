import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Complexity metrics
      'complexity': ['warn', { max: 10 }],
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['warn', 3],
      'max-params': ['warn', 4],

      // SonarJS cognitive complexity (often more meaningful than cyclomatic)
      'sonarjs/cognitive-complexity': ['warn', 15],

      // Relax some strict rules for this project
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Relaxed rules for test files
    files: ['tests/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'sonarjs/no-duplicate-string': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '*.js'],
  }
);
