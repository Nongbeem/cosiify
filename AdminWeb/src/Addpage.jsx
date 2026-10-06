import { useState } from 'react';
import ToonForm from './components/ToonForm';
import ToonEpisodeForm from './components/ToonEpisodeForm';

export default function Addpage() {
  const [currentPage, setCurrentPage] = useState('main'); // 'main' หรือ 'episode'
  console.log('หน้าปัจจุบันคือ:', currentPage);

  return (
    <div>
      {currentPage === 'main' ? (
        <ToonForm onSwitchToEpisode={() => setCurrentPage('episode')} />
      ) : (
        <ToonEpisodeForm onSwitchToMain={() => setCurrentPage('main')} />
      )}
    </div>
  );
}