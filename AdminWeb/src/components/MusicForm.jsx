import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';

export default function MusicForm() {
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    genre: '',
    lyrics: '',
  });
  const [coverFile, setCoverFile] = useState(null);
  const [artistImageFile, setArtistImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.artist || !audioFile) {
      alert('กรุณากรอกชื่อเพลง ศิลปิน และเลือกไฟล์ MP3');
      return;
    }

    setLoading(true);

    const data = new FormData();
    data.append('title', formData.title);
    data.append('artist', formData.artist);
    data.append('genre', formData.genre);
    data.append('lyrics', formData.lyrics);
    if (coverFile) data.append('coverImage', coverFile);
    if (artistImageFile) data.append('artistImage', artistImageFile);
    if (audioFile) data.append('audioFile', audioFile);

    try {
      const response = await fetch('http://localhost:5000/api/tracks', {
        method: 'POST',
        body: data,
      });

      const result = await response.json();

      if (response.ok) {
        alert('🎉 บันทึกข้อมูลเพลงเรียบร้อยแล้ว!');
        setFormData({ title: '', artist: '', genre: '', lyrics: '' });
        setCoverFile(null);
        setArtistImageFile(null);
        setAudioFile(null);
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
        <label className="input-label">ชื่อเพลง</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="input-field"
          placeholder="กรอกชื่อเพลง"
        />
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <label className="input-label">ศิลปิน</label>
          <input
            type="text"
            name="artist"
            value={formData.artist}
            onChange={handleChange}
            className="input-field"
            placeholder="ชื่อศิลปิน"
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
            <option value="rock">Rock</option>
            <option value="thai rock">Thai Rock</option>
            <option value="k-pop">K-Pop</option>
            <option value="hiphop">Hip-Hop</option>
            <option value="life">ลูกทุ่ง</option>
            <option value="international">สากล</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="input-label">รูปปกเพลง</label>
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
          <label className="input-label">รูปศิลปิน</label>
          <div className="file-upload-wrapper">
            <label className="file-upload-btn cursor-pointer">
              <Plus size={18} /> เลือกรูป
              <input
                type="file"
                className="hidden"
                accept=".jpg,.png"
                onChange={(e) => e.target.files[0] && setArtistImageFile(e.target.files[0])}
              />
            </label>
            {artistImageFile ? (
              <span className="text-sm text-green-600 font-semibold flex items-center gap-1">
                <Check size={16} /> {artistImageFile.name}
                <button
                  type="button"
                  onClick={() => setArtistImageFile(null)}
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
      </div>

      <div>
        <label className="input-label">MP3</label>
        <div className="file-upload-wrapper">
          <label className="file-upload-btn cursor-pointer">
            <Plus size={18} /> เลือกไฟล์
            <input
              type="file"
              className="hidden"
              accept=".mp3"
              onChange={(e) => e.target.files[0] && setAudioFile(e.target.files[0])}
            />
          </label>
          {audioFile ? (
            <span className="text-sm text-green-600 font-semibold flex items-center gap-1">
              <Check size={16} /> {audioFile.name}
              <button
                type="button"
                onClick={() => setAudioFile(null)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                <X size={16} />
              </button>
            </span>
          ) : (
            <span className="text-sm text-gray-500">รองรับไฟล์ .MP3</span>
          )}
        </div>
      </div>

      <div>
        <label className="input-label">เนื้อเพลง</label>
        <textarea
          name="lyrics"
          value={formData.lyrics}
          onChange={handleChange}
          rows={5}
          className="input-field w-full p-2 border rounded-md"
          placeholder="วางเนื้อเพลงตรงนี้..."
        />
      </div>

      <div className="mt-10 flex justify-end">
        <button 
          type="submit" 
          disabled={loading} 
          className="btn-submit disabled:bg-gray-400"
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเพลง'}
        </button>
      </div>
    </form>
  );
}