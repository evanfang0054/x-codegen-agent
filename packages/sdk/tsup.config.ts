import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: [
    '@x-codegen/types',
    '@x-codegen/models',
    '@x-codegen/config',
    '@x-codegen/sandbox',
    '@x-codegen/tools',
    '@x-codegen/agents',
    '@x-codegen/workflow',
  ],
});
