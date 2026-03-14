import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import Reflection from '../Reflection.js'

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()
  await mongoose.connect(mongoUri)
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

afterEach(async () => {
  await Reflection.deleteMany({})
})

describe('Reflection Model Validation', () => {
  describe('Content validation', () => {
    test('should accept content up to 10000 characters', async () => {
      const validReflection = {
        userId: 'test-user-123',
        content: 'a'.repeat(10000),
        mood: 'Happy',
        tags: []
      }
      
      const reflection = await Reflection.create(validReflection)
      expect(reflection.content).toHaveLength(10000)
    })

    test('should reject content exceeding 10000 characters', async () => {
      const invalidReflection = {
        userId: 'test-user-123',
        content: 'a'.repeat(10001),
        mood: 'Happy',
        tags: []
      }
      
      await expect(Reflection.create(invalidReflection)).rejects.toThrow()
    })

    test('should reject reflection without content', async () => {
      const invalidReflection = {
        userId: 'test-user-123',
        mood: 'Happy',
        tags: []
      }
      
      await expect(Reflection.create(invalidReflection)).rejects.toThrow()
    })
  })

  describe('Mood enum validation', () => {
    test('should accept valid mood values', async () => {
      const validMoods = ['Happy', 'Neutral', 'Sad', 'Energized', 'Thoughtful']
      
      for (const mood of validMoods) {
        const reflection = await Reflection.create({
          userId: 'test-user-123',
          content: 'Test reflection',
          mood: mood,
          tags: []
        })
        expect(reflection.mood).toBe(mood)
      }
    })

    test('should accept null mood value', async () => {
      const reflection = await Reflection.create({
        userId: 'test-user-123',
        content: 'Test reflection',
        mood: null,
        tags: []
      })
      expect(reflection.mood).toBeNull()
    })

    test('should accept undefined mood value (defaults to null)', async () => {
      const reflection = await Reflection.create({
        userId: 'test-user-123',
        content: 'Test reflection',
        tags: []
      })
      expect(reflection.mood).toBeNull()
    })

    test('should reject invalid mood values', async () => {
      const invalidReflection = {
        userId: 'test-user-123',
        content: 'Test reflection',
        mood: 'InvalidMood',
        tags: []
      }
      
      await expect(Reflection.create(invalidReflection)).rejects.toThrow()
    })
  })

  describe('Tag validation', () => {
    test('should accept tags up to 50 characters', async () => {
      const validTag = 'a'.repeat(50)
      const reflection = await Reflection.create({
        userId: 'test-user-123',
        content: 'Test reflection',
        mood: 'Happy',
        tags: [validTag]
      })
      
      expect(reflection.tags[0]).toHaveLength(50)
    })

    test('should reject tags exceeding 50 characters', async () => {
      const invalidTag = 'a'.repeat(51)
      const invalidReflection = {
        userId: 'test-user-123',
        content: 'Test reflection',
        mood: 'Happy',
        tags: [invalidTag]
      }
      
      await expect(Reflection.create(invalidReflection)).rejects.toThrow()
    })

    test('should accept multiple tags', async () => {
      const reflection = await Reflection.create({
        userId: 'test-user-123',
        content: 'Test reflection',
        mood: 'Happy',
        tags: ['tag1', 'tag2', 'tag3']
      })
      
      expect(reflection.tags).toHaveLength(3)
      expect(reflection.tags).toEqual(['tag1', 'tag2', 'tag3'])
    })

    test('should accept empty tags array', async () => {
      const reflection = await Reflection.create({
        userId: 'test-user-123',
        content: 'Test reflection',
        mood: 'Happy',
        tags: []
      })
      
      expect(reflection.tags).toEqual([])
    })
  })

  describe('Required fields', () => {
    test('should require userId', async () => {
      const invalidReflection = {
        content: 'Test reflection',
        mood: 'Happy',
        tags: []
      }
      
      await expect(Reflection.create(invalidReflection)).rejects.toThrow()
    })

    test('should require content', async () => {
      const invalidReflection = {
        userId: 'test-user-123',
        mood: 'Happy',
        tags: []
      }
      
      await expect(Reflection.create(invalidReflection)).rejects.toThrow()
    })

    test('should create reflection with all required fields', async () => {
      const validReflection = {
        userId: 'test-user-123',
        content: 'Test reflection'
      }
      
      const reflection = await Reflection.create(validReflection)
      expect(reflection.userId).toBe('test-user-123')
      expect(reflection.content).toBe('Test reflection')
      expect(reflection.createdAt).toBeInstanceOf(Date)
      expect(reflection.updatedAt).toBeInstanceOf(Date)
    })
  })
})
