import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

const commentIcon = require('../assets/comment.png');
const heartIcon = require('../assets/like.g.png');
const heartActiveIcon = require('../assets/like.c.png');

const API_BASE_URL = 'http://10.0.2.2:5000/api';
const SERVER_BASE_URL = 'http://10.0.2.2:5000';
const GEM_ICON = require('../assets/gem.png');

export default function WebtoonDetailScreen({ route, navigation }) {
  const { item, webtoon, webtoonId } = route.params || {};
  const initialData = item || webtoon || {};

  // 📍 สกัดหา Webtoon ID ที่แท้จริง (รองรับกรณีคลิกมาจากแจ้งเตือน Notification)
  const extractWebtoonId = (data) => {
    if (webtoonId) return webtoonId;
    if (!data) return null;
    if (data.webtoonId) return data.webtoonId;
    if (data.targetId) return data.targetId;
    if (data.contentId) {
      return typeof data.contentId === 'object' ? data.contentId._id || data.contentId.id : data.contentId;
    }
    return data._id || data.id;
  };

  const id = extractWebtoonId(initialData);

  // 📍 เช็กว่าเป็น Object แจ้งเตือนหรือไม่
  const isNotification = Boolean(
    initialData.webtoonId || 
    initialData.targetId || 
    initialData.message || 
    (initialData.contentType && initialData.contentType !== 'webtoon')
  );

  // หากมาจากแจ้งเตือน จะไม่นำชื่อ/ข้อความแจ้งเตือนมาแสดงเป็นข้อมูลการ์ตูนเริ่มต้น
  const [webtoonDetail, setWebtoonDetail] = useState(isNotification ? {} : initialData);
  const [episodes, setEpisodes] = useState([]);
  const [unlockedEpisodes, setUnlockedEpisodes] = useState([]); // รายการตอนที่ปลดล็อกแบบซื้อ
  const [readEpisodes, setReadEpisodes] = useState([]); // 📍 รายการตอนที่เคยเปิดอ่านแล้ว (ทั้งฟรีและซื้อ)
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userTokens, setUserTokens] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // 📍 รีเฟรชข้อมูลเหรียญ ตอนที่ปลดล็อก และประวัติการอ่านเมื่อกลับมาหน้านี้
  useFocusEffect(
    useCallback(() => {
      if (id) {
        getUserAndEpisodes();
      } else {
        setLoading(false);
      }
    }, [id])
  );

  const getUserAndEpisodes = async () => {
    try {
      setLoading(true);

      // ดึงประวัติการอ่านจาก AsyncStorage
      const storedReadEps = await AsyncStorage.getItem('readEpisodes');
      const localReadEps = storedReadEps ? JSON.parse(storedReadEps) : [];
      setReadEpisodes(localReadEps);

      let storedUserData = await AsyncStorage.getItem('userData');
      if (!storedUserData) {
        storedUserData = await AsyncStorage.getItem('user');
      }

      let currentUserId = null;
      let parsedUser = null;
      if (storedUserData) {
        parsedUser = JSON.parse(storedUserData);
        currentUserId = parsedUser.id || parsedUser._id;
        setUserId(currentUserId);

        if (currentUserId) {
          const userRes = await fetch(`${API_BASE_URL}/users/${currentUserId}`).catch(() => null);
          if (userRes && userRes.ok) {
            const userData = await userRes.json();
            const balance = userData.tokensBalance ?? userData.user?.tokensBalance ?? 0;
            setUserTokens(balance);
            setUnlockedEpisodes(userData.unlockedEpisodes || userData.user?.unlockedEpisodes || []);
          } else {
            setUserTokens(parsedUser.tokensBalance || 0);
            setUnlockedEpisodes(parsedUser.unlockedEpisodes || []);
          }

          const favRes = await fetch(`${API_BASE_URL}/favorites/${currentUserId}`).catch(() => null);
          if (favRes && favRes.ok) {
            const favs = await favRes.json();
            const exist = Array.isArray(favs) && favs.some((f) => (f.contentId?._id || f.contentId) === id && f.contentType === 'webtoon');
            setIsFavorite(exist);
          }
        }
      }

      const webtoonRes = await fetch(`${API_BASE_URL}/webtoons/${id}`).catch(() => null);
      if (webtoonRes && webtoonRes.ok) {
        const wData = await webtoonRes.json();
        const finalWData = wData.data || wData.webtoon || wData;
        setWebtoonDetail(finalWData);
      }

      let epRes = await fetch(`${API_BASE_URL}/episodes/webtoon/${id}`).catch(() => null);
      if (!epRes || !epRes.ok) {
        epRes = await fetch(`${API_BASE_URL}/episodes?webtoonId=${id}`).catch(() => null);
      }

      if (epRes && epRes.ok) {
        const data = await epRes.json();
        const episodeList = Array.isArray(data) ? data : (data.episodes || data.data || []);
        setEpisodes(episodeList);
      }
    } catch (error) {
      console.error('Fetch webtoon detail/episodes error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markEpisodeAsReadLocally = async (epId) => {
    try {
      if (!epId) return;
      const epIdStr = epId.toString();
      const storedReadEps = await AsyncStorage.getItem('readEpisodes');
      let currentRead = storedReadEps ? JSON.parse(storedReadEps) : [];
      if (!currentRead.includes(epIdStr)) {
        currentRead.push(epIdStr);
        await AsyncStorage.setItem('readEpisodes', JSON.stringify(currentRead));
        setReadEpisodes(currentRead);
      }
    } catch (err) {
      console.log('Error marking as read:', err);
    }
  };

  const toggleFavorite = async () => {
    if (!userId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนกดถูกใจ');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          contentType: 'webtoon',
          contentId: id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsFavorite(data.isFavorite ?? !isFavorite);
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกรายการโปรดได้');
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  const handleOpenComments = (episodeId = null, epTitle = '') => {
    navigation.navigate('CommentScreen', {
      contentType: episodeId ? 'episode' : 'webtoon',
      contentId: episodeId || id,
      title: epTitle ? `${webtoonDetail?.title || 'การ์ตูน'} - ${epTitle}` : (webtoonDetail?.title || 'ความคิดเห็นการ์ตูน'),
    });
  };

  const handleAddToWebtoonList = async () => {
    if (!userId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนเพิ่มรายการ');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/playlists?userId=${userId}`);
      if (res.ok) {
        const playlists = await res.json();
        const webtoonLists = playlists.filter((p) => p.type === 'webtoon' || p.type === 'comic');

        if (webtoonLists.length === 0) {
          createDefaultWebtoonList();
        } else {
          addWebtoonToList(webtoonLists[0]._id || webtoonLists[0].id);
        }
      }
    } catch (e) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const createDefaultWebtoonList = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: 'My Webtoon List',
          type: 'webtoon',
        }),
      });

      if (res.ok) {
        const newlist = await res.json();
        const listId = newlist.data?._id || newlist.data?.id;
        addWebtoonToList(listId);
      }
    } catch (error) {
      console.error('Create list error:', error);
    }
  };

  const addWebtoonToList = async (listId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${listId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: id }),
      });

      if (res.ok) {
        Alert.alert('สำเร็จ', 'บันทึกเข้า Webtoon List เรียบร้อยแล้ว');
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเพิ่มการ์ตูนเข้า List ได้');
      }
    } catch (e) {
      Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการทำรายการ');
    }
  };

  const getImageUrl = (path) => {
    if (!path || typeof path !== 'string') return 'https://via.placeholder.com/400x300';
    if (path.startsWith('http')) return path;
    return `${SERVER_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const handleReadEpisode = async (episode) => {
    const epId = episode._id || episode.id;
    const price = episode.price || 0;
    const epIdStr = epId ? epId.toString() : '';

    const isUnlocked = unlockedEpisodes.some((unlockedId) => unlockedId && unlockedId.toString() === epIdStr);
    const isRead = readEpisodes.some((rId) => rId && rId.toString() === epIdStr);

    if (price === 0 || isUnlocked || isRead) {
      // 📍 บันทึกว่าถูกอ่านแล้ว
      await markEpisodeAsReadLocally(epId);

      navigation.navigate('WebtoonReader', {
        episodeId: epId,
        webtoonId: id,
        webtoonTitle: webtoonDetail?.title || 'อ่านการ์ตูน',
        userId: userId,
      });
      return;
    }

    if (!userId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนปลดล็อกอ่านเนื้อหา');
      return;
    }

    if (userTokens < price) {
      Alert.alert(
        'เหรียญไม่พอ',
        `ตอนนี้ราคา ${price} เหรียญ (คุณมีอยู่ ${userTokens} เหรียญ)\nกรุณาเติมเหรียญก่อนใช้งาน`
      );
      return;
    }

    Alert.alert(
      'ปลดล็อกเนื้อหา',
      `คุณต้องการใช้ ${price} เหรียญ เพื่ออ่าน ตอนที่ ${episode.episodeNumber || ''} หรือไม่?\n(เหรียญคงเหลือ: ${userTokens})`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ยืนยันซื้อ', onPress: () => processPurchase(episode) },
      ]
    );
  };

  const processPurchase = async (episode) => {
    const epId = episode._id || episode.id;
    try {
      const res = await fetch(`${API_BASE_URL}/episodes/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          episodeId: epId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const newBalance = data.tokensBalance ?? (userTokens - (episode.price || 0));
        setUserTokens(newBalance);
        setUnlockedEpisodes((prev) => [...prev, epId]);

        // 📍 บันทึกตอนที่อ่านแล้ว
        await markEpisodeAsReadLocally(epId);

        // อัปเดตเหรียญและ unlockedEpisodes ลง AsyncStorage
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          const parsed = JSON.parse(storedUserData);
          parsed.tokensBalance = newBalance;
          parsed.unlockedEpisodes = [...(parsed.unlockedEpisodes || []), epId];
          await AsyncStorage.setItem('userData', JSON.stringify(parsed));
        }

        Alert.alert('สำเร็จ', 'ปลดล็อกตอนเรียบร้อยแล้ว!');

        navigation.navigate('WebtoonReader', {
          episodeId: epId,
          webtoonId: id,
          webtoonTitle: webtoonDetail?.title || 'อ่านการ์ตูน',
          userId: userId,
        });
      } else {
        Alert.alert('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถทำรายการได้');
      }
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเครื่องเซิร์ฟเวอร์ได้');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121214" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {webtoonDetail?.title || 'รายละเอียดการ์ตูน'}
        </Text>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity style={styles.favBtn} onPress={handleAddToWebtoonList}>
            <Ionicons name="bookmark-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.tokenBadge}>
            <Image source={GEM_ICON} style={styles.headerGemIcon} />
            <Text style={styles.tokenText}>{userTokens}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image source={{ uri: getImageUrl(webtoonDetail?.coverImage) }} style={styles.coverImage} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>• เรื่องย่อ</Text>
          <Text style={styles.synopsisText}>{webtoonDetail?.synopsis || 'ไม่มีข้อมูลเรื่องย่อ'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>• อาจารย์ผู้แต่ง</Text>
          <View style={styles.authorRow}>
            <Image
              source={{ uri: getImageUrl(webtoonDetail?.authorImage) }}
              style={styles.authorAvatar}
            />
            <Text style={styles.authorName}>{webtoonDetail?.author || 'ไม่ระบุชื่อ'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>• เลือกตอน</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#22C55E" style={{ marginVertical: 20 }} />
          ) : episodes.length > 0 ? (
            episodes.map((ep, index) => {
              const epId = ep._id || ep.id;
              const price = ep.price || 0;
              const epIdStr = epId?.toString();

              // 📍 เช็กว่าตอนดังกล่าวถูกปลดล็อกแล้ว หรือ เคยเปิดอ่านแล้วหรือไม่
              const isUnlocked = unlockedEpisodes.some((unlockedId) => unlockedId && unlockedId.toString() === epIdStr);
              const isRead = readEpisodes.some((rId) => rId && rId.toString() === epIdStr);
              const isReadOrUnlocked = isUnlocked || isRead;

              return (
                <View key={epId || index} style={styles.episodeCard}>
                  <Image source={{ uri: getImageUrl(ep.coverImage) }} style={styles.epThumb} />

                  <View style={styles.epInfo}>
                    <Text style={styles.epTitle}>EP {ep.episodeNumber || index + 1}</Text>
                    {ep.title ? <Text style={styles.epSubTitle}>{ep.title}</Text> : null}
                  </View>

                  {/* 📍 เงื่อนไขแสดงผลปุ่ม */}
                  {isReadOrUnlocked ? (
                    <TouchableOpacity
                      style={styles.boughtReadBtn}
                      onPress={() => handleReadEpisode(ep)}
                    >
                      <Text style={styles.boughtReadBtnText}>อ่านแล้ว</Text>
                    </TouchableOpacity>
                  ) : price > 0 ? (
                    <TouchableOpacity
                      style={styles.paidReadBtn}
                      onPress={() => handleReadEpisode(ep)}
                    >
                      <Image source={GEM_ICON} style={styles.btnGemIcon} />
                      <Text style={styles.paidReadBtnText}>{price}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.readBtn}
                      onPress={() => handleReadEpisode(ep)}
                    >
                      <Text style={styles.readBtnText}>อ่านฟรี</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>ยังไม่มีตอนในระบบ</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={styles.bottomBarWrapper}>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenComments()}>
            <Image source={commentIcon} style={styles.iconImage} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={toggleFavorite}>
            <Image source={isFavorite ? heartActiveIcon : heartIcon} style={styles.iconImage} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#242428',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#242428',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: { color: '#ffffff', fontSize: 28, fontWeight: '300', marginTop: -4 },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242428',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  headerGemIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
    resizeMode: 'contain',
  },
  tokenText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 80 },
  coverImage: { width: '100%', height: 220, borderRadius: 16, marginBottom: 16, backgroundColor: '#242428' },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  synopsisText: { color: '#9CA3AF', fontSize: 14, lineHeight: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  authorAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#242428' },
  authorName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242428',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  epThumb: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: '#333' },
  epInfo: { flex: 1 },
  epTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  epSubTitle: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  readBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  readBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
  boughtReadBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  boughtReadBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  paidReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnGemIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
    resizeMode: 'contain',
  },
  paidReadBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
  emptyText: { color: '#6B7280', textAlign: 'center', marginVertical: 10 },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 35, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    elevation: 8,
  },
  actionBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});