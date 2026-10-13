# Krishiva Farmer Mobile App (Phase 5A)

Built with **Expo (SDK 57)**, **Expo Router**, **TypeScript**, **Firebase Auth**, and **TanStack React Query**.

---

## 1. Setup Instructions

### Prerequisites
- Node.js v20+ and npm
- **Expo Go** app installed on your physical mobile phone (available on Google Play Store or iOS App Store)
- Mobile phone and PC connected to the **SAME Wi-Fi network**

---

### Step 1: Install Dependencies
From the repository root or inside `apps/mobile`:

```powershell
cd apps/mobile
npm install
```

---

### Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Open `.env` and verify the settings:
   - `EXPO_PUBLIC_API_URL`: **Must use your PC's LAN IP address**, NOT `localhost` (your phone cannot reach your PC on `localhost`).
     - Example: `http://192.168.1.9:3000`
   - `EXPO_PUBLIC_FIREBASE_API_KEY`: Your Firebase Web API key
   - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`: `krishiva-be6a1.firebaseapp.com`
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`: `krishiva-be6a1`
   - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`: `krishiva-be6a1.firebasestorage.app`
   - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: `1091236430755`
   - `EXPO_PUBLIC_FIREBASE_APP_ID`: Your Web App ID from Firebase Console

---

### How to Find Your PC's Local IP Address on Windows
In PowerShell, run:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | Select-Object -Property IPAddress, InterfaceAlias
```
Use the IPv4 address listed for `Wi-Fi` (e.g. `192.168.1.9`).

---

### Windows Firewall Note for Port 3000
For your phone to communicate with the Fastify backend on port 3000 over Wi-Fi, ensure Windows Defender Firewall allows incoming traffic on port 3000.
To open port 3000 in Windows Firewall (run PowerShell as Administrator if needed):
```powershell
New-NetFirewallRule -DisplayName "Krishiva Backend (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## 2. Running the App

### 1. Ensure Backend is Running
In one terminal window, ensure the Fastify backend is up:
```powershell
cd apps/backend
npm run dev
```

### 2. Start Expo Metro Bundler
In a second terminal window:
```powershell
cd apps/mobile
npx expo start
```

### 3. Open on Your Phone
1. Open the camera or **Expo Go** app on your phone.
2. Scan the QR code displayed in the terminal.
3. The app will bundle and display the Krishiva Farmer interface.

---

## 3. Verification Checklist

1. **Sign In / Registration**:
   - Opens on `LoginScreen`.
   - Register a new account or log in with existing user credentials.
   - Closing and reopening the app keeps your session authenticated via AsyncStorage persistence.
2. **Farms List**:
   - Fetches and displays registered farms as cards with crop type, acreage, and role badge.
   - Pull down to refresh data.
3. **Create Farm**:
   - Tap `+` or "Create your first farm" button.
   - Select a crop chip (Wheat, Rice, Cotton, Sugarcane, Vegetables, Other).
   - Enter farm details and submit; successfully returns to the list with the new farm visible.
4. **Farm Dashboard**:
   - Tap any farm card to enter its dedicated dashboard.
   - Displays farm overview statistics and the list of registered IoT nodes with Online/Offline status and capabilities.
   - Pull down on Dashboard to refresh IoT device status.
5. **Placeholder Tabs**:
   - Analytics, Controls, Schedule, and Alerts show Phase 5B/5C Coming Soon status.
   - Tap the top-left back arrow to switch between farms.
