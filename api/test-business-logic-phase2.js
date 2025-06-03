// Phase 2 Business Logic Constraints Test
// Tests owner transfer rules, role change restrictions, and status transitions

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to test database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const SessionParticipant = require('./models/SessionParticipant');
const Session = require('./models/Session');
const SessionService = require('./services/sessionService');

async function testBusinessLogicConstraints() {
  console.log('\n🧪 Testing Phase 2: Business Logic Constraints...');
  
  const sessionService = new SessionService();
  const testSessionId = 'test-business-logic';
  
  try {
    // Clean up any existing test data
    await SessionParticipant.deleteMany({ sessionId: testSessionId });
    await Session.deleteMany({ sessionId: testSessionId });
    
    // Test 1: Session creation auto-assigns owner
    console.log('\n📝 Test 1: Session creation auto-assigns owner...');
    const sessionResult = await sessionService.createSession({
      sessionId: testSessionId,
      name: 'Business Logic Test Session',
      description: 'Testing business logic constraints',
      creator: 'creator@test.com'
    });
    
    const owner = await SessionParticipant.findOne({ 
      sessionId: testSessionId, 
      userEmail: 'creator@test.com' 
    });
    
    if (owner && owner.role === 'owner' && owner.status === 'active') {
      console.log('✅ Session creator automatically assigned as owner');
    } else {
      console.log('❌ Session creator not properly assigned as owner');
    }
    
    // Test 2: Invite user and test permission boundaries
    console.log('\n📝 Test 2: Testing invitation permission boundaries...');
    
    // Owner invites admin
    await sessionService.inviteUserToSession(testSessionId, 'creator@test.com', 'admin@test.com', 'admin');
    console.log('✅ Owner can invite admin');
    
    // Admin invites editor
    await sessionService.inviteUserToSession(testSessionId, 'admin@test.com', 'editor@test.com', 'editor');
    console.log('✅ Admin can invite editor');
    
    // Test admin cannot invite another admin
    try {
      await sessionService.inviteUserToSession(testSessionId, 'admin@test.com', 'another-admin@test.com', 'admin');
      console.log('❌ Admin should not be able to invite another admin');
    } catch (error) {
      if (error.message.includes('Insufficient permissions to assign admin role')) {
        console.log('✅ Admin correctly cannot invite another admin');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Editor invites viewer
    await sessionService.inviteUserToSession(testSessionId, 'editor@test.com', 'viewer@test.com', 'viewer');
    console.log('✅ Editor can invite viewer');
    
    // Test editor cannot invite editor
    try {
      await sessionService.inviteUserToSession(testSessionId, 'editor@test.com', 'another-editor@test.com', 'editor');
      console.log('❌ Editor should not be able to invite another editor');
    } catch (error) {
      if (error.message.includes('Insufficient permissions to assign editor role')) {
        console.log('✅ Editor correctly cannot invite another editor');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Test viewer cannot invite anyone
    try {
      await sessionService.inviteUserToSession(testSessionId, 'viewer@test.com', 'another-viewer@test.com', 'viewer');
      console.log('❌ Viewer should not be able to invite anyone');
    } catch (error) {
      if (error.message.includes('Insufficient permissions to invite')) {
        console.log('✅ Viewer correctly cannot invite users');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Test 3: Owner transfer business rules
    console.log('\n📝 Test 3: Testing owner transfer business rules...');
    
    // Transfer ownership from creator to admin
    await sessionService.transferOwnership(testSessionId, 'creator@test.com', 'admin@test.com');
    
    // Verify roles changed correctly
    const formerOwner = await SessionParticipant.findOne({ 
      sessionId: testSessionId, 
      userEmail: 'creator@test.com' 
    });
    const newOwner = await SessionParticipant.findOne({ 
      sessionId: testSessionId, 
      userEmail: 'admin@test.com' 
    });
    
    if (formerOwner.role === 'admin' && newOwner.role === 'owner') {
      console.log('✅ Owner transfer: Previous owner became admin, new owner assigned');
    } else {
      console.log(`❌ Owner transfer failed: Former owner role: ${formerOwner.role}, New owner role: ${newOwner.role}`);
    }
    
    // Test 4: Test that admin cannot self-promote to owner via role change
    console.log('\n📝 Test 4: Testing role change restrictions...');
    
    try {
      await sessionService.updateParticipantRole(testSessionId, 'creator@test.com', 'creator@test.com', 'owner');
      console.log('❌ Former owner should not be able to self-promote back to owner');
    } catch (error) {
      if (error.message.includes('Insufficient permissions to assign owner role')) {
        console.log('✅ Former owner correctly cannot self-promote to owner');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Test 5: Test role hierarchy enforcement
    console.log('\n📝 Test 5: Testing role hierarchy enforcement...');
    
    // New owner (admin@test.com) can change roles of lower hierarchy
    await sessionService.updateParticipantRole(testSessionId, 'admin@test.com', 'editor@test.com', 'admin');
    console.log('✅ Owner can promote editor to admin');
    
    // Verify the change
    const promotedAdmin = await SessionParticipant.findOne({ 
      sessionId: testSessionId, 
      userEmail: 'editor@test.com' 
    });
    
    if (promotedAdmin.role === 'admin') {
      console.log('✅ Role change applied correctly');
    } else {
      console.log(`❌ Role change failed: Expected admin, got ${promotedAdmin.role}`);
    }
    
    // Test 6: Test delete session permission
    console.log('\n📝 Test 6: Testing delete session permission...');
    
    // Former owner (now admin) cannot delete session
    try {
      await sessionService.deleteSession(testSessionId, 'creator@test.com');
      console.log('❌ Admin should not be able to delete session');
    } catch (error) {
      if (error.message.includes('Only session owner can delete')) {
        console.log('✅ Admin correctly cannot delete session');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Current owner can delete session
    const deleteResult = await sessionService.deleteSession(testSessionId, 'admin@test.com');
    if (deleteResult.success) {
      console.log('✅ Owner can delete session');
    } else {
      console.log('❌ Owner delete session failed');
    }
    
    console.log('\n🎉 Phase 2 Business Logic Constraints Tests Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

async function runTests() {
  await connectDB();
  await testBusinessLogicConstraints();
  await mongoose.connection.close();
  console.log('\n📊 Testing complete');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

if (require.main === module) {
  runTests();
}

module.exports = { testBusinessLogicConstraints };
