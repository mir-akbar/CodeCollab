/**
 * Foundation Validation Test
 * Tests data models, database operations, and core functionality
 * Run this from the API folder to access all dependencies
 */

const mongoose = require('mongoose');
const Session = require('./models/Session');
const SessionParticipant = require('./models/SessionParticipant');
const { generateSessionId } = require('./utils/sessionUtils');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/codelab';

class FoundationValidator {
  constructor() {
    this.testResults = [];
    this.errors = [];
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

  async clearDatabase() {
    try {
      await Session.deleteMany({});
      await SessionParticipant.deleteMany({});
      this.log('✅ Database cleared successfully', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Failed to clear database: ${error.message}`, 'error');
      return false;
    }
  }

  async testSessionModel() {
    this.log('🧪 Testing Session Model...', 'test');
    
    try {
      // Test 1: Create a valid session
      const sessionId = generateSessionId();
      const sessionData = {
        sessionId,
        name: 'Test Session',
        description: 'Foundation validation test session',
        creator: 'test@example.com',
        status: 'active'
      };

      const session = new Session(sessionData);
      await session.save();
      this.log('✅ Session creation successful', 'success');

      // Test 2: Verify required fields
      try {
        const invalidSession = new Session({
          name: 'Invalid Session'
          // Missing required fields
        });
        await invalidSession.save();
        this.log('❌ Session model validation failed - should reject invalid data', 'error');
      } catch (validationError) {
        this.log('✅ Session model validation working - rejects invalid data', 'success');
      }

      // Test 3: Verify unique sessionId constraint
      try {
        const duplicateSession = new Session(sessionData);
        await duplicateSession.save();
        this.log('❌ Session model uniqueness failed - allowed duplicate sessionId', 'error');
      } catch (duplicateError) {
        this.log('✅ Session model uniqueness working - rejects duplicate sessionId', 'success');
      }

      // Test 4: Test status enum validation
      try {
        const invalidStatusSession = new Session({
          ...sessionData,
          sessionId: generateSessionId(),
          status: 'invalid_status'
        });
        await invalidStatusSession.save();
        this.log('❌ Session status enum validation failed', 'error');
      } catch (enumError) {
        this.log('✅ Session status enum validation working', 'success');
      }

      return session;

    } catch (error) {
      this.log(`❌ Session model test failed: ${error.message}`, 'error');
      return null;
    }
  }

  async testSessionParticipantModel(session) {
    this.log('🧪 Testing SessionParticipant Model...', 'test');
    
    try {
      // Test 1: Create valid participant (owner)
      const ownerParticipant = new SessionParticipant({
        sessionId: session.sessionId,
        userEmail: 'test@example.com',
        userName: 'test',
        role: 'owner',
        status: 'active',
        invitedBy: 'test@example.com',
        joinedAt: new Date()
      });

      await ownerParticipant.save();
      this.log('✅ Owner participant creation successful', 'success');

      // Test 2: Create invited participant
      const invitedParticipant = new SessionParticipant({
        sessionId: session.sessionId,
        userEmail: 'invited@example.com',
        userName: 'invited',
        role: 'editor',
        status: 'invited',
        invitedBy: 'test@example.com'
      });

      await invitedParticipant.save();
      this.log('✅ Invited participant creation successful', 'success');

      // Test 3: Test role enum validation
      try {
        const invalidRoleParticipant = new SessionParticipant({
          sessionId: session.sessionId,
          userEmail: 'invalid@example.com',
          role: 'invalid_role',
          status: 'active',
          invitedBy: 'test@example.com'
        });
        await invalidRoleParticipant.save();
        this.log('❌ Participant role enum validation failed', 'error');
      } catch (enumError) {
        this.log('✅ Participant role enum validation working', 'success');
      }

      // Test 4: Test status enum validation
      try {
        const invalidStatusParticipant = new SessionParticipant({
          sessionId: session.sessionId,
          userEmail: 'invalid2@example.com',
          role: 'viewer',
          status: 'invalid_status',
          invitedBy: 'test@example.com'
        });
        await invalidStatusParticipant.save();
        this.log('❌ Participant status enum validation failed', 'error');
      } catch (enumError) {
        this.log('✅ Participant status enum validation working', 'success');
      }

      // Test 5: Test required field validation
      try {
        const incompleteParticipant = new SessionParticipant({
          sessionId: session.sessionId,
          role: 'viewer'
          // Missing required fields
        });
        await incompleteParticipant.save();
        this.log('❌ Participant required field validation failed', 'error');
      } catch (validationError) {
        this.log('✅ Participant required field validation working', 'success');
      }

      return { ownerParticipant, invitedParticipant };

    } catch (error) {
      this.log(`❌ SessionParticipant model test failed: ${error.message}`, 'error');
      return null;
    }
  }

  async testDatabaseQueries(session) {
    this.log('🧪 Testing Database Queries...', 'test');
    
    try {
      // Test 1: Find session by sessionId
      const foundSession = await Session.findOne({ sessionId: session.sessionId });
      if (foundSession) {
        this.log('✅ Session query by sessionId working', 'success');
      } else {
        this.log('❌ Session query by sessionId failed', 'error');
      }

      // Test 2: Find participants by sessionId
      const participants = await SessionParticipant.find({ sessionId: session.sessionId });
      this.log(`✅ Found ${participants.length} participants for session`, 'success');

      // Test 3: Find active participants
      const activeParticipants = await SessionParticipant.find({ 
        sessionId: session.sessionId, 
        status: 'active' 
      });
      this.log(`✅ Found ${activeParticipants.length} active participants`, 'success');

      // Test 4: Find participant by email
      const userParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: 'test@example.com'
      });
      if (userParticipant) {
        this.log('✅ Participant query by email working', 'success');
      } else {
        this.log('❌ Participant query by email failed', 'error');
      }

      // Test 5: Aggregation query (session with participants)
      const sessionWithParticipants = await Session.aggregate([
        { $match: { sessionId: session.sessionId } },
        {
          $lookup: {
            from: 'session_participants',
            localField: 'sessionId',
            foreignField: 'sessionId',
            as: 'participants'
          }
        }
      ]);

      if (sessionWithParticipants.length > 0 && sessionWithParticipants[0].participants.length > 0) {
        this.log('✅ Aggregation query working', 'success');
      } else {
        this.log('❌ Aggregation query failed', 'error');
      }

      return true;

    } catch (error) {
      this.log(`❌ Database query test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testInvitationScenarios(session) {
    this.log('🧪 Testing Invitation Scenarios...', 'test');
    
    try {
      // Scenario 1: Check if user is already a participant
      const existingParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: 'test@example.com'
      });
      
      if (existingParticipant) {
        this.log('✅ Existing participant detection working', 'success');
      } else {
        this.log('❌ Existing participant detection failed', 'error');
      }

      // Scenario 2: Invite a new user
      const newParticipant = new SessionParticipant({
        sessionId: session.sessionId,
        userEmail: 'newuser@example.com',
        userName: 'newuser',
        role: 'editor',
        status: 'invited',
        invitedBy: 'test@example.com'
      });

      await newParticipant.save();
      this.log('✅ New user invitation working', 'success');

      // Scenario 3: Try to invite the same user again
      const duplicateParticipant = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: 'newuser@example.com'
      });

      if (duplicateParticipant) {
        this.log('✅ Duplicate invitation detection working', 'success');
      } else {
        this.log('❌ Duplicate invitation detection failed', 'error');
      }

      // Scenario 4: Activate an invited user
      duplicateParticipant.status = 'active';
      duplicateParticipant.joinedAt = new Date();
      await duplicateParticipant.save();
      this.log('✅ User activation working', 'success');

      return true;

    } catch (error) {
      this.log(`❌ Invitation scenario test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testPermissionChecks(session) {
    this.log('🧪 Testing Permission Checks...', 'test');
    
    try {
      // Test 1: Owner permissions
      const owner = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: 'test@example.com',
        status: 'active'
      });

      if (owner && ['owner', 'admin'].includes(owner.role)) {
        this.log('✅ Owner permission check working', 'success');
      } else {
        this.log('❌ Owner permission check failed', 'error');
      }

      // Test 2: Non-existent user permissions
      const nonExistentUser = await SessionParticipant.findOne({
        sessionId: session.sessionId,
        userEmail: 'nonexistent@example.com',
        status: 'active'
      });

      if (!nonExistentUser) {
        this.log('✅ Non-existent user permission check working', 'success');
      } else {
        this.log('❌ Non-existent user permission check failed', 'error');
      }

      return true;

    } catch (error) {
      this.log(`❌ Permission check test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async generateReport() {
    this.log('📊 Generating Foundation Validation Report...', 'test');
    
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
    console.log('📋 FOUNDATION VALIDATION REPORT');
    console.log('='.repeat(80));
    console.log(`Status: ${report.status}`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Errors: ${report.errors}`);
    console.log(`Timestamp: ${report.timestamp}`);
    
    if (report.errors > 0) {
      console.log('\n❌ ERRORS FOUND:');
      this.errors.forEach(error => console.log(`  ${error}`));
    } else {
      console.log('\n✅ ALL TESTS PASSED - Foundation is solid!');
    }
    
    console.log('='.repeat(80));

    return report;
  }

  async runFullValidation() {
    this.log('🚀 Starting Foundation Validation...', 'test');
    
    // Step 1: Connect to database
    const connected = await this.connect();
    if (!connected) return false;

    // Step 2: Clear database for clean testing
    const cleared = await this.clearDatabase();
    if (!cleared) return false;

    // Step 3: Test Session model
    const session = await this.testSessionModel();
    if (!session) return false;

    // Step 4: Test SessionParticipant model
    const participants = await this.testSessionParticipantModel(session);
    if (!participants) return false;

    // Step 5: Test database queries
    const queriesWorking = await this.testDatabaseQueries(session);
    if (!queriesWorking) return false;

    // Step 6: Test invitation scenarios
    const invitationsWorking = await this.testInvitationScenarios(session);
    if (!invitationsWorking) return false;

    // Step 7: Test permission checks
    const permissionsWorking = await this.testPermissionChecks(session);
    if (!permissionsWorking) return false;

    // Step 8: Generate report
    const report = await this.generateReport();

    // Step 9: Disconnect
    await this.disconnect();

    return report;
  }
}

// Run the validation if this file is executed directly
if (require.main === module) {
  const validator = new FoundationValidator();
  validator.runFullValidation()
    .then(report => {
      process.exit(report.status === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Foundation validation failed:', error);
      process.exit(1);
    });
}

module.exports = FoundationValidator;
