import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';


const DetailRow = ({ label, value, icon, theme, isLast, delay }) => (
    <Animatable.View
      style={[styles.detailRow, !isLast && { borderBottomColor: theme.background, borderBottomWidth: 1 }]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value || "Not available"}`}
      animation="zoomIn"
      duration={500}
      delay={delay}
      useNativeDriver
    >
        <View style={[styles.iconBox, { backgroundColor: theme.background + '70' }]} importantForAccessibility="no-hide-descendants">
            <Ionicons name={icon} size={20} color={theme.primary} />
        </View>
        <View style={styles.detailTextContainer} importantForAccessibility="no-hide-descendants">
            <Text style={[styles.detailLabel, { color: theme.secondary }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{value || "N/A"}</Text>
        </View>
    </Animatable.View>
);

export default function DetailsTab({ navigation }) {
    const {theme, themeName, setThemeName} = useTheme()

    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const basicRaw = await AsyncStorage.getItem('BASIC_DETAILS');

                // fetch credentials in case of error
                const credsRaw = await AsyncStorage.getItem('USER_CREDENTIALS');

                let combinedData = {};

                if (basicRaw) {
                    combinedData = JSON.parse(basicRaw);
                }

                // Merge
                if (credsRaw) {
                    const creds = JSON.parse(credsRaw);
                    combinedData.name = combinedData.name || creds.name;
                    combinedData.rollNo = combinedData.rollNo || creds.rollNo;
                }

                setProfileData(combinedData);
            } catch (error) {
                console.error("Error loading Profile data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

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

                <Text style={[styles.headerTitle, { color: theme.text }]} accessibilityRole="header">PERSONAL DETAILS</Text>
            </View>

            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} accessibilityLabel="Loading personal details" />
                ) : (
                    <View style={[styles.cardContainer, { backgroundColor: theme.card, borderColor: theme.background }]}>
                        {profileData ? displayFields.map((field, index) => (
                            <DetailRow
                                key={field.key}
                                label={field.label}
                                value={profileData[field.key]}
                                icon={field.icon}
                                theme={theme}
                                isLast={index === displayFields.length - 1}
                                delay = {index*50}
                            />
                        )) : (
                            <View style={{ padding: 40, alignItems: 'center' }} accessible={true} accessibilityLabel="Warning: No details found.">
                                <Ionicons name="alert-circle-outline" size={40} color={theme.secondary} importantForAccessibility="no" />
                                <Text style={{ color: theme.secondary, marginTop: 10 }} importantForAccessibility="no">No details found.</Text>
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
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
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