import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/themeStyle';


// Helper component for a single row of detail
const DetailRow = ({ label, value, icon, theme, isLast }) => (
    <View style={[styles.detailRow, !isLast && { borderBottomColor: theme.borderColor, borderBottomWidth: 1 }]}>
        <View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
            <Ionicons name={icon} size={20} color={theme.primary} />
        </View>
        <View style={styles.detailTextContainer}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{value || "N/A"}</Text>
        </View>
    </View>
);

export default function DetailsTab({ navigation, isDarkMode, setIsDarkMode }) {
    
    const theme = {
        background: isDarkMode ? Colors.dark.background : Colors.light.background,
        card: isDarkMode ? Colors.dark.card : Colors.light.card, // Fixed to use constants if available
        text: isDarkMode ? Colors.dark.text : Colors.light.text,
        textSecondary: isDarkMode ? Colors.dark.secondary : Colors.light.secondary,
        primary: isDarkMode ? Colors.dark.primary : Colors.light.primary,
        iconBg: isDarkMode ? '#252F45' : '#F0F4FF',
        borderColor: isDarkMode ? '#2E3A52' : '#F1F5F9',
    };

    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch the BASIC_DETAILS key saved by the Scraper
                const basicRaw = await AsyncStorage.getItem('BASIC_DETAILS');
                
                // Also fetch CREDENTIALS as a fallback for name/rollNo if basic is missing
                const credsRaw = await AsyncStorage.getItem('USER_CREDENTIALS');
                
                let combinedData = {};

                if (basicRaw) {
                    combinedData = JSON.parse(basicRaw);
                }
                
                // Merge/Fallback logic
                if (credsRaw) {
                    const creds = JSON.parse(credsRaw);
                    combinedData.name = combinedData.name || creds.name;
                    combinedData.rollNo = combinedData.rollNo || creds.rollNo;
                }

                setProfileData(combinedData);
            } catch (error) {
                console.error("Error loading Profile data:", error);
            } finally {
                // 🔴 CRITICAL FIX: Stop loading whether success or fail
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Keys matching your scraper's output
    const displayFields = [
        { key: 'name', label: 'Student Name', icon: 'person' },
        { key: 'rollNo', label: 'College Roll No.', icon: 'id-card' },
        { key: 'enrollmentNumber', label: 'Enrollment No.', icon: 'document-text' },
        { key: 'course', label: 'Course', icon: 'school' },
        { key: 'year', label: 'Current Year', icon: 'calendar' },
        { key: 'fatherName', label: "Father's Name", icon: 'people' },
        { key: 'email', label: 'Email Address', icon: 'mail' },
        { key: 'mobile', label: 'Mobile Number', icon: 'call' },
        { key: 'address', label: 'Permanent Address', icon: 'location' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />

            <View style={styles.headerRow}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => (navigation?.goBack ? navigation.goBack() : console.log('Back'))}>
                    <Ionicons name="caret-back" size={24} color={theme.text} />
                </TouchableOpacity>
                
                <Text style={[styles.headerTitle, { color: theme.text }]}>PERSONAL DETAILS</Text>
                
                <TouchableOpacity 
                    style={[styles.themeButton, { backgroundColor: theme.card }]} 
                    onPress={() => setIsDarkMode(!isDarkMode)}
                >
                     <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color={isDarkMode ? "#FBBF24" : theme.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
                ) : (
                    <View style={[styles.cardContainer, { backgroundColor: theme.card, borderColor: theme.borderColor }]}>
                        {profileData ? displayFields.map((field, index) => (
                            <DetailRow 
                                key={field.key}
                                label={field.label}
                                value={profileData[field.key]}
                                icon={field.icon}
                                theme={theme}
                                isLast={index === displayFields.length - 1}
                            />
                        )) : (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Ionicons name="alert-circle-outline" size={40} color={theme.textSecondary} />
                                <Text style={{ color: theme.textSecondary, marginTop: 10 }}>No details found.</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
    themeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    cardContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    detailTextContainer: { flex: 1 },
    detailLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.8 },
    detailValue: { fontSize: 15, fontWeight: '500', flexWrap: 'wrap' }
});