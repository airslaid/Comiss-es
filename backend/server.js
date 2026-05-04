require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getPedidos, getRepresentantes, getItensPedido, getFaturamentos, getItensFaturamento, getClientes, getAtingimentoMensal } = require('./db');
const { supabase, supabaseAdmin } = require('./supabase');

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
    res.status(500).json({ error: `Erro no banco de dados: ${error.message}` });
  }
});

app.get('/api/representantes', async (req, res) => {
  try {
    const representantes = await getRepresentantes();
    res.json(representantes);
  } catch (error) {
    console.error("Erro na rota /api/representantes:", error);
  }
});

app.get('/api/clientes', async (req, res) => {
  try {
    const { representante } = req.query;
    let clientes = await getClientes({ representante });
    
    // DEBUG: Se não trouxer nada, envia um registro fake para sabermos se a API respondeu
    if (!clientes || clientes.length === 0) {
      clientes = [{
        AGN_IN_CODIGO: 9999,
        AGN_ST_NOME: "TESTE DE CONEXAO (API OK, SQL VAZIO)",
        AGN_ST_CGC: "00.000.000/0001-00",
        AGN_ST_MUNICIPIO: "DEBUG",
        UF_ST_SIGLA: "DB",
        AGN_ST_EMAIL: "teste@teste.com",
        AGN_ST_TELEFONE: "(00) 0000-0000"
      }];
    }
    
    res.json(clientes);
  } catch (error) {
    console.error("Erro na rota /api/clientes:", error);
    res.status(500).json({ error: `Erro no banco de dados: ${error.message}` });
  }
});

app.get('/api/faturamentos', async (req, res) => {
  try {
    const { startDate, endDate, filial, representante } = req.query;
    const faturamentos = await getFaturamentos({ startDate, endDate, filial, representante });
    res.json(faturamentos);
  } catch (error) {
    console.error("Erro na rota /api/faturamentos:", error);
    res.status(500).json({ error: `Erro no banco de dados: ${error.message}` });
  }
});

app.get('/api/comissoes/atingimento', async (req, res) => {
  try {
    const atingimentos = await getAtingimentoMensal();
    res.json(atingimentos);
  } catch (error) {
    console.error("Erro na rota /api/comissoes/atingimento:", error);
    res.status(500).json({ error: `Erro no banco de dados: ${error.message}` });
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

app.patch('/api/crm/pipeline/hot-lead', async (req, res) => {
  try {
    const { org_in_codigo, ser_st_codigo, ped_in_codigo, hot_lead } = req.body;

    const { error } = await supabase
      .from('crm_pipeline')
      .upsert(
        { org_in_codigo, ser_st_codigo, ped_in_codigo, hot_lead, updated_at: new Date() },
        { onConflict: 'org_in_codigo,ser_st_codigo,ped_in_codigo' }
      );

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota PATCH /api/crm/pipeline/hot-lead:", error);
    res.status(500).json({ error: "Erro ao atualizar lead quente." });
  }
});

// --- Gestão de Usuários (Auth Admin) ---
app.post('/api/auth/create-user', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Configuração do Supabase Admin ausente (SERVICE_ROLE_KEY)." });
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar automaticamente
      user_metadata: { name: name || '' }
    });

    if (error) throw error;

    // Criar permissão inicial para o usuário
    const { error: permError } = await supabaseAdmin
      .from('user_permissions')
      .insert({ 
        user_id: data.user.id, 
        role: 'USER', 
        allowed_modules: ['all'] // Visão Geral por padrão
      });

    if (permError) console.error("Erro ao criar permissão inicial:", permError);

    res.json({ success: true, user: data.user });
  } catch (error) {
    console.error("Erro na rota POST /api/auth/create-user:", error);
    res.status(500).json({ error: error.message || "Erro ao criar usuário." });
  }
});

app.get('/api/auth/users', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Configuração do Supabase Admin ausente." });
    }

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    res.json(users);
  } catch (error) {
    console.error("Erro na rota GET /api/auth/users:", error);
    res.status(500).json({ error: "Erro ao listar usuários." });
  }
});

