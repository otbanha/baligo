// 新增此函式到現有的 Apps Script 專案
// 部署時選擇「以我的身份執行」，存取權限設為「任何人（含匿名）」

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('商家登錄');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1)
    .filter(r => r[1] === '已審核') // 審核狀態欄（B欄）
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return {
        category:        categoryKey(obj['商家類別']),
        nameZh:          obj['商家名稱（中）'],
        nameEn:          obj['商家名稱（英）'],
        area:            obj['區域'],
        address:         obj['地址'],
        description:     obj['簡介'],
        photoUrl:        obj['封面照片URL'],
        googleMap:       obj['Google Maps'],
        contactType:     obj['主要聯絡方式'],
        contactVal:      obj['聯絡帳號/ID'],
        whatsapp:        obj['WhatsApp'],
        instagram:       obj['Instagram'],
        hours:           obj['營業時間'],
        featured:        obj['優先顯示'] === true || obj['優先顯示'] === 'TRUE',
        chineseServices: obj['中文服務'] ? String(obj['中文服務']).split(',').map(s => s.trim()).filter(Boolean) : [],
      };
    });

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function categoryKey(label) {
  const map = {
    '餐廳 / 美食':      'restaurant',
    '旅遊服務 / 導遊':  'tour',
    '美容美甲 / SPA':   'spa',
    '住宿 / Villa':     'stay',
    '購物 / 伴手禮':    'shop',
    '其他服務':          'other',
  };
  return map[label] || 'other';
}
