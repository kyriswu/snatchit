import axios from 'axios';
import WebSocket from 'ws';
import TronWebPkg from 'tronweb';
import { createFacilitatorClient } from './facilitator.js';

const TronWeb = TronWebPkg.TronWeb || TronWebPkg;


// [变更1] 直接写死支付合约地址 (SDK 绑定特定合约)
// 这是你部署在链上的 x402 验证合约地址
const CONST_PAYMENT_CONTRACT = 'TS9vEcWUkPZ9LtiC2D5XtM8e8ZDwgS82K2';
const wsUrl = 'ws://localhost:4000'; // 假设你的 Facilitator WebSocket 服务地址

class PaymentAgent {
    /**
     * @param {Object} config
     * @param {string} config.privateKey - Payer 私钥
     * @param {string} config.policyName - 策略名称 (传给 Facilitator 做判断)
     * @param {string} config.facilitatorUrl - (可选) Facilitator 服务地址，默认 http://localhost:4000
     * @param {number} config.maxBudget - (可选) 本地兜底预算
     * @param {string} config.network - (可选) 'mainnet' 或 'nile'
     */
    constructor({ privateKey, policyName, facilitatorUrl, maxBudget = Infinity, network = 'mainnet' }) {
        if (!privateKey) throw new Error("Private key is required");
        if (!policyName) throw new Error("Policy Name is required for risk check");

        this.privateKey = privateKey;
        this.policyName = policyName;
        this.maxBudget = maxBudget;
        this.networkLabel = network === 'mainnet' ? 'tron' : 'tron-testnet';
        
        // 初始化 Facilitator 客户端
        this.facilitatorClient = createFacilitatorClient(
            facilitatorUrl ? { baseUrl: facilitatorUrl } : {}
        );
        
        // 自动根据网络选择节点
        const fullHost = network === 'mainnet' ? 'https://api.trongrid.io' : 'https://api.nileex.io';
        this.tronWeb = new TronWeb({
            fullHost: fullHost,
            privateKey: this.privateKey
        });
        
        this.myAddress = this.tronWeb.address.fromPrivateKey(this.privateKey);
    }

    // 封装 GET/POST
    async get(url, config = {}) { return this._request('GET', url, null, config); }
    async post(url, data, config = {}) { return this._request('POST', url, data, config); }

    async _request(method, url, data, config) {
        try {
            return await axios({ method, url, data, ...config });
        } catch (error) {
            if (error.response && error.response.status === 402) {
                return this._handlePaymentAuth(url, error.response, { method, data, ...config });
            }
            throw error;
        }
    }

