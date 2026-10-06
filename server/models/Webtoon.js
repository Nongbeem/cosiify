const mongoose = require('mongoose');

const webtoonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  authorImage: { type: String, default: '' },
  synopsis: { type: String, default: '' }, // 👈 เปลี่ยนจาก description เป็น synopsis ให้ตรงกับ Form
  coverImage: { type: String, required: true },
  genre: { type: String, default: '' }, // 👈 เพิ่มฟิลด์รับข้อความหมวดหมู่
  genreId: { type: mongoose.Schema.Types.ObjectId, ref: 'Genre' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Webtoon', webtoonSchema);