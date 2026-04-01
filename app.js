// app.js – cPanel Passenger entry point
// Phusion Passenger (used by cPanel) requires this file as the app entry point.
// It imports the configured Express app from server.js.

const app = require('./server');

// Passenger automatically binds to the correct port.
// If not running under Passenger, server.js handles app.listen() itself.
