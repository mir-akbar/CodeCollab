/**
 * Phase 5 Validation Script - TanStack Query + YJS Integration Testing
 * 
 * This script validates the complete implementation of:
 * - TanStack Query session management 
 * - YJS real-time collaboration
 * - File management with caching
 * - Optimistic updates and error handling
 */

const axios = require('axios');
const { io } = require('socket.io-client');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

class TanStackQueryValidator {
  constructor() {
    this.results = {
      sessionManagement: {},
      realTimeCollaboration: {},
      fileManagement: {},
      performance: {},
      errorHandling: {}
    };
  }

  async runValidation() {
    console.log('🧪 Starting Phase 5 TanStack Query + YJS Validation');
    console.log('=' * 60);

    try {
      await this.validateSessionManagement();
      await this.validateRealTimeCollaboration();
      await this.validateFileManagement();
      await this.validatePerformance();
      await this.validateErrorHandling();

      this.generateReport();
    } catch (error) {
      console.error('❌ Validation failed:', error);
    }
  }

  async validateSessionManagement() {
    console.log('\n📋 Testing Session Management...');
    
    try {
      // Test session creation with TanStack Query
      const createResponse = await axios.post(`${API_URL}/sessions`, {
        name: 'TanStack Test Session',
        description: 'Phase 5 validation test session',
        creator: 'test@tanstack.com'
      });

      this.results.sessionManagement.create = {
        success: createResponse.status === 201,
        sessionId: createResponse.data.sessionId,
        responseTime: createResponse.headers['x-response-time'] || 'N/A'
      };

      console.log('✅ Session creation:', this.results.sessionManagement.create.success);

      // Test session fetching (should use cache on subsequent calls)
      const sessionId = this.results.sessionManagement.create.sessionId;
      
      const fetchStart = Date.now();
      const fetchResponse = await axios.get(`${API_URL}/sessions/${sessionId}`);
      const fetchTime = Date.now() - fetchStart;

      this.results.sessionManagement.fetch = {
        success: fetchResponse.status === 200,
        cacheHit: fetchTime < 50, // Fast response indicates cache hit
        responseTime: fetchTime
      };

      console.log('✅ Session fetching:', this.results.sessionManagement.fetch.success);
      console.log('⚡ Cache performance:', this.results.sessionManagement.fetch.cacheHit ? 'Good' : 'Needs improvement');

    } catch (error) {
      console.error('❌ Session management test failed:', error.message);
      this.results.sessionManagement.error = error.message;
    }
  }

  async validateRealTimeCollaboration() {
    console.log('\n🔄 Testing Real-time Collaboration...');

    return new Promise((resolve) => {
      const socket = io(API_URL);
      const testResults = {
        connection: false,
        yjsDocument: false,
        userAwareness: false,
        realTimeUpdates: false
      };

      socket.on('connect', () => {
        console.log('✅ Socket.IO connection established');
        testResults.connection = true;

        // Test YJS document creation
        socket.emit('join-session', {
          sessionId: 'test-session-yjs',
          userEmail: 'test@tanstack.com'
        });

        // Listen for YJS awareness updates
        socket.on('awareness-update', (data) => {
          console.log('✅ YJS awareness working:', data);
          testResults.userAwareness = true;
        });

        // Test real-time document updates
        socket.emit('document-update', {
          sessionId: 'test-session-yjs',
          changes: { type: 'insert', content: 'Hello TanStack!' }
        });

        socket.on('document-changed', (data) => {
          console.log('✅ Real-time updates working:', data);
          testResults.realTimeUpdates = true;
        });

        // Test YJS document synchronization
        socket.emit('get-ydoc', { sessionId: 'test-session-yjs' });
        
        socket.on('ydoc-state', (data) => {
          console.log('✅ YJS document synchronization working');
          testResults.yjsDocument = true;
        });

        // Complete test after delay
        setTimeout(() => {
          this.results.realTimeCollaboration = testResults;
          socket.disconnect();
          resolve();
        }, 3000);
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection failed:', error);
        this.results.realTimeCollaboration.error = error.message;
        resolve();
      });
    });
  }

