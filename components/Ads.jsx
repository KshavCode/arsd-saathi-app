import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.78; // Show peek of next card
const ITEM_SPACING = (width - ITEM_WIDTH) / 2;

const handleSponsor = () => {
    const email = "arsdsaathi.help@gmail.com";
    const subject = encodeURIComponent("Partnership Inquiry: ArsdSaathi Campus Advertising");
    const body = encodeURIComponent(`Hello ArsdSaathi Team,\n\nI am interested in advertising my business on your platform. Here are my details:\n\nBusiness Name: [Enter Name]\nType of Business: [e.g., Cafe, PG, Society]\nPreferred Duration: [1 Week / 1 Month]\n\nRegards,\n[Your Name]\n[Designation]`);
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

const AdCard = ({ item, theme, index }) => {
    const isLastCard = !item.targetLink;

    return (
        <View 
            style={[styles.adsCard, { width: ITEM_WIDTH }]}
        >
            <TouchableOpacity
                onPress={() => isLastCard ? handleSponsor() : Linking.openURL(item.targetLink)}
                activeOpacity={0.9}
                style={[styles.cardShadow, { backgroundColor: theme.card, borderColor: theme.primary }]}
            >
                <Image 
                    style={styles.adsImage} 
                    source={{ uri: item.posterUrl }} 
                    resizeMode="cover"
                />
                
                <View style={styles.overlay}>
                    <View style={[styles.badge, { backgroundColor: isLastCard ? theme.primary : 'rgba(0,0,0,0.6)' }]}>
                        <Text style={styles.badgeText}>{isLastCard ? 'YOUR AD HERE' : item.by}</Text>
                    </View>
                    
                    {!isLastCard && (
                        <View style={styles.ctaIcon}>
                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default function AdsScroll({ data }) {
    const { theme } = useTheme();
    const flatListRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    // --- AUTOMATIC SLIDESHOW LOGIC ---
    useEffect(() => {
        if (!data || data.length <= 1) return;

        const interval = setInterval(() => {
            let nextIndex = currentIndex + 1;
            if (nextIndex >= data.length) nextIndex = 0;
            
            setCurrentIndex(nextIndex);
            flatListRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true,
            });
        }, 4000); // Change slide every 4 seconds

        return () => clearInterval(interval);
    }, [currentIndex, data]);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={[styles.sectionHeader, { color: theme.text }]}>Partners</Text>
                <TouchableOpacity onPress={handleSponsor}>
                    <Text style={[styles.promoteLink, { color: theme.primary }]}>Grow with us</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={data}
                renderItem={({ item, index }) => <AdCard item={item} theme={theme} index={index} />}
                keyExtractor={item => item.posterUrl}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH + 20} // Width + Margin
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: ITEM_SPACING - 10 }}
                onScrollToIndexFailed={() => {}} // Safety for auto-scroll
            />
            
            {/* Pagination Dots */}
            <View style={styles.pagination}>
                {data.map((_, i) => (
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionHeader: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
    promoteLink: { fontSize: 12, fontWeight: '700' },
    adsCard: { marginHorizontal: 7, paddingBottom: 10 },
    cardShadow: {borderRadius: 10,overflow: 'hidden',borderWidth: 1,elevation: 5,shadowColor: '#000',shadowOffset: { width: 0, height: 4 },shadowOpacity: 0.1,shadowRadius: 8},
    adsImage: { width: '100%', height: 180, aspectRatio: 16 / 9},
    overlay: { ...StyleSheet.absoluteFillObject, padding: 10, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start' },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    ctaIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center'},
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    dot: { height: 6, width: 6, borderRadius: 3, marginHorizontal: 5 }
});