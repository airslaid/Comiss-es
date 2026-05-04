const oracledb = require('oracledb');

// Caminho para o Oracle Instant Client extraído
const instantClientPath = 'C:\\oracle\\instantclient'; 

try {
  oracledb.initOracleClient({ libDir: instantClientPath });
  console.log("Oracle Instant Client inicializado (Thick Mode).");
} catch (err) {
  console.warn("Oracle Instant Client não pôde ser inicializado. Usando Thin Mode nativo.");
  console.warn(err.message);
}

// Configuração para evitar erro de truncamento de fetch em dados maiores (DPI-1037/ORA-01406)
oracledb.fetchAsString = [oracledb.CLOB];

async function getPedidos({ startDate, endDate, filial, status, representante, ids }) {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    let sql = `
      SELECT P.ORG_IN_CODIGO,
             P.FIL_IN_CODIGO,
             P.SER_ST_CODIGO,
             P.PED_IN_CODIGO,
             P.CLI_IN_CODIGO,
             A.AGN_ST_NOME AS CLIENTE_NOME,
             A.AGN_ST_CGC AS CLIENTE_CNPJ,
             P.TPD_IN_CODIGO,
             P.PED_DT_EMISSAO,
             P.PED_CH_SITUACAO,
             P.REP_IN_CODIGO,
             R.AGN_ST_NOME AS REP_NOME,
             P.PED_RE_VLMERCADORIA,
             P.PED_RE_VALORTOTAL,
             (SELECT MIN(IPE_DT_DATAENTREGA) 
                FROM MEGA.VEN_PEDPROGENTREGA@AIR PE 
               WHERE PE.ORG_IN_CODIGO = P.ORG_IN_CODIGO 
                 AND PE.SER_ST_CODIGO = P.SER_ST_CODIGO 
                 AND PE.PED_IN_CODIGO = P.PED_IN_CODIGO) AS PED_DT_ENTREGA,
             (SELECT LISTAGG(NF.NOT_IN_NUMERO, ', ') WITHIN GROUP (ORDER BY NF.NOT_IN_NUMERO)
                FROM (SELECT DISTINCT NF_NOT_IN_CODIGO, PE_ORG_IN_CODIGO, PE_SER_ST_CODIGO, PE_PED_IN_CODIGO FROM MEGA.VEN_ITEMPEDI_VEN_ITEMNOT@AIR) M
                JOIN MEGA.VEN_NOTAFISCAL@AIR NF ON NF.NOT_IN_CODIGO = M.NF_NOT_IN_CODIGO
               WHERE M.PE_ORG_IN_CODIGO = P.ORG_IN_CODIGO
                 AND M.PE_SER_ST_CODIGO = P.SER_ST_CODIGO
                 AND M.PE_PED_IN_CODIGO = P.PED_IN_CODIGO) AS NOTAS_FISCAIS,
             (SELECT LISTAGG(TO_CHAR(NF.NOT_DT_EMISSAO, 'DD/MM/YYYY'), ', ') WITHIN GROUP (ORDER BY NF.NOT_DT_EMISSAO)
                FROM (SELECT DISTINCT NF_NOT_IN_CODIGO, PE_ORG_IN_CODIGO, PE_SER_ST_CODIGO, PE_PED_IN_CODIGO FROM MEGA.VEN_ITEMPEDI_VEN_ITEMNOT@AIR) M
                JOIN MEGA.VEN_NOTAFISCAL@AIR NF ON NF.NOT_IN_CODIGO = M.NF_NOT_IN_CODIGO
               WHERE M.PE_ORG_IN_CODIGO = P.ORG_IN_CODIGO
                 AND M.PE_SER_ST_CODIGO = P.SER_ST_CODIGO
                 AND M.PE_PED_IN_CODIGO = P.PED_IN_CODIGO) AS DATAS_FATURAMENTO
        FROM MEGA.VEN_PEDIDOVENDA@AIR P
   LEFT JOIN MEGA.GLO_AGENTES@AIR A 
          ON A.AGN_TAB_IN_CODIGO = P.CLI_TAB_IN_CODIGO
         AND A.AGN_PAD_IN_CODIGO = P.CLI_PAD_IN_CODIGO
         AND A.AGN_IN_CODIGO = P.CLI_IN_CODIGO
   LEFT JOIN MEGA.GLO_AGENTES@AIR R 
          ON R.AGN_IN_CODIGO = P.REP_IN_CODIGO
       WHERE P.ORG_IN_CODIGO IN (10, 20) 
         AND P.SER_ST_CODIGO IN ('OV', 'PD', 'DV')
    `;

    const binds = {};

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Filtrar por uma lista de códigos de pedido
      // Como o Oracle tem limite de 1000 elementos no IN, vamos ser cuidadosos, mas aqui deve ser de boa
      const idPlaceholders = ids.map((id, index) => `:id${index}`).join(', ');
      sql += ` AND P.PED_IN_CODIGO IN (${idPlaceholders})`;
      ids.forEach((id, index) => {
        binds[`id${index}`] = parseInt(id, 10);
      });
    }

    if (filial && filial !== 'ALL') {
      sql += ` AND P.FIL_IN_CODIGO = :filial`;
      binds.filial = parseInt(filial, 10);
    }

    if (status && status !== 'ALL') {
      if (status === 'AP') {
        sql += ` AND P.PED_CH_SITUACAO IN ('A', 'P')`;
      } else {
        sql += ` AND P.PED_CH_SITUACAO = :status`;
        binds.status = status;
      }
    }

    if (representante) {
      const repIds = representante.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      if (repIds.length > 0) {
        if (repIds.length === 1) {
          sql += ` AND P.REP_IN_CODIGO = :representante`;
          binds.representante = repIds[0];
        } else {
          const repPlaceholders = repIds.map((id, index) => `:rep${index}`).join(', ');
          sql += ` AND P.REP_IN_CODIGO IN (${repPlaceholders})`;
          repIds.forEach((id, index) => {
            binds[`rep${index}`] = id;
          });
        }
      }
    }

    // Usamos TO_DATE para garantir a comparação correta no Oracle
    if (startDate && endDate) {
      sql += ` AND P.PED_DT_EMISSAO BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD')`;
      binds.startDate = startDate;
      binds.endDate = endDate;
    }

    // Ordenar do mais recente para o mais antigo
    sql += ` ORDER BY P.PED_DT_EMISSAO DESC, P.PED_IN_CODIGO DESC`;

    const result = await connection.execute(
      sql,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    return result.rows;

  } catch (err) {
    console.error("Erro no db.js ao buscar pedidos:", err.message);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

async function getRepresentantes() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    let sql = `
      SELECT DISTINCT P.REP_IN_CODIGO AS CODIGO, R.AGN_ST_NOME AS NOME
        FROM MEGA.VEN_PEDIDOVENDA@AIR P
        JOIN MEGA.GLO_AGENTES@AIR R ON R.AGN_IN_CODIGO = P.REP_IN_CODIGO
       WHERE P.ORG_IN_CODIGO IN (10, 20)
         AND P.SER_ST_CODIGO IN ('OV', 'PD', 'DV')
         AND R.AGN_ST_NOME IS NOT NULL
       ORDER BY R.AGN_ST_NOME
    `;

    const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } catch (err) {
    console.error("Erro ao buscar representantes:", err.message);
    throw err;
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
}

