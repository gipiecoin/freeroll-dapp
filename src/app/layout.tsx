import type { Metadata } from 'next';
     import './globals.css';
     import Header from "./Header";
     import { WalletProvider } from "./context/walletContext";

     export const metadata: Metadata = {
       title: 'GipieCoin - Freeroll, Stake & Win',
       description: 'Win free crypto every hour with the GipieCoin Freeroll, stake your tokens, and earn passive rewards!',
       icons: {
         icon: '/favicon.ico', // Hanya gunakan favicon.ico untuk menguji
       },
     };

     export default function RootLayout({
       children,
     }: {
       children: React.ReactNode;
     }) {
       return (
         <html lang="en">
           <body className="bg-gray-900 text-white">
             <WalletProvider>
               <Header />
               <main>{children}</main>
             </WalletProvider>
           </body>
         </html>
       );
     }