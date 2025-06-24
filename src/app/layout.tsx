import type { Metadata } from 'next';
import './globals.css';
import Header from "./Header";
import { WalletProvider } from "./context/walletContext";
import ClientProviders from './ClientProviders'; // Import our new providers

export const metadata: Metadata = {
  title: 'GipieCoin - Freeroll, Stake & Win',
  description: 'Win free crypto every hour with the GipieCoin Freeroll, stake your tokens, and earn passive rewards!',
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
