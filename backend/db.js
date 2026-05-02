const oracledb = require('oracledb');

// Caminho para o Oracle Instant Client extraído
const instantClientPath = 'C:\\oracle\\instantclient'; 

try {
  oracledb.initOracleClient({ libDir: instantClientPath });
  console.log("Oracle Instant Client inicializado (Thick Mode).");
} catch (err) {
  console.error("Erro ao inicializar o Oracle Instant Client:");
  console.error(err.message);
  process.exit(1);
}

// Configuração para evitar erro de truncamento de fetch em dados maiores (DPI-1037/ORA-01406)
oracledb.fetchAsString = [oracledb.CLOB];

async function getPedidos({ startDate, endDate, filial, status, representante }) {
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
                 AND PE.PED_IN_CODIGO = P.PED_IN_CODIGO) AS PED_DT_ENTREGA
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
      sql += ` AND P.REP_IN_CODIGO = :representante`;
      binds.representante = parseInt(representante, 10);
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

module.exports = { getPedidos, getRepresentantes, getItensPedido };
