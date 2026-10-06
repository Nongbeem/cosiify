import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

const categories = ['ทั้งหมด', 'เพลง', 'หนังสือการ์ตูน', 'หนังสือเสียง', 'E-Book'];

const Category = ({ activeCategory, setActiveCategory }) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((item) => {
          const isActive = activeCategory === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.chip, isActive ? styles.activeChip : styles.inactiveChip]}
              onPress={() => setActiveCategory(item)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, isActive ? styles.activeText : styles.inactiveText]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default Category;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: '#121214', // ใส่สีพื้นหลังทึบเพื่อไม่ให้คอนเทนต์ด้านล่างโผล่ซ้อนมาตอนเลื่อน
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeChip: {
    backgroundColor: '#22C55E',
  },
  inactiveChip: {
    backgroundColor: '#28282C',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeText: {
    color: '#000000',
  },
  inactiveText: {
    color: '#FFFFFF',
  },
});