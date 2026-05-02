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
  const r = await SkillMapTemplate.updateMany(
    { isBuiltIn: true, $or: [{ authorCredit: '' }, { authorCredit: null }, { authorCredit: { $exists: false } }] },
    { authorCredit: 'LearnLoop' }
  );
  console.log('Updated', r.modifiedCount, 'built-in templates');
  
  // Also update admin-created templates without authorCredit
  const r2 = await SkillMapTemplate.updateMany(
    { isBuiltIn: false, createdBy: { $ne: 'user-submission' }, $or: [{ authorCredit: '' }, { authorCredit: null }] },
    { authorCredit: 'LearnLoop' }
  );
  console.log('Updated', r2.modifiedCount, 'admin-created templates');
  
  await mongoose.disconnect();
}
run();
