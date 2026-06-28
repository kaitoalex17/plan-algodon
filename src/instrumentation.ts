// Next.js Instrumentation — runs once when the server starts
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Only run on the Node.js server runtime, not on Edge or during build
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prisma } = await import("@/lib/prisma");
    const { startEmailScheduler } = await import("@/lib/scheduler");
    startEmailScheduler(prisma);
    console.log("[Instrumentation] Scheduler iniciado desde instrumentation.ts");
  }
}
