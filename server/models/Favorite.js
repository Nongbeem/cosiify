const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contentType: { 
    type: String, 
    enum: ['Ebook', 'Webtoon', 'Audiobook', 'Track', 'ebook', 'webtoon', 'audiobook', 'track'], 
    required: true 
  },
  contentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'contentTypeModel' // อ้างอิง Model แบบ Dynamic
  },
  createdAt: { type: Date, default: Date.now }
});

// Virtual field ช่วยเปลี่ยน contentType เป็นชื่อ Model สำหรับ Mongoose Dynamic Populate
favoriteSchema.virtual('contentTypeModel').get(function () {
  const map = {
    ebook: 'Ebook',
    webtoon: 'Webtoon',
    audiobook: 'Audiobook',
    track: 'Track',
    Ebook: 'Ebook',
    Webtoon: 'Webtoon',
    Audiobook: 'Audiobook',
    Track: 'Track'
  };
  return map[this.contentType] || this.contentType;
});

favoriteSchema.set('toObject', { virtuals: true });
favoriteSchema.set('toJSON', { virtuals: true });

favoriteSchema.index({ userId: 1, contentType: 1, contentId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);