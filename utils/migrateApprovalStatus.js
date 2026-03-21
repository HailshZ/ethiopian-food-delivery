// utils/migrateApprovalStatus.js – One-time migration to stamp approvalStatus on existing data
// Run: node utils/migrateApprovalStatus.js

require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;

        // Update all dishes without approvalStatus
        const dishResult = await db.collection('dishes').updateMany(
            { approvalStatus: { $exists: false } },
            { $set: { approvalStatus: 'approved' } }
        );
        console.log(`✅ Updated ${dishResult.modifiedCount} dishes → approvalStatus: 'approved'`);

        // Update all meal plans without approvalStatus
        const planResult = await db.collection('mealplans').updateMany(
            { approvalStatus: { $exists: false } },
            { $set: { approvalStatus: 'approved' } }
        );
        console.log(`✅ Updated ${planResult.modifiedCount} meal plans → approvalStatus: 'approved'`);

        // Update all users without isActive
        const userResult = await db.collection('users').updateMany(
            { isActive: { $exists: false } },
            { $set: { isActive: true } }
        );
        console.log(`✅ Updated ${userResult.modifiedCount} users → isActive: true`);

        console.log('\n🎉 Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
}

migrate();
