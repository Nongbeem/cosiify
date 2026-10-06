import { useState } from 'react';
import { Plus, Check, X, Coins } from 'lucide-react';

export default function EbookForm() {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    synopsis: '',
    plot: '',
    priceType: 'free',
    price: 0,
  });
  const [coverFile, setCoverFile] = useState(null);
  const [authorImageFile, setAuthorImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

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

    if (!formData.title || !formData.author || !coverFile) {
      alert('กรุณากรอกชื่อเรื่อง ผู้แต่ง และเลือกรูปปกหนังสือ');
      return;
    }

    setLoading(true);

    const data = new FormData();
    data.append('title', formData.title);
    data.append('author', formData.author);
    data.append('synopsis', formData.synopsis);
    data.append('plot', formData.plot);
    data.append('price', formData.priceType === 'free' ? 0 : formData.price);
    data.append('coverImage', coverFile);
    if (authorImageFile) data.append('authorImage', authorImageFile);

    try {
      const response = await fetch('http://localhost:5000/api/ebooks', {
        method: 'POST',
        body: data,
      });

      const result = await response.json();

      if (response.ok) {
        alert('🎉 บันทึกข้อมูล E-book เรียบร้อยแล้ว!');
        setFormData({ title: '', author: '', synopsis: '', plot: '', priceType: 'free', price: 0 });
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
      <div>
        <label className="input-label">ชื่อเรื่อง</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="input-field"
          placeholder="กรอกชื่อเรื่อง"
        />
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <label className="input-label">ผู้แต่ง</label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleChange}
            className="input-field"
            placeholder="กรอกชื่อผู้แต่ง"
          />
        </div>

        <div className="flex-1">
          <label className="input-label">รูปอาจารย์ผู้แต่ง</label>
          <div className="file-upload-wrapper">
            <label className="file-upload-btn cursor-pointer">
              <Plus size={18} /> เลือกรูป
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
              <span className="text-sm text-gray-500">รองรับ .Jpg / .Png</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
        <label className="input-label flex items-center gap-2 font-bold text-gray-700">
          <Coins size={18} className="text-amber-500" /> กำหนดราคาเข้าชม (Token)
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

      <div>
        <label className="input-label">รูปปกหนังสือ</label>
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
          className="input-field h-24"
          placeholder="พิมพ์เรื่องย่อ..."
        ></textarea>
      </div>

      <div>
        <label className="input-label">เนื้อเรื่องเต็ม (Plot / Content)</label>
        <textarea
          name="plot"
          value={formData.plot}
          onChange={handleChange}
          className="input-field h-60"
          placeholder="พิมพ์หรือวางเนื้อเรื่องของหนังสือตรงนี้..."
        ></textarea>
      </div>

      <div className="mt-10 flex justify-end">
        <button type="submit" disabled={loading} className="btn-submit disabled:bg-gray-400">
          {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล E-book'}
        </button>
      </div>
    </form>
  );
}