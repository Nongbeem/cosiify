const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// สร้างโฟลเดอร์ uploads อัตโนมัติหากยังไม่มีอยู่
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Import Models
const User = require('./models/User');
const Genre = require('./models/Genre');
const Track = require('./models/Track');
const Webtoon = require('./models/Webtoon');
const Episode = require('./models/Episode');
const Ebook = require('./models/Ebook');
const Audiobook = require('./models/Audiobook');
const Notification = require('./models/Notification');
const Favorite = require('./models/Favorite');
const Playlist = require('./models/Playlist');
const Comment = require('./models/Comment');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ตั้งค่า Multer สำหรับจัดการการอัปโหลดไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// ==========================================
// API HELPER FUNCTION สำหรับสร้างการแจ้งเตือนส่งหาผู้ติดตาม
// ==========================================
const sendNotificationToFollowers = async ({ name, type, title, message, notificationType }) => {
  try {
    let users = [];
    if (name) {
      if (type === 'artist') {
        users = await User.find({ followingArtists: name });
      } else if (type === 'author') {
        users = await User.find({ followingAuthors: name });
      }
    }

    // หากไม่มีผู้ติดตามหรือไม่มีการระบุชื่อ ให้ส่งแจ้งเตือนกระจายให้ผู้ใช้งานทุกคนในระบบ (Broadcast)
    if (!users || users.length === 0) {
      users = await User.find({}, '_id');
    }

    if (users.length > 0) {
      const notifications = users.map((user) => ({
        userId: user._id,
        title,
        message,
        type: notificationType || 'new_content',
        isRead: false
      }));

      await Notification.insertMany(notifications);
      console.log(`🔔 ส่งการแจ้งเตือนถึงผู้ใช้ ${users.length} คนสำเร็จ`);
    }
  } catch (err) {
    console.error('❌ Error sending notification:', err);
  }
};

// ==========================================
// 1. API ROUTES: E-BOOK
// ==========================================

// POST /api/ebooks - เพิ่ม E-book
app.post('/api/ebooks', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'authorImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, author, synopsis, plot, content, description, price } = req.body;

    if (!title || !author) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อเรื่อง (Title) และชื่อผู้แต่ง (Author)' });
    }

    const coverImage = req.files && req.files['coverImage'] 
      ? `/uploads/${req.files['coverImage'][0].filename}` 
      : '';
    const authorImage = req.files && req.files['authorImage'] 
      ? `/uploads/${req.files['authorImage'][0].filename}` 
      : '';

    const newEbook = new Ebook({ 
      title, 
      author, 
      authorImage, 
      coverImage, 
      synopsis: synopsis || '', 
      plot: plot || '', 
      content: content || plot || '',            
      description: description || synopsis || '',
      price: Number(price) || 0
    });

    await newEbook.save();

    // 📍 [เพิ่ม] แจ้งเตือนไปยังผู้ติดตามผู้แต่ง
    sendNotificationToFollowers({
      name: author,
      type: 'author',
      title: `มี E-book ใหม่จาก ${author}`,
      message: `เรื่อง "${title}" วางจำหน่ายแล้ว เข้าไปอ่านกันเลย!`,
      notificationType: 'new_ebook'
    });

    res.status(201).json({ message: 'บันทึกข้อมูล E-book สำเร็จ!', data: newEbook });
  } catch (error) {
    console.error('❌ Save Ebook Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึก E-book', error: error.message });
  }
});

// GET /api/ebooks - ดึงรายการ E-book ทั้งหมด
app.get('/api/ebooks', async (req, res) => {
  try {
    const ebooks = await Ebook.find().sort({ createdAt: -1 });

    const formattedEbooks = ebooks.map((ebook) => {
      const item = ebook.toObject();
      return {
        ...item,
        content: item.content || item.plot || item.synopsis || '',
        description: item.description || item.synopsis || item.plot || ''
      };
    });

    res.status(200).json(formattedEbooks);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล', error: error.message });
  }
});

// GET /api/ebooks/:id - ดึงข้อมูล E-book รายเล่ม
app.get('/api/ebooks/:id', async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id);
    if (!ebook) return res.status(404).json({ message: 'ไม่พบข้อมูล E-book' });

    const item = ebook.toObject();
    const formattedEbook = {
      ...item,
      content: item.content || item.plot || item.synopsis || '',
      description: item.description || item.synopsis || item.plot || ''
    };

    res.status(200).json(formattedEbook);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล', error: error.message });
  }
});

