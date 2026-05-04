import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqrtlwjexlxfgsvtlypu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnRsd2pleGx4ZmdzdnRseXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTQ5NTgsImV4cCI6MjA5MzIzMDk1OH0.4fakJbsTquVtS7hg1gc4ktrjczayZ1LZ0JuG-w-su20';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
