import OfflineBanner from '@/components/NoInternet';
import { CREDITS_JSON_URL, DEV_MESSAGE_URL, FOOTER_JSON_URL, GENERATE_PASSWORD_URL, HELP_EMAIL } from '@/constants/links';
import { Colors } from "@/constants/themeStyle";
import ArsdScraper from '@/services/ArsdScraper';
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import * as Linking from "expo-linking";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from 'react-native-toast-message';

const { height } = Dimensions.get("window");

const handleFeedback = () => Linking.openURL(`mailto:${HELP_EMAIL}subject=ArsdSaathi Feedback&body=Name: \nRoll Number: \nScreenshots: \n\nIssue/Feedback: `);

export default function Login({ navigation }) {
  const [roll, setRoll] = useState(""); 
  const [fullName, setFullName] = useState(""); 
  const [passw, setPassw] = useState("");
  const [consentGiven, setConsentGiven] = useState(false); 
  const [isVerifying, setIsVerifying] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [devMessage, setDevMessage] = useState(null); 
  const [updateInfo, setUpdateInfo] = useState({ version: '', url: '' });
  const [isOffline, setIsOffline] = useState(false);
  const [footerLinks, setFooterLinks] = useState({});
  const [showPassword, setShowPassword] = useState(true)
  const [creditsData, setCreditsData] = useState([])

  const verificationTimeoutRef = useRef(null);
  const loginHandledRef = useRef(false);

  const isReadyToSync = roll.length > 0 && fullName.length > 0 && passw.length > 0 && consentGiven && !isVerifying;

  const handleLogin = async () => {
    Keyboard.dismiss();
    
    if (!roll || !fullName || !passw) {
      return Toast.show({
        position: 'top', 
        topOffset: 50, 
        type: 'success', 
        text1: 'Missing Fields!', 
        text2: 'Please fill in all details.', 
        props: {
          borderColor: Colors.Default.error, 
          bg: Colors.Default.card, 
          text1Color: Colors.Default.error, 
          text2Color: Colors.Default.secondary
        }
      });
    }
    if (isOffline) {
      Alert.alert("No Internet Connection", "Please check your network settings and try again.");
      return;
    }
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setIsOffline(true);
      Alert.alert("No Internet Connection", "Please check your network settings and try again.");
      return;
    }

    loginHandledRef.current = false;
    setProgressMsg("Connecting to ARSD Portal...");
    setIsVerifying(true);

    if (verificationTimeoutRef.current) clearTimeout(verificationTimeoutRef.current);
    verificationTimeoutRef.current = setTimeout(() => {
      if (!loginHandledRef.current) {
        setIsVerifying(false);
        Alert.alert("Connection Timeout", "The portal is taking too long to respond. Please check your internet connection or try again.");
      }
    }, 25000);
  };

  const handleLoginSuccess = async () => {
    if (loginHandledRef.current) return;
    loginHandledRef.current = true;
    if (verificationTimeoutRef.current) clearTimeout(verificationTimeoutRef.current);

    setProgressMsg("Login Verified! Opening Dashboard...");
    const now = Date.now().toString();
    const credentials = { name: fullName, rollNo: roll, passw: passw };
    
    await AsyncStorage.multiSet([
      ["USER_CREDENTIALS", JSON.stringify(credentials)],
      ["LOGIN_TIMESTAMP", now],
      ["DATA_TIMESTAMP", now]
    ]);
    
    setIsVerifying(false);
    navigation.reset({ index: 0, routes: [{ name: "Home", params: { requiresSync: true } }] });
  };

  const handleLoginError = (errorMsg) => {
    if (loginHandledRef.current) return;
    loginHandledRef.current = true;
    if (verificationTimeoutRef.current) clearTimeout(verificationTimeoutRef.current);

    setIsVerifying(false);
    Alert.alert(
      "Login Failed", 
      errorMsg || "Invalid credentials or portal is currently down. Please double-check your Roll No, Full Name, and Password."
    );
  };

  useEffect(() => {
    return () => {
      if (verificationTimeoutRef.current) clearTimeout(verificationTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadFooterLinks = async () => {
      try {
        const res = await fetch(FOOTER_JSON_URL + "?t=" + Date.now(), { timeout: 5000, signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          setFooterLinks(json);
          await AsyncStorage.setItem("FOOTER_LINK", JSON.stringify(json));
          return;
        }
        throw new Error("Network fetch failed");
      } catch (err) {
        if (err.name === 'AbortError') return;
        try {
          const cachedLinks = await AsyncStorage.getItem("FOOTER_LINK");
          if (cachedLinks) setFooterLinks(JSON.parse(cachedLinks));
        } catch (cacheErr) {
          console.log("Failed to load link cache:", cacheErr);
        }
      }
    };
    loadFooterLinks();
    return () => controller.abort();
  }, []);

  useEffect(() => {
      const controller = new AbortController();
      const loadCreditsData = async () => {
        try {
          const res = await fetch(CREDITS_JSON_URL + "?t=" + Date.now(), { timeout: 5000, signal: controller.signal });
          if (res.ok) {
            const json = await res.json();
            setCreditsData(json);
            await AsyncStorage.setItem("CREDITS_DATA", JSON.stringify(json));
            return;
          }
          throw new Error("Network fetch failed");
        } catch (err) {
          if (err.name === 'AbortError') return;
          try {
            const cachedLinks = await AsyncStorage.getItem("CREDITS_DATA");
            if (cachedLinks) setCreditsData(JSON.parse(cachedLinks));
          } catch (cacheErr) {
            console.log("Failed to load link cache:", cacheErr);
          }
        }
      };
      loadCreditsData();
      return () => controller.abort();
    }, []);

  useEffect(() => { 
    const controller = new AbortController();
    fetch(DEV_MESSAGE_URL + "?t=" + Date.now(), { signal: controller.signal })
      .then(res => res.json())
      .then(setDevMessage)
      .catch(err => { if (err.name !== 'AbortError') console.log(err); }); 
    return () => controller.abort();
  }, []);

  const CreditsItem = ({ item, theme }) => {
    if (!item || !item.name) return null;
  
    const handleOpenLink = () => {
      if (!item.link) return;
      let formattedUrl = item.link.trim();
      if (formattedUrl.startsWith('https:') && !formattedUrl.startsWith('https://')) {
        formattedUrl = formattedUrl.replace('https:', 'https://');
      } else if (formattedUrl.startsWith('http:') && !formattedUrl.startsWith('http://')) {
        formattedUrl = formattedUrl.replace('http:', 'http://');
      } else if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      Linking.openURL(formattedUrl).catch((err) => console.log("Failed to open credits link:", err));
    };
  
    return (
      <View style={[ styles.contributorChipWrapper, { width: '48.5%' }]}
        accessible={true}
        accessibilityRole={item.link ? "link" : "text"}
        accessibilityLabel={`${item.name}, ${item.role || 'Contributor'}`}
      >
        <TouchableOpacity
          onPress={handleOpenLink}
          disabled={!item.link}
          activeOpacity={0.5}
          style={[styles.contributorChip, { backgroundColor: theme.background + '80', borderColor: theme.primary + '30', width: '100%'}]}
        >
          <View style={styles.contributorInfo} importantForAccessibility="no-hide-descendants">
            <Text style={[styles.contributorName, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.role ? (
              <View style={[styles.roleBadge, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.roleText, { color: theme.primary }]} numberOfLines={1}>
                  {item.role}
                </Text>
              </View>
            ) : null}
          </View>
          {item.link ? (
            <Ionicons name="open-outline" size={17} color={theme.primary} style={styles.linkIcon} importantForAccessibility="no" />
          ) : null}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FC" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <SafeAreaView>
            <View style={styles.heroSection} importantForAccessibility="no-hide-descendants">
              <View style={styles.logoWrapper}>
                <Image source={require("../assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
              </View>
            </View>

            {devMessage && devMessage.showMessage && (
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
                <TextInput style={styles.input} placeholder="Portal Password" placeholderTextColor="#8E9EAF" value={passw} onChangeText={setPassw} keyboardType="default" secureTextEntry={showPassword} accessibilityLabel="Portal Password" accessibilityHint="Enter your college portal password" />
                <TouchableOpacity onPress={()=>setShowPassword(!showPassword)} style={{height: "70%", width: "10%", alignItems:'center', justifyContent:'center'}}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={25} color={Colors.Default.primary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={{marginBottom: 25, marginLeft:10, marginTop:-5, flexDirection: "row", gap: 5}} onPress={() => Linking.openURL(GENERATE_PASSWORD_URL)} accessibilityRole="link" accessibilityLabel="Need to generate a password? Opens in web browser.">
                <Text style={[styles.linkText, {fontSize: 13}]} importantForAccessibility="no">First Time? Generate your Password?</Text>
                <Ionicons name='open-outline' size={15} color={Colors.Default.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.consentWrap} onPress={() => setConsentGiven(!consentGiven)} activeOpacity={0.6} accessibilityRole="checkbox" accessibilityState={{ checked: consentGiven }} accessibilityLabel="I agree to the Terms and Privacy Policy">
                <Ionicons name={consentGiven ? "checkmark-circle" : "ellipse-outline"} size={22} color={consentGiven ? Colors.Default.primary : "#CBD5E1"} style={{marginRight: 5}} importantForAccessibility="no" />
                <Text style={styles.consentText} importantForAccessibility="no">I agree to the <Text style={styles.linkText} onPress={() => footerLinks.TERMS_URL && Linking.openURL(footerLinks.TERMS_URL)}>Terms</Text> & <Text style={styles.linkText} onPress={() => footerLinks.PRIVACY_URL && Linking.openURL(footerLinks.PRIVACY_URL)}>Privacy</Text></Text>
              </TouchableOpacity>
              
              <View style={styles.actionWrap}>
                {isVerifying ? (
                  <View style={[styles.submitBtn, { opacity: 0.9 }]} accessible={true} accessibilityState={{ busy: true }} accessibilityLabel={`Verifying credentials. ${progressMsg}`}>
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.submitText} importantForAccessibility="no">{progressMsg || "Verifying..."}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.submitBtn, !isReadyToSync && {backgroundColor: '#CBD5E1', elevation: 0}]} onPress={handleLogin} disabled={!isReadyToSync} accessibilityRole="button" accessibilityState={{ disabled: !isReadyToSync }} accessibilityLabel="Connect Account" accessibilityHint="Logs you in and syncs your college data">
                    <Text style={styles.submitText} importantForAccessibility="no">Connect Account</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" importantForAccessibility="no" />
                  </TouchableOpacity>
                )}
              </View>
              {isVerifying && (
                <ArsdScraper 
                  credentials={{ name: fullName, rollNo: roll, passw: passw }} 
                  onProgress={setProgressMsg} 
                  onLoginSuccess={handleLoginSuccess}
                  onFinish={handleLoginSuccess}
                  onError={handleLoginError} 
                />
              )}
            </View>

            <View style={styles.helpSection} accessible={true} accessibilityLabel="Login Issues? First, try your first name in capitals as the password. Second, visit the admin office for portal modifications.">
              <Text style={styles.helpTitle} importantForAccessibility="no">Login Issues?</Text>
              <Text style={styles.helpText} importantForAccessibility="no">Visit the admin office for portal modifications.</Text>
            </View>

        {/* Footer Section */}
        <View style={[styles.footerContainer, { backgroundColor: Colors.Default.card, marginTop: 30 }]}>
          <View style={styles.footerGrid}>
            <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(footerLinks.STUDENT_PORTAL_URL)} accessibilityRole="link"><Text style={[styles.footerLink, { color: Colors.Default.footer }]}>Official Portal</Text></TouchableOpacity>
            <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(footerLinks.SAMARTH_URL)} accessibilityRole="link"><Text style={[styles.footerLink, { color: Colors.Default.footer }]}>Samarth eGov</Text></TouchableOpacity>
            <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(footerLinks.FEES_PORTAL_URL)} accessibilityRole="link"><Text style={[styles.footerLink, { color: Colors.Default.footer }]}>Fee Payment</Text></TouchableOpacity>
            <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(footerLinks.FEE_STRUCTURE_URL)} accessibilityRole="link"><Text style={[styles.footerLink, { color: Colors.Default.footer }]}>Fee Structure</Text></TouchableOpacity>
            <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(footerLinks.LIBRARY_URL)} accessibilityRole="link"><Text style={[styles.footerLink, { color: Colors.Default.footer }]}>Library</Text></TouchableOpacity>
            <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(footerLinks.SOCIETIES_URL)} accessibilityRole="link"><Text style={[styles.footerLink, { color: Colors.Default.footer }]}>Societies</Text></TouchableOpacity>
            <TouchableOpacity style={styles.footerItem} onPress={() => Linking.openURL(footerLinks.HANDBOOK_URL)} accessibilityRole="link"><Text style={[styles.footerLink, { color: Colors.Default.footer }]}>Handbook</Text></TouchableOpacity>
          </View>
          <View style={[styles.footerDivider, { backgroundColor: Colors.Default.separator }]} />
          <View style={styles.footerLegal}>
            <TouchableOpacity onPress={() => Linking.openURL(footerLinks.TERMS_URL)} accessibilityRole="link"><Text style={[styles.footerLegalText, { color: Colors.Default.footer }]}>Terms & Conditions</Text></TouchableOpacity>
            <Text style={{color: Colors.Default.separator}} importantForAccessibility="no">•</Text>
            <TouchableOpacity onPress={() => Linking.openURL(footerLinks.PRIVACY_URL)} accessibilityRole="link"><Text style={[styles.footerLegalText, { color: Colors.Default.footer }]}>Privacy Policy</Text></TouchableOpacity>
          </View>
          <View style={[styles.footerLegal, {marginTop: 15}]}>
            <TouchableOpacity style={styles.footerItem} onPress={() => handleFeedback()} accessibilityRole="button"><Text style={[styles.footerLink, { color: Colors.Default.footer }]}>Report an Issue?</Text></TouchableOpacity>
          </View>
          <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-evenly', marginTop:20}}>
            <TouchableOpacity onPress={()=>Linking.openURL(footerLinks.FACEBOOK_LINK)} accessibilityRole="link" accessibilityLabel="Facebook"><Ionicons name='logo-facebook' size={20} color={Colors.Default.primary} importantForAccessibility="no" /></TouchableOpacity>
            <TouchableOpacity onPress={()=>Linking.openURL(footerLinks.INSTAGRAM_LINK)} accessibilityRole="link" accessibilityLabel="Instagram"><Ionicons name='logo-instagram' size={20} color={Colors.Default.primary} importantForAccessibility="no" /></TouchableOpacity>
            <TouchableOpacity onPress={()=>Linking.openURL(footerLinks.YOUTUBE_LINK)} accessibilityRole="link" accessibilityLabel="YouTube"><Ionicons name='logo-youtube' size={20} color={Colors.Default.primary} importantForAccessibility="no" /></TouchableOpacity>
            <TouchableOpacity onPress={()=>Linking.openURL(footerLinks.X_LINK)} accessibilityRole="link" accessibilityLabel="X, formerly Twitter"><Ionicons name='logo-x' size={20} color={Colors.Default.primary} importantForAccessibility="no" /></TouchableOpacity>
            <TouchableOpacity onPress={()=>Linking.openURL(footerLinks.LINKEDIN_LINK)} accessibilityRole="link" accessibilityLabel="LinkedIn"><Ionicons name='logo-linkedin' size={20} color={Colors.Default.primary} importantForAccessibility="no" /></TouchableOpacity>
          </View>
        </View>
        <View style={[styles.creditsContainer, { backgroundColor: Colors.Default.card, borderColor: Colors.Default.border || Colors.Default.secondary + '25' }]}>
          <View style={styles.creditsHeader}>
            <Text style={[styles.creditsText, { color: "#b61b2d" }]}>ArsdSaathi© v{Constants.expoConfig?.version || '2.0'}</Text>
          </View>
              
          <View style={styles.creditsGrid}>
            {(Array.isArray(creditsData) && creditsData.length > 0 ? creditsData : [
              { name: "Keshav Pal", role: "Developer", link: footerLinks.KESHAV_URL || "https://kshavcode.me" }
            ]).map((credit, idx, arr) => (
              <CreditsItem
                key={`${credit.name}-${idx}`}
                item={credit}
                theme={Colors.Default}
              />
            ))}
          </View>
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
  linkText: { color: Colors.Default.primary, fontWeight: '700', textDecorationLine: 'underline' },
  actionWrap: { minHeight: 60, justifyContent: 'center' },
  submitBtn: { backgroundColor: Colors.Default.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 56, borderRadius: 16, elevation: 6, shadowColor: Colors.Default.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: {width: 0, height: 5} },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "700", marginRight: 8 },
  loaderWrap: { alignItems: "center", gap: 10, paddingVertical: 10 },
  loaderText: { fontSize: 14, color: Colors.Default.primary, fontWeight: "700" },
  helpSection: { paddingHorizontal: 10 },
  helpTitle: { fontSize: 16, fontWeight: "700", color: "#334155" },
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
  textMuted: { color: "#94A3B8", fontSize: 14, fontWeight: '600' },

  footerContainer: { borderRadius: 24, padding: 20, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  footerGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 15 },
  footerItem: { width: '50%', alignItems: 'center' },
  footerLink: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  footerDivider: { height: 1, width: '100%', marginVertical: 16 },
  footerLegal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  footerLegalText: { fontSize: 11, fontWeight: '500' },

  creditsContainer: { marginTop: 32, marginBottom: 20, paddingVertical: 18, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 12 },
  creditsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  creditsText: { fontSize: 14, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  creditsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, width: '100%' },
  contributorChipWrapper: { minWidth: 120, maxWidth: '100%' },
  contributorChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1 },
  contributorInfo: { flex: 1, flexDirection: 'column', gap: 3, marginRight: 4 },
  contributorName: { fontSize: 13, fontWeight: '700' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 5 },
  roleText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  linkIcon: { marginLeft: 4, flexShrink: 0 },
});