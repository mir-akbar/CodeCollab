import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../server.js'

describe('Session API Endpoints - Migration Validation', () => {
  const testSession = {
    name: 'Test Session',
    description: 'Testing the new API',
    creator: 'test@example.com',
  }

  let sessionId

  it('should create a session with POST /sessions', async () => {
    const response = await request(app)
      .post('/api/sessions')
      .send(testSession)
      .expect(201)

    expect(response.body.success).toBe(true)
    expect(response.body.session).toBeDefined()
    sessionId = response.body.session.sessionId || response.body.sessionId
  })

  it('should list sessions with GET /sessions', async () => {
    const response = await request(app)
      .get('/api/sessions')
      .query({ email: 'test@example.com' })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(Array.isArray(response.body.sessions)).toBe(true)
  })

  it('should handle session invitation', async () => {
    if (!sessionId) {
      // Create a session first if needed
      const createResponse = await request(app)
        .post('/api/sessions')
        .send(testSession)
        .expect(201)
      sessionId = createResponse.body.session.sessionId || createResponse.body.sessionId
    }

    const response = await request(app)
      .post(`/api/sessions/${sessionId}/invite`)
      .send({ invitedEmail: 'invited@example.com' })
      .expect(200)

    expect(response.body.success).toBe(true)
  })

  it('should handle leaving a session', async () => {
    if (!sessionId) {
      // Create a session first if needed
      const createResponse = await request(app)
        .post('/api/sessions')
        .send(testSession)
        .expect(201)
      sessionId = createResponse.body.session.sessionId || createResponse.body.sessionId
    }

    const response = await request(app)
      .post(`/api/sessions/${sessionId}/leave`)
      .send({ userEmail: 'test@example.com' })
      .expect(200)

    expect(response.body.success).toBe(true)
  })

  it('should delete a session', async () => {
    if (!sessionId) {
      // Create a session first if needed
      const createResponse = await request(app)
        .post('/api/sessions')
        .send(testSession)
        .expect(201)
      sessionId = createResponse.body.session.sessionId || createResponse.body.sessionId
    }

    const response = await request(app)
      .delete(`/api/sessions/${sessionId}`)
      .send({ userEmail: 'test@example.com' })
      .expect(200)

    expect(response.body.success).toBe(true)
  })
})
