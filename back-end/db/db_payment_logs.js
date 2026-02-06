import pool from './db.js';

// 创建支付审计日志
export async function createPaymentLog(logData) {
    const {
        trace_id = '',
        span_id = '',
        request_id = '',
        invoice_id,
        x402_version = 1,
        service_component = 'facilitator',
        from_address,
        to_address,
        amount_atomic,
        amount_display = null,
        asset_symbol = 'USDT',
        asset_contract = '',
        network = 'tron:mainnet',
        order_type = 'standard',
        tx_hash = null,
        tx_status = 'pending',
        block_height = null,
        gas_fee_paid = 0,
        settlement_time = null,
        client_ip = '',
        risk_policy = '',
        risk_decision = '',
        risk_reason = '',
        signature_hash = '',
        latency_ms = 0,
        latency_chain_ms = 0,
        user_agent = '',
        extra_meta = null,
        batch_id = null,
        batch_index = 0,
        is_aggregated = 0
    } = logData;

    const [result] = await pool.query(
        `INSERT INTO payment_audit_logs (
            trace_id, span_id, request_id, invoice_id, x402_version, service_component,
            from_address, to_address, amount_atomic, amount_display,
            asset_symbol, asset_contract, network, order_type,
            tx_hash, tx_status, block_height, gas_fee_paid, settlement_time,
            client_ip, risk_policy, risk_decision, risk_reason, signature_hash,
            latency_ms, latency_chain_ms, user_agent, extra_meta,
            batch_id, batch_index, is_aggregated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            trace_id, span_id, request_id, invoice_id, x402_version, service_component,
            from_address, to_address, amount_atomic, amount_display,
            asset_symbol, asset_contract, network, order_type,
            tx_hash, tx_status, block_height, gas_fee_paid, settlement_time,
            client_ip, risk_policy, risk_decision, risk_reason, signature_hash,
            latency_ms, latency_chain_ms, user_agent,
            extra_meta ? JSON.stringify(extra_meta) : null,
            batch_id, batch_index, is_aggregated
        ]
    );
    return result.insertId;
}

// 根据ID查询日志
export async function getPaymentLogById(id) {
    const [rows] = await pool.query('SELECT * FROM payment_audit_logs WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return parseJsonFields(rows[0]);
}

// 根据 invoice_id 查询日志（唯一）
export async function getPaymentLogByInvoiceId(invoice_id) {
    const [rows] = await pool.query('SELECT * FROM payment_audit_logs WHERE invoice_id = ?', [invoice_id]);
    if (rows.length === 0) return null;
    return parseJsonFields(rows[0]);
}

// 根据 tx_hash 查询日志
export async function getPaymentLogByTxHash(tx_hash) {
    const [rows] = await pool.query('SELECT * FROM payment_audit_logs WHERE tx_hash = ?', [tx_hash]);
    if (rows.length === 0) return null;
    return parseJsonFields(rows[0]);
}

// 根据 trace_id 查询所有相关日志（同一链路）
export async function getPaymentLogsByTraceId(trace_id) {
    const [rows] = await pool.query(
        'SELECT * FROM payment_audit_logs WHERE trace_id = ? ORDER BY created_at ASC',
        [trace_id]
    );
    return rows.map(parseJsonFields);
}

// 根据付款地址查询历史记录（分页）
export async function getPaymentLogsByFromAddress(from_address, options = {}) {
    const { limit = 20, offset = 0, status = null } = options;
    
    let countQuery = 'SELECT COUNT(*) as total FROM payment_audit_logs WHERE from_address = ? ';
    let query = 'SELECT * FROM payment_audit_logs WHERE from_address = ? ';
    const params = [from_address];
    const countParams = [from_address];
    
    if (status) {
        query += ' AND tx_status = ?';
        countQuery += ' AND tx_status = ?';
        params.push(status);
        countParams.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [countRows] = await pool.query(countQuery, countParams);
    const [rows] = await pool.query(query, params);
    
    return {
        total: countRows[0].total,
        data: rows.map(parseJsonFields)
    };
}

// 根据收款地址查询历史记录（分页）
export async function getPaymentLogsByToAddress(to_address, options = {}) {
    const { limit = 20, offset = 0, status = null } = options;
    
    let query = 'SELECT * FROM payment_audit_logs WHERE to_address = ? ';
    const params = [to_address];
    
    if (status) {
        query += ' AND tx_status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await pool.query(query, params);
    return rows.map(parseJsonFields);
}

// 根据状态查询日志（用于监控失败交易）
export async function getPaymentLogsByStatus(status, options = {}) {
    const { limit = 100, offset = 0 } = options;
    
    const [rows] = await pool.query(
        'SELECT * FROM payment_audit_logs WHERE tx_status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [status, limit, offset]
    );
    return rows.map(parseJsonFields);
}

// 更新交易状态
export async function updatePaymentLogStatus(invoice_id, updateData) {
    const {
        tx_hash,
        tx_status,
        block_height,
        gas_fee_paid, // 手续费(bandwidth + energy,单位TRX)
        settlement_time, // 完成时间
        batch_id,
        batch_index,
        is_aggregated
    } = updateData;

    const updates = [];
    const values = [];

    if (tx_hash !== undefined) { updates.push('tx_hash = ?'); values.push(tx_hash); }
    if (tx_status !== undefined) { updates.push('tx_status = ?'); values.push(tx_status); }
    if (block_height !== undefined) { updates.push('block_height = ?'); values.push(block_height); }
    if (gas_fee_paid !== undefined) { updates.push('gas_fee_paid = ?'); values.push(gas_fee_paid); }
    if (settlement_time !== undefined) {
        let st = settlement_time;
        if (st instanceof Date) {
            const iso = st.toISOString();
            const datePart = iso.slice(0, 19).replace('T', ' ');
            const ms = iso.slice(20, 23);
            st = `${datePart}.${ms}`;
        } else if (typeof st === 'number') {
            // 处理时间戳（毫秒）
            const date = new Date(st);
            const iso = date.toISOString();
            const datePart = iso.slice(0, 19).replace('T', ' ');
            const ms = iso.slice(20, 23);
            st = `${datePart}.${ms}`;
        }
        updates.push('settlement_time = ?'); values.push(st);
    }
    if (batch_id !== undefined) { updates.push('batch_id = ?'); values.push(batch_id); }
    if (batch_index !== undefined) { updates.push('batch_index = ?'); values.push(batch_index); }
    if (is_aggregated !== undefined) { updates.push('is_aggregated = ?'); values.push(is_aggregated); }

    if (updates.length === 0) return false;

    values.push(invoice_id);
    const [result] = await pool.query(
        `UPDATE payment_audit_logs SET ${updates.join(', ')} WHERE invoice_id = ?`,
        values
    );
    return result.affectedRows > 0;
}

// 查询指定时间范围内的日志（BI 统计）
export async function getPaymentLogsByTimeRange(startTime, endTime, options = {}) {
    const { limit = 1000, offset = 0, status = null } = options;
    
    let query = 'SELECT * FROM payment_audit_logs WHERE created_at >= ? AND created_at <= ?';
    const params = [startTime, endTime];
    
    if (status) {
        query += ' AND tx_status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await pool.query(query, params);
    return rows.map(parseJsonFields);
}

// 统计总交易额（按地址）
export async function getPaymentStatsByAddress(from_address, options = {}) {
    const { startTime = null, endTime = null } = options;
    
    let query = `
        SELECT 
            COUNT(*) as total_count,
            SUM(CASE WHEN tx_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
            SUM(CASE WHEN tx_status = 'failed' THEN 1 ELSE 0 END) as failed_count,
            SUM(CASE WHEN tx_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN tx_status = 'confirmed' THEN amount_display ELSE 0 END) as total_amount,
            AVG(latency_ms) as avg_latency_ms
        FROM payment_audit_logs 
        WHERE from_address = ?
    `;
    const params = [from_address];
    
    if (startTime && endTime) {
        query += ' AND created_at >= ? AND created_at <= ?';
        params.push(startTime, endTime);
    }
    
    const [rows] = await pool.query(query, params);
    return rows[0];
}

// 检查交易是否存在（防重放）
export async function checkInvoiceExists(invoice_id) {
    const [rows] = await pool.query(
        'SELECT COUNT(*) as count FROM payment_audit_logs WHERE invoice_id = ?',
        [invoice_id]
    );
    return rows[0].count > 0;
}

// 获取最近的失败交易（用于告警）
export async function getRecentFailedPayments(minutes = 60, limit = 100) {
    const [rows] = await pool.query(
        `SELECT * FROM payment_audit_logs 
         WHERE tx_status = 'failed' 
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
         ORDER BY created_at DESC 
         LIMIT ?`,
        [minutes, limit]
    );
    return rows.map(parseJsonFields);
}

// 获取长时间未确认的交易（用于监控）
export async function getPendingPayments(minutes = 30, limit = 100) {
    const [rows] = await pool.query(
        `SELECT * FROM payment_audit_logs 
         WHERE tx_status = 'pending' 
         AND created_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE)
         ORDER BY created_at ASC 
         LIMIT ?`,
        [minutes, limit]
    );
    return rows.map(parseJsonFields);
}

// 根据 batch_id 查询所有聚合交易记录
export async function getPaymentLogsByBatchId(batch_id) {
    const [rows] = await pool.query(
        'SELECT * FROM payment_audit_logs WHERE batch_id = ? ORDER BY batch_index ASC',
        [batch_id]
    );
    return rows.map(parseJsonFields);
}

// 查询所有聚合交易批次（分页）
export async function getAggregatedBatches(options = {}) {
    const { limit = 20, offset = 0, status = null } = options;
    
    let query = `SELECT batch_id, COUNT(*) as tx_count, 
                 SUM(amount_display) as total_amount,
                 MIN(created_at) as batch_created_at,
                 tx_status
                 FROM payment_audit_logs 
                 WHERE is_aggregated = 1 AND batch_id IS NOT NULL`;
    const params = [];
    
    if (status) {
        query += ' AND tx_status = ?';
        params.push(status);
    }
    
    query += ' GROUP BY batch_id, tx_status ORDER BY batch_created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await pool.query(query, params);
    return rows;
}


// 辅助函数：解析 JSON 字段和格式化时间
function parseJsonFields(row) {
    if (!row) return row;
    
    // 解析 JSON 字段
    if (row.extra_meta && typeof row.extra_meta === 'string') {
        try {
            row.extra_meta = JSON.parse(row.extra_meta);
        } catch (e) {
            row.extra_meta = null;
        }
    }
    
    // 格式化时间字段
    const dateFields = ['created_at', 'settlement_time'];
    dateFields.forEach(field => {
        const val = row[field];
        if (val instanceof Date) {
            row[field] = formatDateTime(val);
        } else if (typeof val === 'string' && val) {
            // 尝试解析可读时间字符串或 MySQL DATETIME
            const parsed = new Date(val);
            if (!isNaN(parsed.getTime())) {
                row[field] = formatDateTime(parsed);
            }
        } else if (typeof val === 'number' && val > 0) {
            // 可能为时间戳（毫秒）
            const parsed = new Date(val);
            if (!isNaN(parsed.getTime())) {
                row[field] = formatDateTime(parsed);
            }
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


