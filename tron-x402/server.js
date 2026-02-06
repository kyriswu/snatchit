// server.js
import axios from 'axios';
import { randomBytes, sign } from 'crypto';
import { createFacilitatorClient } from './facilitator.js';


/**
 * Express Middleware: x402 Payment Gate
 */
const x402Gate = (options) => {
    // 1. 配置项统一：使用 'recipient' 代替 'seller'
    const config = {
        asset: "USDT",
        network: "tron:0x2b6653dc", 
        recipient: options.recipient, // 必填：收款钱包地址
        price: options.price          // 必填：价格 (Sun)
    };

    if (!config.recipient || !config.price) {
        throw new Error("[x402Gate] Missing required options: recipient, price.");
    }

    // 初始化 Facilitator 客户端
    const facilitatorClient = createFacilitatorClient();

    return async (req, res, next) => {
        const payloadStr = req.headers['x-402-payload'];

        // ============================================================
        // Branch A: 未支付 -> 返回 402 (Payment-Required)
        // ============================================================
        if (!payloadStr) {
            const invoiceId = BigInt(`0x${randomBytes(16).toString('hex')}`).toString();
            const paymentRequirements = {
                amount: config.price.toString(),
                asset: config.asset,
                network: config.network,
                recipient: config.recipient, // 统一字段：recipient
                invoiceId,
                expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
                callbackUrl: ""
            };

            const base64Data = Buffer.from(JSON.stringify(paymentRequirements)).toString('base64');
            res.set('Payment-Required', base64Data);
            
            return res.status(402).json({
                error: "Payment Required",
                message: "See 'Payment-Required' header for details."
            });
        }

        // ============================================================
        // Branch B: 已支付 -> 验证 Payload
        // ============================================================
        try {
            const clientData = JSON.parse(payloadStr);

            if (clientData.x402Version !== 1 || 
                !clientData.payload?.authorization || 
                !clientData.payload?.signature) {
                return res.status(400).json({ error: "Invalid payload structure" });
            }

            const { authorization, signature } = clientData.payload;
            console.log(`[x402] Verifying payment from ${authorization.from} to ${authorization.to} of amount ${authorization.value}`);
            console.log (`signature: ${signature}`);
            // --- 校验逻辑 ---
            
            // 1. 校验收款人 (Authorization.to vs Config.recipient)
            if (authorization.to !== config.recipient) {
                return res.status(400).json({ error: "Wrong recipient address" });
            }

            // 2. 校验金额 (Authorization.value vs Config.price)
            if (BigInt(authorization.value) < BigInt(config.price)) {
                return res.status(402).json({ error: "Insufficient payment amount" });
            }

            // 3. 校验有效期
            if (authorization.validBefore < Math.floor(Date.now() / 1000)) {
                return res.status(400).json({ error: "Signature expired" });
            }

            // --- 结算逻辑 ---

            const settleResponse = await facilitatorClient.settle({
                authorization, // 直接透传标准对象 { from, to, value... }
                signature
            });

            console.log('[x402] Facilitator response:', JSON.stringify(settleResponse, null, 2));

            if (settleResponse.success) {
                // 4. 成功放行
                // 挂载的数据也保持统一：from, to, value
                req.payment = {
                    from: authorization.from,    // 以前叫 buyer，现在统一叫 from
                    to: authorization.to,        // 以前叫 seller，现在统一叫 to
                    value: authorization.value,  // 金额
                    txId: settleResponse.txId,
                    invoiceId: authorization.nonce
                };
                console.log('[x402] Payment verified, calling next()');
                return next(); 
            } else {
                return res.status(403).json({ error: "Settlement declined" });
            }

        } catch (err) {
            console.log(err.response)
            const msg = err.response?.data?.error || err.message;
            const stack = err.stack?.split('\n')[1] || 'unknown location';
            console.error(`[x402] Error at line 105: ${msg}\n${stack}`);
            return res.status(403).json({ error: "Verification failed", details: msg });
        }
    };
};

export { x402Gate };