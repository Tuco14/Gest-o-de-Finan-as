export default function handler(req: any, res: any) {
  // Configura cabeçalhos de resposta
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Método ${req.method} não permitido. Utilize GET.` });
  }

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'FinControl Backend API',
  });
}
