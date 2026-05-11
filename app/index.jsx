import AdsScroll from '@/components/Ads';
import { ADS_URL, CHANGELOG_URL, DEV_MESSAGE_URL, GENERATE_PASSWORD_URL, PRIVACY_URL, TERMS_URL } from '@/constants/links';
import { Colors } from "@/constants/themeStyle";
import ArsdScraper from '@/services/ArsdScraper';
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";


const handleFeedback = () => {
    const email = "arsdsaathi.help@gmail.com";
    const subject = `ArsdSaathi Feedback`;
    const body = "Name: \nRoll Number: \nScreenshots: \n\nIssue/Feedback: ";
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default function Login({ navigation }) {
    const [roll, setRoll] = useState("");
    const [fullName, setFullName] = useState("");
    const [passw, setPassw] = useState("");
    const [consentGiven, setConsentGiven] = useState(false);
    const [isScraping, setIsScraping] = useState(false);
    const [progressMsg, setProgressMsg] = useState("");
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [devMessage, setDevMessage] = useState(null);
    const [updateInfo, setUpdateInfo] = useState({ version: '', url: '' });
    const [ads, setAds] = useState(null);

    const isReadyToSync = roll.length > 0 && fullName.length > 0 && passw.length > 0 && consentGiven;

    const handleLogin = () => {
        Keyboard.dismiss();
        if (!roll || !fullName || !passw) {
            return;
        }
        setProgressMsg("Connecting to ARSD...");
        setIsScraping(true);
    };

    const handleCompletion = async (status) => {
        if (status === "DONE") {
            setProgressMsg("Sync Complete!");
            const now = Date.now().toString();
            await AsyncStorage.setItem("LOGIN_TIMESTAMP", now);
            await AsyncStorage.setItem("DATA_TIMESTAMP", now);
            setTimeout(() => {
                setIsScraping(false);
                navigation.reset({ index: 0, routes: [{ name: "Home" }] });
            }, 800);
        }
    };

    const handleError = () => {
        setIsScraping(false);
        Alert.alert("Connection Failed", "Possible reasons:\n1. Wrong credentials\n2. Poor internet\n3. Portal is down");
    };

    useEffect(() => {
        const checkForUpdates = async () => {
            try {
                const currentVersion = Constants.expoConfig.version;
                const response = await fetch('https://api.github.com/repos/KshavCode/arsd-saathi-app/releases/latest');
                if (!response.ok) return;
                const data = await response.json();
                const latestVersion = data.tag_name.replace('v', '');
                if (latestVersion !== currentVersion) {
                    setUpdateInfo({ version: latestVersion, url: data.assets?.[0]?.browser_download_url || data.html_url });
                    setShowUpdateModal(true);
                }
            } catch (error) { console.log("Auto-update check failed:", error); }
        };
        checkForUpdates();
    }, []);

    useEffect(() => {
        fetch(DEV_MESSAGE_URL + "?t=" + Date.now()).then(res => res.json()).then(json => setDevMessage(json)).catch(err => console.log("Dev Message Error: ", err));
        fetch(ADS_URL + "?t=" + Date.now()).then(res => res.json()).then(json => setAds(shuffle(json))).catch(err => console.log("Ads Fetch Error: ", err));
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            {/* UPDATE MODAL */}
            <Modal animationType="fade" transparent={true} visible={showUpdateModal} onRequestClose={() => setShowUpdateModal(false)} statusBarTranslucent={true}>
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalContent, { backgroundColor: Colors.Default.card }]}>
                        <View style={[styles.modalIcon, { backgroundColor: Colors.Default.primary + '15' }]}><Ionicons name="rocket" size={32} color={Colors.Default.primary} /></View>
                        <Text style={styles.modalTitle}>Update Available</Text>
                        <Text style={styles.modalText}>Version {updateInfo.version} is here with bug fixes and improvements.</Text>
                        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.Default.primary }]} onPress={() => { Linking.openURL(updateInfo.url); setShowUpdateModal(false); }}>
                            <Text style={styles.modalBtnTextPri}>Download Update</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalBtnSec} onPress={() => Linking.openURL(CHANGELOG_URL)}>
                            <Text style={styles.modalBtnTextSec}>Release Notes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ marginTop: 10, padding: 10 }} onPress={() => setShowUpdateModal(false)}>
                            <Text style={styles.modalBtnTextTer}>Not Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- SCRAPING MODAL --- */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={isScraping}
                    statusBarTranslucent={true}
                    navigationBarTranslucent={true}
                >
                    <View style={styles.scrapeModalBackdrop}>
                        <View style={[styles.scrapeModalContent, { backgroundColor: Colors.Default.card }]}>

                            {/* Ads */}
                            {ads && ads.length > 0 && (
                                <View style={{ width: '100%', marginBottom: 20 }}>
                                    <AdsScroll data={ads} />
                                </View>
                            )}

                            {/* Loader */}
                            <View style={styles.loadingState}>
                                <ActivityIndicator size="large" color={Colors.Default.primary} />
                                <Text style={styles.loadingText}>{progressMsg}</Text>
                            </View>
                        
                            {/* Scraper */}
                            <ArsdScraper
                                credentials={{name: fullName,rollNo: roll,passw: passw}}
                                onProgress={setProgressMsg}
                                onFinish={handleCompletion}
                                onError={handleError}
                            />
                        </View>
                    </View>
                </Modal>

                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
                    
                    <View style={styles.header}>
                        <Text style={[styles.heroTitle, {color:Colors.Default.primary}]}>ArsdSaathi</Text>
                        <Text style={styles.heroSub}>An unofficial, student-developed college app</Text>
                    </View>

                    {devMessage && (
                        <View style={styles.devBanner}>
                            <Ionicons name="megaphone" size={16} color="#B45309" style={{ marginRight: 8 }} />
                            <Text style={styles.devBannerText} numberOfLines={2}>{devMessage.message}</Text>
                        </View>
                    )}

                    <View style={styles.sheet}>
                        <View style={[styles.inputWrap, {backgroundColor:Colors.Default.primary+'10'}]}>
                            <Ionicons name="id-card-outline" size={20} color="#767c85" style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="Roll No. (23/380XX)" placeholderTextColor="#9CA3AF" value={roll} onChangeText={setRoll} autoCapitalize="none" />
                        </View>

                        <View style={[styles.inputWrap, {backgroundColor:Colors.Default.primary+'10'}]}>
                            <Ionicons name="person-outline" size={20} color="#767c85" style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="Full Name (As on ID)" placeholderTextColor="#9CA3AF" value={fullName} onChangeText={setFullName} />
                        </View>

                        <View style={[styles.inputWrap, {backgroundColor:Colors.Default.primary+'10'}]}>
                            <Ionicons name="key-outline" size={20} color="#767c85" style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#9CA3AF" value={passw} onChangeText={setPassw} keyboardType="numbers-and-punctuation" />
                        </View>

                        <View style={styles.passwLinkBox}>
                            <Text style={styles.linkText} onPress={() => Linking.openURL(GENERATE_PASSWORD_URL)}>Generate your password here</Text>
                        </View>

                        {!isScraping && (
                            <View style={styles.consentWrap}>
                                <TouchableOpacity onPress={() => setConsentGiven(!consentGiven)} style={styles.checkBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                                    <Ionicons name={consentGiven ? "checkmark-circle" : "ellipse-outline"} size={25} color={consentGiven ? Colors.Default.primary : "#D1D5DB"} />
                                </TouchableOpacity>
                                <Text style={styles.consentText}>
                                    By selecting &quot;Connect and Sync&quot;, you are confirming that you have read and agree to ArsdSaathi&apos;s <Text style={styles.linkTextBold} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text> & <Text style={styles.linkTextBold} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>.
                                </Text>
                            </View>
                        )}

                        <View style={styles.actionBox}>
                            <TouchableOpacity style={[styles.primaryBtn, !isReadyToSync && styles.primaryBtnDisabled]} onPress={handleLogin} disabled={!isReadyToSync} activeOpacity={0.8}>
                                <Text style={styles.primaryBtnText}>Connect and Sync</Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footerInfo}>
                            <View style={styles.infoLine}><Ionicons name="information-circle" size={16} color="#6B7280" /><Text style={styles.infoText}>Try your FIRST NAME IN CAPITALS, in case you don&apos;t remember the password.</Text></View>
                            <View style={styles.infoLine}><Ionicons name="business" size={16} color="#6B7280" /><Text style={styles.infoText}>Make sure to fill in same details as on College Portal. If error persists, visit the admin office for portal modifications.</Text></View>
                        </View>

                        <TouchableOpacity onPress={handleFeedback} style={styles.feedbackBtn}>
                            <Text style={styles.linkTextBold}>Having trouble? Report an Issue</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    header: { paddingHorizontal: 32, paddingTop:70},
    logoWrap: { width: 60, height: 60, backgroundColor: "#FFF", borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 5, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    heroTitle: { fontSize: 32, fontWeight: "800", color: "#111827", letterSpacing: -0.5 },
    heroSub: { fontSize: 15, color: "#6B7280", marginTop: 6, fontWeight: "500" },
    devBanner: { marginHorizontal: 32, marginBottom: 10, marginTop:20, padding: 12, backgroundColor: "#FEF3C7", borderRadius: 12, flexDirection: "row", alignItems: "center" },
    devBannerText: { fontSize: 13, color: "#92400E", fontWeight: "600", flex: 1 },
    sheet: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 32, paddingTop: 10, paddingBottom: 40 },
    inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 14, height: 52, marginBottom: 16, paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 15, fontWeight: "500" },
    passwLinkBox: { alignItems: "flex-end", marginTop: -8, marginBottom: 24},
    linkText: { fontSize: 13, color: "#4F46E5", fontWeight: "400", textDecorationLine: 'underline' },
    linkTextBold: { color: "#4F46E5", fontWeight: "700", textDecorationLine: "underline" },
    consentWrap: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24, paddingHorizontal: 4 },
    checkBtn: { marginRight: 10 },
    consentText: { fontSize: 13, color: "#4B5563", flex: 1, lineHeight:20 },
    actionBox: { minHeight: 56, justifyContent: "center", marginBottom: 32 },
    primaryBtn: { backgroundColor: Colors.Default.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 56, borderRadius: 16 },
    primaryBtnDisabled: { backgroundColor: "#D1D5DB" },
    primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700", marginRight: 8 },
    loaderWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 56, backgroundColor: "#EEF2FF", borderRadius: 16, gap: 10 },
    loaderText: { fontSize: 14, color: Colors.Default.primary, fontWeight: "600" },
    footerInfo: { backgroundColor: "#F9FAFB", padding: 16, borderRadius: 16, gap: 10, marginBottom: 24 },
    infoLine: { flexDirection: "row", alignItems: "center", gap: 10 },
    infoText: { fontSize: 12, color: "#4B5563", flex: 1, lineHeight: 18 },
    feedbackBtn: { alignItems: "center", paddingVertical: 10 },
    feedbackText: { fontSize: 13, color: "#6B7280", fontWeight: "700", textDecorationLine: "underline" },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center' },
    modalIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, color: '#111827' },
    modalText: { fontSize: 14, textAlign: 'center', color: '#6B7280', marginBottom: 24, lineHeight: 20 },
    modalBtn: { width: '100%', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    modalBtnTextPri: { fontSize: 15, fontWeight: '700', color: '#FFF' },
    modalBtnSec: { width: '100%', height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
    modalBtnTextSec: { fontSize: 15, fontWeight: '600', color: '#374151' },
    modalBtnTextTer: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },

    scrapeModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20},
    scrapeModalContent: { width: '100%', borderRadius: 24, padding: 18, alignItems: 'center', justifyContent: 'center', elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
    loadingState: { alignItems: "center", justifyContent: 'center', gap: 12, width: '100%', paddingVertical: 10 },
    loadingText: { fontSize: 14, color: Colors.Default.primary, fontWeight: "700", textAlign: 'center'},
});