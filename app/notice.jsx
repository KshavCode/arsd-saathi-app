import { Colors } from '@/constants/themeStyle';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    LayoutAnimation,
    Linking,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Notices({ navigation, isDarkMode }) {
  const theme = {
    background: isDarkMode ? Colors.dark.background : Colors.light.background,
    card: isDarkMode ? Colors.dark.card : Colors.light.card, 
    text: isDarkMode ? Colors.dark.text : Colors.light.text,
    textSecondary: isDarkMode ? Colors.dark.secondary : Colors.light.secondary,
    primary: isDarkMode ? Colors.dark.primary : Colors.light.primary,
    borderColor: isDarkMode ? Colors.dark.separator : Colors.light.separator,
    iconBg: isDarkMode ? Colors.dark.iconBg : Colors.light.iconBg,
  };

  const webViewRef = useRef(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [webViewKey, setWebViewKey] = useState(0); 

  // 1. Load Cache
  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem('SAVED_NOTICES');
        if (cached) {
          setNotices(JSON.parse(cached));
          setLoading(false);
        }
      } catch (e) {
        console.error("Cache load error", e);
      }
    };
    loadCache();
  }, []);

  const scrapeJS = `
    (function() {
      function scrapeCurrentPage() {
        try {
          const data = [];
          const currentYear = new Date().getFullYear();
          const prevYear = (currentYear - 1).toString(); 
          let hitOldNotice = false;
          
          const rows = document.querySelectorAll('.tablepress tbody tr'); 
          
          for (let row of rows) {
            const titleCol = row.querySelector('.column-1');
            const linkCol = row.querySelector('.column-2 a');
            const dateCol = row.querySelector('.column-3');
            
            if (!titleCol || !linkCol || !dateCol) continue;

            const title = titleCol.innerText.trim();
            const url = linkCol.href;
            const date = dateCol.innerText.trim();
            
            // Stop parsing if we hit the previous year
            if (date && date.includes(prevYear)) {
              hitOldNotice = true;
              break; 
            }

            if (title && url) {
              data.push({
                id: title, // Using title as unique ID
                title: title,
                url: url,
                date: date || "New"
              });
            }
          }
          
          // Check if "Next" button exists and is NOT disabled
          const nextBtn = document.querySelector('.dt-paging-button.next');
          const isNextDisabled = nextBtn ? (nextBtn.classList.contains('disabled') || nextBtn.getAttribute('aria-disabled') === 'true') : true;
          const canFetchMore = !isNextDisabled && !hitOldNotice;

          // Send data and pagination status back to React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SCRAPE_RESULT',
            data: data,
            hasMore: canFetchMore
          }));
        } catch (err) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR' }));
        }
      }

      // Initial scrape (delay slightly to let DataTables render)
      setTimeout(scrapeCurrentPage, 800);

      // Listen for "Load More" commands from React Native
      document.addEventListener('message', function(event) {
        if (event.data === 'FETCH_NEXT') {
          const nextBtn = document.querySelector('.dt-paging-button.next');
          if (nextBtn) {
            nextBtn.click(); // Simulate user clicking next page
            setTimeout(scrapeCurrentPage, 800); // Wait for DataTables to swap the rows
          }
        }
      });
      
      // Fallback listener for iOS
      window.addEventListener('message', function(event) {
        if (event.data === 'FETCH_NEXT') {
          const nextBtn = document.querySelector('.dt-paging-button.next');
          if (nextBtn) {
            nextBtn.click();
            setTimeout(scrapeCurrentPage, 800);
          }
        }
      });
    })();
  `;

  // 3. Handle Data Streams from WebView
  const handleMessage = async (event) => {
    try {
      const parsedMessage = JSON.parse(event.nativeEvent.data);
      
      if (parsedMessage.type === 'SCRAPE_RESULT') {
        const newData = parsedMessage.data;
        const moreAvailable = parsedMessage.hasMore;

        setHasMore(moreAvailable);

        if (newData.length > 0) {
          setNotices(prevNotices => {
            // Filter out duplicates (in case of overlap or fast scrolling)
            const existingIds = new Set(prevNotices.map(n => n.id));
            const uniqueNewData = newData.filter(n => !existingIds.has(n.id));
            
            const combinedNotices = isRefreshing || prevNotices.length === 0 
              ? newData 
              : [...prevNotices, ...uniqueNewData];

            // Cache ONLY the top 20 to keep AsyncStorage light
            AsyncStorage.setItem('SAVED_NOTICES', JSON.stringify(combinedNotices.slice(0, 20)));
            
            if (uniqueNewData.length > 0 && !isFetchingMore) {
               LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            return combinedNotices;
          });
        }
      }
    } catch (e) {
      console.error("Scraper parsing error", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  };

  // 4. Trigger Next Page Scrape
  const handleLoadMore = () => {
    if (!hasMore || isFetchingMore || loading) return;
    
    setIsFetchingMore(true);
    // Send command to the injected JS to click the next button
    if (webViewRef.current) {
      webViewRef.current.postMessage('FETCH_NEXT');
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setHasMore(true);
    setWebViewKey(prev => prev + 1); // Remounts WebView for a fresh start
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* --- Header --- */}
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation?.goBack()} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="caret-back" size={27} color={theme.primary} importantForAccessibility="no" />
        </TouchableOpacity>
        
        <Text 
          style={[styles.headerTitle, { color: theme.text }]}
          accessibilityRole="header"
        >
          NOTICE BOARD
        </Text>
        <View style={{ width: 40 }} importantForAccessibility="no" /> 
      </View>

      {/* --- Hidden Scraper --- */}
      <View style={{ height: 0, width: 0, opacity: 0 }} importantForAccessibility="no-hide-descendants">
        <WebView
          ref={webViewRef}
          key={webViewKey}
          source={{ uri: 'https://arsdcollege.ac.in/announcement-2/' }}
          injectedJavaScript={scrapeJS}
          onMessage={handleMessage}
          javaScriptEnabled={true}
        />
      </View>

      {/* --- Main Content --- */}
      {loading && notices.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} accessibilityLabel="Loading notices" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Fetching latest notices...</Text>
        </View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item, index) => item.id + index} 
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={onRefresh} 
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="document-text-outline" size={60} color={theme.borderColor} importantForAccessibility="no" />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent notices found.</Text>
            </View>
          }
          ListFooterComponent={
            isFetchingMore ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.primary} accessibilityLabel="Loading older notices" />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.borderColor }]}
              onPress={() => Linking.openURL(item.url)}
              activeOpacity={0.7}
              accessibilityRole="link"
              accessibilityLabel={`Notice from ${item.date}: ${item.title}`}
              accessibilityHint="Double tap to view this notice in your browser"
            >
              <View style={styles.cardHeader} importantForAccessibility="no-hide-descendants">
                <View style={[styles.dateBadge, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="calendar-outline" size={12} color={theme.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.dateText, { color: theme.primary }]}>{item.date}</Text>
                </View>
              </View>
              
              <View style={styles.cardBody} importantForAccessibility="no-hide-descendants">
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={3}>
                  {item.title}
                </Text>
                <View style={[styles.downloadIcon, { backgroundColor: theme.iconBg }]}>
                  <Ionicons name="open-outline" size={18} color={theme.primary} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  listContainer: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  emptyText: { marginTop: 16, fontSize: 15, fontWeight: '500' },
  card: { padding: 16, borderRadius: 16, marginBottom: 14, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  dateText: { fontSize: 11, fontWeight: '800' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  downloadIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }
});