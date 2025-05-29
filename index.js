const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const cors = require('cors');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const upload = multer();
app.use(cors());

// 動作確認用
app.get('/', (req, res) => {
  res.send('🟢 Relay Server is running!');
});

// Make へファイル付きで中継
app.post('/api/upload', upload.any(), async (req, res) => {
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!makeWebhookUrl) {
    console.error('❌ MAKE_WEBHOOK_URL が未設定');
    return res.status(500).send('Webhook URL未設定');
  }

  try {
    const form = new FormData();

    form.append('shoin_id', req.body.shoin_id);
    form.append('seiri_no', req.body.seiri_no);
    form.append('date', req.body.date);

    for (const file of req.files) {
      form.append(file.fieldname, file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
    }

    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const resultText = await response.text();
    console.log('✅ recordId:', resultText);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain');
    res.send(resultText);
  } catch (error) {
    console.error('❌ 中継サーバーエラー:', error);
    res.status(500).send('中継サーバーエラー');
  }
});

// Airtable からチェック結果を取得
app.get('/api/get-result', async (req, res) => {
  const id = req.query.id;
  console.log("取得リクエストID:", id);

  if (!id) return res.status(400).send('レコードIDが必要です');

  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${id}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Airtableリクエスト失敗:", errorBody);
      return res.status(response.status).send('Airtableリクエスト失敗');
    }

    const data = await response.json();
    const raw = data.fields?.Check_result;
    const result = raw && raw.trim() !== '' ? raw : '結果が存在しません';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain');
    res.send(result);
  } catch (error) {
    console.error('❌ Airtable取得エラー:', error);
    res.status(500).send('サーバー内部エラー');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 中継サーバー起動: http://localhost:${PORT}`);
});
