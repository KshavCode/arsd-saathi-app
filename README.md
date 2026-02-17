## 📲 Download
[![Latest Release](https://img.shields.io/github/v/release/KshavCode/arsd-saathi-app?include_prereleases&label=Latest%20APK&color=blue)](https://github.com/KshavCode/arsd-saathi-app/releases/latest)

Download the latest version from the [Releases Page](https://github.com/KshavCode/arsd-saathi-app/releases).

READ [TERMS & CONDITIONS]("https://github.com/KshavCode/arsd-saathi-app/blob/master/TERMS.md") and [PRIVACY POLICY](https://github.com/KshavCode/arsd-saathi-app/blob/dev-1.2.0/PRIVACY.md) for usage of ArsdSaathi

---

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

## 📱 Requirements
Currently not available for iOS devices (but would be added soon!)
### MINIMUM
- **Android OS** - Android 7.0 (API 24)
- **RAM** - 2GB
- **Processor** - Quad-core 1.5 GHz
- **Internet**	3G / Stable Edge

### RECOMMENDED
- **Android OS** - Android 12.0 or higher
- **RAM** - 4 GB
- **Processor** - Octa-core 2.0 GHz+ (64-bit)
- **Internet**	4G / 5G 

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
* **Storage:** `AsyncStorage` (Local storage for data)
* **Networking:** Native `fetch` API with custom DOM parsing logic
* **Build Tool:** EAS (Expo Application Services)
* **Key Libraries:** `expo-linear-gradient`, `react-native-safe-area-context`, `expo-vector-icons`

---

## ⚠️ Disclaimer

* **Unofficial App:** ArsdSaathi is a student-developed project and is **not** currently affiliated with, endorsed by, or connected to the official administration of Atma Ram Sanatan Dharma College.
* **Data Source:** All data displayed (Attendance, Marks, Profile) is retrieved directly from the official ARSD College Student Portal. The app acts solely as a user-friendly interface for this data.
* **Data Privacy:** Your login credentials (Roll No, Name, DOB) are stored **locally on your device** only. They are never transmitted to any third-party server.

---


## 📞 Contact & Support

**Have questions or found a bug?**

* **Email:** [arsdsaathi.help@gmail.com](mailto:arsdsaathi.help@gmail.com)
* **Issues:** Please report any bugs or feature requests on the [GitHub Issues](https://github.com/KshavCode/arsd-saathi-app/issues) page.

---

## 📄 License & Copyright

**Copyright © 2026 Keshav Pal. All Rights Reserved.**

This project is proprietary software. Unauthorized copying, modification, distribution, or use of this source code or assets, via any medium, is strictly prohibited without the express written permission of the copyright holder.

ArsdSaathi™ and its associated logo are trademarks of the developer.
