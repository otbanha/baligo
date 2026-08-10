/**
 * WebMCP — 把站內幾個實用動作開放給瀏覽器端的 AI agent
 * https://webmachinelearning.github.io/webmcp/
 *
 * 只在支援 navigator.modelContext 的瀏覽器執行；其他瀏覽器什麼都不做。
 * 全部是唯讀查詢，不會替使用者送出任何東西。
 */
(function () {
  'use strict';

  var ctx = navigator.modelContext;
  if (!ctx) return;

  var ORIGIN = location.origin;
  var indexPromise = null;

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch('/article-index.json')
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
    }
    return indexPromise;
  }

  function text(value) {
    return { content: [{ type: 'text', text: value }] };
  }

  function score(article, terms) {
    var title = (article.title || '').toLowerCase();
    var desc = (article.description || '').toLowerCase();
    var tags = (article.tags || []).join(' ').toLowerCase();
    var cats = (article.category || []).join(' ').toLowerCase();
    var snippet = (article.snippet || '').toLowerCase();
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (!t) continue;
      if (title.indexOf(t) !== -1) total += 10;
      if (cats.indexOf(t) !== -1) total += 5;
      if (tags.indexOf(t) !== -1) total += 4;
      if (desc.indexOf(t) !== -1) total += 3;
      if (snippet.indexOf(t) !== -1) total += 1;
    }
    return total;
  }

  var tools = [
    {
      name: 'search_bali_articles',
      description:
        '搜尋 Go Bali Go（gobaligo.id）站上的峇里島旅遊攻略文章，涵蓋住宿、簽證、交通、包車、景點、美食、親子與行程規劃。回傳標題、網址與摘要。',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜尋關鍵字，中英文皆可，例如「烏布 villa」或「visa on arrival」',
          },
          limit: {
            type: 'number',
            description: '回傳幾筆，預設 5，最多 20',
          },
        },
        required: ['query'],
      },
      execute: function (input) {
        var query = String((input && input.query) || '').trim();
        var limit = Math.min(Math.max(parseInt((input && input.limit) || 5, 10) || 5, 1), 20);
        if (!query) return Promise.resolve(text('請提供搜尋關鍵字。'));

        var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        return loadIndex().then(function (list) {
          var hits = list
            .map(function (a) { return { a: a, s: score(a, terms) }; })
            .filter(function (x) { return x.s > 0; })
            .sort(function (x, y) { return y.s - x.s; })
            .slice(0, limit);

          if (!hits.length) return text('找不到符合「' + query + '」的文章。');

          return text(hits.map(function (h, i) {
            var a = h.a;
            return (i + 1) + '. ' + a.title + '\n   ' + ORIGIN + a.url +
              (a.description ? '\n   ' + a.description : '');
          }).join('\n\n'));
        });
      },
    },
    {
      name: 'get_bali_exchange_rate',
      description:
        '查詢峇里島當地換匯參考匯率（印尼盾 IDR 對美金、澳幣、新加坡幣、港幣、馬幣、人民幣、台幣），貼近當地換匯所行情。',
      inputSchema: { type: 'object', properties: {} },
      execute: function () {
        return fetch('/api/exchange-rate')
          .then(function (r) { return r.json(); })
          .then(function (d) {
            var lines = Object.keys(d.rates || {}).map(function (code) {
              return '1 ' + code + ' ≈ ' + Number(d.rates[code]).toLocaleString('en-US') + ' IDR';
            });
            return text('峇里島換匯參考匯率（更新於 ' + d.date + '）\n' + lines.join('\n'));
          })
          .catch(function () { return text('匯率暫時查不到，請稍後再試。'); });
      },
    },
    {
      name: 'read_bali_article',
      description:
        '讀取 gobaligo.id 上某一篇文章的完整內容（markdown 格式）。網址可以用 search_bali_articles 找到。',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'gobaligo.id 的文章網址或站內路徑，例如 /blog/xxx/',
          },
        },
        required: ['url'],
      },
      execute: function (input) {
        var raw = String((input && input.url) || '').trim();
        if (!raw) return Promise.resolve(text('請提供文章網址。'));
        var path;
        try {
          var u = new URL(raw, ORIGIN);
          if (u.origin !== ORIGIN) return Promise.resolve(text('只能讀取 gobaligo.id 上的文章。'));
          path = u.pathname;
        } catch (e) {
          return Promise.resolve(text('網址格式不正確。'));
        }
        var mdPath = path === '/' ? '/index.md' : path.replace(/\/$/, '') + '.md';
        return fetch(mdPath, { headers: { accept: 'text/markdown' } })
          .then(function (r) { return r.ok ? r.text() : null; })
          .then(function (md) { return text(md || '這個網址讀不到內容。'); })
          .catch(function () { return text('讀取失敗，請稍後再試。'); });
      },
    },
  ];

  try {
    if (typeof ctx.registerTool === 'function') {
      tools.forEach(function (tool) { ctx.registerTool(tool); });
    } else if (typeof ctx.provideContext === 'function') {
      ctx.provideContext({ tools: tools });
    }
  } catch (e) {
    // agent 介面還在演進中，註冊失敗就算了，不影響一般瀏覽
  }
})();
