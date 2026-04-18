import PDFDocument from 'pdfkit';

// Brand colors
const GREEN = '#2e5023';
const GRAY = '#475569';
const GRAY_LIGHT = '#94a3b8';
const BLACK = '#0f172a';

// Mood labels
const MOOD_LABELS = {
  Happy: 'Feeling Happy',
  Neutral: 'Feeling Neutral',
  Sad: 'Feeling Challenged',
  Energized: 'Feeling Energized',
  Thoughtful: 'Feeling Thoughtful',
};

export async function generateReflectionPDF(reflection) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 72,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 72;
      const contentWidth = pageWidth - (margin * 2);

      // ── Top Right: Copyright ──
      doc.fontSize(9).font('Helvetica').fillColor(GRAY)
         .text('© LearnLoop - Reflective Skill Development Tracker', 
               margin, 
               margin - 20, 
               { 
                 width: contentWidth, 
                 align: 'right' 
               });
      
      let y = margin;

      // ── Top Left: Date, Mood, Tags ──
      // Date
      const date = new Date(reflection.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor(BLACK)
         .text('Date: ', margin, y, { continued: true })
         .font('Helvetica').fillColor(GRAY)
         .text(date);
      
      y = doc.y + 8;

      // Mood
      if (reflection.mood) {
        const moodText = MOOD_LABELS[reflection.mood] || reflection.mood;
        doc.fontSize(10).font('Helvetica-Bold').fillColor(BLACK)
           .text('Mood: ', margin, y, { continued: true })
           .font('Helvetica').fillColor(GREEN)
           .text(moodText);
        y = doc.y + 8;
      }

      // Tags
      if (reflection.tags && reflection.tags.length > 0) {
        const tagsText = reflection.tags.join(', ');
        doc.fontSize(10).font('Helvetica-Bold').fillColor(BLACK)
           .text('Tags: ', margin, y, { continued: true })
           .font('Helvetica').fillColor(GRAY_LIGHT)
           .text(tagsText);
        y = doc.y + 8;
      }

      y += 30;

      // ── Title (Centered, Bold) ──
      let title = 'Untitled Reflection';
      if (reflection.title && typeof reflection.title === 'string') {
        const trimmedTitle = reflection.title.trim();
        if (trimmedTitle.length > 0) {
          title = trimmedTitle;
        }
      }
      
      doc.fontSize(20).font('Helvetica-Bold').fillColor(BLACK)
         .text(title, margin, y, { 
           width: contentWidth, 
           align: 'center' 
         });
      
      y = doc.y + 30;

      // Horizontal line before content
      doc.moveTo(margin, y).lineTo(pageWidth - margin, y)
         .lineWidth(0.5).strokeColor(GRAY_LIGHT).stroke();
      
      y += 25;

      // ── Content (Justified, Proper Paragraphs) ──
      doc.fontSize(11).font('Helvetica').fillColor(BLACK);
      
      // Split content into paragraphs
      const paragraphs = reflection.content.split('\n');
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i].trim();
        
        // Skip empty paragraphs
        if (!paragraph) {
          y += 6;
          continue;
        }
        
        // Check if we need a new page
        if (y > pageHeight - margin - 50) {
          doc.addPage({ margin: 72 });
          
          // Add header on new page
          doc.fontSize(9).font('Helvetica').fillColor(GRAY)
             .text('© LearnLoop - Reflective Skill Development Tracker', 
                   margin, 
                   margin - 20, 
                   { 
                     width: contentWidth, 
                     align: 'right' 
                   });
          
          y = margin + 20;
        }
        
        // Add paragraph
        doc.text(paragraph, margin, y, {
          width: contentWidth,
          align: 'justify',
          lineGap: 3,
        });
        
        y = doc.y + 12;
      }

      // No footer - removed entirely as requested

      doc.end();
    } catch (error) {
      console.error('PDF Generation Error:', error);
      reject(error);
    }
  });
}