app.patch('/api/auth/users/:id', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Configuração do Supabase Admin ausente." });
    }

    const { id } = req.params;
    const { password, name } = req.body;

    const updatePayload = {};
    if (password) updatePayload.password = password;
    if (name !== undefined) updatePayload.user_metadata = { name };

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota PATCH /api/auth/users/:id:", error);
    res.status(500).json({ error: error.message || "Erro ao atualizar usuário." });
  }
});

// --- Gestão de Permissões ---
app.get('/api/auth/permissions', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin ausente." });

    const { data, error } = await supabaseAdmin
      .from('user_permissions')
      .select('*');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Erro na rota GET /api/auth/permissions:", error);
    res.status(500).json({ error: "Erro ao buscar permissões." });
  }
});

app.get('/api/auth/permissions/:id', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin ausente." });

    const { data, error } = await supabaseAdmin
      .from('user_permissions')
      .select('*')
      .eq('user_id', req.params.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignora erro de não encontrado
    
    res.json(data || { role: 'USER', allowed_modules: ['all'] });
  } catch (error) {
    console.error("Erro na rota GET /api/auth/permissions/:id:", error);
    res.status(500).json({ error: "Erro ao buscar permissão do usuário." });
  }
});

app.post('/api/auth/permissions', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin ausente." });

    const { user_id, role, allowed_modules, linked_reps } = req.body;

    const { data, error } = await supabaseAdmin
      .from('user_permissions')
      .upsert({ user_id, role, allowed_modules, linked_reps }, { onConflict: 'user_id' });

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota POST /api/auth/permissions:", error);
    res.status(500).json({ error: error.message || "Erro ao salvar permissões." });
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
  }
});

app.get('/api/faturamentos/:org/:id/itens', async (req, res) => {
  try {
    const org = parseInt(req.params.org);
    const id = parseInt(req.params.id);
    console.log(`[ITENS_FAT] Buscando itens NF: org=${org}, id=${id}`);
    const itens = await getItensFaturamento(org, id);
    res.json(itens);
  } catch (error) {
    console.error("Erro na rota /api/faturamentos/:org/:id/itens:", error);
    res.status(500).json({ error: "Erro interno no servidor ao buscar itens da nota fiscal." });
  }
});

// --- CRM Follow Up ---
app.get('/api/crm/followup/:org/:ser/:ped', async (req, res) => {
  try {
    const { org, ser, ped } = req.params;
    const { data, error } = await supabase
      .from('crm_followup')
      .select('*')
      .eq('org_in_codigo', parseInt(org))
      .eq('ser_st_codigo', ser)
      .eq('ped_in_codigo', parseInt(ped))
      .order('data_contato', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Erro na rota GET /api/crm/followup:", error);
    res.status(500).json({ error: "Erro ao buscar follow ups." });
  }
});

app.post('/api/crm/followup', async (req, res) => {
  try {
    const { org_in_codigo, ser_st_codigo, ped_in_codigo, tipo, descricao } = req.body;
    const { data, error } = await supabase
      .from('crm_followup')
      .insert([{ 
        org_in_codigo: parseInt(org_in_codigo), 
        ser_st_codigo, 
        ped_in_codigo: parseInt(ped_in_codigo), 
        tipo, 
        descricao,
        data_contato: new Date()
      }]);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota POST /api/crm/followup:", error);
    res.status(500).json({ error: "Erro ao salvar follow up." });
  }
});

app.put('/api/crm/followup/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, descricao } = req.body;
    const { error } = await supabase
      .from('crm_followup')
      .update({ tipo, descricao })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota PUT /api/crm/followup:", error);
    res.status(500).json({ error: "Erro ao editar follow up." });
  }
});

app.delete('/api/crm/followup/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('crm_followup')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota DELETE /api/crm/followup:", error);
    res.status(500).json({ error: "Erro ao excluir follow up." });
  }
});

