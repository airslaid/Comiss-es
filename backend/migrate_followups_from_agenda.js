require('dotenv').config();
const fs = require('fs');
const { supabase } = require('./supabase');

const CSV_PATH = 'C:\\Users\\ti\\Downloads\\crm_appointments_rows (14).csv';

// Função para parsear CSV com suporte a aspas e quebras de linha
function parseCSV(content) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            currentCell += '"';
            i++; 
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (currentCell !== '' || currentRow.length > 0) {
                currentRow.push(currentCell);
                rows.push(currentRow);
                currentCell = '';
                currentRow = [];
            }
            if (char === '\r' && nextChar === '\n') i++;
        } else {
            currentCell += char;
        }
    }
    
    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    return rows;
}

async function migrateFollowups() {
    console.log('--- Iniciando Extração de Follow-ups da Agenda ---');
    
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`Arquivo não encontrado: ${CSV_PATH}`);
        return;
    }

    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const allRows = parseCSV(content);
    
    if (allRows.length < 2) {
        console.error('CSV vazio ou sem dados.');
        return;
    }

    const dataRows = allRows.slice(1);
    console.log(`📂 Total de linhas no CSV: ${dataRows.length}`);

    const followups = [];
    // Regex para pegar o número do orçamento: #123 ou apenas o número após ORÇAMENTO
    const regex = /\[FOLLOW-UP ORÇAMENTO #?(\d+)\]/i;

    dataRows.forEach(row => {
        if (row.length < 14) return;

        const title = row[1] || '';
        const description = row[13] || '';
        const combined = title + ' ' + description;

        const match = combined.match(regex);
        if (match) {
            const ped_in_codigo = parseInt(match[1]);
            
            // Mapeamento de Atividade para Tipo de Follow-up
            const actOld = row[9]?.trim().toUpperCase();
            const actMap = {
                'EMAIL': 'E-mail',
                'VISITA': 'Visita',
                'TELEFONEMA': 'Telefonema',
                'COMPROMISSO': 'Agenda',
                'WHATSAPP': 'WhatsApp'
            };
            const tipo = actMap[actOld] || 'Agenda';

            followups.push({
                org_in_codigo: 10, // Default para Org 10 (conforme padrão visto no pipeline)
                ser_st_codigo: 'OV', // Default para Série OV
                ped_in_codigo: ped_in_codigo,
                tipo: tipo,
                descricao: description || title,
                data_contato: row[5] + ' ' + (row[7] || '00:00:00'),
                created_at: row[18]
            });
        }
    });

    console.log(`✅ Follow-ups identificados com número de pedido: ${followups.length}`);

    if (followups.length === 0) {
        console.log('Nenhum follow-up encontrado para vincular.');
        return;
    }

    const batchSize = 50;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < followups.length; i += batchSize) {
        const batch = followups.slice(i, i + batchSize);
        // Usando insert (followups não costumam ter ID único no CSV de origem para a tabela destino)
        const { error } = await supabase.from('crm_followup').insert(batch);

        if (error) {
            console.error(`❌ Erro no lote ${i / batchSize + 1}:`, error.message);
            errors++;
        } else {
            imported += batch.length;
            process.stdout.write(`\r⏳ Importados: ${imported}/${followups.length}`);
        }
    }

    console.log(`\n\n🎉 Extração de Follow-ups concluída!`);
    console.log(`   ✅ Sucesso: ${imported} registros vinculados a orçamentos.`);
    if (errors > 0) console.log(`   ❌ Lotes com erro: ${errors}`);
}

migrateFollowups().catch(console.error);
