// // const MyContract = artifacts.require('./MyContract.sol');

// module.exports = function (deployer) {
//   // deployer.deploy(MyContract);
// };

const AgentPay = artifacts.require("AgentPayBatch");

module.exports = async function(deployer, network, accounts) {
  // 这里填 Nile 测试 USDT 合约地址（Base58），建议通过环境变量提供
  const usdtAddress = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
  if (!usdtAddress) {
    throw new Error("Missing USDT_ADDRESS env var (Base58 TRON address). Set it before migrate.");
  }
  await deployer.deploy(AgentPay, usdtAddress);
};
