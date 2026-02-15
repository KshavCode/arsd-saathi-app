import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/themeStyle';
import ArsdScraper from '../services/ArsdScraper';

const handleFeedback = () => {
  const email = "arsdsaathi.help@gmail.com"; 
  const subject = `ArsdSaathi Feedback`;
  const body = "Name: \nRoll Number: \nDOB (optional, for testing): \n\nIssue/Feedback: ";
  Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

const handleUpdate = async () => {
  try {
    const currentVersion = Constants.expoConfig.version;
    const response = await fetch(
      'https://api.github.com/repos/KshavCode/arsd-saathi-app/releases/latest'
    );
    const data = await response.json();
    
    const latestVersion = data.tag_name.replace('v', '');

    if (latestVersion !== currentVersion) {
      Alert.alert(
        "Update Available 🚀",
        `A new version (${latestVersion}) is available. Would you like to download it now?`,
        [
          { text: "Later", style: "cancel" },
          { 
            text: "Download", 
            onPress: () => Linking.openURL(data.assets[0].browser_download_url)
          }
        ]
      );
    } else {
      Alert.alert("Up to Date", "You are already using the latest version of ArsdSaathi!");
    }
  } catch (error) {
    console.error(error);
    Alert.alert("Error", "Could not check for updates. Please check your internet connection.");
  }
};

// --- Sub-Components ---

const DashboardCard = ({ title, value, icon, color, subValue, highlight, theme }) => (
  <View style={[styles.card, { backgroundColor: theme.card }]}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconContainer, { backgroundColor: color || theme.primary }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      {highlight && <Ionicons name="alert-circle" size={18} color={theme.error} />}
    </View>
    <View>
      <Text style={[styles.cardValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>{title}</Text>
      {subValue && <Text style={[styles.cardSub, { color: theme.error }]}>{subValue}</Text>}
    </View>
  </View>
);

const ActionButton = ({ title, icon, onPress, isDestructive, theme }) => (
  <TouchableOpacity 
    style={[
      styles.actionButton, 
      { backgroundColor: theme.card }, 
      isDestructive && { backgroundColor: theme.destructiveBg, borderColor: theme.destructiveBorder, borderWidth: 1 }
    ]} 
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[
      styles.actionIconCtx, 
      { backgroundColor: isDestructive ? 'transparent' : theme.iconBg }
    ]}>
      <Ionicons name={icon} color={isDestructive ? theme.error : theme.primary} size={20} />
    </View>
    <Text style={[styles.actionText, { color: theme.text }, isDestructive && { color: theme.error }]}>{title}</Text>
    <Ionicons name="chevron-forward" color={theme.iconPlaceholder} size={20} />
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
    footer: isDarkMode ? Colors.dark.footer : Colors.light.footer
  };

  const [userData, setUserData] = useState({ name: "Loading...", rollNo: "...", enrollmentNumber: "..." });
  const [savedCredentials, setSavedCredentials] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = async () => {
      try {
        const basicRaw = await AsyncStorage.getItem('BASIC_DETAILS');
        const credsRaw = await AsyncStorage.getItem('USER_CREDENTIALS');
        const attRaw = await AsyncStorage.getItem('ATTENDANCE_DATA');
        const mentorRaw = await AsyncStorage.getItem('MENTOR_DATA');

        const basic = basicRaw ? JSON.parse(basicRaw) : null;
        const creds = credsRaw ? JSON.parse(credsRaw) : null;
        const att = attRaw ? JSON.parse(attRaw) : null;
        const mentor = mentorRaw ? JSON.parse(mentorRaw) : null;

        if (creds) setSavedCredentials(creds); 

        if (basic || creds) {
          setUserData({ 
            name: basic?.name || creds?.name || "Student", 
            rollNo: basic?.rollNo || creds?.rollNo || "N/A",
            enrollmentNumber: basic?.enrollmentNumber || "N/A",
            percent_attendance: att?.overall_percentage || 0,
            mentor_name: mentor?.mentor || "N/A"
          });
        }
      } catch (error) {
        console.error("Error loading Dashboard data:", error);
      }
  };

  useEffect(() => {
    loadData();

    if (route.params?.requiresSync) {
        setIsSyncing(true);
    }
  }, [route.params]);

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
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
  }

  // Saving Dark Theme
  const handleTheme = async () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode); 
    
    // 3. Save the new value as a string
    await AsyncStorage.setItem('DARK_THEME', JSON.stringify(nextMode));
};

  const isAttendanceLow = Number(userData.percent_attendance) < 67;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      {/* Background Scraper Component */}
      {isSyncing && savedCredentials && (
          <ArsdScraper
              credentials={savedCredentials}
              onProgress={(msg) => console.log("Background Sync:", msg)}
              onFinish={handleSyncCompletion}
              onError={handleSyncError}
          />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>Welcome back,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.username, { color: theme.text }]}>{userData.name}</Text>
                {isSyncing && <ActivityIndicator size="small" color={theme.primary} />}
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.themeButton, { backgroundColor: theme.card }]} 
            onPress={handleTheme}
          >
             <Ionicons name={isDarkMode ? "sunny" : "moon"} size={22} color={isDarkMode ? "#FBBF24" : theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Top Statistics Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.heroCardContainer}>
            <DashboardCard 
              title="Attendance %" 
              value={userData.percent_attendance}
              subValue={isAttendanceLow ? "Below required 67%" : ""}
              icon="pie-chart"
              color={isAttendanceLow ? theme.error : "#10B981"}
              highlight={isAttendanceLow}
              theme={theme}
            />
          </View>

          <View style={styles.secondaryStatsRow}>
            <View style={{flex: 1}}>
                <DashboardCard 
                  title="Enrollment" 
                  value={userData.enrollmentNumber} 
                  icon="document-text" 
                  color={theme.secondary} 
                  theme={theme}
                />
            </View>
            <View style={{width: 12}} /> 
            <View style={{flex: 1}}>
                <DashboardCard 
                  title="Roll No." 
                  value={userData.rollNo} 
                  icon="id-card"
                  color={theme.primary} 
                  theme={theme}
                />
            </View>
          </View>
          <View style={styles.heroCardContainer}>
            <DashboardCard 
              title="Mentor" 
              value={userData.mentor_name}
              icon="book"
              theme={theme}
            />
          </View>
        </View>

        {/* Navigation Actions */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Quick Actions</Text>
        <View style={[styles.actionContainer, { backgroundColor: theme.card }]}>
           <ActionButton 
            title="Detailed Attendance" 
            icon="bar-chart" 
            onPress={() => navigation.navigate("Attendance")} 
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <ActionButton 
            title="Personal Details" 
            icon="person" 
            onPress={() => navigation.navigate("Details")} 
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <ActionButton 
            title="Faculty Details" 
            icon="people" 
            onPress={() => navigation.navigate("Faculty")} 
            theme={theme}
          />
        </View>

        {/* Utility Actions */}
        <View style={{ marginTop: 20, borderWidth:1, borderRadius:12, borderColor: theme.primary}}>
          <ActionButton 
            title="Check for Updates" 
            icon="build" 
            onPress={handleUpdate}
            theme={theme}
          />
        </View>
        <View style={{ marginTop: 10 }}>
          <ActionButton 
            title="Logout" 
            icon="log-out" 
            onPress={handleLogout}
            isDestructive={true}
            theme={theme}
          />
        </View>

        {/* Footer Section */}
        <TouchableOpacity onPress={() => handleFeedback()}>
          <Text style={[styles.footerText, { color: theme.footer, fontWeight: 'bold', marginTop: 10 }]}>Having trouble? Report an Issue
          </Text>
        </TouchableOpacity>
        
        <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4, marginTop:10}}>
          <Text style={{ color: theme.secondary, fontSize:15}}>Developed by</Text>
          <TouchableOpacity onPress={()=>Linking.openURL("https://kshavcode.me")}>
              <Text style={{ color: theme.footer, fontWeight: 'bold', fontSize:15 }}>Keshav Pal</Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4}}>
          <Text style={{ color: theme.secondary, fontSize:13}}>with</Text>
          <TouchableOpacity onPress={()=>Linking.openURL("https://github.com/SHIVAMY007")}>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    greeting: { fontSize: 16, fontWeight: '500' },
    username: { fontSize: 26, fontWeight: '800' },
    themeButton: { width: 45, height: 45, borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    statsGrid: { marginBottom: 25, gap: 12 },
    heroCardContainer: { width: '100%' },
    secondaryStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    card: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 4, minHeight: 110, justifyContent: 'space-between' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    iconContainer: { padding: 8, borderRadius: 10 },
    cardValue: { fontSize: 22, fontWeight: 'bold' },
    cardTitle: { fontSize: 14, marginTop: 2 },
    cardSub: { fontSize: 12, marginTop: 4, fontWeight: '600' },
    sectionHeader: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    actionContainer: { borderRadius: 16, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12 },
    actionIconCtx: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    actionText: { flex: 1, fontSize: 15, fontWeight: '600' },
    separator: { height: 1, marginLeft: 60 },
    footerText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12 },
});