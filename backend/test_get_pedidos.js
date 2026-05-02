const { getPedidos } = require('./db');

async function test() {
  try {
    const pedidos = await getPedidos({ 
      startDate: '2026-04-01', 
      endDate: '2026-05-30',
      filial: 'ALL',
      status: 'ALL'
    });
    console.log("Amostra de 10 pedidos:");
    pedidos.slice(0, 10).forEach(p => {
      console.log(`Pedido #${p.PED_IN_CODIGO} (${p.SER_ST_CODIGO}): Entrega = ${p.PED_DT_ENTREGA}`);
    });
  } catch (e) {
    console.error(e);
  }
}

test();
