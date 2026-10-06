import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// 📍 ดึงรูปโปรไฟล์เริ่มต้นจากโฟลเดอร์ assets ในเครื่อง
const DEFAULT_AVATAR = require('../assets/Avatar.jpg');

// 📍 รายการแจ้งเตือนตัวอย่างสำรองสำหรับอัปเดตใหม่
const DEFAULT_NOTIFICATIONS = [
  { 
    id: '1', 
    type: 'song', 
    targetType: 'song',
    targetId: 'track_neffex_destiny',
    icon: 'musical-notes', 
    color: '#3B82F6', 
    title: 'มีเพลงใหม่จาก NEFFEX', 
    detail: 'เพลง "destiny" ปล่อยออกมาแล้ว ให้รับฟังได้เลย!',
    track: {
      id: 'track_neffex_destiny',
      title: 'destiny',
      artist: 'NEFFEX',
      coverImage: 'https://picsum.photos/400/200',
      audioUrl: '',
    }
  },
  { 
    id: '2', 
    type: 'webtoon', 
    targetType: 'webtoon',
    targetId: 'webtoon_shumatsu_2',
    icon: 'book', 
    color: '#22C55E', 
    title: 'ตอนใหม่มาแล้ว! มหาศึกคนชนเทพ', 
    detail: 'ตอนที่ 2: "บทที่ 2" อัปเดตแล้ว เข้าไปติดตามอ่านได้เลย!',
    webtoon: {
      id: 'webtoon_shumatsu_2',
      title: 'มหาศึกคนชนเทพ',
      author: 'ทาคูมิ ฟูกูอิ',
      synopsis: 'เรื่องย่อการต่อสู้ระหว่างเทพกับมนุษย์',
      coverImage: 'https://picsum.photos/200/300',
    }
  },
  { 
    id: '3', 
    type: 'webtoon', 
    targetType: 'webtoon',
    targetId: 'webtoon_shumatsu_1',
    icon: 'book', 
    color: '#22C55E', 
    title: 'ตอนใหม่มาแล้ว! มหาศึกคนชนเทพ', 
    detail: 'ตอนที่ 1: "บทที่ 1" อัปเดตแล้ว เข้าไปติดตามอ่านได้เลย!',
    webtoon: {
      id: 'webtoon_shumatsu_1',
      title: 'มหาศึกคนชนเทพ',
      author: 'ทาคูมิ ฟูกูอิ',
      synopsis: 'เรื่องย่อการต่อสู้ระหว่างเทพกับมนุษย์',
      coverImage: 'https://picsum.photos/200/300',
    }
  },
  { 
    id: '4', 
    type: 'webtoon', 
    targetType: 'webtoon',
    targetId: 'webtoon_shumatsu_main',
    icon: 'book', 
    color: '#22C55E', 
    title: 'มีเว็บตูนเรื่องใหม่จาก ทาคูมิ ฟูกูอิ', 
    detail: 'ผลงานเรื่อง "มหาศึกคนชนเทพ" เปิดตัวใหม่แล้ว เข้าไปอ่านได้เลย!',
    webtoon: {
      id: 'webtoon_shumatsu_main',
      title: 'มหาศึกคนชนเทพ',
      author: 'ทาคูมิ ฟูกูอิ',
      synopsis: 'เรื่องย่อการต่อสู้ระหว่างเทพกับมนุษย์',
      coverImage: 'https://picsum.photos/200/300',
    }
  },
];

// 📍 ฟังก์ชันแปลงประเภทแจ้งเตือนจาก Backend เป็น Icon & สี
const getNotifMeta = (type) => {
  switch (type) {
    case 'song':
    case 'track':
    case 'new_track':
      return { icon: 'musical-notes', color: '#3B82F6' };
    case 'webtoon':
    case 'chapter':
    case 'new_webtoon':
    case 'new_episode':
      return { icon: 'book', color: '#22C55E' };
    case 'ebook':
    case 'new_ebook':
      return { icon: 'journal', color: '#F59E0B' };
    case 'audiobook':
    case 'new_audiobook':
      return { icon: 'headset', color: '#EC4899' };
    default:
      return { icon: 'notifications', color: '#6366F1' };
  }
};

