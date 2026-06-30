import nextTs from 'eslint-config-next/typescript';
import nextVitals from 'eslint-config-next/core-web-vitals';
import importPlugin from 'eslint-plugin-import';
import { defineConfig, globalIgnores } from 'eslint/config';

const syntaxRules = [
  {
    selector: 'JSXOpeningElement[name.name="head"]',
    message:
      '禁止使用 head 标签，优先使用 metadata。三方 CSS、字体等资源可以在 globals.css 中顶部通过 @import 引入或者使用 next/font；preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入；json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld',
  },
];

const nextConfigRestrictedSyntaxRules = [
  {
    selector:
      'Property[key.name=/^(root|outputFileTracingRoot)$/] > Literal[value=/^\\//]',
    message:
      '禁止在 next.config 中写死绝对路径，请改用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。',
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'no-restricted-syntax': ['error', ...syntaxRules],
    },
  },
  {
    files: ['next.config.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...nextConfigRestrictedSyntaxRules],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Build artifacts:
    'server.js',
    'dist/**',
    // CommonJS / test scripts (use require() legitimately):
    'scripts/**',
    'tests/**',
    '*.cjs',
    // Root-level junk/binaries:
    'courses_route.ts',
    'workers_route.ts',
    'debug_pg.js',
    'test-pg.js',
    // WeChat Mini Program (separate runtime):
    'wechat-miniprogram/**',
    // Non-source directories:
    'reports/**',
    'docs/**',
    'assets/**',
    'drizzle/**',
    'miniprogram/**',
  ]),
]);

export default eslintConfig;
