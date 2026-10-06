const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contentType: { 
    type: String, 
    enum: ['webtoon', 'episode', 'ebook', 'audiobook', 'track'], 
    required: true 
  },
  contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);