import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';

const SplashScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/Logo App.png')} // ปรับ path ตามโครงสร้างโฟลเดอร์หากจำเป็น
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Headline */}
        <View style={styles.textWrapper}>
          <Text style={styles.titleText}>
            Discover your world{'\n'}
            with <Text style={styles.brandText}>Cosiify.</Text>
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={styles.signInBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.signInBtnText}>Sign in to your account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createAccountBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.createAccountBtnText}>Create new account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Disclaimer */}
        <Text style={styles.disclaimerText}>
          By tapping Sign In, or Create new account, you agree to Cosiify's{' '}
          <Text style={styles.linkText}>Terms of Service</Text> and{' '}
          <Text style={styles.linkText}>Privacy Policy.</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  logoWrapper: {
    marginBottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 140,
    height: 140,
  },
  textWrapper: {
    marginBottom: 40,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
  },
  brandText: {
    color: '#22C55E',
  },
  buttonWrapper: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  signInBtn: {
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  createAccountBtn: {
    backgroundColor: '#242428',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  disclaimerText: {
    color: '#71717A',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  linkText: {
    color: '#A1A1AA',
    fontWeight: '600',
  },
});