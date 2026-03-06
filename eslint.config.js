import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import tsParser from '@typescript-eslint/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // bring in Next.js recommended config and TypeScript helper via compat
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    // ensure tsconfig is discovered correctly on Windows
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // reduce noise during migration
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'prefer-const': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  {
    ignores: [
      '.next/**',
      'dist/**',
      'node_modules/**',
      '**/*.d.ts',
      'docs/**',
      '__tests__/**',
      'public/**',
      // temporary: avoid known parser crash while we migrate
      'src/hooks/useToast.tsx',
    ],
  },
];

export default eslintConfig;
