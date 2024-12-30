import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ujrsmdegbzqjcsrxvyao.supabase.co'; // Zastąp swoim URL-em Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcnNtZGVnYnpxamNzcnh2eWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0OTAyMzksImV4cCI6MjA1MTA2NjIzOX0.r9GbGA8I0hfO9yqEif8jEOGQzvfJ_WvRD2i4YLU2rdM'; // Zastąp swoim kluczem API z Supabase

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
