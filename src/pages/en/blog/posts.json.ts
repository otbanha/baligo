// /en/blog/ 前端分類篩選與分頁用的完整文章清單。
// 原本以 define:vars 內嵌在首頁 HTML（約 580KB），拆出來後首頁 HTML 變小，這份 JSON 也能被快取。
import type { APIRoute } from 'astro';
import { getEnBlogPosts } from '../../../lib/enBlogPosts';

export const prerender = true;

export const GET: APIRoute = async () => {
  const { allPostsData } = await getEnBlogPosts();
  return new Response(JSON.stringify(allPostsData), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
