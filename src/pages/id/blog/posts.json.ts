// /id/blog/ 前端分類篩選與分頁用的完整文章清單（見 src/components/LangBlogIndex.astro）。
import type { APIRoute } from 'astro';
import { getLangBlogPosts } from '../../../lib/langBlogPosts';

export const prerender = true;

export const GET: APIRoute = async () => {
  const { allPostsData } = await getLangBlogPosts('id');
  return new Response(JSON.stringify(allPostsData), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
