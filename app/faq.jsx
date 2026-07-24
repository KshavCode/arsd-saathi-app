import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Header from '@/components/Header';
import OfflineBanner from '@/components/NoInternet';
import { FAQ_URL } from '@/constants/links';
import { useTheme } from '@/hooks/useTheme';
import { titleCase } from 'title-case';

// Helpers
const handleFeedback = () => Linking.openURL(`mailto:arsdsaathi.help@gmail.com?subject=FAQ Suggestion&body=Question:`);
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
const getTodayDateString = () => `Today, ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

export default function FaqTab({ navigation }) {
  const { theme } = useTheme();
  const scrollViewRef = useRef();
  const [rawFaqData, setRawFaqData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [userName, setUserName] = useState('Student');
  const [isTyping, setIsTyping] = useState(false);

  const findItemById = (dataArray, id) => {
    for (const item of dataArray) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getBotResponse = (type, customTopic = null, overrideName = null) => {
    const name = titleCase((overrideName || userName || 'Student').trim().split(/\s+/)[0].toLowerCase());
    const hrs = new Date().getHours();
    const timeGreeting = hrs < 12 ? 'Good morning' : hrs < 18 ? 'Good afternoon' : 'Good evening';
    
    let pool = [];
    if (type === 'greetings') pool = [`👋 ${timeGreeting} ${name}! I'm your Saathi, ArsdSaathi. What can I help you navigate today?`, `Hey there ${name}! ArsdSaathi at your service. What are we looking for?`, `Glad to see you ${name}! How can I make your day a little easier?`, `What's up, ${name}! What is your query?`, `${timeGreeting}! How can I help you, ${name}?`];
    else if (type === 'resets') pool = [`Sure thing! Choose the next area you'd like to explore:`, `Happy to help. What else is on your mind, ${name}?`, `Alright ${name}, what are we diving into next?`, `Where should we go next?`, `Got more queries? ArsdSaathi is here!`];
    else if (type === 'branch') pool = [`Got it. What specifically about "${customTopic}" do you need help with?`, `Ah, "${customTopic}". Great! Which of these fits your issue?`, `Let's narrow "${customTopic}" down a bit. Select an option:`, `Next, select the most appropriate option, ${name}:`, `I got your back! What's your concern:`];
    
    return pool[getRandomInt(0, pool.length - 1)];
  };

  useEffect(() => {
    const initializeScreen = async () => {
      try {
        const [faqResponse, basicRaw] = await Promise.all([
          fetch(`${FAQ_URL}?t=${Date.now()}`).then(res => res.json()),
          AsyncStorage.getItem('BASIC_DETAILS')
        ]);
        
        const fetchedName = basicRaw ? JSON.parse(basicRaw)?.name || 'Student' : 'Student';
        setUserName(fetchedName);
        setRawFaqData(faqResponse);
        
        setTimeout(() => {
          setMessages([{ id: 'welcome', sender: 'bot', text: getBotResponse('greetings', null, fetchedName), timestamp: new Date().toISOString() }]);
          setCurrentOptions(faqResponse.map((item, idx) => ({ ...item, id: item.id || `q-${idx}`, label: item.question })));
        }, 300);
      } catch (err) {
        console.error("Initialization Error: ", err);
      } finally {
        setLoading(false);
      }
    };
    initializeScreen();
  }, []);

  const handleOptionSelect = (option) => {
    setCurrentOptions([]);
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: option.label, timestamp: new Date().toISOString() }]);
    setIsTyping(true);
    
    setTimeout(() => {
      if (option.children && option.children.length > 0) {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: `bot-${Date.now()}`, sender: 'bot', text: getBotResponse('branch', option.label), timestamp: new Date().toISOString() }]);
        setCurrentOptions([...option.children.map((c, i) => ({ ...c, id: c.id || `sub-${Date.now()}-${i}`, label: c.question })), { id: 'reset-root', label: '🔙 Back to Main Menu', isReset: true }]);
      } else if (option.answer) {
        const textChunks = option.answer.split('\n\n').filter(t => t.trim().length > 0);
        let currentDelay = 0;
        
        textChunks.forEach((chunk, index) => {
          setTimeout(() => {
            setIsTyping(true);
            setTimeout(() => {
              setMessages(prev => [...prev, { id: `bot-${Date.now()}-${index}`, sender: 'bot', text: chunk, timestamp: new Date().toISOString() }]);
              setIsTyping(false);
              
              if (index === textChunks.length - 1) {
                let recommendedChips = (option.relatedIds || []).map(relId => findItemById(rawFaqData, relId)).filter(Boolean).map(f => ({ ...f, label: `💡 ${f.question}` }));
                setCurrentOptions([...recommendedChips, { id: 'reset-root', label: '🔄 Ask another question', isReset: true }]);
              }
            }, Math.min(Math.max(chunk.length * 8, 500), 1500));
          }, currentDelay);
          currentDelay += Math.min(Math.max(chunk.length * 8, 500), 1000) + 400;
        });
      }
    }, option.answer ? getRandomInt(600, 900) : 450);
  };

  const resetToMainMenu = () => {
    setCurrentOptions([]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { id: `bot-${Date.now()}`, sender: 'bot', text: getBotResponse('resets'), timestamp: new Date().toISOString() }]);
      setCurrentOptions(rawFaqData.map((item, index) => ({ ...item, id: item.id || `q-${index}`, label: item.question })));
    }, 500);
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
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} accessibilityRole="progressbar" accessibilityLabel="Loading chat" />
          </View>
        ) : (
          <View style={styles.chatBody}>
            {messages.length > 0 && (
              <Text style={[styles.dateHeader, { color: theme.footer || '#888' }]} accessibilityRole="header">{getTodayDateString()}</Text>
            )}

            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <Animatable.View
                  key={msg.id}
                  animation={isBot ? "fadeInLeft" : "fadeInRight"}
                  duration={350}
                  useNativeDriver
                  style={[ styles.bubbleWrapper, isBot ? styles.wrapperLeft : styles.wrapperRight ]}
                >
                  {isBot && (
                    <View style={[styles.botIconContainer, { backgroundColor: theme.card }]} importantForAccessibility="no">
                      <Ionicons name="sparkles" size={16} color={theme.primary} />
                    </View>
                  )}
                  <View 
                    style={[styles.messageBubble, isBot ? { backgroundColor: theme.card, borderBottomLeftRadius: 6 } : { backgroundColor: theme.primary, borderBottomRightRadius: 6 }]}
                    accessible={true}
                    accessibilityRole="text"
                    accessibilityLabel={`${isBot ? 'Bot says:' : 'You asked:'} ${msg.text}. Sent at ${formatTime(msg.timestamp)}.`}
                    importantForAccessibility="no-hide-descendants"
                  >
                    <Text style={[styles.messageText, { color: isBot ? theme.text : theme.background }]}>{msg.text}</Text>
                    <Text style={[styles.timestampText, { color: isBot ? theme.text : theme.background }]}>{formatTime(msg.timestamp)}</Text>
                  </View>
                </Animatable.View>
              );
            })}
            
            {isTyping && (
              <Animatable.View 
                animation="fadeIn" 
                duration={200} 
                style={[styles.bubbleWrapper, styles.wrapperLeft]}
                accessible={true}
                accessibilityState={{ busy: true }}
                accessibilityLiveRegion="polite"
                accessibilityLabel="Bot is typing a response"
              >
                <View style={[styles.botIconContainer, { backgroundColor: theme.card }]} importantForAccessibility="no">
                  <Ionicons name="sparkles" size={16} color={theme.primary} />
                </View>
                <View style={[styles.messageBubble, { backgroundColor: theme.card, paddingVertical: 12, paddingHorizontal: 20, borderBottomLeftRadius: 4 }]} importantForAccessibility="no">
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              </Animatable.View>
            )}
            
            {!isTyping && currentOptions.length > 0 && (
              <Animatable.View animation="fadeInUp" duration={250} style={styles.optionsWrapper}>
                {currentOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionChipButton, { borderColor: theme.primary }]}
                    activeOpacity={0.7}
                    onPress={() => opt.isReset ? resetToMainMenu() : handleOptionSelect(opt)}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityHint="Double tap to send this message to the bot"
                  >
                    <Text style={[styles.optionChipText, { color: theme.primary }]} importantForAccessibility="no">{opt.label}</Text>
                    <Ionicons name={opt.isReset ? "refresh" : "arrow-forward"} size={14} color={theme.primary} importantForAccessibility="no" />
                  </TouchableOpacity>
                ))}
              </Animatable.View>
            )}
          </View>
        )}
        
        <Animatable.View animation="fadeIn" delay={600} useNativeDriver style={styles.footerLegal}>
          <TouchableOpacity style={styles.footerItem} onPress={handleFeedback} accessibilityRole="button" accessibilityLabel="Can't find your answer? Email Us!">
            <Text style={[styles.footerLink, { color: theme.footer }]} importantForAccessibility="no">Can't find your answer? Email Us!</Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
      <OfflineBanner />
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  chatBody: { flex: 1, flexDirection: 'column' },
  dateHeader: { textAlign: 'center', fontSize: 12, fontWeight: '600', marginVertical: 5 },
  bubbleWrapper: { width: '100%', marginVertical: 5, flexDirection: 'row', alignItems: 'flex-end' },
  wrapperLeft: { justifyContent: 'flex-start', paddingRight: '20%' },
  wrapperRight: { justifyContent: 'flex-end', paddingLeft: '20%' },
  botIconContainer: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  messageBubble: { flexShrink: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderRadius: 18, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2 },
  messageText: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  timestampText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end', opacity: 0.7 },
  optionsWrapper: { marginTop: 15, marginBottom: 10, gap: 10, alignItems: 'flex-end', paddingLeft: '10%' },
  optionChipButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1.5, backgroundColor: 'transparent', width: '100%' },
  optionChipText: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 10 },
  footerLegal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 },
  footerLink: { fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' }
});