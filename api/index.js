// Vercel serverless entry point.
// Every request that doesn't match a static file in /public is rewritten here
// (see vercel.json) and handled by the Express app in server.js.
module.exports = require('../server.js');
