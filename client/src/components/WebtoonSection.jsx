import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';

const API_BASE_URL = 'http://10.0.2.2:5000';

const WebtoonSection = ({ navigation }) => {
  const [webtoons, setWebtoons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/api/webtoons`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          // 📍 อ่านข้อมูลให้ครอบคลุมทั้งกรณี Array และ Object พร้อมป้องกัน Null
          const list = Array.isArray(data) 
            ? data 
            : (data?.data || data?.webtoons || data?.result || []);
          setWebtoons(list);
        }
      })
      .catch((err) => console.error('Error fetching webtoons:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 📍 ฟังก์ชันแปลง Path รูปภาพให้ถูกต้องและปลอดภัย
  const getImageUrl = (path) => {
    if (!path) return 'https://picsum.photos/200/300';
    const pathStr = typeof path === 'string' ? path : (path?.url || '');
    if (!pathStr) return 'https://picsum.photos/200/300';
    if (pathStr.startsWith('http')) return pathStr; // กรณีเป็น URL เต็มอยู่แล้ว
    return `${API_BASE_URL}${pathStr.startsWith('/') ? '' : '/'}${pathStr}`;
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#22C55E" style={{ marginVertical: 30 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>•  เว็บตูนยอดนิยม</Text>

      {(!webtoons || webtoons.length === 0) ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>ยังไม่มีข้อมูลเว็บตูนในขณะนี้ (หรือเชื่อมต่อ Backend ไม่สำเร็จ)</Text>
        </View>
      ) : (
        <View style={styles.grid2Col}>
          {webtoons.map((item, index) => {
            const itemId = item._id || item.id;
            return (
              <TouchableOpacity 
                key={itemId || index} 
                style={styles.posterCard} 
                activeOpacity={0.85}
                onPress={() => navigation?.navigate('WebtoonDetail', { item: item, webtoonId: itemId })}
              >
                <Image 
                  source={{ uri: getImageUrl(item.coverImage || item.coverUrl) }}
                  style={styles.posterImg}
                />
                <Text style={styles.posterTitle} numberOfLines={1}>{item.title || 'ไม่มีชื่อเรื่อง'}</Text>
                <Text style={styles.posterStatus} numberOfLines={1}>
                  {item.author ? `ผู้แต่ง: ${item.author}` : 'เริ่มอ่านตอนที่ 1'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default WebtoonSection;

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  sectionHeader: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginVertical: 14 },
  grid2Col: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  posterCard: { width: '48.5%', marginBottom: 18 },
  posterImg: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: '#242428',
  },
  posterTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 8 },
  posterStatus: { color: '#22C55E', fontSize: 12, fontWeight: '600', marginTop: 2 },
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