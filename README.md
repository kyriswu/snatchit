

<h1 align="center">TFx402</h1>

TFx402 是一个基于 Tron 的、面向 AI Agent 的智能facilitator，支持 x402 协议。它专注于低手续费转账、严格的资金安全管控，以及可靠的实时处理能力。

## 亮点

- Tron 网络手续费低
- 原生支持 x402 协议
- 账户资金安全管控
- 安全、实时的支付处理
- 支持交易历史查询与审计
- 闲置资金质押产生额外收益

## 技术亮点

- 高频聚合
	1. 成本友好：通过将多笔交易聚合/打包，批量交易，压缩成本
	2. 安全性：simulateValidate 链上验证器确保交易账户资金有效，避免双花问题
    3. 实时性：基于乐观方式，验证器验证通过后，提示用户交易成功，提高实时性
- 风控策略
![封控策略](https://github.com/kyriswu/TFx402/blob/main/risk-policy.png)
    1. 多种策略配置有效管控资金安全
    2. 支持小额免密支付
- 质押闲置资产，获取额外收益
![封控策略](https://github.com/kyriswu/TFx402/blob/main/stake.png)
    1. 用户将资金质押给平台，年化3%-5%
    2. 平台将资金通过Justlend租赁Energy，用于降低交易成本
    3. 全部staking通过合约锁定，安全有保证
