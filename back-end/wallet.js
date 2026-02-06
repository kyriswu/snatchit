import 'dotenv/config';
import * as TronWebPkg from "tronweb";
// import { updatePaymentLogStatus } from './db/db_payment_logs';  

// 从包中提取 TronWeb 类
// 注意：有时候可能是 TronWebPkg.TronWeb，视具体编译环境而定
const TronWeb = TronWebPkg.TronWeb;

const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_NODE,
    privateKey: process.env.PLATFORM_WALLET_PRIVATE_KEY
});
export async function sendTrx(userPrivateKey, to, amountSun) {

    tronWeb.setPrivateKey(userPrivateKey);

    const tx = await tronWeb.trx.sendTransaction(
        to,
        amountSun
    );

    console.log(tx);

    return tx;
}
 
export async function getConfirmedTransaction(txid) {
    const txInfo = await tronWeb.trx.getConfirmedTransaction(txid);
    console.log(txInfo.ret);
    
    return txInfo.ret;
}

export async function getTransactionInfo(txid) {
  try {
    const info = await tronWeb.trx.getTransactionInfo(txid);
    return info
  } catch (e) {
    return false;
  }
}
export async function createWallet() {
    const account = await TronWeb.createAccount();
    
    return {
        address: account.address.base58,
        privateKey: account.privateKey,
        publicKey: account.publicKey
    };
}
export async function getBalance(address) {
    try {
        const balance = await tronWeb.trx.getBalance(address);
        return balance;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getAccount(address) {
    const account = await tronWeb.trx.getAccount(address);
    return account;
}

export async function getUSDTBalance(address) {
    const contract = await tronWeb.contract().at("TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf");
    const balance = await contract.balanceOf(address).call();
    // USDT 在 TRON 上通常是 6 位小数
    console.log(`USDT Balance: ${balance / 1_000_000}`);
    return balance;
}

export async function executePayment(buyer, seller, amount, orderId) {

    const agentPayAddress = "TS9vEcWUkPZ9LtiC2D5XtM8e8ZDwgS82K2";
    const agentPayContract = await tronWeb.contract().at(agentPayAddress);

//      console.log("buyer valid:", tronWeb.isAddress(buyer));
// console.log("seller valid:", tronWeb.isAddress(seller));

    const tx = await agentPayContract.executePayment(buyer, seller, amount, orderId).send({
        feeLimit: 100_000_000
    });
    console.log("交易已广播，TXID:", tx);
    return tx;
}

export async function executeBatchPayment(buyer, seller, amount, orderId) {

    const agentPayAddress = "TFdSFLMVN7qqDZgnuzQh2DocQjYPaX8ex9"; //agentPayBatch 合约地址
    const agentPayContract = await tronWeb.contract().at(agentPayAddress);

    const tx = await agentPayContract.executeBatchPayments(buyer, seller, amount, orderId).send({
        feeLimit: 100_000_000
    });
    console.log("批量交易已广播，batchId:", tx);
    return tx;
}


export async function transferWithAuthorization(contractAddress, payload) {
    const {authorization, signature} = payload;
    // 这里的 signature 应该是一个字符串,然后需要验证，但是为了简化流程，这里直接使用
    try {
        const contract = await tronWeb.contract().at(contractAddress);
        // const tx = await contract.transferWithAuthorization(
        //     authorization.from,
        //     authorization.to,
        //     authorization.amount,
        //     authorization.nonce,
        //     authorization.deadline,
        //     signature
        // ).send({ feeLimit: 100_000_000 });
        console.log(authorization)
         const tx = await contract.executePayment(authorization.from, authorization.to, authorization.value, "fsdfjsldkjf").send({
        feeLimit: 100_000_000
    });
    console.log("交易成功，TXID:", tx);
     
        return { success: true, txId: tx};
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function checkTxStatus(txID) {
let confirmed = false;
let attempts = 0;
const maxAttempts = 60; // 最多轮询 60 次（1分钟）

while (!confirmed && attempts < maxAttempts) {
    try {
        const txInfo = await tronWeb.trx.getTransactionInfo(txID);
        console.log('查询交易状态:', txInfo);
        if (!txInfo || Object.keys(txInfo).length === 0) {
            console.log('交易不存在或尚未确认，等待中...');
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }

        const contractRet = txInfo.receipt?.result || '未知';
        if (contractRet === 'SUCCESS') {
            console.log('✅ 交易成功 (SUCCESS)');
            console.log('区块高度:', txInfo.blockNumber);
            console.log('Energy 使用:', txInfo.receipt?.energy_usage_total);
            console.log('Fee (sun):', txInfo.receipt?.net_fee);
            confirmed = true;
            1.拿到交易的整体信息
            const events = await getEvents(txID);
            2.拿到每个交易的详细信息
            3.更新数据库状态
            // await updatePaymentLogStatus();
            return txInfo;
        } else {
            console.log(`❌ 交易失败: ${contractRet}`);
            confirmed = true;
            return txInfo;
        }
    } catch (err) {
        console.error('查询失败:', err);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

if (!confirmed) {
    console.log('轮询超时，交易确认失败');
}
}

/**
 * Fetches events associated with a specific transaction ID from the TRON blockchain.
 *
 * @async
 * @function getEvents
 * @param {string} transactionId - The ID of the transaction for which to fetch events.
 * @returns {Promise<Array>} A promise that resolves to an array of event data associated with the transaction.
 * @throws {Error} Throws an error if the fetch operation fails.
 */
export async function getEvents(transactionId) {
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'TRON-PRO-API-KEY': 'b8ffb487-90b6-47b1-9f68-017c50be4d3c'
        }
    };

    try {
        const base = process.env.TRONGRID_API_BASE || 'https://nile.trongrid.io';
        const response = await fetch(`${base}/v1/transactions/${transactionId}/events?only_confirmed=true`, options);
        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`TronGrid returned ${response.status}: ${txt}`);
        }
        const data = await response.json();
        return (data && data.data) ? data.data : [];
    } catch (err) {
        console.error('getEvents error:', err);
        throw err;
    }
}

    

//     const options = {method: 'GET', headers: {accept: 'application/json'}};

// fetch(`https://api.shasta.trongrid.io/v1/transactions/${transactionId}/events`, options)
//   .then(res => res.json())
//   .then(res => console.log(res))
//   .catch(err => console.error(err));

//   =========

//   setInterval(async () => {
//     try {
//       // 获取最新区块号
//       const latestBlock = await tronWeb.trx.getCurrentBlock();
//       const currentBlock = latestBlock.block_header.raw_data.number;

//       if (currentBlock <= lastBlockChecked) return;
//       lastBlockChecked = currentBlock;

//       // 查询合约最近事件（limit 20-50，根据需要调整）
//       const events = await tronWeb.event.getEventsByContractAddress(
//         contractAddress,
//         {
//           event_name: 'PaymentExecuted',     // 事件名
//           only_confirmed: true,              // 只取已确认的
//           limit: 20,                         // 每轮最多取 20 条
//           order_by: 'block_timestamp,desc',  // 最新先
//           // 可选过滤：since: timestamp（毫秒），min_block: number
//         }
//       );

//       if (events && events.data && events.data.length > 0) {
//         for (const event of events.data) {
//           const { result, block_timestamp, transaction_id } = event;
//           console.log('新 PaymentExecuted 事件！');
//           console.log('Payer:', tronWeb.address.fromHex(result.payer));
//           console.log('Recipient:', tronWeb.address.fromHex(result.recipient));
//           console.log('Amount:', tronWeb.toDecimal(result.amount));  // uint256 转数字
//           console.log('OrderId:', tronWeb.toUtf8(result.orderId));   // string 转可读
//           console.log('TxID:', transaction_id);
//           console.log('Time:', new Date(block_timestamp).toISOString());

//           // 这里可以：存数据库、发 webhook、通知用户等
//         }
//       }
//     } catch (err) {
//       console.error('监听出错:', err);
//     }
//   }, 5000);  // 每 5 秒查一次（TRON 出块 ~3 秒，可调到 3000-10000 ms）
// }



