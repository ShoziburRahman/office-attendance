import type { CapacitorConfig } from '@capacitor/cli';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const capacitorUrl = process.env.CAPACITOR_URL || 'http://localhost:3000';
const isHttps = capacitorUrl.startsWith('https');

const config: CapacitorConfig = {
  appId: 'com.shozibur.stampkini',
  appName: 'Stamp Kini',
  webDir: 'public',
  server: {
    url: capacitorUrl,
    cleartext: !isHttps,
    allowNavigation: [capacitorUrl, '*.supabase.co'],
  },
};

export default config;
