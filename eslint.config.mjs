import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import policies from './eslint-rules/index.mjs';

// The code policies are errors.
const STYLE = 'error';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

  {
    name: 'dealhound/code-style',
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts'],
    plugins: { dealhound: policies },
    rules: {
      // 1 and 6: arrow functions with a block body and an explicit return, assigned to a const.
      'arrow-body-style': [STYLE, 'always'],
      'func-style': [STYLE, 'expression'],
      'prefer-arrow-callback': STYLE,
      // Every if/else/for/while has braces, even for one statement.
      curly: [STYLE, 'all'],

      // 4: blank lines separate blocks of logic.
      'padding-line-between-statements': [
        STYLE,
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'do', 'switch', 'try', 'throw', 'block-like'] },
        { blankLine: 'always', prev: ['if', 'for', 'while', 'do', 'switch', 'try', 'block-like'], next: '*' },
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
      ],

      // 3: one useState per component, holding an object.
      'dealhound/max-use-state': [STYLE, { max: 2 }],

      'no-restricted-syntax': [
        STYLE,
        {
          // 2: components take `props` and destructure inside the body.
          selector: 'VariableDeclarator[id.name=/^[A-Z]/] > ArrowFunctionExpression > ObjectPattern.params',
          message: 'Take `props` as the parameter and destructure it in the body.',
        },
        {
          selector: 'FunctionDeclaration[id.name=/^[A-Z]/] > ObjectPattern.params',
          message: 'Take `props` as the parameter and destructure it in the body.',
        },
        {
          // 2b: the props type has a name (`PriceTagProps`), declared above the component.
          selector:
            'VariableDeclarator[id.name=/^[A-Z]/] > ArrowFunctionExpression > Identifier.params > TSTypeAnnotation > TSTypeLiteral',
          message: 'Give the props type a name (interface XProps) instead of an inline type.',
        },
        {
          // 10: imports are absolute (@/..., @tests/...); only a component's own stylesheet stays relative.
          selector:
            ':matches(ImportDeclaration, ExportAllDeclaration, ExportNamedDeclaration, ImportExpression)[source.value=/^\\./]:not([source.value=/\\.css$/])',
          message: 'Use an absolute import (@/..., @tests/...), not a relative one.',
        },
        {
          // 9: a function passed as a prop has a name (onSearchSubmit), declared above the return.
          selector: 'JSXAttribute > JSXExpressionContainer > :matches(ArrowFunctionExpression, FunctionExpression)',
          message: 'Name this handler (const onSearchSubmit = () => {...}) and pass it by name.',
        },
        {
          // 7: styles live in CSS files (with @apply); a className holds names, not a pile of utilities.
          selector: 'JSXAttribute[name.name="className"] Literal[value=/^\\s*\\S+(\\s+\\S+){3,}\\s*$/]',
          message: 'Move these utility classes into a CSS file with @apply and use a class name here.',
        },
        {
          selector: 'JSXAttribute[name.name="className"] TemplateElement[value.raw=/\\S+\\s+\\S+\\s+\\S+\\s+\\S+/]',
          message: 'Move these utility classes into a CSS file with @apply and use a class name here.',
        },
      ],
    },
  },

  {
    name: 'dealhound/destructure',
    files: ['src/**/*.{ts,tsx}'],
    plugins: { dealhound: policies },
    rules: {
      // 11: read an object's properties once, by destructuring.
      'dealhound/destructure-repeated-reads': STYLE,
    },
  },

  {
    name: 'dealhound/file-size',
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'max-lines': [STYLE, { max: 250, skipBlankLines: true, skipComments: true }],
    },
  },

  // Architecture: the domain is plain TypeScript and knows nothing about the app, the framework or the database.
  {
    name: 'dealhound/boundary-domain',
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/*', '@/app/*', '@/components/*', '@/lib/*'],
              message: 'The domain must not depend on the app.',
            },
            {
              group: ['react', 'react-dom', 'next', 'next/*', '@supabase/*'],
              message: 'The domain must stay plain TypeScript.',
            },
          ],
        },
      ],
    },
  },

  // Shared helpers do not reach into the server layer or the pages.
  {
    name: 'dealhound/boundary-lib',
    files: ['src/lib/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/*', '@/app/*', '@/components/*'],
              message: 'src/lib must not depend on the server layer or the pages.',
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
