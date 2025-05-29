const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const upload = multer();
app.use(cors());

// 動作確認用ルート
app.get('/', (req, res) => {
  res.send('🟢 Relay Server is running!');
});

// POST /api/upload
app.post('/api/upload', upload.any(), async (req, res) => {
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
  const payload = req.body;

  if (!makeWebhookUrl) {
    console.error('❌ MAKE_WEBHOOK_URL が設定されていません');
    return res.status(500).send('サーバー構成エラー: Webhook URL未設定');
  }

  console.log('🔥 /api/upload POST 受信');
  console.log('📦 payload:', payload);

  try {
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const resultText = await response.text(); // ← プレーンテキストとして受信
    console.log('✅ recordId 取得:', resultText);

    res.send(resultText); // ← そのままUIに返す

  } catch (error) {
    console.error('❌ Make Webhook 呼び出しエラー:', error);
    res.status(500).send('中継サーバーエラー');
  }
});

// GET /api/get-result
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
    console.error('❌ Airtable取得エラー:', error);
    res.status(500).send('中継サーバー内部エラー');
  }
});

app.listen(port, () => {
  console.log(`🚀 中継サーバー起動: http://localhost:${port}`);
});