app.get('/api/crm/followup/all', async (req, res) => {
  try {
    // 1. Buscar todos os follow ups do Supabase
    const { data: followUps, error } = await supabase
      .from('crm_followup')
      .select('*')
      .order('data_contato', { ascending: false });

    if (error) throw error;
    if (!followUps || followUps.length === 0) return res.json([]);

    // 2. Extrair códigos de pedidos únicos para buscar detalhes no Oracle
    const uniquePedIds = [...new Set(followUps.map(f => f.ped_in_codigo))];

    // 3. Buscar detalhes dos pedidos no Oracle
    const { getPedidos } = require('./db');
    const pedidosInfo = await getPedidos({ ids: uniquePedIds });

    // 4. Mapear as informações do Oracle para os follow ups
    const result = followUps.map(f => {
      const info = pedidosInfo.find(p => p.PED_IN_CODIGO === f.ped_in_codigo);
      return {
        ...f,
        CLIENTE_NOME: info ? info.CLIENTE_NOME : 'Não encontrado',
        REP_NOME: info ? info.REP_NOME : 'N/A',
        SER_ST_CODIGO: info ? info.SER_ST_CODIGO : f.ser_st_codigo
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Erro na rota GET /api/crm/followup/all:", error);
    res.status(500).json({ error: "Erro ao buscar histórico de follow ups." });
  }
});

// --- CRM Agenda ---
app.get('/api/crm/agenda', async (req, res) => {
  try {
    const { startDate, endDate, representante, atividade } = req.query;
    
    let query = supabase.from('crm_agenda').select('*');

    if (startDate && endDate) {
      query = query.gte('data_inicio', startDate).lte('data_inicio', endDate);
    }

    if (representante && representante !== 'ALL') {
      const repIds = representante.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      if (repIds.length > 0) {
        query = query.in('rep_in_codigo', repIds);
      }
    }

    if (atividade && atividade !== 'Todas Atividades' && atividade !== 'TODAS') {
      query = query.eq('atividade', atividade);
    }

    query = query.order('data_inicio', { ascending: true }).order('hora_inicio', { ascending: true });

    const { data, error } = await query;
    
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Erro na rota GET /api/crm/agenda:", error);
    res.status(500).json({ error: "Erro ao buscar agenda." });
  }
});

app.post('/api/crm/agenda', async (req, res) => {
  try {
    const { rep_in_codigo, rep_nome, assunto, data_inicio, hora_inicio, hora_termino, atividade, prioridade, cliente_nome, local, descricao, criado_por } = req.body;
    
    const { data, error } = await supabase
      .from('crm_agenda')
      .insert([{ 
        rep_in_codigo: parseInt(rep_in_codigo), 
        rep_nome, 
        assunto, 
        data_inicio, 
        hora_inicio, 
        hora_termino, 
        atividade, 
        prioridade, 
        cliente_nome, 
        local, 
        descricao,
        criado_por
      }]);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota POST /api/crm/agenda:", error);
    res.status(500).json({ error: "Erro ao salvar compromisso na agenda." });
  }
});

app.put('/api/crm/agenda/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const { error } = await supabase
      .from('crm_agenda')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota PUT /api/crm/agenda/:id/status:", error);
    res.status(500).json({ error: "Erro ao atualizar status do compromisso." });
  }
});

app.put('/api/crm/agenda/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rep_in_codigo, rep_nome, assunto, data_inicio, hora_inicio, hora_termino, atividade, prioridade, cliente_nome, local, descricao } = req.body;

    const { error } = await supabase
      .from('crm_agenda')
      .update({ rep_in_codigo: parseInt(rep_in_codigo), rep_nome, assunto, data_inicio, hora_inicio, hora_termino, atividade, prioridade, cliente_nome, local, descricao })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota PUT /api/crm/agenda/:id:", error);
    res.status(500).json({ error: "Erro ao editar compromisso." });
  }
});

app.delete('/api/crm/agenda/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('crm_agenda')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota DELETE /api/crm/agenda/:id:", error);
    res.status(500).json({ error: "Erro ao excluir compromisso." });
  }
});

