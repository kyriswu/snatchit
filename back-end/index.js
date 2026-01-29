import express, { json } from 'express';
import fs from 'fs';

import { getProductById, getProductsBySellerId, getProductsByStatus, getRandomProduct, addProduct, updateProduct, deleteProduct } from './db/db_products.js';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const GOOGLE_CLIENT_ID="580774494470-tqipf63iihr1a06cbco0a9j5jmo3a3gv.apps.googleusercontent.com"
const GOOGLE_CLIENT_SECRET="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"
const JWT_SECRET="your_jwt_secret"
const GOOGLE_AUTH_CALLBACK_URL="http://localhost:3000/google-auth-callback"

const app = express();
const PORT = 4000;

// 中间件示例：解析 JSON，增加请求体大小限制
app.use(json({ limit: '50mb' }));

// CORS 中间件：允许跨域请求
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}); 

// 静态文件服务：提供 file 文件夹下的图片访问
app.use('/file', express.static('file'));

// 路由
app.get('/', (req, res) => {
  res.send('Hello, Express!');
});

/**
 * 核心接口：接收前端传来的 Code，换取 Token
 */
app.post('/api/auth/google', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ message: 'Code is required' });
    }

    console.log(code)

    // 配置 Google Client
    const client = new OAuth2Client(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_AUTH_CALLBACK_URL // 必须与 Google Console 配置完全一致
    );
    console.log(client)
    try {
        // 1. 用 Code 换取 Google 的 Tokens (包含 id_token, access_token)
        const { tokens } = await client.getToken(code);
        console.log('Google Tokens:', tokens);
        // 2. 验证 id_token 的合法性，并解析用户信息
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        // payload 包含: email, name, picture, sub (google user id)
        const { sub, email, name, picture } = payload;

        // 3. 【业务逻辑】在这里查询或注册你的数据库用户
        // let user = await db.User.find({ googleId: sub });
        // if (!user) user = await db.User.create({ ... });

        // 4. 签发你自己的后端 Session Token (用于后续 API 调用)
        const appToken = jwt.sign(
            { userId: sub, email }, // 你的用户标识
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('Google Auth Success:', { userId: sub, email, name });
        // 5. 返回数据给前端
        res.json({
            message: 'Login successful',
            appToken: appToken,       // 用于访问你的 Express API
            user: { name, email, picture },
            // 【关键】将原始 id_token 返回给前端，用于 Web3 AA (Sui zkLogin / MPC)
            googleIdToken: tokens.id_token 
        });

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
});

app.post('/addProduct', async (req, res) => {
    const { seller_id, title, img, product_desc, price, ticket_price, number_digits, deadline } = req.body;
    if (!seller_id) {
        return res.status(400).json({ code: -1, msg: 'Missing required field: seller_id' });
    }
    if (!title) {
        return res.status(400).json({ code: -1, msg: 'Missing required field: title' });
    }
    if (!img) {
        return res.status(400).json({ code: -1, msg: 'Missing required field: img' });
    }
    if (!product_desc) {
        return res.status(400).json({ code: -1, msg: 'Missing required field: product_desc' });
    }
    if (!price) {
        return res.status(400).json({ code: -1, msg: 'Missing required field: price' });
    }
    if (!ticket_price) {
        return res.status(400).json({ code: -1, msg: 'Missing required field: ticket_price' });
    }
    if (!number_digits) {
        return res.status(400).json({ code: -1, msg: 'Missing required field: number_digits' });
    }
    if (!deadline) {
        return res.status(400).json({ code: -1, msg: 'Missing required field: deadline' });
    }
    try {
        const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = `./file/${Date.now()}.png`;
        const fileDir = './file';
        
        // 检查 file 目录是否存在，不存在则创建
        if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
        }

        await fs.promises.writeFile(filePath, buffer);

        req.body.img = filePath.slice(1);

        //生成一个16位的随机字符串作为uuid
        const uuid = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        req.body.uuid = uuid;

        const productId = await addProduct(req.body);
        res.status(201).json({ id: productId, message: 'Product added successfully' , img: req.body.img });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/updateProduct', async (req, res) => {
    const { id, seller_id, title, img, product_desc, price, ticket_price, number_digits, deadline } = req.body;
    if (!id) {
        return res.status(400).json({ code: -1, msg: 'Missing required field: id' });
    }
    try {
        if (img && img.startsWith('data:image/')) {
            const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const filePath = `./file/${Date.now()}.png`;
            const fileDir = './file';
            
            // 检查 file 目录是否存在，不存在则创建
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }

            await fs.promises.writeFile(filePath, buffer);

            req.body.img = filePath.slice(1);
        }else{
            req.body.img = '/file/' + img.split('/').pop();
        }
        const isOk = await updateProduct(id, req.body);
        if (isOk) {
            req.body.id = id;
        }
        res.status(201).json({ id: id, message: 'Product added successfully' , data: req.body });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});


app.post('/getProductList', async (req, res) => {
    try {
        let { seller_id } = req.body;
        let products;
        
        if (seller_id) {
            products = await getProductsBySellerId(seller_id);
        }
        
        res.status(200).json({ code: 0, data: products });
    } catch (error) {
        res.status(500).json({ code: -1, error: error.message });
    }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});