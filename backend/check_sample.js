const oracledb = require('oracledb');
const instantClientPath = 'C:\\oracle\\instantclient'; 
try {
  oracledb.initOracleClient({ libDir: instantClientPath });
} catch (err) {}

async function checkSample() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    const sql = `
      SELECT * 
      FROM MEGA.VEN_PEDIDOVENDA@AIR 
      WHERE ROWNUM = 1
    `;

    const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log("Todas as colunas encontradas:");
    Object.keys(result.rows[0]).sort().forEach(key => console.log(key));

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.close();
  }
}

checkSample();
