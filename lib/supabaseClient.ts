"use client";
import { createClient } from "@supabase/supabase-js";

// Publishable/anon keys are designed to be exposed client-side — security
// comes from Row Level Security policies on the database, not key secrecy.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lzrhnceamjpkplkyajgi.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_6_lHBxlmGWHMICNIsoKfVg_SmL6nHNz";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
