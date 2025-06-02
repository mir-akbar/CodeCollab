import { beforeAll, afterAll, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer

beforeAll(async () => {
  // Start an in-memory MongoDB instance for testing
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()
  
  await mongoose.connect(mongoUri)
})

afterAll(async () => {
  // Clean up
  await mongoose.disconnect()
  if (mongoServer) {
    await mongoServer.stop()
  }
})

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections
  for (const key in collections) {
    const collection = collections[key]
    await collection.deleteMany({})
  }
})
