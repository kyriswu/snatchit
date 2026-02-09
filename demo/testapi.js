import { client } from 'tron-x402';
const { PaymentAgent } = client

// ==========================================
// 1. 配置测试参数
// ==========================================

// [Buyer] 测试用的买家私钥 (请确保这是测试网钱包，或者不要泄露)
// 这里随便填一个格式正确的私钥用于测试逻辑，实际需要对应有余额的钱包
const BUYER_PRIVATE_KEY = '9003554eb0c8945383e8b1e650be96c39a29e79270c3ce0d387893bf30e1b55b'; 

// [Infrastructure] 服务地址
const SERVER_URL = 'http://localhost:4444/premium-data'; // 你的 Server 接口

// ==========================================
// 2. 初始化 Agent
// ==========================================
console.log("Initializing AI Payment Agent...");

const agent = new PaymentAgent({
    privateKey: BUYER_PRIVATE_KEY,
    policyName: 'AutoGPT-shopping', // 比如：基础用户策略、VIP策略、测试策略
    maxBudget: 5000000,
    network: 'nile', // 或 'nile' 测试网
});

console.log(`Agent Address: ${agent.myAddress}`);

// ==========================================
// 3. 执行测试流程
// ==========================================
async function runTest() {
    try {

        // SDK 会自动处理: 
        // 1. 收到 402 
        // 2. 解析 Header 
        // 3. 请求 Facilitator 风控 
        // 4. EIP-712 签名 
        // 5. 重试请求
        const response = await agent.get(SERVER_URL);

        console.log('---------------------------------------------------');
        console.log('✅ [Test Success] Data Received!');
        
        // 打印服务端返回的凭据信息
        if (response.data.receipt) {
            console.log('\nReceipt Details:');
            console.log(`- From: ${response.data.receipt.from}`);
            console.log(`- Invoice: ${response.data.receipt.invoiceId}`);
        }

    } catch (error) {
        console.log('---------------------------------------------------');
        console.error('❌ [Test Failed]');
        
        if (error.response) {
            // 服务器返回了错误状态码 (如 403, 500)
            console.error(`Status: ${error.response.status}`);
            console.error('Server Error:', error.response.data);
        } else {
            // 代码执行错误或网络错误
            console.error('Error Message:', error.message);
        }
    }
}

// 运行
// 并发调用 50 次 runTest
async function runConcurrentTests() {
    const tasks = Array.from({ length: 30 }, () => runTest());
    await Promise.all(tasks);
    console.log('✅ 50 tests completed.');
}

runConcurrentTests();