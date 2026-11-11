import { setTimeout as delay } from 'node:timers/promises';

export async function waitForHttpReady({ url, attempts = 45, intervalMs = 1000, fetcher = fetch, sleep = delay } = {}) {
  if (!url || !Number.isInteger(attempts) || attempts < 1 || intervalMs < 0) throw new Error('Invalid readiness configuration');
  let lastError = 'no response';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(4000), redirect: 'manual' });
      if (response.status === 200) return { attempts: attempt, status: response.status };
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (attempt < attempts) await sleep(intervalMs);
  }
  throw new Error(`Next.js dashboard not ready after ${attempts} attempts: ${lastError}`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  waitForHttpReady({ url: process.env.VISION_NEXT_TEST_URL || 'http://127.0.0.1:4190' })
    .then(({ attempts }) => console.log(`Next.js ready after ${attempts} attempt(s)`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
