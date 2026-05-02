require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getPedidos, getRepresentantes, getItensPedido } = require('./db');
const supabase = require('./supabase');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/pedidos', async (req, res) => {
  try {
    const { startDate, endDate, filial, status, representante } = req.query;
    const pedidos = await getPedidos({ startDate, endDate, filial, status, representante });
    res.json(pedidos);
  } catch (error) {
    console.error("Erro na rota /api/pedidos:", error);
    res.status(500).json({ error: "Erro interno no servidor ao buscar pedidos." });
  }
});

app.get('/api/representantes', async (req, res) => {
  try {
    const representantes = await getRepresentantes();
    res.json(representantes);
  } catch (error) {
    console.error("Erro na rota /api/representantes:", error);
    res.status(500).json({ error: "Erro interno no servidor ao buscar representantes." });
  }
});

app.get('/api/metas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('crm_metas')
      .select('*')
      .order('mes_ano', { ascending: false })
      .order('rep_nome', { ascending: true });
      
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Erro na rota GET /api/metas:", error);
    res.status(500).json({ error: "Erro ao buscar metas." });
  }
});

app.post('/api/metas', async (req, res) => {
  try {
    const { rep_in_codigo, rep_nome, mes_ano, valor_meta } = req.body;
    
    const { data: existing, error: searchError } = await supabase
      .from('crm_metas')
      .select('id')
      .eq('rep_in_codigo', rep_in_codigo)
      .eq('mes_ano', mes_ano)
      .maybeSingle();

    if (searchError) throw searchError;

    let result;
    if (existing) {
      result = await supabase
        .from('crm_metas')
        .update({ valor_meta, rep_nome })
        .eq('id', existing.id);
    } else {
      result = await supabase
        .from('crm_metas')
        .insert([{ rep_in_codigo, rep_nome, mes_ano, valor_meta }]);
    }

    if (result.error) throw result.error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota POST /api/metas:", error);
    res.status(500).json({ error: "Erro ao salvar meta." });
  }
});

app.delete('/api/metas/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('crm_metas')
      .delete()
      .eq('id', req.params.id);
      
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota DELETE /api/metas/:id:", error);
    res.status(500).json({ error: "Erro ao excluir meta." });
  }
});

// --- CRM Pipeline ---
app.get('/api/crm/pipeline', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('crm_pipeline')
      .select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Erro na rota GET /api/crm/pipeline:", error);
    res.status(500).json({ error: "Erro ao buscar pipeline." });
  }
});

app.post('/api/crm/pipeline', async (req, res) => {
  try {
    const { org_in_codigo, ser_st_codigo, ped_in_codigo, stage } = req.body;
    
    const { data, error } = await supabase
      .from('crm_pipeline')
      .upsert(
        { org_in_codigo, ser_st_codigo, ped_in_codigo, stage, updated_at: new Date() },
        { onConflict: 'org_in_codigo,ser_st_codigo,ped_in_codigo' }
      );

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota POST /api/crm/pipeline:", error);
    res.status(500).json({ error: "Erro ao salvar estágio do pipeline." });
  }
});

app.get('/api/pedidos/:org/:ser/:ped/itens', async (req, res) => {
  try {
    const org = parseInt(req.params.org);
    const ser = req.params.ser;
    const ped = parseInt(req.params.ped);
    console.log(`[ITENS] Buscando itens: org=${org}, ser=${ser}, ped=${ped}`);
    const itens = await getItensPedido(org, ser, ped);
    console.log(`[ITENS] Retornando ${itens.length} itens`);
    res.json(itens);
  } catch (error) {
    console.error("Erro na rota /api/pedidos/:org/:ser/:ped/itens:", error);
    res.status(500).json({ error: "Erro interno no servidor ao buscar itens do pedido." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
