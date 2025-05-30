require("dotenv").config(); // ← 1行目に追加！

const express = require("express");
const Airtable = require("airtable");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Airtable設定（APIキーは.envから取得）
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base("apptPO8m6mlP4pZbU");

// GET /api/get-result?id=recXXXX
app.get("/api/get-result", async (req, res) => {
  const recordId = req.query.id;

  if (!recordId) {
    return res.status(400).send("❌ recordIdが指定されていません");
  }

  try {
    const record = await base("Check Results").find(recordId);

    const fields = record.fields;

    const resultText = [
      fields["チェック結果"] ? `チェック結果:\n${fields["チェック結果"]}` : "",
      fields["重要度"] ? `重要度: ${fields["重要度"]}` : ""
    ].filter(Boolean).join("\n\n");

    res.send(resultText || "⚠️ 結果が見つかりませんでした");
  } catch (err) {
    console.error("Airtable取得エラー:", err.statusCode, err.message);
    res.status(500).send("結果が存在しません");
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