// POST /api/ebooks/buy - ซื้อ E-book
app.post('/api/ebooks/buy', async (req, res) => {
  try {
    const { userId, ebookId } = req.body;

    if (!userId || !ebookId) {
      return res.status(400).json({ message: 'กรุณาระบุ userId และ ebookId' });
    }

    const user = await User.findById(userId);
    const ebook = await Ebook.findById(ebookId);

    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }
    if (!ebook) {
      return res.status(404).json({ message: 'ไม่พบข้อมูล E-book' });
    }

    const price = Number(ebook.price) || 0;

    const alreadyUserBought = user.purchasedEbooks && user.purchasedEbooks.some(
      (id) => id.toString() === ebookId.toString()
    );

    if (alreadyUserBought) {
      return res.status(200).json({ 
        message: 'คุณได้ทำการซื้อ E-book เล่มนี้ไปแล้ว',
        tokensBalance: user.tokensBalance 
      });
    }

    if ((user.tokensBalance || 0) < price) {
      return res.status(400).json({ message: `Token ไม่พอ (ต้องใช้ ${price} Tokens)` });
    }

    user.tokensBalance = (user.tokensBalance || 0) - price;

    if (!user.purchasedEbooks) user.purchasedEbooks = [];
    user.purchasedEbooks.push(ebookId);

    // 📍 [เพิ่ม] ซิงค์รายการไปยัง unlockedEbooks เพื่อรองรับ GET /api/users/:id/unlocked
    if (!user.unlockedEbooks) user.unlockedEbooks = [];
    if (!user.unlockedEbooks.some((id) => id.toString() === ebookId.toString())) {
      user.unlockedEbooks.push(ebookId);
    }

    if (!ebook.purchasedBy) ebook.purchasedBy = [];
    ebook.purchasedBy.push(userId);

    await user.save();
    await ebook.save();

    res.status(200).json({
      message: 'ซื้อ E-book สำเร็จ!',
      tokensBalance: user.tokensBalance,
    });
  } catch (error) {
    console.error('❌ Buy Ebook Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการซื้อ E-book', error: error.message });
  }
});

// DELETE /api/ebooks/:id - ลบ E-book [เพิ่มใหม่]
app.delete('/api/ebooks/:id', async (req, res) => {
  try {
    const deletedEbook = await Ebook.findByIdAndDelete(req.params.id);
    if (!deletedEbook) {
      return res.status(404).json({ message: 'ไม่พบ E-book ที่ต้องการลบ' });
    }
    res.status(200).json({ message: 'ลบ E-book สำเร็จ!', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบ E-book', error: error.message });
  }
});

// ==========================================
// 2. API ROUTES: TRACK / MUSIC
// ==========================================

// POST /api/tracks - เพิ่มเพลง
app.post('/api/tracks', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'artistImage', maxCount: 1 },
  { name: 'audioFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, artist, genre, lyrics } = req.body;

    const coverImage = req.files && req.files['coverImage'] 
      ? `/uploads/${req.files['coverImage'][0].filename}` 
      : '';
    const artistImage = req.files && req.files['artistImage'] 
      ? `/uploads/${req.files['artistImage'][0].filename}` 
      : '';
    const audioUrl = req.files && req.files['audioFile'] 
      ? `/uploads/${req.files['audioFile'][0].filename}` 
      : '';

    const newTrack = new Track({ 
      title, 
      artist, 
      genre, 
      coverImage, 
      artistImage, 
      audioUrl, 
      lyrics: lyrics || ''
    });

    await newTrack.save();

    // 📍 [เพิ่ม] แจ้งเตือนไปยังผู้ติดตามศิลปิน
    sendNotificationToFollowers({
      name: artist,
      type: 'artist',
      title: `มีเพลงใหม่จาก ${artist}`,
      message: `เพลง "${title}" ปล่อยออกมาแล้ว ให้รับฟังได้เลย!`,
      notificationType: 'new_track'
    });

    res.status(201).json({ message: 'บันทึกข้อมูลเพลงสำเร็จ!', data: newTrack });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกเพลง', error: error.message });
  }
});

// GET /api/tracks - ดึงรายการเพลงทั้งหมด
app.get('/api/tracks', async (req, res) => {
  try {
    const tracks = await Track.find().sort({ createdAt: -1 });
    res.status(200).json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเพลง', error: error.message });
  }
});

// GET /api/tracks/:id - ดึงข้อมูลเพลงรายเพลง
app.get('/api/tracks/:id', async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลเพลง' });
    }
    res.status(200).json(track);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเพลง', error: error.message });
  }
});

// DELETE /api/tracks/:id - ลบเพลง [เพิ่มใหม่]
app.delete('/api/tracks/:id', async (req, res) => {
  try {
    const deletedTrack = await Track.findByIdAndDelete(req.params.id);
    if (!deletedTrack) {
      return res.status(404).json({ message: 'ไม่พบเพลงที่ต้องการลบ' });
    }
    res.status(200).json({ message: 'ลบเพลงสำเร็จ!', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบเพลง', error: error.message });
  }
});

// ==========================================
// 3. API ROUTES: WEBTOON (เว็บตูน)
// ==========================================

// POST /api/webtoons - เพิ่มเรื่องเว็บตูน
app.post('/api/webtoons', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'authorImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, author, genre, synopsis } = req.body;

    const coverImage = req.files && req.files['coverImage'] 
      ? `/uploads/${req.files['coverImage'][0].filename}` 
      : '';
    const authorImage = req.files && req.files['authorImage'] 
      ? `/uploads/${req.files['authorImage'][0].filename}` 
      : '';

    const newWebtoon = new Webtoon({ title, author, authorImage, genre, synopsis, coverImage });
    await newWebtoon.save();

    // 📍 [เพิ่ม] แจ้งเตือนไปยังผู้ติดตามผู้แต่ง
    sendNotificationToFollowers({
      name: author,
      type: 'author',
      title: `มีเว็บตูนเรื่องใหม่จาก ${author}`,
      message: `ผลงานเรื่อง "${title}" เปิดตัวใหม่แล้ว เข้าไปอ่านได้เลย!`,
      notificationType: 'new_webtoon'
    });

    res.status(201).json({ message: 'บันทึกเว็บตูนสำเร็จ!', data: newWebtoon });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกเว็บตูน', error: error.message });
  }
});

