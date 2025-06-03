/**
 * Service Layer Validation Test
 * Tests SessionService methods and business logic
 */

const mongoose = require('mongoose');
const SessionService = require('./services/sessionService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/codelab';

class ServiceValidator {
  constructor() {
    this.sessionService = new SessionService();
    this.testResults = [];
    this.errors = [];
    this.testSession = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logEntry);
    
    if (type === 'error') {
      this.errors.push(logEntry);
    }
    this.testResults.push(logEntry);
  }

  async connect() {
    try {
      await mongoose.connect(MONGO_URI);
      this.log('✅ Connected to MongoDB successfully', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Failed to connect to MongoDB: ${error.message}`, 'error');
      return false;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      this.log('✅ Disconnected from MongoDB', 'success');
    } catch (error) {
      this.log(`❌ Error disconnecting: ${error.message}`, 'error');
    }
  }

  async testSessionCreation() {
    this.log('🧪 Testing Session Creation Service...', 'test');
    
    try {
      const sessionData = {
        name: 'Service Test Session',
        description: 'Testing session service',
        creator: 'service-test@example.com'
      };

      const result = await this.sessionService.createSession(sessionData);
      
      if (result.success) {
        this.log('✅ Session creation service working', 'success');
        this.log(`   Session ID: ${result.sessionId}`, 'info');
        this.log(`   Session Name: ${result.session.name}`, 'info');
        this.testSession = result.session;
        return result;
      } else {
        this.log(`❌ Session creation failed: ${result.error}`, 'error');
        return null;
      }
    } catch (error) {
      this.log(`❌ Session creation service error: ${error.message}`, 'error');
      return null;
    }
  }

  async testUserSessions() {
    this.log('🧪 Testing Get User Sessions Service...', 'test');
    
    try {
      const sessions = await this.sessionService.getUserSessions('service-test@example.com');
      
      if (Array.isArray(sessions) && sessions.length > 0) {
        this.log(`✅ Get user sessions working - found ${sessions.length} sessions`, 'success');
        sessions.forEach((session, i) => {
          this.log(`   ${i + 1}. ${session.name} (${session.sessionId})`, 'info');
          this.log(`      Creator: ${session.creator}, Participants: ${session.participants.length}`, 'info');
        });
        return sessions;
      } else {
        this.log('❌ Get user sessions failed - no sessions found', 'error');
        return null;
      }
    } catch (error) {
      this.log(`❌ Get user sessions error: ${error.message}`, 'error');
      return null;
    }
  }

  async testSessionAccess() {
    this.log('🧪 Testing Session Access Check Service...', 'test');
    
    try {
      // Test with session owner
      const ownerAccess = await this.sessionService.checkSessionAccess(
        this.testSession.sessionId, 
        'service-test@example.com'
      );
      
      if (ownerAccess.hasAccess && ownerAccess.role === 'owner') {
        this.log('✅ Session access check working for owner', 'success');
        this.log(`   Role: ${ownerAccess.role}, Access: ${ownerAccess.access}`, 'info');
      } else {
        this.log(`❌ Session access check failed for owner: ${JSON.stringify(ownerAccess)}`, 'error');
      }

      // Test with non-participant
      const nonParticipantAccess = await this.sessionService.checkSessionAccess(
        this.testSession.sessionId, 
        'non-participant@example.com'
      );
      
      if (!nonParticipantAccess.hasAccess) {
        this.log('✅ Session access check working for non-participant', 'success');
        this.log(`   Reason: ${nonParticipantAccess.reason}`, 'info');
      } else {
        this.log(`❌ Session access check failed for non-participant: ${JSON.stringify(nonParticipantAccess)}`, 'error');
      }

      return true;
    } catch (error) {
      this.log(`❌ Session access check error: ${error.message}`, 'error');
      return false;
    }
  }

  async testInvitationService() {
    this.log('🧪 Testing Invitation Service...', 'test');
    
    try {
      // Test valid invitation
      const invitationResult = await this.sessionService.inviteUserToSession(
        this.testSession.sessionId,
        'service-test@example.com', // inviter (owner)
        'invited-user@example.com', // invitee
        'editor' // role
      );
      
      if (invitationResult.success) {
        this.log('✅ Invitation service working', 'success');
        this.log(`   Message: ${invitationResult.message}`, 'info');
      } else {
        this.log(`❌ Invitation service failed: ${invitationResult.error}`, 'error');
      }

      // Test duplicate invitation
      try {
        const duplicateResult = await this.sessionService.inviteUserToSession(
          this.testSession.sessionId,
          'service-test@example.com',
          'invited-user@example.com',
          'editor'
        );
        
        this.log(`⚠️ Duplicate invitation result: ${duplicateResult.success ? 'Allowed' : 'Blocked'}`, 'warn');
        if (duplicateResult.success) {
          this.log(`   This might be reactivation: ${duplicateResult.message}`, 'info');
        } else {
          this.log(`   Blocked as expected: ${duplicateResult.error}`, 'info');
        }
      } catch (duplicateError) {
        if (duplicateError.message.includes('already a participant')) {
          this.log('✅ Duplicate invitation correctly blocked', 'success');
        } else {
          this.log(`❌ Unexpected duplicate invitation error: ${duplicateError.message}`, 'error');
        }
      }

      // Test unauthorized invitation
      try {
        const unauthorizedResult = await this.sessionService.inviteUserToSession(
          this.testSession.sessionId,
          'unauthorized@example.com', // not a participant
          'another-user@example.com',
          'viewer'
        );
        
        this.log(`❌ Unauthorized invitation should fail but got: ${JSON.stringify(unauthorizedResult)}`, 'error');
      } catch (unauthorizedError) {
        if (unauthorizedError.message.includes('Insufficient permissions')) {
          this.log('✅ Unauthorized invitation correctly blocked', 'success');
        } else {
          this.log(`❌ Unexpected unauthorized error: ${unauthorizedError.message}`, 'error');
        }
      }

      return true;
    } catch (error) {
      this.log(`❌ Invitation service error: ${error.message}`, 'error');
      return false;
    }
  }

  async testSessionDetails() {
    this.log('🧪 Testing Session Details Service...', 'test');
    
    try {
      const sessionDetails = await this.sessionService.getSessionDetails(this.testSession.sessionId);
      
      if (sessionDetails) {
        this.log('✅ Session details service working', 'success');
        this.log(`   Session: ${sessionDetails.name}`, 'info');
        this.log(`   Participants: ${sessionDetails.participants.length}`, 'info');
        
        sessionDetails.participants.forEach((p, i) => {
          this.log(`   ${i + 1}. ${p.email} - ${p.role} (${p.status})`, 'info');
        });
        
        return sessionDetails;
      } else {
        this.log('❌ Session details service failed', 'error');
        return null;
      }
    } catch (error) {
      this.log(`❌ Session details service error: ${error.message}`, 'error');
      return null;
    }
  }

  async generateReport() {
    this.log('📊 Generating Service Validation Report...', 'test');
    
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.length,
      errors: this.errors.length,
      status: this.errors.length === 0 ? 'PASS' : 'FAIL',
      details: {
        testResults: this.testResults,
        errors: this.errors
      }
    };

    console.log('\n' + '='.repeat(80));
    console.log('📋 SERVICE LAYER VALIDATION REPORT');
    console.log('='.repeat(80));
    console.log(`Status: ${report.status}`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Errors: ${report.errors}`);
    console.log(`Timestamp: ${report.timestamp}`);
    
    if (report.errors > 0) {
      console.log('\n❌ ERRORS FOUND:');
      this.errors.forEach(error => console.log(`  ${error}`));
    } else {
      console.log('\n✅ ALL TESTS PASSED - Service layer is working!');
    }
    
    console.log('='.repeat(80));

    return report;
  }

  async runFullValidation() {
    this.log('🚀 Starting Service Layer Validation...', 'test');
    
    // Step 1: Connect to database
    const connected = await this.connect();
    if (!connected) return false;

    // Step 2: Test session creation
    const sessionCreated = await this.testSessionCreation();
    if (!sessionCreated) return false;

    // Step 3: Test get user sessions
    const userSessions = await this.testUserSessions();
    if (!userSessions) return false;

    // Step 4: Test session access
    const accessWorking = await this.testSessionAccess();
    if (!accessWorking) return false;

    // Step 5: Test invitation service
    const invitationWorking = await this.testInvitationService();
    if (!invitationWorking) return false;

    // Step 6: Test session details
    const detailsWorking = await this.testSessionDetails();
    if (!detailsWorking) return false;

    // Step 7: Generate report
    const report = await this.generateReport();

    // Step 8: Disconnect
    await this.disconnect();

    return report;
  }
}

// Run the validation if this file is executed directly
if (require.main === module) {
  const validator = new ServiceValidator();
  validator.runFullValidation()
    .then(report => {
      process.exit(report.status === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Service validation failed:', error);
      process.exit(1);
    });
}

module.exports = ServiceValidator;
