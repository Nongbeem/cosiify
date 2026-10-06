import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
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

const API_BASE_URL = 'http://10.0.2.2:5000/api';
const SERVER_BASE_URL = 'http://10.0.2.2:5000';
const { width } = Dimensions.get('window');

const AutoHeightImage = ({ uri }) => {
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    let isMounted = true;
    if (uri && typeof uri === 'string') {
      Image.getSize(
        uri,
        (w, h) => {
          if (w && h && isMounted) setAspectRatio(w / h);
        },
        (error) => console.error('Error getting image size:', error)
      );
    }
    return () => {
      isMounted = false;
    };
  }, [uri]);

  return (
    <Image
      source={{ uri }}
      style={{
        width: width,
        height: width / (aspectRatio || 1),
      }}
      resizeMode="cover"
    />
  );
};

export default function WebtoonReaderScreen({ route, navigation }) {
  const { episodeId: paramEpId, item, webtoonId, webtoonTitle, userId: paramUserId } = route.params || {};

  // 📍 ดึง episodeId ให้ถูกต้อง หากคลิกมาจากหน้าแจ้งเตือน
  const episodeId =
    paramEpId ||
    item?.episodeId ||
    item?.targetId ||
    (typeof item?.contentId === 'object' ? item?.contentId?._id || item?.contentId?.id : item?.contentId) ||
    item?._id ||
    item?.id;

  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [hasRewarded, setHasRewarded] = useState(false);

  useEffect(() => {
    if (episodeId) {
      fetchEpisodeDetail();
      checkFavoriteStatus();
      markEpisodeAsReadLocally(episodeId); // 📍 บันทึกว่าอ่านแล้วทันทีที่เข้ามาอ่าน
    } else {
      setLoading(false);
    }
  }, [episodeId]);

  const markEpisodeAsReadLocally = async (epId) => {
    try {
      if (!epId) return;
      const epIdStr = epId.toString();
      const storedReadEps = await AsyncStorage.getItem('readEpisodes');
      let currentRead = storedReadEps ? JSON.parse(storedReadEps) : [];
      if (!currentRead.includes(epIdStr)) {
        currentRead.push(epIdStr);
        await AsyncStorage.setItem('readEpisodes', JSON.stringify(currentRead));
      }
    } catch (err) {
      console.log('Error marking as read in reader:', err);
    }
  };

  const fetchEpisodeDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/episodes/${episodeId}`);
      if (res.ok) {
        const data = await res.json();
        const epData = data.data || data.episode || data;
        setEpisode(epData);
        if (!webtoonId && epData?.webtoonId) {
          checkFavoriteStatus(epData.webtoonId);
        }
      }
    } catch (error) {
      console.error('Fetch episode error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveUserId = async () => {
    if (paramUserId) return paramUserId;
    const storedUser = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      return parsed.id || parsed._id;
    }
    return null;
  };

  const handleRewardTokens = async () => {
    if (hasRewarded) return;

    const activeUserId = await getActiveUserId();
    if (!activeUserId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/users/reward-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          amount: 300,
          contentType: 'webtoon',
          contentId: episodeId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHasRewarded(true);

        const storedUser = (await AsyncStorage.getItem('userData')) || (await AsyncStorage.getItem('user'));
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          parsed.tokensBalance = data.tokensBalance ?? ((parsed.tokensBalance || 0) + 300);
          await AsyncStorage.setItem('userData', JSON.stringify(parsed));
        }

        if (!data.isAlreadyRewarded) {
          Alert.alert('🎉 ยินดีด้วย!', 'คุณได้รับ 300 Tokens จากการอ่าน');
        }
      }
    } catch (error) {
      console.error('Error rewarding tokens:', error);
    }
  };

  const checkFavoriteStatus = async (currentWebtoonId) => {
    const activeUserId = await getActiveUserId();
    const targetWebtoonId = webtoonId || currentWebtoonId || episode?.webtoonId;
    if (!activeUserId || !targetWebtoonId) return;

    try {
      const favRes = await fetch(`${API_BASE_URL}/favorites/${activeUserId}`);
      if (favRes.ok) {
        const favs = await favRes.json();
        const exist = Array.isArray(favs) && favs.some(
          (f) => (f.contentId?._id || f.contentId) === targetWebtoonId && f.contentType === 'webtoon'
        );
        setIsLiked(exist);
      }
    } catch (error) {
      console.error('Check favorite error:', error);
    }
  };

  const handleToggleFavorite = async () => {
    const activeUserId = await getActiveUserId();

    if (!activeUserId) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนกดถูกใจ');
      return;
    }

    const targetWebtoonId = webtoonId || episode?.webtoonId;
    if (!targetWebtoonId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          contentType: 'webtoon',
          contentId: targetWebtoonId,
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

  const handleOpenComments = () => {
    const targetId = episodeId || webtoonId || episode?.webtoonId;
    navigation.navigate('CommentScreen', {
      contentType: episodeId ? 'episode' : 'webtoon',
      contentId: targetId,
      title: webtoonTitle || episode?.title || 'ความคิดเห็นการ์ตูน',
    });
  };

  const getImageUrl = (path) => {
    if (!path || typeof path !== 'string') return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${SERVER_BASE_URL}${cleanPath}`;
  };

  const pages = episode?.imageUrls || episode?.contentFiles || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121214" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {webtoonTitle || episode?.title || 'อ่านการ์ตูน'} {episode?.episodeNumber ? `(ตอนที่ ${episode.episodeNumber})` : ''}
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : pages.length > 0 ? (
        <View style={{ flex: 1 }}>
          <FlatList
            data={pages}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => <AutoHeightImage uri={getImageUrl(item)} />}
            showsVerticalScrollIndicator={false}
            onEndReached={handleRewardTokens}
            onEndReachedThreshold={0.5}
          />

          {/* Floating Bottom Bar */}
          <View style={styles.bottomBarWrapper}>
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleOpenComments}
              >
                <Image source={commentIcon} style={styles.iconImage} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleToggleFavorite}>
                <Image source={isLiked ? heartActiveIcon : heartIcon} style={styles.iconImage} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyText}>ไม่พบรูปภาพเนื้อหาในตอนนี้</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
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