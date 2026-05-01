const oracledb = require('oracledb');

oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient' });

async function test() {
  let conn;
  try {
    conn = await oracledb.getConnection({
      user: "AIR", password: "AsrFTT8SjK",
      connectString: "dbconnect.megaerp.online:4221/xepdb1"
    });

    // 1. Verificar o pedido 545 e seus campos-chave
    let r = await conn.execute(
      `SELECT ORG_IN_CODIGO, SER_ST_CODIGO, PED_IN_CODIGO FROM MEGA.VEN_PEDIDOVENDA@AIR WHERE PED_IN_CODIGO = 545`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log("Pedido 545 na tabela principal:", r.rows);

    if (r.rows.length > 0) {
      const p = r.rows[0];
      // 2. Tentar buscar itens com esses valores exatos
      let r2 = await conn.execute(
        `SELECT COUNT(*) AS QTD FROM MEGA.ven_itempedidovenda@AIR WHERE ORG_IN_CODIGO = :org AND SER_ST_CODIGO = :ser AND PED_IN_CODIGO = :ped`,
        { org: p.ORG_IN_CODIGO, ser: p.SER_ST_CODIGO, ped: p.PED_IN_CODIGO },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      console.log(`Itens encontrados com org=${p.ORG_IN_CODIGO}, ser=${p.SER_ST_CODIGO}, ped=${p.PED_IN_CODIGO}:`, r2.rows);
    }

  } catch (e) {
    console.error(e);
  } finally {
    if (conn) await conn.close();
  }
}

test();
