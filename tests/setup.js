// Setup file for API tests
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// MongoDB Memory Server instance
let mongoServer;

// Before all tests connect to a new in-memory database
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  console.log('Connected to in-memory MongoDB');
});

// Clear collections between tests
beforeEach(async () => {
  const collections = Object.keys(mongoose.connection.collections);
  for (const collectionName of collections) {
    const collection = mongoose.connection.collections[collectionName];
    await collection.deleteMany({});
  }
});

// Close connection after tests
afterAll(async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
  console.log('Closed connection to in-memory MongoDB');
});
