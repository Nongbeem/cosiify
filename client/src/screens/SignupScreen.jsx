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

const API_BASE_URL = 'http://10.0.2.2:5000';

const SignupScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1 = Name/Username, 2 = Email/Password
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNextStep = () => {
    if (!fullName.trim() || !username.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอก Name และ Username ให้ครบถ้วน');
      return;
    }
    setStep(2);
  };

  const handleSignup = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: username,
          email: email,
          password: password,
          role: 'user',
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('สำเร็จ', 'สมัครสมาชิกเรียบร้อยแล้ว!', [
          { text: 'เข้าสู่ระบบ', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('ผิดพลาด', data.message || 'ไม่สามารถสมัครสมาชิกได้');
      }
    } catch (error) {
      Alert.alert('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent />

      {/* Top Navigation Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Create account</Text>

        {step === 1 ? (
          /* STEP 1 */
          <>
            <Text style={styles.subtitle}>Please fill your desire name</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Name:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#52525B"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

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

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleNextStep}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Next</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* STEP 2 */
          <>
            <Text style={styles.subtitle}>Please fill your account data</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>E-mail:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#52525B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password:</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor="#52525B"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>
                {loading ? 'Signing Up...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default SignupScreen;

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