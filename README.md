# ArsdSaathi 🎓
**ArsdSaathi** is a cross-platform mobile application designed for students of ARSD College. It allows students to log in using their college credentials and seamlessly sync their **Attendance**, **Faculty Details**, and **Basic Profile Information** directly to their device for offline access.

The project uses a **"Offline-First"** architecture: data is scraped once upon login and stored locally, ensuring instant access without constant loading screens.

## 🚀 Tech Stack
### Frontend (Mobile App)
* **Framework:** React Native (via Expo)
* **Navigation:** React Navigation (Stack)
* **Storage:** Async Storage (Persisted offline data)
* **Networking:** Axios & NetInfo (Smart connectivity checks)
* **UI/Theming:** Custom Dark/Light mode support

### Backend (Scraper API)
* **Server:** FastAPI
* **Scraper:** Selenium WebDriver (Optimized for ASP.NET portals)
* **Concurrency:** ThreadPoolExecutor (Non-blocking processing)

---

## 🛠️ Prerequisites

Before running the project, ensure you have the following installed:
1.  **Node.js** (v14 or higher)
2.  **Python** (v3.8 or higher)
3.  **Google Chrome** (Latest version)
4.  **Expo Go** app installed on your physical Android/iOS device.

---

## 📦 Installation Guide
### 1. Backend Setup (Python)

Navigate to the `BACKEND` folder and set up the environment.

```bash
cd BACKEND

# 1. Create a virtual environment (Optional but recommended)
python -m venv venv

# 2. Activate the virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requrements.txt

```

### 2. Frontend Setup (React Native)

Navigate to the ArsdSaathi folder.

```bash
cd ../ArsdSaathi

cd .. 

# 1. Install Node modules
npm install

# 2. Install specific native dependencies
npx expo install @react-native-async-storage/async-storage @react-native-community/netinfo expo-navigation-bar axios

```

## ⚙️ Configuration (Critical Step)
Since the mobile app runs on your phone and the backend runs on your laptop, you must tell the phone where to look.
1. Open Command Prompt (Windows) or Terminal (Mac) and run:
```bash
ipconfig  # (Windows)
# OR
ifconfig  # (Mac/Linux)
```
2. Find your IPv4 Address (e.g., 192.168.1.5).
3. Open ./services/api.js in your code editor.
4. Create ./secret.js file and export IP_ADD of your computer
```bash
const BASE_URL = 'http://192.16X.XX.X:8000'; // <--- Replace this with YOUR IP
```

## ▶️ Running the App
Step 1: Start the Backend
Open a terminal in the BACKEND folder:
```bash
python api.py
You should see: Uvicorn running on http://0.0.0.0:8000
```

Step 2: Start the Frontend
Open a new terminal in the main project folder:
Bash
```bash
npx expo start
# OR
npx expo start --tunnel
```
Scan the QR code with the Expo Go app on your phone.
*Note: Ensure your phone and laptop are connected to the same Wi-Fi network.*

## 🐛 Troubleshooting
### 1. "Server Unreachable" / Network Error
Firewall: Windows Firewall often blocks Python. Search "Allow an app through Windows Firewall" and enable python.exe for both Private and Public networks.

Same Wi-Fi: Ensure phone and PC are on the same network.

Wrong IP: Re-check your IP address (ipconfig) and update api.js.

### 2. Chrome/Selenium Crash
Run pip install --upgrade webdriver-manager selenium to ensure your drivers match your Chrome version.
If using Headless mode (headless=True), ensure window size arguments are set to prevent layout issues.

### 3. "Loading Forever"
The college server might be slow. The app has a 60s timeout.
Check the Python terminal. If you don't see "Login attempt", the request isn't reaching the server (see Network Error).

## 📂 Project Structure
```
REPOSITORY_DIRECTORY
├── BACKEND/
│   ├── api.py            # FastAPI Server & Endpoints
│   ├── extract.py        # Selenium Scraper Logic
│   ├── requirements.txt  # Requirements
│   └── venv/             # Python Virtual Environment
├── ArsdSaathi/
│   ├── app/              # Main resource of layout
│   ├── components/       # Reusable UI (DashboardCard, ActionButton)
│   └── services/         # api.js (Axios & AsyncStorage logic)
├── app.json              # Expo Configuration
└── package.json          # Node Dependencies
```
<br>
Made with ❤️ By Keshav Pal.