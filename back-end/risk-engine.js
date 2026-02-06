/**
 * 风控检测引擎
 * 根据支付密钥策略和交易信息进行风控判断
 */
class RiskEngine {
    /**
     * 初始化风控引擎
     */
    constructor() {
        this.name = 'RiskEngine';
    }

    /**
     * 风控决策
     * @param {Object} policy - 支付密钥策略对象
     * @param {Object} payload - 交易数据
     * @returns {Object} 风控决策结果
     */
    makeDecision(policy, payload) {
        // 基础验证
        if (!policy) {
            return this._rejectDecision('No valid policy provided', 'POLICY_MISSING');
        }

        if (!payload) {
            return this._rejectDecision('No valid payload provided', 'PAYLOAD_MISSING');
        }

        // 按优先级进行风控检查
        const checks = [
            this._checkPolicyStatus.bind(this),
            this._checkExpiration.bind(this),
            this._checkBudget.bind(this),
            this._checkRateLimit.bind(this),
            this._checkAddressWhitelist.bind(this),
            this._checkAddressBlacklist.bind(this),
            this._checkMerchantCategory.bind(this),
            // this._checkApprovalMode.bind(this)
        ];

        // 执行每个检查
        for (const check of checks) {
            const result = check(policy, payload);
            if (result.reject) {
                return this._rejectDecision(result.reason, result.code);
            }
        }

        // 所有检查通过
        return this._approveDecision();
    }

    /**
     * 策略状态检查
     */
    _checkPolicyStatus(policy, payload) {
        if (policy.status === 'ACTIVE') {
            return { reject: false };
        }
        
        const statusMap = {
            'FROZEN': '策略已冻结',
            'EXPIRED': '策略已过期',
            'DEPLETED': '额度已耗尽'
        };

        return {
            reject: true,
            reason: statusMap[policy.status] || `策略状态: ${policy.status}`,
            code: `POLICY_${policy.status}`
        };
    }

    /**
     * 过期时间检查
     */
    _checkExpiration(policy, payload) {
        if (!policy.expires_at) {
            return { reject: false };
        }

        const expiresAt = new Date(policy.expires_at);
        const now = new Date();

        if (now > expiresAt) {
            return {
                reject: true,
                reason: `密钥已过期: ${policy.expires_at}`,
                code: 'POLICY_EXPIRED'
            };
        }

        return { reject: false };
    }

    /**
     * 预算检查
     */
    _checkBudget(policy, payload) {
        // budget_limit 为 -1 表示无限额度
        if (policy.budget_limit === '-1.000000000000000000' || 
            parseFloat(policy.budget_limit) === -1) {
            return { reject: false };
        }

        const budgetLimit = parseFloat(policy.budget_limit);
        const budgetUsage = parseFloat(policy.budget_usage);
        const paymentAmount = parseFloat(payload.value);

        const remainingBudget = budgetLimit - budgetUsage;

        if (paymentAmount > remainingBudget) {
            return {
                reject: true,
                reason: `预算不足: 剩余 ${remainingBudget}, 需要 ${paymentAmount}`,
                code: 'BUDGET_INSUFFICIENT'
            };
        }

        // 检查告警阈值
        const usagePercent = ((budgetUsage + paymentAmount) / budgetLimit) * 100;
        if (usagePercent >= policy.alert_threshold_percent) {
            console.warn(`[RiskEngine] 告警: 预算已使用 ${usagePercent.toFixed(2)}%`);
        }

        return { reject: false };
    }

    /**
     * 频率限制检查
     */
    _checkRateLimit(policy, payload) {
        // rate_limit_max 为 -1 表示无限制
        if (policy.rate_limit_max === -1) {
            return { reject: false };
        }

        if (policy.current_rate_usage >= policy.rate_limit_max) {
            return {
                reject: true,
                reason: `频率限制已达上限: ${policy.current_rate_usage}/${policy.rate_limit_max}`,
                code: 'RATE_LIMIT_EXCEEDED'
            };
        }

        return { reject: false };
    }

    /**
     * 地址白名单检查
     */
    _checkAddressWhitelist(policy, payload) {
        if (!policy.allowed_addresses || policy.allowed_addresses.length === 0) {
            return { reject: false };
        }

        const targetAddress = payload.to;
        const whitelist = policy.allowed_addresses;

        if (!whitelist.includes(targetAddress)) {
            return {
                reject: true,
                reason: `地址不在白名单中: ${targetAddress}`,
                code: 'ADDRESS_NOT_WHITELISTED'
            };
        }

        return { reject: false };
    }

    /**
     * 地址黑名单检查
     */
    _checkAddressBlacklist(policy, payload) {
        if (!policy.blocked_addresses || policy.blocked_addresses.length === 0) {
            return { reject: false };
        }

        const targetAddress = payload.to;
        const blacklist = policy.blocked_addresses;

        if (blacklist.includes(targetAddress)) {
            return {
                reject: true,
                reason: `地址在黑名单中: ${targetAddress}`,
                code: 'ADDRESS_BLACKLISTED'
            };
        }

        return { reject: false };
    }

    /**
     * 商户类别检查
     */
    _checkMerchantCategory(policy, payload) {
        if (!policy.allowed_merchant_categories || 
            policy.allowed_merchant_categories.length === 0) {
            return { reject: false };
        }

        // payload 中应包含 merchantCategory 字段
        const merchantCategory = payload.merchantCategory;
        
        if (!merchantCategory) {
            // 未提供商户类别时，视为通过（或可改为拒绝）
            return { reject: false };
        }

        const allowedCategories = policy.allowed_merchant_categories;

        if (!allowedCategories.includes(merchantCategory)) {
            return {
                reject: true,
                reason: `商户类别不被允许: ${merchantCategory}`,
                code: 'MERCHANT_CATEGORY_NOT_ALLOWED'
            };
        }

        return { reject: false };
    }

    /**
     * 审批模式检查
     */
    _checkApprovalMode(policy, payload) {
        const mode = policy.approval_mode;
        const amount = parseFloat(payload.value);
        const autoApproveLimit = parseFloat(policy.auto_approve_limit);

        if (mode === 'AUTO') {
            // 自动审批，无需进一步检查
            return { reject: false };
        }

        if (mode === 'MANUAL_ALWAYS') {
            // 总是需要人工审批
            return {
                reject: true,
                reason: '该策略需要人工审批',
                code: 'MANUAL_APPROVAL_REQUIRED'
            };
        }

        if (mode === 'HYBRID') {
            // 混合模式：小额自动，大额需要审批
            if (amount <= autoApproveLimit) {
                return { reject: false };
            } else {
                return {
                    reject: true,
                    reason: `金额 ${amount} 超过自动审批上限 ${autoApproveLimit}，需要人工审批`,
                    code: 'MANUAL_APPROVAL_REQUIRED'
                };
            }
        }

        return { reject: false };
    }

    /**
     * 生成拒绝决策
     */
    _rejectDecision(reason, code = 'REJECTED') {
        return {
            allowed: false,
            status: 'rejected',
            reason,
            code,
            timestamp: Date.now()
        };
    }

    /**
     * 生成批准决策
     */
    _approveDecision() {
        return {
            allowed: true,
            status: 'approved',
            reason: '风控检查通过',
            code: 'APPROVED',
            timestamp: Date.now()
        };
    }
}

export { RiskEngine };
export default RiskEngine;
