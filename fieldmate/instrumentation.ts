/**
 * Next.js instrumentation file
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Suppress Mastra telemetry warning (telemetry is deprecated and being removed)
  // @ts-expect-error - Mastra internal global variable
  globalThis.___MASTRA_TELEMETRY___ = true;
}
