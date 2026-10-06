import { useState } from 'react';
import { UserPlus, Shield, User, Mail, Lock, ArrowLeft } from 'lucide-react';

export default function CreateUserForm({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'creator',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`🎉 สร้างบัญชีผู้ใช้ [${formData.role.toUpperCase()}] สำเร็จแล้ว!`);
        setFormData({ name: '', email: '', password: '', role: 'creator' });
      } else {
        alert(`เกิดข้อผิดพลาด: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 text-gray-100 p-10 rounded-3xl shadow-2xl w-full max-w-2xl border border-zinc-800">
      {/* Header */}
      <div className="flex justify-between items-center pb-6 border-b border-zinc-800 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <UserPlus size={26} className="text-emerald-400" />
            สร้างบัญชีผู้ใช้งาน
          </h2>
          <p className="text-sm text-zinc-400 mt-1">กำหนดรหัสผ่าน และสิทธิ์การใช้งาน (Role)</p>
        </div>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-sm font-semibold transition-all"
        >
          <ArrowLeft size={18} /> หน้าล็อกอิน
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ชื่อ-นามสกุล */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">ชื่อ-นามสกุล / ชื่อแสดงผล</label>
          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
            <User className="text-zinc-400 shrink-0" size={22} />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="กรอกชื่อผู้ใช้งาน"
              className="w-full bg-transparent text-white text-base placeholder-zinc-500 focus:outline-none"
            />
          </div>
        </div>

        {/* อีเมล */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">อีเมล (สำหรับเก็บในระบบ)</label>
          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
            <Mail className="text-zinc-400 shrink-0" size={22} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@cosiify.com"
              className="w-full bg-transparent text-white text-base placeholder-zinc-500 focus:outline-none"
            />
          </div>
        </div>

        {/* รหัสผ่าน */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">รหัสผ่าน</label>
          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
            <Lock className="text-zinc-400 shrink-0" size={22} />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="กรอกรหัสผ่าน"
              className="w-full bg-transparent text-white text-base placeholder-zinc-500 focus:outline-none"
            />
          </div>
        </div>

        {/* เลือก Role */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-3">เลือกประเภทบัญชี (Role)</label>
          <div className="grid grid-cols-2 gap-4">
            <label
              className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${
                formData.role === 'admin'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white ring-2 ring-emerald-500'
                  : 'border-zinc-800 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <input
                type="radio"
                name="role"
                value="admin"
                checked={formData.role === 'admin'}
                onChange={handleChange}
                className="hidden"
              />
              <Shield className={formData.role === 'admin' ? 'text-emerald-400' : 'text-zinc-500'} size={24} />
              <div>
                <p className="font-bold text-base">Admin</p>
                <p className="text-xs text-zinc-400">จัดการระบบได้ทั้งหมด</p>
              </div>
            </label>

            <label
              className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${
                formData.role === 'creator'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white ring-2 ring-emerald-500'
                  : 'border-zinc-800 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <input
                type="radio"
                name="role"
                value="creator"
                checked={formData.role === 'creator'}
                onChange={handleChange}
                className="hidden"
              />
              <User className={formData.role === 'creator' ? 'text-emerald-400' : 'text-zinc-500'} size={24} />
              <div>
                <p className="font-bold text-base">Creator</p>
                <p className="text-xs text-zinc-400">สร้างและจัดการผลงาน</p>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-lg rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:bg-zinc-700 disabled:text-zinc-500"
          >
            {loading ? 'กำลังสร้างบัญชี...' : 'บันทึกข้อมูลผู้ใช้งาน'}
          </button>
        </div>
      </form>
    </div>
  );
}