import express from 'express';
import { server } from 'tron-x402';

const { x402Gate } = server;

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
	res.status(200).json({ status: 'ok' });
});

// 配置
const SELLER_ADDRESS = 'TUzz9HKrE5sgzn5RmGKG35caEyqvawoKga'; 
const RESOURCE_PRICE = 1; // 1 USDT (假设精度6)
app.get('/premium-data', 
  // 1. 挂载 x402 支付门禁中间件
  x402Gate({
    // [变更点1] 配置项名称统一为 recipient (对应链上的 to)
    recipient: SELLER_ADDRESS, 
    price: RESOURCE_PRICE,       // 1000000 (1 USDT)
    asset: 'USDT',               // 资产符号
    network: 'tron:0x2b6653dc',  // Tron Mainnet 标识
  }), 
  
  // 2. 支付成功后的业务逻辑
  (req, res) => {
    // 能走到这里，说明 req.payment 已经被中间件赋值
    // req.payment 结构: { from, to, value, txId, invoiceId }
    console.log('【test info】', req.payment); // 添加调试信息
    
    console.log(`[Success] Payment verified for Invoice: ${req.payment.invoiceId}`);

    res.json({ 
      status: "success",
      data: "这里是价值 1 USDT 的核心付费数据...", 
      receipt: {
        txId: req.payment.txId,
        // [变更点2] 字段名统一为 from (对应链上的 payer)
        from: req.payment.from,  
        invoiceId: req.payment.invoiceId,
        amount: req.payment.value // 可选：返回实际支付金额
      }
    });
  }
);

const port = 4444;

app.listen(port, () => {
	console.log(`API server listening on port ${port}`);
});
