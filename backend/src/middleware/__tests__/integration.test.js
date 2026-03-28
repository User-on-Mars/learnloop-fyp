import request from 'supertest';
import express from 'express';
import { 
  validateRequest, 
  reflectionDataSchema,
  sanitizeInput 
} from '../validation.js';
import { 
  sanitizeRequest,
  generalRateLimit 
} from '../security.js';

describe('Middleware Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Validation Middleware', () => {
    test('should validate reflection data correctly', async () => {
      app.post('/test', validateRequest(reflectionDataSchema), (req, res) => {
        res.json({ success: true, data: req.body });
      });

      const validData = {
        understanding: 4,
        difficulty: 3,
        notes: 'Good session'
      };

      const response = await request(app)
        .post('/test')
        .send(validData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.understanding).toBe(4);
      expect(response.body.data.difficulty).toBe(3);
    });

    test('should reject invalid reflection data', async () => {
      app.post('/test', validateRequest(reflectionDataSchema), (req, res) => {
        res.json({ success: true });
      });

      const invalidData = {
        understanding: 6, // Invalid: > 5
        difficulty: 3
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData)
        .expect(422);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'understanding'
          })
        ])
      );
    });

    test('should sanitize HTML in input', () => {
      const maliciousInput = '<script>alert("xss")</script>Clean text';
      const sanitized = sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Clean text');
    });
  });

  describe('Security Middleware', () => {
    test('should sanitize request body', async () => {
      app.use(sanitizeRequest);
      app.post('/test', (req, res) => {
        res.json(req.body);
      });

      const maliciousData = {
        title: '<script>alert("xss")</script>Clean Title',
        description: 'Normal description'
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousData)
        .expect(200);

      expect(response.body.title).not.toContain('<script>');
      expect(response.body.title).toContain('Clean Title');
      expect(response.body.description).toBe('Normal description');
    });

    test('should handle nested object sanitization', async () => {
      app.use(sanitizeRequest);
      app.post('/test', (req, res) => {
        res.json(req.body);
      });

      const nestedData = {
        user: {
          name: '<img src="x" onerror="alert(1)">John',
          profile: {
            bio: 'Developer & <script>alert("xss")</script>Coder'
          }
        }
      };

      const response = await request(app)
        .post('/test')
        .send(nestedData)
        .expect(200);

      expect(response.body.user.name).not.toContain('<img');
      expect(response.body.user.name).toContain('John');
      expect(response.body.user.profile.bio).not.toContain('<script>');
      expect(response.body.user.profile.bio).toContain('Developer');
    });
  });

  describe('Combined Middleware', () => {
    test('should work with both validation and sanitization', async () => {
      app.use(sanitizeRequest);
      app.post('/test', validateRequest(reflectionDataSchema), (req, res) => {
        res.json({ success: true, data: req.body });
      });

      const data = {
        understanding: 4,
        difficulty: 3,
        notes: '<script>alert("xss")</script>This was helpful'
      };

      const response = await request(app)
        .post('/test')
        .send(data)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).not.toContain('<script>');
      expect(response.body.data.notes).toContain('This was helpful');
      expect(response.body.data.understanding).toBe(4);
    });
  });
});