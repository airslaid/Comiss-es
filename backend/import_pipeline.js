require('dotenv').config();
const fs = require('fs');
const { supabase } = require('./supabase');

async function importPipeline() {
  const content = fs.readFileSync('C:\\Users\\pesso\\Downloads\\crm_pipeline_rows.csv', 'utf8');
  const lines = content.split('\n').filter(l => l.trim());

  // Skip header
  const rows = lines.slice(1);

  console.log(`📂 Total de linhas encontradas: ${rows.length}`);

  const records = rows.map(line => {
    const cols = line.split(';');
    if (cols.length < 8) return null;

    const [id, org_in_codigo, ser_st_codigo, ped_in_codigo, status, created_at, updated_at, is_hot] = cols;

    // Mapeamento de status antigo -> stage novo do sistema
    const stageMap = {
      'PROPOSTA ENVIADA':       'ENVIADO AO CLIENTE',
      'EM NEGOCIAÇÃO':          'EM NEGOCIAÇÃO',
      'ENCERRADO':              'FECHADO (GANHO)',
      'CANCELADO':              'CANCELADO',
      'CANCELADO / PERDIDO':    'CANCELADO',
      'EM APROVAÇÃO (INTERNO)': 'PROCESSO INTERNO',
    };

    const stage = stageMap[status?.trim()] || 'PROCESSO INTERNO';
    const hot_lead = is_hot?.trim() === 'true';

    return {
      id: id?.trim(),
      org_in_codigo: parseInt(org_in_codigo?.trim()),
      ser_st_codigo: ser_st_codigo?.trim(),
      ped_in_codigo: parseInt(ped_in_codigo?.trim()),
      stage,
      hot_lead,
    };
  }).filter(r => r && !isNaN(r.org_in_codigo) && !isNaN(r.ped_in_codigo));

  console.log(`✅ Registros válidos para importar: ${records.length}`);

  // Importa em lotes de 50 para evitar timeout
  const batchSize = 50;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const { error } = await supabase
      .from('crm_pipeline')
      .upsert(batch, { onConflict: 'org_in_codigo,ser_st_codigo,ped_in_codigo' });

    if (error) {
      console.error(`❌ Erro no lote ${i / batchSize + 1}:`, error.message);
      errors++;
    } else {
      imported += batch.length;
      process.stdout.write(`\r⏳ Importados: ${imported}/${records.length}`);
    }
  }

  console.log(`\n\n🎉 Importação concluída!`);
  console.log(`   ✅ Sucesso: ${imported} registros`);
  if (errors > 0) console.log(`   ❌ Lotes com erro: ${errors}`);

  // Resumo dos estágios
  const stageCount = {};
  records.forEach(r => {
    stageCount[r.stage] = (stageCount[r.stage] || 0) + 1;
  });
  console.log('\n📊 Distribuição por estágio:');
  Object.entries(stageCount).sort((a, b) => b[1] - a[1]).forEach(([stage, count]) => {
    console.log(`   ${stage}: ${count}`);
  });

  const hotCount = records.filter(r => r.hot_lead).length;
  console.log(`\n🔥 Leads Quentes: ${hotCount}`);
}

importPipeline().catch(console.error);
