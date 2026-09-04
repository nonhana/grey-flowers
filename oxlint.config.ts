import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/defaults';
import { fileURLToPath } from 'node:url';
import { defineConfig, type DummyRuleMap } from 'oxlint';

const ADMIN_CWD = fileURLToPath(new URL('./apps/admin/', import.meta.url));

const BETTER_TAILWIND_RULES: DummyRuleMap = {
  'better-tailwindcss/enforce-canonical-classes': 'warn',
  'better-tailwindcss/enforce-consistent-class-order': 'warn',
  'better-tailwindcss/enforce-consistent-line-wrapping': 'warn',
  'better-tailwindcss/no-conflicting-classes': 'error',
  'better-tailwindcss/no-deprecated-classes': 'warn',
  'better-tailwindcss/no-duplicate-classes': 'warn',
  'better-tailwindcss/no-unknown-classes': 'error',
  'better-tailwindcss/no-unnecessary-whitespace': 'warn',
};

const COMMON_RULES: DummyRuleMap = {
  'array-callback-return': ['error', { allowImplicit: true }],
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'no-alert': 'warn',
  'no-bitwise': 'error',
  'no-console': 'warn',
  'no-constant-condition': 'warn',
  'no-debugger': 'error',
  'no-eval': 'error',
  'no-fallthrough': 'error',
  'no-implied-eval': 'error',
  'no-await-in-loop': 'error',
  'no-new-func': 'error',
  'no-param-reassign': 'error',
  'no-restricted-exports': [
    'error',
    { restrictedNamedExports: ['default', 'then'] },
  ],
  'no-throw-literal': 'error',
  'no-unused-expressions': 'error',
  'no-unused-vars': [
    'error',
    {
      args: 'all',
      argsIgnorePattern: '^_',
      ignoreRestSiblings: true,
      vars: 'all',
      varsIgnorePattern: '^_',
    },
  ],
  'no-use-before-define': [
    'error',
    { classes: true, functions: true, variables: true },
  ],
  'no-useless-catch': 'error',
  'prefer-const': 'error',
  'prefer-template': 'error',
};

const TYPESCRIPT_RULES: DummyRuleMap = {
  'typescript/ban-ts-comment': 'error',
  'typescript/consistent-type-definitions': ['error', 'interface'],
  'typescript/consistent-type-exports': 'error',
  'typescript/consistent-type-imports': 'error',
  'typescript/no-deprecated': 'error',
  'typescript/no-empty-function': 'error',
  'typescript/no-explicit-any': 'off',
  'typescript/no-floating-promises': 'error',
  'typescript/no-misused-promises': 'error',
  'typescript/no-non-null-assertion': 'error',
  'typescript/no-unnecessary-type-assertion': 'error',
  'typescript/no-unsafe-argument': 'error',
  'typescript/no-unsafe-assignment': 'error',
  'typescript/no-unsafe-call': 'error',
  'typescript/no-unsafe-member-access': 'error',
  'typescript/no-unsafe-return': 'error',
  'typescript/only-throw-error': 'error',
  'typescript/require-await': 'error',
};

const REACT_RULES: DummyRuleMap = {
  'react/exhaustive-deps': 'warn',
  'react/iframe-missing-sandbox': 'error',
  'react/jsx-key': 'error',
  'react/jsx-no-target-blank': 'error',
  'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
  'react/no-array-index-key': 'warn',
  'react/no-danger-with-children': 'error',
  'react/no-direct-mutation-state': 'error',
  'react/no-find-dom-node': 'error',
  'react/no-render-return-value': 'error',
  'react/no-unsafe': 'warn',
  'react/no-unstable-nested-components': 'error',
  // ---------- React Compiler ---------- //
  'react/capitalized-calls': 'warn',
  'react/error-boundaries': 'warn',
  'react/exhaustive-effect-dependencies': 'warn',
  'react/globals': 'warn',
  'react/hooks': 'warn',
  'react/immutability': 'warn',
  'react/incompatible-library': 'warn',
  'react/invariant': 'warn',
  'react/memo-dependencies': 'warn',
  'react/no-deriving-state-in-effects': 'warn',
  'react/preserve-manual-memoization': 'warn',
  'react/purity': 'warn',
  'react/refs': 'warn',
  'react/rule-suppression': 'warn',
  'react/set-state-in-effect': 'warn',
  'react/set-state-in-render': 'warn',
  'react/static-components': 'warn',
  'react/syntax': 'warn',
  'react/todo': 'warn',
  'react/unsupported-syntax': 'warn',
  'react/use-memo': 'warn',
  'react/void-use-memo': 'warn',
  'react/rules-of-hooks': 'error',
  'react/self-closing-comp': ['error', { component: true, html: true }],
};

