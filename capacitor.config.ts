import type { CapacitorConfig } from '@capacitor/cli';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const config: CapacitorConfig = {
  appId: 'com.shozibur.stampkini',
  appName: 'Stamp Kini',
  webDir: 'public',
  server: {
    url: 'http://localhost:3000',
    cleartext: true,
    allowNavigation: ['http://localhost:3000', '*.supabase.co'],
  },
};

export default config;