import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Header from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { helpdesk_list } from '@/constants/helpdesk_list';
import OfflineBanner from '@/components/NoInternet';

export default function HelpdeskTab({ navigation }) {
  const { theme } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setData(helpdesk_list);
      } catch (error) {
        console.error("Failed to fetch helpdesk data:", error);
        Alert.alert("Error", "Could not load helpdesk data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCall = (phoneNumber) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else Alert.alert("Error", "Your device does not support calling.");
      })
      .catch((err) => console.error('An error occurred', err));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header screenName={"HELPDESK"} navigation={navigation} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} accessibilityRole="progressbar" accessibilityLabel="Loading helpdesk contacts" />
        ) : (
          <View style={[styles.tableContainer, { backgroundColor: theme.card }]} accessibilityRole="list">
            {data.map((item, index) => {
              const isLastItem = index === data.length - 1;
              return (
                <View key={index} style={styles.rowWrapper} accessibilityRole="listitem">
                  <View style={styles.row}>
                    
                    {/* Text Info Group */}
                    <View 
                      style={styles.infoContainer}
                      accessible={true}
                      accessibilityRole="text"
                      accessibilityLabel={`${item.category}. Incharge: ${item.incharge}`}
                    >
                      <View style={styles.titleHeader} importantForAccessibility="no-hide-descendants">
                        <Text style={[styles.categoryText, { color: theme.primary }]}>{item.category}</Text>
                      </View>
                      <Text style={[styles.inchargeText, { color: theme.text }]} numberOfLines={1} importantForAccessibility="no-hide-descendants">{item.incharge}</Text>
                    </View>
                    
                    {/* Call Button */}
                    <TouchableOpacity 
                      style={[styles.callButton, {backgroundColor: theme.success}]}
                      onPress={() => handleCall(item.phone)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${item.category}`}
                      accessibilityHint={`Dials ${item.phone}`}
                    >
                      <Ionicons name="call" size={18} color={theme.background} importantForAccessibility="no" />
                    </TouchableOpacity>  
                  </View>
                  
                  {!isLastItem && <View style={[styles.divider, { backgroundColor: theme.border || '#E5E5EA' }]} />}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <OfflineBanner />
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  scrollContent: { flexGrow: 1, paddingBottom: 40, paddingTop: 10 },
  tableContainer: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)'},
  rowWrapper: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16},
  infoContainer: { flex: 1, paddingRight: 16 },
  titleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  categoryText: { fontSize: 15, fontWeight: '600', marginRight: 8 },
  inchargeText: { fontSize: 13, fontWeight: '400' },
  callButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 }
});