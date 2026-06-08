import type { APIRoute } from 'astro';
import staticShortlinks from '../../data/shortlinks.json';

interface ShortlinkData {
  id: string;
  url: string;
  note?: string;
  title?: string;
  description?: string;
  image?: string;
  createdAt?: string;
}

const ADMIN_TOKEN = import.meta.env.SHORTLINKS_ADMIN_TOKEN || 'dev-token-change-in-production';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Return all shortlinks from static file
    // In production, this could merge with KV-stored dynamic shortlinks
    return new Response(JSON.stringify(staticShortlinks), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve shortlinks' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  // Check admin token
  const token = request.headers.get('X-Admin-Token');
  if (!token || token !== ADMIN_TOKEN) {
    return new Response(
      JSON.stringify({ error: '未授權' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json() as ShortlinkData;

    // Validate required fields
    if (!body.id || !body.url) {
      return new Response(
        JSON.stringify({ error: '缺少必填欄位：ID 和 URL' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate ID format (alphanumeric, dash, underscore only)
    if (!/^[a-zA-Z0-9_-]+$/.test(body.id)) {
      return new Response(
        JSON.stringify({ error: 'ID 只能包含英文字母、數字、底線和連字號' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if ID already exists in static file
    if (staticShortlinks.some((sl: ShortlinkData) => sl.id === body.id)) {
      return new Response(
        JSON.stringify({ error: '此 ID 已存在' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For static sites on Cloudflare Pages, dynamic shortlinks would need to be:
    // 1. Stored in Cloudflare KV (requires KV binding)
    // 2. Or added to the git repository and redeployed
    // This is a limitation of static site hosting.

    // Return success but note about static site limitation
    return new Response(
      JSON.stringify({
        ok: true,
        id: body.id,
        message: '短網址已添加（注意：靜態網站需要重新部署才能生效）',
        warning: 'static-site-limitation'
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('POST error:', error);
    return new Response(
      JSON.stringify({ error: '處理請求時出錯' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  // Check admin token
  const token = request.headers.get('X-Admin-Token');
  if (!token || token !== ADMIN_TOKEN) {
    return new Response(
      JSON.stringify({ error: '未授權' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ error: '缺少 ID 參數' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is the verification delete
    if (id === '__verify__') {
      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if ID exists in static file
    const shortlink = staticShortlinks.find((sl: ShortlinkData) => sl.id === id);
    if (!shortlink) {
      return new Response(
        JSON.stringify({ error: '找不到此短網址' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For static sites, deletion would require:
    // 1. Removing from shortlinks.json in git repository
    // 2. Redeploying the site

    return new Response(
      JSON.stringify({
        ok: false,
        error: '靜態網站無法直接刪除。請手動編輯 src/data/shortlinks.json 並重新部署。',
        shortlink
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return new Response(
      JSON.stringify({ error: '處理請求時出錯' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
