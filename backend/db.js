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

async function getPedidos({ startDate, endDate, filial }) {
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
             P.TPD_IN_CODIGO,
             P.PED_DT_EMISSAO,
             P.PED_CH_SITUACAO,
             P.REP_IN_CODIGO,
             P.PED_RE_VLMERCADORIA,
             P.PED_RE_VALORTOTAL
        FROM MEGA.VEN_PEDIDOVENDA@AIR P
   LEFT JOIN MEGA.GLO_AGENTES@AIR A 
          ON A.AGN_TAB_IN_CODIGO = P.CLI_TAB_IN_CODIGO
         AND A.AGN_PAD_IN_CODIGO = P.CLI_PAD_IN_CODIGO
         AND A.AGN_IN_CODIGO = P.CLI_IN_CODIGO
       WHERE P.ORG_IN_CODIGO IN (10, 20) 
         AND P.SER_ST_CODIGO IN ('OV', 'PD', 'DV')
    `;

    const binds = {};

    if (filial && filial !== 'ALL') {
      sql += ` AND P.FIL_IN_CODIGO = :filial`;
      binds.filial = parseInt(filial, 10);
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

module.exports = { getPedidos };
