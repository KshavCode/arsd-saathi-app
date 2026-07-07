import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Header from '@/components/Header';
import { HELPDESK_JSON_URL } from '@/constants/links';
import { useTheme } from '@/hooks/useTheme';

export default function HelpdeskTab({ navigation }) {
  const { theme } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(HELPDESK_JSON_URL);
        const json = await response.json();
        setData(json);
      } 
			catch (error) {
        console.error("Failed to fetch helpdesk data:", error);
        Alert.alert("Error", "Could not load helpdesk data.");
      } 
			finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

    const handleCall = (phoneNumber) => {
      const url = `tel:${phoneNumber}`;
      Linking.canOpenURL(url)
      	.then((supported) => {
      	  if (supported) {
      	    Linking.openURL(url);
      	  } 
					else {
      	    Alert.alert("Error", "Your device does not support calling.");
      	  }
      	})
      	.catch((err) => console.error('An error occurred', err));
    };
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Header screenName={"HELPDESK"} navigation={navigation} />
      
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={[styles.tableContainer, { backgroundColor: theme.card }]}>
              {data.map((item, index) => {
                const isLastItem = index === data.length - 1;
                return (
                  <View key={index} style={styles.rowWrapper}>
                    <View style={styles.row}>
                      {/* Left Side: Text Info */}
                      <View style={styles.infoContainer}>
                        <View style={styles.titleHeader}>
                          <Text style={[styles.inchargeText, { color: theme.text }]} numberOfLines={1}>{item.incharge}</Text>
                          <View style={styles.primary}>
                            <Text style={styles.categoryText}>{item.category}</Text>
                          </View>
                        </View>
                        <Text style={[styles.locationText, { color: theme.primary }]}>{item.location}</Text>
                      </View>
                      {/* Right Side: Compact Action Button */}
                      <TouchableOpacity 
                      	style={[styles.callButton, {backgroundColor: theme.success}]}
                      	onPress={() => handleCall(item.phone)}
                      	activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={18} color={theme.background} />
                      </TouchableOpacity>  
                    </View>
                    
                    {!isLastItem && <View style={[styles.divider, { backgroundColor: theme.border || '#E5E5EA' }]} />}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  scrollContent: { flexGrow: 1, paddingBottom: 40, paddingTop: 10 },

  tableContainer: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)'},
  rowWrapper: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16},
  infoContainer: { flex: 1, paddingRight: 16 },
  titleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  inchargeText: { fontSize: 15, fontWeight: '600', marginRight: 8 },
  categoryBadge: { backgroundColor: '#F2F2F7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryText: { fontSize: 10, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase' },
  locationText: { fontSize: 13, fontWeight: '400' },
  callButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  divider: {height: StyleSheet.hairlineWidth } // Uses the thinnest possible line on the devicemarginLeft: 16, // Indents the divider to align with the text, a common native design pattern
});