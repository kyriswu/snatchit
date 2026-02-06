'use client';

import { useState, useEffect } from 'react';

const initialForm = {
  name: '',
  status: 'ACTIVE',
  currency: 'USDT',
  budget_limit: '-1',
  budget_usage: '',
  budget_period: 'TOTAL',
  last_budget_reset_at: '',
  approval_mode: 'HYBRID',
  auto_approve_limit: '',
  rate_limit_max: -1,
  rate_limit_period: 'DAILY',
  current_rate_usage: 0,
  allowed_addresses: '',
  blocked_addresses: '',
  allowed_skills: '',
  allowed_merchant_categories: '',
  alert_threshold_percent: 80,
  expires_at: '',
};

export default function AuthorizationCenter() {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingAuth, setEditingAuth] = useState<any>(null);
  const [formData, setFormData] = useState(initialForm);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const [authorizations, setAuthorizations] = useState([
    { id: 1, name: 'Google OAuth 2.0', status: '活跃', date: '2024-01-10', approval_mode: 'HYBRID', budget_usage: '0', expires_at: null },
    { id: 2, name: 'Stripe Payment API', status: '活跃', date: '2024-01-12', approval_mode: 'AUTO', budget_usage: '125.50', expires_at: null },
    { id: 3, name: 'AWS S3 存储', status: '待审核', date: '2024-01-15', approval_mode: 'MANUAL_ALWAYS', budget_usage: '0', expires_at: '2024-12-31' },
    { id: 4, name: 'SendGrid Email', status: '活跃', date: '2024-01-08', approval_mode: 'HYBRID', budget_usage: '89.20', expires_at: null },
    { id: 5, name: 'GitHub OAuth', status: '已停用', date: '2024-01-14', approval_mode: 'AUTO', budget_usage: '250.00', expires_at: '2024-06-30' },
  ]);

  useEffect(() => {
    const loadKeys = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/listKeys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('app_token')}`,
          },
          body: JSON.stringify({}),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => null);
          console.error('Failed to fetch keys:', text || res.status);
          return;
        }

        const data = await res.json().catch(() => null);
        const items = data?.data || data?.keys || data || [];

        if (Array.isArray(items)) {
          const mapped = items.map((it: any, idx: number) => ({
            id: it.id ?? (idx + 1),
            name: it.name ?? it.title ?? 'Unnamed',
            status: it.status ?? 'ACTIVE',
            date: it.date ?? it.created_at,
            ...it,
          }));
          setAuthorizations(mapped);
        }
      } catch (err) {
        console.error('Error loading keys', err);
      }
    };

    loadKeys();
  }, []);

  const handleAddNew = () => {
    setEditingAuth(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleEdit = (auth: any) => {
    setEditingAuth(auth);
    setFormData({
      // user_id: JSON.parse(localStorage.getItem('user_info') || '{}')?.userId || '',
      name: auth.name ?? '',
      status: auth.status ?? 'ACTIVE',
      currency: auth.currency ?? 'USDT',
      budget_limit: auth.budget_limit ? String(Number(auth.budget_limit)) : '',
      budget_usage: auth.budget_usage ? String(Number(auth.budget_usage)) : '',
      budget_period: auth.budget_period ?? 'TOTAL',
      last_budget_reset_at: auth.last_budget_reset_at ?? '',
      approval_mode: auth.approval_mode ?? 'HYBRID',
      auto_approve_limit: auth.auto_approve_limit ? String(Number(auth.auto_approve_limit)) : '',
      rate_limit_max: auth.rate_limit_max ?? -1,
      rate_limit_period: auth.rate_limit_period ?? 'DAILY',
      current_rate_usage: auth.current_rate_usage ?? 0,
      allowed_addresses: Array.isArray(auth.allowed_addresses) ? auth.allowed_addresses.join(', ') : (auth.allowed_addresses ?? ''),
      blocked_addresses: Array.isArray(auth.blocked_addresses) ? auth.blocked_addresses.join(', ') : (auth.blocked_addresses ?? ''),
      allowed_skills: Array.isArray(auth.allowed_skills) ? auth.allowed_skills.join(', ') : (auth.allowed_skills ?? ''),
      allowed_merchant_categories: Array.isArray(auth.allowed_merchant_categories) ? auth.allowed_merchant_categories.join(', ') : (auth.allowed_merchant_categories ?? ''),
      alert_threshold_percent: auth.alert_threshold_percent ?? 80,
      expires_at: auth.expires_at ? auth.expires_at.replace(' ', 'T').substring(0, 16) : '',
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/delKeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('app_token')}`,
        },
        body: JSON.stringify({ id: deletingId }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok || result?.code !== 0) {
        throw new Error(result?.error || `删除失败: ${res.status}`);
      }

      // 删除成功后，从本地状态移除
      setAuthorizations(authorizations.filter(auth => auth.id !== deletingId));
      setShowDeleteModal(false);
      setDeletingId(null);
    } catch (err: any) {
      alert(`删除失败：${err?.message || err}`);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parseList = (v: any) => {
      if (!v) return null;
      if (Array.isArray(v)) return v;
      return String(v).split(',').map((s) => s.trim()).filter(Boolean);
    };

    // 构建要发送的 payload（将部分字段转为数组）
    const payload: any = {
      ...formData,
      expires_at: formData.expires_at ? formData.expires_at.replace('T', ' ') + ':00' : null,
      allowed_addresses: parseList(formData.allowed_addresses),
      blocked_addresses: parseList(formData.blocked_addresses),
      allowed_skills: parseList(formData.allowed_skills),
      allowed_merchant_categories: parseList(formData.allowed_merchant_categories),
    };

    if (editingAuth) {
      payload.id = editingAuth.id;
    }

    try {
      console.log('Submitting payload:', payload);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/saveKeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',

          'Authorization': `Bearer ${localStorage.getItem('app_token')}`
         },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `请求失败: ${res.status}`);
      }

      // 可选：服务端返回的新对象或 id
      const result = await res.json().catch(() => null);

      if (editingAuth) {
        // 编辑本地数据（仅在服务端保存成功后）
        setAuthorizations(authorizations.map(auth =>
          auth.id === editingAuth.id
            ? {
              ...auth,
              ...formData,
              allowed_addresses: payload.allowed_addresses,
              blocked_addresses: payload.blocked_addresses,
              allowed_skills: payload.allowed_skills,
              allowed_merchant_categories: payload.allowed_merchant_categories,
              date: auth.date,
            }
            : auth
        ));
      } else {
        const newAuth = {
          id: authorizations.length + 1,
          // user_id: ,
          name: formData.name,
          // access_key: formData.access_key || '',
          status: formData.status || 'ACTIVE',
          currency: formData.currency || 'USDT',
          budget_limit: formData.budget_limit || '',
          budget_usage: formData.budget_usage || '',
          budget_period: formData.budget_period || 'TOTAL',
          last_budget_reset_at: formData.last_budget_reset_at || null,
          approval_mode: formData.approval_mode || 'HYBRID',
          auto_approve_limit: formData.auto_approve_limit || '',
          rate_limit_max: formData.rate_limit_max ?? -1,
          rate_limit_period: formData.rate_limit_period || 'DAILY',
          current_rate_usage: formData.current_rate_usage || 0,
          allowed_addresses: payload.allowed_addresses,
          blocked_addresses: payload.blocked_addresses,
          allowed_skills: payload.allowed_skills,
          allowed_merchant_categories: payload.allowed_merchant_categories,
          alert_threshold_percent: formData.alert_threshold_percent || 80,
          expires_at: formData.expires_at || null,
          date: (result && result.date) || new Date().toISOString().split('T')[0],
        };
        setAuthorizations([...authorizations, newAuth]);
      }

      setShowModal(false);
    } catch (err: any) {
      // 简单提示错误
      alert(`保存失败：${err?.message || err}`);
    }
  };

  const getStatusColor = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s === '活跃' || s === 'ACTIVE') return 'bg-[#10B981]/20 text-[#10B981]';
    if (s === '待审核' || s === 'FROZEN') return 'bg-[#F59E0B]/20 text-[#F59E0B]';
    if (s === 'EXPIRED' || s === '已过期') return 'bg-white/10 text-slate-300';
    if (s === 'DEPLETED' || s === '已耗尽' || s === '额度耗尽') return 'bg-red-500/20 text-red-400';
    return 'bg-white/10 text-slate-300';
  };

  // 分页逻辑
  const totalPages = Math.ceil(authorizations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = authorizations.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-[#050505] p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white font-fira-code">
            风控策略管理
          </h1>
          <p className="text-slate-400 mt-2">
            管理和配置系统的风控策略与安全规则
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200"
        >
          + 添加策略
        </button>
      </div>

      {/* Authorization Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: '总策略数', value: authorizations.length.toString(), color: 'bg-blue-50 dark:bg-blue-900/10' },
          { label: '活跃策略', value: authorizations.filter(a => a.status === '活跃').length.toString(), color: 'bg-green-50 dark:bg-green-900/10' },
          { label: '待审核', value: authorizations.filter(a => a.status === '待审核').length.toString(), color: 'bg-orange-50 dark:bg-orange-900/10' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 cursor-pointer hover:border-white/20 hover:shadow-lg hover:shadow-white/5 transition-all duration-200"
          >
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Authorization Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">
            策略列表
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0B1220] border-b border-white/10">
                <th className="text-left py-4 px-6 text-slate-400 font-semibold text-sm">策略名称</th>
                <th className="text-left py-4 px-6 text-slate-400 font-semibold text-sm">状态</th>
                <th className="text-left py-4 px-6 text-slate-400 font-semibold text-sm">审批模式</th>
                <th className="text-left py-4 px-6 text-slate-400 font-semibold text-sm">已使用额度</th>
                <th className="text-left py-4 px-6 text-slate-400 font-semibold text-sm">过期时间</th>
                <th className="text-left py-4 px-6 text-slate-400 font-semibold text-sm">创建时间</th>
                <th className="text-left py-4 px-6 text-slate-400 font-semibold text-sm">操作</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((auth) => (
                <tr
                  key={auth.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
                >
                  <td className="py-4 px-6">
                    <p className="text-white font-medium">{auth.name}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(auth.status)}`}>
                      {auth.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-slate-300 text-sm">
                      {auth.approval_mode || 'HYBRID'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-slate-300 text-sm">
                      {auth.budget_usage ? `${Number(auth.budget_usage).toFixed(2)} USDT` : '--'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-slate-400 text-sm">
                      {auth.expires_at ? new Date(auth.expires_at).toLocaleDateString('zh-CN') : '无期限'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-400">{auth.date}</td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(auth)}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm font-medium"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(auth.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
            <div className="text-sm text-slate-400">
              显示 {startIndex + 1} - {Math.min(endIndex, authorizations.length)} 条，共 {authorizations.length} 条
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                上一页
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit Authorization */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-auto">
          <div className="bg-[#0B1220] border border-white/10 rounded-2xl p-8 w-full max-w-2xl mx-4 shadow-2xl max-h-[85vh] overflow-y-auto modal-scrollbar">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingAuth ? '编辑策略' : '添加新策略'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* 基础身份信息 */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold text-white">基础信息</h4>
                <p className="text-xs text-slate-400 mt-1">请输入策略名称与描述；状态用于启用/冻结/过期等。</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">策略名称</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="例如：AutoGPT-Shopping"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#0B1220] text-white border border-white/10 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="ACTIVE">ACTIVE</option>
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="FROZEN">FROZEN</option>
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="EXPIRED">EXPIRED</option>
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="DEPLETED">DEPLETED</option>
                  </select>
                </div>
              </div>
              {/* 资金风控核心 (Money & Budget) */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold text-white">资金风控核心 (Money & Budget)</h4>
                <p className="text-xs text-slate-400 mt-1">设置币种与预算相关的限制与周期。</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">总预算上限</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.budget_limit}
                    onChange={(e) => setFormData({ ...formData, budget_limit: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">预算周期</label>
                  <select
                    value={formData.budget_period}
                    onChange={(e) => setFormData({ ...formData, budget_period: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#0B1220] text-white border border-white/10 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="TOTAL">TOTAL</option>
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="MONTHLY">MONTHLY</option>
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="DAILY">DAILY</option>
                  </select>
                </div>
              </div>

              {/* 支付模式与阈值 (Mode & Thresholds) */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold text-white">支付模式与阈值 (Mode & Thresholds)</h4>
                <p className="text-xs text-slate-400 mt-1">配置自动/手动审批与小额免密阈值。</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">审批模式</label>
                  <select
                    value={formData.approval_mode}
                    onChange={(e) => setFormData({ ...formData, approval_mode: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#0B1220] text-white border border-white/10 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="AUTO">AUTO</option>
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="MANUAL_ALWAYS">MANUAL_ALWAYS</option>
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="HYBRID">HYBRID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">小额免密阈值</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.auto_approve_limit}
                    onChange={(e) => setFormData({ ...formData, auto_approve_limit: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* 技术风控限制 (Technical Limits) */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold text-white">技术风控限制 (Technical Limits)</h4>
                <p className="text-xs text-slate-400 mt-1">设置调用频率限制与周期（-1 表示无限制）。</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">每周期最大调用次数 (rate_limit_max)</label>
                  <input
                    type="number"
                    value={formData.rate_limit_max}
                    onChange={(e) => setFormData({ ...formData, rate_limit_max: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">频次限制周期</label>
                  <select
                    value={formData.rate_limit_period}
                    onChange={(e) => setFormData({ ...formData, rate_limit_period: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#0B1220] text-white border border-white/10 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="DAILY">DAILY</option>
                    <option style={{ background: '#0B1220', color: '#FFFFFF' }} value="HOURLY">HOURLY</option>
                  </select>
                </div>
              </div>

              {/* 黑白名单与技能 (Lists & Skills) */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold text-white">黑白名单与技能 (Lists & Skills)</h4>
                <p className="text-xs text-slate-400 mt-1">以逗号分隔的列表会被解析为数组 (例如：addr1, addr2)。</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">白名单地址（以逗号分隔）</label>
                <textarea
                  value={formData.allowed_addresses}
                  onChange={(e) => setFormData({ ...formData, allowed_addresses: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  rows={2}
                  placeholder="addr1, addr2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">黑名单地址（以逗号分隔）</label>
                <textarea
                  value={formData.blocked_addresses}
                  onChange={(e) => setFormData({ ...formData, blocked_addresses: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  rows={2}
                  placeholder="addr1, addr2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">允许的技能（以逗号分隔）</label>
                <textarea
                  value={formData.allowed_skills}
                  onChange={(e) => setFormData({ ...formData, allowed_skills: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  rows={2}
                  placeholder="skill1, skill2"
                />
              </div>

              {/* 安全与审计 */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold text-white">安全与审计</h4>
                <p className="text-xs text-slate-400 mt-1">设置告警阈值与令牌过期时间，用于审计与告警。</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">告警阈值 (%)</label>
                  <input
                    type="number"
                    value={formData.alert_threshold_percent}
                    onChange={(e) => setFormData({ ...formData, alert_threshold_percent: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">过期时间</label>
                  <input
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200"
                >
                  {editingAuth ? '保存修改' : '添加策略'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all duration-200"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0B1220] border border-red-500/20 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">
              确认删除策略
            </h3>
            <p className="text-slate-400 text-center mb-6">
              删除后将无法恢复，确定要继续吗？
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all duration-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all duration-200"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
