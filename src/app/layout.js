import './globals.css';
import { Inter } from 'next/font/google'; 
import Header from './components/Header';
import Footer from './components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Nature Index — Conservation Science & Community',
  description: 'An open platform for conservation science, field discoveries, and community action.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-gray-300 font-sans antialiased`}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}