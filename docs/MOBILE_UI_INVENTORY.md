# Krishiva Mobile App UI Inventory & Design Audit

> **Audit Date:** November 2026  
> **Target Package:** `apps/mobile` (Expo SDK 57, Expo Router 57, React Native 0.86, React 19, TypeScript)  
> **Audit Type:** Read-Only Complete UI/UX Specification for Visual Redesign

---

# PART 1: CURRENT APP INVENTORY

---

## A. Navigation Map

### Expo Router File Hierarchy & Routing Tree

```text
apps/mobile/app/
│
├── _layout.tsx                     [Root Stack Layout: Providers, Env Check, Status Bar]
├── index.tsx                       [Root Entrypoint: Auth redirector]
│
├── (auth)/                         [Auth Group: Stack Navigator, headerShown: false, slide_from_right]
│   ├── _layout.tsx                 [Stack Layout]
│   ├── login.tsx                   [/login - Farmer Sign In]
│   └── register.tsx                [/register - Farmer Account Registration]
│
└── (app)/                          [Authenticated App Stack: Stack Navigator, Header Styled]
    ├── _layout.tsx                 [Stack Layout: Auth Guard, Header Theme]
    ├── farms.tsx                   [/farms - Farm Selector / List (headerShown: false)]
    ├── create-farm.tsx             [/create-farm - Add Farm Modal/Screen (title: "Add New Farm")]
    │
    └── (farm)/                     [Farm Tabs: Bottom Tab Navigator, 5 Tabs + 1 Hidden Route]
        ├── _layout.tsx             [Tabs Layout: Active Farm Header + Back button + Bottom Tabs]
        ├── dashboard.tsx           [Tab 1: /(farm)/dashboard - "Dashboard" (Icon: LayoutDashboard)]
        ├── analytics.tsx           [Tab 2: /(farm)/analytics - "Analytics" (Icon: LineChart)]
        ├── controls.tsx            [Tab 3: /(farm)/controls - "Controls" (Icon: Sliders)]
        ├── schedule.tsx            [Tab 4: /(farm)/schedule - "Schedule" (Icon: Calendar)]
        ├── schedule-edit.tsx       [Hidden Stack in Tabs: href: null, tabBarStyle: 'none']
        └── alerts.tsx              [Tab 5: /(farm)/alerts - "Alerts" (Icon: Bell, dynamic unacked badge)]
```

### Route Configurations & Header Settings

| Route | Nav Type | Header Display | Header Title / Config | Tab Bar Icon & Label |
| :--- | :--- | :--- | :--- | :--- |
| `app/_layout.tsx` | Root Stack | `headerShown: false` | None (Wraps Providers) | N/A |
| `app/index.tsx` | Redirector | `headerShown: false` | None | N/A |
| `app/(auth)/_layout.tsx` | Auth Stack | `headerShown: false` | None (Animation: `slide_from_right`) | N/A |
| `app/(auth)/login.tsx` | Screen | `headerShown: false` | In-screen brand header | N/A |
| `app/(auth)/register.tsx` | Screen | `headerShown: false` | In-screen brand header | N/A |
| `app/(app)/_layout.tsx` | Stack | Stack Headers | Card bg, dark green tint, bold 700 | N/A |
| `app/(app)/farms.tsx` | Screen | `headerShown: false` | Custom in-screen header with greeting & actions | N/A |
| `app/(app)/create-farm.tsx`| Screen | Standard Stack | Title: "Add New Farm", Back: "Farms" | N/A |
| `app/(app)/(farm)/_layout.tsx` | Bottom Tabs | Tab Screen Headers | Card bg, green text, left back arrow to `/farms` | 5 tabs with custom badges |
| `...(farm)/dashboard.tsx` | Tab Screen | Tabs Header | Title: `activeFarm.name` ?? "Farm Dashboard" | Icon: `LayoutDashboard`, Label: "Dashboard" |
| `...(farm)/analytics.tsx` | Tab Screen | Tabs Header | Title: "Analytics" | Icon: `LineChart`, Label: "Analytics" |
| `...(farm)/controls.tsx` | Tab Screen | Tabs Header | Title: "Actuator Controls" | Icon: `Sliders`, Label: "Controls" |
| `...(farm)/schedule.tsx` | Tab Screen | Tabs Header | Title: "Irrigation Schedules" | Icon: `Calendar`, Label: "Schedule" |
| `...(farm)/schedule-edit.tsx`| Sub-screen | Tabs Header | Title: "Schedule Details", Back: Arrow Left | `href: null` (hidden from bottom bar, tab bar hidden) |
| `...(farm)/alerts.tsx` | Tab Screen | Tabs Header | Title: "Alerts & Incidents" | Icon: `Bell`, Label: "Alerts", Badge: unacknowledged count |

### Active Farm State Passing
- **Storage & Context:** Managed via `FarmContext` (`src/context/FarmContext.tsx`).
- **Persistence:** Stored in `@react-native-async-storage/async-storage` under key `@krishiva_active_farm`.
- **Handoff:** When a farmer taps a farm in `app/(app)/farms.tsx`:
  ```ts
  setActiveFarm(item);
  router.push('/(app)/(farm)/dashboard');
  ```
- **Consumption:** The `(farm)/_layout.tsx` and all child tab screens invoke `const { activeFarm } = useActiveFarm()`.
- **Fallback Guard:** If accessed without an active farm selected, screens render an `EmptyState` component with a direct action button: `router.replace('/(app)/farms')`.

### Redirects & Auth Guards
- **Cold Boot (`app/index.tsx`):**
  - While auth is resolving: displays `<LoadingView label="Starting Krishiva..." />`.
  - If `user` is non-null: redirects to `/(app)/farms`.
  - If `user` is null: redirects to `/(auth)/login`.
- **App Layout Guard (`app/(app)/_layout.tsx`):**
  - While auth is resolving: displays `<LoadingView label="Authenticating session..." />`.
  - If `!user`: redirects to `/(auth)/login`.
- **Sign In / Sign Up Flow:**
  - On submit success: `router.replace('/(app)/farms')`.
- **Sign Out Flow:**
  - Confirmation alert -> Firebase `signOut()` -> `router.replace('/(auth)/login')`.

---

## B. Per-Screen Inventory

---

