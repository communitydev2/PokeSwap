/**
 * lib/supabaseClient.js
 * Helper to initialize the Supabase client.
 */

import { createClient } from '@supabase/supabase-js'

// While developing against the local Supabase (127.0.0.1 / localhost), use the
// address the page was opened from instead, so a phone opening the dev server
// at the PC's network address (e.g. http://192.168.0.228:3000) reaches the
// PC's database rather than looking for one on the phone.
function devSupabaseUrl(url: string): string {
  if (!import.meta.env.DEV || !url) return url
  const parsed = new URL(url)
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) return url
  parsed.hostname = window.location.hostname
  return parsed.origin
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