// GET /api/webtoons - ดึงรายการเว็บตูนทั้งหมด
app.get('/api/webtoons', async (req, res) => {
  try {
    const webtoons = await Webtoon.find().sort({ createdAt: -1 });
    res.status(200).json(webtoons);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเว็บตูน', error: error.message });
  }
});

app.get('/api/webtoons/:id', async (req, res) => {
  try {
    const webtoon = await Webtoon.findById(req.params.id);
    if (!webtoon) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลเว็บตูน' });
    }
    res.status(200).json(webtoon);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเว็บตูน', error: error.message });
  }
});

// DELETE /api/webtoons/:id - ลบเว็บตูน [เพิ่มใหม่]
app.delete('/api/webtoons/:id', async (req, res) => {
  try {
    const deletedWebtoon = await Webtoon.findByIdAndDelete(req.params.id);
    if (!deletedWebtoon) {
      return res.status(404).json({ message: 'ไม่พบเว็บตูนที่ต้องการลบ' });
    }
    await Episode.deleteMany({ webtoonId: req.params.id });
    res.status(200).json({ message: 'ลบเว็บตูนและตอนทั้งหมดสำเร็จ!', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบเว็บตูน', error: error.message });
  }
});

// ==========================================
// 4. API ROUTES: EPISODE (ตอนของการ์ตูน)
// ==========================================

// POST /api/episodes - เพิ่มตอนใหม่ของการ์ตูน
app.post('/api/episodes', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'contentFiles', maxCount: 100 }
]), async (req, res) => {
  try {
    const { webtoonId, title, episodeNumber, price } = req.body;

    const coverImage = req.files && req.files['coverImage'] 
      ? `/uploads/${req.files['coverImage'][0].filename}` 
      : '';
    
    const contentFiles = req.files && req.files['contentFiles'] 
      ? req.files['contentFiles'].map((file) => `/uploads/${file.filename}`) 
      : [];

    const newEpisode = new Episode({
      webtoonId,
      title,
      episodeNumber,
      coverImage,
      imageUrls: contentFiles,
      price: Number(price) || 0
    });

    await newEpisode.save();

    // 📍 [เพิ่ม] ดึงข้อมูล Webtoon เพื่อเอาผู้แต่ง และส่งการแจ้งเตือนตอนใหม่
    const parentWebtoon = await Webtoon.findById(webtoonId);
    if (parentWebtoon) {
      sendNotificationToFollowers({
        name: parentWebtoon.author,
        type: 'author',
        title: `ตอนใหม่มาแล้ว! ${parentWebtoon.title}`,
        message: `ตอนที่ ${episodeNumber}: "${title}" อัปเดตแล้ว เข้าไปติดตามอ่านได้เลย!`,
        notificationType: 'new_episode'
      });
    }

    res.status(201).json({ message: 'บันทึกตอนใหม่สำเร็จ!', data: newEpisode });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกตอนการ์ตูน', error: error.message });
  }
});

// GET /api/episodes/webtoon/:webtoonId - ดึงตอนทั้งหมดของการ์ตูนเรื่องที่ระบุ
app.get('/api/episodes/webtoon/:webtoonId', async (req, res) => {
  try {
    const episodes = await Episode.find({ webtoonId: req.params.webtoonId }).sort({ episodeNumber: 1 });
    res.status(200).json(episodes);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตอนการ์ตูน', error: error.message });
  }
});

// GET /api/episodes/:id - ดึงข้อมูลตอนการ์ตูนรายตอน
app.get('/api/episodes/:id', async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id);
    if (!episode) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลตอนการ์ตูน' });
    }
    res.status(200).json(episode);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตอนการ์ตูน', error: error.message });
  }
});

