import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Sound from 'react-native-sound';

const { width, height } = Dimensions.get('window');

const API_BASE_URL = 'http://10.0.2.2:5000/api';
const SERVER_BASE_URL = 'http://10.0.2.2:5000';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0;

Sound.setCategory('Playback');

const PlayerScreen = ({ route, navigation }) => {
  const initialTrack = route?.params?.track;
  const trackId = route?.params?.trackId || initialTrack?._id || initialTrack?.id;
  const isAudiobookParam = route?.params?.isAudiobook;

  const playlistTracks = route?.params?.playlistTracks || [];
  const initialIndex = route?.params?.currentIndex ?? -1;

  const [loading, setLoading] = useState(true);
  const [song, setSong] = useState(initialTrack || null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [userId, setUserId] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const soundRef = useRef(null);
  const timerRef = useRef(null);

  const isRepeatRef = useRef(isRepeat);
  const isShuffleRef = useRef(isShuffle);
  const playlistTracksRef = useRef(playlistTracks);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { playlistTracksRef.current = playlistTracks; }, [playlistTracks]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  const currentSongId = song?._id || song?.id || trackId;

  // 📍 แก้ไขจุดที่ 1: ตรวจสอบหนังสือเสียงเฉพาะประเภทจริง (อ้างอิงจาก narrator หรือ type === 'audiobook')
  const isAudiobook = Boolean(
    isAudiobookParam === true ||
    song?.type === 'audiobook' ||
    song?.isAudiobook === true ||
    Boolean(song?.narrator) ||
    Boolean(initialTrack?.narrator)
  );

  useEffect(() => {
    checkUserAndFavorite();
    if (trackId && !initialTrack) {
      fetchTrackDetail(trackId);
    } else if (initialTrack) {
      setSong(initialTrack);
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    if (currentSongId && userId) {
      checkFavoriteStatus(userId, currentSongId);
    }
  }, [currentSongId, userId]);

  const checkUserAndFavorite = async () => {
    try {
      let storedUser = await AsyncStorage.getItem('userData');
      if (!storedUser) storedUser = await AsyncStorage.getItem('user');

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const uid = parsed.id || parsed._id;
        setUserId(uid);
        if (uid && currentSongId) {
          checkFavoriteStatus(uid, currentSongId);
        }
      }
    } catch (err) {
      console.error('Check favorite error:', err);
    }
  };

  const checkFavoriteStatus = async (uid, sId) => {
    try {
      const favRes = await fetch(`${API_BASE_URL}/favorites/${uid}`).catch(() => null);
      if (favRes && favRes.ok) {
        const favs = await favRes.json();
        const exist = Array.isArray(favs) && favs.some((f) => (f.contentId?._id || f.contentId) === sId && f.contentType === 'track');
        setIsFavorite(exist);
      }
    } catch (err) {
      console.error('Check favorite status error:', err);
    }
  };

  const fetchTrackDetail = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tracks/${id}`);
      if (response && response.ok) {
        const data = await response.json();
        const trackData = data?.data || data;
        setSong(trackData);
      }
    } catch (error) {
      console.error('Error fetching track:', error);
    } finally {
      setLoading(false);
    }
  };

  // 📍 แก้ไขจุดที่ 2: กรองเอาเฉพาะเพลงโดยไม่ตัดเพลงที่มี author หรือ synopsis ออก
  const fetchRandomTrack = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/tracks`);
      if (res.ok) {
        const data = await res.json();
        const allTracks = Array.isArray(data) ? data : (data.data || []);
        
        const musicOnlyTracks = allTracks.filter(
          (t) => t.type !== 'audiobook' && !t.narrator
        );

        if (musicOnlyTracks.length > 0) {
          const curId = song?._id || song?.id;
          const otherTracks = musicOnlyTracks.filter((t) => String(t._id || t.id) !== String(curId));
          const pool = otherTracks.length > 0 ? otherTracks : musicOnlyTracks;
          
          const randomIndex = Math.floor(Math.random() * pool.length);
          const randomSong = pool[randomIndex];
          
          setSong(randomSong);
        }
      }
    } catch (err) {
      console.error('Fetch random track error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!userId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนกดถูกใจ');
      return;
    }
    if (!currentSongId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          contentType: 'track',
          contentId: currentSongId,
        }),
      });

      if (res.ok) {
        setIsFavorite((prev) => !prev);
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกรายการโปรดได้');
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  const getFullUrl = (urlPath) => {
    if (!urlPath || typeof urlPath !== 'string' || urlPath.trim() === '') return null;
    if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) return urlPath;
    return `${SERVER_BASE_URL}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  };

  const coverUrl = getFullUrl(song?.coverImage) || DEFAULT_COVER;
  const audioUrl = getFullUrl(song?.audioUrl);

  useEffect(() => {
    if (!audioUrl) return;

    if (soundRef.current) {
      soundRef.current.release();
    }

    setCurrentTime(0);
    const sound = new Sound(audioUrl, null, (error) => {
      if (error) {
        console.log('Error loading audio:', error);
        return;
      }
      setDuration(sound.getDuration());
      soundRef.current = sound;
      playMusic();
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.release();
      }
      clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (soundRef.current && soundRef.current.isPlaying()) {
        soundRef.current.getCurrentTime((seconds) => {
          setCurrentTime(seconds);
        });
      }
    }, 400);
  };

  const playMusic = () => {
    if (soundRef.current) {
      soundRef.current.play((success) => {
        if (success) {
          setIsPlaying(false);
          setCurrentTime(0);
          if (isRepeatRef.current) {
            playMusic();
          } else {
            handleNextTrack();
          }
        }
      });
      setIsPlaying(true);
      startTimer();
    }
  };

  const pauseMusic = () => {
    if (soundRef.current) soundRef.current.pause();
    setIsPlaying(false);
    clearInterval(timerRef.current);
  };

  const togglePlayPause = () => {
    if (isPlaying) pauseMusic();
    else playMusic();
  };

  const stepBackward = () => {
    if (soundRef.current) {
      soundRef.current.getCurrentTime((secs) => {
        const newTime = Math.max(0, secs - 10);
        soundRef.current.setCurrentTime(newTime);
        setCurrentTime(newTime);
      });
    } else {
      setCurrentTime((prev) => Math.max(0, prev - 10));
    }
  };

  const stepForward = () => {
    if (soundRef.current) {
      soundRef.current.getCurrentTime((secs) => {
        const totalSecs = duration || 180;
        const newTime = Math.min(totalSecs, secs + 10);
        soundRef.current.setCurrentTime(newTime);
        setCurrentTime(newTime);
      });
    } else {
      setCurrentTime((prev) => prev + 10);
    }
  };

  // 📍 แก้ไขจุดที่ 3: ไม่เรียก stepForward() อัตโนมัติเมื่อเล่นจบ และกรอง Playlist ถูกต้อง
  const handleNextTrack = async () => {
    if (isAudiobook) {
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    const rawList = playlistTracksRef.current || [];
    const list = rawList.filter((t) => t.type !== 'audiobook' && !t.narrator && t.kind !== 'audiobook');

    if (!list || list.length === 0) {
      await fetchRandomTrack();
      return;
    }

    const curId = song?._id || song?.id;
    let curIdx = list.findIndex((t) => String(t._id || t.id) === String(curId));
    if (curIdx === -1) curIdx = currentIndexRef.current >= 0 ? currentIndexRef.current : 0;

    let nextIndex;
    if (isShuffleRef.current) {
      nextIndex = Math.floor(Math.random() * list.length);
      if (list.length > 1 && nextIndex === curIdx) {
        nextIndex = (curIdx + 1) % list.length;
      }
    } else {
      nextIndex = (curIdx + 1) % list.length;
    }

    const nextSong = list[nextIndex];
    const nextId = nextSong?._id || nextSong?.id;

    if (String(nextId) === String(curId)) {
      if (soundRef.current) soundRef.current.setCurrentTime(0);
      setCurrentTime(0);
      playMusic();
    } else {
      setCurrentIndex(nextIndex);
      setSong(nextSong);
    }
  };

  const handlePreviousTrack = async () => {
    if (isAudiobook) {
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    if (currentTime > 3) {
      if (soundRef.current) soundRef.current.setCurrentTime(0);
      setCurrentTime(0);
      return;
    }

    const rawList = playlistTracksRef.current || [];
    const list = rawList.filter((t) => t.type !== 'audiobook' && !t.narrator && t.kind !== 'audiobook');

    if (!list || list.length === 0) {
      await fetchRandomTrack();
      return;
    }

    const curId = song?._id || song?.id;
    let curIdx = list.findIndex((t) => String(t._id || t.id) === String(curId));
    if (curIdx === -1) curIdx = currentIndexRef.current >= 0 ? currentIndexRef.current : 0;

    let prevIndex;
    if (isShuffleRef.current) {
      prevIndex = Math.floor(Math.random() * list.length);
      if (list.length > 1 && prevIndex === curIdx) {
        prevIndex = (curIdx - 1 + list.length) % list.length;
      }
    } else {
      prevIndex = (curIdx - 1 + list.length) % list.length;
    }

    const prevSong = list[prevIndex];
    const prevId = prevSong?._id || prevSong?.id;

    if (String(prevId) === String(curId)) {
      if (soundRef.current) soundRef.current.setCurrentTime(0);
      setCurrentTime(0);
      playMusic();
    } else {
      setCurrentIndex(prevIndex);
      setSong(prevSong);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </SafeAreaView>
    );
  }

  const mainTitle = song?.title || song?.name || 'ไม่มีชื่อเรื่อง';
  const subTitle = song?.artist || song?.author || song?.narrator || song?.writer || 'ไม่ระบุผู้แต่ง';
  const totalSecs = duration || 180;
  const progressPercent = Math.min(1, currentTime / totalSecs);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.circleHeaderBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <TouchableOpacity style={styles.circleHeaderBtn} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Cover */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: coverUrl }} style={styles.coverImage} />
        </View>

        {/* Info & Favorite Button */}
        <View style={styles.infoContainer}>
          <View style={styles.titleFavRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mainTitle} numberOfLines={2}>{mainTitle}</Text>
              <Text style={styles.subTitle} numberOfLines={1}>{subTitle}</Text>
            </View>
            <TouchableOpacity onPress={toggleFavorite} style={{ padding: 6 }}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={26}
                color={isFavorite ? '#EF4444' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent * 100}%` }]} />
            <View style={styles.progressDot} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(totalSecs)}</Text>
          </View>
        </View>

        {/* Controls Bar */}
        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={() => setIsRepeat(!isRepeat)}>
            <Ionicons name="repeat" size={20} color={isRepeat ? '#22C55E' : '#888888'} />
          </TouchableOpacity>

          {isAudiobook ? (
            <>
              <TouchableOpacity onPress={stepBackward} style={styles.stepBtn} activeOpacity={0.7}>
                <Ionicons name="play-back" size={24} color="#FFFFFF" />
                <Text style={styles.stepText}>-10s</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.playButtonMain} onPress={togglePlayPause} activeOpacity={0.8}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#000000" />
              </TouchableOpacity>

              <TouchableOpacity onPress={stepForward} style={styles.stepBtn} activeOpacity={0.7}>
                <Ionicons name="play-forward" size={24} color="#FFFFFF" />
                <Text style={styles.stepText}>+10s</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={handlePreviousTrack} style={{ padding: 8 }}>
                <Ionicons name="play-skip-back" size={28} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.playButtonMain} onPress={togglePlayPause} activeOpacity={0.8}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#000000" />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleNextTrack} style={{ padding: 8 }}>
                <Ionicons name="play-skip-forward" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => setIsShuffle(!isShuffle)}>
            <Ionicons name="shuffle" size={20} color={isShuffle ? '#22C55E' : '#888888'} />
          </TouchableOpacity>
        </View>

        {/* Lyrics */}
        {!isAudiobook ? (
          <TouchableOpacity
            style={styles.lyricsContainer}
            activeOpacity={0.7}
            onPress={() => setShowLyrics(true)}
          >
            <Ionicons name="chevron-up" size={22} color="#FFFFFF" />
            <Text style={styles.lyricsText}>Lyrics</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.lyricsPlaceholder} />
        )}
      </SafeAreaView>

      {/* Lyrics Modal */}
      <Modal
        visible={showLyrics}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => setShowLyrics(false)}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#121214" />
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowLyrics(false)} style={styles.circleHeaderBtn}>
                <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>เนื้อร้อง / Lyrics</Text>
              <View style={{ width: 42 }} />
            </View>

            <ScrollView contentContainerStyle={styles.lyricsScrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLyricsTitle}>{mainTitle}</Text>
              <Text style={styles.modalLyricsArtist}>{subTitle}</Text>
              <View style={styles.lyricsDivider} />
              <Text style={styles.lyricsBodyText}>
                {song?.lyrics || song?.lyric || 'ยังไม่มีข้อมูลเนื้อเพลงในระบบ'}
              </Text>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

