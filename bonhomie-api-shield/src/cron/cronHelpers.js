import { CronJob } from "cron";

/**
 * Wraps a function in a safe try/catch
 * for cron jobs.
 */
export function safeCron(fn) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      console.error("[api-shield] Cron job error:", err);
    }
  };
}

/**
 * Create a cron job with a cron expression
 */
export function createCron(schedule, fn, options = {}) {
  const job = new CronJob(
    schedule,
    safeCron(fn),
    null,
    options.start ?? true,
    options.timezone || "UTC"
  );
  return job;
}

/**
 * Run every minute
 */
export function everyMinute(fn) {
  return createCron("*/1 * * * *", fn);
}

/**
 * Run every X minutes
 */
export function everyXMinutes(minutes, fn) {
  return createCron(`*/${minutes} * * * *`, fn);
}

/**
 * Run every hour
 */
export function everyHour(fn) {
  return createCron("0 * * * *", fn);
}

/**
 * Daily at HH:MM ("23:30")
 */
export function dailyAt(time, fn) {
  const [hour, minute] = time.split(":");
  return createCron(`${minute} ${hour} * * *`, fn);
}

/**
 * Retry logic with exponential backoff
 */
export async function cronRetry(fn, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      const delay = Math.pow(2, attempt) * 500; // exponential
      await new Promise((res) => setTimeout(res, delay));
      if (attempt === retries) throw e;
    }
  }
}
