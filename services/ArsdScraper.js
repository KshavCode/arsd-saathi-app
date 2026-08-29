import { WEBSITE_JSON_URL, REMOTE_MANIFEST_URL } from "@/constants/links";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

// Fallback config just in case the app is offline on the very first launch
const FALLBACK_CONFIG = {
  login: {
    path_match: "login",
    fields: {
      roll_input: "txtrollno",
      name_input: "txtname",
      pass_input: "txtpassword",
      submit_btn: "btnsearch",
    },
  },
  basic_details: {
    path_match: "STD_Basic_Details.aspx",
    wait_for: "lbleno",
    fields: {
      enrollmentNumber: "lbleno",
      name: "lblname",
      rollNo: "lblrollno",
      fatherName: "lblfname",
      courseCode: "lblcoursecode",
      courseName: "lblcoursename",
      part: "lblpart",
      sem: "lblsem",
      mobile: "lblmobileno",
      email: "lblemail",
      address: "lbladdress_local",
    },
  },
  mentor: {
    path_match: "Mentor_Details.aspx",
    wait_for: "lblmentor_name",
    fields: { mentor: "lblmentor_name" },
  },
  attendance: {
    path_match: "Attendance_Report_Monthly.aspx",
    dropdown_id: "ddlpapertype",
    search_btn_id: "btnsearch",
    table_id: "gvshow",
    percent_label_id: "lbl_percentage",
    theory_val: "'TE'",
    practical_val: "'PE'",
  },
  faculty: {
    path_match: "Check_Student_Faculty_Details.aspx",
    table_id: "gvshow",
  },
  redirect: { path_match: "Home.aspx" },
};

