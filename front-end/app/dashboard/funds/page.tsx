'use client';

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export default function FundsPage() {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [balance, setBalance] = useState<string>('0.00');
  const [address, setAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const usdtContractAddress = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf';// 测试链 USDT TRC20 合约地址
  const agentPayContractAddress = 'TFdSFLMVN7qqDZgnuzQh2DocQjYPaX8ex9'; // 测试链 AgentPayBatch 合约地址

  // 钱包数据
  let wallet = {
    id: 'wallet-1',
    name: '主钱包',
    address: address,
    balance: balance,
    currency: 'TRX',
    network: 'Tron',
    status: 'active',
  };

  // 模拟交易历史
  const transactions = [
    { id: 'tx-1', type: '充值', amount: '+500.00', currency: 'TRX', status: '已完成', date: '2024-01-28 14:32', hash: 'a1b2c3...' },
    { id: 'tx-2', type: '提现', amount: '-200.00', currency: 'TRX', status: '已完成', date: '2024-01-27 09:15', hash: 'd4e5f6...' },
    { id: 'tx-3', type: '充值', amount: '+1,000.00', currency: 'TRX', status: '已完成', date: '2024-01-26 16:48', hash: 'g7h8i9...' },
    { id: 'tx-4', type: '提现', amount: '-350.00', currency: 'TRX', status: '处理中', date: '2024-01-25 11:20', hash: 'j0k1l2...' },
  ];

  // fetch wallet info (run on mount to check if wallet exists)
  const fetchBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getWalletInfo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('app_token')}`
        }
      });

      const data = await response.json();
      console.log('Wallet info response:', data);
      if (data.code === 0 && data.data.address) {
        const balanceValue = typeof data.data.balance === 'number'
          ? (data.data.balance / 1000000).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })
          : data.data.balance;
        setBalance(balanceValue);
        setAddress(data.data.address);
        setIsConnected(true); // 如果有钱包地址，设置为已连接

        data.data.is_approved ? setIsApproved(true) : setIsApproved(false);
        console.log(data.data.account);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初始化时检查是否已有钱包信息
    fetchBalance();
  }, []);

  const connectWallet = async () => {
    try {
      // @ts-ignore
      const tron = (globalThis as any).tronWeb;
      if (!tron) {
        toast.error('请安装 TronLink 钱包扩展');
        return;
      }

      if (!tron.ready) {
        toast.error('请解锁 TronLink 钱包');
        return;
      }

      const address = tron.defaultAddress.base58;
      if (!address) {
        toast.error('请在 TronLink 中选择账户');
        return;
      }

      setAddress(address);
      setIsConnected(true);
      await updateUserWallet(address);
      // await approveAgent();
      
      toast.success('钱包连接成功');
    } catch (error) {
      console.error('连接钱包失败:', error);
      toast.error('连接钱包失败');
    }
  };

  const updateUserWallet = async (newAddress: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/updateWallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('app_token')}`
        },
        body: JSON.stringify({ walletAddress: newAddress })
      });

      const data = await response.json();
      console.log('Update wallet response:', data);
      if (data.code === 0) {
        toast.success('用户钱包地址更新成功');
      } else {
        toast.error(`更新失败: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to update user wallet:', error);
      toast.error('更新用户钱包地址失败');
    }
  };

  const approveAgent = async () => {
    try {
      // @ts-ignore
      const tron = (globalThis as any).tronWeb;
      if (!tron) {
        toast.error('请先连接 TronLink 钱包');
        return;
      }

      toast.loading('正在授权，请在 TronLink 中确认...');
      const contract = await tron.contract().at(usdtContractAddress);
      const amount = 1000 * 1000000;

      const txId = await contract.approve(
        agentPayContractAddress,
        amount
      ).send({
        feeLimit: 100000000
      });

      await approveContract();
      toast.dismiss();
      return txId;
    } catch (error) {
      console.error('授权失败:', error);
      toast.dismiss();
      toast.error('授权失败，请重试');
    }
  };

  const approveContract = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/approveContract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('app_token')}`
        }
      });

      const data = await response.json();
      console.log('Approve contract response:', data);
      if (data.code === 0) {
        setIsApproved(true);
        toast.success('合约授权成功');
      } else {
        toast.error(`授权失败: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to approve contract:', error);
      toast.error('合约授权失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="space-y-6 rounded-2xl border border-white/10 bg-[#050505] p-6">
      <div>
        <h1 className="text-3xl font-bold text-white font-fira-code">
          资金管理
        </h1>
        <p className="text-slate-400 mt-2">
          管理您的热钱包和资金流水
        </p>
      </div>

      {/* Wallets List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white mb-3">我的钱包</h3>
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-1/3 bg-white/10 rounded" />
                <div className="h-20 bg-white/10 rounded" />
                <div className="h-12 bg-white/10 rounded" />
              </div>
            </div>
          ) : !isConnected ? (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-[1px]">
              <div className="rounded-2xl bg-[#0B1220] p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] flex items-center justify-center text-[#050505] font-bold">
                    T
                  </div>
                  <div className="space-y-2">
                    <p className="text-white font-semibold">连接 TronLink 钱包</p>
                    <p className="text-sm text-slate-300">连接后可查看余额、复制地址并进行充值/提现。</p>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• 需要解锁 TronLink</li>
                      <li>• 默认授权 1000 USDT</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <div className="text-xs text-slate-400">当前网络: Tron (TRC20)</div>
                  <button
                    onClick={connectWallet}
                    className="px-5 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-[#050505] rounded-lg hover:shadow-lg hover:shadow-[#22D3EE]/30 transition-all duration-200 font-semibold"
                  >
                    连接钱包
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
              <div
                key={wallet.id}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:border-white/20 hover:shadow-lg hover:shadow-white/5 transition-all duration-200"
              >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-white text-lg mb-1">
                    {wallet.name}
                  </h4>
                  <p className="text-xs text-slate-400">{wallet.network}</p>
                </div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#10B981]/20 text-[#10B981]">
                  {wallet.status === 'active' ? '活跃' : ''}
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">余额</p>
                  <p className="text-2xl font-bold text-white">
                    {balance || '--'} <span className="text-sm text-slate-400">{wallet.currency}</span>
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-slate-400 mb-1">钱包地址</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-[#22D3EE] font-mono bg-[#0B1220] px-3 py-1.5 rounded border border-white/10 flex-1 truncate">
                      {address || '获取中...'}
                    </code>
                    <button 
                      onClick={() => {
                        if (address) {
                          navigator.clipboard.writeText(address);
                          toast.success('地址已复制到剪贴板', {
                            style: {
                              background: '#10B981',
                              color: '#fff',
                            },
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-xs text-white transition-all duration-200"
                    >
                      复制
                    </button>
                  </div>
                </div>
              </div>

              {/* 授权状态 */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">智能合约授权</p>
                    <p className="text-xs text-slate-500">AgentPay 合约需要授权才能转账 USDT</p>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    isApproved 
                      ? 'bg-[#10B981]/20 text-[#10B981]' 
                      : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                  }`}>
                    {isApproved ? '已授权' : '未授权'}
                  </span>
                </div>
                {!isApproved && (
                  <button
                    onClick={approveAgent}
                    className="w-full px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white rounded-lg hover:shadow-lg hover:shadow-[#F59E0B]/30 transition-all duration-200 text-sm font-semibold"
                  >
                    授权 AgentPay 合约
                  </button>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                <button 
                  onClick={() => setShowDepositModal(true)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-[#050505] rounded-lg hover:shadow-lg hover:shadow-[#22D3EE]/30 transition-all duration-200 text-sm font-semibold"
                >
                  充值
                </button>
                <button 
                  onClick={() => setShowWithdrawModal(true)}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-sm font-semibold"
                >
                  提现
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-white text-lg mb-1">USDT 统计</h4>
                  <p className="text-xs text-slate-400">已支付 / 已收到</p>
                </div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-300">
                  近 30 天
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 rounded-xl border border-white/10 bg-[#0B1220]">
                  <p className="text-xs text-slate-400 mb-1">已支付 USDT</p>
                  <p className="text-2xl font-bold text-white">--</p>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-[#0B1220]">
                  <p className="text-xs text-slate-400 mb-1">已收到 USDT</p>
                  <p className="text-2xl font-bold text-white">--</p>
                </div>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">
            交易记录
          </h3>
          <button className="text-sm text-[#22D3EE] hover:text-[#8B5CF6] transition-colors">
            查看全部 →
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">类型</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">金额</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">状态</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">时间</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">交易哈希</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr 
                    key={tx.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-2 text-sm font-medium ${
                        tx.type === '充值' ? 'text-[#10B981]' : 'text-[#22D3EE]'
                      }`}>
                        {tx.type === '充值' ? '↓' : '↑'} {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-semibold ${
                        tx.type === '充值' ? 'text-[#10B981]' : 'text-white'
                      }`}>
                        {tx.amount} {tx.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        tx.status === '已完成'
                          ? 'bg-[#10B981]/20 text-[#10B981]'
                          : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {tx.date}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-[#22D3EE] font-mono">
                        {tx.hash}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl border border-white/10 bg-[#0B1220] max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0B1220] border-b border-white/10 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">充值 TRX</h3>
              <button 
                onClick={() => setShowDepositModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  充值网络
                </label>
                <select className="w-full px-4 py-3 bg-[#050505] border border-white/10 rounded-lg text-white focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE] outline-none transition-all">
                  <option>Tron (TRC20)</option>
                  <option>Ethereum (ERC20)</option>
                  <option>BSC (BEP20)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  充值地址
                </label>
                <div className="p-4 bg-white rounded-lg mb-3">
                  <div className="w-full aspect-square bg-gray-200 flex items-center justify-center text-gray-500">
                    [QR Code]
                  </div>
                </div>
                <div className="flex gap-2">
                  <code className="flex-1 px-4 py-3 bg-[#050505] border border-white/10 rounded-lg text-[#22D3EE] text-sm font-mono break-all">
                    {address || 'TXYZa1B2c3D4e5F6g7H8i9J0k1L2m3N4o5'}
                  </code>
                  <button 
                    onClick={() => {
                      const addressToCopy = address || 'TXYZa1B2c3D4e5F6g7H8i9J0k1L2m3N4o5';
                      navigator.clipboard.writeText(addressToCopy);
                      toast.success('地址已复制到剪贴板', {
                        style: {
                          background: '#10B981',
                          color: '#fff',
                        },
                      });
                    }}
                    className="px-4 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-[#050505] rounded-lg hover:shadow-lg transition-all font-semibold whitespace-nowrap"
                  >
                    复制
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg">
                <p className="text-sm text-[#F59E0B] font-medium mb-2">⚠️ 重要提示</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• 仅支持 TRX 充值</li>
                  <li>• 最小充值金额: 10 TRX</li>
                  <li>• 到账时间: 10-30 分钟</li>
                  <li>• 请勿向此地址充值其他资产</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl border border-white/10 bg-[#0B1220] max-w-md w-full">
            <div className="border-b border-white/10 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">提现 TRX</h3>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  提现网络
                </label>
                <select className="w-full px-4 py-3 bg-[#050505] border border-white/10 rounded-lg text-white focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE] outline-none transition-all">
                  <option>Tron (TRC20)</option>
                  <option>Ethereum (ERC20)</option>
                  <option>BSC (BEP20)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  提现地址
                </label>
                <input 
                  type="text"
                  placeholder="请输入 TRX 接收地址"
                  className="w-full px-4 py-3 bg-[#050505] border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE] outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-300">
                    提现金额
                  </label>
                  <span className="text-xs text-slate-400">
                    可用: {balance} TRX
                  </span>
                </div>
                <div className="relative">
                  <input 
                    type="number"
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-[#050505] border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE] outline-none transition-all"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#22D3EE] hover:text-[#8B5CF6] font-semibold">
                    全部
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">手续费</span>
                  <span className="text-white">1.00 TRX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">实际到账</span>
                  <span className="text-white font-semibold">-- TRX</span>
                </div>
              </div>

              <button className="w-full px-4 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-[#050505] rounded-lg hover:shadow-lg hover:shadow-[#22D3EE]/30 transition-all duration-200 font-semibold">
                确认提现
              </button>

              <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg">
                <p className="text-sm text-[#EF4444] font-medium mb-2">⚠️ 安全提示</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• 请仔细核对提现地址</li>
                  <li>• 最小提现金额: 20 TRX</li>
                  <li>• 处理时间: 1-24 小时</li>
                  <li>• 提现后无法撤销</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
