import React, { useRef, useEffect } from 'react';
import { StatusBar, StyleSheet, View, TouchableOpacity, Animated, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';

// Import Screens (แก้เฉพาะ path นำเข้า 2 ไฟล์นี้เป็น _2)
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import EbookScreen from './src/screens/EbookScreen';

// 📍 หน้าการ์ตูน
import WebtoonDetailScreen from './src/screens/WebtoonDetailScreen';
import WebtoonReaderScreen from './src/screens/WebtoonReaderScreen';
import PlaylistDetailScreen from './src/screens/PlaylistDetailScreen';
import CommentScreen from './src/screens/CommentScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_WIDTH = 310 / 4;

// 📍 รูปไอคอน Active (.c) และ Inactive (.g)
const TAB_ICONS = {
  HomeTab: {
    active: require('./src/assets/home.c.png'),
    inactive: require('./src/assets/home.g.png'),
  },
  SearchTab: {
    active: require('./src/assets/search.c.png'),
    inactive: require('./src/assets/search.g.png'),
  },
  LibraryTab: {
    active: require('./src/assets/library.c.png'),
    inactive: require('./src/assets/library.g.png'),
  },
  FavoritesTab: {
    active: require('./src/assets/follow.c.png'),
    inactive: require('./src/assets/follow.g.png'),
  },
};

// 📍 เพิ่มรายการแจ้งเตือนสำหรับประกาศเนื้อหาใหม่ให้กับผู้ใช้อย่างทั่วถึง
const LATEST_UPDATES_NOTIFICATION = [
  { id: '1', type: 'song', icon: 'musical-notes', color: '#3B82F6', title: '🎵 เพลงใหม่!', detail: 'มีเพลงใหม่เพิ่มเข้ามาในระบบแล้ว เข้าไปเลือกฟังกันได้เลย' },
  { id: '2', type: 'webtoon', icon: 'book', color: '#22C55E', title: '📚 หนังสือการ์ตูนเรื่องใหม่!', detail: 'อัปเดตการ์ตูนเรื่องใหม่และตอนใหม่ล่าสุดแล้ววันนี้' },
  { id: '3', type: 'ebook', icon: 'journal', color: '#F59E0B', title: '📖 e-book เรื่องใหม่!', detail: 'มี e-book เล่มใหม่มาใหม่ อ่านเพลิดเพลินได้ในคลัง' },
  { id: '4', type: 'audiobook', icon: 'headset', color: '#EC4899', title: '🎧 หนังสือเสียงเรื่องใหม่!', detail: 'ฟังหนังสือเสียงเรื่องใหม่ คมชัด เพลิดเพลินได้ทุกเวลา' },
];

function CustomTabBar({ state, descriptors, navigation }) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const currentTabWidth = (state && state.routes && state.routes.length ? 310 / state.routes.length : TAB_WIDTH);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index * currentTabWidth,
      useNativeDriver: true,
      speed: 18,
      bounciness: 0,
    }).start();
  }, [state.index, slideAnim, currentTabWidth]);

  return (
    <View style={styles.tabBarWrapper} pointerEvents="box-none">
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.9)']}
        style={styles.bottomFade}
        pointerEvents="none"
      />

      <View style={styles.menubar}>
        <View style={styles.hoverPillContainer} pointerEvents="none">
          <Animated.View style={[styles.hoverPill, { width: currentTabWidth, transform: [{ translateX: slideAnim }] }]} />
        </View>

        <View style={styles.menuItemsRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const iconConfig = TAB_ICONS[route.name];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key || `tab-${index}`}
                onPress={onPress}
                activeOpacity={0.8}
                style={[styles.tabItem, { width: currentTabWidth }]}
              >
                {iconConfig && (
                  <Image
                    source={isFocused ? iconConfig.active : iconConfig.inactive}
                    style={styles.tabIcon}
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} initialParams={{ updatesList: LATEST_UPDATES_NOTIFICATION }} />
      <Tab.Screen name="SearchTab" component={SearchScreen} />
      <Tab.Screen name="LibraryTab" component={LibraryScreen} />
      <Tab.Screen name="FavoritesTab" component={FavoritesScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Player" component={PlayerScreen} />
        <Stack.Screen name="Ebook" component={EbookScreen} />
        <Stack.Screen name="WebtoonDetail" component={WebtoonDetailScreen} />
        <Stack.Screen name="WebtoonReader" component={WebtoonReaderScreen} />
        <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
        <Stack.Screen name="CommentScreen" component={CommentScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 120,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  menubar: {
    width: 340,
    height: 76,
    backgroundColor: '#3A3A3C80',
    borderRadius: 38,
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  hoverPillContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -29.5,
    left: 15,
    width: 310,
    height: 59,
  },
  hoverPill: {
    width: 77.5,
    height: 59,
    backgroundColor: '#262626',
    borderRadius: 29.5,
  },
  menuItemsRow: {
    flexDirection: 'row',
    height: '100%',
    paddingHorizontal: 15,
  },
  tabItem: {
    width: 77.5,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  tabIcon: {
    width: 26,
    height: 26,
  },
});