import { FEE_STRUCTURE_URL, FEES_PORTAL_URL, HANDBOOK_URL, KESHAV_URL, PRIVACY_URL, SHIVAM_URL, SOCIETIES_URL, STUDENT_PORTAL_URL, TERMS_URL } from '@/constants/links';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/themeStyle';
import ArsdScraper from '../services/ArsdScraper';

const handleFeedback = () => {
  const email = "arsdsaathi.help@gmail.com"; 
  const subject = `ArsdSaathi Feedback`;
  const body = "Name: \nRoll Number: \nDOB (optional, for testing): \n\nIssue/Feedback: ";
  Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};


// --- Sub-Components ---

// New Square Grid Button
const GridActionButton = ({ title, icon, onPress, theme, isDestructive }) => (
  <TouchableOpacity 
    style={[
      styles.gridActionCard, 
      { backgroundColor: theme.card },
      isDestructive && { backgroundColor: theme.destructiveBg, borderWidth: 1, borderColor: theme.destructiveBorder }
    ]} 
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[styles.gridActionIconCtx, { backgroundColor: isDestructive ? 'transparent' : theme.iconBg }]}>
      <Ionicons name={icon} color={isDestructive ? theme.error : theme.primary} size={24} />
    </View>
    <Text style={[styles.gridActionText, { color: isDestructive ? theme.error : theme.text }]}>{title}</Text>
  </TouchableOpacity>
);

// --- Main Screen ---

