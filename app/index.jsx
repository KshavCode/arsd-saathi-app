import { PRIVACY_URL, TERMS_URL } from '@/constants/links';
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/themeStyle";
import ArsdScraper from '../services/ArsdScraper';

const { height } = Dimensions.get("window");

const handleFeedback = () => {
    const email = "arsdsaathi.help@gmail.com";
    const subject = `ArsdSaathi Feedback`;
    const body = "Name: \nRoll Number: \nDOB (optional, for testing): \n\nIssue/Feedback: ";
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

export default function Login({ navigation }) {
    const [roll, setRoll] = useState("23/38046");
    const [fullName, setFullName] = useState("Keshav Pal");
    const [dob, setDob] = useState("02-08-2005");
    const [consentGiven, setConsentGiven] = useState(true);
    const [isScraping, setIsScraping] = useState(false);
    const [progressMsg, setProgressMsg] = useState("");

    // --- LOGIC FIX: Button remains disabled unless inputs are filled AND checkbox is ticked ---
    const isReadyToSync = roll.length > 0 && fullName.length > 0 && dob.length > 0 && consentGiven;

    const handleLogin = () => {
        Keyboard.dismiss();
        if (!roll || !fullName || !dob) {
            Alert.alert("Missing Fields", "Please fill in all details exactly as they appear on your ID card.");
            return;
        }
        const dobRegex = /^\d{1,2}-\d{1,2}-\d{4}$/;
        if (!dobRegex.test(dob)) {
            Alert.alert("Invalid Date", "Please use the format DD-MM-YYYY (e.g., 15-08-2004)");
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
        Alert.alert("Connection Failed", "Could not verify details. Please check your credentials or internet connection.");
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
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
                    <LinearGradient
                        colors={[Colors.light.text, Colors.light.primary]}
                        style={[styles.headerBackground, { height: height * 0.40 }]}
                        importantForAccessibility="no-hide-descendants"
                    >
                        <SafeAreaView style={styles.headerContent} importantForAccessibility="no-hide-descendants">
                            <View style={styles.logoCircle}>
                                <Image source={require("../assets/images/icon.png")} style={{ width: "70%", height: "70%" }} />
                            </View>
                            <Text style={styles.appName}>ArsdSaathi</Text>
                            <Text style={styles.tagline}>Your College Companion</Text>
                        </SafeAreaView>
                    </LinearGradient>

                    <View style={styles.formContainer}>
                        <View style={styles.card} accessibilityRole="header" accessiblityLabel="Form Container">
                            <Text style={styles.cardTitle}>Student Login</Text>
                            <Text style={styles.cardSub} importantForAccessibility="no">Sync your attendance & profile</Text>

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
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.inputIcon} importantForAccessibility="no" />
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="Date of Birth (DD-MM-YYYY)" 
                                        placeholderTextColor="#9CA3AF" 
                                        value={dob} 
                                        onChangeText={setDob} 
                                        keyboardType="numbers-and-punctuation"
                                        accessibilityLabel="Date of Birth"
                                        accessibilityHint="Enter your date of birth in day dash month dash year format"
                                    />
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
                                        <Ionicons name={consentGiven ? "checkbox" : "square-outline"} size={22} color={consentGiven ? Colors.light.primary : "#9CA3AF"} importantForAccessibility="no" />
                                    </TouchableOpacity>
                                    <Text style={styles.consentText} accessibilityLabel="I agree to the Terms and Privacy Policy regarding my data.">
                                        I agree to the <Text style={styles.linkText} onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link" accessibilityLabel="Terms and Conditions">Terms</Text> and <Text style={styles.linkText} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link" accessibilityLabel="Privacy Policy">Privacy Policy</Text> regarding my data.
                                    </Text>
                                </View>
                            )}

                            <View style={styles.actionArea}>
                                {isScraping ? (
                                    <View style={styles.loadingState} accessible={true} accessibilityLabel={`Loading. ${progressMsg}`}>
                                        <ActivityIndicator size="large" color={Colors.light.primary} />
                                        <Text style={styles.loadingText} importantForAccessibility="no">{progressMsg}</Text>
                                        <ArsdScraper credentials={{ name: fullName, rollNo: roll, dob: dob }} onProgress={setProgressMsg} onFinish={handleCompletion} onError={handleError} />
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
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    headerBackground: { justifyContent: "center", alignItems: "center", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, width: "100%" },
    headerContent: { alignItems: "center", marginTop: -20 },
    logoCircle: { width: 75, height: 75, backgroundColor: "#FFF", borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 12, elevation: 5 },
    appName: { fontSize: 26, fontWeight: "800", color: "#FFF" },
    tagline: { fontSize: 13, color: "#E0E7FF", marginTop: 4 },
    formContainer: { paddingHorizontal: 20, marginTop: -50 },
    card: { backgroundColor: "#FFF", borderRadius: 24, padding: 22, elevation: 10, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
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
    loginButton: { backgroundColor: Colors.light.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 12, elevation: 4 },
    disabledButton: { backgroundColor: "#A5B4FC", elevation: 0 },
    loginButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600", marginRight: 8 },
    loadingState: { alignItems: "center", gap: 8 },
    loadingText: { fontSize: 13, color: "#4F46E5", fontWeight: "600" },
    footerText: { textAlign: "center", fontSize: 12 },
});