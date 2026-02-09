import 'dotenv/config';
import express, { json } from 'express';
import fs from 'fs';

import { auth, OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { sendTrx,createWallet,getBalance,getAccount,executePayment,transferWithAuthorization,getEvents,executeBatchPayment,validateBatchPayment,checkTxStatus,stakeTrxForEnergy,stakeTrx,getUserAssetValue,getExchangeRate,injectReward,getStakePrincipal} from './wallet.js';
import { loginOrRegister, getUserInfoBySocialPlatform, updateUserWalletAddress, approveContract,getUserByWalletAddress } from './db/db_users.js';
import { encryptPrivateKey, decryptPrivateKey } from './util.js';
import {  
createSpendingKey,
getSpendingKeyById,
getSpendingKeyByAccessKey,
getSpendingKeysByUserId,
updateSpendingKey,
deleteSpendingKey,
getPolicyByName} from './db/db_spending_keys.js';
import {RiskEngine} from './risk-engine.js'

import { authenticateToken } from './middleware.js'; // 导入中间件
import { WebSocketServer } from 'ws';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { createPaymentLog, getPaymentLogsByToAddress,getPaymentLogsByFromAddress,updatePaymentLogStatus } from './db/db_payment_logs.js';
import redis from './redisClient.js';
import { exec } from 'child_process';
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

// 请求日志中间件：打印每个请求的方法和路径
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 静态文件服务：提供 file 文件夹下的图片访问
app.use('/file', express.static('file'));

const server = http.createServer(app); // 需要用 http server 包裹 express
const wss = new WebSocketServer({ server }); // 挂载 WS 到 HTTP server
// 内存中存储 requestId -> WebSocket 的映射
// 生产环境如果是多实例部署，需要用 Redis Pub/Sub 替代
const pendingConnections = new Map();

// 1. 处理 WebSocket 连接
wss.on('connection', (ws, req) => {
    // 解析 URL 参数 ?requestId=...
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const requestId = urlParams.get('requestId');

    if (requestId) {
        console.log(`[WS] Client connected for request: ${requestId}`);
        pendingConnections.set(requestId, ws);

        ws.on('close', () => {
            pendingConnections.delete(requestId);
        });
    }
});
// 路由
app.get('/', async (req, res) => {
    // console.log(await stakeTrxForEnergy('TKvo8fmFeMhpDmhLqqebdeoCCYGg2ECduG'))
    // console.log(await stakeTrx(11))
    // console.log(await getUserAssetValue('TELin7GWhGircd9NyNM3h7aewufzYbr7wb'))
    //     console.log(await getExchangeRate())
    await injectReward(10)
    console.log(await getStakePrincipal('TELin7GWhGircd9NyNM3h7aewufzYbr7wb'))
  res.send('Hello, Express!');
});

app.post('/getStakeInfo', async (req, res) => {
    const {address} = req.body;
    if (!address) {
        return res.status(400).json({ code: -1, error: 'Address query parameter is required' });
    }
    try {
        const {exchangeRate, yieldPercent} = await getExchangeRate();
        const vault =  await getStakePrincipal(address);
        const safeVault = typeof vault === 'bigint' ? vault.toString() : vault;
        const safeExchangeRate = typeof exchangeRate === 'bigint' ? exchangeRate.toString() : exchangeRate;
        const safeYieldPercent = typeof yieldPercent === 'bigint' ? yieldPercent.toString() : yieldPercent;
        res.json({ code: 0, vault: safeVault, exchangeRate: safeExchangeRate, yieldPercent: safeYieldPercent });
    } catch (error) {       
        console.error('Error fetching stake info:', error);      
        res.status(500).json({ code: -1, error: 'Failed to fetch stake info' });
}
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
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_AUTH_CALLBACK_URL // 必须与 Google Console 配置完全一致
    );
    
    try {
        // 1. 用 Code 换取 Google 的 Tokens (包含 id_token, access_token)
        const { tokens } = await client.getToken(code);
        console.log('Google Tokens:', tokens);
        // 2. 验证 id_token 的合法性，并解析用户信息
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        // payload 包含: email, name, picture, sub (google user id)
        const { sub, email, name, picture } = payload;

        // 3. 【业务逻辑】在这里查询或注册你的数据库用户
        // let user = await db.User.find({ googleId: sub });
        // if (!user) user = await db.User.create({ ... });

        // 4. 签发你自己的后端 Session Token (用于后续 API 调用)
        const appToken = jwt.sign(
            { userId: sub, email, platform: "google" }, // 你的用户标识
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('Google Auth Success:', { userId: sub, email, name });


        const socialData = {
            social_platform: 'google',
            social_platform_user_id: sub,
            username: name,
            avatar_url: picture,
            email
        };

        let walletData = {};
        let userInfo = {}
        try {
            const existingUser = await getUserInfoBySocialPlatform('google', sub);
            
            // if (!existingUser) {
            //     // Create new wallet
            //     const wallet = await createWallet();
            //     walletData = {
            //         wallet_address: wallet.address,
            //         public_key: wallet.publicKey,
            //         private_key_encrypted: encryptPrivateKey(wallet.privateKey)
            //     };
            // }
            
            const { user, isNewUser } = await loginOrRegister(socialData, walletData);
            userInfo = user;
        } catch (error) {
            console.error('User registration error:', error);
        }

        // 5. 返回数据给前端
        res.json({
            message: 'Login successful',
            appToken: appToken,       // 用于访问你的 Express API
            user: { name, email, picture, platform: "google" },
            // 【关键】将原始 id_token 返回给前端，用于 Web3 AA (Sui zkLogin / MPC)
            googleIdToken: tokens.id_token,
            walletAddress: userInfo.wallet_address || null
        });

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Authentication failed' });
    }
});

app.post('/updateWallet', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ code: -1, error: 'Wallet address is required' });
        }

        const user = await getUserInfoBySocialPlatform('google', userId);
        console.log('Updating wallet for user:', user);
        await updateUserWalletAddress(user.id, walletAddress);

        res.status(200).json({ code: 0, message: 'Wallet address updated successfully' });
    } catch (error) {
        console.error('updateWallet error:', error);
        res.status(500).json({ code: -1, error: error.message });
    }
});

