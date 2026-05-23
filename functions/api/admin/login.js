import { generateToken, checkSecret, COOKIE_NAME } from '../../lib/admin/auth.js';

export async function onRequest(context) {
  const { request, env } = context;

  const secret = env.ADMIN_SECRET;
  if (!secret) {
    return new Response('Forbidden', { status: 403 });
  }

  const url = new URL(request.url);
  const provided = url.searchParams.get('key') ?? '';

  const ok = await checkSecret(provided, secret);
  if (!ok) {
    return new Response('Forbidden', { status: 403 });
  }

  const token = await generateToken(secret);
  const cookieValue = encodeURIComponent(token);
  const maxAge = 30 * 24 * 3600; // 30 days

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/tools/unfurl',
      'Set-Cookie': `${COOKIE_NAME}=${cookieValue}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`,
      'Cache-Control': 'no-store',
    },
  });
}
