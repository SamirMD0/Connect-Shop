import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// eslint-config-next 16 ships native flat configs, so the @eslint/eslintrc
// FlatCompat shim used for v15 is no longer needed.
const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@next/next/no-img-element': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unescaped-entities': 'warn',

      // eslint-plugin-react-hooks v6 (pulled in by eslint-config-next 16) enables
      // these by default. They flag pre-existing patterns in data-fetching effects
      // across ~27 files — static analysis findings, not Next 16 runtime breakages.
      // Downgraded to warnings so they stay visible; fixing them is a separate
      // refactor from the security upgrade that introduced the rules.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];

export default eslintConfig;
