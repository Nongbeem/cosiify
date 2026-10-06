import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';

const TOKEN_ICON = require('../assets/gem.png');
const API_BASE_URL = 'http://10.0.2.2:5000';

const AudiobookSection = ({ navigation }) => {
  const [audiobooks, setAudiobooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/api/audiobooks`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response error');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          // 📍 อ่านข้อมูลให้ครอบคลุมทั้งแบบ Array ตรงๆ หรือ Object
          const list = Array.isArray(data) ? data : (data?.data || data?.audiobooks || []);
          setAudiobooks(list);
        }
      })
      .catch((err) => console.error('Error fetching audiobooks:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 📍 ฟังก์ชันจัดการ URL ของรูปภาพให้ปลอดภัย
  const getImageUrl = (path) => {
    if (!path) return 'https://picsum.photos/200/300';
    const pathStr = typeof path === 'string' ? path : (path?.url || '');
    if (!pathStr) return 'https://picsum.photos/200/300';
    if (pathStr.startsWith('http')) return pathStr;
    return `${API_BASE_URL}${pathStr.startsWith('/') ? '' : '/'}${pathStr}`;
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#22C55E" style={{ marginVertical: 30 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>• หนังสือเสียง</Text>

      {(!audiobooks || audiobooks.length === 0) ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>ยังไม่มีข้อมูลหนังสือเสียงในขณะนี้ (หรือเชื่อมต่อ Backend ไม่สำเร็จ)</Text>
        </View>
      ) : (
        <View style={styles.grid2Col}>
          {audiobooks.map((item, index) => {
            const itemId = item._id || item.id;
            return (
              <TouchableOpacity
                key={itemId || index}
                style={styles.posterCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation?.navigate('Player', {
                    track: item,
                    trackId: itemId,
                    isAudiobook: true,
                  })
                }
              >
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: getImageUrl(item.coverImage || item.coverUrl) }}
                    style={styles.posterImg}
                  />

                  <View style={styles.priceBadge}>
                    {item.price > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={TOKEN_ICON} style={styles.badgeTokenIcon} />
                        <Text style={styles.priceBadgeText}>{item.price}</Text>
                      </View>
                    ) : (
                      <Text style={styles.priceBadgeText}>ฟังฟรี</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.posterTitle} numberOfLines={1}>{item.title || 'ไม่มีชื่อเรื่อง'}</Text>
                <Text style={styles.posterStatus} numberOfLines={1}>
                  {item.narrator ? `บรรยาย: ${item.narrator}` : `ผู้แต่ง: ${item.author || '-'}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default AudiobookSection;

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  sectionHeader: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginVertical: 14 },
  grid2Col: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  posterCard: { width: '48.5%', marginBottom: 18 },
  posterImg: { width: '100%', height: 220, borderRadius: 18, backgroundColor: '#242428' },
  posterTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 8 },
  posterStatus: { color: '#9CA3AF', fontSize: 12, fontWeight: '500', marginTop: 2 },
  priceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: { color: '#22C55E', fontSize: 12, fontWeight: '700' },
  badgeTokenIcon: { width: 14, height: 14, resizeMode: 'contain', marginRight: 4 },
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