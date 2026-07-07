import React from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { data } from '@/constants/scholarship_list';

// Calculate precise card width based on screen width
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;

export default function ScholarshipTab({ navigation }) {
  const { theme } = useTheme();
  const renderScholarshipCard = ({ item }) => (
      <TouchableOpacity 
          activeOpacity={0.7}
          style={[
              styles.card, 
              { 
                  backgroundColor: theme.card,
                  borderColor: theme.border || 'rgba(0,0,0,0.06)'
              }
          ]}
      >
          {/* Top Section: Badges & Tags */}
          <View style={[styles.badgeContainer, { backgroundColor: `${theme.primary}12` }]}>
              <Text style={[styles.criteriaText, { color: theme.primary }]}>
                  {item.criteria}
              </Text>
          </View>
          {/* Middle Section: Main Content */}
          <View style={styles.mainContent}>
              <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={2}>
                  {item.name}
              </Text>
          </View>
          {/* Bottom Section: Fixed Metadata */}
          <View style={styles.footer}>
              <Text style={[styles.courseText, { color: theme.textSecondary || '#8E8E93' }]} numberOfLines={1}>
                  {item.course}
              </Text>
          </View>
      </TouchableOpacity>
  );
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header screenName={"SCHOLARSHIPS"} navigation={navigation} />
      <FlatList
        data={data}
        renderItem={renderScholarshipCard}
        keyExtractor={(item, index) => index.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 15, paddingTop: 10,paddingBottom: 10 },
    row: { justifyContent: 'space-between', marginBottom: 10 },
    card: { width: CARD_WIDTH, padding: 10, borderWidth: 5, minHeight: 120,justifyContent: 'space-between' },
    badgeContainer: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    criteriaText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    mainContent: { flex: 1, justifyContent: 'center', marginVertical: 10 },
    nameText: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
    footer: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.03)', paddingTop: 8 },
    courseText: { fontSize: 12, fontWeight: '500' }
});