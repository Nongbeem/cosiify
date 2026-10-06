import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const API_BASE_URL = 'http://10.0.2.2:5000/api';

export default function CommentScreen({ route, navigation }) {
  const { contentType = 'webtoon', contentId, title } = route.params || {};
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserAndComments();
  }, [contentId, contentType]);

  const loadUserAndComments = async () => {
    try {
      setLoading(true);

      // โหลดข้อมูลผู้ใช้ที่เข้าสู่ระบบ
      let storedUserData = await AsyncStorage.getItem('userData');
      if (!storedUserData) {
        storedUserData = await AsyncStorage.getItem('user');
      }

      if (storedUserData) {
        setUser(JSON.parse(storedUserData));
      }

      // ดึงรายการ Comment จาก API (ปรับ URL ให้ตรงกับ Backend: /comments/:contentType/:contentId)
      if (contentId) {
        const res = await fetch(`${API_BASE_URL}/comments/${contentType}/${contentId}`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          setComments(Array.isArray(data) ? data : data.comments || []);
        }
      }
    } catch (error) {
      console.error('Fetch comments error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!inputText.trim()) return;

    if (!user) {
      Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น');
      return;
    }

    const userId = user.id || user._id;

    try {
      setSending(true);

      const res = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          contentType: contentType || 'webtoon',
          contentId,
          text: inputText.trim(),
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const result = await res.json();
        const newComment = result.data || result;
        setComments((prev) => [newComment, ...prev]);
      } else {
        // กรณีเชื่อมต่อ Server ไม่ได้
        const mockComment = {
          _id: Date.now().toString(),
          userId: { name: user.name || user.username || 'คุณ' },
          text: inputText.trim(),
          createdAt: new Date().toISOString(),
        };
        setComments((prev) => [mockComment, ...prev]);
      }

      setInputText('');
    } catch (error) {
      console.error('Send comment error:', error);
    } finally {
      setSending(false);
    }
  };

  const renderCommentItem = ({ item }) => {
    // อ่านชื่อผู้ใช้จาก item.userId.name ตาม Mongoose Populate
    const authorName = item.userId?.name || item.userId?.username || item.userName || 'ผู้ใช้งาน';
    const firstLetter = authorName.charAt(0).toUpperCase();
    const commentText = item.text || item.content || '';
    const dateText = item.createdAt ? new Date(item.createdAt).toLocaleDateString('th-TH') : '';

    return (
      <View style={styles.commentCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{firstLetter}</Text>
        </View>
        <View style={styles.commentBody}>
          <View style={styles.commentHeaderRow}>
            <Text style={styles.username}>{authorName}</Text>
            {dateText ? <Text style={styles.timeText}>{dateText}</Text> : null}
          </View>
          <Text style={styles.commentText}>{commentText}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121214" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title ? `ความคิดเห็น - ${title}` : 'ความคิดเห็น'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item, index) => item._id || item.id || index.toString()}
            renderItem={renderCommentItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbox-ellipses-outline" size={48} color="#4B5563" />
                <Text style={styles.emptyText}>ยังไม่มีความคิดเห็น</Text>
                <Text style={styles.emptySubText}>ร่วมแสดงความคิดเห็นเป็นคนแรกได้เลย!</Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="เขียนความคิดเห็น..."
            placeholderTextColor="#6B7280"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendComment}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="send" size={16} color={inputText.trim() ? '#000' : '#9CA3AF'} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomColor: '#242428',
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  commentCard: {
    flexDirection: 'row',
    backgroundColor: '#242428',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3F3F46',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#22C55E',
    fontWeight: '700',
    fontSize: 16,
  },
  commentBody: {
    flex: 1,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timeText: {
    color: '#6B7280',
    fontSize: 11,
  },
  commentText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E1E22',
    borderTopWidth: 1,
    borderTopColor: '#242428',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#242428',
    color: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendBtnDisabled: {
    backgroundColor: '#374151',
  },
});