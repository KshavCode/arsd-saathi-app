import { CHANGELOG_URL, GENERATE_PASSWORD_URL, PRIVACY_URL, TERMS_URL } from '@/constants/links';
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

const { height } = Dimensions.get("window");

const handleFeedback = () => {
    const email = "arsdsaathi.help@gmail.com";
    const subject = `ArsdSaathi Feedback`;
    const body = "Name: \nRoll Number: \nScreenshots: \n\nIssue/Feedback: ";
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

export default function Login({ navigation }) {
    const [roll, setRoll] = useState("");
    const [fullName, setFullName] = useState("");
    const [passw, setPassw] = useState("");
    const [consentGiven, setConsentGiven] = useState(false);
    const [isScraping, setIsScraping] = useState(false);
    const [progressMsg, setProgressMsg] = useState("");
    const [showUpdateModal, setShowUpdateModal] = useState(false);
	  const [updateInfo, setUpdateInfo] = useState({ version: '', url: '' });

    // --- Connect button disabled
    const isReadyToSync = roll.length > 0 && fullName.length > 0 && passw.length > 0 && consentGiven;

    const handleLogin = () => {
        Keyboard.dismiss();
        if (!roll || !fullName || !passw) {
            Toast.show({position: 'bottom', bottomOffset:70, type:'success', text1:'Missing Fields!', text2: 'Please fill in all details.', props: {borderColor: Colors.Default.error, bg: Colors.Default.card, text1Color: Colors.Default.error, text2Color: Colors.Default.secondary}})
            return;
        }
        setProgressMsg("Connecting to ARSD Portal...");
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
                navigation.reset({
                    index: 0,
                    routes: [{ name: "Home" }],
                });
            }, 800);
        }
    };

    const handleError = (errorMsg) => {
        setIsScraping(false);
        Alert.alert("Connection Failed", "Could not verify details. Please check your credentials, internet connection or the server might be busy.");
    };

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


    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

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
			      		<View style={[styles.modalOverlay, { backgroundColor: Colors.Default.modalOverlay }]}>
			      		  <View style={[styles.modalContent, { backgroundColor: Colors.Default.card }]}>
      
			      				{/* Modal Header Icon */}
			      				<View style={[styles.modalIconContainer, { backgroundColor: Colors.Default.background + '70' }]}  importantForAccessibility="no-hide-descendants">
			      				  <Ionicons name="rocket" size={36} color={Colors.Default.primary} />
			      				</View>
      
			      				{/* Modal Text */}
			      				<Text style={[styles.modalTitle, { color: Colors.Default.text }]} accessibilityRole="header">Update Available!</Text>
			      				<Text style={[styles.modalText, { color: Colors.Default.secondary }]}>
			      				  Version {updateInfo.version} is ready. We&apos;ve crushed some bugs and added improvements to keep your app running smoothly.
			      				</Text>
      
			      				{/* Modal Action Buttons */}
			      				<View style={styles.modalActions}>
			      				  <TouchableOpacity
			      						style={[styles.modalButtonPrimary, { backgroundColor: Colors.Default.primary }]}
			      						onPress={() => {
			      						  Linking.openURL(updateInfo.url);
			      						  setShowUpdateModal(false);
			      						}}
			      						accessibilityRole='button'
			      						accessibilityLabel="Update Now"
			      						accessibilityHint="Downloads the updated application by redirecting to the download link"
			      				  >
			      					<Ionicons name="download-outline" size={18} color={Colors.Default.background} style={{marginRight: 6}}  importantForAccessibility="no" />
			      					<Text style={[styles.modalButtonPrimaryText, {color:Colors.Default.background}]} importantForAccessibility="no">Update Now</Text>
			      				  </TouchableOpacity>
			      				  <TouchableOpacity
			      						style={[styles.modalButtonSecondary, { borderColor: Colors.Default.separator }]}
			      						onPress={() => Linking.openURL(CHANGELOG_URL)}
			      						accessibilityRole='button'
			      						accessibilityLabel="What's New"
			      						accessibilityHint="Redirects to the new updates information of the application"
			      				  >
			      						<Text style={[styles.modalButtonSecondaryText, { color: Colors.Default.text }]} importantForAccessibility="no">What&apos;s  New</Text>
			      				  </TouchableOpacity>
			      				  <TouchableOpacity
			      						style={{ marginTop: 15, paddingVertical: 5 }}
			      						onPress={() => setShowUpdateModal(false)}
			      						accessibilityRole='button'
			      						accessibilityLabel="Not Now"
			      						accessibilityHint="Dismiss this dialog and remind again when you open the app next time"
			      				  >
			      						<Text style={{ color: Colors.Default.secondary, fontSize: 13, fontWeight: '500' }} importantForAccessibility="no">Not Now</ Text>
			      				  </TouchableOpacity>
			      				</View>
			      		  </View>
			      		</View>
			      	</TouchableOpacity>
		        </Modal>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View
                        style={[styles.headerBackground, { height: height * 0.40 }]}
                        importantForAccessibility="no-hide-descendants"
                    >
                        <SafeAreaView style={styles.headerContent} importantForAccessibility="no-hide-descendants">
                            <View style={styles.logoCircle}>
                                <Image source={require("../assets/images/icon.png")} style={{ width: "75%", height: "70%" }} />
                            </View>
                        </SafeAreaView>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.card} accessibilityRole="header" accessiblityLabel="Form Container">
                            <Text style={styles.cardTitle}>ArsdSaathi Login</Text>
                            <Text style={styles.cardSub} importantForAccessibility="no">Kindly enter your details below</Text>

                            <View style={styles.inputGroup}>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="id-card-outline" size={20} color="#6B7280" style={styles.inputIcon} importantForAccessibility="no" />
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="Roll No. (23/380XX)" 
                                        placeholderTextColor="#9CA3AF" 
                                        value={roll} 
                                        onChangeText={setRoll} 
                                        autoCapitalize="none"
                                        accessibilityLabel="College Roll Number"
                                        accessibilityHint="Enter your college roll number"
                                    />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} importantForAccessibility="no" />
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="Full Name" 
                                        placeholderTextColor="#9CA3AF" 
                                        value={fullName} 
                                        onChangeText={setFullName}
                                        accessibilityLabel="Full Name"
                                        accessibilityHint="Enter your name exactly as it appears on your ID card"
                                    />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="key-outline" size={20} color="#6B7280" style={styles.inputIcon} importantForAccessibility="no" />
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="Password (if generated)" 
                                        placeholderTextColor="#9CA3AF" 
                                        value={passw} 
                                        onChangeText={setPassw} 
                                        keyboardType="numbers-and-punctuation"
                                        accessibilityLabel="Password"
                                        accessibilityHint="Enter your password here, if not generated, the link is given below"
                                    />
                                </View>
                                <View style={styles.consentContainer}>
                                    <Text style={styles.linkText} onPress={() => Linking.openURL(GENERATE_PASSWORD_URL)} accessibilityRole="link" accessibilityLabel="Terms and Conditions">Generate your password</Text>
                                </View>
                            </View>

                            {/* CONSENT CHECKBOX */}
                            {!isScraping && (
                                <View style={styles.consentContainer}>
                                    <TouchableOpacity 
                                        onPress={() => setConsentGiven(!consentGiven)} 
                                        style={styles.checkbox}
                                        accessibilityRole="checkbox"
                                        accessibilityState={{ checked: consentGiven }}
                                        accessibilityLabel="Consent to Terms and Privacy Policy"
                                        accessibilityHint="Check this to agree to the terms and privacy policy"
                                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                                    >
                                        <Ionicons name={consentGiven ? "checkbox" : "square-outline"} size={22} color={consentGiven ? Colors.Default.primary : "#9CA3AF"} importantForAccessibility="no" />
                                    </TouchableOpacity>
                                    <Text style={styles.consentText} accessibilityLabel="I agree to the Terms and Privacy Policy regarding my data.">
                                        I agree to the <Text style={styles.linkText} onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link" accessibilityLabel="Terms and Conditions">Terms</Text> and <Text style={styles.linkText} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link" accessibilityLabel="Privacy Policy">Privacy Policy</Text> regarding my data.
                                    </Text>
                                </View>
                            )}

                            <View style={styles.actionArea}>
                                {isScraping ? (
                                    <View style={styles.loadingState} accessible={true} accessibilityLabel={`Loading. ${progressMsg}`}>
                                        <ActivityIndicator size="large" color={Colors.Default.primary} />
                                        <Text style={styles.loadingText} importantForAccessibility="no">{progressMsg}</Text>
                                        <ArsdScraper credentials={{ name: fullName, rollNo: roll, passw: passw }} onProgress={setProgressMsg} onFinish={handleCompletion} onError={handleError} />
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.loginButton, !isReadyToSync && styles.disabledButton]}
                                        onPress={handleLogin}
                                        disabled={!isReadyToSync}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityState={{ disabled: !isReadyToSync }}
                                        accessibilityLabel="Connect and Sync"
                                        accessibilityHint={!isReadyToSync ? "Please fill all fields and check the consent box to continue" : "Submits your credentials to securely sync your college data"}
                                    >
                                        <Text style={styles.loginButtonText} importantForAccessibility="no">Connect & Sync</Text>
                                        <Ionicons name="arrow-forward" size={20} color="#FFF" importantForAccessibility="no" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity 
                            onPress={() => handleFeedback()} 
                            style={{ marginTop: 25 }}
                            accessibilityRole="button"
                            accessibilityLabel="Report an Issue"
                            accessibilityHint="Opens your email app to send feedback or report a bug"
                            hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
                        >
                            <Text style={[styles.footerText, { color: "#4F46E5", fontWeight: "bold" }]} importantForAccessibility="no">
                                Having trouble? Report an Issue
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#e6efff" },
    headerBackground: { justifyContent: "center", alignItems: "center", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, width: "100%" },
    headerContent: { alignItems: "center", marginTop: -20 },
    logoCircle: { width: 100, height: 100, backgroundColor: "#FFF", borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 5, elevation: 5 },
    formContainer: { paddingHorizontal: 25, marginTop: -80 },
    card: { backgroundColor: "#FFF", borderRadius: 20, padding: 15, elevation: 10, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
    cardTitle: { fontSize: 19, fontWeight: "700", color: "#1F2937", textAlign: "center" },
    cardSub: { fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 4, marginBottom: 20 },
    inputGroup: { gap: 14, marginBottom: 15 },
    inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 12, height: 48 },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14, color: "#111827" },
    consentContainer: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 0, paddingHorizontal: 2 },
    checkbox: { marginRight: 8 },
    consentText: { flex: 1, fontSize: 12, color: '#4B5563', lineHeight: 18 },
    linkText: { color: '#4F46E5', fontWeight: '700', textDecorationLine: 'underline' },
    actionArea: { marginTop: 15, minHeight: 60, justifyContent: 'center' },
    loginButton: { backgroundColor: Colors.Default.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 12, elevation: 4 },
    disabledButton: { backgroundColor: "#a5a5a5", elevation: 0 },
    loginButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600", marginRight: 8 },
    loadingState: { alignItems: "center", gap: 8 },
    loadingText: { fontSize: 13, color: "#4F46E5", fontWeight: "600" },
    footerText: { textAlign: "center", fontSize: 12 },

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
});