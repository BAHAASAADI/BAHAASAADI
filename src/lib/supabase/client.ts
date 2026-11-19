"use client";

import { createBrowserClient } from "@supabase/ssr";
import { AUTH_COOKIE_NAME, browserSupabaseUrl, SUPABASE_ANON_KEY } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Browser client: shares the dashboard session cookies; anonymous for visitors. */
export function createClient() {
  if (!client) {
    client = createBrowserClient(browserSupabaseUrl(), SUPABASE_ANON_KEY, AUTH_COOKIE_NAME ? { cookieOptions: { name: AUTH_COOKIE_NAME } } : undefined);
  }
  return client;
}
