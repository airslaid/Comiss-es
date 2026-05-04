const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uqrtlwjexlxfgsvtlypu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnRsd2pleGx4ZmdzdnRseXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTQ5NTgsImV4cCI6MjA5MzIzMDk1OH0.4fakJbsTquVtS7hg1gc4ktrjczayZ1LZ0JuG-w-su20';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createFirstUser() {
  console.log('Tentando criar o usuário: ti@grupoairslaid.com.br...');
  
  const { data, error } = await supabase.auth.signUp({
    email: 'ti@grupoairslaid.com.br',
    password: 'AirSales2026!',
  });

  if (error) {
    console.error('Erro ao criar usuário:', error.message);
  } else {
    console.log('Usuário criado com sucesso!');
    console.log('ID:', data.user.id);
    console.log('E-mail:', data.user.email);
    console.log('\nIMPORTANTE: Verifique se a confirmação de e-mail está habilitada no seu projeto Supabase.');
    console.log('Se estiver, você precisará confirmar o e-mail para conseguir logar.');
  }
}

createFirstUser();