    /**
     * 处理 402 握手流程
     */
    async _handlePaymentAuth(url, errorResponse, originalRequest) {
        // 1. 解码 Header
        const base64Header = errorResponse.headers['payment-required'];
        if (!base64Header) throw new Error("[x402] Missing 'Payment-Required' header");
        
        let reqData;
        try {
            reqData = JSON.parse(Buffer.from(base64Header, 'base64').toString('utf-8'));
        } catch (e) {
            throw new Error("[x402] Failed to decode payment requirements");
        }

        console.log(`[x402] Payment Request: ${reqData.amount} ${reqData.asset} -> ${reqData.recipient}`);

        // 2. 本地基础兜底
        if (BigInt(reqData.amount) > BigInt(this.maxBudget)) {
            throw new Error(`[x402] Budget Exceeded: ${reqData.amount} > ${this.maxBudget}`);
        }

        // ============================================================
        // 3. 远程风控检查 (Call Facilitator)
        // ============================================================
        try {
            console.log(`[x402] Checking risk policy: "${this.policyName}"...`);
            
            // 构造风控 Payload
            const riskCheckPayload = {
                ...reqData,          
                from: this.myAddress,   
                to: reqData.recipient,  
                value: reqData.amount,
                // [变更3] 增加策略名称，供 Facilitator 判断
                policy: this.policyName 
            };
            console.log('Risk Check Payload:', riskCheckPayload);

            const riskResponse = await this.facilitatorClient.checkRisk(riskCheckPayload);
            
            if (!riskResponse.success) {
                console.log(riskResponse)
                throw new Error(`Risk check failed: ${riskResponse.data.reason}`);
            }
        
            if (riskResponse.data.status === 'pending') {
                const { from, to, value, requestId } = riskResponse.data.data;
                
                console.log(`\n=============================================`);
                console.log(`[x402] ⚠️  WAITING FOR APPROVAL  ⚠️`);
                console.log(`[x402] Connecting WebSocket for updates...`);
                console.log(`=============================================\n`);

                // [新增] 3.2 建立 WebSocket 等待推送
                await this._waitForApprovalWebSocket(requestId);
                
                console.log("[x402] Approval confirmed via WebSocket!");
            } 
            else if (!riskResponse.data.allowed) {
                throw new Error("Facilitator denied the transaction risk check");
            }
            console.log("[x402] Risk check passed.");

        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            throw new Error(`[x402] Risk Check Failed: ${msg}`);
        }

        // ============================================================
        // 4. 签名流程 (EIP-712)
        // ============================================================
        const now = Math.floor(Date.now() / 1000);
        const validBefore = Math.floor(new Date(reqData.expiresAt).getTime() / 1000);

        const domain = {
            name: 'TronPay',
            version: '1',
            chainId: 1, 
            // [变更1] 使用写死的合约地址
            verifyingContract: CONST_PAYMENT_CONTRACT
        };

        const types = {
            Payment: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'validAfter', type: 'uint256' },
                { name: 'validBefore', type: 'uint256' },
                { name: 'nonce', type: 'uint256' }
            ]
        };

        const authorization = {
            from: this.myAddress,
            to: reqData.recipient,
            value: reqData.amount,
            validAfter: now,
            validBefore: validBefore,
            nonce: reqData.invoiceId 
        };

        const signature = await this.tronWeb.trx.signTypedData(domain, types, authorization, this.privateKey);

        // ============================================================
        // 5. 构造最终 Payload 并重试
        // ============================================================
        const finalPayload = {
            x402Version: 1,
            scheme: "exact",
            network: this.networkLabel,
            payload: {
                signature: signature,
                authorization: authorization
            }
        };

        const newHeaders = {
            ...originalRequest.headers,
            'x-402-payload': JSON.stringify(finalPayload)
        };

        return axios({
            method: originalRequest.method,
            url: url,
            data: originalRequest.data,
            headers: newHeaders
        });
    }

    /**
     * [新增] WebSocket 监听器
     * 使用 Promise 封装，直到收到 approved 消息才 resolve
     */
    _waitForApprovalWebSocket(requestId) {
        return new Promise((resolve, reject) => {
            // 构造 WS 连接，通常在 URL query 中带上 requestId 方便服务端识别
            const ws = new WebSocket(`${wsUrl}?requestId=${requestId}`);

            // 设置超时机制 (例如 3 分钟)，防止 WS 连着不放
            const timeout = setTimeout(() => {
                ws.terminate(); // 强制断开
                reject(new Error("Risk approval timed out (WebSocket)"));
            }, 1000 * 60 * 600);

            ws.on('open', () => {
                process.stdout.write("[WS] Connected. Waiting...\n");
            });

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data);
                    // 服务端推送: { status: 'approved' } 或 { status: 'rejected' }
                    if (msg.status === 'approved' || msg.allowed === true) {
                        clearTimeout(timeout);
                        ws.close();
                        resolve(true); // 成功！
                    } else if (msg.status === 'rejected') {
                        clearTimeout(timeout);
                        ws.close();
                        reject(new Error("User denied the request"));
                    }
                } catch (e) {
                    console.error("WS Parse Error:", e);
                }
            });

            ws.on('error', (err) => {
                clearTimeout(timeout);
                reject(new Error(`WebSocket error: ${err.message}`));
            });

            ws.on('close', () => {
                // 如果连接意外断开且没超时，可以选择 reject 或重连(这里简化为 reject)
                // 在 resolve 后调用的 close 不会触发这里的逻辑问题，因为 Promise 状态不可变
            });
        });
    }
}

export { PaymentAgent };