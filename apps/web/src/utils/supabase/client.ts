import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yitwhjmqfdohwbqbnsmy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_d3uy3MX06pfCeivCwyZq5A_nGVTqqtO';

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
