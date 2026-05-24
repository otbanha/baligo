import { createClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

// Browser client — used in <script> blocks via import
export function createBrowserSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { flowType: 'pkce' },
  });
}

// Server client — reads session from request cookies, writes via Astro.cookies
export function createServerSupabase(request: Request, cookies: AstroCookies) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options as Parameters<AstroCookies['set']>[2]);
        });
      },
    },
  });
}

// Admin client — service role key, server-only, bypasses RLS
export function createAdminSupabase() {
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
