import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import QRCode from "react-native-qrcode-svg";
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import LZString from 'lz-string';
import Ionicons from '@expo/vector-icons/Ionicons';
import { titleCase } from 'title-case';

import Header from '@/components/Header';
import OfflineBanner from '@/components/NoInternet';
import { toastConfig } from '@/constants/toastConfig';
import { useTheme } from '@/hooks/useTheme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = ['08:30 AM', '09:30 AM', '10:30 AM', '11:30 AM', '12:30 PM', '01:30 PM', '02:30 PM', '03:30 PM', '04:30 PM'];
const DEFAULT_TIMETABLE = { 0:[], 1: [], 2: [], 3: [], 4: [], 5: []};

const serializeTimetable = (tt) => {
  const subjectDict = [];
  for (let d = 0; d < 6; d++) {
    if (tt[d]) {
      tt[d].forEach(c => {
        const cleanSub = (c.subject || '').replace(/[|~$,:]/g, '');
        if (cleanSub && !subjectDict.includes(cleanSub)) subjectDict.push(cleanSub);
      });
    }
  }

  const days = [];
  for (let d = 0; d < 6; d++) {
    if (tt[d] && tt[d].length > 0) {
      const classes = tt[d].map(c => {
        const t = TIME_SLOTS.indexOf(c.slot);
        const cleanSub = (c.subject || '').replace(/[|~$,:]/g, '');
        const sIdx = subjectDict.indexOf(cleanSub); 
        const r = (c.room || '').replace(/[|~$,:]/g, '');
        const p = c.type === 'PR' ? 1 : 0;
        const dur = c.duration || 1;
        
        if (dur === 1 && p === 0 && !r) return `${t}|${sIdx}`;
        if (dur === 1 && p === 0) return `${t}|${sIdx}|${r}`;
        if (dur === 1) return `${t}|${sIdx}|${r}|${p}`;
        return `${t}|${sIdx}|${r}|${p}|${dur}`;
      }).join(';');
      days.push(`${d}:${classes}`);
    }
  }
  return subjectDict.join(',') + '~' + days.join('$');
};

const deserializeTimetable = (str) => {
  const tt = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[] };
  if (!str || !str.includes('~')) return tt;
  
  const parts = str.split('~');
  const subjectDict = parts[0].split(',');
  const daysStr = parts[1];

  if (!daysStr) return tt;

  daysStr.split('$').forEach(dayStr => {
    const [d, classesStr] = dayStr.split(':');
    if (classesStr) {
      tt[d] = classesStr.split(';').map(cStr => {
        const p = cStr.split('|');
        return {
          id: `${d}-${TIME_SLOTS[p[0]]}`,
          slot: TIME_SLOTS[p[0]],
          subject: subjectDict[parseInt(p[1], 10)] || '', 
          room: p[2] || '',
          type: p[3] === '1' ? 'PR' : 'TH',
          duration: p[4] ? parseInt(p[4], 10) : 1
        };
      });
    }
  });
  return tt;
};

