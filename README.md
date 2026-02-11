## 📲 Download
[![Latest Release](https://img.shields.io/github/v/release/KshavCode/arsd-saathi-app?include_prereleases&label=Latest%20APK&color=blue)](https://github.com/KshavCode/arsd-saathi-app/releases/latest)

Download the latest version from the [Releases Page](https://github.com/KshavCode/arsd-saathi-app/releases).

# ArsdSaathi 🎓

**Your College Companion**

ArsdSaathi is a mobile application designed specifically for students of **Atma Ram Sanatan Dharma (ARSD) College**. It provides a seamless, mobile-friendly interface to access the college portal, allowing students to sync their attendance, view their profile, and stay updated without navigating the legacy website every time.
Built with **React Native** and **Expo**, it utilizes a secure, client-side scraping architecture to fetch data directly from the college portal, ensuring user privacy and zero server costs.

---
## 🚀 Features

* **📊 Real-time Sync:** Fetches your latest attendance and details directly from the college portal.
* **🔒 Privacy First:** Your data (Roll No, DOB, Name) is stored **locally** on your device using `AsyncStorage`. No external database or server stores your credentials.
* **📱 Offline Access:** Once synced, view your attendance history even without an internet connection.
* **🎨 Modern UI:** A clean, responsive interface built with `React Native` and `Expo Router`.
* **🛠️ Zero-Maintenance:** Uses client-side scraping logic, eliminating the need for a dedicated backend server.

---
## 📥 Download & Install

The app is currently available as a direct APK download for Android devices.

1.  **Download:** Get the latest version from the [Releases Page](#) (or the link provided).
2.  **Open:** Tap on the downloaded `ArsdSaathi.apk` file.
3.  **Permission:** If prompted with *"For your security, your phone is not allowed to install unknown apps from this source,"* tap **Settings** and toggle on **Allow from this source**.
4.  **Install:** Tap **Install** and wait for the process to finish.
5.  **Launch:** Open the app and log in with your College Roll Number.

> **Note:** You might see a "Play Protect" warning since this app is not yet on the Play Store. Click **"More Details"** -> **"Install Anyway"** to proceed.

---

## 📖 How to Use

1.  **Login:** Enter your **College Roll No.** (e.g., `23/38046`), **Full Name**, and **Date of Birth** exactly as they appear on your College ID Card.
2.  **Sync:** Tap **"Connect & Sync"**. The app will securely connect to the ARSD portal to verify your identity and fetch your latest data.
3.  **Dashboard:** Once logged in, you will see your **Attendance Summary**, **Subject-wise Breakdown**, and **Internal Assessment Marks**.
4.  **Logout:** Go to **Profile > Logout** to clear your data from the device.

---

## 🛠️ Tech Stack

* **Framework:** [React Native](https://reactnative.dev/) (via [Expo SDK](https://expo.dev/))
* **Language:** JavaScript (ES6+)
* **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
* **Storage:** `AsyncStorage` (Local data persistence)
* **Networking:** Native `fetch` API with custom DOM parsing logic
* **Build Tool:** EAS (Expo Application Services)
* **Key Libraries:** `expo-linear-gradient`, `react-native-safe-area-context`, `expo-vector-icons`

---
## 🔒 Privacy Policy

**ArsdSaathi** is built with a "Privacy-by-Design" philosophy. We believe your academic data belongs to you and should remain under your control.

### 1. Data Collection & Usage
* **No Server-Side Storage:** ArsdSaathi does **not** have a central database or backend server. We do not collect, store, or monitor your personal information.
* **Direct Integration:** The app connects directly to the official ARSD College Student Portal. It acts as a specialized browser that fetches your information and displays it in a mobile-friendly format.

### 2. Local Storage
* **Credentials:** Your College Roll Number, Name, and Date of Birth are stored **locally** on your device using `AsyncStorage`. This is done solely to keep you logged in and allow for offline access to your synced data.
* **Encryption:** Data stored on your device is sandboxed by the Android operating system, meaning other apps cannot access ArsdSaathi's local storage.

### 3. Third-Party Services
* **Analytics:** We do **not** use any third-party analytics to track your usage patterns.
* **External Links:** The app provide links to the developers' profile links.

### 4. Data Deletion
* You can delete all your data instantly by clicking **"Logout"** inside the app or by clearing the app's cache/storage in your phone's Android settings.

### 5. Contact
For any privacy-related concerns, please reach out to: **arsdsaathi.help@gmail.com**

---

---
## ⚠️ Disclaimer

* **Unofficial App:** ArsdSaathi is a student-developed project and is **not** currently affiliated with, endorsed by, or connected to the official administration of Atma Ram Sanatan Dharma College.
* **Data Source:** All data displayed (Attendance, Marks, Profile) is retrieved directly from the official ARSD College Student Portal. The app acts solely as a user-friendly interface for this data.
* **Data Privacy:** Your login credentials (Roll No, Name, DOB) are stored **locally on your device** only. They are never transmitted to any third-party server.

---


## 📞 Contact & Support

**Have questions or found a bug?**

* **Email:** [arsdsaathi.help@gmail.com](mailto:arsdsaathi.help@gmail.com)
* **Issues:** Please report any bugs or feature requests on the [GitHub Issues](https://github.com/KshavCode/ArsdSaathi/issues) page.

---

## 📄 License & Copyright

**Copyright © 2026 Keshav Pal. All Rights Reserved.**

This project is proprietary software. Unauthorized copying, modification, distribution, or use of this source code or assets, via any medium, is strictly prohibited without the express written permission of the copyright holder.

"ArsdSaathi"™ and its associated logo are trademarks of the developer.
