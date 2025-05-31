const { MongoClient } = require('mongodb');

async function fixIndexes() {
  const uri = 'mongodb+srv://admin:admin@cluster91438.fvtzi.mongodb.net/code_colab?retryWrites=true&w=majority&appName=Cluster91438';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('code_colab');
    const collection = db.collection('filestorages');
    
    // List indexes
    console.log('📋 Current indexes:');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));
    
    // Try to drop filename index if it exists
    for (const index of indexes) {
      if (index.key && index.key.filename) {
        console.log(`🗑️ Dropping index: ${index.name}`);
        try {
          await collection.dropIndex(index.name);
          console.log('✅ Index dropped');
        } catch (error) {
          console.log('❌ Failed to drop index:', error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('🔒 Connection closed');
  }
}

fixIndexes();
