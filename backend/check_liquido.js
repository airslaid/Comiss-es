const oracledb = require('oracledb');
const instantClientPath = 'C:\\oracle\\instantclient'; 
try { oracledb.initOracleClient({ libDir: instantClientPath }); } catch (err) {}

async function check() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    const sql = `
      SELECT column_name 
      FROM all_tab_columns@AIR 
      WHERE table_name = 'VEN_PEDIDOITEM' 
      AND (column_name LIKE '%LIQUIDO%' OR column_name LIKE '%VALOR%')
    `;

    const result = await connection.execute(sql);
    console.log(result.rows);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}
check();
