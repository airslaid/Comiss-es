const oracledb = require('oracledb');

const instantClientPath = 'C:\\oracle\\instantclient'; 

try {
  oracledb.initOracleClient({ libDir: instantClientPath });
  console.log("Oracle Instant Client inicializado.");
} catch (err) {
  console.error("Erro ao inicializar o Oracle Instant Client:");
  console.error(err.message);
  process.exit(1);
}

async function testQuery() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "AIR",
      password      : "AsrFTT8SjK",
      connectString : "dbconnect.megaerp.online:4221/xepdb1"
    });

    console.log("Conectado ao Oracle.");

    const result = await connection.execute(
      `SELECT * FROM MEGA.ven_itempedidovenda@AIR WHERE ROWNUM <= 5`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log("Resultado da consulta (primeiros 5 registros):");
    console.log(JSON.stringify(result.rows, null, 2));
    console.log("Colunas encontradas:", result.metaData.map(m => m.name));

  } catch (err) {
    console.error("Erro ao executar a consulta:");
    console.error(err);
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

testQuery();
