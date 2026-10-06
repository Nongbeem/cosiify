import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';

const BASE_URL = 'http://10.0.2.2:5000'; // เปลี่ยนเป็น IP Server ของคุณ

const FavoritesScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  
  const [userData, setUserData] = useState({
    name: '',
    points: 0,
    profileImage: '',
    followingArtists: [],
    followingAuthors: [],
  });

  const [artists, setArtists] = useState([]);
  const [authors, setAuthors] = useState([]);

  // แปลง URL รูปภาพ
  const getImageUrl = (imagePath, fallback = '') => {
    if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') return fallback;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    return `${BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  // ดึงข้อมูลทั้งหมด (User Profile + Favorites + Following + Content Images)
  const fetchData = useCallback(async () => {
    try {
      let storedUser = await AsyncStorage.getItem('userData');
      if (!storedUser) {
        storedUser = await AsyncStorage.getItem('user');
      }

      let currentUserId = null;

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        currentUserId = parsed.id || parsed._id || parsed.user?.id || parsed.user?._id;
        setUserId(currentUserId);
      }

      if (!currentUserId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 1. ดึงข้อมูล Profile ล่าสุด
      let userFollowingArtists = [];
      let userFollowingAuthors = [];

      try {
        const userRes = await fetch(`${BASE_URL}/api/users/${currentUserId}`);
        if (userRes.ok) {
          const userInfoRaw = await userRes.json();
          const userInfo = userInfoRaw.user || userInfoRaw.data || userInfoRaw;

          userFollowingArtists = Array.isArray(userInfo.followingArtists) ? userInfo.followingArtists : [];
          userFollowingAuthors = Array.isArray(userInfo.followingAuthors) ? userInfo.followingAuthors : [];

          setUserData({
            name: userInfo.name || '',
            points: userInfo.tokensBalance ?? userInfo.points ?? 0,
            profileImage: userInfo.profileImage || '',
            followingArtists: userFollowingArtists,
            followingAuthors: userFollowingAuthors,
          });

          // 📍 อัปเดตข้อมูลผู้ใช้ลง AsyncStorage เพื่อให้ทุกหน้าใช้ข้อมูลตรงกัน
          await AsyncStorage.setItem('userData', JSON.stringify(userInfo));
        }
      } catch (uErr) {
        console.error('Error fetching user profile:', uErr);
      }

      // 📍 ดึงรูปภาพจริงของศิลปินและผู้แต่งจากฐานข้อมูลคอนเทนต์
      const artistImageMap = {};
      const authorImageMap = {};

      try {
        const [tracksRes, webtoonsRes, ebooksRes, audiobooksRes] = await Promise.all([
          fetch(`${BASE_URL}/api/tracks`).catch(() => null),
          fetch(`${BASE_URL}/api/webtoons`).catch(() => null),
          fetch(`${BASE_URL}/api/ebooks`).catch(() => null),
          fetch(`${BASE_URL}/api/audiobooks`).catch(() => null),
        ]);

        if (tracksRes && tracksRes.ok) {
          const resData = await tracksRes.json();
          const tracks = Array.isArray(resData) ? resData : (resData.tracks || resData.data || []);
          if (Array.isArray(tracks)) {
            tracks.forEach((t) => {
              if (t) {
                const artistName = typeof t.artist === 'object' ? t.artist?.name : t.artist;
                if (artistName) {
                  artistImageMap[artistName] = t.artistImage || t.coverImage || artistImageMap[artistName];
                }
              }
            });
          }
        }

        if (webtoonsRes && webtoonsRes.ok) {
          const resData = await webtoonsRes.json();
          const webtoons = Array.isArray(resData) ? resData : (resData.webtoons || resData.data || []);
          if (Array.isArray(webtoons)) {
            webtoons.forEach((w) => {
              if (w) {
                const authorName = typeof w.author === 'object' ? w.author?.name : w.author;
                if (authorName) {
                  authorImageMap[authorName] = w.authorImage || w.coverImage || authorImageMap[authorName];
                }
              }
            });
          }
        }

        if (ebooksRes && ebooksRes.ok) {
          const resData = await ebooksRes.json();
          const ebooks = Array.isArray(resData) ? resData : (resData.ebooks || resData.data || []);
          if (Array.isArray(ebooks)) {
            ebooks.forEach((e) => {
              if (e) {
                const authorName = typeof e.author === 'object' ? e.author?.name : e.author;
                if (authorName) {
                  authorImageMap[authorName] = e.authorImage || e.coverImage || authorImageMap[authorName];
                }
              }
            });
          }
        }

        if (audiobooksRes && audiobooksRes.ok) {
          const resData = await audiobooksRes.json();
          const audiobooks = Array.isArray(resData) ? resData : (resData.audiobooks || resData.data || []);
          if (Array.isArray(audiobooks)) {
            audiobooks.forEach((a) => {
              if (a) {
                const authorName = typeof a.author === 'object' ? a.author?.name : a.author;
                if (authorName) {
                  authorImageMap[authorName] = a.authorImage || a.coverImage || authorImageMap[authorName];
                }
              }
            });
          }
        }
      } catch (imgErr) {
        console.error('Error prefetching artist/author images:', imgErr);
      }

      // 2. ดึงรายการโปรดทั้งหมด
      let favorites = [];
      try {
        const favRes = await fetch(`${BASE_URL}/api/favorites/${currentUserId}`);
        if (favRes.ok) {
          const favData = await favRes.json();
          favorites = Array.isArray(favData) ? favData : (favData.favorites || favData.data || []);
        }
      } catch (fErr) {
        console.error('Error fetching favorites list:', fErr);
      }

      const artistList = [];
      const authorList = [];
      const artistNamesSet = new Set();
      const authorNamesSet = new Set();

      // สะสมรูปจาก Favorites เพิ่มเติมลง Map
      if (Array.isArray(favorites)) {
        favorites.forEach((fav) => {
          if (!fav) return;
          const item = fav.contentId || fav;
          if (!item) return;

          const artistName = typeof item.artist === 'object' ? item.artist?.name : item.artist;
          const authorName = typeof item.author === 'object' ? item.author?.name : item.author;

          if (artistName) {
            artistImageMap[artistName] = item.artistImage || item.coverImage || artistImageMap[artistName];
          }
          if (authorName) {
            authorImageMap[authorName] = item.authorImage || item.coverImage || authorImageMap[authorName];
          }
        });
      }

      // 📍 [1] ศิลปินที่กด Follow
      userFollowingArtists.forEach((aItem, idx) => {
        const aName = typeof aItem === 'object' ? (aItem.name || aItem.artist || '') : aItem;
        if (aName && typeof aName === 'string' && !artistNamesSet.has(aName)) {
          artistNamesSet.add(aName);
          artistList.push({
            id: `follow_artist_${idx}`,
            name: aName,
            avatar: getImageUrl(
              artistImageMap[aName],
              `https://picsum.photos/150/150?random=${idx + 10}`
            ),
            contentType: 'track',
            contentId: null,
          });
        }
      });

      // 📍 [2] ผู้แต่งที่กด Follow
      userFollowingAuthors.forEach((aItem, idx) => {
        const aName = typeof aItem === 'object' ? (aItem.name || aItem.author || '') : aItem;
        if (aName && typeof aName === 'string' && !authorNamesSet.has(aName)) {
          authorNamesSet.add(aName);
          authorList.push({
            id: `follow_author_${idx}`,
            name: aName,
            avatar: getImageUrl(
              authorImageMap[aName],
              `https://picsum.photos/150/150?random=${idx + 20}`
            ),
            contentType: 'author',
            contentId: null,
          });
        }
      });

      // 📍 [3] รายการโปรดจาก Favorites API
      if (Array.isArray(favorites)) {
        favorites.forEach((fav) => {
          if (!fav) return;
          const item = fav.contentId || fav;
          if (!item) return;

          const itemArtist = typeof item.artist === 'object' ? item.artist?.name : item.artist;
          const itemAuthor = typeof item.author === 'object' ? item.author?.name : item.author;

          if (fav.contentType === 'track' || fav.contentType === 'song' || itemArtist) {
            const artistName = itemArtist || 'ไม่ระบุชื่อศิลปิน';
            if (!artistNamesSet.has(artistName)) {
              artistNamesSet.add(artistName);
              artistList.push({
                id: item._id || fav._id,
                name: artistName,
                avatar: getImageUrl(item.artistImage || item.coverImage, 'https://picsum.photos/150/150?random=10'),
                contentType: fav.contentType || 'track',
                contentId: item._id || fav._id,
              });
            }
          }

          if (
            fav.contentType === 'webtoon' ||
            fav.contentType === 'ebook' ||
            fav.contentType === 'audiobook' ||
            itemAuthor
          ) {
            const authorName = itemAuthor || 'ไม่ระบุชื่อผู้แต่ง';
            if (!authorNamesSet.has(authorName)) {
              authorNamesSet.add(authorName);
              authorList.push({
                id: item._id || fav._id,
                name: authorName,
                avatar: getImageUrl(item.authorImage || item.coverImage, 'https://picsum.photos/150/150?random=12'),
                contentType: fav.contentType || 'author',
                contentId: item._id || fav._id,
              });
            }
          }
        });
      }

      setArtists(artistList);
      setAuthors(authorList);

    } catch (error) {
      console.error('Error fetching favorites screen data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // 📍 ฟังก์ชันเลิกติดตาม ตัดออกจาก UI + เซฟลง DB/AsyncStorage
  const handleUnfollow = (person) => {
    Alert.alert('ยกเลิกติดตาม', `ต้องการยกเลิกการติดตาม ${person.name} ใช่หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ตกลง',
        onPress: async () => {
          try {
            if (!userId) return;

            const isArtist = person.contentType === 'track' || person.contentType === 'song' || person.id.toString().includes('artist');

            // 1. ลบออกจาก UI บนหน้าจอทันที
            if (isArtist) {
              setArtists((prev) => prev.filter((a) => a.id !== person.id && a.name !== person.name));
            } else {
              setAuthors((prev) => prev.filter((a) => a.id !== person.id && a.name !== person.name));
            }

            // 2. ถ้าเป็นคอนเทนต์รายการโปรด ให้ลบออกผ่าน Favorites API
            if (person.contentId) {
              await fetch(`${BASE_URL}/api/favorites/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  contentType: person.contentType,
                  contentId: person.contentId,
                }),
              });
            }

            // 3. ส่งข้อมูลยกเลิกติดตามไปยัง Backend API
            if (isArtist) {
              const updatedArtists = (userData.followingArtists || []).filter((a) => (typeof a === 'object' ? a.name : a) !== person.name);
              setUserData((prev) => ({ ...prev, followingArtists: updatedArtists }));

              await fetch(`${BASE_URL}/api/users/${userId}/unfollow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'artist', name: person.name }),
              });
            } else {
              const updatedAuthors = (userData.followingAuthors || []).filter((a) => (typeof a === 'object' ? a.name : a) !== person.name);
              setUserData((prev) => ({ ...prev, followingAuthors: updatedAuthors }));

              await fetch(`${BASE_URL}/api/users/${userId}/unfollow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'author', name: person.name }),
              });
            }

            // 4. บันทึกลง AsyncStorage
            const storedUser = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
            if (storedUser) {
              const parsed = JSON.parse(storedUser);
              if (isArtist) {
                parsed.followingArtists = (parsed.followingArtists || []).filter((a) => (typeof a === 'object' ? a.name : a) !== person.name);
              } else {
                parsed.followingAuthors = (parsed.followingAuthors || []).filter((a) => (typeof a === 'object' ? a.name : a) !== person.name);
              }
              await AsyncStorage.setItem('userData', JSON.stringify(parsed));
              await AsyncStorage.setItem('user', JSON.stringify(parsed));
            }
          } catch (error) {
            console.error('Unfollow error:', error);
            Alert.alert('ผิดพลาด', 'ไม่สามารถยกเลิกการติดตามได้');
            fetchData();
          }
        },
      },
    ]);
  };

  const handleUpdateProfile = async (updatedFields) => {
    if (!userId) return;
    try {
      const res = await fetch(`${BASE_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedName = data.user?.name || data.name;
        setUserData((prev) => ({ ...prev, name: updatedName }));
        
        const storedUser = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          parsed.name = updatedName;
          await AsyncStorage.setItem('userData', JSON.stringify(parsed));
          await AsyncStorage.setItem('user', JSON.stringify(parsed));
        }
      }
    } catch (error) {
      console.error('Update profile error:', error);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('userData');
    navigation.navigate('Login');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#22C55E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        userId={userId}
        apiUrl={BASE_URL}
        userName={userData.name}
        points={userData.points}
        userImage={getImageUrl(userData.profileImage, '')} // 📍 นำรูปตัวอย่าง Unsplash ออก เพื่อใช้รูปโปรไฟล์/รูปโกะโจเริ่มต้นตาม Header
        onLogout={handleLogout}
        onUpdateProfile={handleUpdateProfile}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />
        }
      >
        {/* หัวข้อ ศิลปินเพลง */}
        <Text style={styles.sectionTitle}>• ศิลปินเพลง</Text>
        {artists.length === 0 ? (
          <Text style={styles.emptyText}>ยังไม่มีศิลปินเพลงที่ติดตาม</Text>
        ) : (
          artists.map((artist) => (
            <View key={artist.id} style={styles.personItem}>
              <Image source={{ uri: artist.avatar }} style={styles.avatar} />
              <Text style={styles.personName}>{artist.name}</Text>
              
              <TouchableOpacity
                style={styles.unfollowBtn}
                onPress={() => handleUnfollow(artist)}
                activeOpacity={0.7}
              >
                <Ionicons name="person-remove-outline" size={14} color="#EF4444" style={styles.unfollowIcon} />
                <Text style={styles.unfollowBtnText}>เลิกติดตาม</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* หัวข้อ อาจารย์ผู้แต่ง */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>• อาจารย์ผู้แต่ง</Text>
        {authors.length === 0 ? (
          <Text style={styles.emptyText}>ยังไม่มีอาจารย์ผู้แต่งที่ติดตาม</Text>
        ) : (
          authors.map((author) => (
            <View key={author.id} style={styles.personItem}>
              <Image source={{ uri: author.avatar }} style={styles.avatar} />
              <Text style={styles.personName}>{author.name}</Text>
              
              <TouchableOpacity
                style={styles.unfollowBtn}
                onPress={() => handleUnfollow(author)}
                activeOpacity={0.7}
              >
                <Ionicons name="person-remove-outline" size={14} color="#EF4444" style={styles.unfollowIcon} />
                <Text style={styles.unfollowBtnText}>เลิกติดตาม</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FavoritesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 100,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 10,
    marginLeft: 12,
  },
  personItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#1E1E22',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#27272A',
  },
  personName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    marginRight: 8,
  },
  unfollowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  unfollowIcon: {
    marginRight: 4,
  },
  unfollowBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
});