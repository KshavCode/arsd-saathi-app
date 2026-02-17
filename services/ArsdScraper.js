import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const ArsdScraper = ({ credentials, onProgress, onFinish, onError }) => {
  const webViewRef = useRef(null);

  const runScraping = `
    (function() {
      const post = (type, payload) => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
        }
      };
      const log = (msg) => post('log', { message: msg });
      const sendData = (type, data) => post(type, data);
      const sendError = (msg) => post('error', { message: msg });

      const getText = (id) => {
        const el = document.getElementById(id);
        return el ? el.innerText.trim() : "";
      };

      const waitForElement = (id, callback, timeout = 10000) => {
        const start = Date.now();
        const interval = setInterval(() => {
          const el = document.getElementById(id);
          if (el) {
            clearInterval(interval);
            callback(el);
          } else if (Date.now() - start > timeout) {
            clearInterval(interval);
            callback(null);
          }
        }, 500);
      };

      const setSelect = (el, val) => {
        if (!el) return;
        const normalized = parseInt(val).toString();
        const padded = val.length < 2 ? "0" + val : val;
        for (let i = 0; i < el.options.length; i++) {
          let optVal = el.options[i].value;
          if (optVal === val || optVal === normalized || optVal === padded) {
            el.selectedIndex = i;
            return;
          }
        }
      };

      const url = window.location.href;

      // --- 1. LOGIN ROUTE ---
      if (url.toLowerCase().includes("login")) {
        if (sessionStorage.getItem("login_attempted") === "true") {
             sessionStorage.removeItem("login_attempted");
             sendError("Wrong credentials or Server Error");
             return; 
        }

        waitForElement("txtrollno", (input) => {
          if (!input) {
              sendError("Connection timed out. Login page not loading.");
              return;
          }

          log("🔑 Verifying credentials...");
          input.value = "${credentials.rollNo}";
          document.getElementById("txtname").value = "${credentials.name}";
          
          const dob = "${credentials.dob}".split("-");
          const selects = document.getElementsByTagName("select");
          if (selects.length >= 4) {
            setSelect(selects[1], dob[0]);
            setSelect(selects[2], dob[1]);
            setSelect(selects[3], dob[2]);
          }
          
          setTimeout(() => {
            const btn = document.getElementById("btnsearch") || document.querySelector('input[type="submit"]');
            if (btn) {
                sessionStorage.setItem("login_attempted", "true");
                btn.click();
                setTimeout(() => {
                      if (window.location.href.toLowerCase().includes("login")) {
                          sessionStorage.removeItem("login_attempted");
                          sendError("Server not responding. Please try again.");
                      }
                }, 15000); 
            }
          }, 1000);
        });
      }

      // --- 2. BASIC DETAILS ---
      else if (url.includes("STD_Basic_Details.aspx")) {
        sessionStorage.removeItem("login_attempted");

        waitForElement("lbleno", (el) => {
          if (!el) return;
          log("Extracting Profile...");
          const profile = {
            name: getText("lblname") || "${credentials.name}",
            rollNo: getText("lblrollno") || "${credentials.rollNo}",
            enrollmentNumber: getText("lbleno"),
            fatherName: getText("lblfname"),
            course: getText("lblcoursecode") + " - " + getText("lblcoursename"),
            year: getText("lblpart") + " Sem " + getText("lblsem"),
            mobile: getText("lblmobileno"),
            email: getText("lblemail"),
            address: getText("lbladdress_local")
          };
          sendData("data_basic", profile);
          
          setTimeout(() => {
            window.location.href = "https://www.arsdcollege.in/Internet/Student/Mentor_Details.aspx";
          }, 800);
        });
      }

      // --- 3. MENTOR DETAILS ---
      else if (url.includes("Mentor_Details.aspx")) {
        waitForElement("lblmentor_name", (el) => {
          if (!el) return;
          const mentorData = { mentor: getText("lblmentor_name") };
          sendData("data_mentor", mentorData);

          setTimeout(() => {
            window.location.href = "https://www.arsdcollege.in/Internet/Student/Attendance_Report_Monthly.aspx";
          }, 800);
        });
      }

      // --- 4. ATTENDANCE ---
      else if (url.includes("Attendance_Report_Monthly.aspx")) {
        const typeSelect = document.getElementById("ddlpapertype");
        const currentVal = typeSelect ? typeSelect.value.replace(/'/g, "") : null;

        // 💡 HELPER: Scrapes whatever table is currently on the screen
        const scrapeTableData = () => {
            let extractedData = {};
            const table = document.getElementById("gvshow");
            if (table) {
                const rows = Array.from(table.querySelectorAll("tr"));
                const headers = Array.from(rows[0].querySelectorAll("th")).map(th => th.innerText.trim());
                
                rows.slice(1).forEach(row => {
                    const cols = row.querySelectorAll("td");
                    if (cols.length === 0) return;
                    let rowData = {};
                    headers.forEach((h, i) => rowData[h] = cols[i]?.innerText.trim());
                    
                    // 🛠️ FIX 1: Smart Subject Extraction with corrected syntax
                    let subject = "General"; 
                    const keys = Object.keys(rowData);
                    
                    for (let k of keys) {
                        let upperK = k.toUpperCase();
                        if (upperK.includes("PAPER_NAME")) {
                            if (rowData[k] && rowData[k].trim() !== "") {
                                subject = rowData[k];
                            }
                            break;
                        }
                    }
                    
                    if (!extractedData[subject]) extractedData[subject] = [];
                    extractedData[subject].push(rowData);
                });
            }
            return extractedData;
        };

        if (typeSelect) {
            if (currentVal !== "TE" && currentVal !== "PE") {
                // STEP 1: Neither is selected. Select Theory ('TE') first.
                setSelect(typeSelect, "'TE'");
                setTimeout(() => { document.getElementById("btnsearch")?.click(); }, 500);
            } 
            else if (currentVal === "TE") {
                // STEP 2: Scrape Theory, Save Data AND Percentage to Storage
                const teData = scrapeTableData();
                
                const theoryPercentLabel = document.getElementById("lbl_percentage");
                let theoryPercent = "0"; 
                if (theoryPercentLabel) {
                    const text = theoryPercentLabel.innerText; 
                    const parts = text.split(': '); 
                    if (parts.length > 1) theoryPercent = parts[1].trim(); 
                }

                // 🛠️ FIX 2: Save both data and percentage into the temporary backpack
                const tempStoragePayload = {
                    data: teData,
                    percent: theoryPercent
                };
                sessionStorage.setItem('TEMP_TE_DATA', JSON.stringify(tempStoragePayload));

                log("Extracting attendance...");
                setSelect(typeSelect, "'PE'");
                setTimeout(() => { document.getElementById("btnsearch")?.click(); }, 500);
            } 
            else if (currentVal === "PE") {
                // STEP 3: Scrape Practical, Combine, and Redirect
                const prData = scrapeTableData();
                
                // 🛠️ FIX 2 (Continued): Retrieve both from storage
                const savedTemp = JSON.parse(sessionStorage.getItem('TEMP_TE_DATA') || '{"data":{}, "percent":"0"}');
                const teData = savedTemp.data;
                const theoryPercent = savedTemp.percent;

                const practicalPercentLabel = document.getElementById("lbl_percentage");
                let practicalPercent = "0"; 
                if (practicalPercentLabel) {
                    const text = practicalPercentLabel.innerText; 
                    const parts = text.split(': '); 
                    if (parts.length > 1) practicalPercent = parts[1].trim(); 
                }

                // 📦 STORE SEPARATELY IN ONE OBJECT
                const finalAttendancePayload = {
                    practical_percentage: practicalPercent,
                    theory_percentage: theoryPercent,
                    theory: teData,
                    practical: prData
                };

                sendData("data_attendance", finalAttendancePayload);
                sessionStorage.removeItem('TEMP_TE_DATA'); // Clean up

                setTimeout(() => {
                    window.location.href = "https://www.arsdcollege.in/Internet/Student/Check_Student_Faculty_Details.aspx";
                }, 800);
            }
        } else {
            sendError("Could not find the dropdown to select Theory/Tutorial.");
        }
      }

      // --- 5. FACULTY ---
      else if (url.includes("Check_Student_Faculty_Details.aspx")) {
        waitForElement("gvshow", (table) => {
          log("Extracting faculty details...");
          let faculty = [];
          if (table) {
            const rows = Array.from(table.querySelectorAll("tr"));
            const headers = Array.from(rows[0].querySelectorAll("th")).map(th => th.innerText.trim());
            rows.slice(1).forEach(row => {
              const cols = row.querySelectorAll("td");
              let rowData = {};
              headers.forEach((h, i) => rowData[h] = cols[i]?.innerText.trim());
              faculty.push(rowData);
            });
          }
          sendData("data_faculty", faculty);
          
          setTimeout(() => {
            sendData("complete", {});
          }, 1500); 
        });
      }

      // REDIRECT
      else if (url.includes("Home.aspx") || document.body.innerText.includes("Welcome")) {
        sessionStorage.removeItem("login_attempted");
        log("🚀 Login Success! Redirecting...");
        window.location.href = "https://www.arsdcollege.in/Internet/Student/STD_Basic_Details.aspx";
      }

    })();
    true;
  `;

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const { type, payload } = data;

      if (type === 'log') {
        onProgress(payload.message);
      } 
      // ERROR HANDLING ADDED HERE
      else if (type === 'error') {
        console.warn("⚠️ Scraper Error:", payload.message);
        onError(payload.message); // This triggers the Alert in Login.js
      }
      else if (type === 'data_basic') {
        await AsyncStorage.setItem('BASIC_DETAILS', JSON.stringify(payload));
      } 
      else if (type === 'data_attendance') {
        await AsyncStorage.setItem('ATTENDANCE_DATA', JSON.stringify(payload));
      } 
      else if (type === 'data_faculty') {
        await AsyncStorage.setItem('FACULTY_DATA', JSON.stringify(payload));
      } 
      else if (type === 'data_mentor') {
        await AsyncStorage.setItem('MENTOR_DATA', JSON.stringify(payload));
      } 
      else if (type === 'complete') {
        await AsyncStorage.setItem('USER_CREDENTIALS', JSON.stringify(credentials));
        onFinish('DONE'); 
      }
    } catch (e) {
      console.error("Parser Error:", e);
      onError("Data parsing failed.");
    }
  };

  return (
    <View style={styles.hiddenContainer}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.arsdcollege.in/Internet/Student/Login.aspx' }}
        injectedJavaScript={runScraping}
        mixedContentMode="always"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        onError={(e) => onError("Network Error: " + e.nativeEvent.description)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: { height: 0, width: 0, opacity: 0, position: 'absolute' },
});

export default ArsdScraper;