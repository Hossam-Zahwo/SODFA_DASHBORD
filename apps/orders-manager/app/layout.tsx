import { ordersManagerPath } from "@/lib/app-path";
import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css';
import './globals.css';
import './workspace.css';
import './waybill-layout.css';
import './sodfa-embedded.css';
import {LanguageProvider} from './language';

export const metadata: Metadata = {
  title: 'إدارة الطلبات | هومي وصدفة',
  description: 'لوحة إدارة وتأكيد الطلبات الداخلية',
  robots: { index: false, follow: false },
  applicationName: 'HOMEY & SODFA',
  manifest: ordersManagerPath('/manifest.webmanifest'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HOMEY & SODFA',
  },
  icons: { icon: ordersManagerPath('/icon.svg'), apple: ordersManagerPath('/sodfa-app-180.png') },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ar" dir="rtl"><body><LanguageProvider>{children}</LanguageProvider></body></html>;
}
