import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Notification from '../src/models/Notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const r = await Notification.deleteMany({});
  console.log('Deleted', r.deletedCount, 'notifications');
  await mongoose.disconnect();
}
run();
