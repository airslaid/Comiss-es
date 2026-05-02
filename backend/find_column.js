const oracledb = require('oracledb');
const instantClientPath = 'C:\\oracle\\instantclient'; 
try {
  oracledb.initOracleClient({ libDir: instantClientPath });
} catch (err) {}

async function findTables() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    const sql = `
      SELECT DISTINCT table_name, column_name 
      FROM all_tab_columns 
      WHERE column_name LIKE '%ENTREGA%'
      AND table_name LIKE 'VEN_PEDIDO%'
    `;

    const result = await connection.execute(sql);
    console.log("Tabelas que possuem a coluna PED_DT_ENTREGA:");
    console.log(result.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

findTables();
