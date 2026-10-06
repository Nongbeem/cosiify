const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  artistImage: { type: String, default: '' },
  audioUrl: { type: String, required: true },
  coverImage: { type: String, default: '' },
  genre: { type: String, default: '' }, // 👈 เพิ่มฟิลด์รับข้อความหมวดหมู่
  genreId: { type: mongoose.Schema.Types.ObjectId, ref: 'Genre' },
  lyrics: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Track', trackSchema);