const JSX_A11Y_RULES: DummyRuleMap = {
  'jsx-a11y/alt-text': 'error',
  'jsx-a11y/anchor-has-content': 'error',
  'jsx-a11y/aria-props': 'error',
  'jsx-a11y/aria-proptypes': 'error',
  'jsx-a11y/aria-role': 'error',
  'jsx-a11y/control-has-associated-label': 'error',
  'jsx-a11y/heading-has-content': 'error',
  'jsx-a11y/html-has-lang': 'error',
  'jsx-a11y/iframe-has-title': 'error',
  'jsx-a11y/img-redundant-alt': 'error',
  'jsx-a11y/label-has-associated-control': [
    'error',
    { assert: 'either', depth: 25 },
  ],
  'jsx-a11y/no-autofocus': 'error',
  'jsx-a11y/no-distracting-elements': 'error',
  'jsx-a11y/no-redundant-roles': 'error',
  'jsx-a11y/role-has-required-aria-props': 'error',
  'jsx-a11y/role-supports-aria-props': 'error',
  'jsx-a11y/tabindex-no-positive': 'error',
};

export default defineConfig({
  categories: { correctness: 'off' },
  env: { builtin: true },
  options: {
    reportUnusedDisableDirectives: 'warn',
    typeAware: true,
  },
  jsPlugins: [
    {
      name: 'better-tailwindcss',
      specifier: 'eslint-plugin-better-tailwindcss',
    },
  ],
  settings: {
    'better-tailwindcss': {
      cwd: ADMIN_CWD,
      entryPoint: 'src/styles/index.css',
      rootFontSize: 16,
      selectors: getDefaultSelectors(),
      strictness: 'loose',
    },
  },
  plugins: [
    'eslint',
    'typescript',
    'unicorn',
    'oxc',
    'react',
    'import',
    'jsx-a11y',
    'node',
  ],
  rules: COMMON_RULES,
  overrides: [
    {
      files: ['**/*.{ts,mts,tsx}'],
      rules: TYPESCRIPT_RULES,
    },
    {
      files: ['**/*.tsx'],
      env: { browser: true },
      rules: {
        ...BETTER_TAILWIND_RULES,
        ...REACT_RULES,
        ...JSX_A11Y_RULES,
      },
    },
    {
      files: ['./*.{ts,mts}', '**/scripts/*.{ts,mts}'],
      env: { node: true },
      rules: {
        'no-console': 'off',
        'node/global-require': 'error',
        'node/no-new-require': 'error',
        'node/no-path-concat': 'error',
        'unicorn/consistent-assert': 'error',
        'unicorn/prefer-import-meta-properties': 'error',
      },
    },
    {
      files: ['apps/admin/src/**/*.{ts,tsx}', 'apps/api/src/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../../**'],
                message:
                  'Use the @/ alias for non-adjacent imports (keep ./ and ../ only).',
              },
            ],
          },
        ],
      },
    },
  ],
  ignorePatterns: [
    'apps/main/**',
    '**/dist/**',
    '**/node_modules/**',
    'apps/admin/src/routeTree.gen.ts',
    'packages/db/prisma/generated/**',
    'packages/db/prisma/migrations/**',
  ],
});
