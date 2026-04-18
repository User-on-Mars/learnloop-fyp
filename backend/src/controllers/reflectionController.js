import Reflection from '../models/Reflection.js'

/**
 * Create a new reflection
 * @param {string} userId - Authenticated user ID
 * @param {object} reflectionData - Reflection data (content, mood, tags)
 * @returns {Promise<object>} Created reflection document
 */
export async function createReflection(userId, reflectionData) {
  const { title, content, mood, tags } = reflectionData

  // Validate title if provided
  if (title !== undefined && title !== null) {
    if (typeof title !== 'string') {
      throw new Error('Title must be a string')
    }
    if (title.length > 200) {
      throw new Error('Title must not exceed 200 characters')
    }
  }

  // Validate required fields
  if (!content || typeof content !== 'string') {
    throw new Error('Content is required and must be a string')
  }

  if (content.length > 10000) {
    throw new Error('Content must not exceed 10000 characters')
  }

  // Validate mood if provided
  const validMoods = ['Happy', 'Neutral', 'Sad', 'Energized', 'Thoughtful']
  if (mood !== null && mood !== undefined && !validMoods.includes(mood)) {
    throw new Error(`Mood must be one of: ${validMoods.join(', ')}`)
  }

  // Validate tags if provided
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.length > 50) {
        throw new Error('Each tag must be a string with max 50 characters')
      }
    }
  }

  const reflection = await Reflection.create({
    userId,
    title: title || '',
    content,
    mood: mood || null,
    tags: tags || []
  })

  return reflection
}

/**
 * Get all reflections for a user
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<Array>} Array of reflection documents sorted by createdAt descending
 */
export async function getReflections(userId) {
  const reflections = await Reflection.find({ userId })
    .sort({ createdAt: -1 })
    .lean()

  return reflections
}

/**
 * Get a single reflection by ID
 * @param {string} userId - Authenticated user ID
 * @param {string} reflectionId - Reflection document ID
 * @returns {Promise<object>} Reflection document
 * @throws {Error} If reflection not found or user not authorized
 */
export async function getReflectionById(userId, reflectionId) {
  const reflection = await Reflection.findById(reflectionId).lean()

  if (!reflection) {
    const error = new Error('Reflection not found')
    error.statusCode = 404
    throw error
  }

  // Check authorization - user must own the reflection
  if (reflection.userId !== userId) {
    const error = new Error('Not authorized to access this reflection')
    error.statusCode = 403
    throw error
  }

  return reflection
}

/**
 * Delete a reflection
 * @param {string} userId - Authenticated user ID
 * @param {string} reflectionId - Reflection document ID
 * @returns {Promise<object>} Success message
 * @throws {Error} If reflection not found or user not authorized
 */
export async function deleteReflection(userId, reflectionId) {
  const reflection = await Reflection.findById(reflectionId)

  if (!reflection) {
    const error = new Error('Reflection not found')
    error.statusCode = 404
    throw error
  }

  // Check authorization - user must own the reflection
  if (reflection.userId !== userId) {
    const error = new Error('Not authorized to delete this reflection')
    error.statusCode = 403
    throw error
  }

  await Reflection.findByIdAndDelete(reflectionId)

  return { message: 'Reflection deleted successfully' }
}
