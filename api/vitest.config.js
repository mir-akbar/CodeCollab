import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    globals: true,
    
    // Global setup and teardown
    globalSetup: ['./tests/setup/globalSetup.js'],
    setupFiles: ['./tests/setup/testSetup.js'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'tests/**',
        'coverage/**',
        '**/*.config.js',
        '**/*.config.ts',
        'scripts/**',
        'dist/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Test execution settings
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    
    // Test patterns
    include: [
      'tests/**/*.{test,spec}.{js,mjs,ts}',
      '**/__tests__/**/*.{js,mjs,ts}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**'
    ],
    
    // Reporters
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './test-results/index.html'
    },
    
    // Pool options for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    },
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    
    // Watch mode settings
    watch: false
  },
  
  resolve: {
    alias: {
      '@': resolve(process.cwd()),
      '@models': resolve(process.cwd(), './models'),
      '@controllers': resolve(process.cwd(), './controllers'),
      '@middleware': resolve(process.cwd(), './middleware'),
      '@utils': resolve(process.cwd(), './utils'),
      '@config': resolve(process.cwd(), './config'),
      '@tests': resolve(process.cwd(), './tests')
    }
  },
  
  // Define environment variables for tests
  define: {
    'process.env.NODE_ENV': '"test"'
  }
});
