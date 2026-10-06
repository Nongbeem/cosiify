import React, { useState, useEffect } from 'react';
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
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const commentIcon = require('../assets/comment.png');
const heartIcon = require('../assets/like.g.png');
const heartActiveIcon = require('../assets/like.c.png');
const tokenIcon = require('../assets/gem.png');

const API_BASE_URL = 'http://10.0.2.2:5000/api';
const SERVER_BASE_URL = 'http://10.0.2.2:5000';
const { width } = Dimensions.get('window');

export default function EbookScreen({ route, navigation }) {
  const { title: paramTitle, userId: paramUserId, item, ebook } = route.params || {};
  const rawBookId = route.params?.bookId || item?._id || item?.id || ebook?._id || ebook?.id;
  const bookId = rawBookId ? String(rawBookId) : null;

  const [book, setBook] = useState(item || ebook || null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [hasRewarded, setHasRewarded] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [bookId]);

  const getActiveUserId = async () => {
    if (paramUserId) return String(paramUserId);
    const storedUser = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      return String(parsed.id || parsed._id || '');
    }
    return null;
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const userId = await getActiveUserId();
      let fetchedUserData = null;

      if (userId) {
        const uRes = await fetch(`${API_BASE_URL}/users/${userId}`).catch(() => null);
        if (uRes && uRes.ok) {
          fetchedUserData = await uRes.json();
          setUser(fetchedUserData);
        }
      }

      if (bookId) {
        const bRes = await fetch(`${API_BASE_URL}/ebooks/${bookId}`).catch(() => null);
        if (bRes && bRes.ok) {
          const resJson = await bRes.json();
          const bData = resJson?.data || resJson?.ebook || resJson?.book || resJson;
          setBook(bData);

          const bookPrice = Number(bData.price || 0);

          if (bookPrice === 0) {
            setIsPurchased(true);
          } else {
            // เช็กจาก E-book ว่ามี userId นี้เคยซื้อหรือยัง
            const boughtInEbook = Array.isArray(bData.purchasedBy) && bData.purchasedBy.some(
              (id) => String(id?._id || id) === String(userId)
            );

            // เช็กจาก User ว่ามี bookId นี้ในรายการซื้อหรือยัง
            const userPurchased = fetchedUserData?.purchasedEbooks || [];
            const userUnlocked = fetchedUserData?.unlockedEbooks || [];
            const combinedUserList = [...userPurchased, ...userUnlocked];

            const boughtInUser = Array.isArray(combinedUserList) && combinedUserList.some(
              (id) => String(id?._id || id) === String(bookId)
            );

            setIsPurchased(boughtInEbook || boughtInUser);
          }
        }

        if (userId) {
          checkFavoriteStatus(userId, bookId);
        }
      }
    } catch (error) {
      console.error('Error loading ebook data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async (userId, targetBookId) => {
    try {
      const favRes = await fetch(`${API_BASE_URL}/favorites/${userId}`).catch(() => null);
      if (favRes && favRes.ok) {
        const favs = await favRes.json();
        const exist = Array.isArray(favs) && favs.some(
          (f) => String(f.contentId?._id || f.contentId) === String(targetBookId) && f.contentType === 'ebook'
        );
        setIsLiked(exist);
      }
    } catch (error) {
      console.error('Check favorite error:', error);
    }
  };

  const handleBuyEbook = async () => {
    const userId = await getActiveUserId();
    if (!userId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนทำการซื้อ');
      return;
    }

    const price = Number(book?.price) || 0;
    const currentTokens = Number(user?.tokensBalance) || 0;

    if (currentTokens < price) {
      Alert.alert('Token ไม่เพียงพอ', `หนังสือเล่มนี้ราคา ${price} Tokens คุณมีอยู่ ${currentTokens} Tokens`);
      return;
    }

    try {
      setBuying(true);
      const res = await fetch(`${API_BASE_URL}/ebooks/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ebookId: bookId }),
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        throw new Error('ระบบตอบกลับไม่ถูกต้อง กรุณาตรวจสอบ Backend Server');
      }

      if (res.ok) {
        setIsPurchased(true); // ปลดล็อกหน้าทันที
        Alert.alert('สำเร็จ!', data.message || 'ซื้อ E-book เรียบร้อยแล้ว สามารถเริ่มอ่านได้เลย');

        const newBalance = data.tokensBalance ?? (currentTokens - price);
        setUser((prev) => (prev ? { ...prev, tokensBalance: newBalance } : prev));

        // อัปเดตข้อมูล Token ใน Cache เครื่อง
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          const parsed = JSON.parse(storedUserData);
          parsed.tokensBalance = newBalance;
          await AsyncStorage.setItem('userData', JSON.stringify(parsed));
        }
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          parsed.tokensBalance = newBalance;
          await AsyncStorage.setItem('user', JSON.stringify(parsed));
        }
      } else {
        Alert.alert('ผิดพลาด', data.message || 'ไม่สามารถซื้อ E-book ได้');
      }
    } catch (error) {
      console.error('Buy error:', error);
      Alert.alert('ผิดพลาด', error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setBuying(false);
    }
  };

  const handleRewardTokens = async () => {
    if (hasRewarded) return;
    const userId = await getActiveUserId();
    if (!userId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/users/reward-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: 400,
          contentType: 'ebook',
          contentId: bookId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHasRewarded(true);

        const newBalance = data.tokensBalance ?? ((user?.tokensBalance || 0) + 400);
        setUser((prev) => (prev ? { ...prev, tokensBalance: newBalance } : prev));

        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          const parsed = JSON.parse(storedUserData);
          parsed.tokensBalance = newBalance;
          await AsyncStorage.setItem('userData', JSON.stringify(parsed));
        }

        if (!data.isAlreadyRewarded) {
          Alert.alert('🎉 ยินดีด้วย!', 'คุณได้รับ 400 Tokens จากการอ่าน E-book เล่มนี้');
        }
      }
    } catch (error) {
      console.error('Reward error:', error);
    }
  };

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 30;
    if (isCloseToBottom) {
      handleRewardTokens();
    }
  };

  const handleToggleFavorite = async () => {
    const userId = await getActiveUserId();
    if (!userId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนกดถูกใจ');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          contentType: 'ebook',
          contentId: bookId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsLiked(data.isFavorite ?? !isLiked);
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    const pathStr = typeof path === 'string' ? path : (path?.url || path?.path || path?.src || '');
    if (!pathStr) return '';
    if (pathStr.startsWith('http')) return pathStr;
    const cleanPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
    return `${SERVER_BASE_URL}${cleanPath}`;
  };

  const contentPages = book?.contentFiles || book?.pages || book?.images || book?.contentImages || book?.files;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121214" />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {book?.title || paramTitle || 'E-Book Reader'}
        </Text>

        {user && (
          <View style={styles.tokenBadge}>
            <Image source={tokenIcon} style={styles.tokenBadgeIcon} />
            <Text style={styles.tokenBadgeText}>{user.tokensBalance ?? 0}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : !isPurchased && Number(book?.price || 0) > 0 ? (
        <View style={styles.lockContainer}>
          {book?.coverUrl || book?.coverImage ? (
            <Image
              source={{ uri: getImageUrl(book?.coverUrl || book?.coverImage) }}
              style={styles.lockCover}
              resizeMode="cover"
            />
          ) : null}
          <Text style={styles.lockTitle}>{book?.title}</Text>
          <Text style={styles.lockAuthor}>ผู้เขียน: {book?.author || 'ไม่ระบุ'}</Text>
          <Text style={styles.lockPrice}>
            {isPurchased ? 'สถานะ: ซื้อแล้ว' : `ราคา: ${book?.price} Tokens`}
          </Text>

          <TouchableOpacity
            style={styles.buyBtn}
            onPress={handleBuyEbook}
            disabled={buying}
          >
            {buying ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buyBtnText}>ปลดล็อกอ่านเนื้อหาด้วย {book?.price} Tokens</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            onScroll={handleScroll}
            scrollEventThrottle={400}
          >
            {book?.coverUrl || book?.coverImage ? (
              <Image
                source={{ uri: getImageUrl(book?.coverUrl || book?.coverImage) }}
                style={styles.bannerImage}
                resizeMode="contain"
              />
            ) : null}

            <Text style={styles.bookTitle}>{book?.title}</Text>
            <Text style={styles.bookAuthor}>เขียนโดย: {book?.author || 'ไม่ระบุ'}</Text>

            {/* เพิ่มป้ายแสดงสถานะการครอบครองเนื้อหา */}
            <Text style={styles.purchasedStatusText}>
              {isPurchased && Number(book?.price || 0) > 0 ? '✓ ซื้อแล้ว' : 'ฟรี'}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.textContent}>
              {book?.content || book?.description || 'ไม่มีเนื้อหาข้อความในหนังสือเล่มนี้'}
            </Text>

            {Array.isArray(contentPages) &&
              contentPages.map((img, idx) => (
                <Image
                  key={idx}
                  source={{ uri: getImageUrl(img) }}
                  style={styles.contentPageImage}
                  resizeMode="contain"
                />
              ))}

            <View style={styles.endNotice}>
              <Text style={styles.endNoticeText}>— จบเนื้อหาหนังสือ —</Text>
              {hasRewarded && (
                <Text style={styles.rewardedBadge}>✨ รับ 400 Tokens สำเร็จแล้ว!</Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.bottomBarWrapper}>
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  navigation.navigate('CommentScreen', {
                    contentType: 'ebook',
                    contentId: bookId,
                    title: book?.title || 'ความคิดเห็น E-Book',
                  })
                }
              >
                <Image source={commentIcon} style={styles.iconImage} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleToggleFavorite}>
                <Image source={isLiked ? heartActiveIcon : heartIcon} style={styles.iconImage} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121214',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#242428',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: { color: '#FFF', fontSize: 28, fontWeight: '300', marginTop: -4 },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242428',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 6,
  },
  tokenBadgeIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  tokenBadgeText: {
    color: '#fbfbfb',
    fontSize: 15,
    fontWeight: 'bold',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockCover: {
    width: 140,
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
  },
  lockTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  lockAuthor: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 12,
  },
  lockPrice: {
    color: '#22C55E',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 24,
  },
  buyBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  buyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#121214',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  bannerImage: {
    width: '100%',
    height: 240,
    borderRadius: 8,
    marginBottom: 16,
  },
  bookTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  bookAuthor: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 6,
  },
  purchasedStatusText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#242428',
    marginVertical: 16,
  },
  textContent: {
    color: '#E5E7EB',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'justify',
  },
  contentPageImage: {
    width: width - 40,
    height: 400,
    marginVertical: 10,
    borderRadius: 6,
  },
  endNotice: {
    alignItems: 'center',
    marginTop: 40,
    paddingVertical: 20,
  },
  endNoticeText: {
    color: '#6B7280',
    fontSize: 14,
  },
  rewardedBadge: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 35, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 24,
    gap: 16,
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