export default function HomeTab({ route, navigation, setIsDarkMode, isDarkMode }) {
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

  const [userData, setUserData] = useState({ name: "Loading...", rollNo: "...", enrollmentNumber: "..." });
  const [savedCredentials, setSavedCredentials] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState("Never");

  // Modal States
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ version: '', url: '' });

  // --- AUTOMATIC UPDATE CHECK ---
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        console.log("Update Check")
      } catch (error) {
        console.log("Auto-update check failed:", error); 
      }
    };
    checkForUpdates();
  }, []); 

  // --- SAFE DATE FORMATTER ---
  const formatTimestamp = (ts) => {
      if (!ts) return "Never";
      const d = new Date(parseInt(ts));
      const hrs = d.getHours();
      const mins = d.getMinutes().toString().padStart(2, '0');
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      const hr12 = hrs % 12 || 12;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[d.getMonth()]} ${d.getDate()}, ${hr12}:${mins} ${ampm}`;
  };

  // --- DATA LOADING & MIGRATION ---
  const loadData = useCallback(async () => {
      try {
        const basicRaw = await AsyncStorage.getItem('BASIC_DETAILS');
        const credsRaw = await AsyncStorage.getItem('USER_CREDENTIALS');
        const attRaw = await AsyncStorage.getItem('ATTENDANCE_DATA');
        const mentorRaw = await AsyncStorage.getItem('MENTOR_DATA');
        const timestampRaw = await AsyncStorage.getItem('DATA_TIMESTAMP');

        const basic = basicRaw ? JSON.parse(basicRaw) : null;
        const creds = credsRaw ? JSON.parse(credsRaw) : null;
        const att = attRaw ? JSON.parse(attRaw) : null;
        const mentor = mentorRaw ? JSON.parse(mentorRaw) : null;

        if (timestampRaw) {
            setLastSynced(formatTimestamp(timestampRaw));
        }

        if (creds) setSavedCredentials(creds); 

        if (basic || creds) {
          setUserData({ 
            name: basic?.name || creds?.name || "Student", 
            rollNo: basic?.rollNo || creds?.rollNo || "N/A",
            enrollmentNumber: basic?.enrollmentNumber || "N/A",
            percent_attendance: att?.theory_percentage || 0,
            mentor_name: mentor?.mentor || "N/A"
          });
        }
      } catch (error) {
        console.error("Error loading Dashboard data:", error);
      }
  }, []);

  const validateDataStructure = useCallback(async () => {
    try {
        const attRaw = await AsyncStorage.getItem('ATTENDANCE_DATA');
        if (attRaw) {
            const data = JSON.parse(attRaw);
            if (data && !data.theory) {
                await AsyncStorage.multiRemove([
                    'USER_CREDENTIALS', 'BASIC_DETAILS', 'ATTENDANCE_DATA', 
                    'FACULTY_DATA', 'MENTOR_DATA', 'DATA_TIMESTAMP'
                ]);

                Alert.alert(
                    "App Updated 🚀",
                    "We've upgraded how attendance is tracked (Theory vs Practical). Please log in again to sync your new data.",
                    [{ text: "OK", onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }]
                );
            }
        }
    } catch (e) {
        console.error("Migration check failed", e);
    }
  }, [navigation]);

  useEffect(() => {
    const initialize = async () => {
        await validateDataStructure(); 
        await loadData();             
    };
    initialize();
  }, [validateDataStructure, loadData]);

  const requiresSync = route.params?.requiresSync;
  useEffect(() => {
    if (requiresSync) setIsSyncing(true);
  }, [requiresSync]);

  const handleSyncCompletion = async (status) => {
      if (status === 'DONE') {
          await AsyncStorage.setItem('DATA_TIMESTAMP', Date.now().toString());
          await loadData();
          setIsSyncing(false);
          navigation.setParams({ requiresSync: false });
      }
  };

  const handleSyncError = (errorMsg) => {
      setIsSyncing(false);
      console.warn("Background sync failed:", errorMsg); 
  };

  const handleLogout = async () => {
      await AsyncStorage.multiRemove(['USER_CREDENTIALS', 'BASIC_DETAILS', 'ATTENDANCE_DATA', 'FACULTY_DATA', 'MENTOR_DATA', 'LOGIN_TIMESTAMP', 'DATA_TIMESTAMP']);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  const handleTheme = async () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode); 
    await AsyncStorage.setItem('DARK_THEME', JSON.stringify(nextMode));
  };

  const handleShare = async () => {
    try {
      const response = await fetch('https://api.github.com/repos/KshavCode/arsd-saathi-app/releases/latest');
      if (!response.ok) return; 
      const data = await response.json();
      const downloadUrl = data.assets?.[0]?.browser_download_url || data.html_url;
      await Share.share({ message: `Check out the ArsdSaathi App: ${downloadUrl}`, url: downloadUrl, title: 'ArsdSaathi App Link' });
    } catch (error) {
      alert(error.message);
    }
  };

  const isAttendanceLow = Number(userData.percent_attendance) < 67;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      {/* Background Scraper Component */}
      {isSyncing && savedCredentials && (
          <ArsdScraper credentials={savedCredentials} onProgress={(msg) => console.log("Background Sync:", msg)} onFinish={handleSyncCompletion} onError={handleSyncError} />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={{flex: 1}}>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>Welcome back,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={()=>navigation.navigate("Details")} style={{flexDirection: 'row', gap:5, justifyContent:'center', alignItems:'center'}}>
                <Text style={[styles.username, { color: theme.primary }]} numberOfLines={1}>{userData.name}</Text>
                <Ionicons name="information-circle" size={15} color={theme.secondary} />
              </TouchableOpacity>
                {isSyncing && <ActivityIndicator size="small" color={theme.primary} />}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
               <Ionicons name="time-outline" size={12} color={theme.secondary} />
               <Text style={{ fontSize: 12, color: theme.secondary, fontWeight: '500' }}>Last synced: {lastSynced}</Text>
            </View>
          </View>
          
          <View style={styles.topIconContainer}>
            <TouchableOpacity style={[styles.themeButton, { backgroundColor: theme.card }]} onPress={handleShare}>
               <Ionicons name='share-social' size={20} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.themeButton, { backgroundColor: theme.card }]} onPress={handleTheme}>
               <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color={isDarkMode ? "#FBBF24" : theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Dashboard Container (Stacked Layout) */}
        <View style={[styles.heroContainer, { backgroundColor: theme.card, borderColor: theme.borderColor }]}>
            
            {/* Top Row: Attendance */}
            <View style={styles.heroMainRow}>
                <View style={[styles.heroIconBox, { backgroundColor: isAttendanceLow ? theme.error : "#10B981" }]}>
                    <Ionicons name="pie-chart" size={24} color="#FFF" />
                </View>
                <View style={styles.heroTextContent}>
                    <Text style={[styles.heroValue, { color: theme.text }]}>{userData.percent_attendance}%</Text>
                    <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>Theory Attendance</Text>
                </View>
                {isAttendanceLow && <Ionicons name="alert-circle" size={28} color={theme.error} />}
            </View>

            {isAttendanceLow && (
                <Text style={[styles.warningText, { color: theme.error }]}>* Attendance is below the 67% university requirement.</Text>
            )}

            <View style={[styles.heroDivider, { backgroundColor: theme.separator }]} />

            {/* Bottom Row: Mentor (Full Width) */}
            <View style={styles.mentorRow}>
                 <Ionicons name="person-outline" size={18} color={theme.primary} />
                 <View style={{marginLeft: 12, flex: 1}}>
                     <Text style={[styles.mentorLabel, { color: theme.textSecondary }]}>Assigned Mentor</Text>
                     <Text style={[styles.mentorName, { color: theme.text }]} numberOfLines={2}>{userData.mentor_name}</Text>
                 </View>
            </View>
        </View>

        {/* Grid Navigation */}
        <Text style={[styles.sectionHeader, { color: theme.text, marginTop: 10 }]}>Quick Actions</Text>
        
        <View style={styles.actionsGrid}>
            <GridActionButton title="Attendance" icon="bar-chart" onPress={() => navigation.navigate("Attendance")} theme={theme} />
            <GridActionButton title="Predictor" icon="color-wand" onPress={() => navigation.navigate("Predictor")} theme={theme} />
            <GridActionButton title="Timetable" icon="calendar" onPress={() => navigation.navigate("TimeTable")} theme={theme} />
            <GridActionButton title="Campus Map" icon="compass" onPress={() => navigation.navigate("Campus")} theme={theme} />
            <GridActionButton title="Faculty" icon="people" onPress={() => navigation.navigate("Faculty")} theme={theme} />
            <GridActionButton title="Logout" icon="log-out" onPress={handleLogout} isDestructive={true} theme={theme} />
        </View>

  

        {/* Footer Section */}
        <View style={[styles.footerContainer, { backgroundColor: theme.card }]}>
            <View style={styles.footerGrid}>
              <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(STUDENT_PORTAL_URL)}>
                <Text style={[styles.footerLink, { color: theme.footer }]}>Official Portal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(FEES_PORTAL_URL)}>
                <Text style={[styles.footerLink, { color: theme.footer }]}>Fee Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(FEE_STRUCTURE_URL)}>
                <Text style={[styles.footerLink, { color: theme.footer }]}>Fee Structure</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(SOCIETIES_URL)}>
                <Text style={[styles.footerLink, { color: theme.footer }]}>Societies</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(HANDBOOK_URL)}>
                <Text style={[styles.footerLink, { color: theme.footer }]}>Handbook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem} onPress={() => handleFeedback()}>
                <Text style={[styles.footerLink, { color: theme.footer }]}>Report Issue</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.footerDivider, { backgroundColor: theme.separator }]} />

            <View style={styles.footerLegal}>
              <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
                <Text style={[styles.footerLegalText, { color: theme.footer }]}>Terms & Conditions</Text>
              </TouchableOpacity>
              <Text style={{color: theme.separator}}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
                <Text style={[styles.footerLegalText, { color: theme.footer }]}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
        </View>

        <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4, marginTop:20}}>
          <Text style={{ color: theme.secondary, fontSize:15}}>Developed by</Text>
          <TouchableOpacity onPress={()=>Linking.openURL(KESHAV_URL)}>
              <Text style={{ color: theme.footer, fontWeight: 'bold', fontSize:15 }}>Keshav Pal</Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4}}>
          <Text style={{ color: theme.secondary, fontSize:13}}>with</Text>
          <TouchableOpacity onPress={()=>Linking.openURL(SHIVAM_URL)}>
              <Text style={{ color: theme.footer, fontWeight: 'bold', fontSize:13 }}>Shivam Yadav</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    
    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    topIconContainer: { flexDirection: 'row', gap: 12 },
    greeting: { fontSize: 14, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
    username: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    themeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    
    // Hero Container (Stacked Layout)
    heroContainer: { borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4, marginBottom: 25, borderWidth: 1 },
    heroMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    heroTextContent: { flex: 1, justifyContent: 'center' },
    heroValue: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
    heroLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
    warningText: { fontSize: 12, fontWeight: '600', marginTop: 16, fontStyle: 'italic' },
    heroDivider: { height: 1, width: '100%', marginVertical: 20 },
    mentorRow: { flexDirection: 'row', alignItems: 'center' },
    mentorLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    mentorName: { fontSize: 16, fontWeight: '800' },

    // Grid Actions
    sectionHeader: { fontSize: 18, fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    gridActionCard: { width: '48%', padding: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    gridActionIconCtx: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    gridActionText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },

    // Footer Block
    footerContainer: { borderRadius: 24, padding: 20, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    footerGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
    footerItem: { width: '33%', alignItems: 'center' },
    footerLink: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
    footerDivider: { height: 1, width: '100%', marginVertical: 16 },
    footerLegal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    footerLegalText: { fontSize: 11, fontWeight: '500' },
});