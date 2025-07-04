import type { Metadata } from 'next';
import './globals.css';
import Header from "./Header";
import { WalletProvider } from "./context/walletContext";
import ClientProviders from './ClientProviders'; // Import our new providers

export const metadata: Metadata = {
  title: 'GipieCoin - Free Play, Stake, Daily Claim & Win',
  description: 'Win free crypto daily with GipieCoin Game! Play, stake your tokens for passive rewards, and claim daily bonuses directly on BNB Smart Chain.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        {/* ClientProviders becomes the outermost wrapper */}
        <ClientProviders>
          <WalletProvider>
            <Header />
            <main>{children}</main>
          </WalletProvider>
        </ClientProviders>
      </body>
    </html>
  );
}
