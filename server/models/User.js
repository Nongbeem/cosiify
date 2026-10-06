const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'creator', 'admin'], 
    default: 'user' 
  },
  profileImage: { type: String, default: '' },
  tokensBalance: { type: Number, default: 0 },
  pushToken: { type: String, default: '' },

  // 📍 เก็บ ID รายการคอนเทนต์ที่ผู้ใช้ซื้อ/ปลดล็อกแล้ว
  unlockedEpisodes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Episode' }],
  unlockedEbooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ebook' }],
  unlockedAudiobooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Audiobook' }],
  purchasedEbooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ebook' }], // 📍 [เพิ่ม] เพื่อรองรับระบบซื้อ E-book ใน index.js

  // 📍 เก็บ Key รายการคอนเทนต์ที่เคยได้รับ Token แล้ว (ป้องกันการอ่านซ้ำเพื่อปั๊ม Token)
  rewardedContent: [{ type: String }],

  // 📍 เก็บชื่อศิลปิน และ ผู้แต่งที่ผู้ใช้ติดตาม (แยกตาม user)
  followingArtists: [{ type: String }],
  followingAuthors: [{ type: String }],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);