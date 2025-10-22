import Fastify from 'fastify';
import pino from 'pino';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const server = Fastify({ logger: pino({ level: 'info' }) });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://tempiemail:tempiemail@postgres:5432/tempiemail'
});

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

// Generate random email local part
function generateEmailLocalPart(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Health check
server.get('/health', async () => {
  return { status: 'ok' };
});

// Simple test endpoint
server.get('/test', async () => {
  return { message: 'API is working', timestamp: new Date().toISOString() };
});

// Webhook to trigger web service rebuild (for development)
server.post('/webhook/rebuild', async (request, reply) => {
  try {
    // Execute rebuild command
    const { exec } = require('child_process');
    
    exec('cd /opt/tempiemail && git pull origin main && docker compose up -d --build web', (error, stdout, stderr) => {
      if (error) {
        server.log.error(`Rebuild error: ${error}`);
        return reply.code(500).send({ error: 'Failed to rebuild', details: error.message });
      }
      
      server.log.info('Web service rebuild completed');
      server.log.info(stdout);
      if (stderr) server.log.warn(stderr);
    });
    
    return { 
      message: 'Web service rebuild initiated', 
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    server.log.error(error);
    reply.code(500).send({ error: 'Failed to trigger rebuild' });
  }
});

// Create new email session
server.post('/sessions', async (request, reply) => {
  try {
    const sessionId = uuidv4();
    const localPart = generateEmailLocalPart();
    const email = `${localPart}@tempiemail.com`;
    const ip = request.ip;

    // Create session in database
    await pool.query(
      'INSERT INTO sessions (id, ip) VALUES ($1, $2)',
      [sessionId, ip]
    );

    // Create email address
    await pool.query(
      'INSERT INTO addresses (session_id, local_part, domain) VALUES ($1, $2, $3)',
      [sessionId, localPart, 'tempiemail.com']
    );

    // Store in Redis for quick access
    await redis.setex(`session:${sessionId}`, 86400, JSON.stringify({
      email,
      createdAt: new Date().toISOString()
    }));

    return {
      sessionId,
      email,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  } catch (error) {
    server.log.error(error);
    reply.code(500).send({ error: 'Failed to create session' });
  }
});

// Get inbox messages for a session
server.get('/sessions/:sessionId/messages', async (request, reply) => {
  try {
    const { sessionId } = request.params as { sessionId: string };
    
    const result = await pool.query(`
      SELECT m.id, m.from_addr, m.to_addr, m.subject, m.received_at,
             a.local_part, a.domain
      FROM messages m
      JOIN addresses a ON m.address_id = a.id
      WHERE a.session_id = $1
      ORDER BY m.received_at DESC
      LIMIT 50
    `, [sessionId]);

    const messages = result.rows.map(row => ({
      id: row.id,
      from: row.from_addr,
      to: row.to_addr,
      subject: row.subject,
      receivedAt: row.received_at,
      email: `${row.local_part}@${row.domain}`
    }));

    return { messages };
  } catch (error) {
    server.log.error(error);
    reply.code(500).send({ error: 'Failed to fetch messages' });
  }
});

// Get specific message content
server.get('/messages/:messageId', async (request, reply) => {
  try {
    const { messageId } = request.params as { messageId: string };
    
    const result = await pool.query(`
      SELECT m.id, m.from_addr, m.to_addr, m.subject, m.text_body, m.html_body, m.received_at,
             a.local_part, a.domain
      FROM messages m
      JOIN addresses a ON m.address_id = a.id
      WHERE m.id = $1
    `, [messageId]);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Message not found' });
    }

    const message = result.rows[0];
    return {
      id: message.id,
      from: message.from_addr,
      to: message.to_addr,
      subject: message.subject,
      textBody: message.text_body,
      htmlBody: message.html_body,
      receivedAt: message.received_at,
      email: `${message.local_part}@${message.domain}`
    };
  } catch (error) {
    server.log.error(error);
    reply.code(500).send({ error: 'Failed to fetch message' });
  }
});

// Generate new email for existing session
server.post('/sessions/:sessionId/regenerate', async (request, reply) => {
  try {
    const { sessionId } = request.params as { sessionId: string };
    const localPart = generateEmailLocalPart();
    const email = `${localPart}@tempiemail.com`;

    // Create new email address for this session
    await pool.query(
      'INSERT INTO addresses (session_id, local_part, domain) VALUES ($1, $2, $3)',
      [sessionId, localPart, 'tempiemail.com']
    );

    // Update Redis cache
    await redis.setex(`session:${sessionId}`, 86400, JSON.stringify({
      email,
      createdAt: new Date().toISOString()
    }));

    return {
      sessionId,
      email,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  } catch (error) {
    server.log.error(error);
    reply.code(500).send({ error: 'Failed to regenerate email' });
  }
});

const port = Number(process.env.PORT || 4000);
server.listen({ port, host: '0.0.0.0' }).then(() => {
  server.log.info(`API listening on ${port}`);
}).catch((err) => {
  server.log.error(err);
  process.exit(1);
});
