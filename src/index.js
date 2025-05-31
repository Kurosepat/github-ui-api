const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const cors = require('cors');
const FormData = require('form-data');

const app = express();
const upload = multer();
app.use(cors());

app.post('/api/upload', upload.any(), async (req, res) => {
  try {
    const formData = new FormData();

    formData.append('shoin_id', req.body.shoin_id || '');
    formData.append('seiri_no', req.body.seiri_no || '');
    formData.append('date', req.body.date || '');

    for (const file of req.files) {
      formData.append(file.fieldname, file.buffer, file.originalname);
    }

    const makeWebhookURL = 'https://hook.us2.make.com/2oi6xu9uwoep5xbj7y8ir4qq4c6jvctf';

    const response = await fetch(makeWebhookURL, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const resultText = await response.text();

    try {
      const json = JSON.parse(resultText);

      if (response.ok) {
        res.status(200).json(json); // 正常なJSONをそのまま返す
      } else {
        console.error('Make側が非200:', resultText);
        res.status(response.status).json({
          error: 'Make側でエラーが発生しました',
          details: json
        });
      }
    } catch (parseError) {
      console.error('JSONパースエラー:', parseError);
      console.error('返ってきた生データ:', resultText);
      res.status(500).json({
        error: 'JSONパースに失敗しました',
        raw: resultText
      });
    }
  } catch (error) {
    console.error('中継エラー:', error);
    res.status(500).json({
      error: '中継サーバー内部エラー',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`中継サーバー起動中: http://localhost:${PORT}`);
});
