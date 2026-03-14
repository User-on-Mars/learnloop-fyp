import { describe, it, expect } from '@jest/globals';
import { generateReflectionPDF } from '../pdfGenerator.js';

describe('PDF Generator Unit Tests', () => {
  describe('generateReflectionPDF', () => {
    it('should generate PDF with complete reflection data', async () => {
      const reflection = {
        _id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        content: 'Today I practiced scales for 30 minutes. I noticed my finger positioning has improved significantly.',
        mood: 'Happy',
        tags: ['scales', 'technique', 'progress'],
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z')
      };

      const pdfBuffer = await generateReflectionPDF(reflection);

      // Verify buffer is valid
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Verify PDF header
      const pdfString = pdfBuffer.toString('latin1');
      expect(pdfString).toContain('%PDF');
      
      // Verify PDF has proper structure (contains required PDF objects)
      expect(pdfString).toContain('/Type /Page');
      expect(pdfString).toContain('/Type /Catalog');
      expect(pdfString).toContain('endobj');
      expect(pdfString).toContain('%%EOF');
    });

    it('should generate PDF with missing optional fields (mood, tags)', async () => {
      const reflection = {
        _id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        content: 'A simple reflection without mood or tags.',
        mood: null,
        tags: [],
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z')
      };

      const pdfBuffer = await generateReflectionPDF(reflection);

      // Verify buffer is valid
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Verify PDF structure
      const pdfString = pdfBuffer.toString('latin1');
      expect(pdfString).toContain('%PDF');
      expect(pdfString).toContain('/Type /Page');
      expect(pdfString).toContain('%%EOF');
    });

    it('should generate PDF with empty tags array', async () => {
      const reflection = {
        _id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        content: 'Reflection with mood but no tags.',
        mood: 'Thoughtful',
        tags: [],
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z')
      };

      const pdfBuffer = await generateReflectionPDF(reflection);

      // Verify buffer is valid
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Verify PDF structure
      const pdfString = pdfBuffer.toString('latin1');
      expect(pdfString).toContain('%PDF');
      expect(pdfString).toContain('/Type /Page');
    });

    it('should handle long content correctly', async () => {
      const longContent = 'This is a very long reflection. '.repeat(300); // ~9600 characters
      
      const reflection = {
        _id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        content: longContent,
        mood: 'Energized',
        tags: ['long', 'detailed'],
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z')
      };

      const pdfBuffer = await generateReflectionPDF(reflection);

      // Verify buffer is valid
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Verify PDF structure
      const pdfString = pdfBuffer.toString('latin1');
      expect(pdfString).toContain('%PDF');
    });

    it('should handle special characters in content', async () => {
      const reflection = {
        _id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        content: 'Special chars: @#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~',
        mood: 'Neutral',
        tags: ['special', 'test'],
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z')
      };

      const pdfBuffer = await generateReflectionPDF(reflection);

      // Verify buffer is valid
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Verify PDF structure
      const pdfString = pdfBuffer.toString('latin1');
      expect(pdfString).toContain('%PDF');
    });

    it('should handle all mood types', async () => {
      const moods = ['Happy', 'Neutral', 'Sad', 'Energized', 'Thoughtful'];
      
      for (const mood of moods) {
        const reflection = {
          _id: '507f1f77bcf86cd799439011',
          userId: '507f1f77bcf86cd799439012',
          content: `Testing ${mood} mood`,
          mood: mood,
          tags: [],
          createdAt: new Date('2024-01-15T10:30:00Z'),
          updatedAt: new Date('2024-01-15T10:30:00Z')
        };

        const pdfBuffer = await generateReflectionPDF(reflection);

        // Verify buffer is valid
        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(0);

        // Verify PDF structure
        const pdfString = pdfBuffer.toString('latin1');
        expect(pdfString).toContain('%PDF');
        expect(pdfString).toContain('/Type /Page');
      }
    });

    it('should reject invalid reflection data', async () => {
      const invalidReflection = null;

      await expect(generateReflectionPDF(invalidReflection)).rejects.toThrow();
    });
  });
});
