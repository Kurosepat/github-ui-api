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

// ファイル付きでMakeに中継する
app.post('/api/upload', upload.any(), async (req, res) => {
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!makeWebhookUrl) {
    console.error('❌ MAKE_WEBHOOK_URL が未設定');
    return res.status(500).send('Webhook URL未設定');
  }

  try {
    const form = new FormData();

    // フィールド追加
    form.append('shoin_id', req.body.shoin_id);
    form.append('seiri_no', req.body.seiri_no);
    form.append('date', req.body.date);

    // ファイルをフォームに追加
    for (const file of req.files) {
      form.append(file.fieldname, file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
    }

    // Make に送信
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const resultText = await response.text();
    console.log('✅ recordId:', resultText);
    res.send(resultText);

  } catch (error) {
    console.error('❌ エラー:', error);
    res.status(500).send('中継サーバーエラー');
  }
});

// Airtable から結果取得
app.get('/api/get-result', async (req, res) => {
  const id = req.query.id;
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
      return res.status(response.status).send('Airtableリクエスト失敗');
    }

    const data = await response.json();
    const result = data.fields?.Check_result || '結果が存在しません';
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