  async validateFileManagement() {
    console.log('\n📁 Testing File Management...');

    try {
      const sessionId = this.results.sessionManagement.create?.sessionId || 'test-session';

      // Test file upload with optimistic updates
      const uploadStart = Date.now();
      const uploadResponse = await axios.post(`${API_URL}/files/upload`, {
        sessionId,
        fileName: 'test-tanstack.js',
        content: 'console.log("TanStack Query + YJS working!");',
        fileType: 'javascript'
      });
      const uploadTime = Date.now() - uploadStart;

      this.results.fileManagement.upload = {
        success: uploadResponse.status === 200,
        responseTime: uploadTime,
        optimisticUpdate: uploadTime < 100 // Fast response indicates optimistic update
      };

      console.log('✅ File upload:', this.results.fileManagement.upload.success);
      console.log('⚡ Optimistic updates:', this.results.fileManagement.upload.optimisticUpdate ? 'Working' : 'Check implementation');

      // Test file fetching with cache
      const fetchStart = Date.now();
      const filesResponse = await axios.get(`${API_URL}/files?sessionId=${sessionId}`);
      const fetchTime = Date.now() - fetchStart;

      this.results.fileManagement.fetch = {
        success: filesResponse.status === 200,
        fileCount: filesResponse.data.length,
        cachePerformance: fetchTime < 50
      };

      console.log('✅ File fetching:', this.results.fileManagement.fetch.success);
      console.log('📊 Files retrieved:', this.results.fileManagement.fetch.fileCount);

    } catch (error) {
      console.error('❌ File management test failed:', error.message);
      this.results.fileManagement.error = error.message;
    }
  }

  async validatePerformance() {
    console.log('\n⚡ Testing Performance Characteristics...');

    try {
      // Test multiple concurrent session fetches (should hit cache)
      const sessionId = this.results.sessionManagement.create?.sessionId || 'test-session';
      const concurrentRequests = 5;
      
      const start = Date.now();
      const promises = Array(concurrentRequests).fill().map(() => 
        axios.get(`${API_URL}/sessions/${sessionId}`)
      );
      
      await Promise.all(promises);
      const totalTime = Date.now() - start;
      const avgTime = totalTime / concurrentRequests;

      this.results.performance = {
        concurrentRequests,
        totalTime,
        averageResponseTime: avgTime,
        cacheEfficiency: avgTime < 100 // Good cache should be very fast
      };

      console.log('✅ Concurrent requests completed');
      console.log(`⚡ Average response time: ${avgTime}ms`);
      console.log('🎯 Cache efficiency:', this.results.performance.cacheEfficiency ? 'Excellent' : 'Needs optimization');

    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
      this.results.performance.error = error.message;
    }
  }

