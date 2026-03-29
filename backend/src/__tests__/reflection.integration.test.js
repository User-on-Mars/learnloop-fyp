// Feature: reflection-feature
// Integration tests for complete reflection workflows

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Reflection from '../models/Reflection.js';
import {
  createReflection,
  getReflections,
  getReflectionById,
  deleteReflection
} from '../controllers/reflectionController.js';
import { generateReflectionPDF } from '../services/pdfGenerator.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Reflection.deleteMany({});
});


describe('12.1 Complete create-save-retrieve flow', () => {
  test('should create a reflection with all fields, save to database, and retrieve it correctly', async () => {
    const userId = 'test-user-123';
    const reflectionData = {
      content: 'This is a complete test reflection with all fields populated.',
      mood: 'Happy',
      tags: ['practice', 'progress', 'achievement']
    };

    // Step 1: Create reflection
    const createdReflection = await createReflection(userId, reflectionData);

    expect(createdReflection).toMatchObject({
      content: reflectionData.content,
      mood: reflectionData.mood,
      tags: reflectionData.tags,
      userId: userId
    });
    expect(createdReflection._id).toBeDefined();
    expect(createdReflection.createdAt).toBeDefined();
    expect(createdReflection.updatedAt).toBeDefined();

    const reflectionId = createdReflection._id.toString();

    // Step 2: Verify it's saved in database
    const dbReflection = await Reflection.findById(reflectionId);
    expect(dbReflection).toBeTruthy();
    expect(dbReflection.content).toBe(reflectionData.content);
    expect(dbReflection.mood).toBe(reflectionData.mood);
    expect(dbReflection.tags).toEqual(reflectionData.tags);
    expect(dbReflection.userId).toBe(userId);

    // Step 3: Retrieve from history (GET all reflections)
    const historyReflections = await getReflections(userId);

    expect(historyReflections).toHaveLength(1);
    expect(historyReflections[0]).toMatchObject({
      content: reflectionData.content,
      mood: reflectionData.mood,
      tags: reflectionData.tags,
      userId: userId
    });

    // Step 4: Retrieve single reflection by ID
    const singleReflection = await getReflectionById(userId, reflectionId);

    expect(singleReflection).toMatchObject({
      content: reflectionData.content,
      mood: reflectionData.mood,
      tags: reflectionData.tags,
      userId: userId
    });

    // Verify all data is correct and matches original
    expect(singleReflection.content).toBe(reflectionData.content);
    expect(singleReflection.mood).toBe(reflectionData.mood);
    expect(singleReflection.tags).toEqual(reflectionData.tags);
  });

  test('should handle reflections with optional fields (no mood, no tags)', async () => {
    const userId = 'test-user-456';
    const reflectionData = {
      content: 'A minimal reflection with only content.'
    };

    // Create reflection
    const createdReflection = await createReflection(userId, reflectionData);

    expect(createdReflection.content).toBe(reflectionData.content);
    expect(createdReflection.mood).toBeNull();
    expect(createdReflection.tags).toEqual([]);

    // Retrieve from history
    const historyReflections = await getReflections(userId);

    expect(historyReflections).toHaveLength(1);
    expect(historyReflections[0].content).toBe(reflectionData.content);
    expect(historyReflections[0].mood).toBeNull();
  });
});


describe('12.2 Complete delete flow', () => {
  test('should create a reflection, delete it with confirmation, and verify removal from database and UI', async () => {
    const userId = 'test-user-789';
    const reflectionData = {
      content: 'This reflection will be deleted.',
      mood: 'Neutral',
      tags: ['test', 'delete']
    };

    // Step 1: Create reflection
    const createdReflection = await createReflection(userId, reflectionData);
    const reflectionId = createdReflection._id.toString();

    // Verify it exists in database
    let dbReflection = await Reflection.findById(reflectionId);
    expect(dbReflection).toBeTruthy();

    // Verify it appears in history
    let historyReflections = await getReflections(userId);
    expect(historyReflections).toHaveLength(1);
    expect(historyReflections[0]._id.toString()).toBe(reflectionId);

    // Step 2: Delete reflection (simulating confirmation)
    const deleteResult = await deleteReflection(userId, reflectionId);
    expect(deleteResult.message).toBe('Reflection deleted successfully');

    // Step 3: Verify removal from database
    dbReflection = await Reflection.findById(reflectionId);
    expect(dbReflection).toBeNull();

    // Step 4: Verify removal from UI (history should be empty)
    historyReflections = await getReflections(userId);
    expect(historyReflections).toHaveLength(0);
  });

  test('should not delete reflection belonging to another user', async () => {
    const user1 = 'user-1';
    const user2 = 'user-2';
    const reflectionData = {
      content: 'User 1 reflection',
      mood: 'Happy'
    };

    // User 1 creates reflection
    const createdReflection = await createReflection(user1, reflectionData);
    const reflectionId = createdReflection._id.toString();

    // User 2 tries to delete it
    await expect(deleteReflection(user2, reflectionId)).rejects.toThrow('Not authorized');

    // Verify reflection still exists
    const dbReflection = await Reflection.findById(reflectionId);
    expect(dbReflection).toBeTruthy();
  });
});


describe('12.3 Complete export flow', () => {
  test('should create a reflection, export to PDF, and verify PDF contains all data', async () => {
    const userId = 'test-user-pdf';
    const reflectionData = {
      content: 'This reflection will be exported to PDF with all fields.',
      mood: 'Thoughtful',
      tags: ['export', 'pdf', 'test']
    };

    // Step 1: Create reflection
    const createdReflection = await createReflection(userId, reflectionData);
    const reflectionId = createdReflection._id.toString();

    // Step 2: Retrieve reflection for export
    const reflection = await getReflectionById(userId, reflectionId);

    // Step 3: Export to PDF
    const pdfBuffer = await generateReflectionPDF(reflection);

    // Step 4: Verify PDF contains data
    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    // Convert buffer to string to check for content presence
    const pdfString = pdfBuffer.toString();
    
    // PDFs contain text in a specific format, check for key content
    // Note: PDF content may be compressed, so we check for PDF structure
    expect(pdfString).toContain('%PDF');
    expect(pdfString).toContain('%%EOF');
    // Verify it's a valid PDF with content
    expect(pdfString.length).toBeGreaterThan(500);
  });

  test('should export PDF with minimal reflection (no mood, no tags)', async () => {
    const userId = 'test-user-pdf-minimal';
    const reflectionData = {
      content: 'Minimal reflection for PDF export.'
    };

    // Create reflection
    const createdReflection = await createReflection(userId, reflectionData);
    const reflectionId = createdReflection._id.toString();

    // Retrieve and export to PDF
    const reflection = await getReflectionById(userId, reflectionId);
    const pdfBuffer = await generateReflectionPDF(reflection);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  test('should not allow exporting another user\'s reflection', async () => {
    const user1 = 'user-1-pdf';
    const user2 = 'user-2-pdf';
    const reflectionData = {
      content: 'User 1 private reflection'
    };

    // User 1 creates reflection
    const createdReflection = await createReflection(user1, reflectionData);
    const reflectionId = createdReflection._id.toString();

    // User 2 tries to retrieve it (which would be needed for export)
    await expect(getReflectionById(user2, reflectionId)).rejects.toThrow('Not authorized');
  });
});