async function getItensPedido(org, ser, ped) {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    const sql = `
      SELECT I.ITP_IN_SEQUENCIA as "SEQUENCIA",
             I.PRO_IN_CODIGO as "PRODUTO_COD",
             P.PRO_ST_ALTERNATIVO as "PRODUTO_COD_ALT",
             I.ITP_ST_DESCRICAO as "DESCRICAO",
             I.ITP_ST_COMPLEMENTO as "COMPLEMENTO",
             I.ITP_RE_QUANTIDADE as "QUANTIDADE",
             I.UNI_ST_UNIDADE as "UNIDADE",
             I.ITP_RE_VALORUNITARIO as "VALOR_UNITARIO",
             I.ITP_RE_VALORTOTAL as "VALOR_TOTAL",
             I.ITP_RE_VALORMERCADORIA as "VALOR_MERCADORIA"
      FROM MEGA.ven_itempedidovenda@AIR I
      LEFT JOIN MEGA.est_produtos@AIR P 
        ON P.PRO_TAB_IN_CODIGO = I.PRO_TAB_IN_CODIGO
       AND P.PRO_PAD_IN_CODIGO = I.PRO_PAD_IN_CODIGO
       AND P.PRO_IN_CODIGO = I.PRO_IN_CODIGO
      WHERE I.ORG_IN_CODIGO = :org
        AND I.SER_ST_CODIGO = :ser
        AND I.PED_IN_CODIGO = :ped
      ORDER BY I.ITP_IN_SEQUENCIA
    `;

    const result = await connection.execute(sql, { org, ser, ped }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } catch (err) {
    console.error("Erro no Banco (getItensPedido):", err);
    throw err;
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
}

async function getFaturamentos({ startDate, endDate, filial, representante }) {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    let sql = `
      SELECT N.ORG_IN_CODIGO,
             N.NOT_IN_CODIGO,
             N.FIL_IN_CODIGO,
             N.SER_ST_CODIGO,
             N.NOT_IN_NUMERO,
             N.NOT_DT_EMISSAO,
             N.NOT_CH_SITUACAO,
             N.NOT_ST_CHAVEACESSO,
             N.REP_IN_CODIGO,
             R.AGN_ST_NOME AS REP_NOME,
             N.AGN_IN_CODIGO,
             A.AGN_ST_NOME AS CLIENTE_NOME,
             N.NOT_RE_VALORMERCADORIA,
             N.NOT_RE_VALORTOTAL,
             (SELECT LISTAGG(M.PE_PED_IN_CODIGO, ', ') WITHIN GROUP (ORDER BY M.PE_PED_IN_CODIGO)
                FROM (SELECT DISTINCT NF_NOT_IN_CODIGO, PE_PED_IN_CODIGO FROM MEGA.VEN_ITEMPEDI_VEN_ITEMNOT@AIR) M
               WHERE M.NF_NOT_IN_CODIGO = N.NOT_IN_CODIGO) AS PEDIDOS,
             (SELECT LISTAGG(TO_CHAR(PV.PED_DT_EMISSAO, 'DD/MM/YYYY'), ', ') WITHIN GROUP (ORDER BY PV.PED_DT_EMISSAO)
                FROM (SELECT DISTINCT NF_NOT_IN_CODIGO, PE_ORG_IN_CODIGO, PE_SER_ST_CODIGO, PE_PED_IN_CODIGO FROM MEGA.VEN_ITEMPEDI_VEN_ITEMNOT@AIR) M
                JOIN MEGA.VEN_PEDIDOVENDA@AIR PV 
                  ON PV.ORG_IN_CODIGO = M.PE_ORG_IN_CODIGO 
                 AND PV.SER_ST_CODIGO = M.PE_SER_ST_CODIGO 
                 AND PV.PED_IN_CODIGO = M.PE_PED_IN_CODIGO
               WHERE M.NF_NOT_IN_CODIGO = N.NOT_IN_CODIGO) AS PEDIDOS_DATAS
        FROM MEGA.VEN_NOTAFISCAL@AIR N
   LEFT JOIN MEGA.GLO_AGENTES@AIR A 
          ON A.AGN_TAB_IN_CODIGO = N.AGN_TAB_IN_CODIGO
         AND A.AGN_PAD_IN_CODIGO = N.AGN_PAD_IN_CODIGO
         AND A.AGN_IN_CODIGO = N.AGN_IN_CODIGO
   LEFT JOIN MEGA.GLO_AGENTES@AIR R 
          ON R.AGN_IN_CODIGO = N.REP_IN_CODIGO
       WHERE N.REP_IN_CODIGO IS NOT NULL
         AND N.ORG_IN_CODIGO IN (10, 20)
         AND N.TPD_IN_CODIGO <> 303
         AND N.NOT_CH_SITUACAO <> 'C'
         AND (
             NOT EXISTS (SELECT 1 FROM MEGA.VEN_ITEMPEDI_VEN_ITEMNOT@AIR M WHERE M.NF_NOT_IN_CODIGO = N.NOT_IN_CODIGO)
             OR 
             EXISTS (
                 SELECT 1 FROM MEGA.VEN_ITEMPEDI_VEN_ITEMNOT@AIR M
                 WHERE M.NF_NOT_IN_CODIGO = N.NOT_IN_CODIGO
                   AND M.PE_SER_ST_CODIGO <> 'DV'
             )
         )
    `;

    const binds = {};

    if (filial && filial !== 'ALL') {
      sql += ` AND N.FIL_IN_CODIGO = :filial`;
      binds.filial = parseInt(filial, 10);
    }

    if (representante) {
      const repIds = representante.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      if (repIds.length > 0) {
        if (repIds.length === 1) {
          sql += ` AND N.REP_IN_CODIGO = :representante`;
          binds.representante = repIds[0];
        } else {
          const repPlaceholders = repIds.map((id, index) => `:rep${index}`).join(', ');
          sql += ` AND N.REP_IN_CODIGO IN (${repPlaceholders})`;
          repIds.forEach((id, index) => {
            binds[`rep${index}`] = id;
          });
        }
      }
    }

    if (startDate && endDate) {
      sql += ` AND N.NOT_DT_EMISSAO BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD')`;
      binds.startDate = startDate;
      binds.endDate = endDate;
    }

    sql += ` ORDER BY N.NOT_DT_EMISSAO DESC, N.NOT_IN_NUMERO DESC`;

    const result = await connection.execute(
      sql,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    return result.rows;

  } catch (err) {
    console.error("Erro no db.js ao buscar faturamentos:", err.message);
    throw err;
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
}

async function getItensFaturamento(org, not_id) {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    const sql = `
      SELECT I.ITN_IN_SEQUENCIA as "SEQUENCIA",
             I.PRO_IN_CODIGO as "PRODUTO_COD",
             P.PRO_ST_ALTERNATIVO as "PRODUTO_COD_ALT",
             I.ITN_ST_DESCRICAO as "DESCRICAO",
             I.ITN_ST_COMPLEMENTO as "COMPLEMENTO",
             I.ITN_RE_QUANTIDADE as "QUANTIDADE",
             I.UNI_ST_UNIDADE as "UNIDADE",
             I.ITN_RE_VALORUNITARIO as "VALOR_UNITARIO",
             I.ITN_RE_VALORTOTAL as "VALOR_TOTAL",
             I.ITN_RE_VALORMERCADORIA as "VALOR_MERCADORIA"
      FROM MEGA.VEN_ITEMNOTAFISCAL@AIR I
      LEFT JOIN MEGA.EST_PRODUTOS@AIR P 
        ON P.PRO_TAB_IN_CODIGO = I.PRO_TAB_IN_CODIGO
       AND P.PRO_PAD_IN_CODIGO = I.PRO_PAD_IN_CODIGO
       AND P.PRO_IN_CODIGO = I.PRO_IN_CODIGO
      WHERE I.ORG_IN_CODIGO = :org
        AND I.NOT_IN_CODIGO = :not_id
      ORDER BY I.ITN_IN_SEQUENCIA
    `;

    const result = await connection.execute(sql, { org, not_id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows;
  } catch (err) {
    console.error("Erro no Banco (getItensFaturamento):", err);
    throw err;
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
}

async function getClientes({ representante }) {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    let sql = `
      SELECT C.AGN_IN_CODIGO, 
             (SELECT TO_CHAR(SUBSTR(A.AGN_ST_NOME, 1, 50)) FROM MEGA.GLO_AGENTES@AIR A 
               WHERE A.AGN_TAB_IN_CODIGO = C.AGN_TAB_IN_CODIGO 
                 AND A.AGN_PAD_IN_CODIGO = C.AGN_PAD_IN_CODIGO 
                 AND A.AGN_IN_CODIGO = C.AGN_IN_CODIGO 
                 AND ROWNUM = 1) AS AGN_ST_NOME,
             (SELECT TO_CHAR(SUBSTR(A.AGN_ST_CGC, 1, 20)) FROM MEGA.GLO_AGENTES@AIR A 
               WHERE A.AGN_TAB_IN_CODIGO = C.AGN_TAB_IN_CODIGO 
                 AND A.AGN_PAD_IN_CODIGO = C.AGN_PAD_IN_CODIGO 
                 AND A.AGN_IN_CODIGO = C.AGN_IN_CODIGO 
                 AND ROWNUM = 1) AS AGN_ST_CGC,
             'UF' AS UF_ST_SIGLA
        FROM MEGA.GLO_CLIENTE@AIR C
       WHERE ROWNUM <= 100
    `;

    const binds = {};

    const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_ARRAY });
    
    return result.rows.map(row => ({
      AGN_IN_CODIGO: row[0] || 'N/A',
      AGN_ST_NOME: row[1] || 'NOME NÃO ENCONTRADO',
      AGN_ST_CGC: row[2] || '000',
      UF_ST_SIGLA: row[3] || 'UF'
    }));
  } catch (err) {
    console.error("Erro ao buscar clientes:", err.message);
    throw err;
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
}

module.exports = { getPedidos, getRepresentantes, getItensPedido, getFaturamentos, getItensFaturamento, getClientes };