const ArsdScraper = ({ credentials, onProgress, onFinish, onError }) => {
  const webViewRef = useRef(null);
  const [websiteLinks, setWebsiteLinks] = useState(null);
  const [scraperConfig, setScraperConfig] = useState(null);

  useEffect(() => {
    const initializeScraper = async () => {
      try {
        // 1. Fetch Website Links
        const linksRes = await fetch(WEBSITE_JSON_URL + "?t=" + Date.now());
        const linksData = await linksRes.json();
        setWebsiteLinks(linksData);

        // 2. Fetch Remote Scraper Manifest
        try {
          const configRes = await fetch(REMOTE_MANIFEST_URL);
          const manifestData = await configRes.json();
          
          const activeVersion = manifestData.active_version.toString();
          const activeRoutes = manifestData.versions[activeVersion].routes;
          console.log(activeRoutes);

          setScraperConfig(activeRoutes);
          await AsyncStorage.setItem(
            "@scraper_active_config",
            JSON.stringify(activeRoutes),
          );
        } catch (configErr) {
          console.warn(
            "Failed to fetch remote config, using cache or fallback",
          );
          const cachedConfig = await AsyncStorage.getItem(
            "@scraper_active_config",
          );
          setScraperConfig(
            cachedConfig ? JSON.parse(cachedConfig) : FALLBACK_CONFIG,
          );
        }
      } catch (err) {
        console.log("Initialization Error: ", err);
        onError("Failed to connect to configuration servers.");
      }
    };

    initializeScraper();
  }, []);

  const generateScraperScript = (config, credentials, links) => `
    if (document.readyState === 'interactive' || document.readyState === 'complete') { window.stop(); }
    const style = document.createElement('style');
    style.innerHTML = 'img, i, .header-banner { display: none !important; }';
    document.head.appendChild(style);
    
    (function() {
      const CFG = ${JSON.stringify(config)};
      const CREDS = ${JSON.stringify(credentials)};
      const LINKS = ${JSON.stringify(links)};

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
      if (url.toLowerCase().includes(CFG.login.path_match.toLowerCase())) {
        if (sessionStorage.getItem("login_attempted") === "true") {
             sessionStorage.removeItem("login_attempted");
             sendError("Wrong credentials or Server Error");
             return; 
        }

        const f = CFG.login.fields;
        waitForElement(f.roll_input, (input) => {
          if (!input) {
              sendError("Connection timed out. Login page not loading.");
              return;
          }

          log("Verifying credentials...");
          input.value = CREDS.rollNo;
          document.getElementById(f.name_input).value = CREDS.name;
          document.getElementById(f.pass_input).value = CREDS.passw;
          
          setTimeout(() => {
            const btn = document.getElementById(f.submit_btn) || document.querySelector('input[type="submit"]');
            if (btn) {
                sessionStorage.setItem("login_attempted", "true");
                btn.click();
                setTimeout(() => {
                      if (window.location.href.toLowerCase().includes(CFG.login.path_match.toLowerCase())) {
                          sessionStorage.removeItem("login_attempted");
                          sendError("Server not responding. Please try again.");
                      }
                }, 15000); 
            }
          }, 1000);
        });
      }

      // --- 2. BASIC DETAILS ---
      else if (url.includes(CFG.basic_details.path_match)) {
        sessionStorage.removeItem("login_attempted");

        waitForElement(CFG.basic_details.wait_for, (el) => {
          if (!el) return;
          log("Extracting information...");
          const f = CFG.basic_details.fields;
          const profile = {
            name: getText(f.name) || CREDS.name,
            rollNo: getText(f.rollNo) || CREDS.rollNo,
            enrollmentNumber: getText(f.enrollmentNumber),
            fatherName: getText(f.fatherName),
            course: getText(f.courseCode) + " - " + getText(f.courseName),
            year: getText(f.part) + " Sem " + getText(f.sem),
            mobile: getText(f.mobile),
            email: getText(f.email),
            address: getText(f.address)
          };
          sendData("data_basic", profile);
          
          setTimeout(() => {
            window.location.href = LINKS.STUDENT_MENTOR_DETAILS_URL;
          }, 800);
        });
      }

      // ERROR PAGE
      else if (url.includes("Generate_Std_Password.aspx")) {
        sendError("Wrong credentials or Server Error");
        return;
      }

      // --- 3. MENTOR DETAILS ---
      else if (url.includes(CFG.mentor.path_match)) {
        waitForElement(CFG.mentor.wait_for, (el) => {
          if (!el) return;
          const mentorData = { mentor: getText(CFG.mentor.fields.mentor) };
          sendData("data_mentor", mentorData);

          setTimeout(() => {
            window.location.href = LINKS.STUDENT_ATTENDANCE_DETAILS_URL;
          }, 800);
        });
      }

      // --- 4. ATTENDANCE ---
      else if (url.includes(CFG.attendance.path_match)) {
        const r = CFG.attendance;
        const typeSelect = document.getElementById(r.dropdown_id);
        const currentVal = typeSelect ? typeSelect.value.replace(/'/g, "") : null;

        const scrapeTableData = () => {
            let extractedData = {};
            const table = document.getElementById(r.table_id);
            if (table) {
                const rows = Array.from(table.querySelectorAll("tr"));
                const headers = Array.from(rows[0].querySelectorAll("th")).map(th => th.innerText.trim());
                
                rows.slice(1).forEach(row => {
                    const cols = row.querySelectorAll("td");
                    if (cols.length === 0) return;
                    let rowData = {};
                    headers.forEach((h, i) => rowData[h] = cols[i]?.innerText.trim());
                    
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
            const pureTe = r.theory_val.replace(/'/g, "");
            const purePe = r.practical_val.replace(/'/g, "");

            if (currentVal !== pureTe && currentVal !== purePe) {
                setSelect(typeSelect, r.theory_val);
                setTimeout(() => { document.getElementById(r.search_btn_id)?.click(); }, 500);
            } 
            else if (currentVal === pureTe) {
                const teData = scrapeTableData();
                
                const theoryPercentLabel = document.getElementById(r.percent_label_id);
                let theoryPercent = "0"; 
                if (theoryPercentLabel) {
                    const parts = theoryPercentLabel.innerText.split(': '); 
                    if (parts.length > 1) theoryPercent = parts[1].trim(); 
                }

                const tempStoragePayload = { data: teData, percent: theoryPercent };
                sessionStorage.setItem('TEMP_TE_DATA', JSON.stringify(tempStoragePayload));

                log("Extracting attendance...");
                setSelect(typeSelect, r.practical_val);
                setTimeout(() => { document.getElementById(r.search_btn_id)?.click(); }, 500);
            } 
            else if (currentVal === purePe) {
                const prData = scrapeTableData();
                const savedTemp = JSON.parse(sessionStorage.getItem('TEMP_TE_DATA') || '{"data":{}, "percent":"0"}');
                
                const practicalPercentLabel = document.getElementById(r.percent_label_id);
                let practicalPercent = "0"; 
                if (practicalPercentLabel) {
                    const parts = practicalPercentLabel.innerText.split(': '); 
                    if (parts.length > 1) practicalPercent = parts[1].trim(); 
                }

                const finalAttendancePayload = {
                    practical_percentage: practicalPercent,
                    theory_percentage: savedTemp.percent,
                    theory: savedTemp.data,
                    practical: prData
                };

                sendData("data_attendance", finalAttendancePayload);
                sessionStorage.removeItem('TEMP_TE_DATA');

                setTimeout(() => {
                    window.location.href = LINKS.STUDENT_FACULTY_DETAILS_URL;
                }, 800);
            }
        } else {
            sendError("Could not find the dropdown to select Theory/Tutorial.");
        }
      }

      // --- 5. FACULTY ---
      else if (url.includes(CFG.faculty.path_match)) {
        waitForElement(CFG.faculty.table_id, (table) => {
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
      else if (url.includes(CFG.redirect.path_match) || document.body.innerText.includes("Welcome")) {
        sessionStorage.removeItem("login_attempted");
        log("Retrieving data...");
        window.location.href = LINKS.STUDENT_BASIC_DETAILS_URL;
      }

    })();
    true;
  `;

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const { type, payload } = data;

      if (type === "log") {
        onProgress(payload.message);
      } else if (type === "error") {
        console.warn("⚠️ Scraper Error:", payload.message);
        onError(payload.message);
      } else if (type === "data_basic") {
        await AsyncStorage.setItem("BASIC_DETAILS", JSON.stringify(payload));
      } else if (type === "data_attendance") {
        await AsyncStorage.setItem("ATTENDANCE_DATA", JSON.stringify(payload));
      } else if (type === "data_faculty") {
        await AsyncStorage.setItem("FACULTY_DATA", JSON.stringify(payload));
      } else if (type === "data_mentor") {
        await AsyncStorage.setItem("MENTOR_DATA", JSON.stringify(payload));
      } else if (type === "complete") {
        await AsyncStorage.setItem(
          "USER_CREDENTIALS",
          JSON.stringify(credentials),
        );
        onFinish("DONE");
      }
    } catch (e) {
      console.error("Parser Error:", e);
      onError("Data parsing failed.");
    }
  };

  // 🛡️ Guard Clause: Do not render the WebView until configs are loaded
  if (!websiteLinks || !scraperConfig) {
    return null;
  }

  return (
    <View style={styles.hiddenContainer}>
      <WebView
        ref={webViewRef}
        source={{ uri: websiteLinks.STUDENT_PORTAL_URL }}
        injectedJavaScript={generateScraperScript(
          scraperConfig,
          credentials,
          websiteLinks,
        )}
        mixedContentMode="always"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        builtInZoomControls={false}
        displayZoomControls={false}
        onMessage={handleMessage}
        onError={(e) => onError("Network Error: " + e.nativeEvent.description)}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: { height: 0, width: 0, opacity: 0, position: "absolute" },
});

export default ArsdScraper;
