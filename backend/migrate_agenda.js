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

async function migrateAgenda() {
    console.log('--- Iniciando Migração de Agenda/Appointments ---');
    
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

    const header = allRows[0];
    const dataRows = allRows.slice(1);

    console.log(`📂 Total de linhas no CSV: ${dataRows.length}`);

    // Mapeamento de colunas baseado no header do CSV
    // id,title,client_id,client_name,rep_in_codigo,start_date,end_date,start_time,end_time,activity_type,priority,status,recurrence,description,location,req_confirmation,notify_email,hide_appointment,created_at,rep_nome,created_by_name,attachments,updated_at
    const records = dataRows.map(row => {
        if (row.length < 20) return null;

        // Mapeamento de Atividade
        const actOld = row[9]?.trim().toUpperCase();
        const actMap = {
            'EMAIL': 'E-mail',
            'VISITA': 'Visita',
            'TELEFONEMA': 'Telefonema',
            'COMPROMISSO': 'Compromisso',
            'REUNIAO': 'Compromisso',
            'WHATSAPP': 'WhatsApp',
            'VISITA TECNICA': 'Visita'
        };
        const atividade = actMap[actOld] || 'Compromisso';

        // Mapeamento de Prioridade
        const prioOld = row[10]?.trim().toUpperCase();
        const prioMap = {
            'ALTA': 'Alta',
            'MEDIA': 'Media',
            'BAIXA': 'Baixa',
            'CRITICA': 'Critica'
        };
        const prioridade = prioMap[prioOld] || 'Media';

        // Mapeamento de Status
        const statusOld = row[11]?.trim().toUpperCase();
        const statusMap = {
            'CONCLUIDO': 'CONCLUÍDO',
            'AGENDADO': 'AGENDADO'
        };
        const status = statusMap[statusOld] || 'AGENDADO';

        return {
            id: row[0],
            assunto: row[1]?.trim(),
            rep_in_codigo: row[4] ? parseInt(row[4]) : null,
            rep_nome: row[19]?.trim() || 'Desconhecido',
            data_inicio: row[5],
            hora_inicio: row[7],
            hora_termino: row[8],
            atividade: atividade,
            prioridade: prioridade,
            cliente_nome: row[3]?.trim(),
            local: row[14]?.trim(),
            descricao: row[13]?.trim(),
            status: status,
            created_at: row[18],
            criado_por: row[20]?.trim()
        };
    }).filter(r => r && r.assunto && r.rep_in_codigo);

    console.log(`✅ Registros válidos para importar: ${records.length}`);

    const batchSize = 50;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        // Usando upsert para evitar duplicados se rodar duas vezes
        const { error } = await supabase.from('crm_agenda').upsert(batch);

        if (error) {
            console.error(`❌ Erro no lote ${i / batchSize + 1}:`, error.message);
            errors++;
        } else {
            imported += batch.length;
            process.stdout.write(`\r⏳ Importados: ${imported}/${records.length}`);
        }
    }

    console.log(`\n\n🎉 Migração de Agenda concluída!`);
    console.log(`   ✅ Sucesso: ${imported} registros`);
    if (errors > 0) console.log(`   ❌ Lotes com erro: ${errors}`);
}

migrateAgenda().catch(console.error);
