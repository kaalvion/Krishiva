# Krishiva Smart-Farm IoT Admin Console

Browser administration console for Krishiva Smart-Farm platform. Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, **TanStack React Query**, **Firebase Web SDK**, **React Hook Form**, **Zod**, and custom hand-drawn **SVG charts** (Field Heatmap and Line Charts).

---

## Features

- **Authentication & Persistence**: Firebase email/password authentication with persisted session across page refreshes, protected routes, and role-based views (`owner`, `admin`, `viewer`).
- **Farm Switcher**: Multi-farm navigation bar with active farm selection saved to localStorage and synced to the URL (`/farms/:farmId/...`).
- **Overview Dashboard**:
  - Live metric stat cards: total devices, online nodes, offline nodes, active alerts, and 24h commands.
  - Hand-drawn SVG **Field Soil Moisture Heatmap** with GPS coordinate normalization or automated nodeId grid layout, dynamic color coding (≤15% red, 16-25% orange, 26-60% green, >60% blue, grey for no data), and interactive modal inspection.
  - Environmental average cards with threshold indicators.
  - Recent actuator commands and recent alert mini-feeds with 15s auto-refresh.
- **Devices & Sensors**:
  - Full hardware device table with relative heartbeat time, capability badges, and zone assignments.
  - Device registration modal (validates Node IDs 1–4, handles 409 conflict detection gracefully).
  - Telemetry history drawer featuring a hand-drawn SVG **LineChart** with metrics toggling (Soil Moisture, Temperature, Humidity), range intervals (6h, 24h, 7d), and Min/Average/Max stats.
- **Actuator Commands**:
  - Audit history table with status and device filters.
  - Manual actuation panel with duration presets for ON actions.
  - Live command status tracker that polls `GET /api/commands/:id` every 1.5s until final (`acknowledged`, `failed`, `expired`) or 40s timeout.
- **Automated Schedules**:
  - Crontab/daily timer schedules for irrigation pumps, valves, and lighting.
  - Instant enable/disable switches, create/edit modal with day-of-week recurrence picker, and deletion confirmation dialog.
  - Automatic farm timezone awareness.
- **Alerts & Diagnostics**:
  - Active and Historical tabs with severity badges.
  - Individual alert acknowledgement and "Acknowledge All" action.
  - Real-time unacknowledged alerts counter badge in the sidebar navigation refreshed every 30s.
- **Farm Members & Access Control**:
  - Collaborator roster with role-based badges (`owner`, `admin`, `viewer`).
  - Owner-exclusive member invitation modal with email validation.
  - Comprehensive viewer mode disabling mutating actions with informational badges.
- **All Farms Management**:
  - Grid overview of all managed farms with quick-switch links and "Create New Farm" wizard.

---

## Environment Configuration

The Admin Console reads its configuration from `apps/admin/.env.local`.

1. Copy `.env.example` to `.env.local` if not already present:
   ```bash
   cp apps/admin/.env.example apps/admin/.env.local
   ```
2. Verify the configuration keys:
   ```env
   VITE_API_URL=http://localhost:3000
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=krishiva-be6a1.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=krishiva-be6a1
   VITE_FIREBASE_STORAGE_BUCKET=krishiva-be6a1.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1091236430755
   VITE_FIREBASE_APP_ID=1:1091236430755:web:placeholder
   ```

*(Note: `.env.local` is git-ignored by the root `.gitignore`.)*

---

## Running Locally

### Development Server
From the Krishiva root repository:
```bash
npm --workspace=@krishiva/admin run dev
```
Or from within `apps/admin`:
```bash
npm run dev
```
The console will start at **http://localhost:5173**.

### Production Build & Type Check
```bash
# Type check without emitting
npx tsc --noEmit

# Production bundle build
npm run build
```
