const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// AirtableからCheck_resultを取得する中継API
app.get('/api/get-result', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send('レコードIDが指定されていません');

  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;
  const apiKey = process.env.AIRTABLE_API_KEY;

  const url = `https://api.airtable.com/v0/${baseId}/${tableName}/${id}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` }
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

app.listen(port, () => {
  console.log(`中継サーバー起動中: http://localhost:${port}`);
});
