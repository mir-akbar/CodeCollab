const SessionManagement = require('../models/SessionManagement');
const Session = require('../models/Session');
const SessionParticipant = require('../models/SessionParticipant');

class SessionMigrationService {
  constructor() {
    this.migrationBatchSize = 50;
    this.dryRun = false;
  }

  /**
   * Migrate sessions in batches to avoid memory issues
   */
  async migrateAllSessions(options = {}) {
    const { dryRun = false, batchSize = this.migrationBatchSize } = options;
    this.dryRun = dryRun;

    console.log(`🚀 Starting session migration (${dryRun ? 'DRY RUN' : 'LIVE'})...`);

    try {
      // Get total count
      const totalSessions = await this.getTotalSessionsToMigrate();
      console.log(`📊 Found ${totalSessions} unique sessions to migrate`);

      if (totalSessions === 0) {
        console.log('✅ No sessions to migrate');
        return { success: true, migrated: 0 };
      }

      let migratedCount = 0;
      let offset = 0;

      while (offset < totalSessions) {
        const batch = await this.getNextBatch(offset, batchSize);
        
        if (batch.length === 0) break;

        console.log(`📦 Processing batch ${Math.floor(offset / batchSize) + 1}: ${batch.length} sessions`);

        for (const sessionGroup of batch) {
          try {
            const result = await this.migrateSingleSession(sessionGroup);
            if (result.success) {
              migratedCount++;
            }
          } catch (error) {
            console.error(`❌ Failed to migrate session ${sessionGroup.session_id}:`, error.message);
          }
        }

        offset += batchSize;
      }

      console.log(`✅ Migration complete: ${migratedCount}/${totalSessions} sessions migrated`);
      return { success: true, migrated: migratedCount, total: totalSessions };

    } catch (error) {
      console.error('💥 Migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unique session groups from legacy data
   */
  async getTotalSessionsToMigrate() {
    const pipeline = [
      {
        $group: {
          _id: '$session_id',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          _id: { $ne: null }
        }
      }
    ];

    const result = await SessionManagement.aggregate(pipeline);
    return result.length;
  }

  /**
   * Get next batch of session groups to migrate
   */
  async getNextBatch(offset, limit) {
    const pipeline = [
      {
        $group: {
          _id: '$session_id',
          records: { $push: '$$ROOT' },
          firstRecord: { $first: '$$ROOT' }
        }
      },
      {
        $match: {
          _id: { $ne: null }
        }
      },
      {
        $sort: { '_id': 1 }
      },
      {
        $skip: offset
      },
      {
        $limit: limit
      }
    ];

    return await SessionManagement.aggregate(pipeline);
  }

  /**
   * Migrate a single session group (all records with same session_id)
   */
  async migrateSingleSession(sessionGroup) {
    const sessionId = sessionGroup._id;
    const records = sessionGroup.records;

    console.log(`  🔄 Migrating session: ${sessionId} (${records.length} records)`);

    if (this.dryRun) {
      console.log(`  📝 DRY RUN: Would migrate session ${sessionId}`);
      return { success: true, sessionId };
    }

    try {
      // Check if already migrated
      const existingSession = await Session.findOne({ sessionId });
      if (existingSession && existingSession.legacy?.migrationComplete) {
        console.log(`  ⏭️  Session ${sessionId} already migrated`);
        return { success: true, sessionId, skipped: true };
      }

      // Find the creator (record where email exists and invited_email is null or equals email)
      const creatorRecord = records.find(r => 
        r.email && (!r.invited_email || r.invited_email === r.email)
      );

      if (!creatorRecord) {
        throw new Error(`No creator found for session ${sessionId}`);
      }

      // Create or update the main session record
      const sessionData = {
        sessionId,
        name: creatorRecord.name || `Session ${sessionId}`,
        description: creatorRecord.description || '',
        creator: creatorRecord.email,
        status: 'active',
        legacy: {
          originalIds: records.map(r => r._id.toString()),
          migrationComplete: true
        }
      };

      const session = await Session.findOneAndUpdate(
        { sessionId },
        sessionData,
        { upsert: true, new: true }
      );

      // Migrate participants
      const participantResults = await this.migrateSessionParticipants(sessionId, records, creatorRecord.email);

      console.log(`  ✅ Session ${sessionId} migrated successfully (${participantResults.created} participants)`);
      return { 
        success: true, 
        sessionId, 
        participantsCreated: participantResults.created 
      };

    } catch (error) {
      console.error(`  ❌ Failed to migrate session ${sessionId}:`, error.message);
      return { success: false, sessionId, error: error.message };
    }
  }

  /**
   * Migrate participants for a session
   */
  async migrateSessionParticipants(sessionId, records, creatorEmail) {
    const participantMap = new Map();

    // Process all records to build participant list
    for (const record of records) {
      // Add creator as owner if not already added
      if (record.email && !participantMap.has(record.email)) {
        participantMap.set(record.email, {
          userEmail: record.email,
          role: record.email === creatorEmail ? 'owner' : this.convertAccessToRole(record.access),
          status: 'active',
          invitedBy: creatorEmail,
          joinedAt: record.uploaded_at,
          legacy: {
            originalAccess: record.access,
            migrationComplete: true
          }
        });
      }

      // Add invited user if exists and different from creator
      if (record.invited_email && record.invited_email !== record.email && !participantMap.has(record.invited_email)) {
        participantMap.set(record.invited_email, {
          userEmail: record.invited_email,
          role: this.convertAccessToRole(record.access),
          status: 'invited', // Assume invited users haven't joined yet
          invitedBy: record.email,
          joinedAt: null,
          legacy: {
            originalAccess: record.access,
            migrationComplete: true
          }
        });
      }
    }

    let created = 0;

    // Create participant records
    for (const [email, participantData] of participantMap) {
      try {
        await SessionParticipant.findOneAndUpdate(
          { sessionId, userEmail: email },
          { sessionId, ...participantData },
          { upsert: true, new: true }
        );
        created++;
      } catch (error) {
        console.error(`    ⚠️  Failed to create participant ${email}:`, error.message);
      }
    }

    return { created };
  }

  /**
   * Convert legacy access values to new role system
   */
  convertAccessToRole(access) {
    switch (access) {
      case 'edit':
        return 'editor';
      case 'view':
        return 'viewer';
      default:
        return 'viewer';
    }
  }

  /**
   * Verify migration results
   */
  async verifyMigration() {
    console.log('🔍 Verifying migration results...');

    try {
      // Count original sessions
      const originalSessionCount = await SessionManagement.distinct('session_id').then(ids => 
        ids.filter(id => id != null).length
      );

      // Count migrated sessions
      const migratedSessionCount = await Session.countDocuments({ 
        'legacy.migrationComplete': true 
      });

      // Count participants
      const totalParticipants = await SessionParticipant.countDocuments();

      console.log(`📊 Migration Verification:`);
      console.log(`  Original sessions: ${originalSessionCount}`);
      console.log(`  Migrated sessions: ${migratedSessionCount}`);
      console.log(`  Total participants: ${totalParticipants}`);
      
      const success = migratedSessionCount >= originalSessionCount * 0.95; // Allow 5% tolerance
      console.log(`  Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);

      return {
        success,
        originalSessionCount,
        migratedSessionCount,
        totalParticipants
      };

    } catch (error) {
      console.error('💥 Verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Rollback migration (delete new records)
   */
  async rollbackMigration() {
    console.log('🔄 Rolling back migration...');

    if (this.dryRun) {
      console.log('📝 DRY RUN: Would delete migrated sessions and participants');
      return { success: true };
    }

    try {
      const sessionResult = await Session.deleteMany({ 'legacy.migrationComplete': true });
      const participantResult = await SessionParticipant.deleteMany({ 'legacy.migrationComplete': true });

      console.log(`✅ Rollback complete:`);
      console.log(`  Sessions deleted: ${sessionResult.deletedCount}`);
      console.log(`  Participants deleted: ${participantResult.deletedCount}`);

      return { success: true, sessionsDeleted: sessionResult.deletedCount, participantsDeleted: participantResult.deletedCount };

    } catch (error) {
      console.error('💥 Rollback failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SessionMigrationService;
