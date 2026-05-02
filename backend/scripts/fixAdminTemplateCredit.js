import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import SkillMapTemplate from '../src/models/SkillMapTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Set all non-user-submission templates to "LearnLoop"
  const r = await SkillMapTemplate.updateMany(
    { createdBy: { $ne: 'user-submission' } },
    { authorCredit: 'LearnLoop' }
  );
  console.log('Updated', r.modifiedCount, 'templates to LearnLoop');
  
  await mongoose.disconnect();
}
run();
