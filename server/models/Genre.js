const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['webtoon', 'music', 'ebook', 'audiobook'], 
    required: true 
  }
});

module.exports = mongoose.model('Genre', genreSchema);