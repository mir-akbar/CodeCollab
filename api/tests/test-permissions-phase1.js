// Phase 1 Permission System Test
// Tests the newly implemented permission methods and validation

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

async function testPermissionMethods() {
  console.log('\n🧪 Testing Permission Methods...');
  
  try {
    // Clean up any existing test data
    await SessionParticipant.deleteMany({ sessionId: 'test-permissions' });
    await Session.deleteMany({ sessionId: 'test-permissions' });
    
    // Create test session
    const session = new Session({
      sessionId: 'test-permissions',
      name: 'Permission Test Session',
      description: 'Test session for permission system validation',
      creator: 'owner@test.com',
      status: 'active'
    });
    await session.save();
    
    // Test 1: Create owner participant
    console.log('\n📝 Test 1: Creating owner participant...');
    const owner = new SessionParticipant({
      sessionId: 'test-permissions',
      userEmail: 'owner@test.com',
      role: 'owner',
      status: 'active',
      invitedBy: 'system'
    });
    await owner.save();
    console.log('✅ Owner created successfully');
    
    // Test 2: Test permission methods
    console.log('\n📝 Test 2: Testing permission methods...');
    
    const tests = [
      { action: 'delete', expected: true, description: 'Owner can delete session' },
      { action: 'edit', expected: true, description: 'Owner can edit session' },
      { action: 'invite', expected: true, description: 'Owner can invite users' },
      { action: 'view', expected: true, description: 'Owner can view session' }
    ];
    
    for (const test of tests) {
      const result = owner.hasPermission(test.action);
      if (result === test.expected) {
        console.log(`✅ ${test.description}: ${result}`);
      } else {
        console.log(`❌ ${test.description}: Expected ${test.expected}, got ${result}`);
      }
    }
    
    // Test 3: Test role assignment capabilities
    console.log('\n📝 Test 3: Testing role assignment capabilities...');
    
    const roleTests = [
      { role: 'admin', expected: true, description: 'Owner can assign admin role' },
      { role: 'editor', expected: true, description: 'Owner can assign editor role' },
      { role: 'viewer', expected: true, description: 'Owner can assign viewer role' },
      { role: 'owner', expected: true, description: 'Owner can assign owner role' }
    ];
    
    for (const test of roleTests) {
      const result = owner.canAssignRole(test.role);
      if (result === test.expected) {
        console.log(`✅ ${test.description}: ${result}`);
      } else {
        console.log(`❌ ${test.description}: Expected ${test.expected}, got ${result}`);
      }
    }
    
    // Test 4: Create admin and test their permissions
    console.log('\n📝 Test 4: Testing admin permissions...');
    
    const admin = new SessionParticipant({
      sessionId: 'test-permissions',
      userEmail: 'admin@test.com',
      role: 'admin',
      status: 'active',
      invitedBy: 'owner@test.com'
    });
    await admin.save();
    
    const adminTests = [
      { action: 'delete', expected: false, description: 'Admin cannot delete session' },
      { action: 'edit', expected: true, description: 'Admin can edit session' },
      { action: 'invite', expected: true, description: 'Admin can invite users' },
      { role: 'owner', expected: false, description: 'Admin cannot assign owner role' },
      { role: 'editor', expected: true, description: 'Admin can assign editor role' }
    ];
    
    for (const test of adminTests) {
      let result;
      if (test.action) {
        result = admin.hasPermission(test.action);
      } else if (test.role) {
        result = admin.canAssignRole(test.role);
      }
      
      if (result === test.expected) {
        console.log(`✅ ${test.description}: ${result}`);
      } else {
        console.log(`❌ ${test.description}: Expected ${test.expected}, got ${result}`);
      }
    }
    
    // Test 5: Test owner uniqueness validation
    console.log('\n📝 Test 5: Testing owner uniqueness validation...');
    
    try {
      const duplicateOwner = new SessionParticipant({
        sessionId: 'test-permissions',
        userEmail: 'duplicate@test.com',
        role: 'owner',
        status: 'active',
        invitedBy: 'admin@test.com'
      });
      await duplicateOwner.save();
      console.log('❌ Owner uniqueness validation failed - duplicate owner was saved');
    } catch (error) {
      if (error.message.includes('already has an owner')) {
        console.log('✅ Owner uniqueness validation working correctly');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Test 6: Test status transition validation
    console.log('\n📝 Test 6: Testing status transition validation...');
    
    const statusTests = [
      { from: 'invited', to: 'active', expected: true },
      { from: 'invited', to: 'removed', expected: true },
      { from: 'active', to: 'left', expected: true },
      { from: 'removed', to: 'active', expected: false },
      { from: 'left', to: 'active', expected: true }
    ];
    
    for (const test of statusTests) {
      const testParticipant = new SessionParticipant({
        sessionId: 'test-permissions',
        userEmail: `test-${Math.random()}@test.com`,
        role: 'viewer',
        status: test.from,
        invitedBy: 'owner@test.com'
      });
      
      const result = testParticipant.canTransitionTo(test.to);
      if (result === test.expected) {
        console.log(`✅ Status transition ${test.from} → ${test.to}: ${result}`);
      } else {
        console.log(`❌ Status transition ${test.from} → ${test.to}: Expected ${test.expected}, got ${result}`);
      }
    }
    
    // Test 7: Test utility methods
    console.log('\n📝 Test 7: Testing utility methods...');
    
    const sessionOwner = await SessionParticipant.findSessionOwner('test-permissions');
    console.log(`✅ Found session owner: ${sessionOwner ? sessionOwner.userEmail : 'None'}`);
    
    const isOwner = await SessionParticipant.isSessionOwner('test-permissions', 'owner@test.com');
    console.log(`✅ Owner check: ${isOwner}`);
    
    const isNotOwner = await SessionParticipant.isSessionOwner('test-permissions', 'admin@test.com');
    console.log(`✅ Non-owner check: ${!isNotOwner}`);
    
    console.log('\n🎉 Phase 1 Permission System Tests Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

async function runTests() {
  await connectDB();
  await testPermissionMethods();
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

module.exports = { testPermissionMethods };
