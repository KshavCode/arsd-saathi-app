import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });

    return () => unsubscribe();
  }, []);

  // If online, render nothing
  if (!isOffline) return null;

  return (
    <SafeAreaView style={styles.floatingContainer}>
      <View style={styles.banner}>
        <Ionicons name={"cloud-offline"} size={20} color="white" />
        <Text style={styles.bannerText}>No Internet Connection</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  floatingContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 997},
  banner: { backgroundColor: '#ff6a6ad6', paddingVertical: 5, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'center', gap: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, elevation: 5 },
  bannerText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});