app.post('/approveContract', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;

        const user = await getUserInfoBySocialPlatform('google', userId);
        await approveContract(user.id);

        res.status(200).json({ code: 0, message: 'approved successfully' });
    } catch (error) {
        console.error('approveContract error:', error);
        res.status(500).json({ code: -1, error: error.message });
    }
});

app.post('/executeBatchPayment', async (req, res) => {
    try {
        const { buyer, seller, amount, orderId } = req.body;

        if (!buyer || !seller || amount === undefined || amount === null || !orderId) {
            return res.status(400).json({ code: -1, error: 'Missing required fields: buyer, seller, amount, orderId' });
        }

        const txId = await executeBatchPayment([buyer], [seller], [amount], [orderId]);
        res.status(200).json({ code: 0, txId });
    } catch (error) {
        console.error('executeBatchPayment error:', error);
        res.status(500).json({ code: -1, error: error.message });
    }
});

//添加、编辑公用接口 - 支出密钥
app.post('/saveKeys', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        let access_key
        const {
            id,
            name,
            spending_limit,
            period_seconds,
            rate_limit,
            status,
            metadata,
            currency,
            budget_limit,
            budget_usage,
            budget_period,
            approval_mode,
            auto_approve_limit,
            rate_limit_max,
            rate_limit_period,
            current_rate_usage,
            allowed_addresses,
            blocked_addresses,
            allowed_skills,
            allowed_merchant_categories,
            alert_threshold_percent,
            expires_at
        } = req.body;
        if (!id) {
            access_key = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        }

        const user = await getUserInfoBySocialPlatform('google', userId)
        console.log(budget_usage)
        const payload = {
            user_id: user.id,
            name: name || null,
            access_key,
            status: (status || 'ACTIVE').toUpperCase(),
            currency: currency || 'USDT',
            budget_limit: budget_limit ?? spending_limit ?? 0,
            budget_usage: budget_usage || 0,
            budget_period: budget_period || 'TOTAL',
            approval_mode: approval_mode || 'HYBRID',
            auto_approve_limit: auto_approve_limit || 0,
            rate_limit_max: rate_limit_max ?? rate_limit ?? -1,
            rate_limit_period: rate_limit_period || 'DAILY',
            current_rate_usage: current_rate_usage ?? 0,
            allowed_addresses: allowed_addresses ?? null,
            blocked_addresses: blocked_addresses ?? null,
            allowed_skills: allowed_skills ?? null,
            allowed_merchant_categories: allowed_merchant_categories ?? null,
            alert_threshold_percent: alert_threshold_percent ?? 80,
            expires_at: expires_at || null,
            metadata: metadata || {},
            period_seconds: period_seconds
        };

        let keyData
        if (!id) {
            const newKeyId = await createSpendingKey(payload);
            keyData = await getSpendingKeyById(newKeyId);
        }else{
            keyData = await updateSpendingKey(id, payload);
        }
       

        res.status(201).json({ code: 0, data: keyData });
    } catch (error) {
        console.error('addKeys error:', error);
        res.status(500).json({ code: -1, error: error.message });
    }
});
app.post('/listKeys', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        // 可选：从请求体接收筛选/分页参数（如果后端实现支持）
        // const { status, limit, offset } = req.body;
        const user = await getUserInfoBySocialPlatform('google', userId)

        const keys = await getSpendingKeysByUserId(user.id);
        res.status(200).json({ code: 0, data: keys });
    } catch (error) {
        console.error('listKeys error:', error);
        res.status(500).json({ code: -1, error: error.message });
    }
});

