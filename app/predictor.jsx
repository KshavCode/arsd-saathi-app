import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/themeStyle';

export default function PredictTab({ route, navigation, setIsDarkMode, isDarkMode }) {
  const theme = {
    background: isDarkMode ? Colors.dark.background : Colors.light.background,
    card: isDarkMode ? Colors.dark.card : Colors.light.card, 
    text: isDarkMode ? Colors.dark.text : Colors.light.text,
    textSecondary: isDarkMode ? Colors.dark.secondary : Colors.light.secondary,
    primary: isDarkMode ? Colors.dark.primary : Colors.light.primary,
    secondary: isDarkMode ? Colors.dark.secondary : Colors.light.secondary,
    error: isDarkMode ? Colors.dark.error : Colors.light.error,
    iconBg: isDarkMode ? Colors.light.iconBg : Colors.dark.iconBg,
    iconPlaceholder: isDarkMode ? Colors.light.iconPlaceholder : Colors.dark.iconPlaceholder,
    destructiveBg: isDarkMode ? Colors.light.destructiveBg : Colors.dark.destructiveBg,
    destructiveBorder: isDarkMode ? Colors.light.destructiveBorder : Colors.dark.destructiveBorder,
    separator: isDarkMode ? Colors.light.separator : Colors.dark.separator,
    footer: isDarkMode ? Colors.dark.footer : Colors.light.footer,
    modalOverlay: 'rgba(0, 0, 0, 0.6)'
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <ScrollView>
        <Text style={styles.header}>Predictor Logic</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Stylesheet ---

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    topIconContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap:10 },
    greeting: { fontSize: 16, fontWeight: '500' },
    username: { fontSize: 26, fontWeight: '800' },
    themeButton: { width: 45, height: 45, borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    statsGrid: { marginBottom: 25, gap: 12 },
    heroCardContainer: { width: '100%' },
    secondaryStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    card: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 4, minHeight: 110, justifyContent: 'space-between' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    iconContainer: { padding: 8, borderRadius: 10 },
    cardValue: { fontSize: 22, fontWeight: 'bold' },
    cardTitle: { fontSize: 14, marginTop: 2 },
    cardSub: { fontSize: 12, marginTop: 4, fontWeight: '600' },
    sectionHeader: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    actionContainer: { borderRadius: 16, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12 },
    actionIconCtx: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    actionText: { flex: 1, fontSize: 15, fontWeight: '600' },
    separator: { height: 1, marginLeft: 60 },
    footerText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12 },
});