// test-connection.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

console.log('🔍 Testing MongoDB connection...');
console.log('Connection string (hidden password):', process.env.MONGO_URI.replace(/:[^:@]*@/, ':****@'));

const client = new MongoClient(process.env.MONGO_URI);

async function run() {
  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    await client.db('admin').command({ ping: 1 });
    console.log('✅ Database pinged successfully.');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.close();
  }
}

run();