app.post('/delKeys', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ code: -1, error: 'Key id is required' });
        }

        const user = await getUserInfoBySocialPlatform('google', userId);
        const key = await getSpendingKeyById(id);

        if (!key) {
            return res.status(404).json({ code: -1, error: 'Key not found' });
        }

        if (key.user_id !== user.id) {
            return res.status(403).json({ code: -1, error: 'Unauthorized' });
        }

        const result = await deleteSpendingKey(id);

        if (result) {
            res.status(200).json({ code: 0, message: 'Key deleted successfully' });
        } else {
            res.status(500).json({ code: -1, error: 'Failed to delete key' });
        }
    } catch (error) {
        console.error('delKeys error:', error);
        res.status(500).json({ code: -1, error: error.message });
    }
});


app.post('/getWalletInfo', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        
        
        const user = await getUserInfoBySocialPlatform('google', userId)
 
        const balance = await getBalance(user.wallet_address);
        const account = await getAccount(user.wallet_address);
        res.status(200).json({ code: 0, data: { balance, account, address: user.wallet_address, is_approved: user.is_approved } });

    } catch (error) {
        res.status(500).json({ code: -1, error: error.message });
    }
});

app.post('/createPaymentLog', async (req, res) => {
    try {
        const { requestId, accessKey, fromAddress, toAddress, amount, status, txHash, errorMessage } = req.body;

        if (!requestId || !accessKey || !fromAddress || !toAddress || amount === undefined) {
            return res.status(400).json({ code: -1, error: 'Missing required fields' });
        }


        
        const logData = {
            user_id: user.id,
            request_id: requestId,
            from_address: fromAddress,
            to_address: toAddress,
            amount,
            status: status || 'PENDING',
            tx_hash: txHash || null,
            error_message: errorMessage || null,
            created_at: new Date()
        };

        const result = await createPaymentLog(logData);
        res.status(201).json({ code: 0, data: result });
    } catch (error) {
        console.error('createPaymentLog error:', error);
        res.status(500).json({ code: -1, error: error.message });
    }
});

app.post('/listPaymentLogs', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { page = 1, pageSize = 8 } = req.body;

        const user = await getUserInfoBySocialPlatform('google', userId);
        
        const offset = (page - 1) * pageSize;
        const logs = await getPaymentLogsByFromAddress(user.wallet_address, { limit: pageSize, offset });

        res.status(200).json({ 
            code: 0, 
            data: logs.data, 
            total: logs.total, 
            page, pageSize, 
            successCount: logs.successCount, 
            pendingCount: logs.pendingCount, 
            riskBlockedCount: logs.riskBlockedCount 
        });
    } catch (error) {
        console.error('listPaymentLogs error:', error);
        res.status(500).json({ code: -1, error: error.message });
    }
});

// /verify endpoint: 检查签名有效性
app.post('/verify', async (req, res) => {
  try {
    const riskEngine  = new RiskEngine();
    const { from, to, value, signature, message } = req.body;

    const isValid =  riskEngine.makeDecision();

    res.json({ isValid: true });
  } catch (error) {
    console.error('[/verify] ✗ Error:', error.message);
    res.status(400).json({ isValid: false, error: error.message });
  }
});