// POST /api/episodes/buy - ซื้อ/ปลดล็อกตอนด้วย Token
app.post('/api/episodes/buy', async (req, res) => {
  try {
    const { userId, episodeId } = req.body;

    if (!userId || !episodeId) {
      return res.status(400).json({ message: 'กรุณาระบุ userId และ episodeId' });
    }

    const user = await User.findById(userId);
    const episode = await Episode.findById(episodeId);

    if (!user || !episode) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้หรือตอนการ์ตูน' });
    }

    const isAlreadyUnlocked = user.unlockedEpisodes && user.unlockedEpisodes.some(
      (id) => id.toString() === episodeId.toString()
    );

    if (isAlreadyUnlocked) {
      return res.status(200).json({ message: 'คุณปลดล็อกตอนนี้ไปแล้ว', tokensBalance: user.tokensBalance });
    }

    const price = episode.price || 0;
    if (price > 0) {
      if (user.tokensBalance < price) {
        return res.status(400).json({ 
          message: 'เหรียญไม่พอ', 
          tokensBalance: user.tokensBalance, 
          requiredTokens: price 
        });
      }

      user.tokensBalance -= price;
    }

    if (!user.unlockedEpisodes) user.unlockedEpisodes = [];
    user.unlockedEpisodes.push(episodeId);
    await user.save();

    res.status(200).json({
      message: 'ปลดล็อกตอนสำเร็จ!',
      tokensBalance: user.tokensBalance
    });
  } catch (error) {
    console.error('Error buying episode:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการซื้อตอน', error: error.message });
  }
});

// DELETE /api/episodes/:id - ลบตอนการ์ตูน [เพิ่มใหม่]
app.delete('/api/episodes/:id', async (req, res) => {
  try {
    const deletedEpisode = await Episode.findByIdAndDelete(req.params.id);
    if (!deletedEpisode) {
      return res.status(404).json({ message: 'ไม่พบตอนการ์ตูนที่ต้องการลบ' });
    }
    res.status(200).json({ message: 'ลบตอนการ์ตูนสำเร็จ!', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบตอนการ์ตูน', error: error.message });
  }
});

// ==========================================
// 5. API ROUTES: AUDIOBOOK (หนังสือเสียง)
// ==========================================

// POST /api/audiobooks - เพิ่มหนังสือเสียง
app.post('/api/audiobooks', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'authorImage', maxCount: 1 },
  { name: 'audioFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, author, narrator, synopsis, price } = req.body;

    const coverImage = req.files && req.files['coverImage'] 
      ? `/uploads/${req.files['coverImage'][0].filename}` 
      : '';
    const authorImage = req.files && req.files['authorImage'] 
      ? `/uploads/${req.files['authorImage'][0].filename}` 
      : '';
    const audioUrl = req.files && req.files['audioFile'] 
      ? `/uploads/${req.files['audioFile'][0].filename}` 
      : '';

    const newAudiobook = new Audiobook({
      title,
      author,
      authorImage,
      narrator,
      synopsis,
      coverImage,
      audioUrl,
      price: Number(price) || 0
    });

    await newAudiobook.save();

    // 📍 [เพิ่ม] แจ้งเตือนไปยังผู้ติดตามผู้แต่ง
    sendNotificationToFollowers({
      name: author,
      type: 'author',
      title: `มี หนังสือเสียง ใหม่จาก ${author}`,
      message: `เรื่อง "${title}" พร้อมให้รับฟังแล้ว!`,
      notificationType: 'new_audiobook'
    });

    res.status(201).json({ message: 'บันทึกหนังสือเสียงสำเร็จ!', data: newAudiobook });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกหนังสือเสียง', error: error.message });
  }
});

// GET /api/audiobooks - ดึงรายการหนังสือเสียงทั้งหมด
app.get('/api/audiobooks', async (req, res) => {
  try {
    const audiobooks = await Audiobook.find().sort({ createdAt: -1 });
    res.status(200).json(audiobooks);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหนังสือเสียง', error: error.message });
  }
});

// GET /api/audiobooks/:id - ดึงข้อมูลหนังสือเสียงรายเล่ม
app.get('/api/audiobooks/:id', async (req, res) => {
  try {
    const audiobook = await Audiobook.findById(req.params.id);
    if (!audiobook) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลหนังสือเสียง' });
    }
    res.status(200).json(audiobook);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหนังสือเสียง', error: error.message });
  }
});

// POST /api/audiobooks/buy - ซื้อ/ปลดล็อกหนังสือเสียงด้วย Token
app.post('/api/audiobooks/buy', async (req, res) => {
  try {
    const { userId, audiobookId } = req.body;

    if (!userId || !audiobookId) {
      return res.status(400).json({ message: 'กรุณาระบุ userId และ audiobookId' });
    }

    const user = await User.findById(userId);
    const audiobook = await Audiobook.findById(audiobookId);

    if (!user || !audiobook) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้หรือหนังสือเสียง' });
    }

    const isAlreadyUnlocked = user.unlockedAudiobooks && user.unlockedAudiobooks.some(
      (id) => id.toString() === audiobookId.toString()
    );

    if (isAlreadyUnlocked) {
      return res.status(200).json({ message: 'คุณปลดล็อกหนังสือเสียงนี้ไปแล้ว', tokensBalance: user.tokensBalance });
    }

    const price = audiobook.price || 0;
    if (price > 0) {
      if (user.tokensBalance < price) {
        return res.status(400).json({ 
          message: 'เหรียญไม่พอ', 
          tokensBalance: user.tokensBalance, 
          requiredTokens: price 
        });
      }

      user.tokensBalance -= price;
    }

    if (!user.unlockedAudiobooks) user.unlockedAudiobooks = [];
    user.unlockedAudiobooks.push(audiobookId);
    await user.save();

    res.status(200).json({
      message: 'ซื้อหนังสือเสียงสำเร็จ!',
      tokensBalance: user.tokensBalance
    });
  } catch (error) {
    console.error('Error buying audiobook:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการซื้อหนังสือเสียง', error: error.message });
  }
});

