import { registerAs } from '@nestjs/config';

export const appConfigFactory = registerAs('app', () => ({
  domain: process.env.DOMAIN,
  appWebUrl: process.env.APP_WEB_URL,
  adminWebUrl: process.env.ADMIN_WEB_URL,
  serverUrl: process.env.SERVER_URL,
  appUri: process.env.APP_URI,
  payloadSize: '20mb',
  platformName: process.env.PLATFORM_NAME,
}));
