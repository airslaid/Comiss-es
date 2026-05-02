const oracledb = require('oracledb');
const instantClientPath = 'C:\\oracle\\instantclient'; 

try {
  oracledb.initOracleClient({ libDir: instantClientPath });
} catch (err) {}

async function test() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    const startDate = '2026-05-01';
    const endDate = '2026-05-31';

    console.log("Testando query com TO_DATE...");
    const sql = "SELECT SYSDATE FROM DUAL WHERE SYSDATE BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD')";
    const result = await connection.execute(sql, { startDate, endDate });
    console.log("Sucesso:", result.rows);

  } catch (err) {
    console.error("Erro no teste:", err);
  } finally {
    if (connection) await connection.close();
  }
}

test();
