import Header from '@/components/Header';
import { DEV_MESSAGE_URL, FAQ_URL } from '@/constants/links';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';

const FaqItem = ({ item, theme, delay }) => (
    <Animatable.View 
        animation="fadeInUp" 
        duration={600} 
        delay={delay} 
        useNativeDriver
        style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.borderColor }]}
        accessible={true}
        accessibilityLabel={`Question: ${item.question}. Answer: ${item.answer}`}
    >
        <View style={styles.textContainer} importantForAccessibility="no-hide-descendants">
            <Text style={[styles.itemTitle, { color: theme.text }]}>{item.question}</Text>
            <Text style={[styles.itemDesc, { color: theme.secondary }]}>{item.answer}</Text>
        </View>
    </Animatable.View>
);

const handleFeedback = () => {
    const email = "arsdsaathi.help@gmail.com";
    const subject = `FAQ Suggestion`;
    const body = "Question: \nAnswer: ";
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
};

export default function FaqTab({ navigation }) {
    const { theme } = useTheme();
    const [devMessage, setDevMessage] = useState(null);
    const [faqData, setFaqData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(DEV_MESSAGE_URL + "?t=" + Date.now())
            .then(res => res.json())
            .then(json => setDevMessage(json))
            .catch(err => console.log("Dev Message Fetch Error: ", err));

        fetch(FAQ_URL + "?t=" + Date.now())
            .then(res => res.json())
            .then(json => {
                setFaqData(json);
                setLoading(false);
            })
            .catch(err => {
                console.log("FAQ Fetch Error: ", err);
                setLoading(false);
            });
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Header screenName={"FAQs"} navigation={navigation} />
            
            <ScrollView 
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, paddingTop: 10 }} 
                showsVerticalScrollIndicator={false}
            >

                {/* --- MESSAGE FROM DEVS SECTION --- */}
                { devMessage &&
                    <Animatable.View 
                        animation="fadeInDown"
                        duration={600}
                        useNativeDriver
                        style={[styles.devCard, { backgroundColor: theme.error + '10', borderColor: theme.error + '30' }]}
                        accessible={true}
                        accessibilityLabel={`Message From The Developers: ${devMessage.message}`}
                    >
                        <View style={styles.textContainer} importantForAccessibility="no-hide-descendants">
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Ionicons name="megaphone" size={18} color={theme.error} style={{ marginRight: 6 }} />
                                <Text style={[styles.itemTitle, { color: theme.error, marginBottom: 0 }]}>Message From The Devs</Text>
                            </View>
                            <Text style={[styles.itemDesc, { color: theme.secondary }]}>{devMessage.message}</Text>
                        </View>
                    </Animatable.View>
                }

                {/* --- FAQ SECTION HEADER --- */}
                <Animatable.View 
                    animation="fadeIn" 
                    delay={200} 
                    useNativeDriver 
                    style={styles.sectionHeader}
                    accessible={true}
                    accessibilityRole="header"
                >
                    <Ionicons name="chatbubbles" size={20} color={theme.primary} style={{ marginRight: 8 }} importantForAccessibility="no" />
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Frequently Asked Questions</Text>
                </Animatable.View>

                {/* --- FAQ LIST --- */}
                { loading ? (
                    <View style={{ marginTop: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={theme.primary} accessibilityLabel="Loading FAQs" />
                    </View>
                ) : (
                    faqData && faqData.length > 0 ? (
                        <View style={styles.listContainer}>
                            {faqData.map((faq, index) => (
                                <FaqItem 
                                    key={`faq-${index}`} 
                                    item={faq} 
                                    theme={theme} 
                                    delay={300 + (index * 100)}
                                />
                            ))}
                        </View>
                    ) : (
                        <View style={{ marginTop: 40, alignItems: 'center' }} accessible={true} accessibilityLabel="No FAQs available right now.">
                            <Ionicons name="folder-open-outline" size={40} color={theme.secondary} importantForAccessibility="no" />
                            <Text style={{ color: theme.secondary, marginTop: 10, fontWeight: '500' }} importantForAccessibility="no">No FAQs available right now.</Text>
                        </View>
                    )
                )}
                
                <Animatable.View 
                    animation="fadeInDown"
                    duration={600}
                    delay={1000}
                    useNativeDriver
                    style={[styles.footerLegal, {marginTop: 30}]}
                >
                    <TouchableOpacity 
                        style={styles.footerItem} 
                        onPress={handleFeedback} 
                        accessibilityRole="link" 
                        accessibilityLabel="Suggest a new FAQ question via email"
                        accessibilityHint="Opens your email app to send a suggestion." 
                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    >
                        <Text style={[styles.footerLink, { color: theme.footer }]}>I want to suggest a question!</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingHorizontal: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },

    listContainer: {gap: 12 },
    itemCard: { flexDirection: 'row', padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'flex-start',  elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4},
    devCard: { flexDirection: 'row', padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'flex-start',  marginBottom: 25 },
    iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    textContainer: { flex: 1, justifyContent: 'center' },
    itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    itemDesc: { fontSize: 14,lineHeight: 22,fontWeight: '500' },
    footerLegal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    footerLink: { fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' }
});