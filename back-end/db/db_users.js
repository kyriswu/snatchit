import pool from './db.js';

// 创建用户（注册/首次登录）
export async function createUser(userData) {
    const {
        username,
        avatar_url,
        email,
        social_platform,
        social_platform_user_id,
        // is_approved = 0,
        // wallet_address,
        // public_key,
        // private_key_encrypted,
        // stat = 1
    } = userData;

    const [result] = await pool.query(
        `INSERT INTO users (
            username, 
            avatar_url, 
            email, 
            social_platform, 
            social_platform_user_id
        ) VALUES (?, ?, ?, ?, ?)`,
        [
            username,
            avatar_url,
            email,
            social_platform,
            social_platform_user_id
        ]
    );
    
    return result.insertId;
}

// 根据社交平台信息查询用户（用于登录）
export async function getUserBySocialPlatform(social_platform, social_platform_user_id) {
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE social_platform = ? AND social_platform_user_id = ? AND stat = 1',
        [social_platform, social_platform_user_id]
    );
    return rows[0];
}

// 根据用户ID查询用户
export async function getUserById(id) {
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE id = ? AND stat = 1',
        [id]
    );
    return rows[0];
}

// 根据钱包地址查询用户
export async function getUserByWalletAddress(wallet_address) {
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE wallet_address = ? AND stat = 1',
        [wallet_address]
    );
    return rows[0];
}

// 查询用户的钱包地址
export async function getUserWalletAddress(user_id) {
    const [rows] = await pool.query(
        'SELECT wallet_address, public_key FROM users WHERE id = ? AND stat = 1',
        [user_id]
    );
    return rows[0];
}



// 更新用户信息
export async function updateUser(id, userData) {
    const {
        username,
        avatar_url,
        email,
        is_approved,
        wallet_address,
        public_key,
        private_key_encrypted,
        stat
    } = userData;

    const updates = [];
    const values = [];

    if (username !== undefined) { updates.push('username = ?'); values.push(username); }
    if (avatar_url !== undefined) { updates.push('avatar_url = ?'); values.push(avatar_url); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (is_approved !== undefined) { updates.push('is_approved = ?'); values.push(is_approved); }
    if (wallet_address !== undefined) { updates.push('wallet_address = ?'); values.push(wallet_address); }
    if (public_key !== undefined) { updates.push('public_key = ?'); values.push(public_key); }
    if (private_key_encrypted !== undefined) { updates.push('private_key_encrypted = ?'); values.push(private_key_encrypted); }
    if (stat !== undefined) { updates.push('stat = ?'); values.push(stat); }

    if (updates.length === 0) return false;

    values.push(id);
    const [result] = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
    );
    return result.affectedRows > 0;
}

// 封禁/解封用户
export async function updateUserStatus(id, stat) {
    const [result] = await pool.query(
        'UPDATE users SET stat = ? WHERE id = ?',
        [stat, id]
    );
    return result.affectedRows > 0;
}

// 查询所有用户（管理功能）
export async function getAllUsers(limit = 100, offset = 0) {
    const [rows] = await pool.query(
        'SELECT id, username, avatar_url, email, social_platform, social_platform_user_id, is_approved, wallet_address, stat, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
    );
    return rows;
}

// 用户登录或注册逻辑（组合函数）
export async function loginOrRegister(socialData, walletData) {
    const { social_platform, social_platform_user_id, username, avatar_url, email } = socialData;
    
    // 先查询用户是否存在
    let user = await getUserInfoBySocialPlatform(social_platform, social_platform_user_id);
    
    if (user) {
        // 用户已存在，直接返回
        return { user, isNewUser: false };
    }
    
    // 用户不存在，创建新用户
    const userId = await createUser({
        username,
        avatar_url,
        email,
        social_platform,
        social_platform_user_id,
        ...walletData
    });
    
    user = await getUserById(userId);
    return { user, isNewUser: true };
}

// 根据社交平台和用户ID查询用户信息
export async function getUserInfoBySocialPlatform(social_platform, social_platform_user_id) {
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE social_platform = ? AND social_platform_user_id = ? AND stat = 1',
        [social_platform, social_platform_user_id]
    );
    return rows[0];
}
// 根据userId更新用户的钱包地址
export async function updateUserWalletAddress(user_id, wallet_address) {
    const [result] = await pool.query(
        'UPDATE users SET wallet_address = ? WHERE id = ? AND stat = 1',
        [wallet_address, user_id]
    );
    return result.affectedRows > 0;
}
// 根据user_id更新用户的is_approved状态为1
export async function approveContract(user_id) {
    const [result] = await pool.query(
        'UPDATE users SET is_approved = 1 WHERE id = ?',
        [user_id]
    );
    return result.affectedRows > 0;
}


