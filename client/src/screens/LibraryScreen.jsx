import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
  Platform,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../components/Header';

const API_BASE_URL = 'http://10.0.2.2:5000/api';
const SERVER_BASE_URL = 'http://10.0.2.2:5000';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';

export default function LibraryScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Playlist');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userData, setUserData] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [favoriteWebtoons, setFavoriteWebtoons] = useState([]);
  const [favoriteTracks, setFavoriteTracks] = useState([]);

  const [selectedCollection, setSelectedCollection] = useState(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistType, setPlaylistType] = useState('music');
  const [isCreating, setIsCreating] = useState(false);

  const loadLibraryData = useCallback(async () => {
    try {
      setLoading(true);

      const storedUserData = await AsyncStorage.getItem('userData');
      let user = storedUserData ? JSON.parse(storedUserData) : null;
      const userId = user?.id || user?._id;

      if (!userId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setUserData(user);

      // ดึงข้อมูล Playlist
      const playlistRes = await fetch(`${API_BASE_URL}/playlists?userId=${userId}`).catch(() => null);
      if (playlistRes && playlistRes.ok) {
        const plData = await playlistRes.json();
        setPlaylists(Array.isArray(plData) ? plData : plData.data || []);
      }

      // ดึงข้อมูล Favorites
      const favRes = await fetch(`${API_BASE_URL}/favorites/${userId}`).catch(() => null);
      if (favRes && favRes.ok) {
        const favList = await favRes.json();
        const rawFavs = Array.isArray(favList) ? favList : favList.data || [];

        // 📍 แยกรายการตามหมวดการอ่าน (Webtoon / Ebook) และหมวดฟัง (Track / Audiobook)
        const webtoonsAndBooks = rawFavs.filter(
          (f) => f.contentType === 'webtoon' || f.contentType === 'ebook'
        );
        const tracksAndAudiobooks = rawFavs.filter(
          (f) => f.contentType === 'track' || f.contentType === 'audiobook'
        );

        setFavoriteWebtoons(webtoonsAndBooks);
        setFavoriteTracks(tracksAndAudiobooks);
      }
    } catch (error) {
      console.error('Error loading library:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLibraryData();
    }, [loadLibraryData])
  );

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณาระบุชื่อ Playlist');
      return;
    }

    try {
      setIsCreating(true);
      const userId = userData?.id || userData?._id;
      const res = await fetch(`${API_BASE_URL}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          name: playlistName.trim(),
          type: playlistType,
        }),
      });

      if (res.ok) {
        setPlaylistName('');
        setIsModalVisible(false);
        loadLibraryData();
      } else {
        Alert.alert('ผิดพลาด', 'ไม่สามารถสร้าง Playlist ได้');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePlaylist = (playlistId, playlistName) => {
    Alert.alert(
      'ลบ Playlist',
      `คุณต้องการลบ Playlist "${playlistName}" ใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = userData?.id || userData?._id;
              const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
                method: 'DELETE',
                headers: { 
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
              });

              if (res.ok) {
                loadLibraryData();
              } else {
                const errData = await res.json().catch(() => ({}));
                Alert.alert('ผิดพลาด', errData.message || `ไม่สามารถลบได้ (Status: ${res.status})`);
              }
            } catch (e) {
              console.error('Error deleting playlist:', e);
              Alert.alert('ผิดพลาด', 'ไม่สามารถเชื่อมต่อกับ Server ได้');
            }
          },
        },
      ]
    );
  };

  const removeFavorite = async (contentType, contentId) => {
    try {
      const userId = userData?.id || userData?._id;
      const res = await fetch(`${API_BASE_URL}/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, contentType, contentId }),
      });

      if (res.ok) {
        loadLibraryData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    return `${SERVER_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  // 📍 ฟังก์ชันจัดการการคลิกเปิดคอนเทนต์ตามประเภทในเรื่องโปรด
  const handleOpenReadingDetail = (item) => {
    const detail = item.contentId || item;
    const type = item.contentType || 'webtoon';

    if (type === 'ebook') {
      navigation?.navigate('Ebook', {
        item: detail,
        bookId: detail._id || detail.id,
      });
    } else {
      navigation?.navigate('WebtoonDetail', {
        item: detail,
        webtoonId: detail._id || detail.id,
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLibraryData();
  };

  const musicPlaylists = playlists.filter((pl) => pl.type !== 'webtoon');
  const webtoonPlaylists = playlists.filter((pl) => pl.type === 'webtoon');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121214" />

      <Header
        userId={userData?.id || userData?._id}
        apiUrl="http://10.0.2.2:5000"
        userName={userData?.name}
        points={userData?.tokensBalance}
        userImage={getImageUrl(userData?.profileImage)}
        onLogout={async () => {
          await AsyncStorage.removeItem('userData');
          navigation?.reset({ index: 0, routes: [{ name: 'Splash' }] });
        }}
      />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Playlist' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('Playlist');
            setSelectedCollection(null);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'Playlist' && styles.activeTabText]}>
            Playlist
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Collection' && styles.activeTabButton]}
          onPress={() => setActiveTab('Collection')}
        >
          <Text style={[styles.tabText, activeTab === 'Collection' && styles.activeTabText]}>
            Collection
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />}
        >
          {/* ================= TAB 1: PLAYLIST ================= */}
          {activeTab === 'Playlist' && (
            <View style={styles.playlistContainer}>
              <TouchableOpacity
                style={styles.createPlaylistBtn}
                activeOpacity={0.8}
                onPress={() => setIsModalVisible(true)}
              >
                <Ionicons name="add-circle" size={26} color="#22C55E" />
                <Text style={styles.createPlaylistText}>สร้าง Playlist ใหม่</Text>
              </TouchableOpacity>

              {/* ส่วนที่ 1: Music Album */}
              <View style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>• Music Album</Text>
                {musicPlaylists.length > 0 ? (
                  musicPlaylists.map((pl) => (
                    <TouchableOpacity 
                      key={pl._id} 
                      style={styles.playlistCard} 
                      activeOpacity={0.8}
                      onPress={() => navigation?.navigate('PlaylistDetail', { playlistId: pl._id, playlist: pl })}
                    >
                      {pl.coverImage ? (
                        <Image source={{ uri: getImageUrl(pl.coverImage) }} style={styles.playlistImg} />
                      ) : (
                        <View style={styles.playlistImgPlaceholder}>
                          <Ionicons name="musical-note" size={24} color="#9CA3AF" />
                        </View>
                      )}
                      <Text style={styles.playlistName} numberOfLines={1}>
                        {pl.name}
                      </Text>

                      <TouchableOpacity
                        style={styles.deleteCardBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeletePlaylist(pl._id, pl.name);
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.emptySubText}>ไม่มีรายการ Music Album</Text>
                )}
              </View>

              {/* ส่วนที่ 2: Webtoon Lists */}
              <View style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>• Webtoon Lists</Text>
                {webtoonPlaylists.length > 0 ? (
                  webtoonPlaylists.map((pl) => (
                    <TouchableOpacity 
                      key={pl._id} 
                      style={styles.playlistCard} 
                      activeOpacity={0.8}
                      onPress={() => navigation?.navigate('PlaylistDetail', { playlistId: pl._id, playlist: pl })}
                    >
                      {pl.coverImage ? (
                        <Image source={{ uri: getImageUrl(pl.coverImage) }} style={styles.playlistImg} />
                      ) : (
                        <View style={styles.playlistImgPlaceholder}>
                          <Ionicons name="book" size={24} color="#9CA3AF" />
                        </View>
                      )}
                      <Text style={styles.playlistName} numberOfLines={1}>
                        {pl.name}
                      </Text>

                      <TouchableOpacity
                        style={styles.deleteCardBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeletePlaylist(pl._id, pl.name);
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.emptySubText}>ไม่มีรายการ Webtoon Lists</Text>
                )}
              </View>
            </View>
          )}

          {/* ================= TAB 2: COLLECTION ================= */}
          {activeTab === 'Collection' && (
            <View style={styles.collectionContainer}>
              {!selectedCollection ? (
                <>
                  <TouchableOpacity
                    style={styles.collectionCard}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCollection('webtoons')}
                  >
                    <View style={[styles.iconBox, { backgroundColor: '#8B5CF6' }]}>
                      <Ionicons name="heart" size={36} color="#FFFFFF" />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.cardTitle}>เรื่องโปรด (การ์ตูน / E-Book)</Text>
                      <Text style={styles.cardSubTitle}>{favoriteWebtoons.length} รายการ</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.collectionCard}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCollection('tracks')}
                  >
                    <View style={[styles.iconBox, { backgroundColor: '#22C55E' }]}>
                      <Ionicons name="musical-notes" size={36} color="#FFFFFF" />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.cardTitle}>รายการที่ถูกใจ (เพลง / หนังสือเสียง)</Text>
                      <Text style={styles.cardSubTitle}>{favoriteTracks.length} รายการ</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </>
              ) : (
                <View>
                  <TouchableOpacity style={styles.backRow} onPress={() => setSelectedCollection(null)}>
                    <Ionicons name="arrow-back" size={22} color="#22C55E" />
                    <Text style={styles.backRowText}>ย้อนกลับ</Text>
                  </TouchableOpacity>

                  {selectedCollection === 'webtoons' ? (
                    favoriteWebtoons.length > 0 ? (
                      <View style={styles.grid2Col}>
                        {favoriteWebtoons.map((item) => {
                          const detail = item.contentId || item;
                          const cType = item.contentType || 'webtoon';
                          return (
                            <View key={item._id} style={styles.posterCard}>
                              <TouchableOpacity onPress={() => handleOpenReadingDetail(item)}>
                                <Image
                                  source={{ uri: getImageUrl(detail.coverImage) || DEFAULT_AVATAR }}
                                  style={styles.posterImg}
                                />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.removeFavBtn}
                                onPress={() => removeFavorite(cType, detail._id || detail.id)}
                              >
                                <Ionicons name="heart" size={18} color="#EF4444" />
                              </TouchableOpacity>

                              <Text style={styles.posterTitle} numberOfLines={1}>
                                {detail.title || 'เรื่องโปรด'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>ยังไม่มีรายการเรื่องโปรด</Text>
                    )
                  ) : favoriteTracks.length > 0 ? (
                    favoriteTracks.map((item) => {
                      const track = item.contentId || item;
                      const cType = item.contentType || 'track';
                      return (
                        <TouchableOpacity
                          key={item._id}
                          style={styles.trackRow}
                          onPress={() =>
                            navigation.navigate('Player', {
                              track: track,
                              trackId: track._id || track.id,
                            })
                          }
                        >
                          <Image
                            source={{ uri: getImageUrl(track.coverImage) || DEFAULT_AVATAR }}
                            style={styles.trackThumb}
                          />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.trackTitle} numberOfLines={1}>
                              {track.title || 'รายการที่ถูกใจ'}
                            </Text>
                            <Text style={styles.trackArtist} numberOfLines={1}>
                              {track.artist || track.author || track.narrator || 'ศิลปิน/ผู้พากย์'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => removeFavorite(cType, track._id || track.id)}
                            style={{ padding: 6 }}
                          >
                            <Ionicons name="heart" size={22} color="#EF4444" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>ยังไม่มีรายการที่ถูกใจ</Text>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal สำหรับสร้าง Playlist */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>สร้าง Playlist ใหม่</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="ระบุชื่อ Playlist..."
              placeholderTextColor="#6B7280"
              value={playlistName}
              onChangeText={setPlaylistName}
            />

            <Text style={styles.typeLabel}>เลือกประเภท:</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, playlistType === 'music' && styles.activeTypeBtn]}
                onPress={() => setPlaylistType('music')}
              >
                <Text style={[styles.typeBtnText, playlistType === 'music' && styles.activeTypeBtnText]}>
                  Music Album
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, playlistType === 'webtoon' && styles.activeTypeBtn]}
                onPress={() => setPlaylistType('webtoon')}
              >
                <Text style={[styles.typeBtnText, playlistType === 'webtoon' && styles.activeTypeBtnText]}>
                  Webtoon List
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionModalBtn, styles.cancelBtn]}
                onPress={() => {
                  setIsModalVisible(false);
                  setPlaylistName('');
                }}
              >
                <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionModalBtn, styles.confirmBtn]}
                onPress={handleCreatePlaylist}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>สร้าง</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: { borderBottomColor: '#FFFFFF' },
  tabText: { color: '#9CA3AF', fontSize: 15, fontWeight: '600' },
  activeTabText: { color: '#FFFFFF', fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  playlistContainer: { gap: 16 },
  createPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    padding: 16,
    borderRadius: 16,
  },
  createPlaylistText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginLeft: 12 },
  sectionWrapper: { marginTop: 8 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
  },
  playlistImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#3F3F46' },
  playlistImgPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#3F3F46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginLeft: 16, flex: 1 },
  deleteCardBtn: { padding: 8, marginLeft: 8 },
  emptySubText: { color: '#6B7280', fontSize: 13, marginLeft: 12, marginBottom: 8 },
  collectionContainer: { gap: 16 },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    padding: 16,
    borderRadius: 20,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContainer: { flex: 1, marginLeft: 16 },
  cardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cardSubTitle: { color: '#9CA3AF', fontSize: 13, marginTop: 4 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backRowText: { color: '#22C55E', marginLeft: 8, fontSize: 14, fontWeight: '600' },
  grid2Col: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  posterCard: { width: '48%', marginBottom: 16, position: 'relative' },
  posterImg: { width: '100%', height: 180, borderRadius: 14, backgroundColor: '#242428' },
  posterTitle: { color: '#FFF', fontSize: 13, fontWeight: '600', marginTop: 6 },
  removeFavBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    padding: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  trackThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#27272A' },
  trackTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  trackArtist: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 30 },
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
  modalInput: {
    backgroundColor: '#121214',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  typeLabel: { color: '#9CA3AF', fontSize: 13, marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#27272A',
    alignItems: 'center',
  },
  activeTypeBtn: { backgroundColor: '#22C55E' },
  typeBtnText: { color: '#9CA3AF', fontWeight: '600', fontSize: 13 },
  activeTypeBtnText: { color: '#FFF', fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  actionModalBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  cancelBtn: { backgroundColor: '#27272A' },
  confirmBtn: { backgroundColor: '#22C55E' },
});