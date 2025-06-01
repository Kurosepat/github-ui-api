const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const cors = require('cors');
const FormData = require('form-data');
const Airtable = require('airtable');

const app = express();
const upload = multer();
app.use(cors());

// 環境変数から Airtable の設定を読み込む
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const tableName = 'Check Results'; // ← あなたのテーブル名

// POST: ファイルを Make に送信
app.post('/api/upload', upload.any(), async (req, res) => {
  try {
    const formData = new FormData();

    formData.append('shoin_id', req.body.shoin_id || '');
    formData.append('seiri_no', req.body.seiri_no || '');
    formData.append('date', req.body.date || '');

    for (const file of req.files) {
      formData.append(file.fieldname, file.buffer, file.originalname);
    }

    const makeWebhookURL = 'https://hook.us2.make.com/7ya79qm3ttvxoq6taks4wvto37hrcfjb';

    const response = await fetch(makeWebhookURL, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const resultText = await response.text();

    if (response.ok) {
      let recordId;

      try {
        const json = JSON.parse(resultText);
        recordId = json.body || json.recordId;
      } catch {
        recordId = resultText.trim();
      }

      res.status(200).json({ recordId: recordId });

    } else {
      console.error('Make側エラー:', resultText);
      res.status(response.status).send(`Make側エラー: ${resultText}`);
    }

  } catch (error) {
    console.error('中継エラー:', error);
    res.status(500).send('中継サーバー内部エラー');
  }
});

// GET: Airtableからチェック結果を取得
app.get('/api/get-result', async (req, res) => {
  const recordId = req.query.id;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId is required' });
  }

  try {
    const record = await base(tableName).find(recordId);
    res.json({ result: record.fields });
  } catch (err) {
    console.error('Airtable取得エラー:', err);
    res.status(500).json({ error: '結果取得失敗' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`中継サーバー起動中: http://localhost:${PORT}`);
});
