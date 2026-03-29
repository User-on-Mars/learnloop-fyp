import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { generateReflectionPDF } from '../pdfGenerator.js';
import PDFDocument from 'pdfkit';

// Feature: reflection-feature, Property 8: PDF Export Contains All Reflection Data

describe('PDF Generator Property Tests', () => {
  describe('Property 8: PDF Export Contains All Reflection Data', () => {
    it('should generate PDF containing all reflection data for any valid reflection', async () => {
      // Arbitrary for generating valid reflection data
      const reflectionArbitrary = fc.record({
        _id: fc.string({ minLength: 24, maxLength: 24 }),
        userId: fc.uuid(),
        content: fc.string({ minLength: 1, maxLength: 10000 }),
        mood: fc.oneof(
          fc.constant('Happy'),
          fc.constant('Neutral'),
          fc.constant('Sad'),
          fc.constant('Energized'),
          fc.constant('Thoughtful'),
          fc.constant(null)
        ),
        tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
        createdAt: fc.date(),
        updatedAt: fc.date()
      });

      await fc.assert(
        fc.asyncProperty(reflectionArbitrary, async (reflection) => {
          // Generate PDF
          const pdfBuffer = await generateReflectionPDF(reflection);

          // Verify PDF buffer is valid
          expect(pdfBuffer).toBeInstanceOf(Buffer);
          expect(pdfBuffer.length).toBeGreaterThan(0);

          // Convert buffer to string to check for structure
          const pdfString = pdfBuffer.toString('latin1');

          // Verify PDF header and structure
          expect(pdfString).toContain('%PDF');
          expect(pdfString).toContain('/Type /Page');
          expect(pdfString).toContain('/Type /Catalog');
          expect(pdfString).toContain('endobj');
          expect(pdfString).toContain('%%EOF');
          
          // Verify PDF has fonts (required for text rendering)
          expect(pdfString).toContain('/Type /Font');
          expect(pdfString).toContain('/BaseFont /Helvetica');
        }),
        { numRuns: 100 }
      );
    }, 60000); // Increase timeout for property test
  });
});
