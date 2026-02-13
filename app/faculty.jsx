import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 👈 Added AsyncStorage
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/themeStyle';


// Component for a Single Faculty Member Card
const FacultyCard = ({ data, theme }) => (
    <View style={[styles.facultyCard, { backgroundColor: theme.card, borderColor: theme.borderColor }]}>
        
        {/* --- Header: Teacher Identity --- */}
        <View style={styles.cardHeader}>
            <View style={styles.headerTextCtx}>
                <Text style={[styles.teacherName, { color: theme.text }]}>
                    {data["Faculty Name"] || data.FAC_NAME || "Unknown Faculty"}
                </Text>
                <Text style={[styles.teacherCode, { color: theme.textSecondary }]}>
                    {data.FAC_CODE ? `Faculty Code: ${data.FAC_CODE}` : "No Code"}
                </Text>
            </View>
        </View>
        
        <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />
        
        {/* --- Body: Subject Details --- */}
        <View style={styles.cardBody}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Teaching Subject</Text>
            <Text style={[styles.paperName, { color: theme.text }]}>
                {data["Paper Name"] || data.PAPER_NAME || data.Subject || "N/A"}
            </Text>

            <View style={styles.badgesRow}>
                {/* Paper ID Badge */}
                <View style={[styles.badge, { backgroundColor: theme.iconBg }]}>
                    <Ionicons name="document-text-outline" size={12} color={theme.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: theme.primary }]}>
                        {data["Paper Code"] || data.PAPER_ID || "No ID"}
                    </Text>
                </View>

                {/* Section Badge */}
                {(data["PAPER SECTION"] || data["Section"]) && (
                    <View style={[styles.badge, { backgroundColor: theme.iconBg }]}>
                        <Ionicons name="people-outline" size={12} color={theme.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.badgeText, { color: theme.primary }]}>
                            Sec: {data["PAPER SECTION"] || data["Section"]}
                        </Text>
                    </View>
                )}
            </View>
        </View>

        {/* --- Footer: Contact (Optional) --- */}
        {data.Email && (
            <View style={[styles.cardFooter, { borderTopColor: theme.borderColor }]}>
                <Ionicons name="mail-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.emailText, { color: theme.textSecondary }]}>
                    {data.Email}
                </Text>
            </View>
        )}
    </View>
);

export default function FacultyTab({ navigation, isDarkMode, setIsDarkMode }) {
    
    const theme = {
        background: isDarkMode ? Colors.dark.background : Colors.light.background,
        card: isDarkMode ? '#1A2235' : '#FFFFFF',
        text: isDarkMode ? Colors.dark.text : Colors.light.text,
        textSecondary: isDarkMode ? Colors.dark.secondary : Colors.light.secondary,
        primary: isDarkMode ? Colors.dark.primary : Colors.light.primary,
        iconBg: isDarkMode ? '#252F45' : '#F0F4FF',
        borderColor: isDarkMode ? '#2E3A52' : '#E2E8F0',
    };

    const [facultyList, setFacultyList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const rawData = await AsyncStorage.getItem('FACULTY_DATA');
                if (rawData) {
                    const parsedData = JSON.parse(rawData);
                    // Ensure it is always an array for FlatList
                    setFacultyList(Array.isArray(parsedData) ? parsedData : [parsedData]);
                }
            } catch (error) {
                console.error("Error loading faculty data:", error);
            } finally {
                // 🔴 Ensures the loading spinner always stops
                setLoading(false);
            }
        };
        loadData();
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />

            <View style={styles.headerRow}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => (navigation?.goBack ? navigation.goBack() : console.log('Back'))}>
                    <Ionicons name="caret-back" size={24} color={theme.text} />
                </TouchableOpacity>
                
                <Text style={[styles.headerTitle, { color: theme.text }]}>FACULTY DETAILS</Text>
                
                <TouchableOpacity 
                    style={[styles.themeButton, { backgroundColor: theme.card }]} 
                    onPress={() => setIsDarkMode(!isDarkMode)}
                >
                        <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color={isDarkMode ? "#FBBF24" : theme.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
            ) : facultyList.length === 0 ? (
                 <View style={styles.centerContainer}>
                    <Ionicons name="people-outline" size={48} color={theme.textSecondary} style={{ marginBottom: 10, opacity: 0.5 }} />
                    <Text style={{ color: theme.textSecondary }}>No faculty details found.</Text>
                </View>
            ) : (
                <FlatList 
                    data={facultyList}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => <FacultyCard data={item} theme={theme} />}
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
    themeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 50 },
    
    // --- Faculty Card Styles ---
    facultyCard: {
        borderWidth: 1,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
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