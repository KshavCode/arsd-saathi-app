import { FEE_STRUCTURE_URL, FEES_PORTAL_URL, HANDBOOK_URL, KESHAV_URL, PRIVACY_URL, SHIVAM_URL, SOCIETIES_URL, STUDENT_PORTAL_URL, TERMS_URL } from '@/constants/links';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CheckBox from 'expo-checkbox';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
const GridActionButton = ({ title, icon, onPress, theme, isDestructive, accessibilityHint='' }) => (
  <TouchableOpacity 
    style={[
      styles.gridActionCard, 
      { backgroundColor: theme.card },
      isDestructive && { backgroundColor: theme.destructiveBg, borderWidth: 1, borderColor: theme.destructiveBorder }
    ]} 
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityHint="a button to move to feature's screen"
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
    success: isDarkMode ? Colors.dark.success : Colors.light.success,
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
  const [nextClassInfo, setNextClassInfo] = useState(null);

  // Modal States
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ version: '', url: '' });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteTimetable, setDeleteTimetable] = useState(false);

  // --- AUTOMATIC UPDATE CHECK ---
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // const currentVersion = Constants.expoConfig.version;
        // const response = await fetch('https://api.github.com/repos/KshavCode/arsd-saathi-app/releases/latest');
        // if (!response.ok) return;
        // const data = await response.json();
        // const latestVersion = data.tag_name.replace('v', '');

        // if (latestVersion !== currentVersion) {
        //     const downloadUrl = data.assets?.[0]?.browser_download_url || data.html_url;
        //     setUpdateInfo({ version: latestVersion, url: downloadUrl });
        //     setShowUpdateModal(true);
        // }
        console.log("Update Check")
      } catch (error) {
        console.log("Auto-update check failed:", error); 
      }
    };
    checkForUpdates();
  }, []); 

  // --- HELPER: Parse Time String to Minutes for Comparison ---
  // Converts "10:30 AM" to 630 (minutes since midnight)
  const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (hours === 12) hours = 0;
      if (modifier === 'PM') hours += 12;
      return hours * 60 + minutes;
  };

  // --- HELPER: Get Next Class from Timetable ---
  const getNextClass = (timetableData) => {
      if (!timetableData) return null;

      const now = new Date();
      const currentDay = now.getDay();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // 1. Check classes for TODAY
      let todayClasses = timetableData[currentDay] || [];
      
      // Sort by time just in case
      todayClasses.sort((a, b) => parseTimeToMinutes(a.slot) - parseTimeToMinutes(b.slot));

      for (let i = 0; i < todayClasses.length; i++) {
          const cls = todayClasses[i];
          const classTimeMins = parseTimeToMinutes(cls.slot);
          
          // If the class hasn't started yet, or just started (within last 15 mins), it's the "next" class
          if (classTimeMins > currentMinutes - 15) {
              return { ...cls, dayName: 'Today' };
          }
      }

      // 2. If no more classes today, find the first class TOMORROW
      const tomorrowDay = (currentDay + 1) % 7;
      let tomorrowClasses = timetableData[tomorrowDay] || [];
      
      if (tomorrowClasses.length > 0) {
          tomorrowClasses.sort((a, b) => parseTimeToMinutes(a.slot) - parseTimeToMinutes(b.slot));
          return { ...tomorrowClasses[0], dayName: 'Tomorrow' };
      }

      // 3. If no classes tomorrow, fallback
      return null;
  };


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
        const timetableRaw = await AsyncStorage.getItem('TIMETABLE_DATA');

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

        if (timetableRaw) {
            const parsedTimetable = JSON.parse(timetableRaw);
            const upNext = getNextClass(parsedTimetable);
            setNextClassInfo(upNext);
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


  const handleLogout = () => {
      setShowLogoutModal(true)
  }

  // --- THE NEW LOGOUT EXECUTION LOGIC ---
  const executeLogout = async () => {
      try {
          const keysToRemove = [
              'USER_CREDENTIALS', 
              'BASIC_DETAILS', 
              'ATTENDANCE_DATA', 
              'FACULTY_DATA', 
              'MENTOR_DATA', 
              'LOGIN_TIMESTAMP', 
              'DATA_TIMESTAMP'
          ];
          
          if (deleteTimetable) {
              keysToRemove.push('TIMETABLE_DATA');
          }

          await AsyncStorage.multiRemove(keysToRemove);
          setShowLogoutModal(false);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } catch (error) {
          console.error("Logout failed:", error);
      }
  };

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
      
      {/* --- CUSTOM UPDATE MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showUpdateModal}
        onRequestClose={() => setShowUpdateModal(false)}
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>

            {/* Modal Header Icon */}
            <View style={[styles.modalIconContainer, { backgroundColor: theme.iconBg }]}>
              <Ionicons name="rocket" size={36} color={theme.primary} />
            </View>

            {/* Modal Text */}
            <Text style={[styles.modalTitle, { color: theme.text }]}>Update Available!</Text>
            <Text style={[styles.modalText, { color: theme.textSecondary }]}>
              Version {updateInfo.version} is ready. We&apos;ve crushed some bugs and added improvements to keep your app running smoothly.
            </Text>

            {/* Modal Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButtonPrimary, { backgroundColor: theme.primary }]}
                onPress={() => {
                  Linking.openURL(updateInfo.url);
                  setShowUpdateModal(false);
                }}
                accessibilityHint="Downloads the updated application by redirecting to thet download link" accessibilityRole='button'
              >
                <Ionicons name="download-outline" size={18} color="#FFF" style={{marginRight: 6}} />
                <Text style={styles.modalButtonPrimaryText}>Update Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.separator }]} onPress={() => Linking.openURL("https://github.com/KshavCode/arsd-saathi-app/blob/master/CHANGELOG.md")} accessibilityHint="Redirects to the new updates information of the application" accessibilityRole='button'>
                <Text style={[styles.modalButtonSecondaryText, { color: theme.text }]}>What&apos;s New</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 15, paddingVertical: 5 }} onPress={() => setShowUpdateModal(false)} accessibilityHint="Remind again when you open the app" accessibilityRole='button'>
                <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500' }}>Not Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- CUSTOM LOGOUT MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>

            {/* Modal Header Icon */}
            <View style={[styles.modalIconContainer, { backgroundColor: theme.error + '20' }]}>
              <Ionicons name="alert" size={36} color={theme.error} />
            </View>

            {/* Modal Text */}
            <Text style={[styles.modalTitle, { color: theme.text }]}>Are you sure?</Text>
            <View style={{flexDirection:'row', gap:7}} accessible={true}>
              <CheckBox value={deleteTimetable} onValueChange={setDeleteTimetable} color={deleteTimetable ? theme.primary : undefined} accessibilityHint="To remove your saved timetable details permanently from storage" accessibilityRole='checkbox' accessibilityState={{checked:deleteTimetable}}/>
              <Text style={[styles.modalText, { color: theme.textSecondary }]}>Delete my Timetable</Text>
            </View>

            {/* Modal Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButtonPrimary, { backgroundColor: theme.error }]}
                onPress={executeLogout} accessibilityHint="Confirmation on logout" accessibilityRole='button'>
                <Ionicons name="log-out-outline" size={18} color="#FFF" style={{marginRight: 6}} />
                <Text style={styles.modalButtonPrimaryText}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.separator }]} onPress={() => setShowLogoutModal(false)} accessibilityHint="Cancel the action and return to homepage" accessibilityRole='button'>
                <Text style={[styles.modalButtonSecondaryText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Background Scraper Component */}
      {isSyncing && savedCredentials && (
          <ArsdScraper credentials={savedCredentials} onProgress={(msg) => console.log("Background Sync:", msg)} onFinish={handleSyncCompletion} onError={handleSyncError} />
      )}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header} accessible={true}>
          <View style={{flex: 1}}>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>Welcome back,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={()=>navigation.navigate("Details")} style={{flexDirection: 'row', gap:5, justifyContent:'center', alignItems:'center'}} accessibilityRole='button' accessibilityHint='Displays your personal details stored in the college database'>
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
        <View style={[styles.heroContainer, { backgroundColor: theme.card, borderColor: theme.borderColor }]} accessible={true}>
            
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
                <Text style={[styles.warningText, { color: theme.error }]}>* Below 67%.</Text>
            )}

            <View style={[styles.heroDivider, { backgroundColor: theme.separator }]} />

            {/* Middle Row: Mentor */}
            <View style={styles.mentorRow}>
                 <Ionicons name="person-outline" size={18} color={theme.primary} />
                 <View style={{marginLeft: 12, flex: 1}}>
                     <Text style={[styles.mentorLabel, { color: theme.textSecondary }]}>Assigned Mentor</Text>
                     <Text style={[styles.mentorName, { color: theme.text }]} numberOfLines={2}>{userData.mentor_name}</Text>
                 </View>
            </View>

            {/* --- NEW: Upcoming Class Row --- */}
            {nextClassInfo && (
                <>
                    <View style={[styles.heroDivider, { backgroundColor: theme.separator }]} />
                    <View style={styles.nextClassRow}>
                        <View style={styles.nextClassHeader}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Ionicons name="alarm-outline" size={16} color={theme.success} />
                                <Text style={[styles.nextClassTitle, { color: theme.success }]}>Up Next ({nextClassInfo.dayName})</Text>
                            </View>
                            <Text style={[styles.nextClassTime, { color: theme.primary }]}>{nextClassInfo.slot}</Text>
                        </View>
                        
                        <Text style={[styles.nextClassSubject, { color: theme.text }]} numberOfLines={1}>
                            {nextClassInfo.subject}
                        </Text>
                        
                        <View style={styles.nextClassMetaRow}>
                            <View style={[styles.metaBadge, { backgroundColor: theme.iconBg }]}>
                                <Ionicons name="location" size={12} color={theme.textSecondary} />
                                <Text style={[styles.metaText, { color: theme.textSecondary }]}>Room {nextClassInfo.room || 'N/A'}</Text>
                            </View>
                            <View style={[styles.metaBadge, { backgroundColor: theme.iconBg }]}>
                                <Ionicons name="time" size={12} color={theme.textSecondary} />
                                <Text style={[styles.metaText, { color: theme.textSecondary }]}>{nextClassInfo.duration} Hr {nextClassInfo.type}</Text>
                            </View>
                        </View>
                    </View>
                </>
            )}
        </View>

        {/* Grid Navigation */}
        <Text style={[styles.sectionHeader, { color: theme.text, marginTop: 10 }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
            <GridActionButton title="Attendance" icon="bar-chart" onPress={() => navigation.navigate("Attendance")} theme={theme} />
            <GridActionButton title="Predictor" icon="color-wand" onPress={() => navigation.navigate("Predictor")} theme={theme} />
            <GridActionButton title="Timetable" icon="calendar" onPress={() => navigation.navigate("TimeTable")} theme={theme} />
            <GridActionButton title="Campus Map" icon="compass" onPress={() => navigation.navigate("Campus")} theme={theme} />
            <GridActionButton title="Faculty" icon="people" onPress={() => navigation.navigate("Faculty")} theme={theme} />
            <GridActionButton title="Logout" icon="log-out" onPress={handleLogout} isDestructive={true} theme={theme}/>
        </View>

        {/* Footer Section */}
        <View style={[styles.footerContainer, { backgroundColor: theme.card }]}>
            <View style={styles.footerGrid}>
              <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(STUDENT_PORTAL_URL)} accessibilityRole="link" accessibilityHint="Redirects to the college's official student portal">
                <Text style={[styles.footerLink, { color: theme.footer }]}>Official Portal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(FEES_PORTAL_URL)} accessibilityRole="link" accessibilityHint="Link for fee payment portal">
                <Text style={[styles.footerLink, { color: theme.footer }]}>Fee Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(FEE_STRUCTURE_URL)} accessibilityRole="link" accessibilityHint="Redirects to the fee structure on the college website">
                <Text style={[styles.footerLink, { color: theme.footer }]}>Fee Structure</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(SOCIETIES_URL)} accessibilityRole="link" accessibilityHint="a link to check the available socities or clubs found in the college">
                <Text style={[styles.footerLink, { color: theme.footer }]}>Societies</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(HANDBOOK_URL)} accessibilityRole="link" accessibilityHint="Download the student helper handbook provided by the college.">
                <Text style={[styles.footerLink, { color: theme.footer }]}>Handbook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerItem} onPress={() => handleFeedback()} accessibilityRole="link" accessibilityHint="Email the developer's through this link.">
                <Text style={[styles.footerLink, { color: theme.footer }]}>Report Issue</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.footerDivider, { backgroundColor: theme.separator }]} />

            <View style={styles.footerLegal}>
              <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link" accessibilityHint="Opens the link to Terms and Conditions">
                <Text style={[styles.footerLegalText, { color: theme.footer }]}>Terms & Conditions</Text>
              </TouchableOpacity>
              <Text style={{color: theme.separator}}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link" accessibilityHint="Opens the link to the privacy policy of this application">
                <Text style={[styles.footerLegalText, { color: theme.footer }]}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
        </View>

        <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4, marginTop:20}}>
          <Text style={{ color: theme.secondary, fontSize:15}}>Developed by</Text>
          <TouchableOpacity onPress={()=>Linking.openURL(KESHAV_URL)} accessibilityRole="link" accessibilityHint="Redirects to the main developer's website">
              <Text style={{ color: theme.footer, fontWeight: 'bold', fontSize:15 }}>Keshav Pal</Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4}}>
          <Text style={{ color: theme.secondary, fontSize:13}}>with</Text>
          <TouchableOpacity onPress={()=>Linking.openURL(SHIVAM_URL)} accessibilityRole="link" accessibilityHint="Redirects to the developer's github profile">
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

    // Modal 
    modalOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 5 },
    modalContent: { width: '90%', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
    modalIconContainer: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
    modalText: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 25 },
    modalActions: { width: '100%', alignItems: 'center' },
    modalButtonPrimary: { flexDirection: 'row', width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    modalButtonPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    modalButtonSecondary: { width: '100%', paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    modalButtonSecondaryText: { fontSize: 15, fontWeight: '600' },
    
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

    // Next Class Section
    nextClassRow: { marginTop: 4 },
    nextClassHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    nextClassTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 6 },
    nextClassTime: { fontSize: 13, fontWeight: '800' },
    nextClassSubject: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
    nextClassMetaRow: { flexDirection: 'row', gap: 10 },
    metaBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
    metaText: { fontSize: 12, fontWeight: '700' },

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