// /settle endpoint: 广播转移 tx
app.post('/settle', async (req, res) => {
  try {


    const { authorization, signature } = req.body;

    authorization.orderid = 'orderid' + authorization.nonce;
    
    // 将支付请求加入 Redis 列表，等待后台批量处理  
    await redis.rpush(
        "batch:payments",
        JSON.stringify(authorization)
    );


    res.json({ success: true});
  } catch (error) {
    console.log('[/settle] ✗ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

setInterval(async () => {
  const orders = await redis.lrange("batch:payments", 0, -1);

  if (!orders.length) return;
  
  // 清空队列
  await redis.del("batch:payments");

  const parsed = orders.map(o => JSON.parse(o));

  const payers = [];
  const recipients = [];
  const amounts = [];
  const orderIds = [];

  for (const authorization of parsed) {
    payers.push(authorization.from);
    recipients.push(authorization.to);
    amounts.push(authorization.value);
    orderIds.push(authorization.orderid    ); // 或你真实 orderId
  }

  const validationResult = await validateBatchPayment(payers, recipients, amounts, orderIds);
  console.log('批量验证结果:', validationResult);

    let execPayers = payers;
    let execRecipients = recipients;
    let execAmounts = amounts;
    let execOrderIds = orderIds;

    if (!validationResult?.success) {
        const failedIndexes = (validationResult?.failedIndexes || []).map((idx) => Number(idx));
        const failedSet = new Set(failedIndexes);

        execPayers = [];
        execRecipients = [];
        execAmounts = [];
        execOrderIds = [];

        for (let i = 0; i < payers.length; i++) {
            if (failedSet.has(i)) {
                continue;
            }
            execPayers.push(payers[i]);
            execRecipients.push(recipients[i]);
            execAmounts.push(amounts[i]);
            execOrderIds.push(orderIds[i]);
        }
    }

    if (execPayers.length === 0) {
        console.log('批量验证失败：无可执行的订单');
        return;
    }

    const txid = await executeBatchPayment(execPayers, execRecipients, execAmounts, execOrderIds);
  for (const authorization of parsed) {
    const updateData = {
        tx_hash : txid,
        tx_status : 'success'
    }
    const cleanOrderId = authorization.orderid.replace(/^orderid/, '');
    await updatePaymentLogStatus(cleanOrderId, updateData);
  }

  //轮询交易状态    
  checkTxStatus(txid);
  

}, 5000);

app.post('/check-risk', async (req, res) => {
    try {
        const { from, to, value, policy, ...otherData } = req.body;

        if (!from || !to || value === undefined) {
            return res.status(400).json({ code: -1, error: 'Missing required fields: from, to, value' });
        }

        const requestId = uuidv4();
        const user = await getUserByWalletAddress(from);
        const policyData = await getPolicyByName(user.id, policy);

        const riskEngine  = new RiskEngine();
        const decision = riskEngine.makeDecision(policyData, req.body);
        console.log('Risk decision:', decision);


        // 风控检查逻辑
        const riskAssessment = {
            from,
            to,
            value,
            policy: policy || 'DEFAULT',
            timestamp: Date.now(),
            allowed: decision.allowed,
            reason: decision.reason,
            status: decision.status,
            requestId: requestId
        };

        await createPaymentLog({
            from_address: from,
            to_address: to,
            amount: value,
            status: riskAssessment.status,
            trace_id : requestId,
            request_id: requestId,
        invoice_id: otherData.invoiceId, //string
        x402_version : 1,
        service_component : 'facilitator',
        amount_atomic:0.000001,
        amount_display : value / 1_000_000,
        asset_symbol : 'USDT',
        asset_contract : 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf', // Nile测试链 USDT TRC20 合约地址
        network : otherData.network,
        order_type : 'standard',
        risk_policy : policy,
        risk_decision : riskAssessment.status,
        risk_reason : riskAssessment.reason,
        latency_ms : 0,
        latency_chain_ms : 0,
        user_agent : '',
        extra_meta : null,
        batch_id : null,
        batch_index : 0,
        is_aggregated : 0
        });

        res.status(200).json({ success: riskAssessment.allowed, data: riskAssessment });
    } catch (error) {
        console.error('check-risk error:', error);
        res.status(500).json({ code: -1, error: error.message });
    }
});

app.post('/pendingApprove', async (req, res) => {
    try {
        const { requestId } = req.body;

        if (!requestId) {
            return res.status(400).json({ code: -1, error: 'requestId is required' });
        }

        const ws = pendingConnections.get(requestId);

        if (!ws) {
            return res.status(404).json({ code: -1, error: 'No pending connection found for this requestId' });
        }

        ws.send(JSON.stringify({ status: 'approved', requestId }));
        res.status(200).json({ code: 0, message: 'Approval message sent' });
    } catch (error) {
        console.error('pendingApprove error:', error);
        res.status(500).json({ code: -1, error: error.message });
    }
});




// 启动服务器
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});