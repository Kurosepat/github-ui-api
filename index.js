const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const upload = multer();
app.use(cors()); // CORSエラー対策（Render + フロントエンド連携用）

// POST /api/upload（FormData用）
app.post('/api/upload', upload.none(), async (req, res) => {
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
  const payload = req.body; // ← フォームデータのテキスト部分だけ（ファイルはUI側でCloudConvert）

  try {
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.recordId && typeof data.recordId === 'string') {
      res.send(data.recordId);
    } else {
      console.error('recordIdが見つかりません:', data);
      res.status(500).send('recordIdの取得に失敗しました');
    }
  } catch (error) {
    console.error('Make Webhook 呼び出しエラー:', error);
    res.status(500).send('中継サーバーエラー');
  }
});

// GET /api/get-result：Airtable取得処理（変わらず）
app.get('/api/get-result', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send('レコードIDが指定されていません');

  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;
  const apiKey = process.env.AIRTABLE_API_KEY;

  const url = `https://api.airtable.com/v0/${baseId}/${tableName}/${id}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Airtableへのリクエストに失敗しました');
    }

    const data = await response.json();
    const result = data.fields?.Check_result || '結果が存在しません';
    res.send(result);
  } catch (error) {
    console.error('中継サーバーエラー:', error);
    res.status(500).send('中継サーバー内部エラー');
  }
});

// ヘルスチェック用
app.get('/', (req, res) => {
  res.send('🟢 Relay Server is running!');
});

app.listen(port, () => {
  console.log(`中継サーバー起動中: http://localhost:${port}`);
});
