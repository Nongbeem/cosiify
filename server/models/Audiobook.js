const mongoose = require('mongoose');

const audiobookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  authorImage: { type: String, default: '' },
  narrator: { type: String, default: '' },
  coverImage: { type: String, required: true },
  audioUrl: { type: String, required: true },
  genre: { type: String, default: '' }, // 👈 เพิ่มฟิลด์หมวดหมู่
  synopsis: { type: String, default: '' },
  tokensReward: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Audiobook || mongoose.model('Audiobook', audiobookSchema);