const express = require('express');
const cors = require('cors');
const { getPedidos } = require('./db');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/pedidos', async (req, res) => {
  try {
    const { startDate, endDate, filial } = req.query;
    const pedidos = await getPedidos({ startDate, endDate, filial });
    res.json(pedidos);
  } catch (error) {
    console.error("Erro na rota /api/pedidos:", error);
    res.status(500).json({ error: "Erro interno no servidor ao buscar pedidos." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
