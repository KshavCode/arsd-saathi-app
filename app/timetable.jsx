import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import LZString from 'lz-string';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/themeStyle';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// The Official ARSD Time Template
const TIME_SLOTS = [
  '08:30 AM', '09:30 AM', '10:30 AM', '11:30 AM',
  '12:30 PM', '01:30 PM', '02:30 PM', '03:30 PM', '04:30 PM'
];

const DEFAULT_TIMETABLE = { 0:[], 1: [], 2: [], 3: [], 4: [], 5: []};

// --- DICTIONARY-BASED ULTRA SERIALIZER ---
const serializeTimetable = (tt) => {
  const subjectDict = [];
  
  // Pass 1: Build dictionary of unique subjects
  for (let d = 0; d < 6; d++) {
    if (tt[d]) {
      tt[d].forEach(c => {
         const cleanSub = (c.subject || '').replace(/[|~$,:]/g, '');
         if (cleanSub && !subjectDict.includes(cleanSub)) {
             subjectDict.push(cleanSub);
         }
      });
    }
  }

  const days = [];
  // Pass 2: Encode the timetable using the dictionary index
  for (let d = 0; d < 6; d++) {
    if (tt[d] && tt[d].length > 0) {
      const classes = tt[d].map(c => {
        const t = TIME_SLOTS.indexOf(c.slot);
        const cleanSub = (c.subject || '').replace(/[|~$,:]/g, '');
        const sIdx = subjectDict.indexOf(cleanSub); 
        const r = (c.room || '').replace(/[|~$,:]/g, '');
        const p = c.type === 'PR' ? 1 : 0;
        const dur = c.duration || 1;
        
        // Drop trailing defaults
        if (dur === 1 && p === 0 && !r) return `${t}|${sIdx}`;
        if (dur === 1 && p === 0) return `${t}|${sIdx}|${r}`;
        if (dur === 1) return `${t}|${sIdx}|${r}|${p}`;
        return `${t}|${sIdx}|${r}|${p}|${dur}`;
      }).join(';');
      days.push(`${d}:${classes}`);
    }
  }
  
  // Combine Dictionary and Schedule
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
// -----------------------------------------

export default function Timetable({ route, navigation, setIsDarkMode, isDarkMode }) {
  const theme = {
    background: isDarkMode ? Colors.dark.background : Colors.light.background,
    card: isDarkMode ? Colors.dark.card : Colors.light.card,
    text: isDarkMode ? Colors.dark.text : Colors.light.text,
    textSecondary: isDarkMode ? Colors.dark.secondary : Colors.light.secondary,
    primary: isDarkMode ? Colors.dark.primary : Colors.light.primary,
    secondary: isDarkMode ? Colors.dark.secondary : Colors.light.secondary,
    error: isDarkMode ? Colors.dark.error : Colors.light.error,
    success: isDarkMode ? Colors.dark.success : Colors.light.success,
    iconBg: isDarkMode ? Colors.dark.iconBg : Colors.light.iconBg,
    borderColor: isDarkMode ? Colors.dark.separator : Colors.light.separator,
    destructiveBg: isDarkMode ? Colors.dark.destructiveBg : Colors.light.destructiveBg,
    destructiveBorder: isDarkMode ? Colors.dark.destructiveBorder : Colors.light.destructiveBorder,
  };

  let day = new Date().getDay()-1;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('view');
  const [selectedDay, setSelectedDay] = useState(day === -1 ? 0 : day);

  const [timetable, setTimetable] = useState(DEFAULT_TIMETABLE);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]); 

  // Form States (Slot-Based)
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [formSubject, setFormSubject] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formType, setFormType] = useState('TH');
  const [formDuration, setFormDuration] = useState(1);

  // Share States
  const [importCode, setImportCode] = useState('');

  useEffect(() => {
    const initialize = async () => {
      try {
        const attRaw = await AsyncStorage.getItem('ATTENDANCE_DATA');
        if (attRaw) {
          const data = JSON.parse(attRaw);
          const theory = data.theory ? Object.keys(data.theory) : [];
          const practical = data.practical ? Object.keys(data.practical) : [];
          setAvailableSubjects([...new Set([...theory, ...practical])]);
        }

        const facRaw = await AsyncStorage.getItem('FACULTY_DATA');
        if (facRaw) {
            setFacultyList(JSON.parse(facRaw));
        }

        const ttRaw = await AsyncStorage.getItem('TIMETABLE_DATA');
        if (ttRaw) { setTimetable(JSON.parse(ttRaw)); }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    initialize();

    // DEEP LINK LISTENER
    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });

    return () => subscription.remove();
  }, []);

  const saveTimetable = async (newData) => {
      setTimetable(newData);
      await AsyncStorage.setItem('TIMETABLE_DATA', JSON.stringify(newData));
  };

  const getFacultyName = (subjectName) => {
      if (!facultyList || facultyList.length === 0 || !subjectName) return null;
      const match = facultyList.find(f =>
          f.PAPER_NAME &&
          f.PAPER_NAME.trim().toLowerCase() === subjectName.trim().toLowerCase()
      );
      if (!match) {
          const looseMatch = facultyList.find(f =>
             f.PAPER_NAME &&
             (f.PAPER_NAME.toLowerCase().includes(subjectName.toLowerCase()) ||
              subjectName.toLowerCase().includes(f.PAPER_NAME.toLowerCase()))
          );
          return looseMatch ? looseMatch.FAC_NAME : null;
      }
      return match.FAC_NAME;
  };

  // --- SLOT LOGIC ---
  const handleOpenSlot = (slotTime, existingClass = null) => {
    setEditingSlot(slotTime);
    if (existingClass) {
      setFormSubject(existingClass.subject);
      setFormRoom(existingClass.room);
      setFormType(existingClass.type);
      setFormDuration(existingClass.duration || 1);
    } else {
      setFormSubject(''); setFormRoom(''); setFormType('TH'); setFormDuration(1);
    }
    setShowSubjectModal(true);
  };

  const handleSaveClass = () => {
    if (!formSubject) { Alert.alert("Required", "Please select a subject."); return; }

    const newClass = {
      id: `${selectedDay}-${editingSlot}`,
      slot: editingSlot,
      subject: formSubject,
      room: formRoom,
      type: formType,
      duration: formDuration,
    };

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
      if (startIndex + duration < TIME_SLOTS.length) {
          return TIME_SLOTS[startIndex + duration];
      }
      return "05:30 PM";
  };

  // --- EXPORT/IMPORT LOGIC ---
  const handleExportLink = async () => {
    try {
      const flatString = serializeTimetable(timetable);
      if (!flatString || !flatString.includes('~')) {
        Alert.alert("Error!", "Kindly create your timetable first.");
        return;
      }

      const tinyCode = LZString.compressToEncodedURIComponent(flatString);
      const shareableLink = Linking.createURL(`timetable?data=${tinyCode}`);

      await Share.share({ 
          message: `Import my timetable to ArsdSaathi! Tap the link below:\n\n${shareableLink}`,
          title: 'Timetable Import Link' 
      });
    } catch (error) {
      Alert.alert("Error", "Could not generate link.");
    }
  };

  const handleDeepLink = (url) => {
      const data = Linking.parse(url);
      if (data.queryParams?.data) {
          processImportData(data.queryParams.data);
      }
  };

  const processImportData = (dataString) => {
    try {
      let code = dataString;
      if (dataString.includes('?data=')) {
          code = dataString.split('?data=')[1];
      }

      const rawString = LZString.decompressFromEncodedURIComponent(code);
      if (!rawString) throw new Error("Decompression failed");

      const expandedData = deserializeTimetable(rawString);
      saveTimetable({...DEFAULT_TIMETABLE, ...expandedData});

      setImportCode('');
      Alert.alert("Success", "Timetable imported successfully!");
      setActiveTab('view');
      
    } catch (e) {
      Alert.alert("Invalid Link", "The link or code you pasted is invalid or corrupted.");
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
        const classTypeFull = existingClass.type === 'TH' ? 'Theory' : 'Practical';
        const a11yLabel = `${time} to ${endTimeStr}. ${existingClass.subject}. Room ${existingClass.room || 'Not assigned'}. ${classTypeFull} class. ${facultyName ? `Taught by ${facultyName}` : ''}. ${isEditMode ? 'Double tap to edit this slot.' : ''}`;

        return (
          <TouchableOpacity
            key={time}
            style={[styles.classCard, { backgroundColor: theme.card, borderLeftColor: theme.primary, borderLeftWidth: 4 }]}
            onPress={() => isEditMode && handleOpenSlot(time, existingClass)}
            disabled={!isEditMode}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={a11yLabel}
          >
            <View style={styles.classContent} importantForAccessibility="no-hide-descendants">
              <Text style={[styles.classTime, { color: theme.primary }]}>{time} - {endTimeStr}</Text>
              <Text style={[styles.classSubject, { color: theme.text }]}>{existingClass.subject}</Text>
              <View style={styles.classMetaRow}>
                <View style={[styles.metaBadge, { backgroundColor: theme.iconBg }]}><Ionicons name="location" size={12} color={theme.textSecondary} /><Text style={[styles.metaText, { color: theme.textSecondary }]}>Room {existingClass.room || 'N/A'}</Text></View>
                <View style={[styles.metaBadge, { backgroundColor: theme.iconBg }]}><Ionicons name="book" size={12} color={theme.textSecondary} /><Text style={[styles.metaText, { color: theme.textSecondary }]}>{existingClass.type}</Text></View>
                {facultyName && (
                   <View style={[styles.metaBadge, { backgroundColor: theme.iconBg }]}>
                       <Ionicons name="person" size={12} color={theme.textSecondary} />
                       <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>{facultyName}</Text>
                   </View>
                )}
              </View>
            </View>
            {isEditMode && <Ionicons name="pencil" size={20} color={theme.textSecondary} importantForAccessibility="no" />}
          </TouchableOpacity>
        );
      }
      else {
        if (!isEditMode) return null;
        return (
          <TouchableOpacity
            key={time}
            style={[styles.emptySlot, { borderColor: theme.borderColor, backgroundColor: 'transparent' }]}
            onPress={() => handleOpenSlot(time)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Empty slot at ${time}. Double tap to add a class.`}
          >
            <Text style={{ color: theme.textSecondary, fontWeight: '600' }} importantForAccessibility="no">{time}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} importantForAccessibility="no-hide-descendants">
                <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                <Text style={{ color: theme.primary, fontWeight: '600' }}>Add Class</Text>
            </View>
          </TouchableOpacity>
        );
      }
    });
  };

  if (loading) {
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={theme.primary} accessibilityLabel="Loading timetable" />
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />

        {/* Header */}
        <View style={styles.headerRow} accessible={false}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go Back"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="caret-back" size={27} color={theme.primary} importantForAccessibility="no" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]} accessibilityRole="header" accessibilityLabel='Timetable'>TIMETABLE</Text>
            <TouchableOpacity
              style={[styles.themeButton, { backgroundColor: theme.card }]}
              onPress={() => setIsDarkMode(!isDarkMode)}
              accessibilityRole="button"
              accessibilityLabel="Toggle Theme"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color={isDarkMode ? "#FBBF24" : theme.primary} importantForAccessibility="no" />
            </TouchableOpacity>
        </View>

        <View style={[styles.tabContainer, { backgroundColor: theme.card, marginTop: 10, borderColor:theme.secondary, borderWidth:.5 }]} accessible={true} accessibilityRole="tablist">
            {['view', 'edit', 'share'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, activeTab === tab && [styles.tabActive, { backgroundColor: theme.primary }]]}
                  onPress={() => setActiveTab(tab)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === tab }}
                  accessibilityLabel={`${tab} tab`}
                >
                    <Text style={[styles.tabText, { color: activeTab === tab ? '#FFF' : theme.textSecondary }]} importantForAccessibility="no">{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
                </TouchableOpacity>
            ))}
        </View>

        {activeTab !== 'share' && (
            <View style={styles.daySelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                {DAYS.map((day, index) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayPill, { backgroundColor: theme.card, borderColor:theme.primary, borderWidth:1 }, selectedDay === index && { backgroundColor: theme.primary }]}
                  onPress={() => setSelectedDay(index)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedDay === index }}
                  accessibilityLabel={`${day}day`}
                >
                    <Text style={[styles.dayText, { color: selectedDay === index ? '#FFF' : theme.textSecondary }]} importantForAccessibility="no">{day}</Text>
                </TouchableOpacity>
                ))}
            </ScrollView>
            </View>
        )}

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

            {activeTab === 'view' && (
                <View>
                  {timetable[selectedDay]?.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.card }]} accessible={true} accessibilityLabel="No Classes Today!">
                      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }} importantForAccessibility="no">No Classes Today!</Text>
                    </View>
                  ) : (renderSlots(false))}
                </View>
            )}

            {activeTab === 'edit' && (
                <View>
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 16 }]} accessibilityRole="header">Tap a slot to assign a subject</Text>
                    {renderSlots(true)}
                </View>
            )}

            {activeTab === 'share' && (
                <View style={{ gap: 20, height:800 }}>
                    {/* Export Card */}
                    <View style={[styles.formCard, { backgroundColor: theme.card }]}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.iconBg }]}>
                            <Ionicons name="share-social-outline" size={32} color={theme.primary} />
                        </View>
                        <Text style={[styles.shareTitle, { color: theme.text }]}>Share Timetable</Text>
                        <Text style={[styles.shareDesc, { color: theme.textSecondary }]}>Generate a magic link to send your schedule directly to your classmates via WhatsApp.</Text>

                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: theme.primary, width: '100%' }]}
                          onPress={handleExportLink}
                        >
                            <Ionicons name="paper-plane-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.primaryButtonText}>Share Link</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Import Card (Manual Fallback) */}
                    <View style={[styles.formCard, { backgroundColor: theme.card }]}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.iconBg }]}>
                            <Ionicons name="download-outline" size={32} color={theme.primary} />
                        </View>
                        <Text style={[styles.shareTitle, { color: theme.text }]}>Manual Import</Text>
                        <Text style={[styles.shareDesc, { color: theme.textSecondary }]}>If the link didn&apos;t open automatically, just paste the URL or the code here.</Text>

                        <TextInput
                            style={[styles.inputField, { borderColor: theme.primary, color: theme.text, width: '100%', marginBottom: 16 }]}
                            placeholder="Paste link here..."
                            placeholderTextColor={theme.textSecondary}
                            value={importCode}
                            onChangeText={setImportCode}
                        />

                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: importCode ? theme.primary : theme.borderColor, width: '100%' }]}
                            onPress={() => processImportData(importCode)}
                            disabled={!importCode}
                        >
                            <Text style={[styles.primaryButtonText, !importCode && { color: theme.textSecondary }]}>Import Data</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScrollView>

        {/* --- SUBJECT EDIT MODAL --- */}
        <Modal visible={showSubjectModal} transparent animationType="slide" accessibilityViewIsModal={true}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} accessibilityLabel="Close modal" accessibilityRole="button">
                <View style={[styles.modalContent, { backgroundColor: theme.card }]} accessible={false}>
                    <View style={styles.modalHeaderRow} accessible={true}>
                        <Text style={[styles.modalHeader, { color: theme.text }]} accessibilityRole="header" accessibilityLabel={`Editing slot of ${editingSlot}`}>Slot: {editingSlot}</Text>
                        <TouchableOpacity onPress={() => setShowSubjectModal(false)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                            <Ionicons name="close-circle" size={28} color={theme.error} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 20, maxHeight: 500 }} showsVerticalScrollIndicator={false}>

                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Select Subject</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginBottom: 20 }} accessible={false}>
                            {availableSubjects.map((sub) => (
                                <TouchableOpacity
                                    key={sub}
                                    style={[styles.chip, { backgroundColor: formSubject === sub ? theme.primary : theme.iconBg }]}
                                    onPress={() => setFormSubject(sub)}
                                >
                                    <Text style={{ color: formSubject === sub ? '#FFF' : theme.text, fontWeight: '600' }}>{sub}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.pillContainerRow}>
                            <View style={{flex:1, width:100}}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Room</Text>
                                <TextInput
                                    style={[styles.inputField, { borderColor: theme.borderColor, color: theme.text, paddingVertical: 14 }]}
                                    placeholder="e.g. 35"
                                    placeholderTextColor={theme.textSecondary}
                                    value={formRoom}
                                    onChangeText={setFormRoom}
                                />
                            </View>

                            <View>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Type</Text>
                                <TouchableOpacity
                                    style={[styles.compactPill, { borderColor: theme.borderColor, backgroundColor: theme.primary + '20' }]}
                                    onPress={() => setFormType(formType === 'TH' ? 'PR' : 'TH')}
                                >
                                    <Text style={[styles.compactPillText, { color: theme.primary }]}>{formType}</Text>
                                    <Ionicons name="swap-horizontal" size={14} color={formType === 'TH' ? theme.textSecondary : theme.primary} style={{marginLeft: 4}}/>
                                </TouchableOpacity>
                            </View>

                            <View>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Hrs</Text>
                                <TouchableOpacity
                                    style={[styles.compactPill, { borderColor: theme.borderColor, backgroundColor: theme.iconBg }]}
                                    onPress={() => {
                                        if (formDuration === 1) {
                                            if (TIME_SLOTS.indexOf(editingSlot) === TIME_SLOTS.length - 1) {
                                                Alert.alert("Invalid", "Cannot schedule a 2-hour class at 4:30 PM.");
                                            } else setFormDuration(2);
                                        } else setFormDuration(1);
                                    }}
                                >
                                    <Text style={[styles.compactPillText, { color: theme.textSecondary }]}>{formDuration}h</Text>
                                    <Ionicons name="swap-horizontal" size={14} color={theme.textSecondary} style={{marginLeft: 4}} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: theme.primary, marginBottom: 12 }]}
                          onPress={handleSaveClass}
                        >
                            <Text style={styles.primaryButtonText}>Save Class to {editingSlot}</Text>
                        </TouchableOpacity>

                        {timetable[selectedDay]?.find(c => c.slot === editingSlot) && (
                             <TouchableOpacity
                               style={[styles.primaryButton, { backgroundColor: theme.destructiveBg }]}
                               onPress={() => handleDeleteClass(editingSlot)}
                             >
                                 <Text style={[styles.primaryButtonText, { color: theme.error }]}>Clear Slot</Text>
                             </TouchableOpacity>
                        )}
                        <View style={{height: 30}}/>
                    </ScrollView>
                </View>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </Modal>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  themeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3 },

  tabContainer: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 16, padding: 5, marginBottom: 15 },
  tabButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  tabActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '700' },

  daySelector: { marginBottom: 15 },
  dayPill: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  dayText: { fontSize: 14, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },

  classCard: { flexDirection: 'row', borderRadius: 20, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2, alignItems: 'center', justifyContent: 'space-between' },
  classContent: { flex: 1 },
  classTime: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  classSubject: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  classMetaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
  metaText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },

  emptySlot: { flexDirection: 'row', padding: 18, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', marginBottom: 12, justifyContent: 'space-between', alignItems: 'center' },
  emptyCard: { padding: 40, borderRadius: 24, alignItems: 'center', marginTop: 20 },

  formCard: { padding: 24, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2, alignItems: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  shareTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  shareDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  modalHeader: { fontSize: 18, fontWeight: '800' },
  inputLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
  inputField: { width: '100%', borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 16, fontWeight: '600' },

  pillContainerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30, alignItems: 'flex-end' },
  compactPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 15, borderRadius: 16, borderWidth: 1 },
  compactPillText: { fontSize: 15, fontWeight: '800' },

  primaryButton: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});