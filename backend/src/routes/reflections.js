import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { 
  validateReflectionInput, 
  handleValidationErrors,
  nodeOperationsRateLimit 
} from '../middleware/security.js'
import { z } from 'zod'
import {
  createReflection,
  getReflections,
  getReflectionById,
  deleteReflection
} from '../controllers/reflectionController.js'
import { generateReflectionPDF } from '../services/pdfGenerator.js'
import XpService from '../services/XpService.js'
import ErrorLoggingService from '../services/ErrorLoggingService.js'

const router = Router()

// Validation schema for journal reflections
const journalReflectionSchema = z.object({
  title: z.string().max(200, 'Title must be 200 characters or less').trim().optional().default(''),
  content: z.string().min(1, 'Content is required').max(10000, 'Content must be 10,000 characters or less').trim(),
  mood: z.enum(['Happy', 'Neutral', 'Sad', 'Energized', 'Thoughtful']).nullable().optional().default(null),
  tags: z.array(z.string().max(50).trim()).max(10).optional().default([])
})

const validateBody = (schema) => (req, res, next) => {
  try { req.body = schema.parse(req.body); next(); }
  catch (err) {
    if (err instanceof z.ZodError) return res.status(422).json({ message: 'Validation failed', errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })) });
    return res.status(500).json({ message: 'Validation error' });
  }
}

// All reflection routes require authentication
router.use(requireAuth)

// Apply rate limiting to reflection operations
router.use(nodeOperationsRateLimit)

// POST /api/reflections - Create a new reflection
router.post('/', 
  validateBody(journalReflectionSchema),
  async (req, res) => {
    try {
      console.log('📝 Creating reflection for user:', req.user.id)
      const reflection = await createReflection(req.user.id, req.body)
      console.log('✅ Reflection created:', reflection._id)

      // Award reflection XP if mood and content present (never blocks response)
      try {
        if (reflection.mood && reflection.content) {
          await XpService.awardXp(req.user.id, 'reflection', 20)
        }
      } catch (xpError) {
        await ErrorLoggingService.logError(xpError, {
          userId: req.user.id,
          reflectionId: reflection._id,
          operation: 'reflection_xp_award'
        })
      }

      res.status(201).json(reflection)
    } catch (error) {
      console.error('❌ Error creating reflection:', error.message)
      res.status(400).json({ 
        message: error.message,
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR'
        }
      })
    }
  }
)

// GET /api/reflections - Get all user reflections
router.get('/', async (req, res) => {
  try {
    console.log('📋 Getting reflections for user:', req.user.id)
    const reflections = await getReflections(req.user.id)
    console.log(`✅ Found ${reflections.length} reflections`)
    res.json(reflections)
  } catch (error) {
    console.error('❌ Error getting reflections:', error.message)
    res.status(500).json({
      error: {
        message: 'Failed to retrieve reflections',
        code: 'SERVER_ERROR'
      }
    })
  }
})

// GET /api/reflections/:id - Get a single reflection
router.get('/:id', async (req, res) => {
  try {
    console.log('📖 Getting reflection:', req.params.id, 'for user:', req.user.id)
    const reflection = await getReflectionById(req.user.id, req.params.id)
    console.log('✅ Reflection retrieved')
    res.json(reflection)
  } catch (error) {
    console.error('❌ Error getting reflection:', error.message)
    const statusCode = error.statusCode || 500
    res.status(statusCode).json({
      error: {
        message: error.message,
        code: statusCode === 404 ? 'NOT_FOUND' : statusCode === 403 ? 'FORBIDDEN' : 'SERVER_ERROR'
      }
    })
  }
})

// DELETE /api/reflections/:id - Delete a reflection
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ Deleting reflection:', req.params.id, 'for user:', req.user.id)
    const result = await deleteReflection(req.user.id, req.params.id)
    console.log('✅ Reflection deleted')
    res.json(result)
  } catch (error) {
    console.error('❌ Error deleting reflection:', error.message)
    const statusCode = error.statusCode || 500
    res.status(statusCode).json({
      error: {
        message: error.message,
        code: statusCode === 404 ? 'NOT_FOUND' : statusCode === 403 ? 'FORBIDDEN' : 'SERVER_ERROR'
      }
    })
  }
})

// GET /api/reflections/:id/pdf - Export reflection as PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    console.log('📄 Exporting reflection to PDF:', req.params.id, 'for user:', req.user.id)
    
    // Get the reflection with authentication and authorization checks
    const reflection = await getReflectionById(req.user.id, req.params.id)
    
    // Generate PDF
    const pdfBuffer = await generateReflectionPDF(reflection)
    
    // Format filename with date
    const date = new Date(reflection.createdAt).toISOString().split('T')[0]
    const filename = `reflection-${date}.pdf`
    
    // Set proper headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    
    console.log('✅ PDF generated successfully')
    res.send(pdfBuffer)
  } catch (error) {
    console.error('❌ Error exporting reflection to PDF:', error.message)
    const statusCode = error.statusCode || 500
    res.status(statusCode).json({
      error: {
        message: error.message,
        code: statusCode === 404 ? 'NOT_FOUND' : statusCode === 403 ? 'FORBIDDEN' : 'PDF_GENERATION_ERROR'
      }
    })
  }
})

export default router
