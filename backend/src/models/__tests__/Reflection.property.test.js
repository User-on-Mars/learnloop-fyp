import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import fc from 'fast-check'
import Reflection from '../Reflection.js'

// Feature: reflection-feature, Property 1: Reflection Persistence Round Trip

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

describe('Property 1: Reflection Persistence Round Trip', () => {
  test('saving and retrieving reflections preserves all data', async () => {
    // Arbitraries for generating test data
    const userIdArb = fc.uuid()
    const contentArb = fc.string({ minLength: 1, maxLength: 10000 })
    const moodArb = fc.oneof(
      fc.constant('Happy'),
      fc.constant('Neutral'),
      fc.constant('Sad'),
      fc.constant('Energized'),
      fc.constant('Thoughtful'),
      fc.constant(null)
    )
    const tagArb = fc.string({ minLength: 1, maxLength: 50 })
    const tagsArb = fc.array(tagArb, { maxLength: 10 })

    const reflectionArb = fc.record({
      userId: userIdArb,
      content: contentArb,
      mood: moodArb,
      tags: tagsArb
    })

    await fc.assert(
      fc.asyncProperty(reflectionArb, async (reflectionData) => {
        // Save reflection to database
        const savedReflection = await Reflection.create(reflectionData)
        
        // Retrieve reflection from database
        const retrievedReflection = await Reflection.findById(savedReflection._id)
        
        // Verify all fields are preserved
        expect(retrievedReflection).not.toBeNull()
        expect(retrievedReflection.userId).toBe(reflectionData.userId)
        expect(retrievedReflection.content).toBe(reflectionData.content)
        expect(retrievedReflection.mood).toBe(reflectionData.mood)
        expect(retrievedReflection.tags).toEqual(reflectionData.tags)
        expect(retrievedReflection.createdAt).toBeInstanceOf(Date)
        expect(retrievedReflection.updatedAt).toBeInstanceOf(Date)
      }),
      { numRuns: 100 }
    )
  }, 60000) // 60 second timeout for property test
})
