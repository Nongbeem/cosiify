const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
  webtoonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Webtoon', required: true },
  episodeNumber: { type: Number, required: true },
  title: { type: String, required: true },
  coverImage: { type: String, default: '' }, // 📍 เพิ่มฟิลด์นี้เพื่อเซฟรูปปกตอน
  imageUrls: [{ type: String, required: true }],
  bgMusicTrackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Track', default: null },
  tokensReward: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Episode', episodeSchema);