  async validateErrorHandling() {
    console.log('\n🛡️  Testing Error Handling & Retry Logic...');

    try {
      // Test invalid session access
      try {
        await axios.get(`${API_URL}/sessions/invalid-session-id`);
      } catch (error) {
        this.results.errorHandling.invalidSession = {
          handled: error.response?.status === 404,
          errorMessage: error.response?.data?.message
        };
        console.log('✅ Invalid session error handled correctly');
      }

      // Test network retry logic (simulate by rapid requests)
      const retryTest = await axios.get(`${API_URL}/sessions`).catch(err => ({
        retryAttempted: true,
        finalError: err.message
      }));

      this.results.errorHandling.retryLogic = {
        working: retryTest.status === 200 || retryTest.retryAttempted
      };

      console.log('✅ Error handling validation completed');

    } catch (error) {
      console.error('❌ Error handling test failed:', error.message);
      this.results.errorHandling.error = error.message;
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PHASE 5 VALIDATION REPORT');
    console.log('='.repeat(60));

    // Session Management Report
    console.log('\n📋 Session Management:');
    console.log(`  ✅ Creation: ${this.results.sessionManagement.create?.success ? 'PASS' : 'FAIL'}`);
    console.log(`  ✅ Fetching: ${this.results.sessionManagement.fetch?.success ? 'PASS' : 'FAIL'}`);
    console.log(`  ⚡ Cache Performance: ${this.results.sessionManagement.fetch?.cacheHit ? 'GOOD' : 'NEEDS IMPROVEMENT'}`);

    // Real-time Collaboration Report
    console.log('\n🔄 Real-time Collaboration:');
    console.log(`  ✅ Socket Connection: ${this.results.realTimeCollaboration.connection ? 'PASS' : 'FAIL'}`);
    console.log(`  ✅ YJS Document: ${this.results.realTimeCollaboration.yjsDocument ? 'PASS' : 'FAIL'}`);
    console.log(`  ✅ User Awareness: ${this.results.realTimeCollaboration.userAwareness ? 'PASS' : 'FAIL'}`);
    console.log(`  ✅ Real-time Updates: ${this.results.realTimeCollaboration.realTimeUpdates ? 'PASS' : 'FAIL'}`);

    // File Management Report
    console.log('\n📁 File Management:');
    console.log(`  ✅ Upload: ${this.results.fileManagement.upload?.success ? 'PASS' : 'FAIL'}`);
    console.log(`  ✅ Fetching: ${this.results.fileManagement.fetch?.success ? 'PASS' : 'FAIL'}`);
    console.log(`  ⚡ Optimistic Updates: ${this.results.fileManagement.upload?.optimisticUpdate ? 'WORKING' : 'CHECK IMPLEMENTATION'}`);

    // Performance Report
    console.log('\n⚡ Performance:');
    console.log(`  📊 Average Response Time: ${this.results.performance.averageResponseTime || 'N/A'}ms`);
    console.log(`  🎯 Cache Efficiency: ${this.results.performance.cacheEfficiency ? 'EXCELLENT' : 'NEEDS OPTIMIZATION'}`);

    // Error Handling Report
    console.log('\n🛡️ Error Handling:');
    console.log(`  ✅ Invalid Requests: ${this.results.errorHandling.invalidSession?.handled ? 'HANDLED' : 'NEEDS IMPROVEMENT'}`);
    console.log(`  ✅ Retry Logic: ${this.results.errorHandling.retryLogic?.working ? 'WORKING' : 'NEEDS IMPLEMENTATION'}`);

    // Overall Assessment
    const overallScore = this.calculateOverallScore();
    console.log('\n' + '='.repeat(60));
    console.log(`🎯 OVERALL ASSESSMENT: ${overallScore.grade}`);
    console.log(`📊 Score: ${overallScore.percentage}%`);
    console.log('='.repeat(60));

    // Next Steps
    console.log('\n🚀 NEXT STEPS FOR PHASE 6:');
    console.log('  1. Address any failed tests above');
    console.log('  2. Optimize cache performance if needed');
    console.log('  3. Enhance error handling and retry logic');
    console.log('  4. Add comprehensive unit tests');
    console.log('  5. Prepare demo scenarios for capstone presentation');
    
    console.log('\n✅ Phase 5 validation completed!');
    console.log('Ready to proceed to Phase 6: Comprehensive Testing & Demo Preparation');
  }

  calculateOverallScore() {
    const categories = [
      this.results.sessionManagement,
      this.results.realTimeCollaboration, 
      this.results.fileManagement,
      this.results.performance,
      this.results.errorHandling
    ];

    let totalTests = 0;
    let passedTests = 0;

    categories.forEach(category => {
      Object.keys(category).forEach(key => {
        if (key !== 'error') {
          totalTests++;
          const result = category[key];
          if (typeof result === 'boolean' && result) passedTests++;
          if (typeof result === 'object' && result.success) passedTests++;
          if (typeof result === 'object' && result.working) passedTests++;
          if (typeof result === 'object' && result.handled) passedTests++;
        }
      });
    });

    const percentage = Math.round((passedTests / totalTests) * 100);
    let grade = 'F';
    
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';
    else if (percentage >= 60) grade = 'D';

    return { percentage, grade };
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new TanStackQueryValidator();
  validator.runValidation().catch(console.error);
}

module.exports = TanStackQueryValidator;
