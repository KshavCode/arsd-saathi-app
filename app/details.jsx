import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Header from '@/components/Header';
import OfflineBanner from '@/components/NoInternet';
import { useTheme } from '@/hooks/useTheme';


const DetailRow = ({ label, value, icon, theme, isLast, delay }) => (
  <Animatable.View
    style={[styles.detailRow, !isLast && { borderBottomColor: theme.background, borderBottomWidth: 1 }]}
    accessible={true}
    accessibilityRole="text"
    accessibilityLabel={`${label}: ${value || "Not available"}`}
    animation="zoomIn"
    duration={500}
    delay={delay}
    useNativeDriver
  >
    <View style={[styles.iconBox, { backgroundColor: theme.background + '70' }]} importantForAccessibility="no-hide-descendants">
      <Ionicons name={icon} size={20} color={theme.primary} />
    </View>
    <View style={styles.detailTextContainer} importantForAccessibility="no-hide-descendants">
      <Text style={[styles.detailLabel, { color: theme.secondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.text }]}>{value || "N/A"}</Text>
    </View>
  </Animatable.View>
);

const FacultyCard = ({ data, theme, delay }) => {
  const facultyName = data.FAC_NAME || "Unknown Faculty";
  const paperName = data.PAPER_NAME || data.Subject || "N/A";
  const section = data["PAPER SECTION"] || data["Section"];
  const accessibilityString = `Faculty Name: ${facultyName}. Teaching Subject: ${paperName}. ${section ? `Section: ${section}.` : 'N/A'}`;
  
  return (
    <Animatable.View 
      style={[styles.facultyCard, { backgroundColor: theme.card, borderColor: theme.primary + '40' }]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityString}
      animation='fadeInLeft'
      delay={delay}
      duration={500}
      useNativeDriver
    >
      <View style={styles.cardHeader} importantForAccessibility="no-hide-descendants">
        <View style={styles.headerTextCtx}>
          <Text style={[styles.teacherName, { color: theme.text }]}>
            {titleCase(facultyName.toLowerCase())}
          </Text>
          <Text style={[styles.teacherCode, { color: theme.secondary }]}>
            {data.FAC_CODE ? `Faculty Code: ${data.FAC_CODE}` : "No Code"}
          </Text>
        </View>
      </View>
      
      <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />
      
      {/* Subject Details --- */}
      <View style={styles.cardBody} importantForAccessibility="no-hide-descendants">
        <Text style={[styles.label, { color: theme.secondary }]}>Teaching Subject</Text>
        <Text style={[styles.paperName, { color: theme.text }]}>
          {paperName}
        </Text>
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: theme.background+'70' }]}>
            <Ionicons name="document-text-outline" size={12} color={theme.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: theme.primary }]}>
              {data["Paper Code"] || data.PAPER_ID || "No ID"}
            </Text>
          </View>
          {section && (
            <View style={[styles.badge, { backgroundColor: theme.background+'70' }]}>
              <Ionicons name="people-outline" size={12} color={theme.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.badgeText, { color: theme.primary }]}>
                Sec: {section}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animatable.View>
  );
};

// ==========================================
// MAIN SCREEN WRAPPER (State Master)
// ==========================================
export default function AttendanceScreen({ navigation }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('basic');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header navigation={navigation} screenName='DETAILS' />
      
      {/* 1. Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: theme.card, borderColor: theme.secondary }]}>
        {['basic', 'faculty'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && [styles.tabActive, { backgroundColor: theme.primary }]]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.background : theme.secondary }]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 3. Tab Contents (Receiving shared props) */}
      {activeTab === 'basic' ? (
        <BasicView />
      ) : (
        <FacultyView />
      )}
      <OfflineBanner />
    </SafeAreaView>
  );
}

