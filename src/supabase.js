import { createClient } from '@supabase/supabase-js'

// ─── FILL THESE IN (Step 3 of the Supabase setup guide) ──────────────────────
const SUPABASE_URL  = 'https://clahhzsqybbcytrykjek.supabase.co/rest/v1/'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsYWhoenNxeWJiY3l0cnlramVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTA1OTUsImV4cCI6MjA5NTE2NjU5NX0.zBG5gxoXbJJziAY40XmpPt6Oj4q-q-K0PKfZUYPe_SE'
// ─────────────────────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
