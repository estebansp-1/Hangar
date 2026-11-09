import 'dotenv/config';

const required = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') throw new Error(`Falta la variable de entorno ${key}`);
  return value;
};

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  resetTtlMinutes: Number(process.env.RESET_CODE_TTL_MINUTES || 15),
  resetMaxAttempts: Number(process.env.RESET_CODE_MAX_ATTEMPTS || 5),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  mailFrom: process.env.MAIL_FROM || 'HANGAR Estudio <no-reply@hangar.studio>',
  brevoKey: process.env.BREVO_API_KEY,
  // asistente de la página
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  supportEmail: process.env.SUPPORT_EMAIL || 'juanesteban9283@gmail.com',
  supportPhone: process.env.SUPPORT_PHONE || '573161499556',
  supportPhoneLabel: process.env.SUPPORT_PHONE_LABEL || '316 149 9556',
  callmebotKey: process.env.CALLMEBOT_APIKEY,
};
