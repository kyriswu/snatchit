import pool from './db.js';

// 查询所有产品
export async function getAllProducts() {
    const [rows] = await pool.query('SELECT * FROM products');
    return rows;
}

// 根据ID查询产品
export async function getProductById(id) {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    return rows[0];
}

// 根据卖家ID查询产品
export async function getProductsBySellerId(seller_id) {
    const [rows] = await pool.query('SELECT * FROM products WHERE seller_id = ?', [seller_id]);
    return rows;
}

// 根据状态查询产品
export async function getProductsByStatus(stat) {
    const [rows] = await pool.query('SELECT * FROM products WHERE stat = ?', [stat]);
    return rows;
}

// 随机获取一个产品
export async function getRandomProduct() {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY RAND() LIMIT 1');
    return rows[0];
}

// 添加产品
export async function addProduct(product) {
    const { seller_id, title, img, product_desc, price, ticket_price, number_digits, difficulty_level, deadline, stat = 0 } = product;
    // 生成 uuid (0x + 64位16进制随机字符串)
    const uuid = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const [result] = await pool.query(
        'INSERT INTO products (uuid, seller_id, title, img, product_desc, price, ticket_price, number_digits, difficulty_level, deadline, stat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [uuid, seller_id, title, img, product_desc, price, ticket_price, number_digits, difficulty_level, deadline, stat]
    );
    return result.insertId;
}

// 更新产品
export async function updateProduct(id, product) {
    const { title, img, product_desc, price, ticket_price, number_digits, difficulty_level, deadline, stat, total_guess_time, winner_id } = product;
    const updates = [];
    const values = [];
    
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (img !== undefined) { updates.push('img = ?'); values.push(img); }
    if (product_desc !== undefined) { updates.push('product_desc = ?'); values.push(product_desc); }
    if (price !== undefined) { updates.push('price = ?'); values.push(price); }
    if (ticket_price !== undefined) { updates.push('ticket_price = ?'); values.push(ticket_price); }
    if (number_digits !== undefined) { updates.push('number_digits = ?'); values.push(number_digits); }
    if (difficulty_level !== undefined) { updates.push('difficulty_level = ?'); values.push(difficulty_level); }
    if (deadline !== undefined) { updates.push('deadline = ?'); values.push(deadline); }
    if (stat !== undefined) { updates.push('stat = ?'); values.push(stat); }
    if (total_guess_time !== undefined) { updates.push('total_guess_time = ?'); values.push(total_guess_time); }
    if (winner_id !== undefined) { updates.push('winner_id = ?'); values.push(winner_id); }
    
    if (updates.length === 0) return false;
    
    values.push(id);
    const [result] = await pool.query(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        values
    );
    return result.affectedRows > 0;
}

// 删除产品
export async function deleteProduct(id) {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    return result.affectedRows > 0;
}