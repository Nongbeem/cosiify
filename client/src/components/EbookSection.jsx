import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator } from 'react-native';

const TOKEN_ICON = require('../assets/gem.png');
const API_BASE_URL = 'http://10.0.2.2:5000';

const getImageUrl = (pathStr) => {
  if (!pathStr) return 'https://picsum.photos/200/300';
  const validPath = typeof pathStr === 'string' ? pathStr : (pathStr?.url || '');
  if (!validPath) return 'https://picsum.photos/200/300';
  if (validPath.startsWith('http')) return validPath;
  return `${API_BASE_URL}${validPath.startsWith('/') ? '' : '/'}${validPath}`;
};

const EbookSection = ({ navigation }) => {
  const [ebooks, setEbooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/api/ebooks`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response error');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          // 📍 รองรับทั้ง Array ตรงๆ หรือห่อใน Object (data.data, data.ebooks)
          const list = Array.isArray(data) ? data : (data?.data || data?.ebooks || []);
          setEbooks(list);
        }
      })
      .catch((err) => console.error('Error fetching ebooks:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#22C55E" style={{ marginVertical: 30 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>• E-Book ยอดนิยม</Text>

      {(!ebooks || ebooks.length === 0) ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>ยังไม่มีข้อมูล E-Book ในขณะนี้ (หรือเชื่อมต่อ Backend ไม่สำเร็จ)</Text>
        </View>
      ) : (
        <View style={styles.grid2Col}>
          {ebooks.map((item, index) => {
            const itemId = item._id || item.id;
            return (
              <TouchableOpacity
                key={itemId || index}
                style={styles.posterCard}
                activeOpacity={0.85}
                onPress={() => navigation?.navigate('Ebook', { item, bookId: itemId })}
              >
                <View style={{ position: 'relative' }}>
                  {/* แสดงรูปปก E-Book จริง */}
                  <Image source={{ uri: getImageUrl(item.coverImage || item.coverUrl) }} style={styles.posterImg} />
                  
                  {/* ป้ายราคาพร้อมไอคอน Token */}
                  <View style={styles.priceBadge}>
                    {item.price > 0 ? (
                      <View style={styles.tokenContainer}>
                        <Image source={TOKEN_ICON} style={styles.badgeTokenIcon} />
                        <Text style={styles.priceBadgeText}>{item.price}</Text>
                      </View>
                    ) : (
                      <Text style={styles.priceBadgeText}>ฟรี</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.posterTitle} numberOfLines={1}>{item.title || 'ไม่มีชื่อเรื่อง'}</Text>
                <Text style={styles.posterStatus} numberOfLines={1}>
                  {item.author ? `ผู้แต่ง: ${item.author}` : 'อ่าน E-Book'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default EbookSection;

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
  tokenContainer: { flexDirection: 'row', alignItems: 'center' },
  badgeTokenIcon: { width: 14, height: 14, resizeMode: 'contain', marginRight: 4 },
  priceBadgeText: { color: '#22C55E', fontSize: 12, fontWeight: '700' },
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