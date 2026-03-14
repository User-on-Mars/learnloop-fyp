// Test MongoDB connection
// Run with: node test-db-connection.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...');
    console.log('URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in backend/.env');
      process.exit(1);
    }
    
    mongoose.set('strictQuery', true);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
    
    // Test creating a reflection
    const ReflectionSchema = new mongoose.Schema({
      userId: String,
      content: String,
      mood: String,
      tags: [String]
    }, { timestamps: true });
    
    const Reflection = mongoose.model('TestReflection', ReflectionSchema);
    
    const testReflection = await Reflection.create({
      userId: 'test-user-123',
      content: 'This is a test reflection',
      mood: 'Happy',
      tags: ['test']
    });
    
    console.log('✅ Test reflection created:', testReflection._id);
    
    // Clean up
    await Reflection.deleteOne({ _id: testReflection._id });
    console.log('✅ Test reflection deleted');
    
    await mongoose.connection.close();
    console.log('✅ Connection closed');
    
    console.log('\n✅ All tests passed! Database is working correctly.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testConnection();
