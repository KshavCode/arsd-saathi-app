import { ADS_PDF_URL } from '@/constants/links';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.78; // Show peek of next card
const ITEM_SPACING = (width - ITEM_WIDTH) / 2;

const handleSponsor = () => {
    Linking.openURL(ADS_PDF_URL);
};

export const compareDate = (dateStr) => {
  const today = new Date().toISOString().split('T')[0];
  if (dateStr < today) return false;
  return true;
};

const AdCard = React.memo(({ item, theme }) => {
    const isLastCard = !item.targetLink;

    return (
        <View style={[styles.adsCard, { width: ITEM_WIDTH }]}>
            <TouchableOpacity
                onPress={() => isLastCard ? handleSponsor() : Linking.openURL(item.targetLink)}
                activeOpacity={0.9}
                style={[styles.cardShadow, { backgroundColor: theme.card, borderColor: theme.primary }]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={isLastCard ? "Advertise with us" : `Advertisement by ${item.by}`}
                accessibilityHint={isLastCard ? "Opens details on how to sponsor" : "Opens the sponsor's external link"}
            >
                <Image 
                    style={styles.adsImage} 
                    source={{ uri: item.posterUrl }} 
                    resizeMode="cover"
                    importantForAccessibility="no"
                />
                <View style={styles.overlay} importantForAccessibility="no-hide-descendants">
                    { !isLastCard &&
                        <View style={[styles.badge, { backgroundColor:'rgba(0,0,0,0.6)' }]}>
                            <Text style={styles.badgeText}>{item.by}</Text>
                        </View>
                    }
                    {!isLastCard && (
                        <View style={styles.ctaIcon}>
                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
});
AdCard.displayName = 'AdCard';

export default function AdsScroll({ data }) {
    const { theme } = useTheme();
    const flatListRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    // 1. Filter out expired ads before passing to FlatList
    const activeAds = useMemo(() => {
        if (!data) return [];
        return data.filter(item => !item.endDate || compareDate(item.endDate));
    }, [data]);

    // 2. Track visible items for accurate pagination dots when manually scrolling
    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    // 3. Automatic Slideshow Logic
    useEffect(() => {
        if (activeAds.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => {
                const nextIndex = prevIndex + 1 >= activeAds.length ? 0 : prevIndex + 1;
                flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                return nextIndex;
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [activeAds.length]);

    const renderItem = useCallback(({ item }) => <AdCard item={item} theme={theme} />, [theme]);
    const keyExtractor = useCallback((item, index) => item.posterUrl || index.toString(), []);

    if (activeAds.length === 0) return null; // Hide completely if no active ads

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={[styles.sectionHeader, { color: theme.text }]} accessibilityRole="header">
                    Partners
                </Text>
                <TouchableOpacity 
                    onPress={handleSponsor}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Grow with us"
                    accessibilityHint="Opens sponsorship guidelines document"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={[styles.promoteLink, { color: theme.primary }]}>Grow with us</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={activeAds}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH + 14}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: ITEM_SPACING - 7 }}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onScrollToIndexFailed={() => {}}
                accessible={true}
                accessibilityRole="adjustable"
                accessibilityLabel="Advertisement Carousel"
            />
            
            {/* Pagination Dots */}
            {activeAds.length > 1 && (
                <View style={styles.pagination} importantForAccessibility="no-hide-descendants">
                    {activeAds.map((_, i) => (
                        <View 
                            key={i} 
                            style={[
                                styles.dot, 
                                { backgroundColor: i === currentIndex ? theme.primary : theme.secondary + '40' },
                                i === currentIndex && { width: 25 }
                            ]} 
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionHeader: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
    promoteLink: { fontSize: 12, fontWeight: '700' },
    adsCard: { marginHorizontal: 7, paddingBottom: 10 },
    cardShadow: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    adsImage: { width: '100%', height: 180, aspectRatio: 16 / 9 },
    overlay: { ...StyleSheet.absoluteFillObject, padding: 10, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    ctaIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    dot: { height: 6, width: 6, borderRadius: 3, marginHorizontal: 5 }
});