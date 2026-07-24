import { CHANGELOG_URL, DEV_MESSAGE_URL, GENERATE_PASSWORD_URL, PRIVACY_URL, TERMS_URL } from '@/constants/links';
import { Colors } from "@/constants/themeStyle";
import ArsdScraper from '@/services/ArsdScraper';
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from 'react-native-toast-message';
import OfflineBanner from '@/components/NoInternet';

const { height } = Dimensions.get("window");

const handleFeedback = () => Linking.openURL(`mailto:arsdsaathi.help@gmail.com?subject=ArsdSaathi Feedback&body=Name: \nRoll Number: \nScreenshots: \n\nIssue/Feedback: `);

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

  const isReadyToSync = roll.length > 0 && fullName.length > 0 && passw.length > 0 && consentGiven;

  const handleLogin = () => {
    Keyboard.dismiss();
    if (!roll || !fullName || !passw) return Toast.show({position: 'top', topOffset:50, type:'success', text1:'Missing Fields!', text2: 'Please fill in all details.', props: {borderColor: Colors.Default.error, bg: Colors.Default.card, text1Color: Colors.Default.error, text2Color: Colors.Default.secondary}});
    setProgressMsg("Connecting to ARSD Portal..."); 
    setIsScraping(true);
  };

  const handleCompletion = async (status) => {
    if (status === "DONE") {
      setProgressMsg("Sync Complete!"); 
      const now = Date.now().toString();
      await AsyncStorage.multiSet([["LOGIN_TIMESTAMP", now], ["DATA_TIMESTAMP", now]]);
      setTimeout(() => { setIsScraping(false); navigation.reset({ index: 0, routes: [{ name: "Home" }] }); }, 800);
    }
  };

  const handleError = () => { 
    setIsScraping(false); 
    Alert.alert("Connection Failed", "Possible reasons:\n1. Wrong credentials\n2. Poor internet\n3. Portal down"); 
  };

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/KshavCode/arsd-saathi-app/releases/latest'); 
        if (!res.ok) return;
        const data = await res.json(); 
        const latestVersion = data.tag_name.replace('v', '');
        if (latestVersion !== Constants.expoConfig.version) { 
          setUpdateInfo({ version: latestVersion, url: data.assets?.[0]?.browser_download_url || data.html_url }); 
          setShowUpdateModal(true); 
        }
      } catch (err) { console.log("Update check failed:", err); }
    }; 
    checkForUpdates();
  }, []);

  useEffect(() => { 
    fetch(DEV_MESSAGE_URL + "?t=" + Date.now()).then(res => res.json()).then(setDevMessage).catch(console.log); 
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FC" />
      
      <Modal animationType="fade" transparent visible={showUpdateModal} onRequestClose={() => setShowUpdateModal(false)} statusBarTranslucent accessibilityViewIsModal={true}>
        <TouchableOpacity style={styles.modalBackdrop} onPressOut={() => setShowUpdateModal(false)} activeOpacity={1} accessibilityRole="button" accessibilityLabel="Dismiss update modal">
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalIconBox} importantForAccessibility="no-hide-descendants"><Ionicons name="rocket" size={32} color={Colors.Default.primary} /></View>
            <Text style={styles.modalTitle} accessibilityRole="header">Update Available!</Text>
            <Text style={styles.modalText}>Version {updateInfo.version} is ready with bug fixes and improvements.</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => { Linking.openURL(updateInfo.url); setShowUpdateModal(false); }} accessibilityRole="button" accessibilityLabel="Download and install update">
              <Ionicons name="download-outline" size={18} color="#FFF" style={{marginRight: 6}} importantForAccessibility="no" />
              <Text style={styles.btnTextLight} importantForAccessibility="no">Update Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => Linking.openURL(CHANGELOG_URL)} accessibilityRole="link" accessibilityLabel="Read what's new in this version">
              <Text style={styles.btnTextDark}>What's New</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{marginTop: 15, padding: 5}} onPress={() => setShowUpdateModal(false)} accessibilityRole="button" accessibilityLabel="Remind me later">
              <Text style={styles.textMuted}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <SafeAreaView>
            <View style={styles.heroSection} importantForAccessibility="no-hide-descendants">
              <View style={styles.logoWrapper}>
                <Image source={require("../assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
              </View>
            </View>

            {devMessage && devMessage.show && (
              <View style={styles.devCard} accessible={true} accessibilityRole="alert" accessibilityLabel={`Developer Note: ${devMessage.message}`}>
                <Ionicons name="megaphone" size={20} color={Colors.Default.error} style={{marginRight: 10}} importantForAccessibility="no" />
                <View style={{flex: 1}} importantForAccessibility="no-hide-descendants">
                  <Text style={styles.devTitle}>Developer Note</Text>
                  <Text style={styles.devDesc}>{devMessage.message}</Text>
                </View>
              </View>
            )}

            <View style={styles.formCard}>
              <View style={styles.inputWrap}>
                <Ionicons name="id-card-outline" size={20} color="#8E9EAF" style={styles.inputIcon} importantForAccessibility="no" />
                <TextInput style={styles.input} placeholder="Roll No. (23/380XX)" placeholderTextColor="#8E9EAF" value={roll} onChangeText={setRoll} autoCapitalize="none" accessibilityLabel="College Roll Number" accessibilityHint="Enter your college roll number" />
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={20} color="#8E9EAF" style={styles.inputIcon} importantForAccessibility="no" />
                <TextInput style={styles.input} placeholder="Full Name (As on ID Card)" placeholderTextColor="#8E9EAF" value={fullName} onChangeText={setFullName} accessibilityLabel="Full Name" accessibilityHint="Enter your full name exactly as it appears on your ID card" />
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="key-outline" size={20} color="#8E9EAF" style={styles.inputIcon} importantForAccessibility="no" />
                <TextInput style={styles.input} placeholder="Portal Password" placeholderTextColor="#8E9EAF" value={passw} onChangeText={setPassw} keyboardType="default" secureTextEntry accessibilityLabel="Portal Password" accessibilityHint="Enter your college portal password" />
              </View>
              <TouchableOpacity style={{marginBottom: 15, marginLeft:10, marginTop:-10}} onPress={() => Linking.openURL(GENERATE_PASSWORD_URL)} accessibilityRole="link" accessibilityLabel="Need to generate a password? Opens in web browser.">
                <Text style={styles.linkText} importantForAccessibility="no">Generate Password?</Text>
              </TouchableOpacity>
              
              {!isScraping && (
                <TouchableOpacity style={styles.consentWrap} onPress={() => setConsentGiven(!consentGiven)} activeOpacity={0.7} accessibilityRole="checkbox" accessibilityState={{ checked: consentGiven }} accessibilityLabel="I agree to the Terms and Privacy Policy">
                  <Ionicons name={consentGiven ? "checkmark-circle" : "ellipse-outline"} size={22} color={consentGiven ? Colors.Default.primary : "#CBD5E1"} style={{marginRight: 10}} importantForAccessibility="no" />
                  <Text style={styles.consentText} importantForAccessibility="no">I agree to the <Text style={styles.linkText} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text> & <Text style={styles.linkText} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy</Text></Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.actionWrap}>
                {isScraping ? (
                  <View style={styles.loaderWrap} accessible={true} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }} accessibilityLabel={`Sync in progress. ${progressMsg}`}>
                    <ActivityIndicator size="large" color={Colors.Default.primary} importantForAccessibility="no" />
                    <Text style={styles.loaderText} importantForAccessibility="no">{progressMsg}</Text>
                    <ArsdScraper credentials={{ name: fullName, rollNo: roll, passw: passw }} onProgress={setProgressMsg} onFinish={handleCompletion} onError={handleError} />
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.submitBtn, !isReadyToSync && {backgroundColor: '#CBD5E1', elevation: 0}]} onPress={handleLogin} disabled={!isReadyToSync} accessibilityRole="button" accessibilityState={{ disabled: !isReadyToSync }} accessibilityLabel="Connect Account" accessibilityHint="Logs you in and syncs your college data">
                    <Text style={styles.submitText} importantForAccessibility="no">Connect Account</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" importantForAccessibility="no" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.helpSection} accessible={true} accessibilityLabel="Login Issues? First, try your first name in capitals as the password. Second, visit the admin office for portal modifications.">
              <Text style={styles.helpTitle} importantForAccessibility="no">Login Issues?</Text>
              <Text style={styles.helpText} importantForAccessibility="no">• Try your FIRST NAME IN CAPITALS as the password.</Text>
              <Text style={styles.helpText} importantForAccessibility="no">• Visit the admin office for portal modifications.</Text>
              <TouchableOpacity onPress={handleFeedback} style={styles.bugBtn} accessibilityRole="button" accessibilityLabel="Report a login issue via email">
                <Ionicons name="bug-outline" size={16} color="#64748B" importantForAccessibility="no" />
                <Text style={styles.bugText} importantForAccessibility="no">Report an Issue</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
      <OfflineBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FC" },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 5 },
  heroSection: { alignItems: "center", marginTop: height * 0.05, marginBottom:20 },
  logoWrapper: { width: 85, height: 85, backgroundColor: "#FFF", borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 0, elevation: 8, shadowColor: Colors.Default.primary, shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: {width: 0, height: 8} },
  logo: { width: "70%", height: "70%" },
  devCard: { flexDirection: "row", backgroundColor: "#FEF2F2", padding: 10, borderRadius: 5, borderWidth: 1, borderColor: "#FECACA", marginBottom: 20 },
  devTitle: { fontSize: 14, fontWeight: "700", color: "#991B1B", marginBottom: 4 },
  devDesc: { fontSize: 13, color: "#7F1D1D", lineHeight: 18 },
  formCard: { backgroundColor: "#FFF", borderRadius: 28, padding: 24, elevation: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: {width: 0, height: 10}, marginBottom: 25 },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#F1F5F9", borderRadius: 16, height: 56, marginBottom: 16, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: "#0F172A", fontWeight: "500", height: "100%" },
  consentWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 7, backgroundColor: "#F8FAFC", borderRadius: 14 },
  consentText: { flex: 1, fontSize: 13, color: '#64748B' },
  linkText: { color: Colors.Default.primary, fontWeight: '700' },
  actionWrap: { minHeight: 60, justifyContent: 'center' },
  submitBtn: { backgroundColor: Colors.Default.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 56, borderRadius: 16, elevation: 6, shadowColor: Colors.Default.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: {width: 0, height: 5} },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "700", marginRight: 8 },
  loaderWrap: { alignItems: "center", gap: 10, paddingVertical: 10 },
  loaderText: { fontSize: 14, color: Colors.Default.primary, fontWeight: "700" },
  helpSection: { paddingHorizontal: 10 },
  helpTitle: { fontSize: 16, fontWeight: "700", color: "#334155", marginBottom: 10 },
  helpText: { fontSize: 13, color: "#64748B", lineHeight: 22 },
  bugBtn: { flexDirection: "row", alignItems: "center", marginTop: 15, paddingVertical: 8 },
  bugText: { fontSize: 13, color: "#64748B", fontWeight: "600", marginLeft: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: "#FFF", borderRadius: 28, padding: 28, alignItems: 'center', elevation: 15 },
  modalIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#EEF2FF", alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: "#0F172A", marginBottom: 10 },
  modalText: { fontSize: 15, textAlign: 'center', color: "#64748B", lineHeight: 22, marginBottom: 25 },
  btnPrimary: { flexDirection: 'row', width: '100%', backgroundColor: Colors.Default.primary, paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnTextLight: { fontSize: 16, fontWeight: '700', color: "#FFF" },
  btnSecondary: { width: '100%', paddingVertical: 15, borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", alignItems: 'center', justifyContent: 'center' },
  btnTextDark: { fontSize: 15, fontWeight: '700', color: "#334155" },
  textMuted: { color: "#94A3B8", fontSize: 14, fontWeight: '600' }
});