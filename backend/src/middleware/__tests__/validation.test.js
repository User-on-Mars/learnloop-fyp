import { 
  validateRequest, 
  reflectionDataSchema, 
  nodeDataSchema, 
  validateReflectionRanges,
  validateNodeData,
  sanitizeInput
} from '../validation.js';

describe('Validation Middleware', () => {
  describe('reflectionDataSchema', () => {
    it('should validate correct reflection data', () => {
      const validData = {
        understanding: 4,
        difficulty: 3,
        notes: 'This was helpful',
        completionConfidence: 5,
        wouldRecommend: true,
        tags: ['javascript', 'functions']
      };

      const result = reflectionDataSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should reject understanding outside 1-5 range', () => {
      const invalidData = {
        understanding: 6,
        difficulty: 3
      };

      expect(() => reflectionDataSchema.parse(invalidData)).toThrow();
    });

    it('should reject difficulty outside 1-5 range', () => {
      const invalidData = {
        understanding: 3,
        difficulty: 0
      };

      expect(() => reflectionDataSchema.parse(invalidData)).toThrow();
    });

    it('should reject notes longer than 500 characters', () => {
      const invalidData = {
        understanding: 3,
        difficulty: 3,
        notes: 'a'.repeat(501)
      };

      expect(() => reflectionDataSchema.parse(invalidData)).toThrow();
    });

    it('should apply default values for optional fields', () => {
      const minimalData = {
        understanding: 3,
        difficulty: 3
      };

      const result = reflectionDataSchema.parse(minimalData);
      expect(result.notes).toBe('');
      expect(result.completionConfidence).toBe(3);
      expect(result.wouldRecommend).toBe(true);
      expect(result.tags).toEqual([]);
    });
  });

  describe('nodeDataSchema', () => {
    it('should validate correct node data', () => {
      const validData = {
        title: 'Test Node',
        description: 'A test node description',
        nodeType: 'content',
        sequenceOrder: 1,
        position: { x: 100, y: 200, gridX: 10, gridY: 20 }
      };

      const result = nodeDataSchema.parse(validData);
      expect(result.title).toBe('Test Node');
      expect(result.nodeType).toBe('content');
    });

    it('should sanitize HTML in title and description', () => {
      const dataWithHTML = {
        title: '<script>alert("xss")</script>Clean Title',
        description: '<img src="x" onerror="alert(1)">Clean description'
      };

      const result = nodeDataSchema.parse(dataWithHTML);
      expect(result.title).not.toContain('<script>');
      expect(result.description).not.toContain('<img');
    });

    it('should reject invalid node types', () => {
      const invalidData = {
        title: 'Test Node',
        nodeType: 'invalid'
      };

      expect(() => nodeDataSchema.parse(invalidData)).toThrow();
    });

    it('should reject negative sequence order', () => {
      const invalidData = {
        title: 'Test Node',
        sequenceOrder: -1
      };

      expect(() => nodeDataSchema.parse(invalidData)).toThrow();
    });

    it('should apply default values', () => {
      const minimalData = {
        title: 'Test Node'
      };

      const result = nodeDataSchema.parse(minimalData);
      expect(result.description).toBe('');
      expect(result.nodeType).toBe('content');
      expect(result.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('validateReflectionRanges', () => {
    it('should return no errors for valid reflection data', () => {
      const validData = {
        understanding: 4,
        difficulty: 3,
        completionConfidence: 5,
        notes: 'Good session'
      };

      const errors = validateReflectionRanges(validData);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid ranges', () => {
      const invalidData = {
        understanding: 6,
        difficulty: 0,
        completionConfidence: -1,
        notes: 'a'.repeat(501)
      };

      const errors = validateReflectionRanges(invalidData);
      expect(errors).toHaveLength(4);
      expect(errors.some(e => e.field === 'understanding')).toBe(true);
      expect(errors.some(e => e.field === 'difficulty')).toBe(true);
      expect(errors.some(e => e.field === 'completionConfidence')).toBe(true);
      expect(errors.some(e => e.field === 'notes')).toBe(true);
    });
  });

  describe('validateNodeData', () => {
    it('should return no errors for valid node data', () => {
      const validData = {
        title: 'Valid Node',
        description: 'Valid description',
        nodeType: 'content',
        sequenceOrder: 1,
        position: { x: 100, y: 200 }
      };

      const errors = validateNodeData(validData);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for missing title', () => {
      const invalidData = {
        description: 'Valid description'
      };

      const errors = validateNodeData(invalidData);
      expect(errors.some(e => e.field === 'title')).toBe(true);
    });

    it('should return errors for invalid position', () => {
      const invalidData = {
        title: 'Valid Node',
        position: { x: 'invalid', y: Infinity }
      };

      const errors = validateNodeData(invalidData);
      expect(errors.some(e => e.field === 'position.x')).toBe(true);
      expect(errors.some(e => e.field === 'position.y')).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags from strings', () => {
      const input = '<script>alert("xss")</script>Clean text';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Clean text');
    });

    it('should return non-string inputs unchanged', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
      expect(sanitizeInput({})).toEqual({});
    });
  });

  describe('validateRequest middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { body: {}, params: {}, query: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should call next() for valid data', () => {
      req.body = {
        understanding: 4,
        difficulty: 3
      };

      const middleware = validateRequest(reflectionDataSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 422 for invalid data', () => {
      req.body = {
        understanding: 6, // Invalid
        difficulty: 3
      };

      const middleware = validateRequest(reflectionDataSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed',
          errors: expect.any(Array)
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate params when target is params', () => {
      req.params = { id: 'invalid-id' };

      const paramSchema = reflectionDataSchema.pick({ understanding: true });
      const middleware = validateRequest(paramSchema, 'params');
      
      // This should fail since params doesn't have understanding
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
    });
  });
});