// DELETE /api/audiobooks/:id - ลบหนังสือเสียง [เพิ่มใหม่]
app.delete('/api/audiobooks/:id', async (req, res) => {
  try {
    const deletedAudiobook = await Audiobook.findByIdAndDelete(req.params.id);
    if (!deletedAudiobook) {
      return res.status(404).json({ message: 'ไม่พบหนังสือเสียงที่ต้องการลบ' });
    }
    res.status(200).json({ message: 'ลบหนังสือเสียงสำเร็จ!', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบหนังสือเสียง', error: error.message });
  }
});

// ==========================================
// 5.1 API ROUTES: GENRE (ประเภท/หมวดหมู่) [เพิ่มใหม่]
// ==========================================

// POST /api/genres - เพิ่มหมวดหมู่ใหม่
app.post('/api/genres', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'กรุณาระบุชื่อหมวดหมู่' });
    }
    const newGenre = new Genre({ name, description: description || '' });
    await newGenre.save();
    res.status(201).json({ message: 'บันทึกหมวดหมู่สำเร็จ!', data: newGenre });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกหมวดหมู่', error: error.message });
  }
});

// GET /api/genres - ดึงรายการหมวดหมู่ทั้งหมด
app.get('/api/genres', async (req, res) => {
  try {
    const genres = await Genre.find().sort({ name: 1 });
    res.status(200).json(genres);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงหมวดหมู่', error: error.message });
  }
});

// ==========================================
// 6. API ROUTES: AUTH & USER MANAGEMENT
// ==========================================

// POST /api/users/create - สร้างผู้ใช้ใหม่
app.post('/api/users/create', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email }, { name: name }]
    });

    if (existingUser) {
      const isEmailDup = existingUser.email.toLowerCase() === email.toLowerCase();
      return res.status(400).json({
        message: isEmailDup ? 'อีเมลนี้ถูกใช้งานในระบบแล้ว' : 'ชื่อผู้ใช้งานนี้ถูกใช้งานในระบบแล้ว'
      });
    }

    const newUser = new User({ name, email, password, role: role || 'creator' });
    await newUser.save();

    res.status(201).json({
      message: 'สร้างผู้ใช้ใหม่สำเร็จ!',
      user: { 
        id: newUser._id, 
        _id: newUser._id, 
        name: newUser.name, 
        email: newUser.email, 
        role: newUser.role,
        profileImage: newUser.profileImage || '',
        tokensBalance: newUser.tokensBalance || 0,
        followingArtists: newUser.followingArtists || [],
        followingAuthors: newUser.followingAuthors || []
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้', error: error.message });
  }
});

// GET /api/users/:id - ดึงข้อมูลผู้ใช้งานตาม ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    res.status(200).json({
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      tokensBalance: user.tokensBalance,
      followingArtists: user.followingArtists || [],
      followingAuthors: user.followingAuthors || [],
      unlockedEpisodes: user.unlockedEpisodes || [],
      unlockedEbooks: user.unlockedEbooks || [],
      unlockedAudiobooks: user.unlockedAudiobooks || [],
      rewardedContent: user.rewardedContent || []
    });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', error: error.message });
  }
});

// GET /api/users/:id/unlocked - ดึงรายการคอนเทนต์ที่ผู้ใช้ปลดล็อกแล้วทั้งหมด
app.get('/api/users/:id/unlocked', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    res.status(200).json({
      unlockedEpisodes: user.unlockedEpisodes || [],
      unlockedEbooks: user.unlockedEbooks || [],
      unlockedAudiobooks: user.unlockedAudiobooks || [],
      rewardedContent: user.rewardedContent || []
    });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการปลดล็อก', error: error.message });
  }
});

