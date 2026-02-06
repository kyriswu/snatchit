import Redis from 'ioredis';


// 根据环境变量设置 Redis 主机
const redisHost = process.env.NODE_ENV === 'online' ? 'my-redis' : 'localhost';

// 创建 Redis 客户端
const redis = new Redis({
    host: redisHost,
    port: 6379
});

// 监听 Redis 连接事件
redis.on('connect', () => {
    console.log('Connected to Redis on localhost:6379');
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

// 导出 Redis 客户端
export default redis 