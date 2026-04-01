import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { titleCase } from 'title-case';

const FacultyCard = ({ data, theme, delay }) => {
    const facultyName = data.FAC_NAME || "Unknown Faculty";
    const paperName = data.PAPER_NAME || data.Subject || "N/A";
    const section = data["PAPER SECTION"] || data["Section"];

    const accessibilityString = `Faculty Name: ${facultyName}. Teaching Subject: ${paperName}. ${section ? `Section: ${section}.` : 'N/A'}`;

    return (
        <Animatable.View 
            style={[styles.facultyCard, { backgroundColor: theme.card, borderColor: theme.primary + '40' }]}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={accessibilityString}
            animation='fadeInLeft'
            delay={delay}
            duration={500}
            useNativeDriver={true}
        >
            {/* --- Header: Teacher Identity --- */}
            <View style={styles.cardHeader} importantForAccessibility="no-hide-descendants">
                <View style={styles.headerTextCtx}>
                    <Text style={[styles.teacherName, { color: theme.text }]}>
                        {titleCase(facultyName.toLowerCase())}
                    </Text>
                    <Text style={[styles.teacherCode, { color: theme.secondary }]}>
                        {data.FAC_CODE ? `Faculty Code: ${data.FAC_CODE}` : "No Code"}
                    </Text>
                </View>
            </View>
            
            <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />
            
            {/* Subject Details --- */}
            <View style={styles.cardBody} importantForAccessibility="no-hide-descendants">
                <Text style={[styles.label, { color: theme.secondary }]}>Teaching Subject</Text>
                <Text style={[styles.paperName, { color: theme.text }]}>
                    {paperName}
                </Text>

                <View style={styles.badgesRow}>
                    <View style={[styles.badge, { backgroundColor: theme.iconBg }]}>
                        <Ionicons name="document-text-outline" size={12} color={theme.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.badgeText, { color: theme.primary }]}>
                            {data["Paper Code"] || data.PAPER_ID || "No ID"}
                        </Text>
                    </View>
                    {section && (
                        <View style={[styles.badge, { backgroundColor: theme.iconBg }]}>
                            <Ionicons name="people-outline" size={12} color={theme.primary} style={{ marginRight: 4 }} />
                            <Text style={[styles.badgeText, { color: theme.primary }]}>
                                Sec: {section}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Animatable.View>
    );
};

export default function FacultyTab({ navigation }) {
    const {theme, isDarkMode, toggleTheme} = useTheme()
    const [facultyList, setFacultyList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const rawData = await AsyncStorage.getItem('FACULTY_DATA');
                if (rawData) {
                    const parsedData = JSON.parse(rawData);
                    setFacultyList(Array.isArray(parsedData) ? parsedData : [parsedData]);
                }
            } catch (error) {
                console.error("Error loading faculty data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />

            <View style={styles.headerRow} accessible={false}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => (navigation?.goBack ? navigation.goBack() : console.log('Back'))}
                    accessibilityRole="button"
                    accessibilityLabel="Go Back"
                    accessibilityHint="Returns to the previous screen"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="caret-back" size={24} color={theme.primary} importantForAccessibility="no" />
                </TouchableOpacity>
                
                <Text style={[styles.headerTitle, { color: theme.text }]} accessibilityRole="header" accessibilityLabel='Faculty Details'>FACULTY DETAILS</Text>
                
                <TouchableOpacity 
                    style={[styles.themeButton, { backgroundColor: theme.card }]} 
                    onPress={toggleTheme}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle Theme"
                    accessibilityHint={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                        <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color={isDarkMode ? "#FBBF24" : theme.primary} importantForAccessibility="no" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} accessibilityLabel="Loading faculty data" />
            ) : facultyList.length === 0 ? (
                 <View style={styles.centerContainer} accessible={true}>
                    <Ionicons name="people-outline" size={48} color={theme.secondary} style={{ marginBottom: 10, opacity: 0.5 }} importantForAccessibility="no" />
                    <Text style={{ color: theme.secondary }}>No faculty details found.</Text>
                </View>
            ) : (
                <FlatList 
                    data={facultyList}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ index, item }) => <FacultyCard data={item} theme={theme} delay={index*150}/>}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
    themeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 50 },
    
    // --- Faculty Card Styles ---
    facultyCard: {
        borderWidth: 1,
        borderRadius: 16,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        overflow: 'hidden'
    },
    
    // Header
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    headerTextCtx: {
        flex: 1,
    },
    teacherName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    teacherCode: {
        fontSize: 12,
        fontWeight: '500',
    },
    
    divider: {
        height: 1,
        width: '100%',
    },

    // Body
    cardBody: {
        padding: 16,
        paddingTop: 14,
    },
    label: {
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
        fontWeight: '700',
        opacity: 0.8
    },
    paperName: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 22,
        marginBottom: 14,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
    },

    // Footer
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    emailText: {
        fontSize: 13,
        marginLeft: 8,
        fontWeight: '500',
    }
});