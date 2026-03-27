#!/usr/bin/env node
// utils/generateVapidKeys.js – Run once to generate VAPID keys for .env
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();

console.log('=== Add these to your .env file ===');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@ethiofood.com`);
