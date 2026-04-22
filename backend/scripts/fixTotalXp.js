import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

// Recalculate totalXp from finalAmount field in XP transactions
const totals = await db.collection('xptransactions').aggregate([
  { $group: { _id: '$userId', total: { $sum: '$finalAmount' } } }
]).toArray();

console.log('Recalculating totalXp for', totals.length, 'users...');

for (const t of totals) {
  const result = await db.collection('userxpprofiles').updateOne(
    { userId: t._id },
    { $set: { totalXp: t.total } }
  );
  console.log(t._id?.slice(-8), '→ totalXp:', t.total, result.modifiedCount ? '(updated)' : '(no change)');
}

// Verify
const profiles = await db.collection('userxpprofiles').find({}).toArray();
for (const p of profiles) {
  console.log('VERIFY:', p.userId?.slice(-8), '| totalXp:', p.totalXp, '| weeklyXp:', p.weeklyXp);
}

await mongoose.disconnect();
console.log('Done.');
