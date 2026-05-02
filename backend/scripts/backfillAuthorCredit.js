import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import SkillMapTemplate from '../src/models/SkillMapTemplate.js';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function backfillAuthorCredit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find user-submitted templates without authorCredit
    const templates = await SkillMapTemplate.find({
      isBuiltIn: false,
      $or: [
        { authorCredit: '' },
        { authorCredit: null },
        { authorCredit: { $exists: false } }
      ]
    }).lean();

    console.log(`Found ${templates.length} templates missing authorCredit`);

    for (const t of templates) {
      const user = await User.findOne({ firebaseUid: t.createdBy }).select('name').lean();
      if (user) {
        await SkillMapTemplate.updateOne({ _id: t._id }, { authorCredit: user.name });
        console.log(`  ✅ "${t.title}" -> authorCredit: "${user.name}"`);
      } else {
        console.log(`  ⚠️ "${t.title}" - no user found for createdBy: ${t.createdBy}`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

backfillAuthorCredit();
