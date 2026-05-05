require('dotenv').config();
const fs = require('fs');
const { supabase } = require('./supabase');

const CSV_PATH = 'C:\\Users\\ti\\Downloads\\crm_tasks_rows (3).csv';

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
            i++; // Pula o próximo "
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
            if (char === '\r' && nextChar === '\n') i++; // Pula \n se for \r\n
        } else {
            currentCell += char;
        }
    }
    
    // Adiciona a última célula/linha se existir
    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    return rows;
}

async function migrateTasks() {
    console.log('--- Iniciando Migração de Tarefas ---');
    
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
    // id,title,description,client_id,client_name,rep_in_codigo,rep_nome,created_by_id,created_by_name,created_at,status,completed_at,priority,due_date
    const records = dataRows.map(row => {
        if (row.length < 14) return null;

        // Mapeamento de Status
        const statusOld = row[10]?.trim().toUpperCase();
        const statusMap = {
            'CONCLUIDA': 'Concluida',
            'PENDENTE': 'Pendente'
        };
        const status = statusMap[statusOld] || 'Pendente';

        // Mapeamento de Prioridade
        const prioOld = row[12]?.trim().toUpperCase();
        const prioMap = {
            'ALTA': 'Alta',
            'MEDIA': 'Media',
            'BAIXA': 'Baixa'
        };
        const prioridade = prioMap[prioOld] || 'Media';

        return {
            titulo: row[1]?.trim(),
            descricao: row[2]?.trim(),
            rep_codigo: row[5] ? parseInt(row[5]) : null,
            rep_nome: row[6]?.trim(),
            cliente_nome: row[4]?.trim(),
            status: status,
            prioridade: prioridade,
            vencimento: row[13]?.trim() || null,
            criado_por: row[8]?.trim(),
        };
    }).filter(r => r && r.titulo);

    console.log(`✅ Registros válidos para importar: ${records.length}`);

    const batchSize = 50;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase.from('crm_tarefas').insert(batch);

        if (error) {
            console.error(`❌ Erro no lote ${i / batchSize + 1}:`, error.message);
            errors++;
        } else {
            imported += batch.length;
            process.stdout.write(`\r⏳ Importados: ${imported}/${records.length}`);
        }
    }

    console.log(`\n\n🎉 Migração concluída!`);
    console.log(`   ✅ Sucesso: ${imported} registros`);
    if (errors > 0) console.log(`   ❌ Lotes com erro: ${errors}`);
}

migrateTasks().catch(console.error);
