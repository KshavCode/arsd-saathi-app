import { APP_LINK, CHANGELOG_URL, DEV_MESSAGE_URL, FEE_STRUCTURE_URL, FEES_PORTAL_URL, HANDBOOK_URL, KESHAV_URL, LIBRARY_URL, PRIVACY_URL, SAMARTH_URL, SHIVAM_URL, SOCIETIES_URL, STUDENT_PORTAL_URL, TERMS_URL } from '@/constants/links';
import { Colors } from '@/constants/themeStyle';
import { useTheme } from '@/hooks/useTheme';
import ArsdScraper from '@/services/ArsdScraper';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CheckBox from 'expo-checkbox';
import { TouchableWithoutFeedback } from 'react-native';

import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Image, Dimensions, RefreshControl } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.62; 
const CARD_GAP = 14;

const handleFeedback = () => {
    const email = "arsdsaathi.help@gmail.com";
    const subject = `ArsdSaathi Feedback`;
    const body = "Name: \nRoll Number: \nScreenshots: \n\nIssue/Feedback: ";
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

// --- Main Screen ---
export default function HomeTab({ route, navigation }) {
    const {theme, themeName, setThemeName, isDark} = useTheme()
    const [userData, setUserData] = useState({ name: "Loading...", rollNo: "...", enrollmentNumber: "..." });
    const [savedCredentials, setSavedCredentials] = useState(null);
    const [devMessage, setDevMessage] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [nextSync, setNextSync] = useState("Never");
    const [refreshing, setRefreshing] = useState(false);
    
    // Holds the array of remaining classes strictly for TODAY
    const [todaysRemainingClasses, setTodaysRemainingClasses] = useState([]);
    const [activeCardIndex, setActiveCardIndex] = useState(0);

    // Modal States
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateInfo, setUpdateInfo] = useState({ version: '', url: '' });
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [deleteTimetable, setDeleteTimetable] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);

    const actions = [
        { text: 'Notices', position: 1, icon: 'megaphone', navigate: 'Notice' },
        { text: 'Timetable', position: 2, icon: 'calendar', navigate: 'Timetable' },
        { text: 'Faculty', position: 3, icon: 'people', navigate: 'Faculty' },
        { text: 'What\'s New', position: 4, icon: 'build', navigate: 'Whatsnew' },
        { text: 'Ask ArsdSaathi', position: 5, icon: 'chatbubbles', navigate: 'Faq' }
    ];

    const CustomFAB = ({ actions, theme }) => {
        const [isOpen, setIsOpen] = useState(false);
        const insets = useSafeAreaInsets();
        const bottomPadding = Math.max(insets.bottom + 20, 30); 

        return (
            <>
                {isOpen && (
                    <View style={styles.backdrop}>
                        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
                            <View style={{ flex: 1 }} />
                        </TouchableWithoutFeedback>
                    </View>
                )}

                <View style={[styles.fabContainer, { bottom: bottomPadding }]}>
                    {isOpen && (
                        <Animatable.View animation="fadeInUp" duration={200} style={styles.fabActionsContainer}>
                            {actions.map((action) => (
                            <TouchableOpacity
                                key={action.navigate}
                                style={styles.fabActionRow}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setIsOpen(false);
                                    navigation.navigate(action.navigate);
                                }}
                            >
                                <View style={[styles.fabLabel, { backgroundColor: theme.card }]}>
                                    <Text style={[styles.fabLabelText, { color: theme.text }]}>{action.text}</Text>
                                </View>
                                <View style={[styles.fabMiniIcon, { backgroundColor: theme.card }]}>
                                    <Ionicons name={action.icon || "ellipse"} size={20} color={theme.primary} />
                                </View>
                            </TouchableOpacity>
                        ))}
                        </Animatable.View>
                    )}

                    <TouchableOpacity
                        style={[styles.fabMain, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                        activeOpacity={0.8}
                        onPress={() => setIsOpen(!isOpen)}
                    >
                        <Animatable.View transition="rotate" duration={500} style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>
                            <Ionicons name="ellipsis-vertical" size={30} color={theme.background} />
                        </Animatable.View>
                    </TouchableOpacity>
                </View>
            </>
        );
    };

    const parseTimeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
        return hours * 60 + minutes;
    };

    // Returns an array of TODAY's remaining classes. If nothing left, returns []
    const getTodaysRemainingClasses = (timetableData) => {
        if (!timetableData) return [];

        const now = new Date();
        const currentDay = now.getDay(); // 0 is Sun, 1 is Mon
        
        if (currentDay === 0) return []; // Sunday = totally free

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const todayClasses = timetableData[currentDay - 1] || [];
        
        if (todayClasses.length === 0) return [];

        // Sort chronologically
        const sorted = [...todayClasses].sort((a, b) => parseTimeToMinutes(a.slot) - parseTimeToMinutes(b.slot));

        // Filter out classes that ended >10 mins ago
        return sorted.filter(cls => {
            const classTimeMins = parseTimeToMinutes(cls.slot);
            return classTimeMins > (currentMinutes - 10);
        });
    };

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
                setNextSync(formatTimestamp(Number(timestampRaw)+(2 * 24 * 60 * 60 * 1000)));
            }
            if (creds) setSavedCredentials(creds);

            if (basic || creds) {
                setUserData({
                    name: basic?.name || creds?.name || "Student",
                    rollNo: basic?.rollNo || creds?.rollNo || "N/A",
                    enrollmentNumber: basic?.enrollmentNumber || "N/A",
                    percent_attendance: att?.theory_percentage || 0,
                    mentor_name: mentor?.mentor.split(")")?.[1]?.trim() || "N/A"
                });
            }

            if (timetableRaw) {
                const parsedTimetable = JSON.parse(timetableRaw);
                const remainingToday = getTodaysRemainingClasses(parsedTimetable);
                setTodaysRemainingClasses(remainingToday);
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
                    await AsyncStorage.multiRemove(['USER_CREDENTIALS', 'BASIC_DETAILS', 'ATTENDANCE_DATA','FACULTY_DATA', 'MENTOR_DATA', 'DATA_TIMESTAMP']);
                    Alert.alert(
                        "App Updated 🚀",
                        "We've upgraded how attendance is tracked. Please log in again to sync your new data.",
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

    useEffect(() => {
        fetch(DEV_MESSAGE_URL + "?t=" + Date.now())
        .then(res => res.json())
        .then(json => setDevMessage(json))
        .catch(err => console.log("Dev Message Fetch Error: ", err));
    }, []);

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

    const handleLogout = () => setShowLogoutModal(true);

    const executeLogout = async () => {
        try {
            const keysToRemove = ['SAVED_NOTICES', 'USER_CREDENTIALS', 'BASIC_DETAILS', 'ATTENDANCE_DATA', 'FACULTY_DATA', 'MENTOR_DATA', 'LOGIN_TIMESTAMP', 'DATA_TIMESTAMP'];
            if (deleteTimetable) keysToRemove.push('TIMETABLE_DATA');

            await AsyncStorage.multiRemove(keysToRemove);
            setShowLogoutModal(false);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const handleCarouselScroll = (event) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const cardSlotWidth = CARD_WIDTH + CARD_GAP;
        const currentIndex = Math.round(scrollPosition / cardSlotWidth);
        setActiveCardIndex(currentIndex);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            setIsSyncing(true)
            await loadData();
            await validateDataStructure();
        } catch (error) {
            console.error("Failed to refresh dashboard:", error);
        } finally {
            setRefreshing(false);
        }
    }, [loadData, validateDataStructure]);

    const isAttendanceLow = Number(userData.percent_attendance) < 67;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
                        
            {/* THEME MODAL */}
            <Modal visible={showThemeModal} transparent animationType="fade" onRequestClose={() => setShowThemeModal(false)}>
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPressOut={() => setShowThemeModal(false)}>
                    <View style={[styles.modalListContainer, { backgroundColor: theme.background, width:'85%' }]}>
                        <Text style={[styles.modalListHeader, { color: theme.text, backgroundColor: theme.card }]}>Select Theme: </Text>
                        <ScrollView style={{ maxHeight: 350 }}>
                            {Object.keys(Colors).map((name, index) => (
                                <TouchableOpacity key={name} style={[styles.dropdownItem, {backgroundColor: themeName === name ? theme.card+'70' : theme.background}]} onPress={() => setThemeName(name)}>
                                    <Animatable.Text style={{ fontSize:18, color: themeName === name ? theme.primary : theme.text, fontWeight: themeName === name ? '800' : '500'}} animation='fadeInUp' duration={300} delay={index*50} useNativeDriver>{name}</Animatable.Text>
                                    {themeName === name && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
                    
            {/* UPDATE MODAL */}
            <Modal animationType="fade" transparent={true} visible={showUpdateModal} onRequestClose={() => setShowUpdateModal(false)} statusBarTranslucent={true}>
                <TouchableOpacity style={styles.modalBackdropCenter} onPressOut={()=>setShowUpdateModal(false)} activeOpacity={1}>
                    <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
                        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                            <View style={[styles.modalIconContainer, { backgroundColor: theme.background + '70' }]} importantForAccessibility="no-hide-descendants">
                                <Ionicons name="rocket" size={36} color={theme.primary} />
                            </View>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Update Available!</Text>
                            <Text style={[styles.modalText, { color: theme.secondary }]}>Version {updateInfo.version} is ready. We&apos;ve crushed some bugs and added improvements.</Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={[styles.modalButtonPrimary, { backgroundColor: theme.primary }]} onPress={() => { Linking.openURL(updateInfo.url); setShowUpdateModal(false); }}>
                                    <Ionicons name="download-outline" size={18} color={theme.background} style={{marginRight: 6}} />
                                    <Text style={[styles.modalButtonPrimaryText, {color:theme.background}]}>Update Now</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.separator }]} onPress={() => Linking.openURL(CHANGELOG_URL)}>
                                    <Text style={[styles.modalButtonSecondaryText, { color: theme.text }]}>What&apos;s New</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={{ marginTop: 15, paddingVertical: 5 }} onPress={() => setShowUpdateModal(false)}>
                                    <Text style={{ color: theme.secondary, fontSize: 13, fontWeight: '500' }}>Not Now</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
                                
            {/* LOGOUT MODAL */}
            <Modal animationType="fade" transparent={true} visible={showLogoutModal} onRequestClose={() => setShowLogoutModal(false)} statusBarTranslucent={true}>
                <TouchableOpacity style={styles.modalBackdropCenter} activeOpacity={1}>
                    <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
                        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                            <View style={[styles.modalIconContainer, { backgroundColor: theme.error + '20' }]} importantForAccessibility="no-hide-descendants">
                                <Ionicons name="alert" size={36} color={theme.error} />
                            </View>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Are you sure?</Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={{flexDirection:'row', gap:7, alignItems: 'center'}} onPress={() => setDeleteTimetable(!deleteTimetable)} activeOpacity={1}>
                                    <CheckBox value={deleteTimetable} onValueChange={setDeleteTimetable} color={deleteTimetable ? theme.primary : undefined} />
                                    <Text style={[styles.modalText, { color: theme.secondary, marginBottom: 0 }]}>Delete my Timetable</Text>
                                </TouchableOpacity>
                                <View style={[styles.modalActions, {marginTop: 25}]}>
                                    <TouchableOpacity style={[styles.modalButtonPrimary, { backgroundColor: theme.error }]} onPress={executeLogout}>
                                        <Ionicons name="log-out-outline" size={18} color='#FFF' style={{marginRight: 6}} />
                                        <Text style={[styles.modalButtonPrimaryText, {color:'#FFF'}]}>Logout</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.modalButtonSecondary, { borderColor: theme.primary }]} onPress={() => setShowLogoutModal(false)}>
                                        <Text style={[styles.modalButtonSecondaryText, { color: theme.text }]}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
                                
            {isSyncing && savedCredentials && (
                <ArsdScraper credentials={savedCredentials} onProgress={(msg) => console.log("Background Sync:", msg)} onFinish={handleSyncCompletion} onError={handleSyncError} />
            )}

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.primary]}          // Android spinner track color
                        tintColor={theme.primary}         // iOS spinner color
                    />
                }
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={{flex: 1}}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Image style={styles.collegeLogo} source={require("@/assets/images/arsdlogo.png")} />
                            <Text style={[styles.appName, { color: theme.primary }]} numberOfLines={1}>ArsdSaathi</Text>
                            {isSyncing && <ActivityIndicator size="small" color={theme.primary} />}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                            <Ionicons name="time-outline" size={12} color={theme.secondary} />
                            <Text style={{ fontSize: 12, color: theme.secondary, fontWeight: '500' }}>Next Sync on: {nextSync}</Text>
                        </View>
                    </View>
            
                    <View style={styles.topIconContainer}>
                        <TouchableOpacity onPress={()=>setShowThemeModal(true)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                            <Ionicons name='color-palette' size={25} color={theme.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogout} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                            <Ionicons name='log-out-outline' size={25} color={theme.error} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* DEVS MESSAGE */}
                { devMessage && devMessage.show &&
                    <Animatable.View animation="fadeInDown" duration={600} useNativeDriver style={[styles.devCard, { backgroundColor: theme.error + '10', borderColor: theme.error + '30' }]}>
                        <View style={styles.textContainer}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Ionicons name="megaphone" size={18} color={theme.error} style={{ marginRight: 6 }} />
                                <Text style={[styles.devMessageTitle, { color: theme.error, marginBottom: 0 }]}>Message From The Devs</Text>
                            </View>
                            <Text style={[styles.devMessageDesc, { color: theme.secondary }]}>{devMessage.message}</Text>
                        </View>
                    </Animatable.View>
                }
            
                {/* Dashboard Hero */}
                <View style={[styles.heroContainer, { backgroundColor: theme.primary, borderColor: theme.primary+'50' }]}>
                    <View style={styles.heroMainRow}>
                        <View style={styles.heroTextContent}>
                            <Text style={[styles.heroValue, { color: theme.card }]}> - {userData.rollNo}</Text>
                            <Text style={[styles.heroLabel, { color: theme.card + 'BB' }]}>{userData.enrollmentNumber}</Text>
                        </View>
                    </View>        
                    <View style={[styles.heroDivider, { backgroundColor: theme.separator }]} />
                
                    <View style={styles.extraColumn}>
                        <View style={styles.mentorRow}>
                            <Ionicons name="person-outline" size={18} color={theme.card} />
                            <View style={{marginLeft: 12, flex: 1}}>
                                <Text style={[styles.mentorLabel, { color: theme.card + 'BB' }]}>Assigned Mentor</Text>
                                <Text style={[styles.mentorName, { color: theme.card }]}>{userData.mentor_name}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ATTENDANCE */}
                <TouchableOpacity style={[styles.heroContainer, { backgroundColor: isAttendanceLow ? theme.error+'1A' : theme.success+'20', borderColor: isAttendanceLow ? theme.error : theme.success }]} activeOpacity={.5} onPress={()=>navigation.navigate('Attendance')}>
                    <View style={styles.heroMainRow}>
                        <View style={[styles.heroIconBox, { backgroundColor: isAttendanceLow ? theme.error : theme.success }]}>
                            <Ionicons name="pie-chart" size={25} color='#FFF' />
                        </View>
                        <View style={styles.heroTextContent}>
                            <Text style={[styles.heroValue, { color: theme.text }]}>{userData.percent_attendance}%</Text>
                            <Text style={[styles.heroLabel, { color: theme.secondary }]}>Theory Attendance</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={30} color={theme.text} />
                    </View>
                    {isAttendanceLow && <Text style={[styles.warningText, { color: theme.error }]}>* Below 67%.</Text>}
                </TouchableOpacity>

                {/* --- HORIZONTAL SWIPEABLE DECK --- */}
                {todaysRemainingClasses.length > 0 && (
                    <View style={styles.carouselSectionWrapper}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={CARD_WIDTH + CARD_GAP}
                            decelerationRate="fast"
                            contentContainerStyle={{ paddingRight: 20 }}
                            onScroll={handleCarouselScroll}
                            scrollEventThrottle={16}
                        >
                            {todaysRemainingClasses.map((clsItem, idx) => {
                                const isCurrentActive = (idx === activeCardIndex);
                                
                                return (
                                    <TouchableOpacity 
                                        key={clsItem.slot + idx}
                                        onPress={() => navigation.navigate('Timetable')} 
                                        style={[
                                            styles.heroContainer, 
                                            styles.carouselCardInstance, 
                                            { 
                                                width: CARD_WIDTH,
                                                marginRight: idx === todaysRemainingClasses.length - 1 ? 0 : CARD_GAP,
                                                backgroundColor: theme.card, 
                                                borderColor: isCurrentActive ? theme.primary : theme.separator 
                                            }
                                        ]} 
                                        activeOpacity={0.8}
                                    >
                                        {/* Screenshot Top Row Layout */}
                                        <View style={styles.cardHeaderRow}>
                                            <View style={[styles.screenshotPill, { backgroundColor: theme.background }]}>
                                                <Ionicons name="time" size={13} color={theme.primary} style={{ marginRight: 5 }} />
                                                <Text style={[styles.screenshotPillText, { color: theme.text }]}>
                                                    {clsItem.slot}
                                                </Text>
                                            </View>
											{clsItem.label && (
                                            <View style={[styles.metaBadge, { backgroundColor: theme.error + '20', alignSelf: 'flex-start' }]}>
                                                <Ionicons name="alert-circle" size={12} color={theme.error} />
                                                <Text style={[styles.metaText, { color: theme.error }]}>{clsItem.label}</Text>
                                            </View>
                                        )}
                                        </View>

                                        <Text style={[styles.mainCardSubject, { color: theme.text }]} numberOfLines={2}>
                                            {clsItem.subject}
                                        </Text>
                                        
                                        <View style={[styles.nextClassMetaRow, { flexWrap: 'wrap' }]}>
                                            <View style={[styles.metaBadge, { backgroundColor: theme.background + '80' }]}>
                                                <Ionicons name="location" size={12} color={theme.secondary} />
                                                <Text style={[styles.metaText, { color: theme.secondary }]}>Room {clsItem.room || 'N/A'}</Text>
                                            </View>
                                            <View style={[styles.metaBadge, { backgroundColor: theme.background + '80' }]}>
                                                <Ionicons name="hourglass-outline" size={12} color={theme.secondary} />
                                                <Text style={[styles.metaText, { color: theme.secondary }]}>{clsItem.duration} Hr {clsItem.type || ''}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {todaysRemainingClasses.length > 1 && (
                            <View style={styles.paginationIndicatorRow}>
                                {todaysRemainingClasses.map((_, dotIdx) => {
                                    const isDotActive = (dotIdx === activeCardIndex);
                                    return (
                                        <View 
                                            key={'dot-' + dotIdx} 
                                            style={[
                                                styles.pagerDot, 
                                                {
                                                    backgroundColor: isDotActive ? theme.primary : theme.separator,
                                                    width: isDotActive ? 24 : 6
                                                }
                                            ]} 
                                        />
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}
            
                {/* Footer Section */}
                <View style={[styles.footerContainer, { backgroundColor: theme.card }]}>
                    <View style={styles.footerGrid}>
                        <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(STUDENT_PORTAL_URL)}><Text style={[styles.footerLink, { color: theme.footer }]}>Official Portal</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(SAMARTH_URL)}><Text style={[styles.footerLink, { color: theme.footer }]}>Samarth eGov</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(FEES_PORTAL_URL)}><Text style={[styles.footerLink, { color: theme.footer }]}>Fee Payment</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(FEE_STRUCTURE_URL)}><Text style={[styles.footerLink, { color: theme.footer }]}>Fee Structure</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(LIBRARY_URL)}><Text style={[styles.footerLink, { color: theme.footer }]}>Library</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(SOCIETIES_URL)}><Text style={[styles.footerLink, { color: theme.footer }]}>Societies</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(HANDBOOK_URL)}><Text style={[styles.footerLink, { color: theme.footer }]}>Handbook</Text></TouchableOpacity>
                    </View>
                    <View style={[styles.footerDivider, { backgroundColor: theme.separator }]} />
                    <View style={styles.footerLegal}>
                        <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}><Text style={[styles.footerLegalText, { color: theme.footer }]}>Terms & Conditions</Text></TouchableOpacity>
                        <Text style={{color: theme.separator}}>•</Text>
                        <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}><Text style={[styles.footerLegalText, { color: theme.footer }]}>Privacy Policy</Text></TouchableOpacity>
                    </View>
                    <View style={[styles.footerLegal, {marginTop: 15}]}>
                        <TouchableOpacity style={styles.footerItem} onPress={() => handleFeedback()}><Text style={[styles.footerLink, { color: theme.footer }]}>Report an Issue?</Text></TouchableOpacity>
                    </View>
                </View>
            
                <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4, marginTop:20}}>
                    <Text style={{ color: theme.secondary, fontSize:15}}>Developed by</Text>
                    <TouchableOpacity onPress={()=>Linking.openURL(KESHAV_URL)}><Text style={{ color: theme.primary, fontWeight: 'bold', fontSize:15 }}>Keshav Pal</Text></TouchableOpacity>
                </View>
                <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4}}>
                    <Text style={{ color: theme.secondary, fontSize:13}}>with</Text>
                    <TouchableOpacity onPress={()=>Linking.openURL(SHIVAM_URL)}><Text style={{ color: theme.primary, fontWeight: 'bold', fontSize:13 }}>Shivam Yadav</Text></TouchableOpacity>
                </View>
            </ScrollView>
            <CustomFAB actions={actions} theme={theme} />
        </SafeAreaView>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },

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

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    topIconContainer: { flexDirection: 'row', gap: 20 },
    appName: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    collegeLogo: {width: 40, height: 40},

    devCard: { flexDirection: 'row', padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'flex-start', marginBottom: 25 },
    textContainer: { flex: 1, justifyContent: 'center' },
    devMessageTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    devMessageDesc: { fontSize: 14,lineHeight: 22,fontWeight: '500' },
    
    heroContainer: { borderRadius: 10, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, marginBottom: 20, borderWidth: 1, overflow:'hidden' },
    heroMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    heroTextContent: { flex: 1, justifyContent: 'center' },
    heroValue: { fontSize: 20, fontWeight: '900', letterSpacing: -1 },
    heroLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
    warningText: { fontSize: 12, fontWeight: '600', marginTop: 10, fontStyle: 'italic' },
    heroDivider: { height: 2, width: '100%', marginVertical:20 },

    mentorRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    mentorLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5},
    mentorName: { fontSize: 17, fontWeight: '800' },
    extraColumn: {flexDirection: 'row', justifyContent: 'space-between', width: '100%'},

    // --- CAROUSEL STYLES ---
    carouselSectionWrapper: {
        marginBottom: 20,
    },
    carouselCardInstance: {
        borderRadius: 10,     
        padding: 15,
        borderWidth: 1.5,     
        marginBottom: 5,      // Replaced by wrapper's bottom margin
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    screenshotPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 5,
        borderRadius: 10,
    },
    screenshotPillText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    mainCardSubject: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 5,
    },
    nextClassMetaRow: { flexDirection: 'row', gap: 10 },
    metaBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
    metaText: { fontSize: 12, fontWeight: '700' },

    paginationIndicatorRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
        gap: 6,
    },
    pagerDot: {
        height: 6,
        borderRadius: 3,
    },

    footerContainer: { borderRadius: 24, padding: 20, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    footerGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 15 },
    footerItem: { width: '50%', alignItems: 'center' },
    footerLink: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
    footerDivider: { height: 1, width: '100%', marginVertical: 16 },
    footerLegal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    footerLegalText: { fontSize: 11, fontWeight: '500' },

    modalListContainer: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalListHeader: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', padding: 16 },
    dropdownItem: { paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap:5 },

    fabContainer: { position: 'absolute', right: 20, alignItems: 'flex-end', zIndex: 999 },
    fabActionsContainer: { marginBottom: 15, alignItems: 'flex-end', gap: 12 },
    fabActionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    fabLabel: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    fabLabelText: { fontSize: 14, fontWeight: '700' },
    fabMiniIcon: { width: 40, height: 40, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    fabMain: { width: 50, height: 50, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 998, elevation: 10 },
});