const Header = ({
  userId,
  apiUrl,
  userName,
  points,
  userImage,
  onLogout,
  onNotificationPress,
  onNotificationItemPress,
  onUpdateProfile,
  notifications = DEFAULT_NOTIFICATIONS,
  hasUnread = true,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editName, setEditName] = useState(userName || '');

  const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
  const [userNotifications, setUserNotifications] = useState(notifications);
  const [unreadStatus, setUnreadStatus] = useState(hasUnread);

  useEffect(() => {
    if (userName) {
      setEditName(userName);
    }
  }, [userName]);

  useEffect(() => {
    setUnreadStatus(hasUnread);
  }, [hasUnread]);

const fetchUserNotifications = async () => {
    if (!userId || !apiUrl) {
      setUserNotifications(notifications);
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/api/notifications/${userId}`);
      if (response.ok) {
        const data = await response.json();
        const notifList = Array.isArray(data) ? data : (data.notifications || data.data || []);
        if (Array.isArray(notifList) && notifList.length > 0) {
          setUserNotifications(notifList);
          const hasUnreadNotif = notifList.some((item) => !item.isRead);
          setUnreadStatus(hasUnreadNotif);
        } else {
          setUserNotifications(notifications);
        }
      }
    } catch (err) {
      console.error('Error fetching user notifications:', err);
    }
  };

  useEffect(() => {
    fetchUserNotifications();
  }, [userId, apiUrl, notifications]);

  // 📍 [ฟังก์ชัน] ลบรายการแจ้งเตือนออกเฉพาะของ User
  const handleDeleteNotification = async (notifId) => {
    setUserNotifications((prev) => {
      const updatedList = prev.filter((item) => (item._id || item.id) !== notifId);
      const hasUnreadNotif = updatedList.some((item) => !item.isRead);
      setUnreadStatus(hasUnreadNotif);
      return updatedList;
    });

    if (apiUrl && notifId) {
      try {
        await fetch(`${apiUrl}/api/notifications/${notifId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Error deleting notification:', err);
      }
    }
  };

  const handleOpenModal = () => {
    setEditName(userName || '');
    setIsModalVisible(true);
  };

  const handleSave = () => {
    if (!editName || typeof editName !== 'string' || !editName.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อผู้ใช้งาน');
      return;
    }
    if (onUpdateProfile) {
      onUpdateProfile({ name: editName.trim() });
    }
    setIsModalVisible(false);
  };

  const handleNotifPress = () => {
    setIsNotifModalVisible(true);
    if (onNotificationPress) {
      onNotificationPress();
    }
  };

  const handleNotificationPress = async (notification) => {
    if (!notification?.targetId) {
      Alert.alert("แจ้งเตือน", "ไม่พบข้อมูลเนื้อหานี้ (อาจเป็นแจ้งเตือนรูปแบบเก่า)");
      return;
    }

    try {
      setIsNotifModalVisible(false);
      const currentApiUrl = apiUrl || 'http://localhost:5000';

      if (notification.type === 'track' || notification.type === 'song') {
        const res = await fetch(`${currentApiUrl}/api/tracks/${notification.targetId}`);
        const trackData = await res.json();
        if (res.ok && trackData._id) {
          if (onNotificationItemPress) onNotificationItemPress({ ...notification, targetData: trackData });
        } else {
          Alert.alert("ผิดพลาด", "ไม่พบข้อมูลเพลงนี้ในระบบ");
        }
      } else if (notification.type === 'webtoon' || notification.type === 'chapter') {
        const res = await fetch(`${currentApiUrl}/api/webtoons/${notification.targetId}`);
        const webtoonData = await res.json();
        if (res.ok && webtoonData._id) {
          if (onNotificationItemPress) onNotificationItemPress({ ...notification, targetData: webtoonData });
        } else {
          Alert.alert("ผิดพลาด", "ไม่พบข้อมูลเว็บตูนนี้ในระบบ");
        }
      }
    } catch (error) {
      console.error("Error notification navigation:", error);
    }
  };

  const handleItemPress = (item) => {
    setIsNotifModalVisible(false);
    if (onNotificationItemPress) {
      const targetData = item.track || item.webtoon || item.ebook || item.audiobook || item;
      const payload = {
        ...item,
        targetData: targetData,
        targetId: item.targetId || item.trackId || item.webtoonId || item.ebookId || item._id || item.id,
        targetType: item.targetType || item.type,
      };
      onNotificationItemPress(payload);
    }
  };

  return (
    <View style={styles.container}>
      {/* รูปภาพ / ชื่อผู้ใช้ */}
      <TouchableOpacity
        style={styles.userInfo}
        activeOpacity={0.7}
        onPress={handleOpenModal}
      >
        <Image
          source={
            userImage && typeof userImage === 'string' && userImage.trim() !== ''
              ? { uri: userImage }
              : DEFAULT_AVATAR
          }
          style={styles.avatar}
        />

        <View style={styles.userNameWrapper}>
          <Text style={styles.userName} numberOfLines={1}>
            {userName && typeof userName === 'string' && userName.trim() !== '' ? `สวัสดี, ${userName}` : 'สวัสดี, ผู้ใช้งาน'}
          </Text>
          <Ionicons name="create-outline" size={14} color="#9CA3AF" style={styles.editIcon} />
        </View>
      </TouchableOpacity>

      {/* ฝั่งขวา: Tokens + ปุ่มแจ้งเตือน + ปุ่ม Logout */}
      <View style={styles.rightSection}>
        <View style={styles.badge}>
          <Image
            source={require('../assets/gem.png')}
            style={styles.headerIconImage}
          />
          <Text style={styles.badgeText}>{points ?? 0}</Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={handleNotifPress} activeOpacity={0.7}>
          <Image
            source={require('../assets/bell.png')}
            style={styles.headerIconImage}
          />
          {unreadStatus && <View style={styles.notificationBadge} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={onLogout || (() => {})} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Modal แก้ไขชื่อผู้ใช้งาน */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>แก้ไขชื่อผู้ใช้งาน</Text>

            <Text style={styles.inputLabel}>ชื่อผู้ใช้งานใหม่:</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="กรอกชื่อผู้ใช้งาน..."
              placeholderTextColor="#6B7280"
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.btnCancelText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave}>
                <Text style={styles.btnSaveText}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal แจ้งเตือนอัปเดตใหม่ */}
      <Modal
        visible={isNotifModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsNotifModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notifModalContent}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifModalTitle}>📢 แจ้งเตือนอัปเดตใหม่</Text>
              <TouchableOpacity onPress={() => setIsNotifModalVisible(false)}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
              {(userNotifications && userNotifications.length > 0 ? userNotifications : notifications).map((item, index) => {
                const meta = getNotifMeta(item.type);
                const notifIcon = item.icon || meta.icon;
                const notifColor = item.color || meta.color;
                const notifTitle = item.title || 'อัปเดตใหม่';
                const notifDetail = item.detail || item.message || '';
                const itemId = item._id || item.id || `notif-${index}`;

                return (
                  <View key={itemId} style={styles.notifCard}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
                      onPress={() => handleItemPress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.notifIconBox, { backgroundColor: notifColor }]}>
                        <Ionicons name={notifIcon} size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.notifTextWrapper}>
                        <Text style={styles.notifItemTitle}>{notifTitle}</Text>
                        <Text style={styles.notifItemDetail}>{notifDetail}</Text>
                      </View>
                    </TouchableOpacity>

                    {/* 📍 ปุ่มกดลบทิ้งแจ้งเตือน */}
                    <TouchableOpacity
                      style={styles.notifDeleteBtn}
                      onPress={() => handleDeleteNotification(itemId)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.notifCloseBtn} onPress={() => setIsNotifModalVisible(false)}>
              <Text style={styles.notifCloseBtnText}>รับทราบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#27272A',
    borderWidth: 1.5,
    borderColor: '#22C55E',
  },
  userNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    maxWidth: 120,
  },
  editIcon: {
    marginLeft: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  headerIconImage: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  iconBtn: {
    width: 34,
    height: 34,
    backgroundColor: '#1E1E22',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1E1E22',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#121214',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: '#27272A',
  },
  btnSave: {
    backgroundColor: '#22C55E',
  },
  btnCancelText: {
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  btnSaveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  notifModalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#1E1E22',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  notifModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  notifList: {
    marginBottom: 16,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121214',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 12,
  },
  notifIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifTextWrapper: {
    flex: 1,
  },
  notifItemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  notifItemDetail: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  notifDeleteBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifCloseBtn: {
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  notifCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});