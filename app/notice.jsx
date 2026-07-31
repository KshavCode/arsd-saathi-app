import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/components/Header';
import OfflineBanner from '@/components/NoInternet';
import { NOTICES_URL } from '@/constants/links';
import { useTheme } from '@/hooks/useTheme';

const TIMEOUT_MS = 10000;

// Notice Card Component
const NoticeCard = React.memo(({ item, theme, delay }) => (
  <Animatable.View animation='zoomIn' duration={500} delay={delay} useNativeDriver>
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.primary }]}
      onPress={() => Linking.openURL(item.url)}
      activeOpacity={0.7}
      accessibilityRole="link"
      accessibilityLabel={`Notice from ${item.date.replace(/\n/g, ' ')}: ${item.title}`}
      accessibilityHint="Double tap to view this notice in your browser"
    >
      <View style={styles.cardHeader} importantForAccessibility="no-hide-descendants">
        <View style={[styles.dateBadge, { backgroundColor: theme.primary + '15' }]}>
          <Ionicons name="calendar-outline" size={12} color={theme.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.dateText, { color: theme.primary }]}>{item.date.replace(/\n/g, ' ')}</Text>
        </View>
      </View>
      <View style={styles.cardBody} importantForAccessibility="no-hide-descendants">
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.downloadIcon, { backgroundColor: theme.iconBg }]}><Ionicons name="open-outline" size={18} color={theme.primary} /></View>
      </View>
    </TouchableOpacity>
  </Animatable.View>
));
NoticeCard.displayName = 'NoticeCard';

