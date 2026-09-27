This is an Expo/React Native mobile application (Dominosa puzzle game). Prioritize mobile-first patterns, performance, and cross-platform compatibility (iOS first, Android and web from the same code).

## Project conventions

- `src/core` is the engine: pure TypeScript, no imports from outside `core`, no `Math.random` (use `createRng`). `src/game` and `src/levels` may use `@/core` but never React, React Native, Expo or stores. ESLint enforces this.
- UI state lives in Zustand stores under `src/state`; platform APIs are wrapped in `src/platform` so they can be swapped (e.g. AsyncStorage → MMKV) without touching callers.
- Everything that depends on the device (colour scheme, locale, stored data) waits for `useHydrated()` so the static web render matches the first client render.
- User-facing strings live in `src/i18n/strings.ts` (es is the reference; en and fr must match its shape).
- Levels are generated offline with `npm run levels` from `scripts/level-packs.ts`; never edit pack JSON by hand. The level test must keep passing (unique solution, stored solution, declared grade).
- Code and comments in English; README in Spanish.
- Run `npm run check` (typecheck, lint, format, tests) before declaring any task done.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

```bash
npx expo install <package>  # ALWAYS use instead of npm add for Expo/RN packages — resolves SDK-compatible versions
npm run web                 # dev server in the browser
npm start                   # dev server + QR for Expo Go
npm run check               # typecheck + lint + format + tests
npm run levels              # regenerate level packs
npm run build:web           # static export + PWA (set BASE_URL for GitHub Pages)
npx expo-doctor             # diagnose dependency and config issues
```

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `npx eas-cli@latest <command>`.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.config.ts` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries. Docs: https://docs.expo.dev/versions/latest/index.md
