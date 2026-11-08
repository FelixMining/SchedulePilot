interface Env {
  DATABASE_URL: string;
  APP_URL?: string;
  AUTH_LIMITER?: RateLimit;
  ASSETS: Fetcher;
}