export default function Notices({ navigation }) {
  const { theme } = useTheme();
  const webViewRef = useRef(null);
  const timeoutRef = useRef(null); // Ref to hold timer instance

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [webViewKey, setWebViewKey] = useState(0); 

  // Helper to clear running timeout
  const clearSafetyTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Helper to reset all loading spinners gracefully
  const stopAllLoading = useCallback(() => {
    clearSafetyTimeout();
    setLoading(false);
    setIsRefreshing(false);
    setIsFetchingMore(false);
  }, [clearSafetyTimeout]);

  // Helper to start timeout whenever a web fetch request begins
  const startSafetyTimeout = useCallback(() => {
    clearSafetyTimeout();
    timeoutRef.current = setTimeout(() => {
      console.warn("Notice scraping timed out.");
      stopAllLoading();
    }, TIMEOUT_MS);
  }, [clearSafetyTimeout, stopAllLoading]);

  // Load cached notices on mount
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
    startSafetyTimeout(); // Start initial timeout on screen mount

    return () => clearSafetyTimeout(); // Cleanup on unmount
  }, [clearSafetyTimeout, startSafetyTimeout]);

  // Web Scraper injected script
  const scrapeJS = `
    (function() {
      function scrapeCurrentPage() {
        try {
          const data = [];
          const prevYear = (new Date().getFullYear() - 1).toString(); 
          let hitOldNotice = false;
          
          // Select all notice card anchors directly
          const rows = document.querySelectorAll('a.notice-card'); 
          
          for (let row of rows) {
            const titleTag = row.querySelector('.notice-title');
            const dateBadge = row.querySelector('.date-block');
            
            if (!titleTag || !dateBadge) continue;
  
            const title = titleTag.innerText.trim();
            const url = row.href; // row is the <a> element
            const date = dateBadge.innerText.trim();
            
            if (date && date.includes(prevYear)) { 
              hitOldNotice = true; 
              break; 
            }
            
            if (title && url) {
              data.push({ id: title, title: title, url: url, date: date || "New" });
            }
          }
          
          const nextBtn = document.querySelector('.dt-paging-button.next');
          const isNextDisabled = nextBtn ? (nextBtn.classList.contains('disabled') || nextBtn.getAttribute('aria-disabled') === 'true') : true;
          
          window.ReactNativeWebView.postMessage(JSON.stringify({ 
            type: 'SCRAPE_RESULT', 
            data: data, 
            hasMore: !isNextDisabled && !hitOldNotice 
          }));
        } catch (err) { 
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: err.message })); 
        }
      }
  
      setTimeout(scrapeCurrentPage, 800);
      
      const handleFetchNext = function(event) { 
        if (event.data === 'FETCH_NEXT') { 
          const nextBtn = document.querySelector('.dt-paging-button.next'); 
          if (nextBtn) { 
            nextBtn.click(); 
            setTimeout(scrapeCurrentPage, 800); 
          } 
        } 
      };
      
      document.addEventListener('message', handleFetchNext);
      window.addEventListener('message', handleFetchNext);
    })();
  `;

  const handleMessage = async (event) => {
    try {
      const parsedMessage = JSON.parse(event.nativeEvent.data);
      if (parsedMessage.type === 'SCRAPE_RESULT') {
        const newData = parsedMessage.data;
        setHasMore(parsedMessage.hasMore);

        if (newData.length > 0) {
          setNotices(prevNotices => {
            const existingIds = new Set(prevNotices.map(n => n.id));
            const uniqueNewData = newData.filter(n => !existingIds.has(n.id));
            const combinedNotices = isRefreshing || prevNotices.length === 0 ? newData : [...prevNotices, ...uniqueNewData];
            AsyncStorage.setItem('SAVED_NOTICES', JSON.stringify(combinedNotices.slice(0, 10)));
            return combinedNotices;
          });
        }
      }
    } catch (e) { 
      console.error("Scraper parsing error", e); 
    } finally { 
      stopAllLoading(); // Always clear timeout and spinners when message arrives
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isFetchingMore || loading) return;
    setIsFetchingMore(true);
    startSafetyTimeout();
    if (webViewRef.current) webViewRef.current.postMessage('FETCH_NEXT');
  }, [hasMore, isFetchingMore, loading, startSafetyTimeout]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setHasMore(true);
    startSafetyTimeout();
    setWebViewKey(prev => prev + 1); 
  }, [startSafetyTimeout]);

  const renderItem = useCallback(({ index, item }) => <NoticeCard item={item} theme={theme} delay={index * 100} />, [theme]);
  const keyExtractor = useCallback((item, index) => item.id + index, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingMore) {
      return (
        <TouchableOpacity onPress={() => Linking.openURL(NOTICES_URL)} accessibilityRole="link" accessibilityLabel="See more notices on the official website" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 20 }}>
          <Text style={{ color: theme.footer, fontWeight: 'bold', fontSize: 15 }} importantForAccessibility="no">...see more on the website</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }} accessible={true} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" accessibilityLabel="Loading older notices">
        <ActivityIndicator size="small" color={theme.primary} importantForAccessibility="no" />
      </View>
    );
  }, [isFetchingMore, theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header navigation={navigation} screenName='NOTICE BOARD' />
      
      {/* Hidden Webview for scraping */}
      <View style={{ height: 0, width: 0, opacity: 0 }} importantForAccessibility="no-hide-descendants">
        <WebView 
          ref={webViewRef} 
          key={webViewKey} 
          source={{ uri: NOTICES_URL }} 
          injectedJavaScript={scrapeJS} 
          onMessage={handleMessage} 
          javaScriptEnabled={true} 
          onError={() => stopAllLoading()} 
          onHttpError={() => stopAllLoading()}
        />
      </View>

      {loading && notices.length === 0 ? (
        <View style={styles.centerContainer} accessible={true} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" accessibilityLabel="Fetching latest notices">
          <ActivityIndicator size="large" color={theme.primary} importantForAccessibility="no" />
          <Text style={[styles.loadingText, { color: theme.secondary }]} importantForAccessibility="no">Fetching latest notices...</Text>
        </View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={keyExtractor} 
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={11} 
          removeClippedSubviews={Platform.OS === 'android'} 
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
          ListEmptyComponent={
            <View style={styles.centerContainer} accessible={true} accessibilityRole="alert" accessibilityLabel="No recent notices found. Try checking the website.">
              <Ionicons name="document-text-outline" size={60} color={theme.primary} importantForAccessibility="no" />
              <Text style={[styles.emptyText, { color: theme.secondary }]} importantForAccessibility="no">No recent notices found. Try checking the website?</Text>
            </View>
          }
          ListFooterComponent={renderFooter}
          renderItem={renderItem}
        />
      )}
      <OfflineBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  listContainer: { padding: 10 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  emptyText: { marginTop: 16, fontSize: 15, fontWeight: '500' },
  card: { padding: 16, borderRadius: 16, marginBottom: 14, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  dateText: { fontSize: 11, fontWeight: '800' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  downloadIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  themeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3 },
});