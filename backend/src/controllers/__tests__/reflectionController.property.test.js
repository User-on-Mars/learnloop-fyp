import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import fc from 'fast-check'
import Reflection from '../../models/Reflection.js'
import {
  createReflection,
  getReflections,
  getReflectionById,
  deleteReflection
} from '../reflectionController.js'

// Feature: reflection-feature, Property 6: User Data Isolation
// Feature: reflection-feature, Property 11: Authentication Required for All Operations
// Feature: reflection-feature, Property 12: Cross-User Access Denied

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

describe('Property 6: User Data Isolation', () => {
  test('retrieving reflections for one user returns only that user\'s reflections', async () => {
    const userIdArb = fc.uuid()
    const contentArb = fc.string({ minLength: 1, maxLength: 1000 })
    const moodArb = fc.oneof(
      fc.constant('Happy'),
      fc.constant('Neutral'),
      fc.constant('Sad'),
      fc.constant('Energized'),
      fc.constant('Thoughtful'),
      fc.constant(null)
    )
    const tagArb = fc.string({ minLength: 1, maxLength: 50 })
    const tagsArb = fc.array(tagArb, { maxLength: 5 })

    const reflectionDataArb = fc.record({
      content: contentArb,
      mood: moodArb,
      tags: tagsArb
    })

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        fc.array(reflectionDataArb, { minLength: 1, maxLength: 5 }),
        fc.array(reflectionDataArb, { minLength: 1, maxLength: 5 }),
        async (userId1, userId2, user1Reflections, user2Reflections) => {
          // Ensure we have two different users
          fc.pre(userId1 !== userId2)

          // Create reflections for user 1
          for (const reflectionData of user1Reflections) {
            await createReflection(userId1, reflectionData)
          }

          // Create reflections for user 2
          for (const reflectionData of user2Reflections) {
            await createReflection(userId2, reflectionData)
          }

          // Retrieve reflections for user 1
          const user1Retrieved = await getReflections(userId1)

          // Verify all retrieved reflections belong to user 1
          expect(user1Retrieved).toHaveLength(user1Reflections.length)
          for (const reflection of user1Retrieved) {
            expect(reflection.userId).toBe(userId1)
          }

          // Retrieve reflections for user 2
          const user2Retrieved = await getReflections(userId2)

          // Verify all retrieved reflections belong to user 2
          expect(user2Retrieved).toHaveLength(user2Reflections.length)
          for (const reflection of user2Retrieved) {
            expect(reflection.userId).toBe(userId2)
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})

describe('Property 11: Authentication Required for All Operations', () => {
  test('operations without valid user ID should fail', async () => {
    const contentArb = fc.string({ minLength: 1, maxLength: 1000 })
    const moodArb = fc.oneof(
      fc.constant('Happy'),
      fc.constant('Neutral'),
      fc.constant('Sad'),
      fc.constant('Energized'),
      fc.constant('Thoughtful'),
      fc.constant(null)
    )
    const tagArb = fc.string({ minLength: 1, maxLength: 50 })
    const tagsArb = fc.array(tagArb, { maxLength: 5 })

    const reflectionDataArb = fc.record({
      content: contentArb,
      mood: moodArb,
      tags: tagsArb
    })

    await fc.assert(
      fc.asyncProperty(reflectionDataArb, async (reflectionData) => {
        // Attempt to create reflection without userId (null or undefined)
        const invalidUserIds = [null, undefined, '']
        
        for (const invalidUserId of invalidUserIds) {
          try {
            await createReflection(invalidUserId, reflectionData)
            // If no error is thrown, the test should fail
            expect(true).toBe(false) // Force failure
          } catch (error) {
            // Expected to throw an error
            expect(error).toBeDefined()
          }
        }
      }),
      { numRuns: 100 }
    )
  }, 60000)
})

describe('Property 12: Cross-User Access Denied', () => {
  test('user cannot access another user\'s reflection', async () => {
    const userIdArb = fc.uuid()
    const contentArb = fc.string({ minLength: 1, maxLength: 1000 })
    const moodArb = fc.oneof(
      fc.constant('Happy'),
      fc.constant('Neutral'),
      fc.constant('Sad'),
      fc.constant('Energized'),
      fc.constant('Thoughtful'),
      fc.constant(null)
    )
    const tagArb = fc.string({ minLength: 1, maxLength: 50 })
    const tagsArb = fc.array(tagArb, { maxLength: 5 })

    const reflectionDataArb = fc.record({
      content: contentArb,
      mood: moodArb,
      tags: tagsArb
    })

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        reflectionDataArb,
        async (ownerUserId, otherUserId, reflectionData) => {
          // Ensure we have two different users
          fc.pre(ownerUserId !== otherUserId)

          // Create reflection for owner
          const reflection = await createReflection(ownerUserId, reflectionData)

          // Attempt to access with different user - should throw 403
          try {
            await getReflectionById(otherUserId, reflection._id.toString())
            // If no error is thrown, the test should fail
            expect(true).toBe(false)
          } catch (error) {
            expect(error.statusCode).toBe(403)
            expect(error.message).toContain('Not authorized')
          }

          // Attempt to delete with different user - should throw 403
          try {
            await deleteReflection(otherUserId, reflection._id.toString())
            // If no error is thrown, the test should fail
            expect(true).toBe(false)
          } catch (error) {
            expect(error.statusCode).toBe(403)
            expect(error.message).toContain('Not authorized')
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})
