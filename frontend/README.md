# Frontend

Expo (React Native) app for the FHIR migration service. It runs on iOS, Android and web. UI components come from [React Native Reusables](https://reactnativereusables.com) (shadcn/ui for React Native), styled with [Nativewind](https://www.nativewind.dev) (Tailwind CSS v3).

## Features

- Start the migration job and follow its status (refreshes every 2 seconds while it runs)
- Patient list with name search and pagination
- Patient details with their observations, paginated
- Pull to refresh; light and dark themes follow the system setting

## Development

```sh
npm install
npx expo start          # press w for web, a for Android, i for iOS
```

The app needs the backend on port 8000:

- **Web:** calls `http://localhost:8000`.
- **Device or emulator:** calls port 8000 on the machine running Metro, so a phone on the same Wi-Fi works with Expo Go.
- **Override:** set `EXPO_PUBLIC_API_URL` (see `.env.example`).

With Docker Compose, the `frontend` service runs the web version on http://localhost:8081. To use a phone, run `npx expo start` locally instead; the container's address isn't reachable from the phone.

## Checks

```sh
npm run typecheck
npm run lint
npx expo-doctor
```

## Structure

| Path                              | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `src/app/_layout.tsx`             | Root layout: React Query, navigation theme, `PortalHost` |
| `src/app/index.tsx`               | Home screen: migration card and patient list             |
| `src/app/patients/[id].tsx`       | Patient details and observations                         |
| `src/components/migration-card.tsx` | Start job and job status                               |
| `src/components/patient-list.tsx` | Patient search, list and pagination                      |
| `src/components/pagination-bar.tsx` | Previous/next pagination control                       |
| `src/components/ui/`              | React Native Reusables components                        |
| `src/lib/api.ts`                  | API client and response types                            |
| `src/lib/theme.ts`                | Theme colors for navigation (mirrors `global.css`)       |

Add more components with:

```sh
npx @react-native-reusables/cli@latest add <component>
```
