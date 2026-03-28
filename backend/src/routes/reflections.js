import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { 
  validateReflectionInput, 
  handleValidationErrors,
  nodeOperationsRateLimit 
} from '../middleware/security.js'
import { validateRequest, reflectionDataSchema } from '../middleware/validation.js'
import {
  createReflection,
  getReflections,
  getReflectionById,
  deleteReflection
} from '../controllers/reflectionController.js'
import { generateReflectionPDF } from '../services/pdfGenerator.js'

const router = Router()

// All reflection routes require authentication
router.use(requireAuth)

// Apply rate limiting to reflection operations
router.use(nodeOperationsRateLimit)

// POST /api/reflections - Create a new reflection
router.post('/', 
  validateRequest(reflectionDataSchema),
  async (req, res) => {
    try {
      console.log('📝 Creating reflection for user:', req.user.id)
      const reflection = await createReflection(req.user.id, req.body)
      console.log('✅ Reflection created:', reflection._id)
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
