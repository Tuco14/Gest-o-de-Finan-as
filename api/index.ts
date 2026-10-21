export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  return res.status(200).json({
    name: 'FinControl Backend API',
    status: 'online',
    endpoints: [
      { path: '/api/health', method: 'GET', description: 'Verificação de integridade do servidor' },
      { path: '/api/chat', method: 'POST', description: 'Assistente financeiro com inteligência artificial' }
    ],
    timestamp: new Date().toISOString(),
  });
}