// PUT /api/users/:id - แก้ไขข้อมูลผู้ใช้งาน
app.put('/api/users/:id', upload.single('profileImage'), async (req, res) => {
  try {
    const { name, profileImage, followingArtists, followingAuthors } = req.body;
    const updateData = {};

    if (name) updateData.name = name;

    if (followingArtists !== undefined) {
      updateData.followingArtists = typeof followingArtists === 'string' 
        ? JSON.parse(followingArtists) 
        : followingArtists;
    }
    if (followingAuthors !== undefined) {
      updateData.followingAuthors = typeof followingAuthors === 'string' 
        ? JSON.parse(followingAuthors) 
        : followingAuthors;
    }

    if (req.file) {
      updateData.profileImage = `/uploads/${req.file.filename}`;
    } else if (profileImage) {
      updateData.profileImage = profileImage;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'กรุณาระบุข้อมูลที่ต้องการอัปเดต' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้นี้ในระบบ' });
    }

    res.status(200).json({
      message: 'อัปเดตข้อมูลสำเร็จ!',
      user: {
        id: updatedUser._id,
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profileImage: updatedUser.profileImage,
        tokensBalance: updatedUser.tokensBalance,
        followingArtists: updatedUser.followingArtists || [],
        followingAuthors: updatedUser.followingAuthors || []
      },
      ...updatedUser.toObject()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', error: error.message });
  }
});

// POST /api/login - เข้าสู่ระบบ
app.post('/api/login', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const user = await User.findOne({
      $or: [
        { name: name || '' },
        { email: name || email || '' }
      ]
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    }

    res.status(200).json({
      message: 'เข้าสู่ระบบสำเร็จ',
      user: { 
        id: user._id, 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        profileImage: user.profileImage || '',
        tokensBalance: user.tokensBalance || 0,
        followingArtists: user.followingArtists || [],
        followingAuthors: user.followingAuthors || []
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', error: error.message });
  }
});

// ==========================================
// 7. API ROUTES: REWARD & TOKEN SYSTEM (แจกเหรียญ)
// ==========================================

const handleRewardTokens = async (req, res) => {
  try {
    const { userId, contentType, contentId, amount, rewardAmount } = req.body;

    if (!userId || !contentType || !contentId) {
      return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน (กรุณาระบุ userId, contentType, contentId)' });
    }

    const finalAmount = Number(amount || rewardAmount) || 1;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    const rewardKey = `${contentType}_${contentId}`;

    if (!user.rewardedContent) user.rewardedContent = [];

    if (user.rewardedContent.includes(rewardKey)) {
      return res.status(200).json({
        message: 'คุณเคยได้รับ Token จากเนื้อหานี้ไปแล้ว',
        isAlreadyRewarded: true,
        tokensBalance: user.tokensBalance
      });
    }

    user.tokensBalance += finalAmount;
    user.rewardedContent.push(rewardKey);
    await user.save();

    res.status(200).json({
      message: `ยินดีด้วย! คุณได้รับ +${finalAmount} Token`,
      isAlreadyRewarded: false,
      tokensBalance: user.tokensBalance
    });
  } catch (error) {
    console.error('Error rewarding token:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการรับ Token', error: error.message });
  }
};

app.post('/api/tokens/reward', handleRewardTokens);
app.post('/api/users/reward-tokens', handleRewardTokens);

// ==========================================
// 8. API ROUTES: NOTIFICATION & PUSH TOKEN
// ==========================================

// POST /api/users/push-token - อัปเดต Push Token
app.post('/api/users/push-token', async (req, res) => {
  try {
    const { userId, pushToken } = req.body;
    if (!userId || !pushToken) {
      return res.status(400).json({ message: 'กรุณาระบุ userId และ pushToken' });
    }

    await User.findByIdAndUpdate(userId, { pushToken });
    res.status(200).json({ message: 'บันทึก Push Token สำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึก Token', error: error.message });
  }
});

// PUT /api/notifications/user/:userId/read-all - อัปเดตการอ่านแจ้งเตือนทั้งหมดของ user รายบุคคล
app.put('/api/notifications/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.updateMany(
      { userId: userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ message: 'อัปเดตสถานะอ่านแล้วทั้งหมดสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะการอ่าน', error: error.message });
  }
});

// GET /api/notifications/:userId - ดึงประวัติการแจ้งเตือน
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงการแจ้งเตือน', error: error.message });
  }
});

// PUT /api/notifications/:id/read - กดอ่านการแจ้งเตือน
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.status(200).json({ message: 'อัปเดตสถานะเป็นอ่านแล้ว' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ', error: error.message });
  }
});

// DELETE /api/notifications/:id - ลบการแจ้งเตือน [เพิ่มใหม่]
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const deletedNotification = await Notification.findByIdAndDelete(req.params.id);
    if (!deletedNotification) {
      return res.status(404).json({ message: 'ไม่พบการแจ้งเตือนที่ต้องการลบ' });
    }
    res.status(200).json({ message: 'ลบการแจ้งเตือนสำเร็จ!', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบการแจ้งเตือน', error: error.message });
  }
});

// ==========================================
// 9. API ROUTES: FAVORITES
// ==========================================

// POST /api/favorites - กดถูกใจ / ยกเลิกถูกใจ
app.post('/api/favorites', async (req, res) => {
  try {
    const { userId, contentType, contentId } = req.body;

    if (!userId || !contentType || !contentId) {
      return res.status(400).json({ message: 'กรุณาระบุข้อมูล userId, contentType และ contentId ให้ครบถ้วน' });
    }

    const existingFav = await Favorite.findOne({ userId, contentType, contentId });

    if (existingFav) {
      await Favorite.findByIdAndDelete(existingFav._id);
      return res.status(200).json({ message: 'ลบออกจากรายการโปรดแล้ว', isFavorite: false });
    } else {
      const newFav = new Favorite({ userId, contentType, contentId });
      await newFav.save();
      return res.status(201).json({ message: 'เพิ่มในรายการโปรดแล้ว', isFavorite: true });
    }
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกรายการโปรด', error: error.message });
  }
});

