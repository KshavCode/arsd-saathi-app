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
const TERMS_URL = "https://github.com/KshavCode/arsd-saathi-app/TERMS.md";
const PRIVACY_URL = "https://github.com/KshavCode/arsd-saathi-app/PRIVACY.md";

const handleFeedback = () => {
    const email = "arsdsaathi.help@gmail.com";
    const subject = `ArsdSaathi Feedback`;
    const body = "Name: \nRoll Number: \nDOB (optional, for testing): \n\nIssue/Feedback: ";
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

export default function Login({ navigation }) {
    const [roll, setRoll] = useState("");
    const [fullName, setFullName] = useState("");
    const [dob, setDob] = useState("");
    const [consentGiven, setConsentGiven] = useState(false);
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
                    >
                        <SafeAreaView style={styles.headerContent}>
                            <View style={styles.logoCircle}>
                                <Image source={require("../assets/images/icon.png")} style={{ width: "70%", height: "70%" }} />
                            </View>
                            <Text style={styles.appName}>ArsdSaathi</Text>
                            <Text style={styles.tagline}>Your College Companion</Text>
                        </SafeAreaView>
                    </LinearGradient>

                    <View style={styles.formContainer}>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Student Login</Text>
                            <Text style={styles.cardSub}>Sync your attendance & profile</Text>

                            <View style={styles.inputGroup}>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="id-card-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput style={styles.input} placeholder="Roll No. (23/380XX)" placeholderTextColor="#9CA3AF" value={roll} onChangeText={setRoll} autoCapitalize="none" />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#9CA3AF" value={fullName} onChangeText={setFullName} />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                                    <TextInput style={styles.input} placeholder="Date of Birth (DD-MM-YYYY)" placeholderTextColor="#9CA3AF" value={dob} onChangeText={setDob} keyboardType="numbers-and-punctuation" />
                                </View>
                            </View>

                            {/* CONSENT CHECKBOX - MOVED OUTSIDE INPUTGROUP */}
                            {!isScraping && (
                                <View style={styles.consentContainer}>
                                    <TouchableOpacity onPress={() => setConsentGiven(!consentGiven)} style={styles.checkbox}>
                                        <Ionicons name={consentGiven ? "checkbox" : "square-outline"} size={22} color={consentGiven ? Colors.light.primary : "#9CA3AF"} />
                                    </TouchableOpacity>
                                    <Text style={styles.consentText}>
                                        I agree to the <Text style={styles.linkText} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text> and <Text style={styles.linkText} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text> regarding my data.
                                    </Text>
                                </View>
                            )}

                            <View style={styles.actionArea}>
                                {isScraping ? (
                                    <View style={styles.loadingState}>
                                        <ActivityIndicator size="large" color={Colors.light.primary} />
                                        <Text style={styles.loadingText}>{progressMsg}</Text>
                                        <ArsdScraper credentials={{ name: fullName, rollNo: roll, dob: dob }} onProgress={setProgressMsg} onFinish={handleCompletion} onError={handleError} />
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.loginButton, !isReadyToSync && styles.disabledButton]}
                                        onPress={handleLogin}
                                        disabled={!isReadyToSync}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.loginButtonText}>Connect & Sync</Text>
                                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity onPress={() => handleFeedback()} style={{ marginTop: 25 }}>
                            <Text style={[styles.footerText, { color: "#4F46E5", fontWeight: "bold" }]}>
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