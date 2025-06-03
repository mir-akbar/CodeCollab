/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    exclude: [
      '**/node_modules/**',
      '**/api/**',
      '**/tests/debug/**',
      '**/tests/integration/**',
      '**/tests/components/**',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'api/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
        'vite.config.js',
        'tailwind.config.js',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
