const oracledb = require('oracledb');
require('dotenv').config({ path: '../.env' });

// Caminho para o Oracle Instant Client
const instantClientPath = 'C:\\oracle\\instantclient'; 
try {
  oracledb.initOracleClient({ libDir: instantClientPath });
} catch (err) {
  console.error(err);
}

async function checkColumns() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    const sql = `
      SELECT column_name, data_type 
      FROM all_tab_columns 
      WHERE table_name = 'VEN_PEDIDOVENDA' 
      AND owner = 'MEGA'
      ORDER BY column_name
    `;

    const result = await connection.execute(sql);
    console.log("Colunas da tabela VEN_PEDIDOVENDA:");
    result.rows.forEach(row => {
      console.log(row[0]);
    });

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkColumns();
