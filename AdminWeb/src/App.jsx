import { useState, useEffect } from 'react';
import { Music, Headphones, Book, BookImage, LogOut } from 'lucide-react';
import './App.css';

import MusicForm from './components/MusicForm';
import AudiobookForm from './components/AudiobookForm';
import EbookForm from './components/EbookForm';
import Addpage from './Addpage';
import LoginForm from './components/LoginForm';
import CreateUserForm from './components/CreateUserForm';

export default function App() {
  // State สำหรับเก็บข้อมูลผู้ใช้งาน และหน้าที่จะแสดงผล
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' | 'create'
  const [activeTab, setActiveTab] = useState('music');

  // เช็กว่าเคยเข้าสู่ระบบค้างไว้ใน Browser หรือไม่
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setAuthView('login');
  };

  const menuItems = [
    { id: 'music', icon: <Music size={26} />, label: 'Add Music' },
    { id: 'audiobook', icon: <Headphones size={26} />, label: 'Add Audiobook' },
    { id: 'ebook', icon: <Book size={26} />, label: 'Add E-book' },
    { id: 'toon', icon: <BookImage size={26} />, label: 'Add Toon' },
  ];

  // ----------------------------------------------------
  // 1. ถ้ายังไม่ได้ล็อกอิน: แสดงหน้า Login หรือ หน้าสร้างบัญชี
  // ----------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        {authView === 'login' ? (
          <LoginForm
            onLoginSuccess={(userData) => setUser(userData)}
            onSwitchToCreate={() => setAuthView('create')}
          />
        ) : (
          <CreateUserForm
            onSwitchToLogin={() => setAuthView('login')}
          />
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. ถ้าล็อกอินสำเร็จแล้ว: แสดงหน้า Admin Dashboard
  // ----------------------------------------------------
  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo-container" title="Cosiify">CS</div>

        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`menu-btn ${activeTab === item.id ? 'menu-btn-active' : 'menu-btn-inactive'}`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}

        <button className="logout-btn" title="Logout" onClick={handleLogout}>
          <LogOut size={26} />
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-wrapper">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-200">
              {menuItems.find((m) => m.id === activeTab)?.label}
            </h1>
            
            {/* แสดงข้อมูลผู้ใช้งานที่เข้าสู่ระบบอยู่ */}
            <div className="text-right text-sm text-gray-400">
              ยินดีต้อนรับ, <span className="font-semibold text-white">{user.name}</span>{' '}
              <span className="text-xs bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 ml-1">
                {user.role}
              </span>
            </div>
          </div>

          <div className="form-card">
            <h2 className="text-white mb-6 text-xl font-semibold border-b border-gray-700 pb-4">
              Add Content
            </h2>
            
            {activeTab === 'music' && <MusicForm />}
            {activeTab === 'audiobook' && <AudiobookForm />}
            {activeTab === 'ebook' && <EbookForm />}
            {activeTab === 'toon' && <Addpage />} 

          </div>
        </div>
      </div>
    </div>
  );
}