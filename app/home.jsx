import { APP_LINK, CHANGELOG_URL, FEE_STRUCTURE_URL, FEES_PORTAL_URL, HANDBOOK_URL, KESHAV_URL, LIBRARY_URL, PRIVACY_URL, SAMARTH_URL, SHIVAM_URL, SOCIETIES_URL, STUDENT_PORTAL_URL, TERMS_URL } from '@/constants/links';
import { Colors } from '@/constants/themeStyle';
import { useTheme } from '@/hooks/useTheme';
import ArsdScraper from '@/services/ArsdScraper';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CheckBox from 'expo-checkbox';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { titleCase } from 'title-case';

const handleFeedback = () => {
	const email = "arsdsaathi.help@gmail.com";
	const subject = `ArsdSaathi Feedback`;
	const body = "Name: \nRoll Number: \nDOB (optional, for testing): \n\nIssue/Feedback: ";
	Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

// Grid Button
const GridActionButton = ({ title, icon, onPress, theme, isDestructive, accessibilityHint='' }) => (
	<TouchableOpacity
		style={[styles.gridActionCard]}
		onPress={onPress}
		activeOpacity={0.8}
		accessibilityRole="button"
		accessibilityLabel={title}
		accessibilityHint={accessibilityHint || `Maps to ${title}`}
	>
		<View style={[styles.gridActionIconCtx, { backgroundColor: 'transparent'  }]} importantForAccessibility="no-hide-descendants">
		  <Ionicons name={icon} color={isDestructive ? theme.error : theme.primary} size={33} />
		</View>
		<Text style={[styles.gridActionText, { color: isDestructive ? theme.error : theme.text }]} importantForAccessibility="no">{title}</Text>
  	</TouchableOpacity>
);

// --- Main Screen ---
export default function HomeTab({ route, navigation }) {
	const {theme, themeName, setThemeName, isDark} = useTheme()
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
	const [showThemeModal, setShowThemeModal] = useState(false);
	const [showQRModal, setShowQRModal] = useState(false);

  // --- AUTOMATIC UPDATE CHECK ---
  useEffect(() => {
		const checkForUpdates = async () => {
			try {
				const currentVersion = Constants.expoConfig.version;
				const response = await fetch('https://api.github.com/repos/KshavCode/arsd-saathi-app/releases/latest');
				if (!response.ok) return;
				const data = await response.json();
				const latestVersion = data.tag_name.replace('v', '');

				if (latestVersion !== currentVersion) {
					const downloadUrl = data.assets?.[0]?.browser_download_url || data.html_url;
					setUpdateInfo({ version: latestVersion, url: downloadUrl });
					setShowUpdateModal(true);
				}
		  } 
			catch (error) {
				console.log("Auto-update check failed:", error);
		  }
		};
	checkForUpdates();
	}, []);

  // Converts "10:30 AM" to 630 (minutes since midnight)
  const parseTimeToMinutes = (timeStr) => {
	  if (!timeStr) return 0;
	  const [time, modifier] = timeStr.split(' ');
	  let [hours, minutes] = time.split(':').map(Number);
	  if (hours === 12) hours = 0;
	  if (modifier === 'PM') hours += 12;
	  return hours * 60 + minutes;
  };

  // retrieve next class from timetable
  const getNextClass = (timetableData) => {
	  if (!timetableData) return null;

	  const now = new Date();
	  const currentDay = now.getDay();
	  const currentMinutes = now.getHours() * 60 + now.getMinutes();

	  // Check classes for today
	  let todayClasses = timetableData[currentDay-1] || [];

	  // Sort by time
	  todayClasses.sort((a, b) => parseTimeToMinutes(a.slot) - parseTimeToMinutes(b.slot));

	  for (let i = 0; i < todayClasses.length; i++) {
		  const cls = todayClasses[i];
		  const classTimeMins = parseTimeToMinutes(cls.slot);
		  if (classTimeMins > currentMinutes - 10) {
			  return { ...cls, dayName: 'Today' };
		  }
	  }

	  // otherwise first class of tomorrow
	  const tomorrowDay = (currentDay) % 7;
	  let tomorrowClasses = timetableData[tomorrowDay] || [];
	  if (tomorrowClasses.length > 0) {
		  tomorrowClasses.sort((a, b) => parseTimeToMinutes(a.slot) - parseTimeToMinutes(b.slot));
		  return { ...tomorrowClasses[0], dayName: 'Tomorrow' };
	  }
	  return null;
  };


  // --- Date formatter ---
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
					await AsyncStorage.multiRemove(['USER_CREDENTIALS', 'BASIC_DETAILS', 'ATTENDANCE_DATA','FACULTY_DATA', 	'MENTOR_DATA', 'DATA_TIMESTAMP']);
					Alert.alert(
						"App Updated 🚀",
						"We've upgraded how attendance is tracked (Theory vs Practical). Please log in again to sync your new 	data.",
						[{ text: "OK", onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }]
					);
				}
			}
		} 
		catch (e) {
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

  const executeLogout = async () => {
	  try {
		  const keysToRemove = ['SAVED_NOTICES', 'USER_CREDENTIALS', 'BASIC_DETAILS', 'ATTENDANCE_DATA', 'FACULTY_DATA', 'MENTOR_DATA', 'LOGIN_TIMESTAMP', 'DATA_TIMESTAMP'];

		  if (deleteTimetable) {
			  keysToRemove.push('TIMETABLE_DATA');
		  }

		  await AsyncStorage.multiRemove(keysToRemove);
		  setShowLogoutModal(false);
		  navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
	  } 
		catch (error) {
		  console.error("Logout failed:", error);
	  }
  };


  const handleShare = async () => {
		try {
		  setShowQRModal(true);
		} 
		catch (error) {
			Toast.show({position: 'bottom', bottomOffset:70, type:'success', text1:'Error!', text2: "Couldn't generate a link, kindly try again later.", props: {borderColor: theme.error, bg: theme.card, text1Color: theme.error, text2Color: theme.secondary}})
			console.log(error)
		}
  };

  const isAttendanceLow = Number(userData.percent_attendance) < 67;

  return (
		<SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
		  <StatusBar
			barStyle={isDark ? 'light-content' : 'dark-content'}
			backgroundColor={theme.background}
			/>
	
		  <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={() => setShowQRModal(false)} >
				<TouchableOpacity
				  style={styles.modalBackdropCenter}
				  onPressOut={()=>setShowQRModal(false)}
				  activeOpacity={1}
				>
				  <View style={[styles.qrModalContent, { backgroundColor: theme.card }]}>
					  <View style={{borderRadius: 15, marginBottom: 10 }}>
						  <QRCode value={APP_LINK} size={200} logo={require("@/assets/images/icon.png")} color={theme.primary} backgroundColor={theme.card} />
					  </View>
					  <TouchableOpacity
						  style={[styles.primaryButton, { backgroundColor: theme.background, borderColor: theme.primary, borderWidth: .5, width: '100%' }]}
						  onPress={async () => {
							  await Share.share({ message: `Download ArsdSaathi and boost your college life!\n\n${APP_LINK}` });
						  }}
					  >
						  <Ionicons name="share-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
						  <Text style={[styles.primaryButtonText, { color: theme.primary }]}>Share Link Instead</Text>
					  </TouchableOpacity>
				  </View>
				</TouchableOpacity>
		  </Modal>
						
		  {/* THEME SELECTION MODAL */}
		  <Modal visible={showThemeModal} transparent animationType="fade" onRequestClose={() => setShowThemeModal(false)}>
				<TouchableOpacity
				  style={styles.modalBackdrop}
				  activeOpacity={1}
				  onPressOut={() => setShowThemeModal(false)}
				>
				  <View style={[styles.modalListContainer, { backgroundColor: theme.background, width:'85%' }]}>
					<Text style={[styles.modalListHeader, { color: theme.text, backgroundColor: theme.card }]}>Select Theme: </Text>
					<ScrollView style={{ maxHeight: 350 }}>
					  {Object.keys(Colors).map((name, index) => (
						<TouchableOpacity
						  key={name}
						  style={[styles.dropdownItem, {backgroundColor: themeName === name ? theme.card+'70' : theme.background}]}
						  onPress={() => {
							setThemeName(name);
						  }}
						>
						  <Animatable.Text
							style={{ fontSize:18, color: themeName === name ? theme.primary : theme.text, fontWeight: themeName === name ? '800' : '500'}}
							animation='fadeInUp'
							duration={300}
							delay={index*50}
							useNativeDriver
							>{name}</Animatable.Text>
	
						  {themeName === name && (
							<Ionicons name="checkmark" size={16} color={theme.primary} />
						  )}
						</TouchableOpacity>
					  ))}
					</ScrollView>
					
				  </View>
				</TouchableOpacity>
		  </Modal>
					
		  {/* --- UPDATE MODAL --- */}
		  <Modal
				animationType="fade"
				transparent={true}
				visible={showUpdateModal}
				onRequestClose={() => setShowUpdateModal(false)}
				statusBarTranslucent={true}
				navigationBarTranslucent={true}
				accessibilityViewIsModal={true}
		  >
				<TouchableOpacity
				  style={styles.modalBackdropCenter}
				  onPressOut={()=>setShowUpdateModal(false)}
				  activeOpacity={1}
				>
					<View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
					  <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
					
							{/* Modal Header Icon */}
							<View style={[styles.modalIconContainer, { backgroundColor: theme.background + '70' }]} importantForAccessibility="no-hide-descendants">
							  <Ionicons name="rocket" size={36} color={theme.primary} />
							</View>
					
							{/* Modal Text */}
							<Text style={[styles.modalTitle, { color: theme.text }]} accessibilityRole="header">Update Available!</Text>
							<Text style={[styles.modalText, { color: theme.secondary }]}>
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
									accessibilityRole='button'
									accessibilityLabel="Update Now"
									accessibilityHint="Downloads the updated application by redirecting to the download link"
							  >
								<Ionicons name="download-outline" size={18} color={theme.background} style={{marginRight: 6}} importantForAccessibility="no" />
								<Text style={[styles.modalButtonPrimaryText, {color:theme.background}]} importantForAccessibility="no">Update Now</Text>
							  </TouchableOpacity>
							  <TouchableOpacity
									style={[styles.modalButtonSecondary, { borderColor: theme.separator }]}
									onPress={() => Linking.openURL(CHANGELOG_URL)}
									accessibilityRole='button'
									accessibilityLabel="What's New"
									accessibilityHint="Redirects to the new updates information of the application"
							  >
									<Text style={[styles.modalButtonSecondaryText, { color: theme.text }]} importantForAccessibility="no">What&apos;s New</Text>
							  </TouchableOpacity>
							  <TouchableOpacity
									style={{ marginTop: 15, paddingVertical: 5 }}
									onPress={() => setShowUpdateModal(false)}
									accessibilityRole='button'
									accessibilityLabel="Not Now"
									accessibilityHint="Dismiss this dialog and remind again when you open the app next time"
							  >
									<Text style={{ color: theme.secondary, fontSize: 13, fontWeight: '500' }} importantForAccessibility="no">Not Now</Text>
							  </TouchableOpacity>
							</View>
					  </View>
					</View>
				</TouchableOpacity>
		  </Modal>
								
		  {/* --- LOGOUT MODAL --- */}
		  <Modal
			animationType="fade"
			transparent={true}
			visible={showLogoutModal}
			onRequestClose={() => setShowLogoutModal(false)}
			statusBarTranslucent={true}
			navigationBarTranslucent={true}
			accessibilityViewIsModal={true}
		  >
				<TouchableOpacity
				  style={styles.modalBackdropCenter}
				  activeOpacity={1}
				>
					<View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
					  <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
								
							{/* Modal Header Icon */}
							<View style={[styles.modalIconContainer, { backgroundColor: theme.error + '20' }]} importantForAccessibility="no-hide-descendants">
							  <Ionicons name="alert" size={36} color={theme.error} />
							</View>
								
							{/* Modal Text */}
							<Text style={[styles.modalTitle, { color: theme.text }]} accessibilityRole="header">Are you sure?</Text>
							<View style={styles.modalActions}>
							  <TouchableOpacity
									style={{flexDirection:'row', gap:7, alignItems: 'center'}}
									accessible={true}
									accessibilityRole="checkbox"
									accessibilityState={{checked: deleteTimetable}}
									accessibilityLabel="Delete my Timetable"
									accessibilityHint="Check to permanently remove your saved timetable details from storage upon logout"
									onPress={() => setDeleteTimetable(!deleteTimetable)}
									activeOpacity={1}
							  >
									<CheckBox value={deleteTimetable} onValueChange={setDeleteTimetable} color={deleteTimetable ? theme.primary : undefined} />
									<Text style={[styles.modalText, { color: theme.secondary, marginBottom: 0 }]} importantForAccessibility="no">Delete my Timetable</Text>
							  </TouchableOpacity>
								
							  {/* Modal Action Buttons */}
							  <View style={[styles.modalActions, {marginTop: 25}]}>
									<TouchableOpacity
									  style={[styles.modalButtonPrimary, { backgroundColor: theme.error }]}
									  onPress={executeLogout}
									  accessibilityRole='button'
									  accessibilityLabel="Logout"
									  accessibilityHint="Confirm and log out of the application"
									>
									  <Ionicons name="log-out-outline" size={18} color='#FFF' style={{marginRight: 6}} importantForAccessibility="no" />
									  <Text style={[styles.modalButtonPrimaryText, {color:'#FFF'}]} importantForAccessibility="no">Logout</Text>
									</TouchableOpacity>
									<TouchableOpacity
									  style={[styles.modalButtonSecondary, { borderColor: theme.primary }]}
									  onPress={() => setShowLogoutModal(false)}
									  accessibilityRole='button'
									  accessibilityLabel="Cancel"
									  accessibilityHint="Cancel the action and return to homepage"
									>
								  	<Text style={[styles.modalButtonSecondaryText, { color: theme.text }]} importantForAccessibility="no">Cancel</Text>
									</TouchableOpacity>
							  </View>
							</View>
					  </View>
					</View>
				</TouchableOpacity>
		  </Modal>
								
		  {/* Background Scraper */}
		  {isSyncing && savedCredentials && (
			  <ArsdScraper credentials={savedCredentials} onProgress={(msg) => console.log("Background Sync:", msg)} onFinish={handleSyncCompletion} onError={handleSyncError} />
		  )}
		  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
		
			{/* Header Section */}
			<View style={styles.header}>
			  <View style={{flex: 1}} accessible={true} accessibilityRole="header">
					<Text style={[styles.greeting, { color: theme.secondary }]}>Welcome back,</Text>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
					  <TouchableOpacity
							onPress={()=>navigation.navigate("Details")}
							style={{flexDirection: 'row', gap:5, justifyContent:'center', alignItems:'center'}}
							accessibilityRole='button'
							accessibilityLabel={`${userData.name}. View Profile.`}
							accessibilityHint='Displays your personal details stored in the college database'
							hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
					  >
							<Text style={[styles.username, { color: theme.primary }]} numberOfLines={1} importantForAccessibility="no">{titleCase(userData.name.toLowerCase())}</Text>
							<Ionicons name="information-circle" size={15} color={theme.secondary} importantForAccessibility="no" />
					  </TouchableOpacity>
						{isSyncing && <ActivityIndicator size="small" color={theme.primary} accessibilityLabel='Syncing your latest data'/>}
					</View>
					<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }} >
					   <Ionicons name="time-outline" size={12} color={theme.secondary} importantForAccessibility="no-hide-descendants" />
					   <Text style={{ fontSize: 12, color: theme.secondary, fontWeight: '500' }} accessibilityLabel={`Last synced: ${lastSynced}`}>Last synced: {lastSynced}</Text>
					</View>
				</View>
		
				<View style={styles.topIconContainer}>
					<TouchableOpacity
					  onPress={handleShare}
					  accessibilityRole="button"
					  accessibilityLabel="Share App"
					  accessibilityHint="Share the download link for ArsdSaathi with friends"
					  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
					>
					  <Ionicons name='share-social' size={25} color={theme.primary} importantForAccessibility="no" />
					</TouchableOpacity>
					<TouchableOpacity
					  onPress={()=>setShowThemeModal(true)}
					  accessibilityRole="button"
					  accessibilityLabel="Toggle Theme"
					  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
					>
					  <Ionicons name='color-palette' size={25} color={theme.primary} importantForAccessibility="no" />
					</TouchableOpacity>
				</View>
			</View>
		
			{/* Dashboard */}
			<View style={[styles.heroContainer, { backgroundColor: theme.card, borderColor: theme.primary+'50' }]}>
		
				{/* Top Row - Attendance */}
				<View style={styles.heroMainRow} accessible={true} accessibilityLabel={`Theory Attendance: ${userData.percent_attendance}%`}>
					<View style={[styles.heroIconBox, { backgroundColor: isAttendanceLow ? theme.error : theme.success }]} importantForAccessibility="no-hide-descendants">
						<Ionicons name="pie-chart" size={24} color='#FFF' />
					</View>
					<View style={styles.heroTextContent} importantForAccessibility="no-hide-descendants">
						<Text style={[styles.heroValue, { color: theme.text }]}>{userData.percent_attendance}%</Text>
						<Text style={[styles.heroLabel, { color: theme.secondary }]}>Theory Attendance</Text>
					</View>
					{isAttendanceLow && <Ionicons name="alert-circle" size={28} color={theme.error} importantForAccessibility="no" />}
				</View>
		
				{isAttendanceLow && (
					<Text style={[styles.warningText, { color: theme.error }]} accessibilityLabel="Warning: Attendance is below 67 percent.">* Below 67%.</Text>
				)}
	
				<View style={[styles.heroDivider, { backgroundColor: theme.separator }]} />
			
				{/* Middle Row - Mentor */}
				<View style={styles.mentorRow} accessible={true} accessibilityLabel={`Assigned Mentor: ${userData.mentor_name}`}>
					<Ionicons name="person-outline" size={18} color={theme.primary} importantForAccessibility="no" />
					<View style={{marginLeft: 12, flex: 1}} importantForAccessibility="no-hide-descendants">
						<Text style={[styles.mentorLabel, { color: theme.secondary }]}>Assigned Mentor</Text>
						<Text style={[styles.mentorName, { color: theme.text }]} numberOfLines={2}>{userData.mentor_name}</Text>
					</View>
				</View>
			
				{/* --- Upcoming Class Row --- */}
				{nextClassInfo && (
				  <TouchableOpacity onPress={()=>navigation.navigate('Timetable')}>
						<View style={[styles.heroDivider, { backgroundColor: theme.separator }]} />
				
						<View accessible={true} accessibilityLabel={`Up Next ${nextClassInfo.dayName} at ${nextClassInfo.slot}. Subject: ${nextClassInfo.subject}. Room ${nextClassInfo.room || 'Not Assigned'}. ${nextClassInfo.duration} Hour ${nextClassInfo.type} class.`}>
						  <View style={styles.nextClassHeader} importantForAccessibility="no-hide-descendants">
								<View style={{flexDirection: 'row', alignItems: 'center'}}>
								  <Ionicons name="alarm-outline" size={16} color={theme.success} />
								  <Text style={[styles.nextClassTitle, { color: theme.success }]}> {nextClassInfo.dayName}</Text>
								</View>
								<Text style={[styles.nextClassTime, { color: theme.primary }]}>{nextClassInfo.slot}</Text>
						  </View>
				
						  <Text style={[styles.nextClassSubject, { color: theme.text }]} numberOfLines={1}  importantForAccessibility="no">{nextClassInfo.subject}</Text>
						  <View style={styles.nextClassMetaRow} importantForAccessibility="no-hide-descendants">
								<View style={[styles.metaBadge, { backgroundColor: theme.background + '70' }]}>
								  <Ionicons name="location" size={12} color={theme.secondary} />
								  <Text style={[styles.metaText, { color: theme.secondary }]}>Room {nextClassInfo.room || 'N/A'}</Text>
								</View>
								<View style={[styles.metaBadge, { backgroundColor: theme.background + '70' }]}>
									<Ionicons name="time" size={12} color={theme.secondary} />
									<Text style={[styles.metaText, { color: theme.secondary }]}>{nextClassInfo.duration} Hr {nextClassInfo.type}</Text>
								</View>
						  </View>
						  {nextClassInfo.label &&
								<View style={[styles.metaBadge, { backgroundColor: theme.background + '70', marginTop: 5 }]}>
								  <Ionicons name="document" size={12} color={theme.secondary} />
								  <Text style={[styles.metaText, { color: theme.secondary }]} numberOfLines={1}>{nextClassInfo.label}</Text>
								</View>
						  }
						</View>
				  </TouchableOpacity>
				)}
				</View>
			
				{/* Grid Buttons */}
				<Text style={[styles.sectionHeader, { color: theme.text, marginTop: 10 }]} accessibilityRole="header" accessibilityLabel='Quick Actions'>Quick Actions</Text>
				<View style={styles.actionsGrid}>
					<GridActionButton title="Notices" icon="megaphone" onPress={() => navigation.navigate("Notice")} theme={theme} />
					<GridActionButton title="Attendance" icon="bar-chart" onPress={() => navigation.navigate("Attendance")} theme={theme} />
					<GridActionButton title="Predictor" icon="color-wand" onPress={() => navigation.navigate("Predictor")} theme={theme} />
					<GridActionButton title="Timetable" icon="calendar" onPress={() => navigation.navigate("Timetable")} theme={theme} />
					<GridActionButton title="Faculty" icon="people" onPress={() => navigation.navigate("Faculty")} theme={theme} />
					<GridActionButton title="Support" icon="sparkles" onPress={() => navigation.navigate("Support")} theme={theme} />
					<GridActionButton title="Logout" icon="log-out-outline" onPress={handleLogout} isDestructive={true} theme={theme} accessibilityHint="Opens confirmation dialog to securely log out"/>
				</View>
			
				{/* Footer Section */}
				<View style={[styles.footerContainer, { backgroundColor: theme.card }]}>
					<View style={styles.footerGrid}>
					  <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(STUDENT_PORTAL_URL)} accessibilityRole="link" accessibilityHint="Redirects to the college's official student portal" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
							<Text style={[styles.footerLink, { color: theme.footer }]}>Official Portal</Text>
					  </TouchableOpacity>
					  <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(SAMARTH_URL)} accessibilityRole="link" accessibilityHint="Link for fee payment portal" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
							<Text style={[styles.footerLink, { color: theme.footer }]}>Samarth eGov</Text>
					  </TouchableOpacity>
					  <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(FEES_PORTAL_URL)} accessibilityRole="link" accessibilityHint="Link for fee payment portal" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
							<Text style={[styles.footerLink, { color: theme.footer }]}>Fee Payment</Text>
					  </TouchableOpacity>
					  <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(FEE_STRUCTURE_URL)} accessibilityRole="link" accessibilityHint="Redirects to the fee structure on the college website" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
							<Text style={[styles.footerLink, { color: theme.footer }]}>Fee Structure</Text>
					  </TouchableOpacity>
					  <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(LIBRARY_URL)} accessibilityRole="link" accessibilityHint="Redirects to the fee structure on the college website" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
							<Text style={[styles.footerLink, { color: theme.footer }]}>Library</Text>
					  </TouchableOpacity>
					  <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(SOCIETIES_URL)} accessibilityRole="link" accessibilityHint="a link to check the available socities or clubs found in the college" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
							<Text style={[styles.footerLink, { color: theme.footer }]}>Societies</Text>
					  </TouchableOpacity>
					  <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(HANDBOOK_URL)} accessibilityRole="link" accessibilityHint="Download the student helper handbook provided by the college." hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
							<Text style={[styles.footerLink, { color: theme.footer }]}>Handbook</Text>
					  </TouchableOpacity>
					</View>
			
					<View style={[styles.footerDivider, { backgroundColor: theme.separator }]} />
			
					<View style={styles.footerLegal}>
					  <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link" accessibilityHint="Opens the link to Terms and Conditions" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
							<Text style={[styles.footerLegalText, { color: theme.footer }]}>Terms & Conditions</Text>
					  </TouchableOpacity>
					  	<Text style={{color: theme.separator}} importantForAccessibility="no">•</Text>
					  <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link" accessibilityHint="Opens the link to the privacy policy of this application" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
							<Text style={[styles.footerLegalText, { color: theme.footer }]}>Privacy Policy</Text>
					  </TouchableOpacity>
					</View>
					<View style={[styles.footerLegal, {marginTop: 15}]}>
					  <TouchableOpacity style={styles.footerItem} onPress={() => handleFeedback()} accessibilityRole="link" accessibilityHint="Email the developer's through this link." hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
						<Text style={[styles.footerLink, { color: theme.footer }]}>Report an Issue?</Text>
					  </TouchableOpacity>
					</View>
				</View>
			
				<View style={{flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4, marginTop:20}} accessible={true} accessibilityLabel="Developed by Keshav Pal">
			  	<Text style={{ color: theme.secondary, fontSize:15}} importantForAccessibility="no">Developed by</Text>
			  	<TouchableOpacity onPress={()=>Linking.openURL(KESHAV_URL)} accessibilityRole="link" accessibilityHint="Redirects to the main developer's website" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
					  <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize:15 }} importantForAccessibility="no">Keshav Pal</Text>
			  	</TouchableOpacity>
				</View>
				<View style={{flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4}} accessible={true} accessibilityLabel="Developed with Shivam Yadav">
				  <Text style={{ color: theme.secondary, fontSize:13}} importantForAccessibility="no">with</Text>
				  <TouchableOpacity onPress={()=>Linking.openURL(SHIVAM_URL)} accessibilityRole="link" accessibilityHint="Redirects to the developer's github profile" hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
					  <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize:13 }} importantForAccessibility="no">Shivam Yadav</Text>
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
	modalButtonPrimaryText: { fontSize: 16, fontWeight: '700' },
	modalButtonSecondary: { width: '100%', paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
	modalButtonSecondaryText: { fontSize: 15, fontWeight: '600' },
	modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems:'center' },
	modalBackdropCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
	qrModalContent: { padding: 30, borderRadius: 30, alignItems: 'center', width: '100%', maxWidth: 350 },
	primaryButton: { paddingVertical: 13, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
	primaryButtonText: { fontSize: 16, fontWeight: '800' },

	// Header
	header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
	topIconContainer: { flexDirection: 'row', gap: 20 },
	greeting: { fontSize: 14, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
	username: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },

	// Dashboard
	heroContainer: { borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4, marginBottom: 20, borderWidth: 1, overflow:'hidden' },
	heroMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	heroIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
	heroTextContent: { flex: 1, justifyContent: 'center' },
	heroValue: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
	heroLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
	warningText: { fontSize: 12, fontWeight: '600', marginTop: 10, fontStyle: 'italic' },
	heroDivider: { height: 2, width: '100%', marginVertical:20 },

	mentorRow: { flexDirection: 'row', alignItems: 'center' },
	mentorLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5},
	mentorName: { fontSize: 18, fontWeight: '800' },

	// Next Class Section
	nextClassHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
	nextClassTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 6 },
	nextClassTime: { fontSize: 13, fontWeight: '800' },
	nextClassSubject: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
	nextClassMetaRow: { flexDirection: 'row', gap: 10 },
	metaBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
	metaText: { fontSize: 12, fontWeight: '700' },

	// Grid Actions
	sectionHeader: { fontSize: 18, fontWeight: '800', marginBottom: 10, letterSpacing: -0.5 },
	actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
	gridActionCard: { width: '22%', padding: 5, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
	gridActionIconCtx: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
	gridActionText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

	// Footer Block
	footerContainer: { borderRadius: 24, padding: 20, marginTop: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
	footerGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 15 },
	footerItem: { width: '50%', alignItems: 'center' },
	footerLink: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
	footerDivider: { height: 1, width: '100%', marginVertical: 16 },
	footerLegal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
	footerLegalText: { fontSize: 11, fontWeight: '500' },

	// Modal Dropdown
	modalListContainer: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
	modalListHeader: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', padding: 16 },
	dropdownItem: { paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap:5 },
});