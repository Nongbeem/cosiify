import { useState } from 'react';
import { Plus, Check, X, Layers } from 'lucide-react';

export default function ToonForm({ onSwitchToEpisode }) {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    genre: '',
    synopsis: '',
  });
  const [coverFile, setCoverFile] = useState(null);
  const [authorImageFile, setAuthorImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.author || !coverFile) {
      alert('กรุณากรอกชื่อเรื่อง ผู้แต่ง และเลือกรูปปกการ์ตูน');
      return;
    }

    setLoading(true);

    const data = new FormData();
    data.append('title', formData.title);
    data.append('author', formData.author);
    data.append('genre', formData.genre);
    data.append('synopsis', formData.synopsis);
    data.append('coverImage', coverFile);
    if (authorImageFile) data.append('authorImage', authorImageFile);

    try {
      const response = await fetch('http://localhost:5000/api/webtoons', {
        method: 'POST',
        body: data,
      });

      const result = await response.json();

      if (response.ok) {
        alert('🎉 บันทึกข้อมูลเรื่องการ์ตูนสำเร็จ!');
        setFormData({ title: '', author: '', genre: '', synopsis: '' });
        setCoverFile(null);
        setAuthorImageFile(null);
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
          <h2 className="text-xl font-bold text-gray-800">เพิ่มเรื่องการ์ตูนหลัก</h2>
          <p className="text-xs text-gray-500">สร้างเรื่องการ์ตูนใหม่ในระบบ</p>
        </div>

        <button
          type="button"
          onClick={onSwitchToEpisode}
          className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-semibold transition-all shadow-sm"
        >
          <Layers size={16} /> ไปหน้าเพิ่มตอน (Episode)
        </button>
      </div>

      <div>
        <label className="input-label">ชื่อเรื่องการ์ตูน</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="input-field"
          placeholder="กรอกชื่อเรื่องการ์ตูน"
        />
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <label className="input-label">ผู้แต่ง / นักวาด</label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleChange}
            className="input-field"
            placeholder="ชื่อผู้แต่ง"
          />
        </div>
        <div className="w-1/3">
          <label className="input-label">หมวดหมู่</label>
          <select
            name="genre"
            value={formData.genre}
            onChange={handleChange}
            className="input-field"
          >
            <option value="">เลือกหมวดหมู่</option>
            <option value="fantasy">แฟนตาซี</option>
            <option value="romance">โรแมนซ์</option>
            <option value="thriller">ระทึกขวัญ</option>
            <option value="live">ชีวิตประจำวัน</option>
          </select>
        </div>
      </div>

      <div>
        <label className="input-label">รูปอาจารย์ผู้แต่ง</label>
        <div className="file-upload-wrapper">
          <label className="file-upload-btn cursor-pointer">
            <Plus size={18} /> เลือกรูปผู้แต่ง
            <input
              type="file"
              className="hidden"
              accept=".jpg,.png"
              onChange={(e) => e.target.files[0] && setAuthorImageFile(e.target.files[0])}
            />
          </label>
          {authorImageFile ? (
            <span className="text-sm text-green-600 font-semibold flex items-center gap-1">
              <Check size={16} /> {authorImageFile.name}
              <button
                type="button"
                onClick={() => setAuthorImageFile(null)}
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

      <div>
        <label className="input-label">ภาพหน้าปกหลัก</label>
        <div className="file-upload-wrapper">
          <label className="file-upload-btn cursor-pointer">
            <Plus size={18} /> เลือกไฟล์
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

      <div>
        <label className="input-label">เรื่องย่อ (Synopsis)</label>
        <textarea
          name="synopsis"
          value={formData.synopsis}
          onChange={handleChange}
          className="input-field h-36"
          placeholder="พิมพ์เรื่องย่อ..."
        ></textarea>
      </div>

      <div className="mt-8 flex justify-end">
        <button type="submit" disabled={loading} className="btn-submit disabled:bg-gray-400">
          {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเรื่องใหม่'}
        </button>
      </div>
    </form>
  );
}