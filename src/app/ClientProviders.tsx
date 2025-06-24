"use client";

import { 
  RainbowKitProvider, 
  getDefaultConfig, 
  darkTheme 
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { bsc } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

// --- Wagmi Config ---
const config = getDefaultConfig({
  appName: 'GipieCoin',
  projectId: '80a4339317db03d10dfa34a3175c406e',
  chains: [bsc],
});

const queryClient = new QueryClient();

// --- CUSTOM THEME (NO EXTRA DEPENDENCIES) ---
// We use spread syntax (...) to merge themes manually instead of using lodash.merge.
const myCustomTheme = {
  ...darkTheme(), // Start with the default dark theme properties
  colors: {
    ...darkTheme().colors, // Start with its default colors...
    // ...then override with our custom colors:
    modalBackground: '#1E293B',
    modalBackdrop: 'rgba(15, 23, 42, 0.6)',
    accentColor: '#2dd4bf',
    accentColorForeground: '#0F172A',
    modalText: '#FFFFFF',
    modalTextSecondary: '#94A3B8',
    actionButtonSecondaryBackground: '#334155',
  },
  shadows: {
    ...darkTheme().shadows,
    dialog: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
  },
  radii: {
    ...darkTheme().radii,
    modal: '16px',
    menuButton: '12px',
    actionButton: '12px',
  },
  fonts: {
    ...darkTheme().fonts,
    body: 'system-ui, sans-serif',
  },
};

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={myCustomTheme}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}