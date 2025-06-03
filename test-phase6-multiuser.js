/**
 * Phase 6 Multi-User Testing Automation Script
 * 
 * This script automates multi-user testing scenarios for the TanStack Query + YJS system
 * by simulating multiple concurrent connections and operations.
 */

import puppeteer from 'puppeteer';
import { io } from 'socket.io-client';
import process from 'process';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:5000';

class MultiUserTestSuite {
  constructor() {
    this.browsers = [];
    this.pages = [];
    this.sockets = [];
    this.testResults = {
      concurrentAccess: false,
      realTimeSync: false,
      fileOperations: false,
      networkResilience: false,
      performance: {}
    };
  }

  async setupTest(userCount = 3) {
    console.log(`🚀 Setting up ${userCount} concurrent users for testing...`);

    try {
      // Launch browsers for each user
      for (let i = 0; i < userCount; i++) {
        const browser = await puppeteer.launch({
          headless: false,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        
        this.browsers.push(browser);
        this.pages.push(page);
        
        console.log(`✅ User ${i + 1} browser ready`);
      }

      return true;
    } catch (error) {
      console.error('❌ Setup failed:', error);
      return false;
    }
  }

  async testConcurrentSessionAccess() {
    console.log('\n📋 Testing Concurrent Session Access...');

    try {
      // Navigate all users to debug page
      await Promise.all(this.pages.map(page => 
        page.goto(`${CLIENT_URL}/debug`)
      ));

      // Wait for page load
      await Promise.all(this.pages.map(page => 
        page.waitForSelector('[data-testid="debug-interface"]', { timeout: 10000 })
      ));

      // Create session from first user
      const sessionId = await this.pages[0].evaluate(() => {
        const createBtn = document.querySelector('[data-testid="create-session-btn"]');
        if (createBtn) createBtn.click();
        
        return new Promise((resolve) => {
          setTimeout(() => {
            const sessionIdElement = document.querySelector('[data-testid="current-session-id"]');
            resolve(sessionIdElement ? sessionIdElement.textContent : null);
          }, 2000);
        });
      });

      if (!sessionId) {
        throw new Error('Failed to create session');
      }

      console.log(`📝 Created session: ${sessionId}`);

      // Join session from other users
      for (let i = 1; i < this.pages.length; i++) {
        await this.pages[i].evaluate((sessionId) => {
          const sessionInput = document.querySelector('[data-testid="session-id-input"]');
          const joinBtn = document.querySelector('[data-testid="join-session-btn"]');
          
          if (sessionInput && joinBtn) {
            sessionInput.value = sessionId;
            joinBtn.click();
          }
        }, sessionId);

        await this.pages[i].waitForTimeout(1000);
      }

      // Verify all users see the same session
      const sessionData = await Promise.all(this.pages.map(page =>
        page.evaluate(() => {
          const sessionElement = document.querySelector('[data-testid="session-data"]');
          return sessionElement ? sessionElement.textContent : null;
        })
      ));

      const allMatch = sessionData.every(data => data === sessionData[0]);
      this.testResults.concurrentAccess = allMatch;

      console.log(`${allMatch ? '✅' : '❌'} Concurrent access test: ${allMatch ? 'PASSED' : 'FAILED'}`);
      return allMatch;

    } catch (error) {
      console.error('❌ Concurrent access test failed:', error);
      return false;
    }
  }

  async testRealTimeSync() {
    console.log('\n🔄 Testing Real-Time Synchronization...');

    try {
      // Get initial user counts from all pages
      const initialCounts = await Promise.all(this.pages.map(page =>
        page.evaluate(() => {
          const countElement = document.querySelector('[data-testid="user-count"]');
          return countElement ? parseInt(countElement.textContent) : 0;
        })
      ));

      console.log('Initial user counts:', initialCounts);

      // Simulate user activity from first page
      await this.pages[0].evaluate(() => {
        const testBtn = document.querySelector('[data-testid="test-realtime-btn"]');
        if (testBtn) testBtn.click();
      });

      // Wait for propagation
      await Promise.all(this.pages.map(page => page.waitForTimeout(2000)));

      // Check if changes propagated to other users
      const updatedCounts = await Promise.all(this.pages.map(page =>
        page.evaluate(() => {
          const countElement = document.querySelector('[data-testid="user-count"]');
          return countElement ? parseInt(countElement.textContent) : 0;
        })
      ));

      console.log('Updated user counts:', updatedCounts);

      const syncWorking = updatedCounts.every(count => count === updatedCounts[0]);
      this.testResults.realTimeSync = syncWorking;

      console.log(`${syncWorking ? '✅' : '❌'} Real-time sync test: ${syncWorking ? 'PASSED' : 'FAILED'}`);
      return syncWorking;

    } catch (error) {
      console.error('❌ Real-time sync test failed:', error);
      return false;
    }
  }

  async testFileOperations() {
    console.log('\n📁 Testing File Operations...');

    try {
      // Test file upload from first user
      await this.pages[0].evaluate(() => {
        const uploadBtn = document.querySelector('[data-testid="test-file-upload-btn"]');
        if (uploadBtn) uploadBtn.click();
      });

      // Wait for file operation to complete
      await Promise.all(this.pages.map(page => page.waitForTimeout(3000)));

      // Check if file appears in all users' file lists
      const fileLists = await Promise.all(this.pages.map(page =>
        page.evaluate(() => {
          const fileListElement = document.querySelector('[data-testid="file-list"]');
          return fileListElement ? fileListElement.children.length : 0;
        })
      ));

      console.log('File counts across users:', fileLists);

      const filesSync = fileLists.every(count => count === fileLists[0] && count > 0);
      this.testResults.fileOperations = filesSync;

      console.log(`${filesSync ? '✅' : '❌'} File operations test: ${filesSync ? 'PASSED' : 'FAILED'}`);
      return filesSync;

    } catch (error) {
      console.error('❌ File operations test failed:', error);
      return false;
    }
  }

  async testNetworkResilience() {
    console.log('\n🌐 Testing Network Resilience...');

    try {
      // Simulate network disconnection for one user
      await this.pages[1].setOfflineMode(true);
      console.log('📵 User 2 went offline');

      // Continue operations with remaining users
      await this.pages[0].evaluate(() => {
        const testBtn = document.querySelector('[data-testid="test-realtime-btn"]');
        if (testBtn) testBtn.click();
      });

      await this.pages[0].waitForTimeout(2000);

      // Reconnect user
      await this.pages[1].setOfflineMode(false);
      console.log('📶 User 2 back online');

      // Wait for reconnection
      await this.pages[1].waitForTimeout(3000);

      // Check if state synchronized after reconnection
      const finalStates = await Promise.all(this.pages.map(page =>
        page.evaluate(() => {
          const stateElement = document.querySelector('[data-testid="session-data"]');
          return stateElement ? stateElement.textContent : null;
        })
      ));

      const resilient = finalStates.every(state => state === finalStates[0]);
      this.testResults.networkResilience = resilient;

      console.log(`${resilient ? '✅' : '❌'} Network resilience test: ${resilient ? 'PASSED' : 'FAILED'}`);
      return resilient;

    } catch (error) {
      console.error('❌ Network resilience test failed:', error);
      return false;
    }
  }

  async measurePerformance() {
    console.log('\n⚡ Measuring Performance...');

    try {
      const performanceMetrics = await Promise.all(this.pages.map(async (page, index) => {
        const metrics = await page.evaluate(() => {
          if (window.performance && window.performance.getEntriesByType) {
            const navigation = window.performance.getEntriesByType('navigation')[0];
            return {
              loadTime: navigation.loadEventEnd - navigation.fetchStart,
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
              firstPaint: window.performance.getEntriesByType('paint')[0]?.startTime || 0
            };
          }
          return null;
        });

        console.log(`User ${index + 1} performance:`, metrics);
        return metrics;
      }));

      this.testResults.performance = {
        averageLoadTime: performanceMetrics.reduce((sum, m) => sum + (m?.loadTime || 0), 0) / performanceMetrics.length,
        averageDOMLoaded: performanceMetrics.reduce((sum, m) => sum + (m?.domContentLoaded || 0), 0) / performanceMetrics.length
      };

      console.log('📊 Average Performance Metrics:', this.testResults.performance);
      return this.testResults.performance;

    } catch (error) {
      console.error('❌ Performance measurement failed:', error);
      return {};
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');

    try {
      // Close all sockets
      this.sockets.forEach(socket => {
        if (socket.connected) socket.disconnect();
      });

      // Close all browsers
      await Promise.all(this.browsers.map(browser => browser.close()));

      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  async runFullTestSuite() {
    console.log('🧪 Starting Phase 6 Multi-User Integration Testing');
    console.log('=' * 60);

    const setup = await this.setupTest(3);
    if (!setup) {
      console.error('❌ Test setup failed, aborting');
      return false;
    }

    try {
      // Run all test scenarios
      await this.testConcurrentSessionAccess();
      await this.testRealTimeSync();
      await this.testFileOperations();
      await this.testNetworkResilience();
      await this.measurePerformance();

      // Generate final report
      this.generateReport();

      return true;
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return false;
    } finally {
      await this.cleanup();
    }
  }

  generateReport() {
    console.log('\n📊 PHASE 6 TEST RESULTS');
    console.log('=' * 40);
    
    const results = this.testResults;
    const passed = Object.values(results).filter(r => r === true).length;
    const total = Object.keys(results).length - 1; // Exclude performance object

    console.log(`✅ Concurrent Access: ${results.concurrentAccess ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Real-Time Sync: ${results.realTimeSync ? 'PASS' : 'FAIL'}`);
    console.log(`✅ File Operations: ${results.fileOperations ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Network Resilience: ${results.networkResilience ? 'PASS' : 'FAIL'}`);
    
    console.log(`\n📈 Performance Metrics:`);
    console.log(`   Average Load Time: ${results.performance.averageLoadTime?.toFixed(2)}ms`);
    console.log(`   Average DOM Ready: ${results.performance.averageDOMLoaded?.toFixed(2)}ms`);

    console.log(`\n🎯 Overall Score: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED! Ready for Phase 7');
    } else {
      console.log('⚠️  Some tests failed. Review and fix before proceeding to Phase 7');
    }
  }
}

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new MultiUserTestSuite();
  testSuite.runFullTestSuite()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test suite execution failed:', error);
      process.exit(1);
    });
}

export default MultiUserTestSuite;
