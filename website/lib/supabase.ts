"use client";

import { createClient } from "@supabase/supabase-js";

// Same Supabase project as the mobile app, so website logins hit the SAME user
// accounts. These are the public (anon/publishable) values — safe in the client;
// row-level security protects per-user data. Override via env in production.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pxkmpuubzeqppkxludla.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_NsyLVVxgRlMakIUKu25Akg_ycb5xOsJ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// The Express API (account deletion endpoint). Local dev default; set
// NEXT_PUBLIC_API_URL to the Railway URL in production.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
