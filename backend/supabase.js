require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uqrtlwjexlxfgsvtlypu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnRsd2pleGx4ZmdzdnRseXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTQ5NTgsImV4cCI6MjA5MzIzMDk1OH0.4fakJbsTquVtS7hg1gc4ktrjczayZ1LZ0JuG-w-su20';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnRsd2pleGx4ZmdzdnRseXB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY1NDk1OCwiZXhwIjoyMDkzMjMwOTU4fQ.UaqXMJGxEuVAv27TOy_6n2k11YzfHDByYThRF3Vu30c';

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

module.exports = { supabase, supabaseAdmin };
