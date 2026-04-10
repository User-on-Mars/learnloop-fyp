/**
 * Initialize XP Settings
 * 
 * This script creates the XpSettings document with default values
 * if it doesn't already exist. Safe to run multiple times.
 * 
 * Usage: node backend/scripts/initializeXpSettings.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import model
import XpSettings from '../src/models/XpSettings.js';

async function initializeXpSettings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learnloop');
    console.log('✅ Connected to MongoDB');

    console.log('\n📋 Checking XP Settings...');
    const settings = await XpSettings.getSettings();
    
    console.log('\n✅ XP Settings initialized:');
    console.log(`   - Reflection XP: ${settings.reflectionXp}`);
    console.log(`   - Practice XP per Minute: ${settings.practiceXpPerMinute}`);
    console.log(`   - 5-Day Streak Multiplier: ${settings.streak5DayMultiplier}x`);
    console.log(`   - 7+ Day Streak Multiplier: ${settings.streak7DayMultiplier}x`);
    
    console.log('\n✨ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

initializeXpSettings();
