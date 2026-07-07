import Header from '@/components/Header';
import { FAQ_URL } from '@/constants/links';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const handleFeedback = () => {
	const email = "arsdsaathi.help@gmail.com";
	const subject = `FAQ Suggestion`;
	const body = "Question:";
	Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function FaqTab({ navigation }) {
	const { theme } = useTheme();
	const scrollViewRef = useRef();
	const [rawFaqData, setRawFaqData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [messages, setMessages] = useState([]);
	const [currentOptions, setCurrentOptions] = useState([]);
	const [userName, setUserName] = useState('Student');
	const [isTyping, setIsTyping] = useState(false);

	// search an item by ID in a recursive tree architecture
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

	// AI Random responses
	const getBotResponse = (type, customTopic = null) => {
		const name = userName ? userName.trim().split(/\s+/)[0] : 'Student';
		let pool = [];

		const timeGreeting = (() => {
			const hrs = new Date().getHours();
			if (hrs < 12) return 'Good morning';
			if (hrs < 18) return 'Good afternoon';
			return 'Good evening';
		})();
		if (type === 'greetings') {
			pool = [
				`👋 ${timeGreeting} ${name}! I'm your Saathi, ArsdSaathi. What can I help you navigate today?`,
				`Hey there ${name}! ArsdSaathi at your service. What are we looking for?`,
				`Glad to see you ${name}! How can I make your day a little easier?`
			];
		} 
		else if (type === 'resets') {
			pool = [
				`Sure thing! Choose the next area you'd like to explore:`,
				`Happy to help. What else is on your mind, ${name}?`,
				`Alright ${name}, what are we diving into next?`
			];
		} 
		else if (type === 'branch') {
			pool = [
				`Got it. What specifically about "${customTopic}" do you need help with?`,
				`Ah, "${customTopic}". Great topic. Which of these fits your issue?`,
				`Let's narrow "${customTopic}" down a bit. Select an option:`
			];
		}
		return pool[getRandomInt(0, pool.length - 1)];
	};
	useEffect(() => {
		const initializeScreen = async () => {
			try {
				const [faqResponse, basicRaw] = await Promise.all([
					fetch(`${FAQ_URL}?t=${Date.now()}`).then(res => res.json()),
					AsyncStorage.getItem('BASIC_DETAILS')
				]);
				let fetchedName = 'Student';
				if (basicRaw) {
					const basic = JSON.parse(basicRaw);
					fetchedName = basic?.name || 'Student';
				}
				setUserName(fetchedName);
				setRawFaqData(faqResponse);
				setTimeout(() => {
					const h = new Date().getHours();
					const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
					const welcomeText = `👋 ${g} ${fetchedName.trim().split(/\s+/)[0]}! I'm ArsdSaathi. What can I help you navigate today?`;
					setMessages([{ id: 'welcome', sender: 'bot', text: welcomeText }]);
					const mainOptions = faqResponse.map((item, idx) => ({
						...item,
						id: item.id || `q-${idx}`,
						label: item.question
					}));
					setCurrentOptions(mainOptions);
				}, 300);
			} 
			catch (err) {
				console.error("Initialization Error: ", err);
			} 
			finally {
				setLoading(false);
			}
		};
		initializeScreen();
	}, []);

	const handleOptionSelect = (option) => {
		setCurrentOptions([]); // Instantly lock double taps
		const userChoiceLog = {
			id: `user-${Date.now()}`,
			sender: 'user',
			text: option.label
		};
		setMessages(prev => [...prev, userChoiceLog]);
		setIsTyping(true);
		const thinkingTime = option.answer ? getRandomInt(600, 900) : 450;
		setTimeout(() => {
			// BRANCH NAVIGATION
			if (option.children && option.children.length > 0) {
				setIsTyping(false);
				const botResponseLog = {
						id: `bot-${Date.now()}`,
						sender: 'bot',
						text: getBotResponse('branch', option.label)
				};
				
				setMessages(prev => [...prev, botResponseLog]);
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

			// LEAF LEVEL ANSWER DELIVERY
			else if (option.answer) {
				// Split by \n\n
				const textChunks = option.answer.split('\n\n').filter(t => t.trim().length > 0);
				let currentDelay = 0;
				textChunks.forEach((chunk, index) => {
					setTimeout(() => {
						setIsTyping(true);
						// Calculate simulated speed metrics based on paragraph volume
						const stringTypingSimulation = Math.min(Math.max(chunk.length * 8, 500), 1500);
						setTimeout(() => {
							const newBubble = {
								id: `bot-${Date.now()}-${index}`,
								sender: 'bot',
								text: chunk
							};
							setMessages(prev => [...prev, newBubble]);
							setIsTyping(false);
							// Check if final block 
							if (index === textChunks.length - 1) {
								let recommendedChips = [];
								// Scan and pull matching parameters out if relativeIds exist inside your updated schema
								if (option.relatedIds && option.relatedIds.length > 0) {
									option.relatedIds.forEach(relId => {
										const matchingFaq = findItemById(rawFaqData, relId);
										if (matchingFaq) {
											recommendedChips.push({
												...matchingFaq,
												label: `💡 ${matchingFaq.question}`
											});
										}
									});
								}
								// Merge contextually relative parameters directly in front of the default hard reset loop
								setCurrentOptions([
									...recommendedChips,
									{ id: 'reset-root', label: '🔄 Ask another question', isReset: true }
								]);
							}
						}, stringTypingSimulation);
					}, currentDelay);
					// Add spacing buffers between consecutive block layouts
					currentDelay += Math.min(Math.max(chunk.length * 8, 500), 1000) + 400;
				});
			}
		}, thinkingTime);
	};
	const resetToMainMenu = () => {
		setCurrentOptions([]);
		setIsTyping(true);
		setTimeout(() => {
			setIsTyping(false);
			const resetBotMessage = {
				id: `bot-${Date.now()}`,
				sender: 'bot',
				text: getBotResponse('resets')
			};
			setMessages(prev => [...prev, resetBotMessage]);
			const mainOptions = rawFaqData.map((item, index) => ({
				...item,
				id: item.id || `q-${index}`,
				label: item.question
			}));
			setCurrentOptions(mainOptions);
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
									duration={350}
									useNativeDriver
									style={[ styles.bubbleWrapper, isBot ? styles.wrapperLeft : styles.wrapperRight ]}
								>
									{/* AI Sparkle Avatar */}
									{isBot && (
									<View style={[styles.botIconContainer, { backgroundColor: theme.card }]}>
										<Ionicons name="sparkles" size={16} color={theme.primary} />
									</View>
									)}
									<View style={[styles.messageBubble, isBot ? { backgroundColor: theme.card, borderBottomLeftRadius: 6 } : { backgroundColor: theme.primary, borderBottomRightRadius: 6 }]}>
										<Text style={[styles.messageText, { color: isBot ? theme.text : theme.background }]}>{msg.text}</Text>
									</View>
								</Animatable.View>
							);
						})}
						{/* Live UI bubble */}
						{isTyping && (
							<Animatable.View animation="fadeIn" duration={200} style={[styles.bubbleWrapper, styles.wrapperLeft]}>
								<View style={[styles.botIconContainer, { backgroundColor: theme.card }]}>
									<Ionicons name="sparkles" size={16} color={theme.primary} />
								</View>
								<View style={[styles.messageBubble, { backgroundColor: theme.card, paddingVertical: 12, paddingHorizontal: 20, borderBottomLeftRadius: 4 }]}>
									<ActivityIndicator size="small" color={theme.primary} />
								</View>
							</Animatable.View>
						)}
						{/* Clickable Action Chips */}
						{!isTyping && currentOptions.length > 0 && (
							<Animatable.View animation="fadeInUp" duration={250} style={styles.optionsWrapper}>
								{currentOptions.map((opt) => (
									<TouchableOpacity
										key={opt.id}
										style={[styles.optionChipButton, { borderColor: theme.primary }]}
										activeOpacity={0.7}
										onPress={() => opt.isReset ? resetToMainMenu() : handleOptionSelect(opt)}
									>
										<Text style={[styles.optionChipText, { color: theme.primary }]}>{opt.label}</Text>
										<Ionicons name={opt.isReset ? "refresh" : "arrow-forward"} size={14} color={theme.primary} />
									</TouchableOpacity>
								))}
							</Animatable.View>
						)}
					</View>
				)}
				
				<Animatable.View animation="fadeIn" delay={600} useNativeDriver style={styles.footerLegal}>
					<TouchableOpacity style={styles.footerItem} onPress={handleFeedback}>
						<Text style={[styles.footerLink, { color: theme.footer }]}>Can't find your answer? Email Us!</Text>
					</TouchableOpacity>
				</Animatable.View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, paddingHorizontal: 16 },
	chatBody: { flex: 1, flexDirection: 'column' },
		
	bubbleWrapper: { width: '100%', marginVertical: 6, flexDirection: 'row', alignItems: 'flex-end' },
	wrapperLeft: { justifyContent: 'flex-start', paddingRight: '15%' },
	wrapperRight: { justifyContent: 'flex-end', paddingLeft: '15%' },
	botIconContainer: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2,},
	messageBubble: {flexShrink: 1,paddingHorizontal: 16,paddingVertical: 12,borderRadius: 18,elevation: 1,shadowColor: '#000',shadowOffset: { width: 0, height: 1 },shadowOpacity: 0.02,shadowRadius: 2,},
	messageText: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
	optionsWrapper: { marginTop: 15, marginBottom: 10, gap: 10, alignItems: 'flex-end', paddingLeft: '10%' },
	optionChipButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1.5, backgroundColor: 'transparent', width: '100%' },
	optionChipText: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 10 },

	footerLegal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
	footerLink: { fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' }
});