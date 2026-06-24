import React, { useEffect, useMemo, useState } from 'react';
import { 
  ActivityIndicator, 
  Modal, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Header from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';

// ==========================================
// MAIN SCREEN WRAPPER (State Master)
// ==========================================
export default function AttendanceScreen({ navigation }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('attendance');
  
  // Lifted Shared State
  const [fullData, setFullData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch data ONCE for the entire screen
  useEffect(() => {
    const fetchLocalData = async () => {
      try {
        const rawData = await AsyncStorage.getItem('ATTENDANCE_DATA');
        if (rawData) {
          const data = JSON.parse(rawData); 
          setFullData(data);
          
          const theorySubjects = data.theory ? Object.keys(data.theory) : [];
          const tutorialSubjects = data.practical ? Object.keys(data.practical) : (data.tutorial ? Object.keys(data.tutorial) : []);
          const uniqueSubjects = [...new Set([...theorySubjects, ...tutorialSubjects])];
          
          setSubjects(uniqueSubjects);
          if (uniqueSubjects.length > 0) {
            setSelectedSubject(uniqueSubjects[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load attendance master data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLocalData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header navigation={navigation} screenName='ATTENDANCE' />
      
      {/* 1. Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: theme.card, borderColor: theme.secondary }]}>
        {['attendance', 'evaluator'].map((tab) => (
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

      {/* 2. COMMON SUBJECT SELECTOR */}
      <View style={styles.controlsRow}>
        <Text style={[styles.selectLabel, { color: theme.secondary }]}>Select Subject:</Text>
        <TouchableOpacity style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.secondary }]} onPress={() => setShowDropdown(true)} activeOpacity={0.8}>
          <Text style={[styles.dropdownText, { color: theme.text }]} numberOfLines={1}>
            {selectedSubject || "No subjects available"}
          </Text>
          <Ionicons name={'chevron-down'} size={18} color={theme.secondary} />
        </TouchableOpacity>
        
        <Modal visible={showDropdown} transparent={true} animationType="fade" onRequestClose={() => setShowDropdown(false)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPressOut={() => setShowDropdown(false)}>
            <View style={[styles.modalListContainer, { backgroundColor: theme.background, borderColor: theme.secondary }]}>
              <Text style={[styles.modalListHeader, { color: theme.text, backgroundColor: theme.iconBg, borderColor: theme.primary }]}>Select a Subject</Text>
              <ScrollView style={{ maxHeight: 350 }}>
                {subjects.map((sub) => (
                  <TouchableOpacity key={sub} style={[styles.dropdownItem, { borderBottomColor: theme.secondary }]} onPress={() => { setSelectedSubject(sub); setShowDropdown(false); }}>
                    <Text style={[styles.dropdownItemText, { color: theme.secondary }, selectedSubject === sub && { color: theme.primary, fontWeight: '700' }]}>{sub}</Text>
                    {selectedSubject === sub && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      {/* 3. Tab Contents (Receiving shared props) */}
      {activeTab === 'attendance' ? (
        <AttendanceView fullData={fullData} selectedSubject={selectedSubject} subjects={subjects} />
      ) : (
        <PredictView fullData={fullData} selectedSubject={selectedSubject} />
      )}
      
    </SafeAreaView>
  );
}

// ==========================================
// 1. ATTENDANCE VIEW CONTENT
// ==========================================
function AttendanceView({ fullData, selectedSubject, subjects }) {
  const { theme } = useTheme();

  const getValue = (row, ...keys) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
    }
    return '-';
  };

  const getRowAccessibilityLabel = (row, isHeaderRow) => {
    if (isHeaderRow) return null;
    const [month, lecAtt, lecTotal, pracAtt, pracTotal] = row;
    let label = `In ${month}, `;
    if (lecAtt !== '-' && lecTotal !== '-') label += `you attended ${lecAtt} out of ${lecTotal} theory classes. `;
    if (pracAtt !== '-' && pracTotal !== '-') label += `You attended ${pracAtt} out of ${pracTotal} practical classes.`;
    return label;
  };

  const grid = useMemo(() => {
    if (!selectedSubject || !fullData) return [];
    
    let formattedGrid = [];
    formattedGrid.push(['Month', 'Lec Total', 'Lec Att.', 'Prac Total', 'Prac Att.']);
    
    const theoryRows = fullData.theory?.[selectedSubject] || [];
    const tutorialRows = fullData.practical?.[selectedSubject] || [];
    const mergedByMonth = {};
    
    const addRowsToMap = (rows, type) => {
      if (!Array.isArray(rows)) return;
      rows.forEach(row => {
        const month = row.MONTH || row.Month || 'Unknown';
        if (!mergedByMonth[month]) mergedByMonth[month] = { month, lecAtt: '-', lecTotal: '-', pracAtt: '-', pracTotal: '-' };

        if (type === 'theory') {
          mergedByMonth[month].lecAtt = getValue(row, 'Final Lect. Attended', 'LECT_ATTD', 'Lecture Attended');
          mergedByMonth[month].lecTotal = getValue(row, 'Final Lect. Held', 'LECT_HELD', 'Lecture Delivered');
        } else if (type === 'practical') {
          mergedByMonth[month].pracAtt = getValue(row, 'Final Lect. Attended', 'LECT_ATTD', 'Lecture Attended');
          mergedByMonth[month].pracTotal = getValue(row, 'Final Lect. Held', 'LECT_HELD', 'Lecture Delivered');
        }
      });
    };

    addRowsToMap(theoryRows, 'theory');
    addRowsToMap(tutorialRows, 'practical');

    Object.values(mergedByMonth).forEach(data => {
      formattedGrid.push([data.month, data.lecTotal, data.lecAtt, data.pracTotal, data.pracAtt]);
    });
    
    return formattedGrid;
  }, [selectedSubject, fullData]);

  const COLS = 5;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
      {(!fullData || subjects.length === 0) ? (
        <Animatable.View style={styles.centerContainer} accessible={true} animation='zoomIn' duration={500} useNativeDriver> 
          <View style={[styles.emptyIconCtx, { backgroundColor: theme.card + 'A0' }]}>
            <Ionicons name="calendar-outline" size={48} color={theme.primary} style={{ opacity: 0.8 }} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Record Found</Text>
          <Text style={[styles.emptySub, { color: theme.secondary }]}>Attendance data is empty, kindly verify it on portal in case of an error.</Text>
        </Animatable.View>
      ) : (
        <View>
          <View style={[styles.tableContainer, { borderColor: theme.secondary }]} accessibilityLabel={`Attendance records for ${selectedSubject}`}>
            {grid.map((row, rIdx) => {
              const isHeaderRow = rIdx === 0;
              return (
                <View key={`row-${rIdx}`} style={[styles.tableRow, { backgroundColor: theme.card }]} accessible={!isHeaderRow} accessibilityLabel={getRowAccessibilityLabel(row, isHeaderRow)}>
                  {row.map((cell, cIdx) => {
                    const isRowHeader = cIdx === 0 && !isHeaderRow;
                    return (
                      <View key={`cell-${rIdx}-${cIdx}`} style={[styles.tableCell, { borderColor: theme.secondary }, isHeaderRow && { backgroundColor: theme.primary + '20' }, cIdx === COLS - 1 && styles.tableCellLast]}>
                        <Text style={[styles.cellText, { color: theme.text }, isHeaderRow && { color: theme.text, fontWeight: '700', fontSize: 10 }, isRowHeader && { fontWeight: '600' }]} numberOfLines={1} adjustsFontSizeToFit>{cell}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>

          {fullData.theory_percentage && (
            <View style={[styles.footerInfo, { backgroundColor: theme.card + 'A0' }]}>
              <Ionicons name="pie-chart" size={20} color={theme.primary} />
              <Text style={[styles.footerText, { color: theme.primary }]}>Theory Attendance: <Text style={{ fontWeight: 'bold' }}>{fullData.theory_percentage}%</Text></Text>
            </View>
          )}
          
          {fullData.practical_percentage && (
            <View style={[styles.footerInfo, { backgroundColor: theme.card + 'A0', marginTop: 10 }]}>
              <Ionicons name="pie-chart" size={20} color={theme.primary} />
              <Text style={[styles.footerText, { color: theme.primary }]}>Practical Attendance: <Text style={{ fontWeight: 'bold' }}>{fullData.practical_percentage}%</Text></Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ==========================================
// 2. PREDICT VIEW CONTENT
// ==========================================
function PredictView({ fullData, selectedSubject }) {
  const { theme } = useTheme();
  
  const [selectedType, setSelectedType] = useState('TH');
  const [attendCount, setAttendCount] = useState(0);
  const [bunkCount, setBunkCount] = useState(0);

  useEffect(() => {
    setAttendCount(0);
    setBunkCount(0);
  }, [selectedSubject, selectedType]);

  const getVal = (row, ...keys) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") return parseInt(row[key], 10) || 0;
    }
    return 0;
  };

  const currentStats = useMemo(() => {
    if (!fullData || !selectedSubject) return { attended: 0, held: 0, percentage: 0 };
    const targetObject = selectedType === 'TH' ? fullData.theory : (fullData.practical || fullData.tutorial);
    const rows = targetObject?.[selectedSubject] || [];

    let attended = 0;
    let held = 0;

    rows.forEach(row => {
      attended += getVal(row, 'Final Lect. Attended', 'LECT_ATTD', 'Lecture Attended');
      held += getVal(row, 'Final Lect. Held', 'LECT_HELD', 'Lecture Delivered');
    });

    const percentage = held === 0 ? 0 : (attended / held) * 100;
    return { attended, held, percentage: percentage.toFixed(1) };
  }, [fullData, selectedSubject, selectedType]);

  const prediction = useMemo(() => {
    const { attended, held } = currentStats;
    const newAttended = attended + attendCount;
    const newHeld = held + attendCount + bunkCount;
    const newPercentage = newHeld === 0 ? 0 : (newAttended / newHeld) * 100;
    
    let insight = "";
    let insightColor = theme.secondary;
    
    if (held > 0) {
      const target = 0.67;
      const currentDecimal = attended / held;
      if (currentDecimal >= target) {
        const safeBunks = Math.floor((attended - (target * held)) / target);
        if (safeBunks > 0) {
          insight = `You can safely bunk ${safeBunks} more class${safeBunks > 1 ? 'es' : ''} and stay above 67%.`;
          insightColor = theme.success;
        } else {
          insight = `You are exactly at the border! Don't bunk the next class.`;
          insightColor = theme.secondary;
        }
      } else {
        const reqClasses = Math.ceil(((target * held) - attended) / 0.33);
        insight = `You need to attend ${reqClasses} more class(es) to reach 67%.`;
        insightColor = theme.error;
      }
    }
    
    return { newPercentage: newPercentage.toFixed(1), insight, insightColor, isLow: newPercentage < 67 };
  }, [currentStats, attendCount, bunkCount, theme]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* Type toggle (Theory vs Practical) */}
      <Animatable.View animation='fadeInRight' duration={500} useNativeDriver style={{ marginBottom: 15 }}>
        <TouchableOpacity 
          style={[styles.compactPill, { borderColor: theme.secondary, backgroundColor: theme.card }]} 
          onPress={() => setSelectedType(selectedType === 'TH' ? 'PR' : 'TH')}
        >
          <Text style={[styles.compactPillText, { color: theme.text, fontSize: 14 }]}>
            Evaluating: <Text style={{ color: theme.primary }}>{selectedType === 'TH' ? 'Theory Lectures' : 'Practical / Tutorials'}</Text>
          </Text>
          <Ionicons name="swap-horizontal" size={16} color={theme.primary} style={{ marginLeft: 8 }}/>
        </TouchableOpacity>
      </Animatable.View>

      {currentStats.held === 0 ? (
        <Animatable.View style={[styles.emptyCard, { backgroundColor: theme.card }]} animation='fadeInLeft' duration={500} useNativeDriver>
          <Ionicons name="information-circle-outline" size={32} color={theme.secondary} style={{ marginBottom: 10 }} />
          <Text style={{ color: theme.text, textAlign: 'center', fontWeight: '500' }}>No {selectedType === 'TH' ? 'Theory' : 'Practical'} data found for this subject.</Text>
          <Text style={{ color: theme.secondary, textAlign: 'center', fontSize: 13, marginTop: 5 }}>Try switching the evaluation mode above.</Text>
        </Animatable.View>
      ) : (
        <Animatable.View animation='fadeInLeft' duration={600} delay={100} useNativeDriver>
          <Text style={[styles.sectionLabel, { color: theme.secondary }]}>1. CURRENT STATS</Text>
          <View style={[styles.statusCard, { backgroundColor: theme.card }]}>
            <View style={styles.statusCol}>
              <Text style={[styles.statusVal, { color: theme.text }]}>{currentStats.attended}/{currentStats.held}</Text>
              <Text style={[styles.statusLabel, { color: theme.secondary }]}>Classes Attended</Text>
            </View>
            <View style={[styles.statusDivider, { backgroundColor: theme.secondary }]} />
            <View style={styles.statusCol}>
              <Text style={[styles.statusVal, { color: Number(currentStats.percentage) < 67 ? theme.error : theme.success }]}>{currentStats.percentage}%</Text>
              <Text style={[styles.statusLabel, { color: theme.secondary }]}>Current Total</Text>
            </View>
          </View>

          <View style={{ backgroundColor: theme.card }}>
            <View style={styles.insightBox}>
              <Ionicons name="bulb-outline" size={25} color={prediction.insightColor} />
              <Text style={[styles.insightText, { color: prediction.insightColor }]}>{prediction.insight}</Text>
            </View>
            <Text style={{ color: theme.primary, padding: 16, paddingTop: 0, fontSize: 13 }}>Reminder: A 2-hour class gives you 2 points worth of attendance!</Text>
          </View>

          <Text style={[styles.sectionLabel, { color: theme.secondary, marginTop: 20 }]}>2. Plan Future Classes</Text>  
          <View style={styles.controlsGrid}>
            <View style={[styles.controlBox, { backgroundColor: theme.card }]}>
              <Text style={[styles.controlLabel, { color: theme.success }]}>To Attend</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity style={[styles.counterBtn, { backgroundColor: theme.background }]} onPress={() => setAttendCount(Math.max(0, attendCount - 1))}>
                  <Ionicons name="remove" size={25} color={theme.primary} />
                </TouchableOpacity>
                <Text style={[styles.counterVal, { color: theme.text }]}>{attendCount}</Text>
                <TouchableOpacity style={[styles.counterBtn, { backgroundColor: theme.background }]} onPress={() => { if (attendCount < 15) setAttendCount(Math.max(0, attendCount + 1)); }}>
                  <Ionicons name="add" size={25} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.controlBox, { backgroundColor: theme.card }]}>
              <Text style={[styles.controlLabel, { color: theme.error }]}>To Miss</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity style={[styles.counterBtn, { backgroundColor: theme.background }]} onPress={() => setBunkCount(Math.max(0, bunkCount - 1))}>
                  <Ionicons name="remove" size={25} color={theme.primary} />
                </TouchableOpacity>
                <Text style={[styles.counterVal, { color: theme.text }]}>{bunkCount}</Text>
                <TouchableOpacity style={[styles.counterBtn, { backgroundColor: theme.background }]} onPress={() => { if (bunkCount < 15) setBunkCount(Math.max(0, bunkCount + 1)); }}>
                  <Ionicons name="add" size={25} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={[styles.resultCard, { backgroundColor: prediction.isLow ? theme.error : theme.success }]}>
            <Text style={styles.resultLabel}>Predicted Attendance (x)</Text>
            <Text style={styles.resultVal}>{prediction.newPercentage}%</Text>
            <Text style={styles.resultSub}>({currentStats.attended + attendCount} / {currentStats.held + attendCount + bunkCount} classes)</Text>
          </View>
        </Animatable.View>
      )}

      <View style={{ padding: 10 }}>
        <Text style={[styles.infoText, { color: theme.secondary, fontSize: 18, marginTop: 10, textAlign: 'justify' }]}>MARKS REWARD SYSTEM</Text>
        <Text style={[styles.infoText, { color: theme.secondary, textAlign: 'justify' }]}>85% &lt; x = 6 marks</Text>
        <Text style={[styles.infoText, { color: theme.secondary, textAlign: 'justify' }]}>80% &lt; x &lt; 85%  = 4.8 marks</Text>
        <Text style={[styles.infoText, { color: theme.secondary, textAlign: 'justify' }]}>75% &lt; x &lt; 80%  = 3.6 marks</Text>
        <Text style={[styles.infoText, { color: theme.secondary, textAlign: 'justify' }]}>70% &lt; x &lt; 75%  = 2.4 marks</Text>
        <Text style={[styles.infoText, { color: theme.secondary, textAlign: 'justify' }]}>67% &lt; x &lt; 70%  = 1.2 marks</Text>
        <Text style={[styles.infoText, { color: theme.secondary, textAlign: 'justify', fontStyle: 'italic' }]}>No marks are awarded to attendance below 67%</Text>
      </View>
    </ScrollView>
  );
}

// ==========================================
// 3. CONSOLIDATED STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  tabContainer: { flexDirection: 'row', borderRadius: 16, padding: 5, marginBottom: 15, borderWidth: 0.5 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '700' },
  centerContainer: { flex: 1, height: 400, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyIconCtx: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyCard: { padding: 30, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  controlsRow: { marginBottom: 15, zIndex: 10 },
  selectLabel: { fontSize: 13, marginBottom: 8, fontWeight: '600' },
  dropdown: { paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { fontSize: 15, fontWeight: '600', flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalListContainer: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  modalListHeader: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', padding: 16, borderBottomWidth: 0.5 },
  dropdownItem: { paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5 },
  dropdownItemText: { fontSize: 15 },
  tableContainer: { overflow: 'hidden', borderRadius: 12, borderWidth: 0.5, marginBottom: 20 },
  tableRow: { flexDirection: 'row' },
  tableCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 1, borderRightWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  tableCellLast: { borderRightWidth: 0 },
  cellText: { fontSize: 13, textAlign: 'center' },
  compactPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  compactPillText: { fontSize: 15, fontWeight: '700' }, 
  statusCard: { flexDirection: 'row', padding: 15, paddingBottom: 0 },
  statusCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusDivider: { width: 1, height: '80%', alignSelf: 'center' },
  statusVal: { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  statusLabel: { fontSize: 12, fontWeight: '500' },
  insightBox: { flexDirection: 'row', padding: 16, alignItems: 'center', marginBottom: 10, gap: 10 },
  insightText: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  controlsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginBottom: 25 },
  controlBox: { flex: 1, borderRadius: 16, padding: 15, alignItems: 'center' },
  controlLabel: { fontSize: 15, fontWeight: '700', marginBottom: 15 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  counterVal: { fontSize: 22, fontWeight: 'bold', width: 30, textAlign: 'center' },
  resultCard: { marginBottom: 20, borderRadius: 16, padding: 25, alignItems: 'center', justifyContent: 'center' },
  resultLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  resultVal: { fontSize: 48, color: '#FFF', fontWeight: '900', marginBottom: 5 },
  resultSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  footerInfo: { padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  infoText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, marginBottom: 5, textAlign: 'center' }
}); 