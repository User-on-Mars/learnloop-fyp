import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Skill from '../src/models/Skill.js';
import SkillMapTemplate from '../src/models/SkillMapTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected');

  // Find all template-based skill maps without authorCredit
  const skills = await Skill.find({
    fromTemplate: true,
    $or: [{ authorCredit: '' }, { authorCredit: null }, { authorCredit: { $exists: false } }]
  }).lean();

  console.log(`Found ${skills.length} template skill maps without authorCredit`);

  for (const skill of skills) {
    // Try to find the matching template by name
    const template = await SkillMapTemplate.findOne({
      title: skill.name.replace(/\s*\(\d+\)$/, '') // Remove " (2)" suffix
    }).select('authorCredit').lean();

    if (template && template.authorCredit) {
      await Skill.updateOne({ _id: skill._id }, { authorCredit: template.authorCredit });
      console.log(`  ✅ "${skill.name}" -> "${template.authorCredit}"`);
    } else {
      // Default to LearnLoop for template-based maps
      await Skill.updateOne({ _id: skill._id }, { authorCredit: 'LearnLoop' });
      console.log(`  ✅ "${skill.name}" -> "LearnLoop" (no template match)`);
    }
  }

  await mongoose.disconnect();
  console.log('Done');
}
run();