// POST /api/favorites/toggle
app.post('/api/favorites/toggle', async (req, res) => {
  try {
    const { userId, contentType, contentId } = req.body;
    const existingFav = await Favorite.findOne({ userId, contentType, contentId });

    if (existingFav) {
      await Favorite.findByIdAndDelete(existingFav._id);
      return res.status(200).json({ message: 'ลบออกจากรายการโปรดแล้ว', isFavorite: false });
    } else {
      const newFav = new Favorite({ userId, contentType, contentId });
      await newFav.save();
      return res.status(201).json({ message: 'เพิ่มในรายการโปรดแล้ว', isFavorite: true });
    }
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// GET /api/favorites/:userId - ดึงรายการโปรดทั้งหมด
app.get('/api/favorites/:userId', async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.params.userId })
      .populate('contentId')
      .sort({ createdAt: -1 });

    res.status(200).json(favorites);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการโปรด', error: error.message });
  }
});

// ==========================================
// 10. API ROUTES: PLAYLISTS
// ==========================================

// POST /api/playlists - สร้างเพลย์ลิสต์ใหม่
app.post('/api/playlists', async (req, res) => {
  try {
    const { userId, name, description, type } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ message: 'กรุณาระบุ userId และชื่อเพลย์ลิสต์' });
    }

    const newPlaylist = new Playlist({ 
      userId, 
      name, 
      description,
      type: type || 'music' 
    });

    await newPlaylist.save();
    res.status(201).json({ message: 'สร้างเพลย์ลิสต์สำเร็จ!', data: newPlaylist });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างเพลย์ลิสต์', error: error.message });
  }
});

app.post('/api/playlists/:id/webtoons', async (req, res) => {
  try {
    const { webtoonId, contentId } = req.body;
    const targetId = webtoonId || contentId;

    if (!targetId) {
      return res.status(400).json({ message: 'กรุณาระบุ webtoonId' });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'ไม่พบ Webtoon List' });
    }

    if (!playlist.tracks.includes(targetId)) {
      playlist.tracks.push(targetId);
      await playlist.save();
    }

    res.status(200).json({ message: 'เพิ่ม Webtoon เข้า List สำเร็จ!', data: playlist });
  } catch (error) {
    console.error('Error adding webtoon to playlist:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่ม Webtoon ลง List', error: error.message });
  }
});

// GET /api/playlists - ดึงเพลย์ลิสต์
app.get('/api/playlists', async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId } : {};

    const playlists = await Playlist.find(filter)
      .populate('tracks')
      .sort({ createdAt: -1 });

    res.status(200).json(playlists);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเพลย์ลิสต์', error: error.message });
  }
});

// GET /api/playlists/user/:userId - ดึงเพลย์ลิสต์ทั้งหมดของ User
app.get('/api/playlists/user/:userId', async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.params.userId })
      .populate('tracks')
      .sort({ createdAt: -1 });
    res.status(200).json(playlists);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเพลย์ลิสต์', error: error.message });
  }
});

// GET /api/playlists/:id - ดึงข้อมูลเพลย์ลิสต์รายรายการ
app.get('/api/playlists/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id).populate('tracks');
    if (!playlist) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลเพลย์ลิสต์' });
    }
    res.status(200).json(playlist);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเพลย์ลิสต์', error: error.message });
  }
});

// POST /api/playlists/:id/tracks - เพิ่มเพลงลงเพลย์ลิสต์
app.post('/api/playlists/:id/tracks', async (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) {
      return res.status(400).json({ message: 'กรุณาระบุ trackId' });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ message: 'ไม่พบเพลย์ลิสต์' });
    }

    if (!playlist.tracks.includes(trackId)) {
      playlist.tracks.push(trackId);
      await playlist.save();
    }

    res.status(200).json({ message: 'เพิ่มเพลงลงเพลย์ลิสต์สำเร็จ!', data: playlist });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มเพลงลงเพลย์ลิสต์', error: error.message });
  }
});

app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const deletedPlaylist = await Playlist.findByIdAndDelete(req.params.id);
    if (!deletedPlaylist) {
      return res.status(404).json({ message: 'ไม่พบเพลย์ลิสต์ที่ต้องการลบ' });
    }
    res.status(200).json({ message: 'ลบเพลย์ลิสต์สำเร็จ!', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบเพลย์ลิสต์', error: error.message });
  }
});

// DELETE /api/playlists/:id/tracks/:trackId - ลบเพลงออกจากเพลย์ลิสต์
app.delete('/api/playlists/:id/tracks/:trackId', async (req, res) => {
  try {
    const { id, trackId } = req.params;
    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: 'ไม่พบเพลย์ลิสต์' });
    }

    playlist.tracks = playlist.tracks.filter((t) => t.toString() !== trackId);
    await playlist.save();

    res.status(200).json({ message: 'ลบเพลงออกจากเพลย์ลิสต์สำเร็จ!', data: playlist });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบเพลง', error: error.message });
  }
});

