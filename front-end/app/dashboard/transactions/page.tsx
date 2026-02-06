'use client';

import { useState, useEffect } from 'react';

interface Transaction {
  id: number;
  invoice_id: string;
  batch_id: string;
  batch_index: number;
  is_aggregated: boolean;
  amount_display: string;
  asset_symbol: string;
  gas_fee_paid: string;
  tx_status: 'success' | 'pending' | 'failed';
  risk_decision: 'approved' | 'rejected';
  risk_reason?: string;
  timestamp: string;
  created_at: string;
  from_address: string;
  to_address: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filteredByBatch, setFilteredByBatch] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' as 'asc' | 'desc' });
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [pendingAction, setPendingAction] = useState<{ txId: number; action: 'approve' | 'reject' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 8;

  // Fetch transactions from API
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(process.env.NEXT_PUBLIC_API_BASE_URL)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listPaymentLogs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('app_token')}`,
          },
          body: JSON.stringify({ page, pageSize }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.code === 0 && result.data) {
          // Transform API response to match Transaction interface
          const transformedData = result.data.map((log: any, index: number) => ({
            id: log.id || index + 1,
            invoice_id: log.invoice_id || `INV-${log.id}`,
            batch_id: log.batch_id || '',
            batch_index: log.batch_index || 0,
            is_aggregated: !!log.batch_id,
            amount_display: log.amount_display
              ? String(log.amount_display)
              : log.amount
                ? parseFloat(log.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 18 })
                : '0.00',
            asset_symbol: log.asset_symbol || 'USDT',
            gas_fee_paid: log.gas_fee_paid || '0',
            tx_status: log.tx_status || 'pending',
            risk_decision: log.risk_decision || 'pending',
            risk_reason: log.risk_reason,
            timestamp: log.timestamp || new Date().toLocaleString('zh-CN'),
            created_at: log.created_at || log.timestamp || new Date().toLocaleString('zh-CN'),
            from_address: log.from_address || '',
            to_address: log.to_address || '',
          }));
          setTransactions(transformedData);
          setTotal(result.total || 0);
        } else {
          throw new Error(result.error || 'Failed to fetch transactions');
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [page]);

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter((tx) => {
      const matchBatch = filteredByBatch ? tx.batch_id === filteredByBatch : true;
      const matchSearch =
        tx.invoice_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.from_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.to_address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBatch && matchSearch;
    })
    .sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Transaction];
      const bVal = b[sortConfig.key as keyof Transaction];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maskId = (value: string) => {
    if (!value) return '-';
    if (value.length <= 8) return value;
    return `${value.slice(0, 4)}***${value.slice(-4)}`;
  };

  const formatAmountDisplay = (value: string) => {
    if (!value) return '0.00';
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return value;
    if (numericValue === 0) return '0.00';
    const [intPart, decimalPart = ''] = String(value).split('.');
    const trimmedDecimals = decimalPart.replace(/0+$/, '');
    if (trimmedDecimals.length === 0) {
      return `${intPart}.00`;
    }
    if (trimmedDecimals.length === 1) {
      return `${intPart}.${trimmedDecimals}0`;
    }
    return `${intPart}.${trimmedDecimals}`;
  };

  const shortenAddress = (address: string) => {
    if (!address) return '-';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status: 'success' | 'pending' | 'failed') => {
    switch (status) {
      case 'success':
        return 'bg-[#10B981]/10 text-[#10B981]';
      case 'pending':
        return 'bg-[#F59E0B]/10 text-[#F59E0B]';
      case 'failed':
        return 'bg-[#EF4444]/10 text-[#EF4444]';
      default:
        return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getStatusIcon = (status: 'success' | 'pending' | 'failed') => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            交易管理
          </h1>
          <p className="text-slate-400 mt-2">
            实时监控和管理所有区块链交易
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button className="inline-flex items-center px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:border-white/30 hover:text-white hover:bg-white/5 transition-colors duration-200 cursor-pointer">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            筛选
          </button>
          <button className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-[#050505] transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-[#22D3EE]/30 font-medium">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            导出交易记录
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 hover:border-white/20 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">总交易数</p>
              <p className="text-2xl font-bold text-white mt-1">
                {transactions.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-3m3-3l-3 3m0 0l-3-3" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 hover:border-white/20 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">成功交易</p>
              <p className="text-2xl font-bold text-[#10B981] mt-1">
                {transactions.filter(t => t.tx_status === 'success').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#10B981]/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 hover:border-white/20 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">待处理交易</p>
              <p className="text-2xl font-bold text-[#F59E0B] mt-1">
                {transactions.filter(t => t.tx_status === 'pending').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 hover:border-white/20 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">风控拦截</p>
              <p className="text-2xl font-bold text-[#EF4444] mt-1">
                {transactions.filter(t => t.risk_decision === 'rejected').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#EF4444]/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="搜索Invoice ID或地址..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all duration-200"
          />
        </div>
        {filteredByBatch && (
          <button
            onClick={() => setFilteredByBatch(null)}
            className="px-4 py-3 bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 rounded-lg text-[#8B5CF6] hover:bg-[#8B5CF6]/30 transition-colors duration-200 cursor-pointer text-sm font-medium whitespace-nowrap"
          >
            ✕ 清除筛选
          </button>
        )}
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="w-8 h-8 border-3 border-slate-600 border-t-[#22D3EE] rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400">加载交易数据中...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <svg className="w-12 h-12 text-[#EF4444] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-400 text-sm mb-2">加载失败</p>
            <p className="text-slate-500 text-xs">{error}</p>
          </div>
        )}

        {/* Data Loaded */}
        {!loading && !error && (
          <>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Invoice ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  金额
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  收款地址
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  风控决策
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  交易状态
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  批次信息
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredTransactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  className="hover:bg-white/5 transition-colors duration-150 cursor-pointer"
                  onClick={() => setSelectedTx(tx)}
                >
                  {/* Invoice ID Column */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-slate-300 font-mono">
                        {maskId(tx.invoice_id)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(tx.invoice_id, tx.invoice_id)}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors duration-200 cursor-pointer"
                        title="复制Invoice ID"
                      >
                        {copiedId === tx.invoice_id ? (
                          <svg className="w-4 h-4 text-[#10B981]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-slate-500 hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Amount Column */}
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-white">
                      {formatAmountDisplay(tx.amount_display)} {tx.asset_symbol}
                    </span>
                  </td>

                  {/* Recipient Address Column */}
                  <td className="px-6 py-4">
                    <code className="text-sm text-slate-300 font-mono">
                      {shortenAddress(tx.from_address)}
                    </code>
                  </td>

                  {/* Risk Decision Column */}
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                        {tx.risk_decision === 'approved' ? (
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 cursor-pointer">
                            <svg className="w-5 h-5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        ) : (
                          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 cursor-pointer">
                            <svg className="w-5 h-5 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                    </div>
                  </td>

                  {/* Transaction Status Column */}
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(tx.tx_status)}`}>
                      {getStatusIcon(tx.tx_status)}
                      {tx.tx_status === 'success' ? '成功' : tx.tx_status === 'pending' ? '待处理' : '失败'}
                    </div>
                  </td>

                  {/* Batch Info Column */}
                  <td className="px-6 py-4">
                    {tx.is_aggregated ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilteredByBatch(tx.batch_id);
                        }}
                        className="inline-flex items-center px-3 py-1.5 bg-[#22D3EE]/20 border border-[#22D3EE]/50 rounded-full text-xs font-medium text-[#22D3EE] hover:bg-[#22D3EE]/30 transition-colors duration-200 cursor-pointer"
                        title="点击筛选此批次"
                      >
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v4a1 1 0 11-2 0V4H4v10h4a1 1 0 110 2H4a2 2 0 01-2-2V4z" />
                        </svg>
                        Batch: {tx.batch_id.slice(0, 8)}... #{tx.batch_index}
                      </button>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>

                  {/* Timestamp Column */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-400">
                      {tx.created_at}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredTransactions.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <svg className="w-12 h-12 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-slate-400 text-sm">没有找到匹配的交易记录</p>
          </div>
        )}
        </>
        )}
      </div>

      {/* Table Footer Info */}
      {filteredTransactions.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-400 px-4">
          <span>显示 {filteredTransactions.length} 条交易记录</span>
          <div className="flex items-center gap-2">
            <span>总Gas费用:</span>
            <span className="font-semibold text-white">
              {(filteredTransactions.reduce((sum, tx) => sum + parseFloat(tx.gas_fee_paid), 0)).toFixed(2)} TRX
            </span>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between px-4 py-4 border-t border-white/10">
          <div className="text-sm text-slate-400">
            共 <span className="font-semibold text-white">{total}</span> 条记录，
            第 <span className="font-semibold text-white">{page}</span> / <span className="font-semibold text-white">{Math.ceil(total / pageSize)}</span> 页
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-2 rounded-lg border border-white/10 text-slate-300 hover:border-white/30 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer text-sm font-medium"
              title="首页"
            >
              ⬅ 首页
            </button>
            
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-lg border border-white/10 text-slate-300 hover:border-white/30 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer text-sm font-medium"
              title="上一页"
            >
              ◀ 上一页
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1)
                .filter(p => {
                  const maxPage = Math.ceil(total / pageSize);
                  // 显示当前页附近的页码：前2页、当前页、后2页
                  return Math.abs(p - page) <= 2 || p === 1 || p === maxPage;
                })
                .reduce((acc: any[], p) => {
                  if (acc.length > 0 && p - acc[acc.length - 1] > 1) {
                    acc.push('...');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => typeof p === 'number' && setPage(p)}
                    disabled={typeof p === 'string'}
                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      typeof p === 'string'
                        ? 'text-slate-500 cursor-default'
                        : p === page
                        ? 'bg-gradient-to-r from-[#8B5CF6] to-[#22D3EE] text-white'
                        : 'border border-white/10 text-slate-300 hover:border-white/30 hover:text-white cursor-pointer'
                    }`}
                  >
                    {p}
                  </button>
                ))}
            </div>

            <button
              onClick={() => setPage(Math.min(Math.ceil(total / pageSize), page + 1))}
              disabled={page === Math.ceil(total / pageSize)}
              className="px-3 py-2 rounded-lg border border-white/10 text-slate-300 hover:border-white/30 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer text-sm font-medium"
              title="下一页"
            >
              下一页 ▶
            </button>
            
            <button
              onClick={() => setPage(Math.ceil(total / pageSize))}
              disabled={page === Math.ceil(total / pageSize)}
              className="px-3 py-2 rounded-lg border border-white/10 text-slate-300 hover:border-white/30 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer text-sm font-medium"
              title="末页"
            >
              末页 ➡
            </button>
          </div>
        </div>
      )}

      {/* Transaction Details Panel */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedTx(null)}
          />
          
          {/* Side Panel */}
          <div className="w-full sm:w-96 bg-gradient-to-b from-slate-900 to-slate-950 border-l border-white/10 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/80 backdrop-blur">
              <h2 className="text-xl font-bold text-white">交易详情</h2>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Invoice ID Section */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Invoice ID</p>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4">
                  <code className="flex-1 text-sm font-mono text-white break-all">
                    {selectedTx.invoice_id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(selectedTx.invoice_id, selectedTx.invoice_id)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 cursor-pointer flex-shrink-0"
                  >
                    {copiedId === selectedTx.invoice_id ? (
                      <svg className="w-5 h-5 text-[#10B981]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-slate-500 hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Amount & Asset */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">金额</p>
                  <p className="text-xl font-bold text-white">{formatAmountDisplay(selectedTx.amount_display)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">资产</p>
                  <p className="text-xl font-bold text-[#22D3EE]">{selectedTx.asset_symbol}</p>
                </div>
              </div>

              {/* Gas Fee */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gas费用</p>
                <p className="text-lg font-semibold text-white">{selectedTx.gas_fee_paid} TRX</p>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">交易状态</p>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(selectedTx.tx_status)}`}>
                  {getStatusIcon(selectedTx.tx_status)}
                  {selectedTx.tx_status === 'success' ? '成功' : selectedTx.tx_status === 'pending' ? '待处理' : '失败'}
                </div>
              </div>

              {/* Batch Info */}
              {selectedTx.is_aggregated && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">批次信息</p>
                  <div className="bg-[#22D3EE]/10 border border-[#22D3EE]/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-slate-300">
                      <span className="text-slate-400">Batch ID:</span>
                      <code className="block font-mono text-white mt-1 break-all">{selectedTx.batch_id}</code>
                    </p>
                    <p className="text-sm text-slate-300">
                      <span className="text-slate-400">批次索引:</span>
                      <span className="block font-semibold text-white mt-1">#{selectedTx.batch_index}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Risk Decision */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">风控决策</p>
                <div className={`p-4 rounded-lg border ${selectedTx.risk_decision === 'rejected' ? 'bg-[#EF4444]/10 border-[#EF4444]/50' : 'bg-[#10B981]/10 border-[#10B981]/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedTx.risk_decision === 'rejected' ? (
                      <svg className="w-5 h-5 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span className={`font-semibold ${selectedTx.risk_decision === 'rejected' ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                      {selectedTx.risk_decision === 'rejected' ? '已拦截' : '已通过'}
                    </span>
                  </div>
                  {selectedTx.risk_reason && (
                    <p className="text-sm text-slate-300 mt-2">
                      <span className="text-slate-400">原因: </span>
                      {selectedTx.risk_reason}
                    </p>
                  )}
                </div>
              </div>

              {/* From Address */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">发送地址</p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <code className="text-sm font-mono text-white break-all">
                    {selectedTx.from_address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(selectedTx.from_address, 'from-address')}
                    className="mt-2 flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    复制地址
                  </button>
                </div>
              </div>

              {/* To Address */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">接收地址</p>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <code className="text-sm font-mono text-white break-all">
                    {selectedTx.to_address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(selectedTx.to_address, 'to-address')}
                    className="mt-2 flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    复制地址
                  </button>
                </div>
              </div>

              {/* Timestamp */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">时间</p>
                <p className="text-sm text-white">{selectedTx.created_at}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
