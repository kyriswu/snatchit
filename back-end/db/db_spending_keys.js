import pool from './db.js';

// 创建智能体支付密钥
export async function createSpendingKey(keyData) {
    const {
        user_id,
        name,
        access_key,
        status = 'ACTIVE',
        currency = 'USDT',
        budget_limit,
        budget_usage = 0,
        budget_period = 'TOTAL',
        approval_mode = 'HYBRID',
        auto_approve_limit = 0,
        rate_limit_max = -1,
        rate_limit_period = 'DAILY',
        current_rate_usage = 0,
        allowed_addresses = null,
        blocked_addresses = null,
        allowed_skills = null,
        allowed_merchant_categories = null,
        alert_threshold_percent = 80,
        expires_at = null
    } = keyData;

    const [result] = await pool.query(
        `INSERT INTO agent_spending_keys (
            user_id, name, access_key, status, currency, 
            budget_limit, budget_usage, budget_period,
            approval_mode, auto_approve_limit, 
            rate_limit_max, rate_limit_period, current_rate_usage,
            allowed_addresses, blocked_addresses, allowed_skills, allowed_merchant_categories,
            alert_threshold_percent, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            user_id, name, access_key, status, currency,
            budget_limit, budget_usage, budget_period,
            approval_mode, auto_approve_limit,
            rate_limit_max, rate_limit_period, current_rate_usage,
            allowed_addresses ? JSON.stringify(allowed_addresses) : null,
            blocked_addresses ? JSON.stringify(blocked_addresses) : null,
            allowed_skills ? JSON.stringify(allowed_skills) : null,
            allowed_merchant_categories ? JSON.stringify(allowed_merchant_categories) : null,
            alert_threshold_percent, expires_at
        ]
    );
    return result.insertId;
}

// 根据ID查询密钥
export async function getSpendingKeyById(id) {
    const [rows] = await pool.query('SELECT * FROM agent_spending_keys WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return parseJsonFields(rows[0]);
}

// 根据access_key查询密钥
export async function getSpendingKeyByAccessKey(access_key) {
    const [rows] = await pool.query('SELECT * FROM agent_spending_keys WHERE access_key = ?', [access_key]);
    if (rows.length === 0) return null;
    return parseJsonFields(rows[0]);
}

// 根据用户ID查询所有密钥
export async function getSpendingKeysByUserId(user_id, status = null) {
    let query = 'SELECT * FROM agent_spending_keys WHERE user_id = ?';
    const params = [user_id];
    
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.query(query, params);
    console.log(rows);
    return rows.map(parseJsonFields);
}

// 更新密钥信息
export async function updateSpendingKey(id, keyData) {
    const {
        name,
        status,
        currency,
        budget_limit,
        budget_usage,
        budget_period,
        approval_mode,
        auto_approve_limit,
        rate_limit_max,
        rate_limit_period,
        current_rate_usage,
        allowed_addresses,
        blocked_addresses,
        allowed_skills,
        allowed_merchant_categories,
        alert_threshold_percent,
        expires_at
    } = keyData;

    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (currency !== undefined) { updates.push('currency = ?'); values.push(currency); }
    if (budget_limit !== undefined) { updates.push('budget_limit = ?'); values.push(budget_limit); }
    if (budget_usage !== undefined) { updates.push('budget_usage = ?'); values.push(budget_usage); }
    if (budget_period !== undefined) { updates.push('budget_period = ?'); values.push(budget_period); }
    if (approval_mode !== undefined) { updates.push('approval_mode = ?'); values.push(approval_mode); }
    if (auto_approve_limit !== undefined) { updates.push('auto_approve_limit = ?'); values.push(auto_approve_limit); }
    if (rate_limit_max !== undefined) { updates.push('rate_limit_max = ?'); values.push(rate_limit_max); }
    if (rate_limit_period !== undefined) { updates.push('rate_limit_period = ?'); values.push(rate_limit_period); }
    if (current_rate_usage !== undefined) { updates.push('current_rate_usage = ?'); values.push(current_rate_usage); }
    if (allowed_addresses !== undefined) { updates.push('allowed_addresses = ?'); values.push(allowed_addresses ? JSON.stringify(allowed_addresses) : null); }
    if (blocked_addresses !== undefined) { updates.push('blocked_addresses = ?'); values.push(blocked_addresses ? JSON.stringify(blocked_addresses) : null); }
    if (allowed_skills !== undefined) { updates.push('allowed_skills = ?'); values.push(allowed_skills ? JSON.stringify(allowed_skills) : null); }
    if (allowed_merchant_categories !== undefined) { updates.push('allowed_merchant_categories = ?'); values.push(allowed_merchant_categories ? JSON.stringify(allowed_merchant_categories) : null); }
    if (alert_threshold_percent !== undefined) { updates.push('alert_threshold_percent = ?'); values.push(alert_threshold_percent); }
    if (expires_at !== undefined) { updates.push('expires_at = ?'); values.push(expires_at); }

    if (updates.length === 0) return false;

    values.push(id);
    const [result] = await pool.query(
        `UPDATE agent_spending_keys SET ${updates.join(', ')} WHERE id = ?`,
        values
    );
    return result.affectedRows > 0;
}

// 删除密钥
export async function deleteSpendingKey(id) {
    const [result] = await pool.query('DELETE FROM agent_spending_keys WHERE id = ?', [id]);
    return result.affectedRows > 0;
}

// 更新预算使用情况（消费时调用）
export async function updateBudgetUsage(id, amount) {
    const [result] = await pool.query(
        'UPDATE agent_spending_keys SET budget_usage = budget_usage + ? WHERE id = ?',
        [amount, id]
    );
    
    // 检查是否超过预算，自动更新状态为 DEPLETED
    const key = await getSpendingKeyById(id);
    if (key && key.budget_usage >= key.budget_limit) {
        await updateSpendingKey(id, { status: 'DEPLETED' });
    }
    
    return result.affectedRows > 0;
}

// 更新状态
export async function updateStatus(id, status) {
    const [result] = await pool.query(
        'UPDATE agent_spending_keys SET status = ? WHERE id = ?',
        [status, id]
    );
    return result.affectedRows > 0;
}

// 重置预算（用于周期性预算）
export async function resetBudget(id) {
    const [result] = await pool.query(
        `UPDATE agent_spending_keys 
         SET budget_usage = 0, 
             current_rate_usage = 0,
             last_budget_reset_at = NOW(),
             status = CASE 
                 WHEN status = 'DEPLETED' THEN 'ACTIVE' 
                 ELSE status 
             END
         WHERE id = ?`,
        [id]
    );
    return result.affectedRows > 0;
}

// 增加调用次数
export async function incrementRateUsage(id) {
    const [result] = await pool.query(
        'UPDATE agent_spending_keys SET current_rate_usage = current_rate_usage + 1 WHERE id = ?',
        [id]
    );
    return result.affectedRows > 0;
}

// 检查是否可以支付
export async function canPay(access_key, amount, targetAddress = null, skill = null) {
    const key = await getSpendingKeyByAccessKey(access_key);
    
    if (!key) {
        return { allowed: false, reason: 'Invalid access key' };
    }
    
    // 检查状态
    if (key.status !== 'ACTIVE') {
        return { allowed: false, reason: `Key status is ${key.status}` };
    }
    
    // 检查过期时间
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
        return { allowed: false, reason: 'Key expired' };
    }
    
    // 检查预算
    const remainingBudget = parseFloat(key.budget_limit) - parseFloat(key.budget_usage);
    if (amount > remainingBudget) {
        return { allowed: false, reason: 'Insufficient budget' };
    }
    
    // 检查频率限制
    if (key.rate_limit_max > 0 && key.current_rate_usage >= key.rate_limit_max) {
        return { allowed: false, reason: 'Rate limit exceeded' };
    }
    
    // 检查地址白名单
    if (targetAddress && key.allowed_addresses && key.allowed_addresses.length > 0) {
        if (!key.allowed_addresses.includes(targetAddress)) {
            return { allowed: false, reason: 'Target address not in whitelist' };
        }
    }
    
    // 检查地址黑名单
    if (targetAddress && key.blocked_addresses && key.blocked_addresses.length > 0) {
        if (key.blocked_addresses.includes(targetAddress)) {
            return { allowed: false, reason: 'Target address is blocked' };
        }
    }
    
    // 检查技能白名单
    if (skill && key.allowed_skills && key.allowed_skills.length > 0) {
        if (!key.allowed_skills.includes(skill)) {
            return { allowed: false, reason: 'Skill not allowed' };
        }
    }
    
    // 判断是否需要手动批准
    const needsApproval = key.approval_mode === 'MANUAL_ALWAYS' || 
                          (key.approval_mode === 'HYBRID' && amount > parseFloat(key.auto_approve_limit));
    
    return { 
        allowed: true, 
        needsApproval,
        key,
        remainingBudget 
    };
}

// 辅助函数：解析JSON字段
function parseJsonFields(row) {
    if (!row) return row;
    
    const jsonFields = ['allowed_addresses', 'blocked_addresses', 'allowed_skills', 'allowed_merchant_categories'];
    
    jsonFields.forEach(field => {
        if (row[field] && typeof row[field] === 'string') {
            try {
                row[field] = JSON.parse(row[field]);
            } catch (e) {
                row[field] = null;
            }
        }
    });
    
    // 格式化时间字段
    const dateFields = ['created_at', 'updated_at', 'last_budget_reset_at', 'expires_at'];
    dateFields.forEach(field => {
        if (row[field] instanceof Date) {
            row[field] = formatDateTime(row[field]);
        }
    });
    
    return row;
}

// 格式化日期时间为 YYYY-MM-DD HH:mm:ss
function formatDateTime(date) {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 根据用户ID和名称查询密钥
export async function getPolicyByName(user_id, name) {
    const [rows] = await pool.query(
        'SELECT * FROM agent_spending_keys WHERE user_id = ? AND name = ?',
        [user_id, name]
    );
    if (rows.length === 0) return null;
    return parseJsonFields(rows[0]);
}

// 查询需要重置预算的密钥（定时任务可调用）
export async function getKeysNeedingReset() {
    const now = new Date();
    
    // 查询日度重置且距上次重置超过1天的
    const [dailyKeys] = await pool.query(
        `SELECT * FROM agent_spending_keys 
         WHERE budget_period = 'DAILY' 
         AND (last_budget_reset_at IS NULL OR last_budget_reset_at < DATE_SUB(NOW(), INTERVAL 1 DAY))
         AND status IN ('ACTIVE', 'DEPLETED')`
    );
    
    // 查询月度重置且距上次重置超过1月的
    const [monthlyKeys] = await pool.query(
        `SELECT * FROM agent_spending_keys 
         WHERE budget_period = 'MONTHLY' 
         AND (last_budget_reset_at IS NULL OR last_budget_reset_at < DATE_SUB(NOW(), INTERVAL 1 MONTH))
         AND status IN ('ACTIVE', 'DEPLETED')`
    );
    
    return [...dailyKeys, ...monthlyKeys].map(parseJsonFields);
}
