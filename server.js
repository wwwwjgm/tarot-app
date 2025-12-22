// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // 提供前端靜態檔案

if (!process.env.OPENAI_API_KEY) {
    console.error("請在 .env 設定 OPENAI_API_KEY");
    process.exit(1);
}

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// 產生塔羅解讀的 API
app.post("/api/tarot", async (req, res) => {
    try {
        const { question, spreadType, cards } = req.body;

        if (!question || !cards || !Array.isArray(cards) || cards.length === 0) {
            return res.status(400).json({ error: "請提供 question 與 cards" });
        }

        // 把抽到的牌整理成文字描述，給模型用
        const cardLines = cards.map((c, idx) => {
            return `${idx + 1}. 位置：${c.position || "未指定"}, 牌名：${c.cnName || c.name}, 正逆位：${c.orientation}`;
        });

        const userInput = `
你是一位理性、溫和、有心理諮商素養的塔羅老師，幫使用者整理思緒，而不是做宿命論預言。

【提問者的問題】
${question}

【使用的牌陣】
${spreadType || "未特別說明"}

【抽到的牌】
${cardLines.join("\n")}

請依照以下原則解讀：
1. 先用一小段話，總結此問題目前的整體氛圍。
2. 依牌陣位置，一張一張說明（牌義＋正逆位＋此位置代表的意義）。
3. 多著墨在「可行的具體建議」、可以怎麼調整心態或行動。
4. 避免宿命式語氣（例如「一定會怎樣」「註定」），改用「傾向」「比較可能」「如果你這樣做」這種表達。
5. 最後給一段 2～3 句的結語，像給朋友的中肯建議。

請用繁體中文回答，段落清楚、有小標題。`;

        const response = await client.responses.create({
            model: "gpt-4.1-mini", // 或改成你想用的模型
            input: userInput,
            // 若你希望更省錢，可以用比較小的模型，例如 "gpt-4.1-mini" 等
        });

        // 通用取文字的方式（各版本都適用）
        let outputText = "";

        if (response.output_text) {
            outputText = response.output_text;
        } else if (response.output?.[0]?.content?.[0]?.text?.value) {
            outputText = response.output[0].content[0].text.value;
        } else {
            outputText = "（GPT 未回傳文字內容，請檢查模型與 API 回傳格式）";
        }

        res.json({
            ok: true,
            answer: outputText,
        });
    } catch (err) {
        console.error("❌ OpenAI API Error 詳細資訊：");
        console.error(err);
        res.json({ ok: false, error: err.message || "呼叫 OpenAI 失敗" });
    }

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Tarot app server running on http://localhost:${PORT}`);
});
