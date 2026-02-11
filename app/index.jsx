import { Colors } from '@/constants/themeStyle';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient'; // Ensure you install this: npx expo install expo-linear-gradient
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArsdScraper from '../services/ArsdScraper';

const handleFeedback = () => {
    const email = "arsdsaathi.help@gmail.com"; 
    const subject = `ArsdSaathi Feedback`;
    const body = "Name: \nRoll Number: \nDOB (optional, for testing): \n\nIssue/Feedback: ";
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

export default function Login({ navigation }) {

  const [roll, setRoll] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  
  const [isScraping, setIsScraping] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // Determine current interaction mode
  const isInputValid = roll.length > 0 && fullName.length > 0 && dob.length > 0;

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

  const handleCompletion = (status) => {
    if (status === 'DONE') {
        setProgressMsg("Sync Complete!");
        // Keep spinner for a split second to show success
        setTimeout(() => {
            setIsScraping(false);
            navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
            });
        }, 800);
    }
  };

  const handleError = (errorMsg) => {
    setIsScraping(false);
    Alert.alert("Connection Failed", "Could not verify details. Please check your credentials or internet connection.");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* BACKGROUND DECORATION */}
        <LinearGradient
            colors={[Colors.light.text, Colors.light.primary]} // Indigo to Deep Indigo
            style={styles.headerBackground}
        >
            <SafeAreaView style={styles.headerContent}>
                <View style={styles.logoCircle}>
                    <Image source={require("../assets/images/icon.png")} style={{ width: '70%', height: '70%' }} />
                </View>
                <Text style={styles.appName}>ArsdSaathi</Text>
                <Text style={styles.tagline}>Your College Companion</Text>
            </SafeAreaView>
        </LinearGradient>

        {/* MAIN FORM CARD */}
        <View style={styles.formContainer}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={styles.keyboardView}
            >
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Student Login</Text>
                    <Text style={styles.cardSub}>Sync your attendance & profile</Text>

                    {/* INPUTS */}
                    <View style={styles.inputGroup}>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="id-card-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="College Roll No. (e.g. 23/38046)"
                                placeholderTextColor="#9CA3AF"
                                value={roll}
                                onChangeText={setRoll}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="Full Name (as per ID)"
                                placeholderTextColor="#9CA3AF"
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="Date of Birth (DD-MM-YYYY)"
                                placeholderTextColor="#9CA3AF"
                                value={dob}
                                onChangeText={setDob}
                                keyboardType="numbers-and-punctuation"
                            />
                        </View>
                        <Text style={styles.helperText}>Format: DD-MM-YYYY</Text>
                    </View>

                    {/* ACTION BUTTON / LOADER */}
                    <View style={styles.actionArea}>
                        {isScraping ? (
                            <View style={styles.loadingState}>
                                <ActivityIndicator size="large" color="#4F46E5" />
                                <Text style={styles.loadingText}>{progressMsg}</Text>
                                
                                {/* HIDDEN SCRAPER */}
                                <ArsdScraper 
                                    credentials={{ name: fullName, rollNo: roll, dob: dob }}
                                    onProgress={setProgressMsg}
                                    onFinish={handleCompletion}
                                    onError={handleError}
                                />
                            </View>
                        ) : (
                            <TouchableOpacity 
                                style={[styles.loginButton, !isInputValid && styles.disabledButton]} 
                                onPress={handleLogin}
                                disabled={!isInputValid}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.loginButtonText}>Connect & Sync</Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFF" />
                            </TouchableOpacity>
                            
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
            
            <TouchableOpacity onPress={() => handleFeedback()} style={{marginTop:10}}>
                <Text style={[styles.footerText, { color: '#4F46E5', fontWeight: 'bold', marginTop: 10 }]}>Having trouble? Report an Issue
                </Text>
            </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  
  // Header Styles
  headerBackground: {
    height: '45%', // Takes up top portion
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { alignItems: 'center', marginTop: -40 },
  logoCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#FFF',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5
  },
  appName: { fontSize: 28, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: '#E0E7FF', marginTop: 4, fontWeight: '500' },

  // Form Container
  formContainer: { flex: 1, marginTop: -60, paddingHorizontal: 20 },
  keyboardView: { width: '100%' },
  
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 10,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  cardSub: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4, marginBottom: 24 },

  // Inputs
  inputGroup: { gap: 16 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827', height: '100%' },
  helperText: { fontSize: 11, color: '#9CA3AF', marginLeft: 4, marginTop: -10 },

  // Actions
  actionArea: { marginTop: 24, minHeight: 60, justifyContent: 'center' },
  
  loginButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  disabledButton: { backgroundColor: '#A5B4FC', shadowOpacity: 0 },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginRight: 8 },

  loadingState: { alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },

  footerText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12 },
});