export default function Timetable({ route, navigation }) {
  let day = new Date().getDay()-1;
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('view');
  const [selectedDay, setSelectedDay] = useState(day === -1 ? 0 : day);
  const [timetable, setTimetable] = useState(DEFAULT_TIMETABLE);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]); 

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [formSubject, setFormSubject] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formType, setFormType] = useState('TH');
  const [formDuration, setFormDuration] = useState(1);
  const [formLabel, setFormLabel] = useState('');

  const [importCode, setImportCode] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        let extractedSubjects = [];

        // 1. Attempt to get subjects from Attendance Data
        const attRaw = await AsyncStorage.getItem('ATTENDANCE_DATA');
        if (attRaw) {
          const data = JSON.parse(attRaw);
          const theory = data.theory ? Object.keys(data.theory) : [];
          const practical = data.practical ? Object.keys(data.practical) : [];
          extractedSubjects = [...new Set([...theory, ...practical])];
        }

        // 2. Fetch Faculty Data and apply fallback if Attendance subjects are empty
        const facRaw = await AsyncStorage.getItem('FACULTY_DATA');
        if (facRaw) {
          const parsedFaculty = JSON.parse(facRaw);
          setFacultyList(parsedFaculty);

          if (extractedSubjects.length === 0 && Array.isArray(parsedFaculty)) {
            const facultySubjects = parsedFaculty
              .map(f => f.PAPER_NAME ? f.PAPER_NAME.trim() : '')
              .filter(name => name !== '');
            extractedSubjects = [...new Set(facultySubjects)];
          }
        }

        // 3. Set the final subject list (will be empty if both sources lacked subjects)
        setAvailableSubjects(extractedSubjects);

        // 4. Fetch existing timetable
        const ttRaw = await AsyncStorage.getItem('TIMETABLE_DATA');
        if (ttRaw) setTimetable(JSON.parse(ttRaw));

      } catch (error) { 
        console.error(error); 
      } finally { 
        setLoading(false); 
      }
    };

    initialize();

    const subscription = Linking.addEventListener('url', ({ url }) => handleImportLink(url));
    Linking.getInitialURL().then((url) => { if (url) handleImportLink(url); });
    return () => subscription.remove();
  }, []);

  const saveTimetable = async (newData) => {
    setTimetable(newData);
    await AsyncStorage.setItem('TIMETABLE_DATA', JSON.stringify(newData));
  };

  const getFacultyName = (subjectName) => {
    if (!facultyList || facultyList.length === 0 || !subjectName) return null;
    const match = facultyList.find(f => f.PAPER_NAME && f.PAPER_NAME.trim().toLowerCase() === subjectName.trim().toLowerCase());
    if (!match) {
      const looseMatch = facultyList.find(f => f.PAPER_NAME && (f.PAPER_NAME.toLowerCase().includes(subjectName.toLowerCase()) || subjectName.toLowerCase().includes(f.PAPER_NAME.toLowerCase())));
      return looseMatch ? looseMatch.FAC_NAME : null;
    }
    return titleCase(match.FAC_NAME.toLowerCase());
  };

  const handleOpenSlot = (slotTime, existingClass = null) => {
    setEditingSlot(slotTime);
    if (existingClass) {
      setFormSubject(existingClass.subject);
      setFormRoom(existingClass.room);
      setFormType(existingClass.type);
      setFormDuration(existingClass.duration || 1);
      setFormLabel(existingClass.label);
    } else {
      setFormSubject(''); setFormRoom(''); setFormType('TH'); setFormDuration(1); setFormLabel('');
    }
    setShowSubjectModal(true);
  };

  const handleSaveClass = () => {
    if (!formSubject) { 
      Toast.show({position: 'top', topOffset:50, type:'success', text1:'Required!', text2: 'Please select a subject.', props: {borderColor: theme.error, bg: theme.card, text1Color: theme.error, text2Color: theme.secondary}});
      return; 
    }
    const newClass = { id: `${selectedDay}-${editingSlot}`, slot: editingSlot, subject: formSubject, room: formRoom, type: formType, duration: formDuration, label: formLabel };
    let updatedDay = timetable[selectedDay].filter(item => item.slot !== editingSlot);
    if (formDuration === 2) {
      const currentIndex = TIME_SLOTS.indexOf(editingSlot);
      if (currentIndex + 1 < TIME_SLOTS.length) {
        const nextSlot = TIME_SLOTS[currentIndex + 1];
        updatedDay = updatedDay.filter(item => item.slot !== nextSlot);
      }
    }
    updatedDay.push(newClass);
    updatedDay.sort((a, b) => TIME_SLOTS.indexOf(a.slot) - TIME_SLOTS.indexOf(b.slot));
    saveTimetable({ ...timetable, [selectedDay]: updatedDay });
    setShowSubjectModal(false);
  };

  const handleDeleteClass = (slotTime) => {
    const updatedDay = timetable[selectedDay].filter(item => item.slot !== slotTime);
    saveTimetable({ ...timetable, [selectedDay]: updatedDay });
    setShowSubjectModal(false);
  };

  const getEndTime = (startSlot, duration) => {
    const startIndex = TIME_SLOTS.indexOf(startSlot);
    if (startIndex + duration < TIME_SLOTS.length) return TIME_SLOTS[startIndex + duration];
    return "05:30 PM";
  };

  const handleExport = async () => {
    try {
      const flatString = serializeTimetable(timetable);
      if (!flatString || !flatString.includes('~')) {
        Toast.show({position: 'top', topOffset:50, type:'success', text1:'Error!', text2: 'Kindly create your timetable first.', props: {borderColor: theme.error, bg: theme.card, text1Color: theme.error, text2Color: theme.secondary}});
        return;
      }
      const tinyCode = LZString.compressToEncodedURIComponent(flatString);
      const link = Linking.createURL(`Timetable?data=${tinyCode}`);
      setShareLink(link);
      setShowQRModal(true);
    } catch (error) {
      Toast.show({position: 'top', topOffset:50, type:'success', text1:'Error!', text2: "Couldn't generate the link.", props: {borderColor: theme.error, bg: theme.card, text1Color: theme.error, text2Color: theme.secondary}});
      console.log(error);
    }
  };

  const handleImportLink = (url) => {
    const data = Linking.parse(url);
    if (data.queryParams?.data) processImportData(data.queryParams.data);
  };

  const processImportData = (dataString) => {
    try {
      let code = dataString;
      if (dataString.includes('?data=')) code = dataString.split('?data=')[1];
      const rawString = LZString.decompressFromEncodedURIComponent(code);
      if (!rawString) throw new Error("Decompression failed");
      const expandedData = deserializeTimetable(rawString);
      saveTimetable({...DEFAULT_TIMETABLE, ...expandedData});
      setImportCode('');
      setShowQRModal(false);
      Toast.show({position: 'top', topOffset:50, type:'success', text1:'Timetable Imported!', text2: 'Changes have been done to your schedule.', props: {borderColor: theme.success, bg: theme.card, text1Color: theme.success, text2Color: theme.secondary}});
      setActiveTab('view');
    } catch (e) {
      Toast.show({position: 'top', topOffset:50, type:'success', text1:'Invalid!', text2: 'Seems like the QR / Link is broken,', props: {borderColor: theme.error, bg: theme.card, text1Color: theme.error, text2Color: theme.secondary}});
      console.log(e);
    }
  };

  const exportToPDF = async () => {
    const activeSlots = new Set();
    DAYS.forEach((_, index) => {
      const dayClasses = timetable[index] || [];
      dayClasses.forEach(c => {
        const startIndex = TIME_SLOTS.indexOf(c.slot);
        if (startIndex > -1) {
          for (let i = 0; i < (c.duration || 1); i++) {
            if (TIME_SLOTS[startIndex + i]) activeSlots.add(TIME_SLOTS[startIndex + i]);
          }
        }
      });
    });

    const usedTimeSlots = TIME_SLOTS.filter(slot => activeSlots.has(slot));

    if (usedTimeSlots.length === 0) {
      Toast.show({position: 'top', topOffset:50, type:'error', text1:"Empty Timetable!", text2: 'Add classes before exporting.'});
      return;
    }

    const tableRows = DAYS.map((dayName, index) => {
      const dayClasses = timetable[index] || [];
      let skipNext = false;
      const classesHtml = usedTimeSlots.map((slot) => {
        if (skipNext) { skipNext = false; return ''; }
        const c = dayClasses.find(item => item.slot === slot);
        if (c) {
          if (c.duration === 2) skipNext = true;
          const bgColor = c.type === 'PR' ? '#E8F5E9' : '#E3F2FD'; 
          const typeColor = c.type === 'PR' ? '#2E7D32' : '#1565C0'; 
          return `<td colspan="${c.duration || 1}" style="padding: 8px 4px; border: 1px solid #ddd; text-align: center; background-color: ${bgColor}; vertical-align: top;"><div style="font-weight: 800; font-size: 10px; color: #333; word-break: break-word; line-height: 1.2; margin-bottom: 4px;">${c.subject}</div><div style="color: #666; font-size: 10px; margin-bottom: 2px;"><b>Room: ${c.room || ''}</b></div><div style="font-weight: 800; font-size: 10px; color: ${typeColor};">${c.type}</div></td>`;
        }
        return `<td style="padding: 8px 4px; border: 1px solid #ddd; text-align: center; color: #ddd; vertical-align: middle;">-</td>`;
      }).join('');
      return `<tr><td style="padding: 8px 4px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9; text-align: center; color: #333; font-size: 11px;">${dayName}</td>${classesHtml}</tr>`;
    }).join('');

    const htmlContent = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 15px; background-color: #fff; } h1 { color: #800000; text-align: center; margin-bottom: 5px; font-size: 22px; } p { color: #555; font-size: 11px; margin-top: 0; margin-bottom: 20px; } table { width: 100%; border-collapse: collapse; table-layout: fixed; } th { background-color: #800000; color: white; padding: 10px 4px; font-size: 10px; text-align: center; border: 1px solid #660000; word-wrap: break-word; }</style></head><body><h1>Weekly Timetable</h1><p style="text-align: center;">Generated using <b>ArsdSaathi</b></p><table><thead><tr><th style="width: 5%;">Day</th>${usedTimeSlots.map(s => `<th>${s}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      Toast.show({position: 'top', topOffset:50, type:'success', text1:"Success!", text2: `File has been saved to ${uri}`, props: {borderColor: theme.success, bg: theme.card, text1Color: theme.success, text2Color: theme.secondary}});
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Toast.show({position: 'top', topOffset:50, type:'error', text1:"Could not generate the PDF!", text2: 'Please try again later.', props: {borderColor: theme.error, bg: theme.card, text1Color: theme.error, text2Color: theme.secondary}});
      console.log(error);
    }
  };

  const renderSlots = (isEditMode) => {
    let skipNext = false;
    return TIME_SLOTS.map((time, index) => {
      if (skipNext) { skipNext = false; return null; }
      const existingClass = timetable[selectedDay]?.find(c => c.slot === time);
      if (existingClass && existingClass.duration === 2) skipNext = true;
      
      if (existingClass) {
        const facultyName = getFacultyName(existingClass.subject);
        const endTimeStr = getEndTime(time, existingClass.duration);
        const accessibilityString = `${time} to ${endTimeStr}. ${existingClass.subject}. Room ${existingClass.room || 'unspecified'}. ${existingClass.type === 'TH' ? 'Theory' : 'Practical'}. ${facultyName ? `Faculty: ${facultyName}` : ''}`;
        return (
          <TouchableOpacity
            key={`${selectedDay}-${existingClass?.subject || 'empty'}`}
            style={[styles.classCard, { backgroundColor: theme.card, borderLeftColor: theme.primary, borderLeftWidth: 4 }]}
            onPress={() => isEditMode && handleOpenSlot(time, existingClass)}
            disabled={!isEditMode}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole={isEditMode ? "button" : "text"}
            accessibilityLabel={accessibilityString}
            accessibilityHint={isEditMode ? "Double tap to edit this slot" : ""}
          >
            <Animatable.View style={styles.classContent} animation='fadeIn' duration={300} delay={index*50} easing='ease-out' useNativeDriver importantForAccessibility="no-hide-descendants">
              <Text style={[styles.classTime, { color: theme.primary }]}>{time} - {endTimeStr}</Text>
              <Text style={[styles.classSubject, { color: theme.text }]}>{existingClass.subject}</Text>
              <View style={styles.classMetaRow}>
                <View style={[styles.metaBadge, { backgroundColor: theme.background + '70' }]}><Ionicons name="location" size={12} color={theme.secondary} /><Text style={[styles.metaText, { color: theme.secondary }]}>Room {existingClass.room || 'N/A'}</Text></View>
                <View style={[styles.metaBadge, { backgroundColor: theme.background + '70' }]}><Ionicons name="book" size={12} color={theme.secondary} /><Text style={[styles.metaText, { color: theme.secondary }]}>{existingClass.type}</Text></View>
                {facultyName && (
                  <View style={[styles.metaBadge, { backgroundColor: theme.background + '70' }]}>
                    <Ionicons name="person" size={12} color={theme.secondary} />
                    <Text style={[styles.metaText, { color: theme.secondary }]} numberOfLines={1}>{facultyName}</Text>
                  </View>
                )}
                {existingClass.label && (
                  <View style={[styles.metaBadge, { backgroundColor: theme.error + '20' }]}>
                    <Ionicons name="document" size={12} color={theme.text} />
                    <Text style={[styles.metaText, { color: theme.text }]} numberOfLines={1}>{existingClass.label}</Text>
                  </View>
                )}
              </View>
            </Animatable.View>
            {isEditMode && <Ionicons name="pencil" size={20} color={theme.secondary} importantForAccessibility="no" />}
          </TouchableOpacity>
        );
      } else {
        if (!isEditMode) return null;
        return (
          <View key={time} style={[styles.emptySlot, { backgroundColor: 'transparent' }]}>
            <Text style={{ color: theme.secondary, fontWeight: '600', fontSize: 18 }} importantForAccessibility="no">{time}</Text>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} 
              onPress={() => handleOpenSlot(time)}
              activeOpacity={0.5}
              accessibilityRole="button"
              accessibilityLabel={`Add class at ${time}`}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.primary} importantForAccessibility="no" />
              <Text style={{ color: theme.primary, fontWeight: '600' }} importantForAccessibility="no">Add Class</Text>
            </TouchableOpacity>
          </View>
        );
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} accessibilityRole="progressbar" accessibilityLabel="Loading timetable" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header navigation={navigation} screenName='TIMETABLE' />

      {/* Custom Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: theme.card, marginTop: 10, borderColor:theme.secondary, borderWidth:.5 }]} accessibilityRole="tablist">
        {['view', 'edit', 'share'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && [styles.tabActive, { backgroundColor: theme.primary }]]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
            accessibilityLabel={`${tab} tab`}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.background : theme.secondary }]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab !== 'share' && (
        <View style={styles.daySelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} accessibilityRole="tablist">
            {DAYS.map((day, index) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayPill, { backgroundColor: theme.card, borderColor:theme.primary, borderWidth:1 }, selectedDay === index && { backgroundColor: theme.primary }]}
              onPress={() => setSelectedDay(index)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedDay === index }}
            >
              <Text style={[styles.dayText, { color: selectedDay === index ? theme.background : theme.secondary }]}>{day}</Text>
            </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingTop: 20 }}>
        {activeTab === 'view' && (
          <View>
            {timetable[selectedDay]?.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.card }]} accessible={true} accessibilityRole="alert" accessibilityLabel="No classes scheduled on this day.">
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }} importantForAccessibility="no">No Classes on this day!</Text>
              </View>
            ) : (renderSlots(false))}
          </View>
        )}
        
        {activeTab === 'edit' && (
          <View>
            <Text style={[styles.sectionLabel, { color: theme.secondary, marginBottom: 16 }]} accessibilityRole="header">Tap a slot to assign a subject</Text>
            {renderSlots(true)}
          </View>
        )}
        
        {activeTab === 'share' && (
          <View style={{ gap: 20, height:900 }}>
            <View style={[styles.formCard, { backgroundColor: theme.card }]}>
              <View style={{ flexDirection: 'row', width: '100%' }}>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary, flex: 1 }]} onPress={exportToPDF} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Download timetable as PDF">
                  <Ionicons name="download-outline" size={18} color={theme.background} style={{ marginRight: 8 }} importantForAccessibility="no" />
                  <Text style={[styles.primaryButtonText, {color:theme.background}]} importantForAccessibility="no">Download as PDF</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Export Card */}
            <View style={[styles.formCard, { backgroundColor: theme.card }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.background + '70' }]} importantForAccessibility="no">
                <Ionicons name="qr-code-outline" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.shareTitle, { color: theme.text }]} accessibilityRole="header">Share Timetable</Text>
              <Text style={[styles.shareDesc, { color: theme.secondary }]}>Let other ArsdSaathi users import your timetable.</Text>
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary, flex: 1 }]} onPress={handleExport} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Export timetable to QR code and link">
                  <Ionicons name="share-outline" size={18} color={theme.background} style={{ marginRight: 8 }} importantForAccessibility="no" />
                  <Text style={[styles.primaryButtonText, {color:theme.background}]} importantForAccessibility="no">Export</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.formCard, { backgroundColor: theme.card, marginTop: 10 }]}>
              <Text style={[styles.inputLabel, { color: theme.secondary, width: '100%' }]} nativeID="importLabel">Paste Link / Code</Text>
              <TextInput
                style={[styles.inputField, { borderColor: theme.primary, color: theme.text, width: '100%', marginBottom: 16 }]}
                placeholder="Paste link here..."
                placeholderTextColor={theme.secondary}
                value={importCode}
                onChangeText={setImportCode}
                accessibilityLabelledBy="importLabel"
              />
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: importCode ? theme.primary : theme.primary+'50', width: '100%' }]}
                onPress={() => processImportData(importCode)}
                disabled={!importCode}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ disabled: !importCode }}
                accessibilityLabel="Import Data"
              >
                <Text style={[styles.primaryButtonText, importCode && {color:theme.background}]} importantForAccessibility="no">Import Data</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* --- QR DISPLAY MODAL --- */}
      <Modal visible={showQRModal} transparent animationType="fade" accessibilityViewIsModal={true}>
        <View style={styles.modalBackdropCenter}>
          <View style={[styles.qrModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeaderRowCentered}>
              <Text style={[styles.shareTitle, { color: theme.text, margin: 0 }]} accessibilityRole="header">Scan to Sync</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)} accessibilityRole="button" accessibilityLabel="Close QR modal">
                <Ionicons name="close-circle" size={28} color={theme.secondary} importantForAccessibility="no" />
              </TouchableOpacity>
            </View>
            <View style={{ backgroundColor: '#FFF', borderRadius: 15, marginBottom: 10 }} importantForAccessibility="no">
              {shareLink ? <QRCode value={shareLink} size={220} /> : null}
            </View>
            <Text style={[styles.shareDesc, { color: theme.secondary }]}>Scan with your phone's QR scanner app.</Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.background, borderColor: theme.primary, borderWidth: 1, width: '100%' }]}
              onPress={async () => await Share.share({ message: `Sync my ArsdSaathi timetable!\n\n${shareLink}` })}
              accessibilityRole="button"
              accessibilityLabel="Share link via other apps"
            >
              <Ionicons name="share-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} importantForAccessibility="no" />
              <Text style={[styles.primaryButtonText, { color: theme.primary }]} importantForAccessibility="no">Share Link Instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- SUBJECT EDIT MODAL --- */}
      <Modal visible={showSubjectModal} transparent animationType="slide" accessibilityViewIsModal={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSubjectModal(false)} accessibilityRole="button" accessibilityLabel="Dismiss edit modal">
            <View style={[styles.modalContent, { backgroundColor: theme.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeader, { color: theme.text }]} accessibilityRole="header">Slot: {editingSlot}</Text>
                <TouchableOpacity onPress={() => setShowSubjectModal(false)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close-circle" size={28} color={theme.error} importantForAccessibility="no" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ padding: 20, maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.inputLabel, { color: theme.secondary }]}>Select Subject</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                  {availableSubjects.map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.chip, { backgroundColor: formSubject === sub ? theme.secondary : theme.background}]}
                      onPress={() => setFormSubject(sub)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: formSubject === sub }}
                      accessibilityLabel={sub}
                    >
                      <Text style={{ color: formSubject === sub ? theme.background : theme.primary, fontWeight: '600' }} importantForAccessibility="no">{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.pillContainerRow}>
                  <View style={{flex:1, minWidth:100}}>
                    <Text style={[styles.inputLabel, { color: theme.secondary }]} nativeID="roomLabel">Room</Text>
                    <TextInput
                      style={[styles.inputField, { borderColor: theme.secondary, color: theme.text, paddingVertical: 14 }]}
                      placeholder="e.g. 35"
                      placeholderTextColor={theme.secondary}
                      value={formRoom}
                      onChangeText={setFormRoom}
                      accessibilityLabelledBy="roomLabel"
                    />
                  </View>
                  <View>
                    <Text style={[styles.inputLabel, { color: theme.secondary }]}>Type</Text>
                    <TouchableOpacity
                      style={[styles.compactPill, { borderColor: theme.secondary, backgroundColor: theme.primary + '20' }]}
                      onPress={() => setFormType(formType === 'TH' ? 'PR' : 'TH')}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle class type. Currently ${formType === 'TH' ? 'Theory' : 'Practical'}`}
                    >
                      <Text style={[styles.compactPillText, { color: theme.primary }]} importantForAccessibility="no">{formType}</Text>
                      <Ionicons name="swap-horizontal" size={14} color={formType === 'TH' ? theme.secondary : theme.primary} style={{marginLeft: 4}} importantForAccessibility="no" />
                    </TouchableOpacity>
                  </View>
                  <View>
                    <Text style={[styles.inputLabel, { color: theme.secondary }]}>Hrs</Text>
                    <TouchableOpacity
                      style={[styles.compactPill, { borderColor: theme.secondary, backgroundColor: theme.background + '70' }]}
                      onPress={() => {
                        if (formDuration === 1) {
                          if (TIME_SLOTS.indexOf(editingSlot) === TIME_SLOTS.length - 1) Toast.show({position: 'top', topOffset:20, type:'success', text1:'Invalid!', text2: 'Cannot schedule a 2-hour class at 4:30 PM.', props: {borderColor: theme.error, bg: theme.card, text1Color: theme.error, text2Color: theme.secondary}});
                          else setFormDuration(2);
                        } else setFormDuration(1);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle duration. Currently ${formDuration} hours`}
                    >
                      <Text style={[styles.compactPillText, { color: theme.secondary }]} importantForAccessibility="no">{formDuration}h</Text>
                      <Ionicons name="swap-horizontal" size={14} color={theme.secondary} style={{marginLeft: 4}} importantForAccessibility="no" />
                    </TouchableOpacity>
                  </View>
                  <View style={{flex:1, minWidth:100}}>
                    <TextInput
                      style={[styles.inputField, { borderColor: theme.secondary, color: theme.text, paddingVertical: 10 }]}
                      placeholder="Label (Optional)"
                      placeholderTextColor={theme.secondary}
                      value={formLabel}
                      onChangeText={setFormLabel}
                      accessibilityLabel="Optional label for the class"
                    />
                  </View>
                </View>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary, marginBottom: 12 }]} onPress={handleSaveClass} accessibilityRole="button">
                  <Text style={[styles.primaryButtonText, {color:theme.background}]}>Save Class</Text>
                </TouchableOpacity>
                {timetable[selectedDay]?.find(c => c.slot === editingSlot) && (
                  <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.destructiveBg }]} onPress={() => handleDeleteClass(editingSlot)} accessibilityRole="button">
                    <Text style={[styles.primaryButtonText, { color: theme.error }]}>Clear Slot</Text>
                  </TouchableOpacity>
                )}
                <View style={{height: 30}}/>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
        <Toast config={toastConfig} />
      </Modal>
      <OfflineBanner />
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingVertical: 10  },
  tabContainer: { flexDirection: 'row', borderRadius: 16, padding: 5, marginBottom: 15 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '700' },
  daySelector: { marginBottom: 10 },
  dayPill: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10},
  dayText: { fontSize: 14, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  classCard: { flexDirection: 'row', borderRadius: 20, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2, alignItems: 'center', justifyContent: 'space-between' },
  classContent: { flex: 1 },
  classTime: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  classSubject: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  classMetaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
  metaText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  emptySlot: { flexDirection: 'row', paddingHorizontal: 18, paddingVertical:10, justifyContent: 'space-between', alignItems: 'center' },
  emptyCard: { padding: 40, borderRadius: 24, alignItems: 'center', marginTop: 20 },
  formCard: { padding: 20, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2, alignItems: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  shareTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  shareDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems:'center' },
  modalBackdropCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 30, overflow: 'hidden', width:'95%' },
  qrModalContent: { padding: 30, borderRadius: 30, alignItems: 'center', width: '100%', maxWidth: 350 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  modalHeaderRowCentered: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  modalHeader: { fontSize: 18, fontWeight: '800' },
  inputLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
  inputField: { width: '100%', borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 16, fontWeight: '600' },
  pillContainerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30, alignItems: 'flex-end' },
  compactPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 15, borderRadius: 16, borderWidth: 1 },
  compactPillText: { fontSize: 15, fontWeight: '800' },
  primaryButton: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20 },
  primaryButtonText: { fontSize: 16, fontWeight: '800' },
});