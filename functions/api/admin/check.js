import { isAdmin } from '../../lib/admin/auth.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const admin = await isAdmin(request, env.ADMIN_SECRET ?? '');

  return new Response(JSON.stringify({ isAdmin: admin }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
