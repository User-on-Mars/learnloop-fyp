import { generateReflectionPDF } from './src/services/pdfGenerator.js';
import fs from 'fs';

/**
 * Test script to verify PDF generation improvements
 * Run with: node backend/test-pdf-export.js
 */

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generation Improvements\n');

  // Test 1: Reflection with title
  console.log('Test 1: Reflection with proper title');
  const reflectionWithTitle = {
    _id: 'test-1',
    title: 'My Learning Journey with React Hooks',
    content: 'Today I learned about useState and useEffect hooks in React. The concept of closures in hooks was initially confusing, but after building a few examples, it started to make sense. I particularly enjoyed working on the counter example and seeing how state updates trigger re-renders.\n\nKey takeaways:\n- useState returns an array with current state and setter function\n- useEffect runs after every render by default\n- Dependency arrays control when effects run\n- Cleanup functions prevent memory leaks\n\nNext steps: I want to explore useContext and custom hooks to better organize my code.',
    mood: 'Energized',
    tags: ['react', 'hooks', 'javascript', 'frontend'],
    createdAt: new Date('2026-04-18T14:30:00Z'),
  };

  try {
    const pdf1 = await generateReflectionPDF(reflectionWithTitle);
    fs.writeFileSync('test-reflection-with-title.pdf', pdf1);
    console.log('✅ Generated: test-reflection-with-title.pdf');
    console.log(`   Size: ${(pdf1.length / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error('❌ Failed:', error.message, '\n');
  }

  // Test 2: Reflection with empty title (should show "Untitled Reflection")
  console.log('Test 2: Reflection with empty title');
  const reflectionEmptyTitle = {
    _id: 'test-2',
    title: '',
    content: 'This reflection has no title, so it should display "Untitled Reflection" in the PDF.',
    mood: 'Neutral',
    tags: ['test'],
    createdAt: new Date('2026-04-18T15:00:00Z'),
  };

  try {
    const pdf2 = await generateReflectionPDF(reflectionEmptyTitle);
    fs.writeFileSync('test-reflection-empty-title.pdf', pdf2);
    console.log('✅ Generated: test-reflection-empty-title.pdf');
    console.log(`   Size: ${(pdf2.length / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error('❌ Failed:', error.message, '\n');
  }

  // Test 3: Reflection with whitespace-only title
  console.log('Test 3: Reflection with whitespace-only title');
  const reflectionWhitespaceTitle = {
    _id: 'test-3',
    title: '   ',
    content: 'This reflection has a whitespace-only title, which should be treated as empty.',
    mood: 'Thoughtful',
    tags: [],
    createdAt: new Date('2026-04-18T15:30:00Z'),
  };

  try {
    const pdf3 = await generateReflectionPDF(reflectionWhitespaceTitle);
    fs.writeFileSync('test-reflection-whitespace-title.pdf', pdf3);
    console.log('✅ Generated: test-reflection-whitespace-title.pdf');
    console.log(`   Size: ${(pdf3.length / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error('❌ Failed:', error.message, '\n');
  }

  // Test 4: Long content to test pagination
  console.log('Test 4: Long reflection to test pagination');
  const longContent = Array(20)
    .fill(
      'This is a paragraph of text that will be repeated multiple times to test how the PDF handles long content and pagination. The goal is to ensure that content flows naturally across pages without creating unnecessary blank pages at the end.'
    )
    .join('\n\n');

  const reflectionLongContent = {
    _id: 'test-4',
    title: 'Deep Dive into Advanced TypeScript Patterns',
    content: longContent,
    mood: 'Happy',
    tags: ['typescript', 'advanced', 'patterns', 'generics', 'types'],
    createdAt: new Date('2026-04-18T16:00:00Z'),
  };

  try {
    const pdf4 = await generateReflectionPDF(reflectionLongContent);
    fs.writeFileSync('test-reflection-long-content.pdf', pdf4);
    console.log('✅ Generated: test-reflection-long-content.pdf');
    console.log(`   Size: ${(pdf4.length / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error('❌ Failed:', error.message, '\n');
  }

  // Test 5: Minimal reflection (no mood, no tags)
  console.log('Test 5: Minimal reflection');
  const reflectionMinimal = {
    _id: 'test-5',
    title: 'Quick Note',
    content: 'Just a quick reflection with minimal metadata.',
    mood: null,
    tags: [],
    createdAt: new Date('2026-04-18T16:30:00Z'),
  };

  try {
    const pdf5 = await generateReflectionPDF(reflectionMinimal);
    fs.writeFileSync('test-reflection-minimal.pdf', pdf5);
    console.log('✅ Generated: test-reflection-minimal.pdf');
    console.log(`   Size: ${(pdf5.length / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error('❌ Failed:', error.message, '\n');
  }

  console.log('🎉 PDF generation tests completed!');
  console.log('\nGenerated files:');
  console.log('  - test-reflection-with-title.pdf');
  console.log('  - test-reflection-empty-title.pdf');
  console.log('  - test-reflection-whitespace-title.pdf');
  console.log('  - test-reflection-long-content.pdf');
  console.log('  - test-reflection-minimal.pdf');
  console.log('\nPlease review these PDFs to verify:');
  console.log('  ✓ Titles display correctly (or "Untitled Reflection" when empty)');
  console.log('  ✓ Layout is well-aligned and professional');
  console.log('  ✓ No unnecessary blank pages');
  console.log('  ✓ Content flows naturally across pages');
  console.log('  ✓ Footer appears on all pages');
}

testPDFGeneration().catch(console.error);
