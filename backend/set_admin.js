const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uqrtlwjexlxfgsvtlypu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnRsd2pleGx4ZmdzdnRseXB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY1NDk1OCwiZXhwIjoyMDkzMjMwOTU4fQ.UaqXMJGxEuVAv27TOy_6n2k11YzfHDByYThRF3Vu30c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setFirstUserAdmin() {
  console.log('Buscando usuários...');
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('Erro ao buscar usuários:', userError.message);
    return;
  }

  const targetEmail = 'ti@grupoairslaid.com.br';
  const user = users.find(u => u.email === targetEmail);

  if (!user) {
    console.error(`Usuário ${targetEmail} não encontrado.`);
    return;
  }

  console.log(`Configurando ${targetEmail} como ADMIN...`);
  
  const { error: permError } = await supabase
    .from('user_permissions')
    .upsert({ 
      user_id: user.id, 
      role: 'ADMIN', 
      allowed_modules: [
        'all', 'CRM_PIPELINE', 'CRM_FOLLOWUP', 'CRM_AGENDA', 
        'OV', 'PD', 'DV', 'FAT', 'RANKING', 'METAS', 'USERS'
      ]
    }, { onConflict: 'user_id' });

  if (permError) {
    console.error('Erro ao salvar permissão:', permError.message);
  } else {
    console.log('Sucesso! O usuário agora é ADMIN.');
  }
}

setFirstUserAdmin();
