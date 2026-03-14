import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import Reflection from '../../models/Reflection.js'
import {
  createReflection,
  getReflections,
  getReflectionById,
  deleteReflection
} from '../reflectionController.js'

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

describe('createReflection', () => {
  test('creates reflection with valid data', async () => {
    const userId = 'user123'
    const reflectionData = {
      content: 'Today was a great practice session!',
      mood: 'Happy',
      tags: ['productive', 'focused']
    }

    const reflection = await createReflection(userId, reflectionData)

    expect(reflection).toBeDefined()
    expect(reflection.userId).toBe(userId)
    expect(reflection.content).toBe(reflectionData.content)
    expect(reflection.mood).toBe(reflectionData.mood)
    expect(reflection.tags).toEqual(reflectionData.tags)
    expect(reflection.createdAt).toBeInstanceOf(Date)
    expect(reflection.updatedAt).toBeInstanceOf(Date)
  })

  test('creates reflection without mood', async () => {
    const userId = 'user123'
    const reflectionData = {
      content: 'Practice session notes',
      mood: null,
      tags: []
    }

    const reflection = await createReflection(userId, reflectionData)

    expect(reflection.mood).toBeNull()
  })

  test('creates reflection without tags', async () => {
    const userId = 'user123'
    const reflectionData = {
      content: 'Simple reflection',
      mood: 'Neutral',
      tags: []
    }

    const reflection = await createReflection(userId, reflectionData)

    expect(reflection.tags).toEqual([])
  })

  test('throws error for missing content', async () => {
    const userId = 'user123'
    const reflectionData = {
      mood: 'Happy',
      tags: []
    }

    await expect(createReflection(userId, reflectionData)).rejects.toThrow('Content is required')
  })

  test('throws error for content exceeding max length', async () => {
    const userId = 'user123'
    const reflectionData = {
      content: 'a'.repeat(10001),
      mood: 'Happy',
      tags: []
    }

    await expect(createReflection(userId, reflectionData)).rejects.toThrow('must not exceed 10000 characters')
  })

  test('throws error for invalid mood', async () => {
    const userId = 'user123'
    const reflectionData = {
      content: 'Test content',
      mood: 'InvalidMood',
      tags: []
    }

    await expect(createReflection(userId, reflectionData)).rejects.toThrow('Mood must be one of')
  })

  test('throws error for tag exceeding max length', async () => {
    const userId = 'user123'
    const reflectionData = {
      content: 'Test content',
      mood: 'Happy',
      tags: ['a'.repeat(51)]
    }

    await expect(createReflection(userId, reflectionData)).rejects.toThrow('max 50 characters')
  })
})

describe('getReflections', () => {
  test('returns sorted results by createdAt descending', async () => {
    const userId = 'user123'

    // Create reflections with slight delays to ensure different timestamps
    const reflection1 = await createReflection(userId, {
      content: 'First reflection',
      mood: 'Happy',
      tags: []
    })

    await new Promise(resolve => setTimeout(resolve, 10))

    const reflection2 = await createReflection(userId, {
      content: 'Second reflection',
      mood: 'Neutral',
      tags: []
    })

    await new Promise(resolve => setTimeout(resolve, 10))

    const reflection3 = await createReflection(userId, {
      content: 'Third reflection',
      mood: 'Energized',
      tags: []
    })

    const reflections = await getReflections(userId)

    expect(reflections).toHaveLength(3)
    // Most recent first
    expect(reflections[0]._id.toString()).toBe(reflection3._id.toString())
    expect(reflections[1]._id.toString()).toBe(reflection2._id.toString())
    expect(reflections[2]._id.toString()).toBe(reflection1._id.toString())
  })

  test('returns empty array when user has no reflections', async () => {
    const userId = 'user123'
    const reflections = await getReflections(userId)

    expect(reflections).toEqual([])
  })

  test('returns only user\'s own reflections', async () => {
    const user1 = 'user1'
    const user2 = 'user2'

    await createReflection(user1, {
      content: 'User 1 reflection',
      mood: 'Happy',
      tags: []
    })

    await createReflection(user2, {
      content: 'User 2 reflection',
      mood: 'Sad',
      tags: []
    })

    const user1Reflections = await getReflections(user1)
    const user2Reflections = await getReflections(user2)

    expect(user1Reflections).toHaveLength(1)
    expect(user1Reflections[0].userId).toBe(user1)

    expect(user2Reflections).toHaveLength(1)
    expect(user2Reflections[0].userId).toBe(user2)
  })
})

describe('getReflectionById', () => {
  test('returns reflection with valid ID', async () => {
    const userId = 'user123'
    const created = await createReflection(userId, {
      content: 'Test reflection',
      mood: 'Happy',
      tags: ['test']
    })

    const reflection = await getReflectionById(userId, created._id.toString())

    expect(reflection).toBeDefined()
    expect(reflection._id.toString()).toBe(created._id.toString())
    expect(reflection.content).toBe('Test reflection')
  })

  test('throws 404 error for invalid ID', async () => {
    const userId = 'user123'
    const invalidId = new mongoose.Types.ObjectId().toString()

    await expect(getReflectionById(userId, invalidId)).rejects.toThrow('Reflection not found')
    
    try {
      await getReflectionById(userId, invalidId)
    } catch (error) {
      expect(error.statusCode).toBe(404)
    }
  })

  test('throws 403 error when accessing another user\'s reflection', async () => {
    const owner = 'user1'
    const other = 'user2'

    const reflection = await createReflection(owner, {
      content: 'Owner reflection',
      mood: 'Happy',
      tags: []
    })

    await expect(getReflectionById(other, reflection._id.toString())).rejects.toThrow('Not authorized')
    
    try {
      await getReflectionById(other, reflection._id.toString())
    } catch (error) {
      expect(error.statusCode).toBe(403)
    }
  })
})

describe('deleteReflection', () => {
  test('deletes reflection with valid ID', async () => {
    const userId = 'user123'
    const reflection = await createReflection(userId, {
      content: 'To be deleted',
      mood: 'Neutral',
      tags: []
    })

    const result = await deleteReflection(userId, reflection._id.toString())

    expect(result.message).toBe('Reflection deleted successfully')

    // Verify it's actually deleted
    const found = await Reflection.findById(reflection._id)
    expect(found).toBeNull()
  })

  test('throws 404 error for invalid ID', async () => {
    const userId = 'user123'
    const invalidId = new mongoose.Types.ObjectId().toString()

    await expect(deleteReflection(userId, invalidId)).rejects.toThrow('Reflection not found')
    
    try {
      await deleteReflection(userId, invalidId)
    } catch (error) {
      expect(error.statusCode).toBe(404)
    }
  })

  test('throws 403 error when deleting another user\'s reflection', async () => {
    const owner = 'user1'
    const other = 'user2'

    const reflection = await createReflection(owner, {
      content: 'Owner reflection',
      mood: 'Happy',
      tags: []
    })

    await expect(deleteReflection(other, reflection._id.toString())).rejects.toThrow('Not authorized')
    
    try {
      await deleteReflection(other, reflection._id.toString())
    } catch (error) {
      expect(error.statusCode).toBe(403)
    }

    // Verify reflection still exists
    const found = await Reflection.findById(reflection._id)
    expect(found).not.toBeNull()
  })
})
