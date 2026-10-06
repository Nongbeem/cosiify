const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: [
      'track', 'webtoon', 'chapter', 'ebook', 'audiobook', 'song',
      'new_content', 'new_track', 'new_webtoon', 'new_episode', 'new_ebook', 'new_audiobook'
    ], 
    default: 'new_content' 
  },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: false },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);