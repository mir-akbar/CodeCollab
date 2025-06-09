import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../api/server.js'

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

  it('should invite user with POST /sessions/:id/invite', async () => {
    if (!sessionId) return

    const response = await request(app)
      .post(`/api/sessions/${sessionId}/invite`)
      .send({
        inviteeEmail: 'invited@example.com',
        role: 'editor',
        inviterEmail: 'test@example.com',
      })
      .expect(200)

    expect(response.body.success).toBe(true)
  })

  it('should delete session with DELETE /sessions/:id', async () => {
    if (!sessionId) return

    const response = await request(app)
      .delete(`/api/sessions/${sessionId}`)
      .send({ userEmail: 'test@example.com' })
      .expect(200)

    expect(response.body.success).toBe(true)
  })

  it('should validate RESTful endpoint compliance', async () => {
    // Test that old endpoints are no longer accessible
    await request(app)
      .post('/api/create-session')
      .send(testSession)
      .expect(404)

    await request(app)
      .post('/api/invite-session')
      .send({ sessionId: 'test', email: 'test@example.com' })
      .expect(404)
  })
})
