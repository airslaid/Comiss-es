const oracledb = require('oracledb');
oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient' });

async function test() {
  let conn;
  try {
    conn = await oracledb.getConnection({
      user: "AIR", password: "AsrFTT8SjK",
      connectString: "dbconnect.megaerp.online:4221/xepdb1"
    });

    // 1. Ver colunas de est_produtos
    const r = await conn.execute(
      `SELECT * FROM MEGA.est_produtos@AIR WHERE ROWNUM <= 2`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log("Colunas de est_produtos:", Object.keys(r.rows[0]));
    console.log("\nExemplo linha 1:", JSON.stringify(r.rows[0], null, 2));

    // 2. Ver colunas de ven_itempedidovenda com PRO
    const r2 = await conn.execute(
      `SELECT PRO_TAB_IN_CODIGO, PRO_PAD_IN_CODIGO, PRO_IN_CODIGO FROM MEGA.ven_itempedidovenda@AIR WHERE ROWNUM <= 3`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log("\nChaves de produto no item:", r2.rows);

  } catch (e) {
    console.error(e);
  } finally {
    if (conn) await conn.close();
  }
}
test();
