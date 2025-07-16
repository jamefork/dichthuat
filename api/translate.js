// api/translate.js - Serverless Function for Vercel

// --- Import các thư viện cần thiết ---
const axios = require('axios');
const crypto = require('crypto');

// Đọc API Keys từ biến môi trường trên Vercel để bảo mật
const APP_KEY = process.env.YOUDAO_APP_KEY;
const APP_SECRET = process.env.YOUDAO_APP_SECRET;

// --- Hàm tiện ích của Youdao ---
function truncate(q) {
    const cleanQ = q.replace(/(\r\n|\n|\r)/gm, " ");
    const len = cleanQ.length;
    if (len <= 20) return cleanQ;
    return cleanQ.substring(0, 10) + len + cleanQ.substring(len - 10, len);
}

// --- Hàm xử lý chính ---
// Vercel sẽ tự động chạy hàm này khi có yêu cầu đến /api/translate
module.exports = async (req, res) => {
    // Cho phép yêu cầu từ mọi nguồn (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Xử lý yêu cầu OPTIONS (trình duyệt gửi trước yêu cầu POST)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { text: query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Vui lòng cung cấp văn bản cần dịch.' });
        }
        
        if (!APP_KEY || !APP_SECRET) {
             return res.status(500).json({ error: 'Lỗi: APP_KEY và APP_SECRET chưa được cấu hình trên server.' });
        }

        const salt = crypto.randomUUID();
        const curtime = Math.round(new Date().getTime() / 1000);
        const from = 'zh-CHS';
        const to = 'vi';
        
        const signStr = APP_KEY + truncate(query) + salt + curtime + APP_SECRET;
        const sign = crypto.createHash('sha256').update(signStr).digest('hex');

        const params = new URLSearchParams();
        params.append('q', query);
        params.append('from', from);
        params.append('to', to);
        params.append('appKey', APP_KEY);
        params.append('salt', salt);
        params.append('sign', sign);
        params.append('signType', 'v3');
        params.append('curtime', curtime);

        const youdaoResponse = await axios.post('https://openapi.youdao.com/api', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        // Trả về kết quả JSON
        res.status(200).json(youdaoResponse.data);

    } catch (error) {
        console.error('Error in /api/translate:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Đã có lỗi xảy ra phía máy chủ.' });
    }
};
