import Header from '@/components/Header';
import { UPDATES_DATA } from '@/constants/changelog';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';


const UpdateItem = ({ item, theme, delay }) => (
    <Animatable.View 
        animation="fadeInUp" 
        duration={600} 
        delay={delay} 
        useNativeDriver
        style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.borderColor }]}
    >
        <View style={styles.textContainer}>
            <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
            <Text style={[styles.itemDesc, { color: theme.secondary }]}>{item.desc}</Text>
        </View>
    </Animatable.View>
);

export default function WhatsNewTab({ navigation }) {
    const { theme } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Header screenName={"WHAT'S NEW?"} navigation={navigation} />
            
            <ScrollView 
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, paddingTop: 10 }} 
                showsVerticalScrollIndicator={false}
            >
                {/* --- HEADER BADGE --- */}
                <View style={styles.versionHeader}>
                    <View style={styles.versionTextContainer}>
                        <Text style={[styles.versionTitle, { color: theme.text }]}>Version {UPDATES_DATA.version}</Text>
                        <Text style={[styles.versionDate, { color: theme.secondary }]}>{UPDATES_DATA.date}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.badgeText, { color: theme.primary }]}>LATEST</Text>
                    </View>
                </View>

                {/* --- FEATURES SECTION --- */}
                <Animatable.View animation="fadeIn" delay={200} useNativeDriver style={styles.sectionHeader}>
                    <Ionicons name="sparkles" size={20} color="#FBBF24" style={{ marginRight: 8 }}/>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>New Features</Text>
                </Animatable.View>

                <View style={styles.listContainer}>
                    {UPDATES_DATA.updates.map((update, index) => (
                        <UpdateItem 
                            key={`update-${index}`} 
                            item={update} 
                            theme={theme} 
                            delay={300 + (index * 100)}
                        />
                    ))}
                </View>

                {/* --- FIXES SECTION --- */}
                <Animatable.View animation="fadeIn" delay={800} useNativeDriver style={[styles.sectionHeader, { marginTop: 20 }]}>
                    <Ionicons name="bug" size={20} color={theme.error} style={{ marginRight: 8 }}/>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Fixes</Text>
                </Animatable.View>

                <View style={styles.listContainer}>
                    {UPDATES_DATA.fixes.map((fix, index) => (
                        <UpdateItem 
                            key={`fix-${index}`} 
                            item={fix} 
                            theme={theme} 
                            isFix={true}
                            delay={900 + (index * 100)} 
                        />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    
    versionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 8,
    },
    versionTextContainer: {
        flexDirection: 'column',
    },
    versionTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    versionDate: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 8,
    },
    sectionTitle: { 
        fontSize: 18, 
        fontWeight: '800', 
        letterSpacing: 0.5
    },

    listContainer: {
        gap: 12, 
    },
    itemCard: {
        flexDirection: 'row',
        padding: 15,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'flex-start', 
        elevation: 1,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    itemDesc: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '500',
    }
});