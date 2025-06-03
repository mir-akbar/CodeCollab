const mongoose = require('mongoose');
const Session = require('../../api/models/Session');
const SessionParticipant = require('../../api/models/SessionParticipant');

async function debugParticipantCount() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codelab');
    console.log('✅ Connected to database');

    const testUserEmail = 'test@example.com';

    // Clean up any existing test data
    await Session.deleteMany({ creator: testUserEmail });
    await SessionParticipant.deleteMany({ userEmail: testUserEmail });
    console.log('🧹 Cleaned up test data');

    // Create a test session
    const sessionId = `session_${Date.now()}`;
    const session = new Session({
      sessionId,
      name: 'Debug Test Session',
      description: 'Testing participant count',
      creator: testUserEmail,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await session.save();
    console.log('✅ Created session:', sessionId);

    // Create session participant
    const participant = new SessionParticipant({
      sessionId,
      userEmail: testUserEmail,
      role: 'owner',
      status: 'active',
      joinedAt: new Date()
    });
    await participant.save();
    console.log('✅ Created participant');

    // Verify data exists
    const sessionInDb = await Session.findOne({ sessionId });
    const participantInDb = await SessionParticipant.findOne({ sessionId });
    console.log('📊 Session in DB:', !!sessionInDb);
    console.log('📊 Participant in DB:', !!participantInDb);

    // Test the aggregation pipeline step by step
    console.log('\n🔍 Testing aggregation pipeline...');

    // Stage 1: Find user participations
    const stage1 = await SessionParticipant.aggregate([
      {
        $match: {
          userEmail: testUserEmail,
          status: { $in: ['active', 'invited'] }
        }
      }
    ]);
    console.log('Stage 1 - User participations:', stage1.length);

    // Stage 2: Lookup sessions
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
    console.log('Stage 2 - After session lookup:', stage2.length);
    if (stage2.length > 0) {
      console.log('  Session found:', stage2[0].session.length > 0);
    }

    // Stage 3: Filter active sessions
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
    console.log('Stage 3 - After session status filter:', stage3.length);

    // Stage 4: Unwind
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
    console.log('Stage 4 - After unwind:', stage4.length);

    // Stage 5: Lookup all participants
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
    console.log('Stage 5 - After participants lookup:', stage5.length);
    if (stage5.length > 0) {
      console.log('  Participants found:', stage5[0].allParticipants.length);
      console.log('  Participant details:', stage5[0].allParticipants);
    }

    // Final stage: Group
    const finalResult = await SessionParticipant.aggregate([
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

    console.log('\n📊 Final aggregation result:');
    console.log('  Sessions found:', finalResult.length);
    if (finalResult.length > 0) {
      console.log('  Participants in result:', finalResult[0].allParticipants.length);
      console.log('  Full result:', JSON.stringify(finalResult[0], null, 2));
    }

    // Test collection names to ensure we're looking at the right place
    const collections = await mongoose.connection.db.collections();
    const collectionNames = collections.map(c => c.collectionName);
    console.log('\n📚 Available collections:', collectionNames);

    // Cleanup
    await Session.deleteMany({ creator: testUserEmail });
    await SessionParticipant.deleteMany({ userEmail: testUserEmail });
    console.log('🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

debugParticipantCount();