### 1. Login Screen
- **File Path:** [apps/mobile/app/(auth)/login.tsx](file:///c:/Users/swayamthakur/Desktop/Krishiva/apps/mobile/app/(auth)/login.tsx)
- **Purpose:** Farmer email and password authentication.
- **Visual Structure (Top to Bottom):**
  1. `SafeAreaView` & `KeyboardAvoidingView` wrapper.
  2. **Brand Header:**
     - 76x76 circular surface with `Sprout` icon (`#2E7D32` on `#E8F5E9`).
     - App Title: "Krishiva" (32px, 800 weight, `#1B5E20`).
     - Tagline: "Smart-Farm IoT & Precision Agriculture" (14px, `#5F7161`).
  3. **Server Error Banner:** Conditional card with `AlertCircle`, red background (`#FFEBEE`), red border (`#D32F2F`), and error message.
  4. **Form Card (`Card`):**
     - Section Title: "Farmer Sign In" (20px, 700 weight).
     - Email `Input` (`farmer@krishiva.com`, keyboard `email-address`, validation via Zod).
     - Password `Input` (secureTextEntry, min 6 chars).
     - Primary `Button`: "Sign In" with `LogIn` icon, loading spinner state during submission.
  5. **Footer:** "Don't have an account yet? Register here" text link navigating to `/(auth)/register`.
- **Shared Components Used:** `Input`, `Button`.
- **Data Hooks & Services:** `useAuth()` (`signIn`).
- **User Actions:** Enter email/password, submit sign-in, navigate to Register.
- **States:**
  - *Normal:* Ready for user input.
  - *Submitting:* Button shows `ActivityIndicator`, inputs active.
  - *Validation Error:* Red helper text under input fields (`errors.email?.message`, `errors.password?.message`).
  - *Auth Error:* Displays inline error banner with friendly error message mapping.
- **Role Behavior:** N/A (unauthenticated).

---

### 2. Register Screen
- **File Path:** [apps/mobile/app/(auth)/register.tsx](file:///c:/Users/swayamthakur/Desktop/Krishiva/apps/mobile/app/(auth)/register.tsx)
- **Purpose:** New farmer account creation.
- **Visual Structure (Top to Bottom):**
  1. `SafeAreaView` & `KeyboardAvoidingView` wrapper.
  2. **Brand Header:** 76x76 green circle with `Sprout` icon, Title: "Join Krishiva", Subtitle: "Create your precision farming account".
  3. **Server Error Banner:** Conditional red error card with `AlertCircle`.
  4. **Form Card (`Card`):**
     - Section Title: "New Account" (20px, 700 weight).
     - Email `Input` (`farmer@krishiva.com`).
     - Password `Input` (min 6 characters).
     - Confirm Password `Input` (Zod `.refine` equality check).
     - Primary `Button`: "Create Account" with `UserPlus` icon, loading spinner.
  5. **Footer:** "Already registered? Sign in here" link navigating to `/(auth)/login`.
- **Shared Components Used:** `Input`, `Button`.
- **Data Hooks & Services:** `useAuth()` (`signUp`).
- **User Actions:** Fill registration inputs, submit registration, navigate to Login.
- **States:** Normal, Submitting, Client-side validation errors, Firebase registration failure banner.
- **Role Behavior:** N/A (unauthenticated).

---

### 3. Farms Screen (Farm Selector)
- **File Path:** [apps/mobile/app/(app)/farms.tsx](file:///c:/Users/swayamthakur/Desktop/Krishiva/apps/mobile/app/(app)/farms.tsx)
- **Purpose:** Lists all farms associated with the authenticated farmer and provides farm creation & logout triggers.
- **Visual Structure (Top to Bottom):**
  1. **Top Header Bar:**
     - Left: Greeting ("Welcome, {email_prefix}") + Title: "My Farms" (24px, 800 weight, `#1B5E20`).
     - Right Action Buttons: Circular Add Button (`Plus` icon, `#E8F5E9` bg) + Circular Logout Button (`LogOut` icon, grey bg).
  2. **Server Status Banner (`ServerStatusBanner`):** Displayed if control server is offline.
  3. **Cache Stale Notice:** Green pill ("Showing saved data • Last synced HH:MM") if data rendered from local snapshot cache.
  4. **Farms List (`FlatList`):**
     - Farm Cards (`Card` wrapped in `TouchableOpacity`):
       - Header: 44x44 green icon box with `Tractor`, Farm Name (17px, bold), Farm ID (11px monospace), Role `Badge` (Owner: success green, Admin: warning orange, Viewer: neutral grey).
       - Horizontal Divider line (`#EDF2ED`).
       - Details Row: `Sprout` icon + Crop Type, `Maximize2` icon + Area in Acres, right `ChevronRight` arrow.
- **Shared Components Used:** `Card`, `Badge`, `LoadingView`, `ErrorView`, `EmptyState`, `ServerStatusBanner`.
- **Data Hooks & Services:** `useAuth()` (`signOut`), `useLiveFarms()` (Live Firestore listener on user's farms with offline snapshot caching), `useActiveFarm()` (`setActiveFarm`), `useServerStatus()`.
- **User Actions:**
  - Tap farm card: sets active farm and navigates to `/(app)/(farm)/dashboard`.
  - Tap `+` button: checks server status, alerts if offline, or pushes `/(app)/create-farm`.
  - Tap logout: displays native alert dialog to confirm sign-out.
  - Pull-to-refresh: triggers `refetch()`.
- **States:**
  - *Loading:* `<LoadingView label="Fetching your farms..." />` when initial cache is empty.
  - *Error:* `<ErrorView>` with retry button.
  - *Empty:* `<EmptyState>` with `Tractor` icon, description, and "Create Your First Farm" CTA button.
  - *Offline Server:* Top banner warning that creating farms requires the control server.
  - *Cached Data:* Top banner showing last synced time.
- **Role Behavior:** Displays user's role on each farm as a color-coded `Badge` (`owner`, `admin`, `viewer`).

---

### 4. Create Farm Screen
- **File Path:** [apps/mobile/app/(app)/create-farm.tsx](file:///c:/Users/swayamthakur/Desktop/Krishiva/apps/mobile/app/(app)/create-farm.tsx)
- **Purpose:** Onboarding form to register a new farm on the server.
- **Visual Structure (Top to Bottom):**
  1. `KeyboardAvoidingView` & `ScrollView`.
  2. **Form Card (`Card`):**
     - Section Title: "Farm Information" (18px, bold).
     - Farm Name `Input` (max 100 characters).
     - Crop Type Chips Selector (horizontal wrap grid of chips: Wheat, Rice, Cotton, Sugarcane, Vegetables, Other; selected chip has green background and checkmark).
     - Area in Acres `Input` (numeric keyboard, 0 - 1000 acres).
     - Coordinates Section: Latitude `Input` (-90 to 90) and Longitude `Input` (-180 to 180) in a 2-column flex row.
     - Location Helper Note: "Default coordinates set to Punjab agricultural hub. Update to your field's GPS location."
     - Submit `Button`: "Create Farm" with `PlusCircle` icon, loading spinner.
- **Shared Components Used:** `Input`, `Button`, `ServerStatusBanner`.
- **Data Hooks & Services:** `useCreateFarm()` (POST `/farms` backend mutation via React Query), `useServerStatus()`.
- **User Actions:** Enter farm info, select crop chip, submit mutation, navigate back on success.
- **States:**
  - *Offline Guard:* If `serverOnline` is false, alerts user that creation requires backend and prevents mutation.
  - *Submitting:* Submit button in loading state with spinner.
  - *Validation Errors:* Red error text under invalid fields.
  - *Success:* Native alert with "OK" dismissing screen back to `/farms`.
- **Role Behavior:** Anyone authenticated can create a new farm (creator automatically becomes `owner`).

---

### 5. Farm Dashboard Screen
- **File Path:** [apps/mobile/app/(app)/(farm)/dashboard.tsx](file:///c:/Users/swayamthakur/Desktop/Krishiva/apps/mobile/app/(app)/(farm)/dashboard.tsx)
- **Purpose:** Central monitoring hub for the active farm: live sensor telemetry, Grok AI Agronomy brief, farm health gauge, weather, irrigation forecast, and hardware device status.
- **Visual Structure (Top to Bottom):**
  1. **Language Switcher Bar:** Inline pill selector for English / हिंदी / मराठी.
  2. **Server Status Banner:** Offline alert if backend server is unreachable.
  3. **Cache Stale Notice:** "Showing saved data (offline)" banner if reading from cache.
  4. **Active Alerts Banner (`AlertBanner`):** Prominent orange/red card if there are unacknowledged incidents.
  5. **Farm Overview Card (`Card`):**
     - Farm Name, Timezone, and Role Badge.
     - 3-column quick metric grid: Primary Crop (`Sprout`), Total Area (`Maximize2`), Devices Online/Total (`Radio`).
  6. **Today's AI Farm Brief Card (`Card`, conditionally hidden if AI disabled):**
     - Header: Sparkles icon, "Grok AI Agronomy Brief", urgency badge (Action Needed / Medium Urgency / Low Urgency).
     - Content: Headline (bold), summary body (multilingual translated), and action-now checklist item (`CheckCircle2`).
     - Fallback: "Brief arrives at 6 AM" skeleton if no brief generated yet.
  7. **Farm Health Gauge Card (`Card`):**
     - Header: Activity icon, "Farm Health", health score badge (`{score}/100`).
     - Gauge Row: Circular border ring with large numeric score colored dynamically (green >= 80, yellow 60-79, red < 60).
     - Diagnostic Condition Text + list of contributing factors as tag chips.
  8. **Irrigation Forecast Card (`Card`, shown if irrigation data available):**
     - Header: Droplets icon, forecast status badge.
     - Agronomic recommendation message.
     - Trajectory step row: Current -> In 1h -> In 3h -> In 6h predicted soil moisture percentages with color warnings.
  9. **Weather Forecast Card (`Card`):**
     - Header: Rain cloud icon, "Weather Forecast", "Open-Meteo" badge.
     - 3-column metrics: Rain Next 6h (mm), Rain Next 24h (mm), Max Temp Today (°C).
     - Fallback: "Forecast unavailable" if stale (>6h) or missing.
  10. **Live Telemetry Status Bar:** Freshness indicator dot (green "Live (Xs ago)", yellow "Delayed", red "Stale"), online/offline node count pills.
  11. **Summary Sensor Cards (3-column flex row):**
      - Soil Moisture Avg Card: `Droplets` icon, numeric `%`, status badge (Critical / Low / Good / Wet).
      - Temperature Avg Card: `Thermometer` icon, numeric `°C`, status badge (Normal / Hot / Extreme).
      - Humidity Avg Card: `CloudRain` icon, numeric `%`, status badge (Good / High).
  12. **Staleness Diagnostic Note:** Displays timestamp notice if node averages are stale.
  13. **Field Heatmap Component (`FieldHeatmap`):** SVG interactive spatial field grid.
  14. **Devices & Sensors Section Header:** Wifi icon, "Devices & Sensors", total node count.
  15. **Device Cards List (`FlatList` items):**
      - Card Header: Cpu icon (green circle if online, grey if offline), Device Name, Node ID & Type, Status Badge (online / offline / never_reported).
      - Divider.
      - Footer: Capability tag chips (`soil_moisture`, `temperature`, `pump`, etc.) and "Last seen: {timestamp}" formatted in farm timezone.
- **Shared Components Used:** `Card`, `Badge`, `LoadingView`, `ErrorView`, `EmptyState`, `FieldHeatmap`, `AlertBanner`, `ServerStatusBanner`.
- **Data Hooks & Services:**
  - Live Firestore: `useLiveDevices`, `useLiveHeatmap`, `useLiveBrief`, `useLiveHealth`, `useLiveWeather`, `useLiveIrrigation`.
  - Context: `useActiveFarm`, `useServerStatus`, `useLanguage`.
  - Translation: `useTranslatedData` (translates device names & AI briefs dynamically to Hindi/Marathi).
  - Utils: `computeEffectiveStatus`, `getReadingFreshness`, `getAveragesStalenessNote`, `formatInTimezone`.
- **User Actions:** Language toggle, tap alert banner to jump to Alerts, tap device or heatmap cell for inspection, pull-to-refresh.
- **States:**
  - *No Farm Selected:* `<EmptyState>` with button back to farms.
  - *Initial Loading:* `<LoadingView label="Loading farm telemetry..." />`.
  - *Error:* `<ErrorView>` with retry handler.
  - *Empty Devices:* `<EmptyState>` inside FlatList `ListEmptyComponent`.
- **Role Behavior:** Displays role in top badge.

---

### 6. Analytics Screen
- **File Path:** [apps/mobile/app/(app)/(farm)/analytics.tsx](file:///c:/Users/swayamthakur/Desktop/Krishiva/apps/mobile/app/(app)/(farm)/analytics.tsx)
- **Purpose:** Time-series telemetry visualization for soil moisture, temperature, and humidity across selectable time windows.
- **Visual Structure (Top to Bottom):**
  1. `ServerStatusBanner` & Cache stale banner.
  2. **Device Selector Filter Card (`Card`):**
     - Header: `Cpu` icon, "Select Sensor Node", "Active only" filter toggle chip.
     - Horizontal Chip Scroll: List of nodes with active indicator, showing node name and ID.
  3. **Selected Device Meta Card (`Card`):**
     - Device title, hardware ID, node type.
     - Capabilities list chips.
  4. **Metric Toggle Row:** 3 tab buttons with icons and accent colors:
     - Soil Moisture (`Droplets`, blue `#1976D2`)
     - Temperature (`Thermometer`, orange `#E65100`)
     - Humidity (`CloudRain`, teal `#00897B`)
  5. **Time Range Selector:** Segmented pill controls: `6h`, `24h` (default), `7d`.
  6. **Telemetry Chart Card (`Card`):**
     - Header: Metric label and current unit.
     - Statistics Row: Min, Average, Max values calculated from selected window.
     - Interactive SVG Line Chart (`LineChart`): renders gradient area fill, gridlines, axis labels, and data points.
  7. **Data Summary & Bucket Details:**
     - Point count, bucket range, and UTC partition timestamp notes.
- **Shared Components Used:** `Card`, `LineChart`, `EmptyState`, `ServerStatusBanner`.
- **Data Hooks & Services:** `useActiveFarm`, `useLiveDevices`, `useLiveHeatmap`, `useDeviceHistory` (reads partitioned Firestore subcollections), `useServerStatus`.
- **User Actions:** Select node chip, toggle active-only filter, select metric, switch time range (6h/24h/7d), pull-to-refresh.
- **States:**
  - *Loading History:* Chart card renders skeleton / `ActivityIndicator`.
  - *Empty Data:* Chart renders empty state with "No readings recorded in this window".
  - *Error:* Chart displays retry icon and error message.
- **Role Behavior:** Accessible to all roles (`owner`, `admin`, `viewer`).

---

### 7. Controls Screen
- **File Path:** [apps/mobile/app/(app)/(farm)/controls.tsx](file:///c:/Users/swayamthakur/Desktop/Krishiva/apps/mobile/app/(app)/(farm)/controls.tsx)
- **Purpose:** Manual actuator operation (Pumps, Valves, Lights, Sirens) with confirmation safety, timed shutoff presets, live command delivery tracking, and direct hardware messaging.
- **Visual Structure (Top to Bottom):**
  1. `ServerStatusBanner` & Cache notification banner.
  2. **In-Flight Command Tracking Banner (`Card`):**
     - Displayed when a command is executing. Shows animated spinner, target device name, requested action, elapsed timer, and status badge (pending / acknowledged / executing).
  3. **Viewer Read-Only Warning Banner:** Displayed if role is `viewer`, informing that controls require `owner` or `admin` permissions.
  4. **Actuator Device Cards List:**
     - For each device with actuator capabilities:
       - Header: Device name, Node ID, Online status badge.
       - Actuator Grid: Individual relay panels for Pump, Valve, Light, Siren.
       - Action Buttons: Green "Turn ON" (`Power` icon) and Grey/Red "Turn OFF" (`PowerOff` icon) using `ControlButton`.
       - Timed Pump Trigger: Tapping "Turn ON (Pump)" launches the Safety Duration Modal.
  5. **Safety Duration Modal (`Modal`):**
     - Title: "Pump Activation Safety Timer".
     - Subtitle: "Actuator will automatically shut off after the selected duration to protect hardware."
     - Preset Duration Chips: 5 min, 15 min (recommended), 30 min, 60 min, Custom duration input.
     - Confirm / Cancel action buttons.
  6. **Instant Hardware Message Card (`Card`):**
     - Header: `MessageSquare` icon, "Instant Hardware Command / Message".
     - Target device dropdown/pill selector.
     - Text input field for direct serial/MQTT/cellular payload dispatch.
     - Quick preset buttons: `PING`, `STATUS`, `RELAY1_ON`, `RELAY1_OFF`.
     - Send Button with `Send` icon and loading state.
  7. **Recent Commands Audit Log (`Card`):**
     - Header: `Clock` icon, "Recent Commands Log".
     - Table/list of last executed commands: Action name, Target node, Issuer email, Timestamp, Status badge (`acknowledged`, `failed`, `expired`, `pending`).
- **Shared Components Used:** `Card`, `Badge`, `ControlButton`, `EmptyState`, `LoadingView`, `ServerStatusBanner`.
- **Data Hooks & Services:**
  - Live Firestore: `useLiveDevices`, `useRecentCommands`.
  - Backend API: `useIssueCommand` (POST `/farms/:id/devices/:deviceId/commands`), `useCommandStatus` (polling status), `sendHardwareMessage`.
  - Context: `useActiveFarm`, `useServerStatus`, `useLanguage`.
- **User Actions:** Trigger ON/OFF on relays, select timed shutoff duration in modal, send custom hardware command, pull-to-refresh.
- **States:**
  - *Offline Server:* All command buttons disabled; banner warns that server is required to issue commands.
  - *In-Flight:* Actuator buttons show loading indicators; tracking card active.
  - *Viewer Locked:* Control buttons disabled with opacity 0.5.
- **Role Behavior:**
  - `owner` & `admin`: Full operational control.
  - `viewer`: Controls strictly disabled, read-only audit log viewing.

---

### 8. Schedule Screen
- **File Path:** [apps/mobile/app/(app)/(farm)/schedule.tsx](file:///c:/Users/swayamthakur/Desktop/Krishiva/apps/mobile/app/(app)/(farm)/schedule.tsx)
- **Purpose:** Lists all automated irrigation & relay schedules, toggle activation on/off, and triggers creation/editing.
- **Visual Structure (Top to Bottom):**
  1. `ServerStatusBanner` & Cache notice.
  2. **Top Action Bar:**
     - Left: "Scheduled Automations" title + count badge.
     - Right: "+ Add Schedule" primary button (navigates to `schedule-edit`).
  3. **Viewer Permission Note:** Displayed if `role === 'viewer'` explaining schedules cannot be toggled.
  4. **Schedules List (`FlatList`):**
     - Schedule Cards (`Card` wrapped in `TouchableOpacity`):
       - Header: 12-hour formatted execution time (e.g., "06:00 AM", 22px bold), enabled `Switch` toggle.
       - Action Tag: Action type badge (e.g., "Pump ON for 15 min", "Valve OFF").
       - Days Active Row: 7 day pills (Sun-Sat), highlighted in green if active on that day.
       - Footer: Target device name (`Cpu`), last run timestamp / "Never run".
- **Shared Components Used:** `Card`, `EmptyState`, `ErrorView`, `LoadingView`, `ServerStatusBanner`.
- **Data Hooks & Services:** `useLiveSchedules` (live Firestore listener), `useLiveDevices`, `useUpdateSchedule` (PATCH `/farms/:id/schedules/:id`), `useActiveFarm`, `useServerStatus`.
- **User Actions:** Toggle schedule enabled switch, tap card to edit (`router.push({ pathname: '/(app)/(farm)/schedule-edit', params: { scheduleId: item.id } })`), tap Add button to create new, pull-to-refresh.
- **States:**
  - *Loading:* `<LoadingView label="Loading schedules..." />`.
  - *Empty:* `<EmptyState>` with `Calendar` icon and "Create Schedule" CTA.
  - *Offline Server:* Toggling switch warns user that backend server is required.
- **Role Behavior:** `owner` & `admin` can toggle/edit/create; `viewer` switch is disabled.

---

### 9. Schedule Edit Screen
- **File Path:** [apps/mobile/app/(app)/(farm)/schedule-edit.tsx](file:///c:/Users/swayamthakur/Desktop/Krishiva/apps/mobile/app/(app)/(farm)/schedule-edit.tsx)
- **Purpose:** Create new or modify existing irrigation automations (device selection, action, time, duration, days of week).
- **Visual Structure (Top to Bottom):**
  1. `ScrollView` & `KeyboardAvoidingView`.
  2. **Device Selection Section:** Horizontal chip list of actuator-capable nodes.
  3. **Action Selector Grid:** 8 segmented action tiles:
     - Turn ON (PUMP), Turn OFF (PUMP)
     - Turn ON (VALVE), Turn OFF (VALVE)
     - Turn ON (LIGHT), Turn OFF (LIGHT)
     - Turn ON (SIREN), Turn OFF (SIREN)
  4. **Execution Time Card:**
     - Clock icon, current formatted time (e.g., "6:00 AM" / "24h: 06:00").
     - "Change Time" button opening iOS/Android `DateTimePicker` modal.
     - Quick Time Presets: 6:00 AM, 12:00 PM, 6:00 PM.
  5. **Duration (Automatic Shutoff) Section (shown if action is an ON command):**
     - Subtitle: "Actuator will safely turn off after this duration."
     - Preset chips: 5 min, 15 min, 30 min, 60 min.
  6. **Active Days Section:**
     - Toggle: "Every Day" vs "Custom Days".
     - If custom: 7 circular day buttons (Sun, Mon, Tue, Wed, Thu, Fri, Sat).
  7. **Optional Schedule Name `Input`:** Descriptive label (e.g., "Morning North Field Drip").
  8. **Action Buttons:**
     - "Save Schedule" primary `Button` with loading state.
     - "Delete Schedule" danger `Button` (only displayed when editing an existing schedule).
- **Shared Components Used:** `Input`, `Button`, `Card`, `ServerStatusBanner`.
- **Data Hooks & Services:**
  - Live Firestore: `useLiveDevices`, `useLiveSchedules`.
  - Mutations: `useCreateSchedule`, `useUpdateSchedule`, `useDeleteSchedule`.
  - Context: `useActiveFarm`, `useServerStatus`.
- **User Actions:** Select node, pick action, open native time picker modal, select duration and days, save or delete schedule.
- **States:** Form validation (Zod schema checking time format and node presence), loading submission state, offline server guard.
- **Role Behavior:** Only accessible to `owner` and `admin`.

---

### 10. Alerts & Incidents Screen
- **File Path:** [apps/mobile/app/(app)/(farm)/alerts.tsx](file:///c:/Users/swayamthakur/Desktop/Krishiva/apps/mobile/app/(app)/(farm)/alerts.tsx)
- **Purpose:** Triage active agronomic warnings, sensor failures, and hardware anomalies; review historical acknowledged events.
- **Visual Structure (Top to Bottom):**
  1. `ServerStatusBanner` & Cache stale notice.
  2. **Segmented Tabs Header:**
     - "Active ({unacknowledgedCount})" tab
     - "History" tab
  3. **Top Action Bar (Active tab only):**
     - "Acknowledge All" button with `CheckCheck` icon (disabled if count is 0 or role is viewer).
  4. **Alerts List (`FlatList`):**
     - Alert Cards (`Card`):
       - Header: Severity icon (`AlertTriangle` for critical red, `AlertCircle` for warning orange, `Info` for info blue), Alert Title (e.g., "Critically dry soil", "Heat stress"), Severity badge (`critical`, `warning`, `info`).
       - Message body: Detailed diagnostic description.
       - Context metadata row: Target node ID (`Cpu`), timestamp (`Clock`).
       - Action Row: Individual "Acknowledge" button (`Check` icon) with inline loading spinner (only on Active tab).
- **Shared Components Used:** `Card`, `Badge`, `EmptyState`, `ErrorView`, `LoadingView`, `ServerStatusBanner`.
- **Data Hooks & Services:**
  - Live Firestore: `useLiveAlerts` (filters by `farmId` and `acknowledged` status).
  - Mutations: `useAcknowledgeAlert` (PATCH `/farms/:id/alerts/:id/ack`), `useAcknowledgeAll` (POST `/farms/:id/alerts/ack-all`).
  - Context: `useActiveFarm`, `useServerStatus`, `useLanguage`.
- **User Actions:** Switch between Active and History tabs, acknowledge individual alert, acknowledge all alerts, pull-to-refresh.
- **States:**
  - *Loading:* `<LoadingView label="Loading alerts..." />`.
  - *Empty Active:* `<EmptyState>` with green checkmark and "All Clear - No active alerts for this farm".
  - *Empty History:* `<EmptyState>` with "No past acknowledged alerts found".
  - *Offline Guard:* Alert acknowledgment disabled if backend server is offline.
- **Role Behavior:** `owner` & `admin` can acknowledge alerts; `viewer` can only inspect without acknowledgment buttons.

---

## C. Shared Component Catalog (`apps/mobile/src/components`)

| Component | Props | Where Used | Data Logic vs Purely Presentational | Styling Approach & Restyle Difficulty |
| :--- | :--- | :--- | :--- | :--- |
| **AlertBanner** | `farmId: string` | `dashboard.tsx` | **Contains Data Logic:** Subscribes to `useLiveAlerts(farmId, false)` directly. | `StyleSheet.create`. **Easy to restyle:** Pure box wrapper with icon and text. |
| **Badge** | `label: string`, `variant?: 'success' \| 'warning' \| 'neutral' \| 'danger'`, `style?: StyleProp<ViewStyle>` | `farms.tsx`, `dashboard.tsx`, `controls.tsx`, `alerts.tsx`, `FieldHeatmap.tsx` | **Purely Presentational:** Color-mapping helper based on variant. | `StyleSheet.create`. **Trivial to restyle:** Update padding, radius, font size, or color palette. |
| **Button** | `title: string`, `loading?: boolean`, `variant?: 'primary' \| 'secondary' \| 'outline' \| 'danger'`, `style?: StyleProp<ViewStyle>`, `textStyle?: StyleProp<TextStyle>`, `icon?: React.ReactNode`, `...TouchableOpacityProps` | `login.tsx`, `register.tsx`, `create-farm.tsx`, `schedule-edit.tsx`, `EmptyState.tsx`, `ErrorView.tsx` | **Purely Presentational:** Handles loading state and disabled opacity. | `StyleSheet.create`. **Trivial to restyle:** Clean base button component. |
| **Card** | `style?: StyleProp<ViewStyle>`, `children?: React.ReactNode`, `...ViewProps` | Used across **all 10 screens** | **Purely Presentational:** Generic surface wrapper with standard elevation and border radius. | `StyleSheet.create`. **Trivial to restyle:** Changing `borderRadius`, `borderColor`, and `shadow` updates entire app. |
| **ControlButton**| `label: string`, `actionType: 'ON' \| 'OFF'`, `capability: string`, `disabled?: boolean`, `loading?: boolean`, `onPress: () => void` | `controls.tsx` | **Purely Presentational:** Renders ON (green) / OFF (grey/red) button with icon and spinner. | `StyleSheet.create`. **Easy to restyle:** Clean self-contained component. |
| **EmptyState** | `icon: React.ReactNode`, `title: string`, `description: string`, `actionTitle?: string`, `onAction?: () => void` | `farms.tsx`, `dashboard.tsx`, `analytics.tsx`, `controls.tsx`, `schedule.tsx`, `alerts.tsx` | **Purely Presentational:** Standardized empty placeholder layout. | `StyleSheet.create`. **Trivial to restyle.** |
| **ErrorView** | `title?: string`, `message?: string`, `onRetry?: () => void`, `retrying?: boolean` | `farms.tsx`, `dashboard.tsx`, `schedule.tsx`, `alerts.tsx` | **Purely Presentational:** Standardized error screen with retry button and optional DEV API URL. | `StyleSheet.create`. **Trivial to restyle.** |
| **FieldHeatmap** | `cells: HeatmapCell[]` | `dashboard.tsx` | **Semi-Presentational with Internal UI State:** Contains internal `selectedCell` modal state and SVG coordinate math. | **Complex to restyle:** Uses `react-native-svg` (`Svg`, `Rect`, `Text`, `G`) with direct pixel calculations and modal sheets. |
| **Input** | `label: string`, `error?: string`, `containerStyle?: StyleProp<ViewStyle>`, `rightElement?: React.ReactNode`, `...TextInputProps` | `login.tsx`, `register.tsx`, `create-farm.tsx`, `schedule-edit.tsx` | **Purely Presentational:** Manages focus state border highlight and error label display. | `StyleSheet.create`. **Easy to restyle.** |
| **LineChart** | `data: ChartDataPoint[]`, `metricLabel: string`, `metricUnit: string`, `lineColor?: string`, `isLoading?: boolean`, `isError?: boolean`, `errorMessage?: string`, `onRetry?: () => void` | `analytics.tsx` | **Purely Presentational:** Direct SVG math generating Polyline, Polygon area gradient, axis lines, and grid ticks. | **Complex to restyle:** Custom SVG paths (`react-native-svg`). Restyling requires modifying mathematical stroke/fill parameters. |
| **LoadingView** | `label?: string` | `index.tsx`, `_layout.tsx`, `farms.tsx`, `dashboard.tsx`, `controls.tsx`, `schedule.tsx`, `alerts.tsx` | **Purely Presentational:** Centered `ActivityIndicator` and label. | `StyleSheet.create`. **Trivial to restyle.** |

---

## D. Current Design System Specification

### 1. Color Palette

#### Primary Theme Tokens (`src/theme/colors.ts`)
| Token Name | Hex Value | Semantic Role |
| :--- | :--- | :--- |
| `primary` | `#2E7D32` | Forest green primary brand color, buttons, active tab icons, good status |
| `primaryDark` | `#1B5E20` | Dark green headers, screen titles, strong emphasis text |
| `primaryLight`| `#4CAF50` | Accent green |
| `primarySurface` | `#E8F5E9` | Light green surface for icon circles, chips, badges |
| `background` | `#F8FAF8` | App scaffold background (off-white with subtle green hue) |
| `card` | `#FFFFFF` | Card surfaces, modals, tab bar, header background |
| `text` | `#1C2826` | Primary high-contrast text |
| `textSecondary`| `#5F7161` | Secondary labels, descriptions, subheadings |
| `textMuted` | `#8D9F87` | Inactive tab bar icons, timestamps, placeholders |
| `textInverse` | `#FFFFFF` | Text on top of primary buttons |
| `border` | `#E0E6E0` | Standard component borders |
| `borderLight` | `#EDF2ED` | Card borders, dividers, subtle separators |
| `accent` | `#F9A825` | Amber accent |
| `success` | `#2E7D32` | Success status, optimal farm health, owner badge |
| `warning` | `#EF6C00` | Orange warning, attention status, admin badge |
| `error` | `#D32F2F` | Red critical errors, high alerts, delete buttons |
| `errorSurface`| `#FFEBEE` | Red error banner backgrounds |
| `online` | `#2E7D32` | Online device status indicator |
| `offline` | `#8D9F87` | Offline device status indicator |
| `shadow` | `#000000` | iOS shadow drop color |

#### Scattered / Hardcoded Color Values
Beyond `src/theme/colors.ts`, the app contains several hardcoded hex values in component files:
- **Telemetry Moisture:** `#D32F2F` (Critical <=15%), `#EF6C00` / `#F57C00` (Low <=25%), `#2E7D32` (Good <=60%), `#1976D2` (Wet >60%), `#E3F2FD` (Wet surface), `#9E9E9E` (No data grey).
- **Telemetry Temperature:** `#E65100` (Orange text), `#FBE9E7` (Surface), `#D32F2F` (Extreme >=42°C), `#EF6C00` (Hot >=35°C).
- **Telemetry Humidity:** `#00897B` (Teal text), `#E0F2F1` (Teal surface).
- **Grok AI / Health / Weather Surfaces:** `#FEF3C7` (Yellow bg), `#D97706` (Amber text), `#FEE2E2` (Red bg), `#DC2626` (Red text), `#E0F2FE` (Light sky blue), `#0284C7` (Sky blue text), `#F0FDF4` (Green bg), `#16A34A` (Green text), `#2563EB` (Blue text), `#EFF6FF` (Blue surface).
- **Hardware Controls:** `#A5D6A7` (Pump on light), `#EF9A9A` (Pump off light), `#B71C1C` (Dark red), `#FFE082` (Amber warning surface), `#FFF8E1` (Warm yellow surface).

### 2. Typography
- **Font Families:** System default (`San Francisco` on iOS, `Roboto` on Android). Monospace font family (`fontFamily: 'monospace'`) is used only for device MACs and Farm IDs in `farms.tsx`.
- **Custom Fonts:** None loaded.
- **Font Scale:**
  - `32px` (800 weight, letterSpacing: -0.5): Brand Title (`login.tsx`, `register.tsx`)
  - `24px` (800 weight): Top Screen Headers (`farms.tsx`)
  - `22px` (700 weight): Section Subheadings & Time Pickers (`schedule.tsx`)
  - `20px` (700 weight): Card / Form Titles (`login.tsx`, `create-farm.tsx`)
  - `18px` (700 weight): Tab headers & section titles
  - `17px` (700 weight): Farm Name card titles (`farms.tsx`)
  - `16px` (600 weight): Button text, field values
  - `14px` (500/600 weight): Body copy, input text, table rows
  - `13px` (500 weight): Card sub-labels, banner alerts
  - `12px` (600/700 weight): Badges, chips, language selectors
  - `11px` (600 weight): Tab bar labels, cache status timestamps
  - `10px` (700 weight): Tab bar badge counts

### 3. Spacing & Radius Conventions
- **Padding Scale:** `4px` (dense chips), `8px` (badges), `12px` (compact cards, inputs), `16px` (standard card padding, screen gutters), `20px` (large cards), `24px` (screen outer padding), `32px` (empty state padding).
- **Border Radius Scale:**
  - `8px`: Badges, chips, day selectors, language pills.
  - `12px`: Input containers, inner icon boxes, alert banners.
  - `14px`: Language selector bar.
  - `16px`: Standard `Card` components, control buttons.
  - `20px`: Large form cards (`login.tsx`, `register.tsx`).
  - `22px` / `36px` / `38px`: Circular icon wrappers and avatars.

### 4. Shadows & Elevation
- **Card Shadow:**
  ```ts
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
  ```
- **Form Card Elevation:** `elevation: 3`, `shadowRadius: 10`, `shadowOpacity: 0.06`.

### 5. Icons (`lucide-react-native`)
The application currently imports and uses **49 distinct Lucide icons**:
`Activity`, `AlertCircle`, `AlertTriangle`, `ArrowLeft`, `Bell`, `BellRing`, `Calendar`, `Check`, `CheckCheck`, `CheckCircle2`, `ChevronRight`, `Clock`, `CloudOff`, `CloudRain`, `Cpu`, `Database`, `Droplets`, `Filter`, `Globe`, `Info`, `Layers`, `LayoutDashboard`, `LineChart`, `LogIn`, `LogOut`, `MapPin`, `Maximize2`, `MessageSquare`, `Plus`, `PlusCircle`, `Power`, `PowerOff`, `Radio`, `RefreshCw`, `RotateCcw`, `RotateCw`, `Send`, `ShieldAlert`, `Sliders`, `Sparkles`, `Sprout`, `Sun`, `Thermometer`, `Tractor`, `Trash2`, `UserPlus`, `Wifi`, `X`, `XCircle`.

### 6. Charts & Visualizations
- **LineChart (`src/components/LineChart.tsx`):**
  - Built with `react-native-svg` (`Line`, `Polyline`, `Polygon`, `Circle`, `Text as SvgText`).
  - Fixed height `210px`, dynamic width based on `Dimensions.get('window').width - 48`.
  - Gradient polygon area fill under polyline stroke (`strokeWidth: 2.5`).
  - Horizontal Y-axis gridlines and 4 formatted X-axis time ticks.
- **FieldHeatmap (`src/components/FieldHeatmap.tsx`):**
  - Built with `react-native-svg` (`Svg`, `Rect`, `Text as SvgText`, `G`).
  - Matrix layout with spatial cell coordinates, rendering sensor soil moisture, temperature, and node ID inside each grid cell.
  - Tapping a cell opens an interactive bottom sheet modal with full node metrics.

### 7. Animations & Gestures
- Transition animations: Expo Router native slide transitions (`slide_from_right` in `(auth)/_layout.tsx`).
- No `react-native-reanimated` animations currently active in screens (reanimated is installed as transitive dependency of Expo Router).

### 8. Dark Mode Support
- **No dark mode support:** Hardcoded to light mode in `app.json`:
  ```json
  "userInterfaceStyle": "light"
  ```
  All screen styles use static light tokens from `colors.ts`.

### 9. Safe-Area & Keyboard Handling
- **Safe-Area:** Root wrapped in `SafeAreaProvider`. `SafeAreaView` from `react-native-safe-area-context` used in `login.tsx`, `register.tsx`, `farms.tsx`, and `_layout.tsx`.
- **Keyboard Handling:** `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` and `ScrollView` with `keyboardShouldPersistTaps="handled"` on all form screens.

### 10. Accessibility
- `accessibilityRole="button"` and descriptive `accessibilityLabel` attributes implemented on `Button`, `ControlButton`, `AlertBanner`, and icon buttons.

### 11. App Configuration (`app.json`)
- **App Name:** `Krishiva`
- **Slug / Scheme:** `krishiva`
- **Orientation:** `portrait`
- **Icons & Splash:**
  - App Icon: `./assets/icon.png`
  - Android Adaptive Icon: Background `#E6F4FE`, foreground `./assets/android-icon-foreground.png`, background `./assets/android-icon-background.png`, monochrome `./assets/android-icon-monochrome.png`.
  - Web Favicon: `./assets/favicon.png`

---

## E. Dependencies That Affect UI (`apps/mobile/package.json`)

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `expo` | `~57.0.28` | Core framework runtime (SDK 57) |
| `expo-router` | `~57.0.26` | File-based navigation, tabs, and modals |
| `react` | `^19.2.3` | UI runtime |
| `react-native` | `0.86.3` | Mobile platform bridge |
| `react-native-safe-area-context` | `~5.7.0` | Safe area insets management |
| `react-native-screens` | `~4.26.0` | Native view controllers for navigation transitions |
| `react-native-svg` | `15.15.4` | SVG rendering engine for LineChart and FieldHeatmap |
| `lucide-react-native` | `^1.56.0` | Vector icons (49 icons used) |
| `@react-native-community/datetimepicker` | `9.1.0` | Native iOS/Android date & time picker wheel |
| `@tanstack/react-query` | `^5.104.2` | Mutation status and client cache |
| `react-hook-form` & `@hookform/resolvers` | `^7.90.0` / `^5.9.1` | Form state management |
| `zod` | `^3.25.76` | Form schema validation |
| `i18next` & `react-i18next` | `^26.5.12` / `^17.1.9` | Dynamic multilingual localization (en, hi, mr) |
| `@react-native-async-storage/async-storage` | `2.2.0` | Local snapshot persistence and offline caching |

---

## F. Constraints for a Redesign

### 1. Business & Data Logic That MUST NOT Change
1. **Live Firestore Subscriptions (`apps/mobile/src/hooks/live/`):**
   - The real-time listeners (`onSnapshot`) for `farms`, `devices`, `heatmap`, `schedules`, `alerts`, `brief`, `health`, `weather`, and `irrigation` must remain intact.
2. **Offline Snapshot Cache Architecture (`src/services/snapshotCache.ts`):**
   - Local caching to AsyncStorage on every snapshot and fallback to cache on network disconnect.
3. **Control Server Health Monitoring (`src/context/ServerStatusContext.tsx`):**
   - Background polling of `/health` endpoint and automatic banner display when offline.
4. **Role Gating Rules:**
   - `viewer` must remain blocked from executing commands (relay toggling, pump activation), creating schedules, and acknowledging alerts.
   - `owner` and `admin` retain full control.
5. **Telemetry Freshness Logic (`src/utils/freshness.ts`):**
   - Mathematical calculation of `isLive`, `isDelayed`, `isStale` based on 5-minute and 15-minute thresholds.
6. **Command Dispatch & Polling Sequence (`src/hooks/useCommand.ts`):**
   - 40-second status polling until acknowledged or expired.

### 2. Tangled Logic & Styling Requiring Prior Refactoring
1. **`dashboard.tsx` Monolith (1,217 lines):**
   - Contains brief card, health gauge, weather, irrigation, sensor averages, heatmap, and device cards embedded directly in one gigantic `renderHeader` function.
   - *Refactoring Needed:* Extract each card into its own modular component (`AiBriefCard`, `HealthGaugeCard`, `WeatherCard`, `SensorSummaryRow`, `DeviceCard`) before restyling.
2. **`controls.tsx` Modal & Tracking Inline Logic (1,285 lines):**
   - Safety duration modal, in-flight tracking banner, relay cards, and hardware command card are tightly bound to local state.
   - *Refactoring Needed:* Separate into `ActuatorCard`, `PumpSafetyModal`, `HardwareMessageCard`, and `ActiveCommandBanner`.
3. **`schedule-edit.tsx` (1,205 lines):**
   - Custom time picker modal workarounds for iOS invisible text colors are intertwined with form inputs.
   - *Refactoring Needed:* Extract time picker and preset duration selector into clean sub-components.
4. **`FieldHeatmap.tsx` (517 lines):**
   - SVG math and interactive touch cell modal sheet are coupled in one file.

---

## G. Restyle Strategy & Effort Estimates

| Screen / Component | Strategy Option | Recommended Action | Effort Estimate |
| :--- | :--- | :--- | :--- |
| **`Card`, `Badge`, `Button`, `Input`, `EmptyState`, `ErrorView`, `LoadingView`** | **Option 2: Re-skin shared components** | Update border-radii, typography, padding, and elevation tokens in the shared component catalog. This instantly upgrades 70% of the app's visual polish. | 4 - 6 hours |
| **`login.tsx` & `register.tsx`** | **Option 2: Re-skin shared components** | Mostly use `Card`, `Input`, and `Button`. Add background gradient or illustration to header. | 2 - 3 hours |
| **`farms.tsx`** | **Option 2: Re-skin shared components** | Restyle farm card layout, update typography and icon badge containers. | 3 - 4 hours |
| **`create-farm.tsx`** | **Option 2: Re-skin shared components** | Modernize chip selection grid and coordinate input fields. | 2 - 3 hours |
| **`dashboard.tsx`** | **Option 3: Modular Screen Refactor & Rewrite** | Decompose the 1200-line monolith into dedicated sub-components, then restyle cards (Brief, Health Gauge, Weather, Sensor summary) to modern visual standards. | 10 - 14 hours |
| **`analytics.tsx`** | **Option 2 & Option 3 (Chart restyle)** | Modernize metric tab selectors, time-range segmented controls, and restyle the SVG LineChart path/fill styling. | 5 - 7 hours |
| **`controls.tsx`** | **Option 3: Modular Screen Refactor & Rewrite** | Extract pump modal, in-flight banner, and hardware messaging card into modular files, apply modern toggle switches and actuator card layouts. | 8 - 10 hours |
| **`schedule.tsx`** | **Option 2: Re-skin shared components** | Restyle automation card layout, day-of-week badges, and toggle switches. | 3 - 4 hours |
| **`schedule-edit.tsx`** | **Option 3: Screen Refactor** | Clean up duration chips, action tiles, and time selection interface. | 6 - 8 hours |
| **`alerts.tsx`** | **Option 2: Re-skin shared components** | Restyle segmented tabs, alert severity card banners, and batch action header. | 3 - 4 hours |

---

# PART 2: DESIGN EXPORT SUMMARY

`design/stitch not found`

*(Skipped because the folder `design/stitch` does not exist in the repository root.)*

---

# PART 3: AUDIT SUMMARY & RECOMMENDATIONS

### Screen Inventory Overview
The Krishiva mobile application comprises **10 functional screens** organized across Expo Router groups:
1. `/(auth)/login` - Farmer Sign In
2. `/(auth)/register` - Farmer Registration
3. `/(app)/farms` - My Farms Selector & Overview
4. `/(app)/create-farm` - Add Farm Modal Form
5. `/(app)/(farm)/dashboard` - Realtime Telemetry, Grok AI Brief, Health Gauge, Weather, Heatmap, Devices
6. `/(app)/(farm)/analytics` - Time-series Charts for Moisture, Temp, Humidity (6h, 24h, 7d)
7. `/(app)/(farm)/controls` - Actuator Relays (Pump, Valve, Light, Siren), Timed Shutoff, Hardware Messages
8. `/(app)/(farm)/schedule` - Irrigation Automations List with Live Switches
9. `/(app)/(farm)/schedule-edit` - Create/Edit Automation Schedule
10. `/(app)/(farm)/alerts` - Live & Historical Alert Triage with Single & Batch Acknowledgments

### Current Design System Summary
- **Color Identity:** Agriculture Forest Green (`#2E7D32`, `#1B5E20`) on soft off-white surface (`#F8FAF8`).
- **Telemetry Semantics:** Moisture (Blue/Green/Orange/Red), Temperature (Orange/Red), Humidity (Teal/Orange).
- **Typography:** Unstyled system fonts (`San Francisco` on iOS, `Roboto` on Android) with bold weights (700/800) for titles and monospace for hardware MACs.
- **Icons:** 49 Lucide React Native icons used consistently.
- **Charts:** Custom mathematical SVG implementations (`LineChart`, `FieldHeatmap`).
- **Theme Mode:** Light mode only (`userInterfaceStyle: light`).

### Critical Redesign Constraints
- All live Firestore hooks, local snapshot caching, offline server status monitoring, and role-based gating (`owner`/`admin` vs `viewer`) must be preserved without modification.
- Three complex screens (`dashboard.tsx`, `controls.tsx`, `schedule-edit.tsx`) exceed 1,200 lines each with inline modals and calculations; they must be refactored into sub-components before visual re-skinning to avoid regression.

