import { useState } from 'react';
import { User, Lock, LogIn, UserPlus } from 'lucide-react';

export default function LoginForm({ onLoginSuccess, onSwitchToCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.password) {
      alert('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`เข้าสู่ระบบสำเร็จ! ต้อนรับคุณ ${result.user.name} (${result.user.role})`);
        localStorage.setItem('user', JSON.stringify(result.user));
        if (onLoginSuccess) onLoginSuccess(result.user);
      } else {
        alert(`เกิดข้อผิดพลาด: ${result.message}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 text-gray-100 p-10 rounded-3xl shadow-2xl w-full max-w-lg border border-zinc-800">
      {/* Header */}
      <div className="text-center mb-8 pb-6 border-b border-zinc-800">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl font-bold text-2xl flex items-center justify-center text-zinc-950 mx-auto mb-3 shadow-lg shadow-emerald-500/20">
          CS
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-wide">Cosiify Admin</h1>
        <p className="text-sm text-zinc-400 mt-2">เข้าสู่ระบบสำหรับผู้ดูแลและ Creator</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ช่องใส่ชื่อผู้ใช้งาน */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">ชื่อผู้ใช้งาน</label>
          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
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

        {/* ช่องใส่รหัสผ่าน */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">รหัสผ่าน</label>
          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:bg-zinc-700 disabled:text-zinc-500 mt-4"
        >
          <LogIn size={22} />
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>

      {/* ปุ่มสลับไปหน้าสร้างบัญชี */}
      <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
        <p className="text-sm text-zinc-400">
          ต้องการสร้างบัญชีผู้ใช้ใหม่?{' '}
          <button
            type="button"
            onClick={onSwitchToCreate}
            className="text-emerald-400 font-semibold hover:text-emerald-300 hover:underline inline-flex items-center gap-1 ml-1"
          >
            <UserPlus size={16} /> สร้างรหัส Admin / Creator
          </button>
        </p>
      </div>
    </div>
  );
}