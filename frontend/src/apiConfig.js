// Configuração centralizada da URL da API para permitir o uso de "Ponte" (ex: ngrok)
// Se VITE_API_URL estiver definida (no .env ou Vercel), usa ela. Caso contrário, usa o caminho relativo /api
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default API_BASE_URL;
