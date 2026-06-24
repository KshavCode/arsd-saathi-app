import Header from '@/components/Header';
import { FAQ_URL } from '@/constants/links';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'; // Imported for the robot icon
import * as Linking from 'expo-linking';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const handleFeedback = () => {
    const email = "arsdsaathi.help@gmail.com";
    const subject = `FAQ Suggestion`;
    const body = "Question: \nAnswer: ";
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

export default function FaqTab({ navigation }) {
    const { theme } = useTheme();
    const scrollViewRef = useRef();

    const [rawFaqData, setRawFaqData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState([]);
    const [currentOptions, setCurrentOptions] = useState([]);

    // 1. Fetch FAQ and Name on mount asynchronously
    useEffect(() => {
        const initializeScreen = async () => {
            try {
                const [faqResponse, basicRaw] = await Promise.all([
                    fetch(`${FAQ_URL}?t=${Date.now()}`).then(res => res.json()),
                    AsyncStorage.getItem('BASIC_DETAILS')
                ]);

                let name = 'student';
                if (basicRaw) {
                    const basic = JSON.parse(basicRaw);
                    name = basic?.name || 'student';
                }

                setRawFaqData(faqResponse);
                initializeBot(faqResponse, name);
            } catch (err) {
                console.error("Initialization Error: ", err);
            } finally {
                setLoading(false);
            }
        };

        initializeScreen();
    }, []);

    // 2. Introduce the bot and provide initial category options
    const initializeBot = (data, userName) => {
        if (!data || data.length === 0) return;

        const greetingMessage = {
            id: 'welcome',
            sender: 'bot',
            text: `👋 Hi ${userName}! I'm your Saathi, ArsdSaathi. What can I assist you with today?`
        };

        setMessages([greetingMessage]);
        
        // Map the root level categories
        const mainOptions = data.map((item, index) => ({
            ...item,
            id: item.id || `q-${index}`,
            label: item.question
        }));

        setCurrentOptions(mainOptions);
    };

    // 3. User selects a question path (Handles Trees & Leaves)
    const handleOptionSelect = (option) => {
        setCurrentOptions([]);

        const userChoiceLog = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: option.label
        };

        setMessages(prev => [...prev, userChoiceLog]);

        setTimeout(() => {
            // BRANCH NODE: The option has subcategories
            if (option.children && option.children.length > 0) {
                const botResponseLog = {
                    id: `bot-${Date.now()}`,
                    sender: 'bot',
                    text: `Got it. What specifically about "${option.label}" do you need help with?`
                };
                
                setMessages(prev => [...prev, botResponseLog]);

                // Render the sub-options and provide an escape hatch back to the main menu
                const subOptions = option.children.map((child, index) => ({
                    ...child,
                    id: child.id || `sub-${Date.now()}-${index}`,
                    label: child.question
                }));

                setCurrentOptions([
                    ...subOptions,
                    { id: 'reset-root', label: '🔙 Back to Main Menu', isReset: true }
                ]);

            } 
            // LEAF NODE: The option has a final answer
            else if (option.answer) {
                const botResponseLog = {
                    id: `bot-${Date.now()}`,
                    sender: 'bot',
                    text: option.answer
                };

                setMessages(prev => [...prev, botResponseLog]);
                
                setCurrentOptions([
                    { id: 'reset-root', label: '🔄 Ask another question', isReset: true }
                ]);
            }
        }, 600);
    };

    // 4. Return back to directory head index
    const resetToMainMenu = () => {
        const resetBotMessage = {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: "Sure thing! Here are the main topics again:"
        };
        
        setMessages(prev => [...prev, resetBotMessage]);

        const mainOptions = rawFaqData.map((item, index) => ({
            ...item,
            id: item.id || `q-${index}`,
            label: item.question
        }));

        setCurrentOptions(mainOptions);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Header screenName={"Your ArsdSaathi"} navigation={navigation} />
            
            <ScrollView 
                ref={scrollViewRef}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 30, paddingTop: 10 }} 
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                { loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : (
                    <View style={styles.chatBody}>
                        {messages.map((msg) => {
                            const isBot = msg.sender === 'bot';
                            return (
                                <Animatable.View
                                    key={msg.id}
                                    animation={isBot ? "fadeInLeft" : "fadeInRight"}
                                    duration={400}
                                    useNativeDriver
                                    style={[
                                        styles.bubbleWrapper,
                                        isBot ? styles.wrapperLeft : styles.wrapperRight
                                    ]}
                                >
                                    {/* Render Bot Icon */}
                                    {isBot && (
                                        <View style={[styles.botIconContainer, { backgroundColor: theme.card }]}>
                                            <MaterialCommunityIcons name="robot-outline" size={20} color={theme.primary} />
                                        </View>
                                    )}

                                    <View style={[
                                        styles.messageBubble,
                                        isBot 
                                            ? { backgroundColor: theme.card, borderBottomLeftRadius: 4 } 
                                            : { backgroundColor: theme.primary, borderBottomRightRadius: 4 }
                                    ]}>
                                        <Text style={[
                                            styles.messageText, 
                                            { color: isBot ? theme.text : theme.background }
                                        ]}>
                                            {msg.text}
                                        </Text>
                                    </View>
                                </Animatable.View>
                            );
                        })}

                        {currentOptions.length > 0 && (
                            <Animatable.View animation="fadeInUp" duration={300} style={styles.optionsWrapper}>
                                {currentOptions.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[styles.optionChipButton, { borderColor: theme.primary }]}
                                        activeOpacity={0.7}
                                        onPress={() => opt.isReset ? resetToMainMenu() : handleOptionSelect(opt)}
                                    >
                                        <Text style={[styles.optionChipText, { color: theme.primary }]}>
                                            {opt.label}
                                        </Text>
                                        <Ionicons 
                                            name={opt.isReset ? "refresh" : "chevron-forward"} 
                                            size={14} 
                                            color={theme.primary} 
                                        />
                                    </TouchableOpacity>
                                ))}
                            </Animatable.View>
                        )}
                    </View>
                )}
                
                <Animatable.View animation="fadeIn" delay={800} useNativeDriver style={styles.footerLegal}>
                    <TouchableOpacity style={styles.footerItem} onPress={handleFeedback}>
                        <Text style={[styles.footerLink, { color: theme.footer }]}>Can't find your answer? Suggest a question</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16 },
    chatBody: { flex: 1, flexDirection: 'column' },
    
    // Wrapper adjusts flex to leave room for bot icon
    bubbleWrapper: { width: '100%', marginVertical: 6, flexDirection: 'row', alignItems: 'flex-end' },
    wrapperLeft: { justifyContent: 'flex-start', paddingRight: '15%' },
    wrapperRight: { justifyContent: 'flex-end', paddingLeft: '15%' },
    
    // New styles for the robot profile icon
    botIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },

    messageBubble: {
        flexShrink: 1, // Prevents text from pushing icon off screen
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 18,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
    },
    messageText: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
    
    optionsWrapper: { marginTop: 15, marginBottom: 10, gap: 10, alignItems: 'flex-end', paddingLeft: '10%' },
    optionChipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        borderWidth: 1.5,
        backgroundColor: 'transparent',
        width: '100%',
    },
    optionChipText: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 10 },
    
    footerLegal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 25 },
    footerItem: { paddingVertical: 5 },
    footerLink: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }
});