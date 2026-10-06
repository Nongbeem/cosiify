import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';

// 📍 กำหนด URL ของ Backend Server
const API_BASE_URL = 'http://10.0.2.2:5000';

// ฟังก์ชันแปลง Path รูปภาพจาก Backend (/uploads/...) ให้แสดงผลได้
const getImageUrl = (pathStr) => {
  if (!pathStr) return 'https://via.placeholder.com/150';
  if (pathStr.startsWith('http')) return pathStr;
  return `${API_BASE_URL}${pathStr.startsWith('/') ? '' : '/'}${pathStr}`;
};

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState(null); // 'music' | 'webtoon' | 'ebook' | 'audiobook' | 'genre' | null

  // State เก็บข้อมูลจาก Backend
  const [userData, setUserData] = useState({ name: 'User', points: 0 });
  const [allTracks, setAllTracks] = useState([]);
  const [allWebtoons, setAllWebtoons] = useState([]);
  const [allEbooks, setAllEbooks] = useState([]);
  const [allAudiobooks, setAllAudiobooks] = useState([]);
  const [loading, setLoading] = useState(false);

  // 📍 ดึงข้อมูล User ใหม่ทุกครั้งที่หน้านี้ถูกแสดงผล (เรียกลื่น real-time)
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      fetchAllData();
    }, [])
  );

  useEffect(() => {
    fetchAllData();
  }, []);

  // 1. ดึงข้อมูล User จริงจาก API / AsyncStorage
  const fetchUserData = async () => {
    try {
      const storedUserStr =
        (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        const userId = storedUser.id || storedUser._id;

        if (userId) {
          const res = await fetch(`${API_BASE_URL}/api/users/${userId}`);
          if (res.ok) {
            const data = await res.json();
            const currentTokens = data.tokensBalance ?? data.points ?? data.tokens ?? 0;
            setUserData({
              id: userId,
              _id: userId,
              name: data.name || storedUser.name || 'User',
              points: currentTokens,
              profileImage: data.profileImage || '',
            });

            // อัปเดตลง AsyncStorage ให้เป็นปัจจุบัน
            storedUser.tokensBalance = currentTokens;
            await AsyncStorage.setItem('userData', JSON.stringify(storedUser));
            return;
          }
        }
        setUserData({
          id: storedUser?.id || storedUser?._id,
          _id: storedUser?.id || storedUser?._id,
          name: storedUser.name || 'User',
          points: storedUser.tokensBalance ?? storedUser.points ?? 0,
          profileImage: storedUser.profileImage || '',
        });
      }
    } catch (error) {
      console.log('Error fetching user data in SearchScreen:', error);
    }
  };

  // 2. ดึงข้อมูลสื่อทั้ง 4 หมวดหมู่จาก Backend
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [tracksRes, webtoonsRes, ebooksRes, audiobooksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/tracks`).catch(() => null),
        fetch(`${API_BASE_URL}/api/webtoons`).catch(() => null),
        fetch(`${API_BASE_URL}/api/ebooks`).catch(() => null),
        fetch(`${API_BASE_URL}/api/audiobooks`).catch(() => null),
      ]);

      if (tracksRes && tracksRes.ok) setAllTracks(await tracksRes.json());
      if (webtoonsRes && webtoonsRes.ok) setAllWebtoons(await webtoonsRes.json());
      if (ebooksRes && ebooksRes.ok) setAllEbooks(await ebooksRes.json());
      if (audiobooksRes && audiobooksRes.ok) setAllAudiobooks(await audiobooksRes.json());
    } catch (err) {
      console.log('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = {
    main: [
      { id: '1', title: 'เพลง', icon: 'musical-notes', color: '#22C55E', type: 'music' },
      { id: '2', title: 'การ์ตูน', icon: 'chatbubbles', color: '#06B6D4', type: 'webtoon' },
      { id: '3', title: 'E-Book', icon: 'book', color: '#EAB308', type: 'ebook' },
      { id: '4', title: 'หนังสือเสียง', icon: 'headset', color: '#F97316', type: 'audiobook' },
    ],
    musicGenres: [
      { id: 'm1', title: 'Thai Rock', color: '#3B82F6', icon: 'mic', genre: 'Rock' },
      { id: 'm2', title: 'K-Pop', color: '#A855F7', icon: 'musical-note', genre: 'K-Pop' },
    ],
    mangaGenres: [
      { id: 'c1', title: 'Fantasy', color: '#14B8A6', icon: 'sparkles', genre: 'Fantasy' },
      { id: 'c2', title: 'Romance', color: '#EC4899', icon: 'heart', genre: 'Romance' },
    ],
  };

  // กดเลือกหมวดหมู่หลัก หรือย่อย
  const handleCategoryPress = (item) => {
    if (item.type) {
      setSelectedType(item.type);
      setSearchQuery(item.title);
    } else {
      setSelectedType('genre');
      setSearchQuery(item.genre || item.title);
    }
  };

  // ล้างการค้นหา
  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedType(null);
  };

  // 3. Logic การกรองข้อมูลตามประเภท/คำค้นหา
  const queryLower = searchQuery.trim().toLowerCase();

  const getFilteredItems = () => {
    if (!queryLower && !selectedType) {
      return { tracks: [], webtoons: [], ebooks: [], audiobooks: [] };
    }

    if (selectedType === 'music') {
      return { tracks: allTracks, webtoons: [], ebooks: [], audiobooks: [] };
    }
    if (selectedType === 'webtoon') {
      return { tracks: [], webtoons: allWebtoons, ebooks: [], audiobooks: [] };
    }
    if (selectedType === 'ebook') {
      return { tracks: [], webtoons: [], ebooks: allEbooks, audiobooks: [] };
    }
    if (selectedType === 'audiobook') {
      return { tracks: [], webtoons: [], ebooks: [], audiobooks: allAudiobooks };
    }

    const filterFn = (item, fields) => {
      return fields.some((field) => item[field]?.toLowerCase().includes(queryLower));
    };

    return {
      tracks: allTracks.filter((item) => filterFn(item, ['title', 'artist', 'genre'])),
      webtoons: allWebtoons.filter((item) => filterFn(item, ['title', 'author', 'genre'])),
      ebooks: allEbooks.filter((item) => filterFn(item, ['title', 'author'])),
      audiobooks: allAudiobooks.filter((item) => filterFn(item, ['title', 'author', 'narrator'])),
    };
  };

  const filtered = getFilteredItems();
  const isFiltering = searchQuery.length > 0 || selectedType !== null;
  const hasResults =
    filtered.tracks.length > 0 ||
    filtered.webtoons.length > 0 ||
    filtered.ebooks.length > 0 ||
    filtered.audiobooks.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        userId={userData?.id || userData?._id}
        apiUrl="http://10.0.2.2:5000"
        userName={userData.name}
        points={userData.points}
        onLogout={async () => {
          await AsyncStorage.clear();
          navigation.navigate('Login');
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ช่องค้นหา */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหาชื่อเรื่อง, เพลง, หมวดหมู่..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setSelectedType(text ? 'search' : null);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* ---------------- แสดงผลลัพธ์เมื่อค้นหา/เลือกหมวดหมู่ ---------------- */}
        {isFiltering ? (
          <View>
            <View style={styles.activeFilterRow}>
              <Text style={styles.activeFilterText}>ผลการค้นหา: "{searchQuery}"</Text>
              <TouchableOpacity onPress={handleClearSearch}>
                <Text style={styles.clearFilterText}>ดูทั้งหมด / ล้าง</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#22C55E" style={{ marginTop: 20 }} />
            ) : (
              <>
                {/* 1. เพลง */}
                {filtered.tracks.length > 0 && (
                  <View style={styles.resultSection}>
                    <Text style={styles.sectionTitle}>🎵 เพลง ({filtered.tracks.length})</Text>
                    {filtered.tracks.map((item) => (
                      <TouchableOpacity
                        key={item._id || item.id}
                        style={styles.itemCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('Player', { track: item, trackId: item._id })}
                      >
                        <Image source={{ uri: getImageUrl(item.coverImage) }} style={styles.itemImage} />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.itemSubText} numberOfLines={1}>{item.artist}</Text>
                          {item.genre ? <Text style={styles.genreTag}>{item.genre}</Text> : null}
                        </View>
                        <Ionicons name="play-circle" size={28} color="#22C55E" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 2. การ์ตูน */}
                {filtered.webtoons.length > 0 && (
                  <View style={styles.resultSection}>
                    <Text style={styles.sectionTitle}>📚 การ์ตูน ({filtered.webtoons.length})</Text>
                    {filtered.webtoons.map((item) => (
                      <TouchableOpacity
                        key={item._id || item.id}
                        style={styles.itemCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('WebtoonDetail', { item: item, webtoonId: item._id || item.id })}
                      >
                        <Image source={{ uri: getImageUrl(item.coverImage) }} style={styles.itemImage} />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.itemSubText} numberOfLines={1}>ผู้แต่ง: {item.author}</Text>
                          {item.genre ? <Text style={styles.genreTag}>{item.genre}</Text> : null}
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 3. E-Book (📍 แก้ไขการส่ง Param ให้ครบตรงกับ EbookScreen) */}
                {filtered.ebooks.length > 0 && (
                  <View style={styles.resultSection}>
                    <Text style={styles.sectionTitle}>📖 E-Book ({filtered.ebooks.length})</Text>
                    {filtered.ebooks.map((item) => (
                      <TouchableOpacity
                        key={item._id || item.id}
                        style={styles.itemCard}
                        activeOpacity={0.7}
                        onPress={() =>
                          navigation.navigate('Ebook', {
                            bookId: item._id || item.id,
                            item: item,
                            title: item.title,
                          })
                        }
                      >
                        <Image source={{ uri: getImageUrl(item.coverImage) }} style={styles.itemImage} />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.itemSubText} numberOfLines={1}>ผู้แต่ง: {item.author || 'ไม่ระบุ'}</Text>
                          <Text style={styles.priceTag}>{item.price ? `${item.price} Token` : 'ฟรี'}</Text>
                        </View>
                        <Ionicons name="book-outline" size={22} color="#EAB308" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 4. หนังสือเสียง */}
                {filtered.audiobooks.length > 0 && (
                  <View style={styles.resultSection}>
                    <Text style={styles.sectionTitle}>🎧 หนังสือเสียง ({filtered.audiobooks.length})</Text>
                    {filtered.audiobooks.map((item) => (
                      <TouchableOpacity
                        key={item._id || item.id}
                        style={styles.itemCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('Player', { track: item, trackId: item._id, isAudiobook: true })}
                      >
                        <Image source={{ uri: getImageUrl(item.coverImage) }} style={styles.itemImage} />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.itemSubText} numberOfLines={1}>ผู้พากย์: {item.narrator || item.author}</Text>
                        </View>
                        <Ionicons name="headset-outline" size={22} color="#F97316" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* หากไม่พบผลลัพธ์ */}
                {!hasResults && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={48} color="#4B5563" />
                    <Text style={styles.emptyText}>ไม่พบผลลัพธ์สำหรับ "{searchQuery}"</Text>
                  </View>
                )}
              </>
            )}
          </View>
        ) : (
          /* ---------------- แสดงรายการหมวดหมู่เริ่มต้น ---------------- */
          <View>
            <View style={styles.gridContainer}>
              {categories.main.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.mainCard, { backgroundColor: item.color }]}
                  activeOpacity={0.8}
                  onPress={() => handleCategoryPress(item)}
                >
                  <Ionicons name={item.icon} size={22} color="#000000" />
                  <Text style={styles.mainCardText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>• หมวดหมู่ เพลงยอดนิยม</Text>
            <View style={styles.gridContainer}>
              {categories.musicGenres.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.subCard, { backgroundColor: item.color }]}
                  activeOpacity={0.8}
                  onPress={() => handleCategoryPress(item)}
                >
                  <Ionicons name={item.icon} size={20} color="#FFFFFF" />
                  <Text style={styles.subCardText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>• หมวดหมู่ การ์ตูนยอดนิยม</Text>
            <View style={styles.gridContainer}>
              {categories.mangaGenres.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.subCard, { backgroundColor: item.color }]}
                  activeOpacity={0.8}
                  onPress={() => handleCategoryPress(item)}
                >
                  <Ionicons name={item.icon} size={20} color="#FFFFFF" />
                  <Text style={styles.subCardText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242428',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  activeFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  activeFilterText: {
    color: '#22C55E',
    fontWeight: 'bold',
    fontSize: 14,
  },
  clearFilterText: {
    color: '#9CA3AF',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  mainCard: {
    width: '48%',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mainCardText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subCard: {
    width: '48%',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  subCardText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  resultSection: {
    marginBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  itemSubText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  genreTag: {
    color: '#22C55E',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  priceTag: {
    color: '#EAB308',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#9CA3AF',
    marginTop: 10,
    fontSize: 15,
  },
});