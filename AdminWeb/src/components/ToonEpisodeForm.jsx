import { useState, useEffect } from 'react';
import { Plus, Check, X, BookOpen, Coins } from 'lucide-react';

export default function ToonEpisodeForm({ onSwitchToMain }) {
  const [webtoons, setWebtoons] = useState([]);
  const [formData, setFormData] = useState({
    webtoonId: '',
    episodeNumber: '',
    title: '',
    priceType: 'free',
    price: 0,
  });
  const [coverFile, setCoverFile] = useState(null); // 👈 1. เพิ่ม State รูปปกตอน
  const [toonFiles, setToonFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 👈 4. แก้จาก 127.0.0.1 เป็น localhost
    fetch('http://localhost:5000/api/webtoons')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWebtoons(data);
      })
      .catch((err) => console.error('Error fetching webtoons:', err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriceTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      priceType: type,
      price: type === 'free' ? 0 : prev.price || 1,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.webtoonId || !formData.title || !formData.episodeNumber || toonFiles.length === 0) {
      alert('กรุณาเลือกเรื่องการ์ตูน กรอกตอนที่ ชื่อตอน และอัปโหลดไฟล์เนื้อหาภาพ');
      return;
    }

    setLoading(true);

    const data = new FormData();
    data.append('webtoonId', formData.webtoonId);
    data.append('title', formData.title);
    data.append('episodeNumber', formData.episodeNumber);
    data.append('price', formData.priceType === 'free' ? 0 : formData.price);

    // 👈 3. แนบรูปปกประจำตอน
    if (coverFile) {
      data.append('coverImage', coverFile);
    }

    // 👈 3. วนลูปแนบไฟล์ภาพเนื้อหาการ์ตูนทั้งหมด
    toonFiles.forEach((file) => {
      data.append('contentFiles', file);
    });

    try {
      const response = await fetch('http://localhost:5000/api/episodes', {
        method: 'POST',
        body: data,
      });

      const result = await response.json();

      if (response.ok) {
        alert('🎉 บันทึกตอนการ์ตูนใหม่เรียบร้อยแล้ว!');
        setFormData({ webtoonId: '', episodeNumber: '', title: '', priceType: 'free', price: 0 });
        setCoverFile(null); // 👈 5. เคลียร์ค่ารูปปก
        setToonFiles([]);
      } else {
        alert(`เกิดข้อผิดพลาด: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-body space-y-4">
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h2 className="text-xl font-bold text-gray-800">เพิ่มตอนการ์ตูน (Episode)</h2>
          <p className="text-xs text-gray-500">อัปโหลดเนื้อหาภาพตามตอน</p>
        </div>

        <button
          type="button"
          onClick={onSwitchToMain}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold transition-all shadow-sm"
        >
          <BookOpen size={16} /> กลับหน้าเพิ่มเรื่องหลัก
        </button>
      </div>

      <div>
        <label className="input-label">เลือกเรื่องการ์ตูน</label>
        <select
          name="webtoonId"
          value={formData.webtoonId}
          onChange={handleChange}
          className="input-field"
        >
          <option value="">-- เลือกเรื่องที่ต้องการเพิ่มตอน --</option>
          {webtoons.map((item) => (
            <option key={item._id} value={item._id}>
              {item.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-6">
        <div className="w-1/4">
          <label className="input-label">ตอนที่</label>
          <input
            type="number"
            name="episodeNumber"
            value={formData.episodeNumber}
            onChange={handleChange}
            className="input-field"
            placeholder="เช่น 1, 2, 3..."
          />
        </div>
        <div className="flex-1">
          <label className="input-label">ชื่อตอน</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="input-field"
            placeholder="กรอกชื่อตอน"
          />
        </div>
      </div>

      {/* 👈 2. ช่องอัปโหลดรูปปกประจำตอน (Thumbnail) */}
      <div>
        <label className="input-label">รูปปกประจำตอน (Thumbnail)</label>
        <div className="file-upload-wrapper">
          <label className="file-upload-btn cursor-pointer">
            <Plus size={18} /> เลือกรูปปกตอน
            <input
              type="file"
              className="hidden"
              accept=".jpg,.png"
              onChange={(e) => e.target.files[0] && setCoverFile(e.target.files[0])}
            />
          </label>
          {coverFile ? (
            <span className="text-sm text-green-600 font-semibold flex items-center gap-1">
              <Check size={16} /> {coverFile.name}
              <button
                type="button"
                onClick={() => setCoverFile(null)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                <X size={16} />
              </button>
            </span>
          ) : (
            <span className="text-sm text-gray-500">รองรับไฟล์ .Jpg / .Png</span>
          )}
        </div>
      </div>

      {/* ตัวเลือกราคาโทเคน / ฟรี */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
        <label className="input-label flex items-center gap-2 font-bold text-gray-700">
          <Coins size={18} className="text-amber-500" /> กำหนดราคาปลดล็อกตอนนี้ (Token)
        </label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
            <input
              type="radio"
              name="priceType"
              checked={formData.priceType === 'free'}
              onChange={() => handlePriceTypeChange('free')}
              className="w-4 h-4 accent-emerald-600"
            />
            เปิดให้อ่านฟรี
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
            <input
              type="radio"
              name="priceType"
              checked={formData.priceType === 'paid'}
              onChange={() => handlePriceTypeChange('paid')}
              className="w-4 h-4 accent-emerald-600"
            />
            ตั้งราคาโทเคน
          </label>
        </div>

        {formData.priceType === 'paid' && (
          <div className="pt-2 flex items-center gap-3">
            <input
              type="number"
              name="price"
              min="1"
              value={formData.price}
              onChange={handleChange}
              placeholder="จำนวนโทเคน"
              className="input-field w-40 text-center font-bold text-amber-600"
            />
            <span className="text-sm font-semibold text-gray-600">เหรียญ / โทเคน</span>
          </div>
        )}
      </div>

      {/* รูปภาพเนื้อหาการ์ตูน */}
      <div>
        <label className="input-label">รูปภาพเนื้อหา (หลายไฟล์)</label>
        <div className="file-upload-wrapper">
          <label className="file-upload-btn cursor-pointer">
            <Plus size={18} /> เลือกไฟล์เนื้อหา
            <input
              type="file"
              className="hidden"
              accept=".jpg,.png"
              multiple
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  setToonFiles(Array.from(e.target.files));
                }
              }}
            />
          </label>
          {toonFiles.length > 0 ? (
            <span className="text-sm text-green-600 font-semibold flex items-center gap-1">
              <Check size={16} /> เลือกแล้ว {toonFiles.length} ไฟล์
              <button
                type="button"
                onClick={() => setToonFiles([])}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                <X size={16} />
              </button>
            </span>
          ) : (
            <span className="text-sm text-gray-500">อัปโหลดได้หลายไฟล์ .Jpg / .Png</span>
          )}
        </div>
      </div>

      {toonFiles.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg border text-xs text-gray-600 max-h-32 overflow-y-auto">
          <p className="font-semibold mb-1">รายการภาพในตอนนี้ ({toonFiles.length} ภาพ):</p>
          <ol className="list-decimal list-inside space-y-1">
            {toonFiles.map((file, idx) => (
              <li key={idx} className="truncate">{file.name}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button type="submit" disabled={loading} className="btn-submit disabled:bg-gray-400">
          {loading ? 'กำลังบันทึก...' : 'บันทึกตอนใหม่'}
        </button>
      </div>
    </form>
  );
}