// ==========================================
// 1. BASIC VIEW CONTENT
// ==========================================
function BasicView() {
  const {theme} = useTheme()
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loadData = async () => {
      try {
        const basicRaw = await AsyncStorage.getItem('BASIC_DETAILS');
        // fetch credentials in case of error
        const credsRaw = await AsyncStorage.getItem('USER_CREDENTIALS');
        let combinedData = {};
        if (basicRaw) {
            combinedData = JSON.parse(basicRaw);
        }
        // Merge
        if (credsRaw) {
          const creds = JSON.parse(credsRaw);
          combinedData.name = combinedData.name || creds.name;
          combinedData.rollNo = combinedData.rollNo || creds.rollNo;
        }
        setProfileData(combinedData);
      } 
      catch (error) {
        console.error("Error loading Profile data:", error);
      } 
      finally {setLoading(false)}
    };
    loadData();
  }, []);
  const displayFields = [
    { key: 'name', label: 'Student Name', icon: 'person' },
    { key: 'rollNo', label: 'College Roll No.', icon: 'id-card' },
    { key: 'enrollmentNumber', label: 'Enrollment No.', icon: 'document-text' },
    { key: 'course', label: 'Course', icon: 'school' },
    { key: 'year', label: 'Current Year', icon: 'calendar' },
    { key: 'fatherName', label: "Father's Name", icon: 'people' },
    { key: 'email', label: 'Email Address', icon: 'mail' },
    { key: 'mobile', label: 'Mobile Number', icon: 'call' },
    { key: 'address', label: 'Permanent Address', icon: 'location' },
  ];
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} accessibilityLabel="Loading personal details" />
      ) : (
        <View style={ { backgroundColor: theme.card, borderColor: theme.background }}>
          {profileData ? displayFields.map((field, index) => (
            <DetailRow
              key={field.key}
              label={field.label}
              value={profileData[field.key]}
              icon={field.icon}
              theme={theme}
              isLast={index === displayFields.length - 1}
              delay = {index*50}
            />
          )) : (
            <View style={{ padding: 40, alignItems: 'center' }} accessible={true} accessibilityLabel="Warning: No details found.">
              <Ionicons name="alert-circle-outline" size={40} color={theme.secondary} importantForAccessibility="no" />
              <Text style={{ color: theme.secondary, marginTop: 10 }} importantForAccessibility="no">No details found.</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ==========================================
// 2. FACULTY VIEW CONTENT
// ==========================================
function FacultyView() {
  const {theme} = useTheme()
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const rawData = await AsyncStorage.getItem('FACULTY_DATA');
        if (rawData) {
          const parsedData = JSON.parse(rawData);
          setFacultyList(Array.isArray(parsedData) ? parsedData : [parsedData]);
        }
      } 
      catch (error) {
        console.error("Error loading faculty data:", error);
      } 
      finally {setLoading(false)}
    };
    loadData();
  }, []);

  return (
    <>
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} accessibilityLabel="Loading faculty data" />
      ) : facultyList.length === 0 ? (
        <View style={styles.centerContainer} accessible={true}>
          <Ionicons name="people-outline" size={48} color={theme.secondary} style={{ marginBottom: 10, opacity: 0.5 }} importantForAccessibility="no" />
          <Text style={{ color: theme.secondary }}>No faculty details found.</Text>
        </View>
      ) : (
        <FlatList 
          data={facultyList}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ index, item }) => <FacultyCard data={item} theme={theme} delay={index*150}/>}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );
}

// ==========================================
// 3. CONSOLIDATED STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 50 },
  tabContainer: { flexDirection: 'row', borderRadius: 16, padding: 5, marginBottom: 15, borderWidth: 0.5 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '700' },

  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  detailTextContainer: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.8 },
  detailValue: { fontSize: 15, fontWeight: '500', flexWrap: 'wrap' },

  facultyCard: { borderWidth: 1, borderRadius: 16, marginBottom: 16, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: 'hidden'},
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16},
  headerTextCtx: {flex: 1},
  teacherName: { fontSize: 16, fontWeight: '700', marginBottom: 4},
  teacherCode: {fontSize: 12,fontWeight: '500'},
  divider: { height: 1, width: '100%'},

  cardBody: { padding: 16, paddingTop: 14},
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: '700', opacity: 0.8},
  paperName: { fontSize: 15, fontWeight: '600', lineHeight: 22, marginBottom: 14},
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8},
  badgeText: { fontSize: 12, fontWeight: '700'},

})