// --- CRM Tarefas ---
app.get('/api/crm/tarefas', async (req, res) => {
  try {
    const { representante, status } = req.query;
    let query = supabase.from('crm_tarefas').select('*');

    if (representante && representante !== 'ALL') {
      const reps = representante.split(',').map(r => parseInt(r));
      query = query.in('rep_codigo', reps);
    }
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    query = query.order('vencimento', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Erro na rota GET /api/crm/tarefas:", error);
    res.status(500).json({ error: "Erro ao buscar tarefas." });
  }
});

app.post('/api/crm/tarefas', async (req, res) => {
  try {
    const { titulo, descricao, rep_codigo, rep_nome, vencimento, cliente_nome, prioridade, status, criado_por } = req.body;
    
    const { error } = await supabase
      .from('crm_tarefas')
      .insert([{ 
        titulo, descricao, rep_codigo: rep_codigo ? parseInt(rep_codigo) : null, rep_nome, vencimento, cliente_nome, prioridade, status, criado_por
      }]);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota POST /api/crm/tarefas:", error);
    res.status(500).json({ error: "Erro ao salvar tarefa." });
  }
});

app.put('/api/crm/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, rep_codigo, rep_nome, vencimento, cliente_nome, prioridade, status } = req.body;

    const { error } = await supabase
      .from('crm_tarefas')
      .update({ titulo, descricao, rep_codigo: rep_codigo ? parseInt(rep_codigo) : null, rep_nome, vencimento, cliente_nome, prioridade, status, updated_at: new Date() })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota PUT /api/crm/tarefas/:id:", error);
    res.status(500).json({ error: "Erro ao atualizar tarefa." });
  }
});

app.delete('/api/crm/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('crm_tarefas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota DELETE /api/crm/tarefas/:id:", error);
    res.status(500).json({ error: "Erro ao excluir tarefa." });
  }
});


// --- Pagamentos de Comissões ---
app.get('/api/comissoes/pagamentos', async (req, res) => {
  try {
    const { mes_ano } = req.query;
    let query = supabase.from('crm_comissoes_pagamentos').select('*');
    
    if (mes_ano) {
      query = query.eq('mes_ano_referencia', mes_ano);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Erro na rota GET /api/comissoes/pagamentos:", error);
    res.status(500).json({ error: "Erro ao buscar pagamentos de comissões." });
  }
});

app.post('/api/comissoes/pagamentos/batch', async (req, res) => {
  try {
    const { items } = req.body; // Array de objetos de pagamento
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Nenhum item enviado para pagamento." });
    }

    const { data, error } = await supabase
      .from('crm_comissoes_pagamentos')
      .insert(items);

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: "Um ou mais pagamentos deste lote já foram registrados." });
      }
      throw error;
    }
    res.json({ success: true, count: items.length });
  } catch (error) {
    console.error("Erro na rota POST /api/comissoes/pagamentos/batch:", error);
    res.status(500).json({ error: "Erro ao registrar pagamentos em lote." });
  }
});

app.post('/api/comissoes/pagamentos', async (req, res) => {
  try {
    const { nf_numero, org_in_codigo, role, valor_comissao, mes_ano_referencia, rep_in_codigo, pago_por } = req.body;
    
    const { data, error } = await supabase
      .from('crm_comissoes_pagamentos')
      .insert([{ 
        nf_numero, 
        org_in_codigo, 
        role, 
        valor_comissao, 
        mes_ano_referencia, 
        rep_in_codigo, 
        pago_por 
      }]);

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: "Este pagamento já foi registrado anteriormente." });
      }
      throw error;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota POST /api/comissoes/pagamentos:", error);
    res.status(500).json({ error: "Erro ao registrar pagamento de comissão." });
  }
});

app.delete('/api/comissoes/pagamentos/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('crm_comissoes_pagamentos')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Erro na rota DELETE /api/comissoes/pagamentos/:id:", error);
    res.status(500).json({ error: "Erro ao excluir registro de pagamento." });
  }
});


if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}
module.exports = app;
