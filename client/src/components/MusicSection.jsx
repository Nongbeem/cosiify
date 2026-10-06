import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

const API_BASE_URL = 'http://10.0.2.2:5000';

const MusicSection = ({ navigation }) => {
  const [tracks, setTracks] = useState([]);
  const [genreGroups, setGenreGroups] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/api/tracks`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response error');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;

        let trackList = [];
        if (Array.isArray(data)) trackList = data;
        else if (data?.data && Array.isArray(data.data)) trackList = data.data;

        setTracks(trackList);

        // 📍 จัดกลุ่มเพลงแยกตามประเภท/หมวดหมู่ (Genre / Category)
        const groups = {};
        trackList.forEach((item) => {
          const category = item.genre || item.category || 'เพลงทั่วไป';
          if (!groups[category]) {
            groups[category] = [];
          }
          groups[category].push(item);
        });
        setGenreGroups(groups);
      })
      .catch((err) => console.error('Error fetching tracks:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getImageUrl = (path, defaultImg = 'https://picsum.photos/200/200') => {
    if (!path) return defaultImg;
    const pathStr = typeof path === 'string' ? path : (path?.url || '');
    if (!pathStr) return defaultImg;
    if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr;
    return `${API_BASE_URL}${pathStr.startsWith('/') ? '' : '/'}${pathStr}`;
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#22C55E" style={{ marginVertical: 30 }} />;
  }

  return (
    <View style={styles.container}>
      {/* 📍 แสดงข้อความแจ้งเตือนเมื่อไม่มีข้อมูลเพลงในระบบ */}
      {tracks.length === 0 ? (
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeader}>• เพลงแนะนำ</Text>
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>ยังไม่มีข้อมูลเพลงในขณะนี้ (หรือเชื่อมต่อ Backend ไม่สำเร็จ)</Text>
          </View>
        </View>
      ) : (
        <>
          {/* 📍 1. แนะนำสำหรับคุณ */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionHeader}>• แนะนำสำหรับคุณ</Text>
            <TouchableOpacity
              style={styles.promoBanner}
              activeOpacity={0.9}
              onPress={() => navigation?.navigate('Player', { track: tracks[0], trackId: tracks[0]?._id || tracks[0]?.id })}
            >
              <Image
                source={{ uri: getImageUrl(tracks[0]?.coverImage, 'https://picsum.photos/400/200') }}
                style={styles.bannerImg}
              />
              <View style={styles.bannerOverlay}>
                <Text style={styles.bannerTitle} numberOfLines={1}>
                  {tracks[0]?.title || 'เพลงแนะนำวันนี้'}
                </Text>
                <Text style={styles.bannerSub} numberOfLines={1}>
                  {tracks[0]?.artist || 'ศิลปินยอดนิยม'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 📍 2. ดึงเพลงทั้งหมด แล้วแยกตามประเภท/หมวดหมู่เพลง */}
          {Object.keys(genreGroups).map((genre) => (
            <View key={genre} style={styles.sectionBox}>
              <Text style={styles.sectionHeader}>• {genre}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
                {genreGroups[genre].map((item, index) => {
                  const itemId = item._id || item.id || index;
                  return (
                    <TouchableOpacity
                      key={itemId}
                      style={styles.trackCard}
                      activeOpacity={0.8}
                      onPress={() => navigation?.navigate('Player', { track: item, trackId: itemId })}
                    >
                      <Image
                        source={{ uri: getImageUrl(item.coverImage) }}
                        style={styles.trackCover}
                      />
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.cardSub} numberOfLines={1}>
                        {item.artist || 'ไม่ระบุศิลปิน'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ))}

          {/* 📍 3. ศิลปินที่คุณอาจรู้จัก */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionHeader}>• ศิลปินที่คุณอาจรู้จัก</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.artistList}>
              {tracks.map((item, index) => {
                const itemId = item._id || item.id || index;
                return (
                  <TouchableOpacity key={itemId} style={styles.artistCircleCard} activeOpacity={0.8}>
                    <Image
                      source={{ uri: getImageUrl(item.artistImage || item.coverImage) }}
                      style={styles.circleAvatar}
                    />
                    <Text style={styles.artistName} numberOfLines={1}>
                      {item.artist || 'ศิลปิน'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
};

export default MusicSection;

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  sectionBox: { marginBottom: 16 },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 12,
  },

  /* Banner แนะนำ */
  promoBanner: {
    width: '100%',
    height: 185,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#242428',
    position: 'relative',
  },
  bannerImg: { width: '100%', height: '100%' },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bannerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  bannerSub: { color: '#22C55E', fontSize: 13, marginTop: 2, fontWeight: '600' },

  /* รายการเพลงตามหมวดหมู่ */
  horizontalList: { paddingBottom: 6 },
  trackCard: {
    width: 120,
    marginRight: 14,
  },
  trackCover: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#242428',
  },
  cardTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, marginTop: 6 },
  cardSub: { color: '#8E8E93', fontSize: 11, marginTop: 2 },

  /* ศิลปิน */
  artistList: { paddingBottom: 10 },
  artistCircleCard: { alignItems: 'center', marginRight: 18, width: 72 },
  circleAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#242428',
    borderWidth: 1,
    borderColor: '#3A3A40',
  },
  artistName: { color: '#CCC', fontSize: 12, marginTop: 6, textAlign: 'center' },

  /* แจ้งเตือนเมื่อไม่มีข้อมูล */
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E22',
    borderRadius: 12,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
  },
});