// DELETE /api/playlists/:id/items/:itemId - ลบไอเทมทั่วไปออกจากเพลย์ลิสต์
app.delete('/api/playlists/:id/items/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: 'ไม่พบเพลย์ลิสต์' });
    }

    if (playlist.tracks) {
      playlist.tracks = playlist.tracks.filter((t) => t.toString() !== itemId);
    }
    if (playlist.items) {
      playlist.items = playlist.items.filter((i) => i.toString() !== itemId);
    }
    await playlist.save();

    res.status(200).json({ message: 'ลบรายการสำเร็จ!', data: playlist });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบรายการ', error: error.message });
  }
});

// ==========================================
// 11. API ROUTES: COMMENTS
// ==========================================

// POST /api/comments - เพิ่มความคิดเห็นใหม่
app.post('/api/comments', async (req, res) => {
  try {
    const { userId, contentType, contentId, text } = req.body;

    if (!userId || !contentType || !contentId || !text) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลความคิดเห็นให้ครบถ้วน' });
    }

    const newComment = new Comment({
      userId,
      contentType,
      contentId,
      text
    });

    await newComment.save();

    const populatedComment = await Comment.findById(newComment._id)
      .populate('userId', 'name profileImage');

    res.status(201).json({ message: 'ส่งความคิดเห็นเรียบร้อย!', data: populatedComment });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกความคิดเห็น', error: error.message });
  }
});

// GET /api/comments/:contentType/:contentId - ดึงความคิดเห็นทั้งหมด
app.get('/api/comments/:contentType/:contentId', async (req, res) => {
  try {
    const { contentType, contentId } = req.params;

    const comments = await Comment.find({ contentType, contentId })
      .populate('userId', 'name profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงความคิดเห็น', error: error.message });
  }
});

// DELETE /api/comments/:id - ลบความคิดเห็น
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const deletedComment = await Comment.findByIdAndDelete(req.params.id);
    if (!deletedComment) {
      return res.status(404).json({ message: 'ไม่พบความคิดเห็นที่ต้องการลบ' });
    }
    res.status(200).json({ message: 'ลบความคิดเห็นเรียบร้อย' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบความคิดเห็น', error: error.message });
  }
});

// ==========================================
// 12. API ROUTES EXTRA: DIRECT FOLLOW & UNFOLLOW
// ==========================================

// POST /api/users/:id/follow - เพิ่มการติดตามศิลปินหรือผู้แต่ง
app.post('/api/users/:id/follow', async (req, res) => {
  try {
    const { type, name } = req.body; // type = 'artist' หรือ 'author'
    if (!name || !type) {
      return res.status(400).json({ message: 'กรุณาระบุ type และ name' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    const field = type === 'artist' ? 'followingArtists' : 'followingAuthors';
    if (!user[field]) user[field] = [];

    if (!user[field].includes(name)) {
      user[field].push(name);
      await user.save();
    }

    res.status(200).json({
      message: 'ติดตามสำเร็จ!',
      followingArtists: user.followingArtists || [],
      followingAuthors: user.followingAuthors || []
    });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการติดตาม', error: error.message });
  }
});

// POST /api/users/:id/unfollow - เลิกติดตามศิลปินหรือผู้แต่ง
app.post('/api/users/:id/unfollow', async (req, res) => {
  try {
    const { type, name } = req.body; // type = 'artist' หรือ 'author'
    if (!name || !type) {
      return res.status(400).json({ message: 'กรุณาระบุ type และ name' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    const field = type === 'artist' ? 'followingArtists' : 'followingAuthors';
    if (user[field]) {
      user[field] = user[field].filter((item) => item !== name);
      await user.save();
    }

    res.status(200).json({
      message: 'เลิกติดตามสำเร็จ!',
      followingArtists: user.followingArtists || [],
      followingAuthors: user.followingAuthors || []
    });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเลิกติดตาม', error: error.message });
  }
});

// ==========================================
// 13. API ROUTES EXTRA: SEARCH (ค้นหาคอนเทนต์) [เพิ่มใหม่]
// ==========================================
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(200).json({ tracks: [], webtoons: [], ebooks: [], audiobooks: [] });
    }

    const regex = new RegExp(q, 'i');

    const [tracks, webtoons, ebooks, audiobooks] = await Promise.all([
      Track.find({ $or: [{ title: regex }, { artist: regex }] }),
      Webtoon.find({ $or: [{ title: regex }, { author: regex }] }),
      Ebook.find({ $or: [{ title: regex }, { author: regex }] }),
      Audiobook.find({ $or: [{ title: regex }, { author: regex }, { narrator: regex }] })
    ]);

    res.status(200).json({ tracks, webtoons, ebooks, audiobooks });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการค้นหา', error: error.message });
  }
});

// ==========================================
// CONNECT MONGODB & START SERVER
// ==========================================
mongoose.connect('mongodb://127.0.0.1:27017/cosiify')
  .then(() => console.log('Connected to MongoDB database: cosiify'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});