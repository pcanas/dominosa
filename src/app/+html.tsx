import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML for the static web build (runs only in Node at build time).
 * Adds what iOS needs to install the prototype from Safari with
 * "Add to Home Screen" and run it full screen and offline.
 */
const BASE = process.env.EXPO_BASE_URL ?? '';

const globalCss = `
html, body { background-color: #F4EDE2; overscroll-behavior: none; }
body { -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none;
       -webkit-user-select: none; user-select: none; touch-action: manipulation; }
@media (prefers-color-scheme: dark) { html, body { background-color: #2B2622; } }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content="Dominosa: puzle lógico de dominó" />

        <link rel="manifest" href={`${BASE}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href={`${BASE}/apple-touch-icon.png`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Dominosa" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#F4EDE2" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#2B2622" media="(prefers-color-scheme: dark)" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
