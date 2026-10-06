import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../components/Header';
import Category from '../components/Category';

const API_BASE_URL = 'http://10.0.2.2:5000/api';
const SERVER_BASE_URL = 'http://10.0.2.2:5000';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';

const HomeScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State สำหรับ Modal เลือก Playlist / Webtoon List
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [selectedContent, setSelectedContent] = useState({ id: null, type: 'track' });
  const [userPlaylists, setUserPlaylists] = useState([]);

  // State สำหรับเก็บ ID รายการโปรด
  const [favoriteSet, setFavoriteSet] = useState(new Set());

  // 📍 State สำหรับเก็บชื่อศิลปิน/ผู้แต่งที่ติดตาม (แยกตาม User)
  const [followedArtistsSet, setFollowedArtistsSet] = useState(new Set());
  const [followedAuthorsSet, setFollowedAuthorsSet] = useState(new Set());

  const [dbData, setDbData] = useState({
    user: null,
    tracks: [],
    webtoons: [],
    audiobooks: [],
    ebooks: [],
  });

  useFocusEffect(
    useCallback(() => {
      fetchDatabaseData();
    }, [])
  );

  const fetchDatabaseData = async () => {
    try {
      setLoading(true);

      const storedUserData = await AsyncStorage.getItem('userData');
      let user = storedUserData ? JSON.parse(storedUserData) : null;
      let userId = user?.id || user?._id;

      if (userId) {
        try {
          const userRes = await fetch(`${API_BASE_URL}/users/${userId}`);
          if (userRes.ok) {
            const dbUser = await userRes.json();
            user = { ...user, ...dbUser };
            await AsyncStorage.setItem('userData', JSON.stringify(user));

            // 📍 อัปเดตรายการที่ติดตามของ User คนนี้
            if (Array.isArray(dbUser.followingArtists)) {
              setFollowedArtistsSet(new Set(dbUser.followingArtists));
            }
            if (Array.isArray(dbUser.followingAuthors)) {
              setFollowedAuthorsSet(new Set(dbUser.followingAuthors));
            }
          }
        } catch (e) {
          console.log('Fetch DB user error');
        }

        try {
          const favRes = await fetch(`${API_BASE_URL}/favorites/${userId}`);
          if (favRes.ok) {
            const favs = await favRes.json();
            const favArray = Array.isArray(favs) ? favs : favs.data || [];
            const favKeys = new Set(
              favArray.map((f) => `${f.contentType}_${f.contentId?._id || f.contentId}`)
            );
            setFavoriteSet(favKeys);
          }
        } catch (e) {
          console.log('Fetch favorites error', e);
        }
      }

      const parseArray = async (res) => {
        if (!res?.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : data?.data || [];
      };

      const [tracksRes, webtoonsRes, audiobooksRes, ebooksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tracks`).catch(() => null),
        fetch(`${API_BASE_URL}/webtoons`).catch(() => null),
        fetch(`${API_BASE_URL}/audiobooks`).catch(() => null),
        fetch(`${API_BASE_URL}/ebooks`).catch(() => null),
      ]);

      setDbData({
        user,
        tracks: await parseArray(tracksRes),
        webtoons: await parseArray(webtoonsRes),
        audiobooks: await parseArray(audiobooksRes),
        ebooks: await parseArray(ebooksRes),
      });
    } catch (error) {
      console.error('Error fetching database:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 📍 ฟังก์ชันติดตาม / เลิกติดตามศิลปิน (แยกตาม User)
  const handleToggleFollowArtist = async (artistName) => {
    const userId = dbData.user?.id || dbData.user?._id;
    if (!userId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนทำการติดตาม');
      return;
    }

    const isFollowing = followedArtistsSet.has(artistName);
    const newSet = new Set(followedArtistsSet);

    if (isFollowing) {
      newSet.delete(artistName);
    } else {
      newSet.add(artistName);
    }

    setFollowedArtistsSet(newSet);
    const updatedArray = Array.from(newSet);

    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingArtists: updatedArray }),
      });

      if (res.ok) {
        const updatedUser = { ...dbData.user, followingArtists: updatedArray };
        setDbData((prev) => ({ ...prev, user: updatedUser }));
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      } else {
        setFollowedArtistsSet(followedArtistsSet);
      }
    } catch (error) {
      console.error('Toggle follow artist error:', error);
      setFollowedArtistsSet(followedArtistsSet);
    }
  };

  // 📍 ฟังก์ชันติดตาม / เลิกติดตามผู้แต่ง (แยกตาม User)
  const handleToggleFollowAuthor = async (authorName) => {
    const userId = dbData.user?.id || dbData.user?._id;
    if (!userId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนทำการติดตาม');
      return;
    }

    const isFollowing = followedAuthorsSet.has(authorName);
    const newSet = new Set(followedAuthorsSet);

    if (isFollowing) {
      newSet.delete(authorName);
    } else {
      newSet.add(authorName);
    }

    setFollowedAuthorsSet(newSet);
    const updatedArray = Array.from(newSet);

    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingAuthors: updatedArray }),
      });

      if (res.ok) {
        const updatedUser = { ...dbData.user, followingAuthors: updatedArray };
        setDbData((prev) => ({ ...prev, user: updatedUser }));
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      } else {
        setFollowedAuthorsSet(followedAuthorsSet);
      }
    } catch (error) {
      console.error('Toggle follow author error:', error);
      setFollowedAuthorsSet(followedAuthorsSet);
    }
  };

  // 📍 อัปเดตข้อมูลผู้ใช้งาน (เช่น ชื่อ) ผ่าน Modal ใน Header
  const handleUpdateProfile = async (updatedFields) => {
    const userId = dbData.user?.id || dbData.user?._id;
    if (!userId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนทำการแก้ไขข้อมูล');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        const mergedUser = { ...dbData.user, ...(updatedUser.user || updatedUser) };

        setDbData((prev) => ({ ...prev, user: mergedUser }));
        await AsyncStorage.setItem('userData', JSON.stringify(mergedUser));
        Alert.alert('สำเร็จ', 'อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว');
      } else {
        Alert.alert('ผิดพลาด', 'ไม่สามารถอัปเดตข้อมูลได้');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // 📍 จัดการเมื่อกดปุ่มกระดิ่งแจ้งเตือนใน Header
  const handleNotificationPress = () => {
    // Header จัดการเปิด Modal เองอยู่แล้ว
  };

  // 📍 นำทางเมื่อกดเลือกรายการใน Modal แจ้งเตือนไปยัง Screen ที่ถูกต้อง
  const handleNotificationItemPress = (item) => {
    if (!item) return;

    const itemType = item.type;
    switch (itemType) {
      case 'song':
      case 'new_track':
        navigation?.navigate('Player', { track: item, trackId: item._id || item.id });
        break;

      case 'audiobook':
      case 'new_audiobook':
        navigation?.navigate('Player', {
          track: item,
          item: item,
          audiobook: item,
          trackId: item._id || item.id,
          isAudiobook: true,
        });
        break;

      case 'webtoon':
      case 'new_webtoon':
      case 'new_episode':
        navigation?.navigate('WebtoonDetail', { item: item, webtoonId: item._id || item.id });
        break;

      case 'ebook':
      case 'new_ebook':
        navigation?.navigate('Ebook', { item: item, bookId: item._id || item.id });
        break;

      default:
        break;
    }
  };

  const handleOpenAddModal = async (contentId, contentType = 'track') => {
    const userId = dbData.user?.id || dbData.user?._id;
    if (!userId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนทำรายการ');
      return;
    }
    setSelectedContent({ id: contentId, type: contentType });

    try {
      const res = await fetch(`${API_BASE_URL}/playlists?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        const allLists = Array.isArray(data) ? data : data.data || [];

        const filtered =
          contentType === 'webtoon'
            ? allLists.filter((pl) => pl.type === 'webtoon')
            : allLists.filter((pl) => pl.type !== 'webtoon');

        setUserPlaylists(filtered);
        setPlaylistModalVisible(true);
      }
    } catch (error) {
      console.error('Fetch playlists error:', error);
    }
  };

  const handleAddContentToPlaylist = async (playlistId) => {
    try {
      const isWebtoon = selectedContent?.type === 'webtoon';
      const endpoint = isWebtoon
        ? `${API_BASE_URL}/playlists/${playlistId}/webtoons`
        : `${API_BASE_URL}/playlists/${playlistId}/tracks`;

      const bodyData = isWebtoon
        ? { webtoonId: selectedContent?.id, contentId: selectedContent?.id }
        : { trackId: selectedContent?.id, contentId: selectedContent?.id };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (res.ok) {
        Alert.alert(
          'สำเร็จ',
          `เพิ่มเข้า ${isWebtoon ? 'Webtoon List' : 'Playlist'} เรียบร้อยแล้ว`
        );
        setPlaylistModalVisible(false);
      } else {
        Alert.alert('ผิดพลาด', 'ไม่สามารถเพิ่มรายการได้');
      }
    } catch (error) {
      Alert.alert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleToggleFavorite = async (contentType, contentId) => {
    const userId = dbData.user?.id || dbData.user?._id;
    if (!userId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนเพิ่มรายการโปรด');
      return;
    }

    const key = `${contentType}_${contentId}`;
    const isFav = favoriteSet.has(key);

    const newFavSet = new Set(favoriteSet);
    if (isFav) {
      newFavSet.delete(key);
    } else {
      newFavSet.add(key);
    }
    setFavoriteSet(newFavSet);

    try {
      const response = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, contentType, contentId }),
      });

      if (!response.ok) {
        setFavoriteSet(favoriteSet);
      }
    } catch (error) {
      setFavoriteSet(favoriteSet);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    return `${SERVER_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  const normalizeName = (name) => {
    if (!name || typeof name !== 'string') return '';
    return name
      .trim()
      .toLowerCase()
      .replace(/ะ/g, '')
      .replace(/\s+/g, '');
  };

  const getUniqueEntities = (itemList, nameKey = 'author', imageKey = 'authorImage') => {
    const map = new Map();
    itemList.forEach((item) => {
      const rawName = typeof item[nameKey] === 'object' ? item[nameKey]?.name : item[nameKey];
      const rawImg = typeof item[nameKey] === 'object' ? item[nameKey]?.image : item[imageKey];

      if (rawName && typeof rawName === 'string') {
        const displayName = rawName.trim();
        const key = normalizeName(displayName);

        if (key) {
          if (!map.has(key)) {
            map.set(key, { name: displayName, image: rawImg || null });
          } else if (!map.get(key).image && rawImg) {
            map.get(key).image = rawImg;
          }
        }
      }
    });
    return Array.from(map.values());
  };

  const handlePlayTrack = (item) => navigation?.navigate('Player', { track: item, trackId: item._id });
  const handleOpenAudiobook = (item) =>
    navigation?.navigate('Player', {
      track: item,
      item: item,
      audiobook: item,
      trackId: item._id,
      isAudiobook: true,
    });
  const handleOpenEbook = (item) => navigation?.navigate('Ebook', { item: item, bookId: item._id });
  const handleOpenWebtoon = (item) => navigation?.navigate('WebtoonDetail', { item: item, webtoonId: item._id });

  const groupByGenre = (itemList, defaultGenreName) => {
    return itemList.reduce((acc, item) => {
      const genreName =
        (item.genreId && typeof item.genreId === 'object' && item.genreId.name) ||
        (typeof item.genreId === 'string' && item.genreId.trim() !== '' && item.genreId) ||
        item.genre ||
        item.category ||
        defaultGenreName;

      if (!acc[genreName]) acc[genreName] = [];
      acc[genreName].push(item);
      return acc;
    }, {});
  };

  const musicGenreGroups = groupByGenre(dbData.tracks, 'เพลงทั่วไป');
  const webtoonGenreGroups = groupByGenre(dbData.webtoons, 'การ์ตูนยอดนิยม');
  const audiobookGenreGroups = groupByGenre(dbData.audiobooks, 'หนังสือเสียงแนะนำ');
  const ebookGenreGroups = groupByGenre(dbData.ebooks, 'E-Book ยอดนิยม');

  const uniqueArtists = getUniqueEntities(dbData.tracks, 'artist', 'artistImage');
  const uniqueWebtoonAuthors = getUniqueEntities(dbData.webtoons, 'author', 'authorImage');
  const uniqueAudiobookAuthors = getUniqueEntities(dbData.audiobooks, 'author', 'authorImage');
  const uniqueEbookAuthors = getUniqueEntities(dbData.ebooks, 'author', 'authorImage');

  const showMusic = selectedCategory === 'ทั้งหมด' || selectedCategory === 'เพลง';
  const showWebtoons = selectedCategory === 'ทั้งหมด' || selectedCategory === 'หนังสือการ์ตูน';
  const showAudiobooks = selectedCategory === 'ทั้งหมด' || selectedCategory === 'หนังสือเสียง';
  const showEbooks = selectedCategory === 'ทั้งหมด' || selectedCategory === 'E-Book';

  return (
    <SafeAreaView style={styles.container}>
      <Header
        userId={dbData.user?.id || dbData.user?._id}
        apiUrl={SERVER_BASE_URL}
        userName={dbData.user?.name}
        points={dbData.user?.tokensBalance}
        userImage={getImageUrl(dbData.user?.profileImage)}
        onLogout={async () => {
          await AsyncStorage.removeItem('userData');
          navigation?.reset({ index: 0, routes: [{ name: 'Splash' }] });
        }}
        onNotificationPress={handleNotificationPress}
        onNotificationItemPress={handleNotificationItemPress}
        onUpdateProfile={handleUpdateProfile}
      />

      <Category activeCategory={selectedCategory} setActiveCategory={setSelectedCategory} />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDatabaseData();
              }}
              tintColor="#22C55E"
            />
          }
        >
          {/* ================= 1. หมวดเพลง ================= */}
          {showMusic && dbData.tracks.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>• แนะนำสำหรับคุณ</Text>
              <TouchableOpacity
                style={styles.recommendedBanner}
                activeOpacity={0.9}
                onPress={() => handlePlayTrack(dbData.tracks[0])}
              >
                <Image
                  source={{ uri: getImageUrl(dbData.tracks[0]?.coverImage) || DEFAULT_AVATAR }}
                  style={styles.bannerImage}
                />
              </TouchableOpacity>

              {Object.keys(musicGenreGroups).map((genreName) => (
                <View key={genreName} style={styles.genreBlock}>
                  <Text style={styles.subSectionTitle}>• เพลง {genreName}</Text>
                  <View style={styles.grid2Col}>
                    {musicGenreGroups[genreName].map((item) => {
                      const isFav = favoriteSet.has(`track_${item._id}`);
                      return (
                        <TouchableOpacity
                          key={item._id}
                          style={styles.gridCardRow}
                          activeOpacity={0.8}
                          onPress={() => handlePlayTrack(item)}
                        >
                          <Image
                            source={{ uri: getImageUrl(item.coverImage) || DEFAULT_AVATAR }}
                            style={styles.gridCardThumb}
                          />
                          <View style={styles.gridCardTextContainer}>
                            <Text style={styles.gridCardTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={styles.gridCardSub} numberOfLines={1}>
                              {item.artist || 'ไม่ระบุศิลปิน'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity
                              style={styles.heartInlineBtn}
                              onPress={() => handleOpenAddModal(item._id, 'track')}
                            >
                              <Ionicons name="add-circle-outline" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.heartInlineBtn}
                              onPress={() => handleToggleFavorite('track', item._id)}
                            >
                              <Ionicons
                                name={isFav ? 'heart' : 'heart-outline'}
                                size={20}
                                color={isFav ? '#EF4444' : '#9CA3AF'}
                              />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              {/* ศิลปินที่คุณอาจรู้จัก */}
              {uniqueArtists.length > 0 && (
                <View style={styles.bottomAuthorArtistBlock}>
                  <Text style={styles.sectionTitle}>• ศิลปินที่คุณอาจรู้จัก</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarListScroll}>
                    {uniqueArtists.map((artist, index) => {
                      const isFollowing = followedArtistsSet.has(artist.name);
                      return (
                        <View key={`${artist.name}_${index}`} style={styles.avatarCard}>
                          <TouchableOpacity activeOpacity={0.8}>
                            <Image
                              source={{ uri: getImageUrl(artist.image) || DEFAULT_AVATAR }}
                              style={styles.avatarImg}
                            />
                          </TouchableOpacity>
                          <Text style={styles.avatarName} numberOfLines={1}>
                            {artist.name}
                          </Text>
                          <TouchableOpacity
                            style={[styles.followBtn, isFollowing && styles.followedBtn]}
                            onPress={() => handleToggleFollowArtist(artist.name)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={isFollowing ? 'checkmark-circle' : 'add-circle-outline'}
                              size={12}
                              color={isFollowing ? '#22C55E' : '#FFFFFF'}
                            />
                            <Text style={[styles.followBtnText, isFollowing && styles.followedBtnText]}>
                              {isFollowing ? 'ติดตามแล้ว' : 'ติดตาม'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* ================= 2. หมวดหนังสือการ์ตูน (WEBTOON) ================= */}
          {showWebtoons && dbData.webtoons.length > 0 && (
            <View style={styles.sectionBlock}>
              {Object.keys(webtoonGenreGroups).map((genreName) => (
                <View key={genreName} style={styles.genreBlock}>
                  <Text style={styles.sectionTitle}>• การ์ตูน {genreName}</Text>
                  <View style={styles.grid2Col}>
                    {webtoonGenreGroups[genreName].map((item) => {
                      const isFav = favoriteSet.has(`webtoon_${item._id}`);
                      return (
                        <View key={item._id} style={styles.posterCard}>
                          <TouchableOpacity activeOpacity={0.85} onPress={() => handleOpenWebtoon(item)}>
                            <Image
                              source={{ uri: getImageUrl(item.coverImage) || DEFAULT_AVATAR }}
                              style={styles.posterImg}
                            />
                          </TouchableOpacity>

                          <View style={styles.posterBadgeGroup}>
                            <TouchableOpacity
                              style={styles.actionBadgeBtn}
                              onPress={() => handleOpenAddModal(item._id, 'webtoon')}
                            >
                              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionBadgeBtn}
                              onPress={() => handleToggleFavorite('webtoon', item._id)}
                            >
                              <Ionicons
                                name={isFav ? 'heart' : 'heart-outline'}
                                size={18}
                                color={isFav ? '#EF4444' : '#FFFFFF'}
                              />
                            </TouchableOpacity>
                          </View>

                          <Text style={styles.posterTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.posterSub} numberOfLines={1}>
                            {item.author || 'ไม่ระบุผู้แต่ง'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}

              {/* นักเขียนการ์ตูนที่คุณอาจรู้จัก */}
              {uniqueWebtoonAuthors.length > 0 && (
                <View style={styles.bottomAuthorArtistBlock}>
                  <Text style={styles.sectionTitle}>• นักเขียนการ์ตูนที่คุณอาจรู้จัก</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarListScroll}>
                    {uniqueWebtoonAuthors.map((author, index) => {
                      const isFollowing = followedAuthorsSet.has(author.name);
                      return (
                        <View key={`${author.name}_${index}`} style={styles.avatarCard}>
                          <TouchableOpacity activeOpacity={0.8}>
                            <Image
                              source={{ uri: getImageUrl(author.image) || DEFAULT_AVATAR }}
                              style={styles.avatarImg}
                            />
                          </TouchableOpacity>
                          <Text style={styles.avatarName} numberOfLines={1}>
                            {author.name}
                          </Text>
                          <TouchableOpacity
                            style={[styles.followBtn, isFollowing && styles.followedBtn]}
                            onPress={() => handleToggleFollowAuthor(author.name)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={isFollowing ? 'checkmark-circle' : 'add-circle-outline'}
                              size={12}
                              color={isFollowing ? '#22C55E' : '#FFFFFF'}
                            />
                            <Text style={[styles.followBtnText, isFollowing && styles.followedBtnText]}>
                              {isFollowing ? 'ติดตามแล้ว' : 'ติดตาม'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* ================= 3. หมวดหนังสือเสียง (AUDIOBOOKS) ================= */}
          {showAudiobooks && dbData.audiobooks.length > 0 && (
            <View style={styles.sectionBlock}>
              {Object.keys(audiobookGenreGroups).map((genreName) => (
                <View key={genreName} style={styles.genreBlock}>
                  <Text style={styles.sectionTitle}>• {genreName}</Text>
                  <View style={styles.grid2Col}>
                    {audiobookGenreGroups[genreName].map((item) => {
                      const priceVal = item.price ?? item.tokens ?? item.priceInTokens ?? 0;
                      const isFav = favoriteSet.has(`audiobook_${item._id}`);

                      // เช็กว่าหนังสือเสียงเล่มนี้ซื้อแล้วหรือยัง
                      const currentUserId = String(dbData.user?.id || dbData.user?._id || '');
                      const itemIdStr = String(item._id);
                      const isPurchasedByItem = Array.isArray(item.purchasedBy) && item.purchasedBy.some(
                        (p) => String(p?._id || p) === currentUserId
                      );
                      const userAudiobookList = [
                        ...(dbData.user?.purchasedAudiobooks || []),
                        ...(dbData.user?.unlockedAudiobooks || []),
                      ].map((id) => String(id?._id || id));
                      const isPurchasedByUser = userAudiobookList.includes(itemIdStr);
                      const isPurchased = Boolean(currentUserId) && (isPurchasedByItem || isPurchasedByUser);

                      return (
                        <View key={item._id} style={styles.posterCard}>
                          <TouchableOpacity activeOpacity={0.85} onPress={() => handleOpenAudiobook(item)}>
                            <Image
                              source={{ uri: getImageUrl(item.coverImage) || DEFAULT_AVATAR }}
                              style={styles.posterImg}
                            />
                          </TouchableOpacity>

                          <View style={[styles.priceBadgeTopLeft, isPurchased && styles.purchasedBadge]}>
                            <Text style={[styles.priceBadgeText, isPurchased && styles.purchasedBadgeText]}>
                              {isPurchased ? 'ซื้อแล้ว' : priceVal > 0 ? `${priceVal} Tokens` : 'ฟรี'}
                            </Text>
                          </View>

                          <View style={styles.posterBadgeGroup}>
                            <TouchableOpacity
                              style={styles.actionBadgeBtn}
                              onPress={() => handleToggleFavorite('audiobook', item._id)}
                            >
                              <Ionicons
                                name={isFav ? 'heart' : 'heart-outline'}
                                size={18}
                                color={isFav ? '#EF4444' : '#FFFFFF'}
                              />
                            </TouchableOpacity>
                          </View>

                          <Text style={styles.posterTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.posterSub} numberOfLines={1}>
                            {item.author || item.narrator || 'ผู้พากย์'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}

              {/* นักเขียน/ผู้พากย์หนังสือเสียงที่คุณอาจรู้จัก */}
              {uniqueAudiobookAuthors.length > 0 && (
                <View style={styles.bottomAuthorArtistBlock}>
                  <Text style={styles.sectionTitle}>• นักเขียน/ผู้พากย์หนังสือเสียงที่คุณอาจรู้จัก</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarListScroll}>
                    {uniqueAudiobookAuthors.map((author, index) => {
                      const isFollowing = followedAuthorsSet.has(author.name);
                      return (
                        <View key={`${author.name}_${index}`} style={styles.avatarCard}>
                          <TouchableOpacity activeOpacity={0.8}>
                            <Image
                              source={{ uri: getImageUrl(author.image) || DEFAULT_AVATAR }}
                              style={styles.avatarImg}
                            />
                          </TouchableOpacity>
                          <Text style={styles.avatarName} numberOfLines={1}>
                            {author.name}
                          </Text>
                          <TouchableOpacity
                            style={[styles.followBtn, isFollowing && styles.followedBtn]}
                            onPress={() => handleToggleFollowAuthor(author.name)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={isFollowing ? 'checkmark-circle' : 'add-circle-outline'}
                              size={12}
                              color={isFollowing ? '#22C55E' : '#FFFFFF'}
                            />
                            <Text style={[styles.followBtnText, isFollowing && styles.followedBtnText]}>
                              {isFollowing ? 'ติดตามแล้ว' : 'ติดตาม'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* ================= 4. หมวด E-BOOKS ================= */}
          {showEbooks && dbData.ebooks.length > 0 && (
            <View style={styles.sectionBlock}>
              {Object.keys(ebookGenreGroups).map((genreName) => (
                <View key={genreName} style={styles.genreBlock}>
                  <Text style={styles.sectionTitle}>• {genreName}</Text>
                  <View style={styles.grid2Col}>
                    {ebookGenreGroups[genreName].map((item) => {
                      const priceVal = item.price ?? item.tokens ?? item.priceInTokens ?? 0;
                      const isFav = favoriteSet.has(`ebook_${item._id}`);

                      // เช็กว่า E-Book เล่มนี้ซื้อแล้วหรือยัง
                      const currentUserId = String(dbData.user?.id || dbData.user?._id || '');
                      const itemIdStr = String(item._id);
                      const isPurchasedByItem = Array.isArray(item.purchasedBy) && item.purchasedBy.some(
                        (p) => String(p?._id || p) === currentUserId
                      );
                      const userEbookList = [
                        ...(dbData.user?.purchasedEbooks || []),
                        ...(dbData.user?.unlockedEbooks || []),
                      ].map((id) => String(id?._id || id));
                      const isPurchasedByUser = userEbookList.includes(itemIdStr);
                      const isPurchased = Boolean(currentUserId) && (isPurchasedByItem || isPurchasedByUser);

                      return (
                        <View key={item._id} style={styles.posterCard}>
                          <TouchableOpacity activeOpacity={0.85} onPress={() => handleOpenEbook(item)}>
                            <Image
                              source={{ uri: getImageUrl(item.coverImage) || DEFAULT_AVATAR }}
                              style={styles.posterImg}
                            />
                          </TouchableOpacity>

                          <View style={[styles.priceBadgeTopLeft, isPurchased && styles.purchasedBadge]}>
                            <Text style={[styles.priceBadgeText, isPurchased && styles.purchasedBadgeText]}>
                              {isPurchased ? 'ซื้อแล้ว' : priceVal > 0 ? `${priceVal} Tokens` : 'ฟรี'}
                            </Text>
                          </View>

                          <View style={styles.posterBadgeGroup}>
                            <TouchableOpacity
                              style={styles.actionBadgeBtn}
                              onPress={() => handleToggleFavorite('ebook', item._id)}
                            >
                              <Ionicons
                                name={isFav ? 'heart' : 'heart-outline'}
                                size={18}
                                color={isFav ? '#EF4444' : '#FFFFFF'}
                              />
                            </TouchableOpacity>
                          </View>

                          <Text style={styles.posterTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.posterSub} numberOfLines={1}>
                            {item.author || 'ไม่ระบุผู้แต่ง'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}

              {/* นักเขียน E-Book ที่คุณอาจรู้จัก */}
              {uniqueEbookAuthors.length > 0 && (
                <View style={styles.bottomAuthorArtistBlock}>
                  <Text style={styles.sectionTitle}>• นักเขียน E-Book ที่คุณอาจรู้จัก</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarListScroll}>
                    {uniqueEbookAuthors.map((author, index) => {
                      const isFollowing = followedAuthorsSet.has(author.name);
                      return (
                        <View key={`${author.name}_${index}`} style={styles.avatarCard}>
                          <TouchableOpacity activeOpacity={0.8}>
                            <Image
                              source={{ uri: getImageUrl(author.image) || DEFAULT_AVATAR }}
                              style={styles.avatarImg}
                            />
                          </TouchableOpacity>
                          <Text style={styles.avatarName} numberOfLines={1}>
                            {author.name}
                          </Text>
                          <TouchableOpacity
                            style={[styles.followBtn, isFollowing && styles.followedBtn]}
                            onPress={() => handleToggleFollowAuthor(author.name)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={isFollowing ? 'checkmark-circle' : 'add-circle-outline'}
                              size={12}
                              color={isFollowing ? '#22C55E' : '#FFFFFF'}
                            />
                            <Text style={[styles.followBtnText, isFollowing && styles.followedBtnText]}>
                              {isFollowing ? 'ติดตามแล้ว' : 'ติดตาม'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal เลือก Playlist / Webtoon List */}
      <Modal visible={playlistModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {selectedContent?.type === 'webtoon' ? 'เลือก Webtoon List' : 'เลือก Playlist เพื่อเพิ่มเพลง'}
            </Text>
            <ScrollView style={{ maxHeight: 220 }}>
              {userPlaylists.length > 0 ? (
                userPlaylists.map((pl) => (
                  <TouchableOpacity
                    key={pl._id}
                    style={styles.playlistSelectItem}
                    onPress={() => handleAddContentToPlaylist(pl._id)}
                  >
                    <Ionicons
                      name={pl.type === 'webtoon' ? 'book' : 'musical-notes'}
                      size={20}
                      color="#22C55E"
                    />
                    <Text style={styles.playlistSelectName} numberOfLines={1}>
                      {pl.name}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ color: '#9CA3AF', textAlign: 'center', marginVertical: 20 }}>
                  {selectedContent?.type === 'webtoon'
                    ? 'ไม่พบ Webtoon List (สร้างใหม่ได้ที่หน้า Library)'
                    : 'ไม่พบ Playlist (สร้างใหม่ได้ที่หน้า Library)'}
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.actionModalBtn, { backgroundColor: '#27272A', marginTop: 12 }]}
              onPress={() => setPlaylistModalVisible(false)}
            >
              <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: '600' }}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 130 },
  sectionBlock: { marginTop: 16 },
  genreBlock: { marginTop: 16 },
  bottomAuthorArtistBlock: { marginTop: 24, marginBottom: 8 },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  subSectionTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  grid2Col: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  recommendedBanner: {
    width: '100%',
    height: 185,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#242428',
    marginBottom: 12,
  },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridCardRow: {
    width: '48.5%',
    backgroundColor: '#2D2D32',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginBottom: 12,
  },
  gridCardThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#3A3A40' },
  gridCardTextContainer: { flex: 1, marginLeft: 8, justifyContent: 'center' },
  gridCardTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  gridCardSub: { color: '#9CA3AF', fontSize: 10, marginTop: 2 },
  heartInlineBtn: { padding: 3 },
  posterCard: { width: '48.5%', marginBottom: 18, position: 'relative' },
  posterImg: { width: '100%', height: 220, borderRadius: 18, backgroundColor: '#242428' },
  posterTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 8 },
  posterSub: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  posterBadgeGroup: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 6,
    zIndex: 2,
  },
  actionBadgeBtn: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 6,
    borderRadius: 20,
  },
  priceBadgeTopLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22C55E',
    zIndex: 2,
  },
  priceBadgeText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '700',
  },
  purchasedBadge: {
    borderColor: '#3B82F6',
  },
  purchasedBadgeText: {
    color: '#3B82F6',
  },
  avatarListScroll: {
    paddingVertical: 4,
    gap: 16,
  },
  avatarCard: {
    alignItems: 'center',
    width: 88,
  },
  avatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#27272A',
  },
  avatarName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 6,
    gap: 3,
  },
  followedBtn: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  followedBtnText: {
    color: '#22C55E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#1E1E22',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  playlistSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#27272A',
    borderRadius: 12,
    marginBottom: 8,
  },
  playlistSelectName: { color: '#FFF', fontSize: 15, fontWeight: '600', marginLeft: 12 },
  actionModalBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
});