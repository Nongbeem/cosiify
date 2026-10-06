import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const API_BASE_URL = 'http://10.0.2.2:5000/api';
const SERVER_BASE_URL = 'http://10.0.2.2:5000';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400';

export default function PlaylistDetailScreen({ route, navigation }) {
  const { playlistId, playlist: initialPlaylist, isWebtoon: isWebtoonParam } = route.params || {};

  const isWebtoon = isWebtoonParam || initialPlaylist?.type === 'webtoon';

  // ฟังก์ชันกรองเอาเฉพาะเพลง (ตัดหนังสือเสียงออก ถ้าไม่ใช่ Playlist Webtoon)
  const filterSongsOnly = (rawItems) => {
    if (!Array.isArray(rawItems)) return [];
    if (isWebtoon) return rawItems;
    return rawItems.filter(
      (item) => item.type !== 'audiobook' && !item.narrator && !item.chaptersCount && item.kind !== 'audiobook'
    );
  };

  const [playlist, setPlaylist] = useState(initialPlaylist || null);
  const [items, setItems] = useState(
    filterSongsOnly(initialPlaylist?.items || initialPlaylist?.tracks || initialPlaylist?.webtoons || [])
  );
  const [loading, setLoading] = useState(!initialPlaylist);

  // ดึงข้อมูล Playlist ล่าสุดจาก Server
  const fetchPlaylistDetail = async () => {
    if (!playlistId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}`);
      if (res.ok) {
        const data = await res.json();
        const plData = data.data || data;
        setPlaylist(plData);

        const rawItems = plData.items || plData.tracks || plData.webtoons || [];
        setItems(filterSongsOnly(rawItems));
      }
    } catch (error) {
      console.error('Error fetching playlist detail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylistDetail();
  }, [playlistId]);

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') return DEFAULT_COVER;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    return `${SERVER_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  // 🗑️ 1. ฟังก์ชันลบเพลง/หนังสือการ์ตูน ออกจาก Playlist
  const handleDeleteItem = (itemId, itemTitle) => {
    Alert.alert(
      'ยืนยันการลบ',
      `คุณต้องการลบ "${itemTitle}" ออกจาก Playlist นี้ใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            const updatedItems = items.filter((i) => (i._id || i.id) !== itemId);
            setItems(updatedItems);

            try {
              const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}/items/${itemId}`, {
                method: 'DELETE',
              }).catch(() => null);

              if (!res || !res.ok) {
                await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ items: updatedItems }),
                });
              }
            } catch (err) {
              console.error('Failed to delete item from API:', err);
            }
          },
        },
      ]
    );
  };

  // 🗑️ 2. ฟังก์ชันลบทั้ง Playlist
  const handleDeletePlaylist = () => {
    Alert.alert(
      'ลบ Playlist',
      `คุณแน่ใจหรือไม่ว่าต้องการลบ Playlist "${playlist?.name || playlist?.title || ''}" นี้?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ Playlist',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
                method: 'DELETE',
              });

              if (res.ok) {
                Alert.alert('สำเร็จ', 'ลบ Playlist เรียบร้อยแล้ว');
                navigation.goBack();
              } else {
                Alert.alert('ผิดพลาด', 'ไม่สามารถลบ Playlist ได้');
              }
            } catch (error) {
              console.error('Error deleting playlist:', error);
              Alert.alert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121214" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {playlist?.name || playlist?.title || 'Playlist'}
        </Text>
        <TouchableOpacity onPress={handleDeletePlaylist} style={styles.deletePlaylistBtn}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => item._id || item.id || index.toString()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.playlistInfoCard}>
              <View style={[styles.coverWrapper, isWebtoon && { backgroundColor: '#8B5CF622' }]}>
                <Ionicons
                  name={isWebtoon ? 'book' : 'musical-notes'}
                  size={48}
                  color={isWebtoon ? '#8B5CF6' : '#22C55E'}
                />
              </View>
              <Text style={styles.playlistNameText}>{playlist?.name || playlist?.title}</Text>
              <Text style={styles.playlistCountText}>
                {items.length} {isWebtoon ? 'เรื่อง' : 'เพลง'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color="#3F3F46" />
              <Text style={styles.emptyText}>ไม่มีรายการใน Playlist นี้</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const itemId = item._id || item.id;
            const title = item.title || item.name || 'ไม่มีชื่อรายการ';
            const subtitle = item.artist || item.author || (isWebtoon ? 'การ์ตูน' : 'เพลง');
            const cover = item.coverImage || item.thumbnail;
            const isAudiobookItem = item.type === 'audiobook' || item.kind === 'audiobook' || !!item.narrator;

            return (
              <TouchableOpacity
                style={styles.itemRow}
                activeOpacity={0.7}
                onPress={() => {
                  if (isWebtoon) {
                    navigation.navigate('WebtoonDetail', { webtoonId: itemId, item });
                  } else if (isAudiobookItem) {
                    navigation.navigate('AudioPlayer', { track: item, trackId: itemId });
                  } else {
                    navigation.navigate('Player', {
                      track: item,
                      trackId: itemId,
                      playlistTracks: items,
                      currentIndex: index,
                    });
                  }
                }}
              >
                <Image source={{ uri: getImageUrl(cover) }} style={styles.itemThumb} />

                <View style={styles.itemMeta}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>

                {/* ปุ่มลบเพลง / การ์ตูน รายชิ้น */}
                <TouchableOpacity
                  style={styles.removeItemBtn}
                  onPress={() => handleDeleteItem(itemId, title)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  iconBtn: { padding: 4 },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  deletePlaylistBtn: {
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
  },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  playlistInfoCard: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#1E1E22',
    padding: 20,
    borderRadius: 20,
  },
  coverWrapper: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: '#22C55E22',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  playlistNameText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  playlistCountText: { color: '#9CA3AF', fontSize: 13, marginTop: 4 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  itemThumb: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#27272A' },
  itemMeta: { flex: 1, marginLeft: 12 },
  itemTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  itemSubtitle: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
  removeItemBtn: { padding: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#6B7280', fontSize: 14, marginTop: 8 },
});