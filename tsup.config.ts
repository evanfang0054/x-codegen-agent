import { defineConfig } from 'tsup';

const PATH_ALIASES: Record<string, string> = {
  '@': './src',
  '@models': './src/models',
  '@config': './src/config',
  '@types': './src/types',
  '@agents': './src/agents',
  '@tools': './src/tools',
  '@utils': './src/utils',
  '@workflow': './src/workflow',
};

export default defineConfig([
  // SDK 入口
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: false,
    target: 'es2022',
    outDir: 'dist',
    alias: PATH_ALIASES,
  },
  // CLI 入口（保留目录结构）
  {
    entry: { 'cli/index': 'src/cli/index.ts' },
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    minify: false,
    target: 'es2022',
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
    alias: PATH_ALIASES,
  },
]);
