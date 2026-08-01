/**
 * Thin publishable-key helper — avoids importing @clerk/react/internal
 * (which breaks under the local Vite Clerk mock alias).
 */
export function publishableKeyFromHost(_hostname: string, envKey?: string): string | undefined {
  if (import.meta.env.VITE_LOCAL_DEV_AUTH === "1") {
    return envKey || "pk_test_local_dev_bypass";
  }
  return envKey || undefined;
}
