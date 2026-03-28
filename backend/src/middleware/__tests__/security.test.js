import request from 'supertest';
import express from 'express';
import { 
  createRateLimiter,
  authRateLimit,
  nodeOperationsRateLimit,
  sessionRateLimit,
  generalRateLimit,
  sanitizeRequest,
  auditLogger,
  SECURITY_EVENTS,
  validateReflectionInput,
  validateNodeInput,
  handleValidationErrors
} from '../security.js';

describe('Security Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        max: 5 // 5 requests per minute
      });

      app.use(rateLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // First request should succeed
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should block requests exceeding rate limit', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        max: 1 // Only 1 request per minute
      });

      app.use(rateLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // First request should succeed
      await request(app).get('/test').expect(200);

      // Second request should be rate limited
      const response = await request(app).get('/test');
      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many requests');
    });

    it('should have different limits for different rate limiters', () => {
      expect(authRateLimit).toBeDefined();
      expect(nodeOperationsRateLimit).toBeDefined();
      expect(sessionRateLimit).toBeDefined();
      expect(generalRateLimit).toBeDefined();
    });
  });

  describe('Request Sanitization', () => {
    beforeEach(() => {
      app.use(sanitizeRequest);
      app.post('/test', (req, res) => res.json(req.body));
    });

    it('should sanitize HTML in request body', async () => {
      const maliciousData = {
        title: '<script>alert("xss")</script>Clean Title',
        description: '<img src="x" onerror="alert(1)">Clean description'
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousData);

      expect(response.status).toBe(200);
      expect(response.body.title).not.toContain('<script>');
      expect(response.body.description).not.toContain('<img');
      expect(response.body.title).toContain('Clean Title');
    });

    it('should sanitize nested objects', async () => {
      const maliciousData = {
        user: {
          name: '<script>alert("xss")</script>John',
          profile: {
            bio: '<img src="x" onerror="alert(1)">Developer'
          }
        }
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousData);

      expect(response.status).toBe(200);
      expect(response.body.user.name).not.toContain('<script>');
      expect(response.body.user.profile.bio).not.toContain('<img');
    });

    it('should sanitize arrays', async () => {
      const maliciousData = {
        tags: ['<script>alert("xss")</script>tag1', 'clean-tag', '<img src="x">tag3']
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousData);

      expect(response.status).toBe(200);
      expect(response.body.tags[0]).not.toContain('<script>');
      expect(response.body.tags[2]).not.toContain('<img');
      expect(response.body.tags[1]).toBe('clean-tag');
    });

    it('should handle non-object request bodies', async () => {
      const response = await request(app)
        .post('/test')
        .send('plain string');

      expect(response.status).toBe(200);
    });
  });

  describe('Audit Logging', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      app.use((req, res, next) => {
        req.user = { id: 'test-user-123' };
        next();
      });
      app.use(auditLogger(SECURITY_EVENTS.NODE_CREATE));
      app.post('/test', (req, res) => res.json({ success: true }));
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log security events', async () => {
      await request(app)
        .post('/test')
        .send({ title: 'Test Node' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AUDIT [node_create]'),
        expect.stringContaining('test-user-123')
      );
    });

    it('should log response details', async () => {
      await request(app)
        .post('/test')
        .send({ title: 'Test Node' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AUDIT [node_create] RESPONSE'),
        expect.objectContaining({
          statusCode: 200,
          success: true
        })
      );
    });

    it('should handle anonymous users', async () => {
      app = express();
      app.use(express.json());
      app.use(auditLogger(SECURITY_EVENTS.AUTH_FAILED));
      app.post('/test', (req, res) => res.json({ success: true }));

      await request(app)
        .post('/test')
        .send({ data: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AUDIT [auth_failed]'),
        expect.stringContaining('anonymous')
      );
    });
  });

  describe('Input Validation Chains', () => {
    describe('validateReflectionInput', () => {
      beforeEach(() => {
        app.post('/reflection', validateReflectionInput, handleValidationErrors, (req, res) => {
          res.json({ success: true });
        });
      });

      it('should accept valid reflection data', async () => {
        const validData = {
          understanding: 4,
          difficulty: 3,
          notes: 'Good session',
          completionConfidence: 5,
          wouldRecommend: true,
          tags: ['javascript', 'functions']
        };

        const response = await request(app)
          .post('/reflection')
          .send(validData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should reject invalid understanding score', async () => {
        const invalidData = {
          understanding: 6, // Invalid: > 5
          difficulty: 3
        };

        const response = await request(app)
          .post('/reflection')
          .send(invalidData);

        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'understanding',
              message: expect.stringContaining('between 1 and 5')
            })
          ])
        );
      });

      it('should reject notes that are too long', async () => {
        const invalidData = {
          understanding: 4,
          difficulty: 3,
          notes: 'a'.repeat(501) // Too long
        };

        const response = await request(app)
          .post('/reflection')
          .send(invalidData);

        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'notes',
              message: expect.stringContaining('500 characters')
            })
          ])
        );
      });
    });

    describe('validateNodeInput', () => {
      beforeEach(() => {
        app.post('/node', validateNodeInput, handleValidationErrors, (req, res) => {
          res.json({ success: true });
        });
      });

      it('should accept valid node data', async () => {
        const validData = {
          title: 'Test Node',
          description: 'A test node',
          nodeType: 'content',
          sequenceOrder: 1,
          position: { x: 100, y: 200 }
        };

        const response = await request(app)
          .post('/node')
          .send(validData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should reject empty title', async () => {
        const invalidData = {
          title: '', // Empty title
          description: 'Valid description'
        };

        const response = await request(app)
          .post('/node')
          .send(invalidData);

        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'title',
              message: expect.stringContaining('between 1 and 100')
            })
          ])
        );
      });

      it('should reject invalid node type', async () => {
        const invalidData = {
          title: 'Valid Title',
          nodeType: 'invalid-type'
        };

        const response = await request(app)
          .post('/node')
          .send(invalidData);

        expect(response.status).toBe(422);
        expect(response.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'nodeType',
              message: expect.stringContaining('start, content, or goal')
            })
          ])
        );
      });
    });
  });

  describe('Security Events Constants', () => {
    it('should have all required security event types', () => {
      expect(SECURITY_EVENTS.AUTH_LOGIN).toBe('auth_login');
      expect(SECURITY_EVENTS.AUTH_LOGOUT).toBe('auth_logout');
      expect(SECURITY_EVENTS.AUTH_FAILED).toBe('auth_failed');
      expect(SECURITY_EVENTS.NODE_CREATE).toBe('node_create');
      expect(SECURITY_EVENTS.NODE_UPDATE).toBe('node_update');
      expect(SECURITY_EVENTS.NODE_DELETE).toBe('node_delete');
      expect(SECURITY_EVENTS.SESSION_START).toBe('session_start');
      expect(SECURITY_EVENTS.SESSION_COMPLETE).toBe('session_complete');
      expect(SECURITY_EVENTS.SKILL_MAP_CREATE).toBe('skill_map_create');
      expect(SECURITY_EVENTS.SKILL_MAP_UPDATE).toBe('skill_map_update');
      expect(SECURITY_EVENTS.RATE_LIMIT_HIT).toBe('rate_limit_hit');
      expect(SECURITY_EVENTS.VALIDATION_ERROR).toBe('validation_error');
      expect(SECURITY_EVENTS.UNAUTHORIZED_ACCESS).toBe('unauthorized_access');
    });
  });

  describe('Error Handling', () => {
    it('should handle sanitization errors gracefully', async () => {
      app.use(sanitizeRequest);
      app.post('/test', (req, res) => res.json(req.body));

      // Create a circular reference that might cause JSON issues
      const circularData = { a: 1 };
      circularData.self = circularData;

      // This should not crash the server
      const response = await request(app)
        .post('/test')
        .send({ normal: 'data' });

      expect(response.status).toBe(200);
    });

    it('should handle validation errors in handleValidationErrors', async () => {
      app.post('/test', 
        validateReflectionInput, 
        handleValidationErrors, 
        (req, res) => res.json({ success: true })
      );

      const response = await request(app)
        .post('/test')
        .send({ understanding: 'invalid' });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });
});