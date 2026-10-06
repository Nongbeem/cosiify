import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const TOKEN_ICON = require('../assets/gem.png');
const { width } = Dimensions.get('window');
const SERVER_BASE_URL = 'http://10.0.2.2:5000';
const API_BASE_URL = 'http://10.0.2.2:5000/api';

const AudioPlayerScreen = ({ route, navigation }) => {
  const { track } = route.params || {};
  const [isPlaying, setIsPlaying] = useState(false);
  const [user, setUser] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasRewarded, setHasRewarded] = useState(false);
  const [position, setPosition] = useState(0); // สถานะเก็บตำแหน่งเวลา (วินาที)

  const price = track?.price || 0;
  const trackId = track?._id || track?.id;

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      let storedUserData = await AsyncStorage.getItem('userData') || await AsyncStorage.getItem('user');
      if (storedUserData) {
        const parsedUser = JSON.parse(storedUserData);
        const userId = parsedUser.id || parsedUser._id;

        // 📍 เช็คก่อนว่ามี userId หรือไม่
        if (userId) {
          const userRes = await fetch(`${API_BASE_URL}/users/${userId}`).catch(() => null);
          if (userRes && userRes.ok) {
            const userData = await userRes.json();
            setUser(userData);
            const purchased = userData.purchasedAudiobooks || [];
            // 📍 แปลง ID เป็น String เพื่อเปรียบเทียบค่าได้อย่างถูกต้อง
            if (purchased.some((id) => String(id) === String(trackId))) {
              setIsUnlocked(true);
            }
          } else {
            setUser(parsedUser);
          }
        } else {
          setUser(parsedUser);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }

    if (!price || price === 0) {
      setIsUnlocked(true);
      setIsPlaying(true);
    }
  };

  // 📍 ฟังก์ชันแจก 1,000 Tokens เมื่อผู้ใช้กดรับฟัง
  const handleRewardTokens = async () => {
    if (hasRewarded) return;

    const userId = user?.id || user?._id;
    if (!userId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/users/reward-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: 1000,
          contentType: 'audiobook',
          contentId: trackId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHasRewarded(true);

        const newBalance = data.tokensBalance ?? ((user?.tokensBalance || 0) + 1000);
        const updatedUser = { ...user, tokensBalance: newBalance };
        setUser(updatedUser);

        const stored = await AsyncStorage.getItem('userData');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.tokensBalance = newBalance;
          await AsyncStorage.setItem('userData', JSON.stringify(parsed));
        }

        Alert.alert('🎉 ยินดีด้วย!', 'คุณได้รับ 1,000 Tokens จากการฟังหนังสือเสียงเรื่องนี้');
      }
    } catch (error) {
      console.error('Error rewarding audio tokens:', error);
    }
  };

  const handlePlayToggle = async () => {
    if (!isUnlocked && price > 0) {
      const balance = user?.tokensBalance || 0;

      if (balance < price) {
        Alert.alert('เหรียญไม่เพียงพอ', `รายการนี้มีราคา ${price} เหรียญ แต่คุณมี ${balance} เหรียญ`);
        return;
      }

      Alert.alert(
        'ปลดล็อกเสียง',
        `ใช้ ${price} เหรียญเพื่อรับฟังเรื่องนี้หรือไม่?`,
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ปลดล็อก',
            onPress: processPurchase,
          },
        ]
      );
      return;
    }

    const nextState = !isPlaying;
    setIsPlaying(nextState);

    // 📍 เรียกฟังก์ชันรับ 1,000 Tokens เมื่อกดเริ่มเล่น
    if (nextState) {
      handleRewardTokens();
    }
  };

  // 📍 ฟังก์ชันเดินหน้า 10 วินาที
  const handleForward10 = () => {
    if (!isUnlocked && price > 0) {
      Alert.alert('กรุณาปลดล็อกก่อน', 'ต้องปลดล็อกหนังสือเสียงก่อนทำการข้ามเวลา');
      return;
    }
    setPosition((prev) => prev + 10);
  };

  // 📍 ฟังก์ชันถอยหลัง 10 วินาที
  const handleRewind10 = () => {
    if (!isUnlocked && price > 0) {
      Alert.alert('กรุณาปลดล็อกก่อน', 'ต้องปลดล็อกหนังสือเสียงก่อนทำการข้ามเวลา');
      return;
    }
    setPosition((prev) => Math.max(0, prev - 10));
  };

  const processPurchase = async () => {
    const userId = user?.id || user?._id;
    try {
      const res = await fetch(`${API_BASE_URL}/audiobooks/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, audioId: trackId }),
      });

      if (res.ok) {
        const data = await res.json();
        const newBalance = data.tokensBalance ?? ((user?.tokensBalance || 0) - price);

        const updatedUser = { ...user, tokensBalance: newBalance };
        setUser(updatedUser);
        setIsUnlocked(true);
        setIsPlaying(true);

        const stored = await AsyncStorage.getItem('userData');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.tokensBalance = newBalance;
          await AsyncStorage.setItem('userData', JSON.stringify(parsed));
        }

        Alert.alert('สำเร็จ', 'ปลดล็อกเรียบร้อยแล้ว!');
      } else {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถตัดเหรียญได้');
      }
    } catch (e) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string') {
      return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500';
    }
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    return `${SERVER_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  const mainTitle = track?.title || track?.name || 'ไม่มีชื่อเรื่อง';
  const authorName = track?.author || track?.narrator || track?.artist || 'ไม่ระบุผู้แต่ง';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.circleHeaderBtn}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity style={styles.circleHeaderBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.coverContainer}>
        <Image source={{ uri: getImageUrl(track?.coverImage) }} style={styles.coverImage} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.titleText} numberOfLines={2}>{mainTitle}</Text>
        <Text style={styles.subTitleText} numberOfLines={1}>{authorName}</Text>

        {price > 0 && (
          <View style={styles.priceRow}>
            {isUnlocked ? (
              <Text style={styles.unlockedText}>✓ ปลดล็อกแล้ว</Text>
            ) : (
              <>
                <Image source={TOKEN_ICON} style={styles.tokenIconPlayer} />
                <Text style={styles.priceText}>ราคา: {price} เหรียญ</Text>
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.mainControlsRow}>
          <TouchableOpacity style={styles.skipBtn} activeOpacity={0.7} onPress={handleRewind10}>
            <Ionicons name="play-back" size={26} color="#FFFFFF" />
            <Text style={styles.skipText}>-10s</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playPauseBtn} activeOpacity={0.8} onPress={handlePlayToggle}>
            <Ionicons
              name={!isUnlocked && price > 0 ? 'lock-closed' : isPlaying ? 'pause' : 'play'}
              size={28}
              color="#000000"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} activeOpacity={0.7} onPress={handleForward10}>
            <Ionicons name="play-forward" size={26} color="#FFFFFF" />
            <Text style={styles.skipText}>+10s</Text>
          </TouchableOpacity>
        </View>

        {hasRewarded && (
          <Text style={styles.rewardedBadge}>✨ รับ 1,000 Tokens สำเร็จแล้ว!</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

export default AudioPlayerScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', justifyContent: 'space-between', paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 10 },
  circleHeaderBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2C2C2E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  coverContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  coverImage: { width: width * 0.8, height: width * 0.8, borderRadius: 20, backgroundColor: '#1E1E22' },
  infoContainer: { paddingHorizontal: 28, alignItems: 'flex-start' },
  titleText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  subTitleText: { color: '#8E8E93', fontSize: 15, marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  priceText: { color: '#22C55E', fontSize: 13, fontWeight: '700' },
  unlockedText: { color: '#22C55E', fontSize: 13, fontWeight: '700' },
  controlsContainer: { alignItems: 'center', justifyContent: 'center' },
  mainControlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  skipBtn: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  skipText: { color: '#8E8E93', fontSize: 11, fontWeight: '600', marginTop: 2 },
  playPauseBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  tokenIconPlayer: { width: 18, height: 18, resizeMode: 'contain', marginRight: 6 },
  rewardedBadge: { color: '#22C55E', fontSize: 13, fontWeight: '600', marginTop: 12, textAlign: 'center' },
});