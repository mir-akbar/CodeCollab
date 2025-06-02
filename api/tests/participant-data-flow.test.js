import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../api/server.js';
import Session from '../../api/models/Session.js';
import SessionParticipant from '../../api/models/SessionParticipant.js';
import SessionService from '../../api/services/sessionService.js';

describe('Participant Data Flow Debug', () => {
  let sessionService;
  let testSessionId;
  let testUserEmail = 'test@example.com';

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab-test');
    }
    
    sessionService = new SessionService();
    console.log('🧪 Starting participant data flow debugging...');
  });

  beforeEach(async () => {
    // Clean up test data
    await Session.deleteMany({ creator: testUserEmail });
    await SessionParticipant.deleteMany({ userEmail: testUserEmail });
  });

  afterAll(async () => {
    // Clean up and close connection
    await Session.deleteMany({ creator: testUserEmail });
    await SessionParticipant.deleteMany({ userEmail: testUserEmail });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should debug session creation and participant storage', async () => {
    console.log('\n🔍 Step 1: Testing session creation...');
    
    // Create session
    const sessionData = {
      name: 'Debug Test Session',
      description: 'Testing participant storage',
      creator: testUserEmail
    };

    const createResult = await sessionService.createSession(sessionData);
    expect(createResult.success).toBe(true);
    testSessionId = createResult.session.sessionId;
    
    console.log('✅ Session created:', {
      sessionId: testSessionId,
      participants: createResult.session.participants
    });

    // Verify session exists in database
    const sessionInDb = await Session.findOne({ sessionId: testSessionId });
    expect(sessionInDb).toBeTruthy();
    console.log('✅ Session found in database:', {
      id: sessionInDb._id,
      sessionId: sessionInDb.sessionId,
      creator: sessionInDb.creator
    });

    // Verify participant exists in database
    const participantInDb = await SessionParticipant.findOne({ 
      sessionId: testSessionId,
      userEmail: testUserEmail 
    });
    expect(participantInDb).toBeTruthy();
    console.log('✅ Participant found in database:', {
      sessionId: participantInDb.sessionId,
      userEmail: participantInDb.userEmail,
      role: participantInDb.role,
      status: participantInDb.status
    });
  });

  it('should debug collection names and aggregation pipeline', async () => {
    console.log('\n🔍 Step 2: Testing collection names and aggregation...');
    
    // First create a session to test with
    const sessionData = {
      name: 'Collection Debug Session',
      description: 'Testing collection names',
      creator: testUserEmail
    };

    await sessionService.createSession(sessionData);
    
    // Check actual collection names
    const collections = await mongoose.connection.db.collections();
    const collectionNames = collections.map(c => c.collectionName);
    console.log('📊 Available collections:', collectionNames);

    // Check sessions collection
    const sessionsCollection = await mongoose.connection.db.collection('sessions').find({}).toArray();
    console.log('📊 Sessions collection count:', sessionsCollection.length);
    if (sessionsCollection.length > 0) {
      console.log('📊 Sample session document:', JSON.stringify(sessionsCollection[0], null, 2));
    }

    // Check sessionparticipants collection
    const participantsCollection = await mongoose.connection.db.collection('sessionparticipants').find({}).toArray();
    console.log('📊 SessionParticipants collection count:', participantsCollection.length);
    if (participantsCollection.length > 0) {
      console.log('📊 Sample participant document:', JSON.stringify(participantsCollection[0], null, 2));
    }

    // Test the exact aggregation pipeline from _getUserSessionsNew
    console.log('\n🔍 Testing aggregation pipeline...');
    
    const aggregationResult = await SessionParticipant.aggregate([
      {
        $match: {
          userEmail: testUserEmail,
          status: { $in: ['active', 'invited'] }
        }
      },
      {
        $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'session'
        }
      },
      {
        $match: {
          'session.status': 'active'
        }
      },
      {
        $unwind: '$session'
      },
      {
        $lookup: {
          from: 'sessionparticipants',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'allParticipants',
          pipeline: [
            {
              $match: {
                status: { $in: ['active', 'invited'] }
              }
            }
          ]
        }
      },
      {
        $group: {
          _id: '$sessionId',
          session: { $first: '$session' },
          allParticipants: { $first: '$allParticipants' }
        }
      }
    ]);

    console.log('📊 Aggregation result:', JSON.stringify(aggregationResult, null, 2));
    
    expect(aggregationResult.length).toBeGreaterThan(0);
    if (aggregationResult.length > 0) {
      expect(aggregationResult[0].allParticipants).toBeDefined();
      expect(aggregationResult[0].allParticipants.length).toBeGreaterThan(0);
      console.log('✅ Aggregation pipeline working - found participants:', aggregationResult[0].allParticipants.length);
    }
  });

  it('should debug getUserSessions method specifically', async () => {
    console.log('\n🔍 Step 3: Testing getUserSessions method...');
    
    // Create session first
    const sessionData = {
      name: 'GetUserSessions Debug',
      description: 'Testing getUserSessions method',
      creator: testUserEmail
    };

    const createResult = await sessionService.createSession(sessionData);
    testSessionId = createResult.session.sessionId;
    
    console.log('✅ Created session for testing:', testSessionId);

    // Now test getUserSessions
    const userSessions = await sessionService.getUserSessions(testUserEmail);
    
    console.log('📊 getUserSessions result:', JSON.stringify(userSessions, null, 2));
    
    expect(userSessions).toBeDefined();
    expect(Array.isArray(userSessions)).toBe(true);
    expect(userSessions.length).toBeGreaterThan(0);
    
    if (userSessions.length > 0) {
      const session = userSessions[0];
      console.log('🔍 Session participants:', session.participants);
      
      expect(session.participants).toBeDefined();
      expect(Array.isArray(session.participants)).toBe(true);
      expect(session.participants.length).toBeGreaterThan(0);
      
      const creator = session.participants.find(p => p.email === testUserEmail);
      expect(creator).toBeTruthy();
      console.log('✅ Found creator in participants:', creator);
    }
  });

  it('should test API endpoint directly', async () => {
    console.log('\n🔍 Step 4: Testing API endpoint directly...');
    
    // Create session via API
    const createResponse = await request(app)
      .post('/api/sessions')
      .send({
        name: 'API Debug Session',
        description: 'Testing API endpoint',
        creator: testUserEmail
      });

    expect(createResponse.status).toBe(201);
    console.log('✅ API session creation response:', createResponse.body);
    
    // Get sessions via API
    const getResponse = await request(app)
      .get(`/api/sessions?userEmail=${testUserEmail}`);
    
    expect(getResponse.status).toBe(200);
    console.log('📊 API get sessions response:', JSON.stringify(getResponse.body, null, 2));
    
    expect(getResponse.body.sessions).toBeDefined();
    expect(Array.isArray(getResponse.body.sessions)).toBe(true);
    
    if (getResponse.body.sessions.length > 0) {
      const session = getResponse.body.sessions[0];
      console.log('🔍 API session participants:', session.participants);
      
      expect(session.participants).toBeDefined();
      expect(Array.isArray(session.participants)).toBe(true);
      expect(session.participants.length).toBeGreaterThan(0);
      
      console.log('✅ API endpoint returning participants correctly');
    } else {
      console.error('❌ No sessions returned by API');
    }
  });

  it('should debug step by step aggregation stages', async () => {
    console.log('\n🔍 Step 5: Debugging aggregation stages step by step...');
    
    // Create session first
    const sessionData = {
      name: 'Aggregation Debug Session',
      description: 'Step by step aggregation debug',
      creator: testUserEmail
    };

    await sessionService.createSession(sessionData);
    
    // Stage 1: Match user participations
    console.log('\n--- Stage 1: Match user participations ---');
    const stage1 = await SessionParticipant.aggregate([
      {
        $match: {
          userEmail: testUserEmail,
          status: { $in: ['active', 'invited'] }
        }
      }
    ]);
    console.log('Stage 1 result:', JSON.stringify(stage1, null, 2));

    // Stage 2: Lookup session details
    console.log('\n--- Stage 2: Lookup session details ---');
    const stage2 = await SessionParticipant.aggregate([
      {
        $match: {
          userEmail: testUserEmail,
          status: { $in: ['active', 'invited'] }
        }
      },
      {
        $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'session'
        }
      }
    ]);
    console.log('Stage 2 result:', JSON.stringify(stage2, null, 2));

    // Stage 3: Filter active sessions
    console.log('\n--- Stage 3: Filter active sessions ---');
    const stage3 = await SessionParticipant.aggregate([
      {
        $match: {
          userEmail: testUserEmail,
          status: { $in: ['active', 'invited'] }
        }
      },
      {
        $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'session'
        }
      },
      {
        $match: {
          'session.status': 'active'
        }
      }
    ]);
    console.log('Stage 3 result:', JSON.stringify(stage3, null, 2));

    // Stage 4: Unwind session array
    console.log('\n--- Stage 4: Unwind session array ---');
    const stage4 = await SessionParticipant.aggregate([
      {
        $match: {
          userEmail: testUserEmail,
          status: { $in: ['active', 'invited'] }
        }
      },
      {
        $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'session'
        }
      },
      {
        $match: {
          'session.status': 'active'
        }
      },
      {
        $unwind: '$session'
      }
    ]);
    console.log('Stage 4 result:', JSON.stringify(stage4, null, 2));

    // Stage 5: Lookup all participants
    console.log('\n--- Stage 5: Lookup all participants ---');
    const stage5 = await SessionParticipant.aggregate([
      {
        $match: {
          userEmail: testUserEmail,
          status: { $in: ['active', 'invited'] }
        }
      },
      {
        $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'session'
        }
      },
      {
        $match: {
          'session.status': 'active'
        }
      },
      {
        $unwind: '$session'
      },
      {
        $lookup: {
          from: 'sessionparticipants',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'allParticipants',
          pipeline: [
            {
              $match: {
                status: { $in: ['active', 'invited'] }
              }
            }
          ]
        }
      }
    ]);
    console.log('Stage 5 result:', JSON.stringify(stage5, null, 2));

    // Final stage: Group by session
    console.log('\n--- Final Stage: Group by session ---');
    const finalStage = await SessionParticipant.aggregate([
      {
        $match: {
          userEmail: testUserEmail,
          status: { $in: ['active', 'invited'] }
        }
      },
      {
        $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'session'
        }
      },
      {
        $match: {
          'session.status': 'active'
        }
      },
      {
        $unwind: '$session'
      },
      {
        $lookup: {
          from: 'sessionparticipants',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'allParticipants',
          pipeline: [
            {
              $match: {
                status: { $in: ['active', 'invited'] }
              }
            }
          ]
        }
      },
      {
        $group: {
          _id: '$sessionId',
          session: { $first: '$session' },
          allParticipants: { $first: '$allParticipants' }
        }
      }
    ]);
    console.log('Final stage result:', JSON.stringify(finalStage, null, 2));

    // Verify final result has participants
    expect(finalStage.length).toBeGreaterThan(0);
    if (finalStage.length > 0) {
      expect(finalStage[0].allParticipants).toBeDefined();
      expect(finalStage[0].allParticipants.length).toBeGreaterThan(0);
    }
  });
});
