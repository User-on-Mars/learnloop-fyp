import mongoose from 'mongoose';
import LearningSession from '../LearningSession.js';

describe('LearningSession Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await LearningSession.deleteMany({});
  });

  describe('Basic Model Validation', () => {
    test('should create a valid LearningSession with required fields', async () => {
      const sessionData = {
        userId: 'user123',
        nodeId: new mongoose.Types.ObjectId(),
        skillId: new mongoose.Types.ObjectId()
      };

      const session = new LearningSession(sessionData);
      const savedSession = await session.save();

      expect(savedSession._id).toBeDefined();
      expect(savedSession.userId).toBe('user123');
      expect(savedSession.status).toBe('active'); // default value
      expect(savedSession.startTime).toBeDefined();
      expect(savedSession.duration).toBe(0);
      expect(savedSession.currentProgress).toBe(0);
    });

    test('should fail validation without required fields', async () => {
      const session = new LearningSession({});
      
      await expect(session.save()).rejects.toThrow();
    });
  });

  describe('Session Status Validation', () => {
    test('should accept valid status values', async () => {
      const validStatuses = ['active', 'paused', 'abandoned']; // Remove 'completed' since it requires reflection
      
      for (const status of validStatuses) {
        const session = new LearningSession({
          userId: 'user123',
          nodeId: new mongoose.Types.ObjectId(),
          skillId: new mongoose.Types.ObjectId(),
          status
        });
        
        const savedSession = await session.save();
        expect(savedSession.status).toBe(status);
      }
    });
  });

  describe('Reflection Data Validation', () => {
    test('should require reflection data for completed sessions', async () => {
      const session = new LearningSession({
        userId: 'user123',
        nodeId: new mongoose.Types.ObjectId(),
        skillId: new mongoose.Types.ObjectId(),
        status: 'completed'
      });

      await expect(session.save()).rejects.toThrow('Completed sessions must have reflection data');
    });

    test('should save completed session with valid reflection data', async () => {
      const session = new LearningSession({
        userId: 'user123',
        nodeId: new mongoose.Types.ObjectId(),
        skillId: new mongoose.Types.ObjectId(),
        status: 'completed',
        reflection: {
          understanding: 4,
          difficulty: 3,
          notes: 'Great learning experience',
          completionConfidence: 5,
          wouldRecommend: true,
          tags: ['helpful', 'clear']
        }
      });

      const savedSession = await session.save();
      expect(savedSession.reflection.understanding).toBe(4);
      expect(savedSession.reflection.difficulty).toBe(3);
      expect(savedSession.reflection.completionConfidence).toBe(5);
    });

    test('should validate reflection score ranges', async () => {
      const invalidScores = [0, 6, -1, 10];
      
      for (const score of invalidScores) {
        const session = new LearningSession({
          userId: 'user123',
          nodeId: new mongoose.Types.ObjectId(),
          skillId: new mongoose.Types.ObjectId(),
          status: 'completed',
          reflection: {
            understanding: score,
            difficulty: 3,
            completionConfidence: 4
          }
        });

        await expect(session.save()).rejects.toThrow();
      }
    });
  });

  describe('Progress Checkpoints', () => {
    test('should save progress checkpoints correctly', async () => {
      const session = new LearningSession({
        userId: 'user123',
        nodeId: new mongoose.Types.ObjectId(),
        skillId: new mongoose.Types.ObjectId(),
        progressCheckpoints: [
          {
            progress: 25,
            action: 'Started reading',
            metadata: { section: 'introduction' }
          },
          {
            progress: 50,
            action: 'Completed exercises',
            metadata: { exerciseCount: 5 }
          }
        ]
      });

      const savedSession = await session.save();
      expect(savedSession.progressCheckpoints).toHaveLength(2);
      expect(savedSession.progressCheckpoints[0].progress).toBe(25);
      expect(savedSession.progressCheckpoints[1].action).toBe('Completed exercises');
    });
  });

  describe('Session Timeout Handling', () => {
    test('should auto-abandon sessions exceeding 4 hours', async () => {
      const session = new LearningSession({
        userId: 'user123',
        nodeId: new mongoose.Types.ObjectId(),
        skillId: new mongoose.Types.ObjectId(),
        status: 'active',
        duration: 15000 // 15000 seconds > 4 hours (14400 seconds)
      });

      const savedSession = await session.save();
      expect(savedSession.status).toBe('abandoned');
    });

    test('should set endTime for completed sessions', async () => {
      const session = new LearningSession({
        userId: 'user123',
        nodeId: new mongoose.Types.ObjectId(),
        skillId: new mongoose.Types.ObjectId(),
        status: 'completed',
        reflection: {
          understanding: 4,
          difficulty: 3,
          completionConfidence: 5
        }
      });

      const savedSession = await session.save();
      expect(savedSession.endTime).toBeDefined();
    });
  });
});