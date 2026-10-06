const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['music', 'webtoon'], default: 'music' },
  description: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  tracks: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'itemModel' // 📍 เปลี่ยนให้ดึง Model Dynamic ตาม itemModel
  }],
  createdAt: { type: Date, default: Date.now }
});

// 📍 กำหนดว่าถ้า type เป็น 'webtoon' ให้ดึงจาก Model Webtoon ถ้าเป็น 'music' ให้ดึงจาก Track
playlistSchema.virtual('itemModel').get(function () {
  return this.type === 'webtoon' ? 'Webtoon' : 'Track';
});

playlistSchema.set('toObject', { virtuals: true });
playlistSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Playlist', playlistSchema);