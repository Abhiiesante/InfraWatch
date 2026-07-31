import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\/(.*)\.js$/,
        replacement: path.resolve(__dirname, './src/$1.ts'),
      },
      {
        find: /^@\/(.*)$/,
        replacement: path.resolve(__dirname, './src/$1'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
