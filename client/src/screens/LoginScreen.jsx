import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.0.2.2:5000';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: username,
          password: password,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.user || { name: username, points: 0 }));
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        Alert.alert('เข้าสู่ระบบไม่สำเร็จ', data.message || 'ข้อมูลไม่ถูกต้อง');
      }
    } catch (error) {
      Alert.alert('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent />

      {/* Top Navigation Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Please fill your account data</Text>

        {/* E-mail / Username Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Username:</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            placeholderTextColor="#52525B"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        {/* Password Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Password:</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#52525B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  headerBar: {
    paddingHorizontal: 20,
    // คำนวณระยะเว้นขอบบนตามความสูง Status Bar ของอุปกรณ์
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow: { color: '#FFFFFF', fontSize: 36, fontWeight: '300' },
  content: { paddingHorizontal: 28, paddingTop: 10 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 32,
  },
  formGroup: { marginBottom: 20 },
  label: { color: '#A1A1AA', fontSize: 13, fontWeight: '500', marginBottom: 8 },
  input: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#242428',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
});