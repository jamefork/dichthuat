// index.js - Backend Server Hoàn chỉnh

// --- Import các thư viện cần thiết ---
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

// --- CẤU HÌNH ---
const app = express();
// Render cung cấp biến môi trường PORT. Nếu không có, dùng cổng 3000 cho local.
const PORT = process.env.PORT || 3000; 

// Đọc API Keys từ biến môi trường trên Render để bảo mật
const APP_KEY = process.env.YOUDAO_APP_KEY;
const APP_SECRET = process.env.YOUDAO_APP_SECRET;

// --- Middleware ---
app.use(cors()); // Cho phép yêu cầu từ các nguồn khác
app.use(express.json()); // Cho phép server đọc dữ liệu JSON

// Phục vụ file index.html khi truy cập vào trang chủ
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Hàm tiện ích của Youdao ---
function truncate(q) {
    // Loại bỏ các ký tự xuống dòng có thể gây ra lỗi chữ ký
    const cleanQ = q.replace(/(\r\n|\n|\r)/gm, " ");
    const len = cleanQ.length;
    if (len <= 20) return cleanQ;
    return cleanQ.substring(0, 10) + len + cleanQ.substring(len - 10, len);
}

// --- API Endpoint cho việc dịch thuật ---
app.post('/api/translate', async (req, res) => {
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

        res.json(youdaoResponse.data);

    } catch (error) {
        console.error('Error in /api/translate:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Đã có lỗi xảy ra phía máy chủ.' });
    }
});

// --- Khởi động máy chủ ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
