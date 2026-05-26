/**
 * Cloudflare Worker — 每日峇里島旅遊情報觸發器
 *
 * 在準確時間觸發 GitHub Actions workflow，
 * 實際的文章生成邏輯仍在 GitHub Actions 的 Python 腳本執行。
 *
 * 所需 Cloudflare Worker Secrets：
 *   GITHUB_TOKEN — GitHub PAT，需有 "workflow" 權限
 */

const GITHUB_OWNER    = "otbanha";
const GITHUB_REPO     = "baligo";
const WORKFLOW_FILE   = "daily-news.yml";
const GITHUB_API      = "https://api.github.com";

async function triggerWorkflow(githubToken) {
  const url = `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization":        `Bearer ${githubToken}`,
      "Accept":               "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent":           "Cloudflare-Worker/daily-news-trigger",
      "Content-Type":         "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
  });

  if (resp.status === 204) {
    return { ok: true, message: "Workflow triggered successfully" };
  }
  const text = await resp.text();
  return { ok: false, message: `HTTP ${resp.status}: ${text}` };
}

export default {
  // Cron 觸發：每天 Jakarta 時間 20:00（UTC 13:00）
  async scheduled(event, env, ctx) {
    console.log(`[daily-news-trigger] Cron fired at ${new Date().toISOString()}`);
    const result = await triggerWorkflow(env.GITHUB_TOKEN);
    if (result.ok) {
      console.log("[daily-news-trigger] ✅", result.message);
    } else {
      console.error("[daily-news-trigger] ❌", result.message);
      throw new Error(result.message);
    }
  },

  // HTTP 觸發：手動測試用（直接呼叫 Worker URL）
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Use POST to trigger manually", { status: 405 });
    }
    const result = await triggerWorkflow(env.GITHUB_TOKEN);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  },
};
