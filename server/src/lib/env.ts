function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  JWT_SECRET: required("JWT_SECRET"),
  DATABASE_URL: required("DATABASE_URL"),
  INVITE_TOKEN: process.env.INVITE_TOKEN,
  PORT: process.env.PORT ?? "3000"
};
