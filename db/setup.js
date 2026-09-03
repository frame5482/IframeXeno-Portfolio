const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/artfolio';

// Serverless functions re-run this module on every cold start, so the
// connection is cached on globalThis to avoid opening a new pool each time.
const cache = globalThis.__mongooseConn || (globalThis.__mongooseConn = { promise: null });
if (!cache.promise) {
  cache.promise = mongoose.connect(MONGODB_URI)
    .then(m => { console.log('📦 Connected to MongoDB'); return m; })
    .catch(err => { cache.promise = null; console.error('❌ Failed to connect to MongoDB', err); });
}

const workSchema = new mongoose.Schema({
  title_th: { type: String, default: '' },
  title_en: { type: String, default: '' },
  title_jp: { type: String, default: '' },
  // Keeping original title for compatibility if needed, but will prioritize the others
  title: { type: String, required: true }, 
  description_th: { type: String, default: '' },
  description_en: { type: String, default: '' },
  description_jp: { type: String, default: '' },
  description: { type: String, default: '' }, // Legacy
  image_url: { type: String, default: '' },
  images: { type: [String], default: [] },
  video_url: { type: String, default: null },
  videos: { type: [String], default: [] },
  tags: { type: String, required: true },
  is_starred: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

const Work = mongoose.models.Work || mongoose.model('Work', workSchema);

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  order: { type: Number, default: 0 },
  is_highlighted: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

const Tag = mongoose.models.Tag || mongoose.model('Tag', tagSchema);

module.exports = { Work, Tag };
