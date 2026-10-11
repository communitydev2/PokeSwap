/**
 * lib/supabaseClient.js
 * Helper to initialize the Supabase client.
 */

import { createClient } from '@supabase/supabase-js'

// While developing against local Supabase (127.0.0.1 / localhost), send requests
// through the dev server at the page's address and protocol. This lets phones
// reach the PC's database even when the page uses HTTPS through Tailscale.
function devSupabaseUrl(url: string): string {
  if (!import.meta.env.DEV || !url) return url
  const parsed = new URL(url)
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) return url
  return `${window.location.origin}/supabase-local`
}

const supabaseUrl = devSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Keep users signed in on this device: the session is saved in localStorage
// and refreshed automatically, and magic-link tokens are read from the URL.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
