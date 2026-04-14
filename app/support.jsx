import Header from '@/components/Header';
import { ANDROID_RULE_URL, REPOSITORY_URL } from '@/constants/links';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';

const SupportCard = ({ icon, title, description, delay, theme }) => (
	<Animatable.View
		style={[styles.supportCard, { backgroundColor: theme.card, borderColor: theme.borderColor }]}
		animation="fadeInUp"
		duration={600}
		delay={delay}
		useNativeDriver
	>
		<View style={[styles.iconBox, { backgroundColor: theme.background + '80' }]}>
			<Ionicons name={icon} size={24} color={theme.primary} />
		</View>
		<View style={styles.cardTextContainer}>
			<Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
			<Text style={[styles.cardDesc, { color: theme.secondary }]}>{description}</Text>
		</View>
	</Animatable.View>
);

export default function SupportUsTab({ navigation }) {
	const { theme } = useTheme();

	const handleSupport = () => {
		Linking.openURL('upi://pay?pa=kshav005@okaxis&pn=Keshav&cu=INR').catch(() =>
			alert('No UPI app found on your phone.')
		)
	};
	return (
		<SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
			<Header screenName={"SUPPORT US"} navigation={navigation} />
			
			<ScrollView 
				contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} 
				showsVerticalScrollIndicator={false}
			>
				{/* Hero Section */}
				<Animatable.View 
					animation="fadeIn" 
					duration={800} 
					style={styles.heroSection}
					useNativeDriver
				>
					<View style={[styles.heroIconCircle, { backgroundColor: theme.primary + '15' }]}>
						<Ionicons name="heart" size={50} color={theme.primary} />
					</View>
					<Text style={[styles.heroTitle, { color: theme.text }]}>Keep ArsdSaathi Alive</Text>
					<Text style={[styles.storyText, { color: theme.secondary }]}>
						This app was built by students, for students. We started this project to make campus life easier, and seeing so many of you use it every day means the world to us. But as our community grows, so do the costs.
					</Text>
					<Text style={[styles.storyText, { color: theme.secondary, marginTop: 10 }]}>
						Right now, we are trying our best to provide features without any external cost but we also need funds to cover the ₹2500 Google Play Store developer fee so we can officially launch and reach more students.
					</Text>
					<TouchableOpacity onPress={()=> {Linking.openURL(ANDROID_RULE_URL)}}>
						<Text style={[styles.storyText, { color: theme.primary, marginTop: 10, textDecorationLine:'underline' }]}>
							Moreover, Android is going to disable installation from other sources. You can read it HERE.
						</Text>
					</TouchableOpacity>
					<Text style={[styles.storyText, { color: theme.secondary, marginTop: 10 }]}>
						As you all know, this is an unofficial app and is undergoing various processes in order to be official. 
						If this app has saved you time or helped you out, a small contribution goes a long way.
					</Text>
				</Animatable.View>

				<View style={styles.sectionHeader}>
					<Text style={[styles.sectionTitle, { color: theme.text }]}>Why we need your help</Text>
				</View>

				<SupportCard 
					theme={theme}
					delay={250}
					icon="logo-google-playstore" 
					title="Play Store Launch" 
					description="Funding the one-time developer fee to get the app officially on the Google Play Store." 
				/>
				<SupportCard 
					theme={theme}
					delay={350}
					icon="logo-apple" 
					title="App Store Launch" 
					description="Funding the 99$ fee to get the app officially on the App Store for iOS users." 
				/>
				<SupportCard 
					theme={theme}
					delay={450}
					icon="server-outline" 
					title="Server & Database Costs" 
					description="More features require app to be dependent on servers." 
				/>
				<SupportCard 
					theme={theme}
					delay={550}
					icon="cafe-outline" 
					title="Late Night Coffee" 
					description="Fuel for the developers who stay up fixing bugs and building new features before exams." 
				/>

				<Animatable.View 
					animation="zoomIn" 
					duration={600} 
					delay={700} 
					style={styles.actionSection}
					useNativeDriver
				>
					<TouchableOpacity 
						style={[styles.primaryButton, { backgroundColor: theme.primary  }]} 
						activeOpacity={0.8}
						onPress={() => handleSupport()}
					>
						<Ionicons name="qr-code-outline" size={20} color={theme.background} style={{ marginRight: 10 }} />
						<Text style={[styles.primaryButtonText, {color:theme.background}]}>Support via UPI</Text>
					</TouchableOpacity>
					<TouchableOpacity 
						style={[styles.primaryButton, { borderColor: theme.primary, borderWidth:1, backgroundColor:theme.card}]} 
						activeOpacity={0.8}
						onPress={() => Linking.openURL(REPOSITORY_URL)}
					>
						<Ionicons name="star" size={20} color={theme.primary} style={{ marginRight: 10 }} />
						<Text style={[styles.primaryButtonText, {color:theme.primary}]}>Star this project</Text>
					</TouchableOpacity>
				</Animatable.View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
	heroSection: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 10},
	heroIconCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 20},
	heroTitle: { fontSize: 26, fontWeight: '800', marginBottom: 16, letterSpacing: 0.5 },
	storyText: { fontSize: 15, lineHeight: 24, textAlign: 'center', fontWeight: '500'},

	sectionHeader: { marginTop: 10, marginBottom: 15, paddingHorizontal: 5},
	sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5},

	supportCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2},
	iconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16},
	cardTextContainer: {flex: 1,},
	cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4},
	cardDesc: { fontSize: 13, lineHeight: 18, fontWeight: '500'},
	actionSection: { marginTop: 30, alignItems: 'center'},
	actionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 15},
	primaryButton: { flexDirection: 'row', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3},
	primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5},
	secondaryButton: { flexDirection: 'row', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1},
	secondaryButtonText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5},
});