import jwt from 'jsonwebtoken';
import { 
  requireAuth, 
  verifySkillOwnership, 
  verifySessionOwnership, 
  verifyNodeOwnership,
  validateJWTToken 
} from '../auth.js';

// Mock the models
jest.mock('../../models/LearningSession.js', () => ({
  default: {
    findOne: jest.fn()
  }
}));

describe('Authentication Middleware', () => {
  let req, res, next;
  const mockSkill = { _id: 'skill123', userId: 'user123', name: 'Test Skill' };
  const mockSession = { _id: 'session123', userId: 'user123', nodeId: 'node123' };
  const mockNode = { _id: 'node123', userId: 'user123', skillId: 'skill123' };

  beforeEach(() => {
    req = {
      headers: {},
      params: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup console.log mock
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('requireAuth', () => {
    const validJWTToken = jwt.sign({ id: 'user123' }, 'test-secret');
    
    beforeEach(() => {
      process.env.JWT_SECRET = 'test-secret';
    });

    it('should authenticate valid JWT token', async () => {
      req.headers.authorization = `Bearer ${validJWTToken}`;

      await requireAuth(req, res, next);

      expect(req.user).toEqual({ id: 'user123' });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing token', async () => {
      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle Firebase token format', async () => {
      // Create a mock Firebase token (base64 encoded JSON)
      const firebasePayload = {
        user_id: 'firebase-user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iss: 'https://securetoken.google.com/test-project'
      };
      
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify(firebasePayload)).toString('base64');
      const signature = 'mock-signature';
      const firebaseToken = `${header}.${payload}.${signature}`;

      req.headers.authorization = `Bearer ${firebaseToken}`;

      await requireAuth(req, res, next);

      expect(req.user).toEqual({ 
        id: 'firebase-user-123', 
        email: 'test@example.com' 
      });
      expect(next).toHaveBeenCalled();
    });

    it('should reject expired Firebase token', async () => {
      const expiredPayload = {
        user_id: 'firebase-user-123',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify(expiredPayload)).toString('base64');
      const signature = 'mock-signature';
      const expiredToken = `${header}.${payload}.${signature}`;

      req.headers.authorization = `Bearer ${expiredToken}`;

      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token expired' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject malformed token', async () => {
      req.headers.authorization = 'Bearer malformed.token';

      await requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('verifySkillOwnership', () => {
    it('should call next() since skill ownership check is removed', async () => {
      req.user = { id: 'user123' };
      req.params = { skillId: 'skill123' };
      await verifySkillOwnership(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('verifySessionOwnership', () => {
    beforeEach(async () => {
      req.user = { id: 'user123' };
      req.params = { sessionId: 'session123' };
      
      const { default: LearningSession } = await import('../../models/LearningSession.js');
      LearningSession.findOne.mockResolvedValue(mockSession);
    });

    it('should allow access to owned session', async () => {
      await verifySessionOwnership(req, res, next);

      expect(req.session).toEqual(mockSession);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access to non-owned session', async () => {
      const { default: LearningSession } = await import('../../models/LearningSession.js');
      LearningSession.findOne.mockResolvedValue(null);

      await verifySessionOwnership(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied: You can only access your own sessions'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('verifyNodeOwnership', () => {
    it('should call next() since node ownership check is removed', async () => {
      req.user = { id: 'user123' };
      req.params = { nodeId: 'node123', skillId: 'skill123' };
      await verifyNodeOwnership(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateJWTToken', () => {
    const validToken = jwt.sign({ id: 'user123' }, 'test-secret');
    
    beforeEach(() => {
      process.env.JWT_SECRET = 'test-secret';
    });

    it('should validate correct JWT token', () => {
      req.headers.authorization = `Bearer ${validToken}`;

      validateJWTToken(req, res, next);

      expect(req.user).toEqual({ id: 'user123' });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject token without user ID', () => {
      const tokenWithoutId = jwt.sign({ name: 'test' }, 'test-secret');
      req.headers.authorization = `Bearer ${tokenWithoutId}`;

      validateJWTToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid token payload'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { id: 'user123' }, 
        'test-secret', 
        { expiresIn: '-1h' }
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      validateJWTToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token expired'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject token with invalid signature', () => {
      const invalidToken = jwt.sign({ id: 'user123' }, 'wrong-secret');
      req.headers.authorization = `Bearer ${invalidToken}`;

      validateJWTToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject malformed token', () => {
      req.headers.authorization = 'Bearer not.a.valid.jwt';

      validateJWTToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid token format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject very old tokens', () => {
      // Create a token that's older than 7 days
      const oldToken = jwt.sign(
        { 
          id: 'user123',
          iat: Math.floor(Date.now() / 1000) - (8 * 24 * 60 * 60) // 8 days ago
        }, 
        'test-secret'
      );
      req.headers.authorization = `Bearer ${oldToken}`;

      validateJWTToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token expired, please login again'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});