export default PlayerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 10,
    fontSize: 14,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: STATUSBAR_HEIGHT + 5,
    height: 48,
  },
  circleHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  coverContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  coverImage: {
    width: width * 0.72,
    height: width * 0.72,
    maxHeight: height * 0.38,
    borderRadius: 20,
    backgroundColor: '#1E1E22',
  },
  infoContainer: {
    paddingHorizontal: 30,
    marginVertical: 4,
  },
  titleFavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  subTitle: {
    color: '#A1A1AA',
    fontSize: 15,
    marginTop: 4,
  },
  progressContainer: {
    paddingHorizontal: 30,
    marginVertical: 4,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: '#3F3F46',
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginLeft: -5,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginVertical: 4,
  },
  stepBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  stepText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  playButtonMain: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'center',
    width: '100%',
  },
  lyricsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  lyricsPlaceholder: {
    height: 30,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#121214',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: STATUSBAR_HEIGHT + 5,
    paddingBottom: 10,
  },
  lyricsScrollContent: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalLyricsTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalLyricsArtist: {
    color: '#22C55E',
    fontSize: 16,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  lyricsDivider: {
    width: 40,
    height: 3,
    backgroundColor: '#3F3F46',
    borderRadius: 2,
    marginVertical: 20,
  },
  lyricsBodyText: {
    color: '#E4E4E7',
    fontSize: 17,
    lineHeight: 30,
    textAlign: 'center',
    fontWeight: '500',
  },
});