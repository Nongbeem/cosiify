const mongoose = require('mongoose');

const ebookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  authorImage: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  synopsis: { type: String, default: '' },
  plot: { type: String, default: '' },
  price: { type: Number, default: 0 },

  content: { type: String, default: '' },
  description: { type: String, default: '' },
  contentFiles: [{ type: String }],

  // บันทึก ID ของผู้ใช้ที่ซื้อ E-book เล่มนี้
  purchasedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.models.Ebook || mongoose.model('Ebook', ebookSchema);