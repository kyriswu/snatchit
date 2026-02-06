CREATE DATABASE IF NOT EXISTS snatchit;
USE snatchit;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50),
  avatar_url VARCHAR(512),
  email VARCHAR(100),
  social_platform VARCHAR(50),
  social_platform_user_id VARCHAR(256),
  is_approved TINYINT NOT NULL DEFAULT 0 COMMENT '0:不同意授权, 1:同意授权',
  wallet_address VARCHAR(256) COMMENT '热钱包地址',
  public_key TEXT COMMENT '公钥',
  private_key_encrypted TEXT COMMENT 'AES加密后的私钥',
  stat TINYINT NOT NULL DEFAULT 1 COMMENT '1:正常, 0:封禁',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX idx_wallet_address (wallet_address),
  INDEX idx_social_platform (social_platform, social_platform_user_id),
  INDEX idx_stat (stat),
  INDEX idx_created_at (created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `agent_spending_keys` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint(20) unsigned NOT NULL COMMENT '关联的主账户/用户ID',
  
  -- 基础身份信息
  `name` varchar(64) NOT NULL COMMENT '智能体名称/用途 (e.g. "AutoGPT-Shopping")',
  `access_key` varchar(64) NOT NULL COMMENT '支付凭证 sk-xxxx (需建立唯一索引)',
  `status` enum('ACTIVE', 'FROZEN', 'EXPIRED', 'DEPLETED') NOT NULL DEFAULT 'ACTIVE' COMMENT '状态: 启用/冻结/过期/额度耗尽',
  
  -- 资金风控核心 (Money & Budget)
  `currency` varchar(10) NOT NULL DEFAULT 'USDT' COMMENT '币种',
  `budget_limit` decimal(40, 18) NOT NULL DEFAULT '0.000000' COMMENT '总预算上限',
  `budget_usage` decimal(40, 18) NOT NULL DEFAULT '0.000000' COMMENT '已使用额度',
  `budget_period` enum('TOTAL', 'MONTHLY', 'DAILY') NOT NULL DEFAULT 'TOTAL' COMMENT '预算重置周期: 终身/月度/日度',
  `last_budget_reset_at` timestamp NULL DEFAULT NULL COMMENT '上次额度重置时间(用于周期性预算)',

  -- 支付模式与阈值 (Mode & Thresholds)
  `approval_mode` enum('AUTO', 'MANUAL_ALWAYS', 'HYBRID') NOT NULL DEFAULT 'HYBRID' COMMENT '支付方式: 自动/总是需确认/混合模式',
  `auto_approve_limit` decimal(40, 18) DEFAULT '0.000000' COMMENT '小额免密阈值 (混合模式下，低于此值自动付，高于需确认)',
  
  -- 技术风控限制 (Technical Limits)
  `rate_limit_max` int(11) NOT NULL DEFAULT '-1' COMMENT '周期内最大调用次数 (-1为无限制)',
  `rate_limit_period` enum('DAILY', 'HOURLY') NOT NULL DEFAULT 'DAILY' COMMENT '频次限制周期',
  `current_rate_usage` int(11) NOT NULL DEFAULT '0' COMMENT '当前周期已调用次数',
  
  -- 黑白名单与技能 (Lists & Skills - 使用 JSON 存储以保持灵活)
  `allowed_addresses` json DEFAULT NULL COMMENT '地址白名单 (JSON数组, NULL代表不限)',
  `blocked_addresses` json DEFAULT NULL COMMENT '地址黑名单 (JSON数组)',
  `allowed_skills` json DEFAULT NULL COMMENT '允许调用的Skill/工具白名单 (e.g. ["search_api_pay", "aws_bill_pay"])',
  `allowed_merchant_categories` json DEFAULT NULL COMMENT '允许的商户类别 (e.g. ["SaaS", "Cloud", "Travel"])',

  -- 安全与审计
  `alert_threshold_percent` tinyint(3) unsigned DEFAULT '80' COMMENT '余额耗尽告警百分比 (e.g. 80%)',
  `expires_at` timestamp NULL DEFAULT NULL COMMENT '令牌过期时间 (NULL为永不过期)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_access_key` (`access_key`),
  KEY `idx_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AgentPay 支付授权/消费密钥表';

CREATE TABLE `payment_audit_logs` (
  -- ==========================================
  -- 1. 基础日志索引 (Log Identity)
  -- ==========================================
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID，自增',
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '日志入库时间（毫秒精度）',
  
  -- ==========================================
  -- 2. 链路追踪 (Traceability)
  -- ==========================================
  `trace_id` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '全链路追踪ID (Trace Context)',
  `span_id` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '当前服务节点ID',
  `request_id` VARCHAR(64) DEFAULT '' COMMENT '网关/HTTP请求ID',
  `invoice_id` VARCHAR(64) NOT NULL COMMENT '核心业务ID (Nonce/OrderNo)，防重放的关键索引',
  `x402_version` TINYINT UNSIGNED DEFAULT 1 COMMENT '协议版本号',
  `service_component` VARCHAR(32) DEFAULT 'facilitator' COMMENT '产生日志的组件 (facilitator/seller/agent)',

  -- ==========================================
  -- 3. 交易核心 (Transaction Core)
  -- ==========================================
  `from_address` VARCHAR(64) NOT NULL COMMENT '付款方钱包地址 (Buyer)',
  `to_address` VARCHAR(64) NOT NULL COMMENT '收款方钱包地址 (Recipient)',
  
  -- 重要：Solidity uint256 最大值有78位，使用 DECIMAL(65,0) 可覆盖绝大多数场景，
  -- 如果需要完全对标 uint256，可使用 VARCHAR(78)
  `amount_atomic` DECIMAL(65, 0) UNSIGNED NOT NULL COMMENT '最小单位金额 (Sun/Wei)，对账基准',
  `amount_display` DECIMAL(24, 8) COMMENT '人类可读金额 (用于BI统计，如 10.5 USDT)',
  
  `asset_symbol` VARCHAR(16) DEFAULT 'USDT' COMMENT '资产代号',
  `asset_contract` VARCHAR(64) DEFAULT '' COMMENT '代币合约地址 (用于验证资产真伪)',
  `network` VARCHAR(32) DEFAULT 'tron:mainnet' COMMENT '链标识 (CAIP-2)',
  `order_type` VARCHAR(32) DEFAULT 'standard' COMMENT '业务类型 (api/sub/tip)',

  -- ==========================================
  -- 4. 区块链结算 (Blockchain Settlement)
  -- ==========================================
  `tx_hash` VARCHAR(66) DEFAULT NULL COMMENT '链上交易哈希 (0x...)，唯一凭证',
  `tx_status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending, confirmed, failed, dropped',
  `block_height` BIGINT UNSIGNED DEFAULT NULL COMMENT '区块高度 (用于确认数判断)',
  `gas_fee_paid` DECIMAL(24, 6) DEFAULT 0.000000 COMMENT '实际消耗 Gas 费用 (单位 TRX)',
  `settlement_time` DATETIME(3) DEFAULT NULL COMMENT '链上确认时间',

  -- ==========================================
  -- 5. 风控与安全 (Risk & Security)
  -- ==========================================
  `client_ip` VARCHAR(45) DEFAULT '' COMMENT '客户端IP (支持IPv6)',
  `risk_policy` VARCHAR(64) DEFAULT '' COMMENT '命中的风控策略名',
  `risk_decision` VARCHAR(16) DEFAULT '' COMMENT '风控结果: pass, reject, challenge',
  `risk_reason` VARCHAR(255) DEFAULT '' COMMENT '拒绝或警告原因',
  `signature_hash` VARCHAR(66) DEFAULT '' COMMENT '签名哈希 (存 Hash 不存原始 Sig，用于存证)',

  -- ==========================================
  -- 6. 性能与扩展 (Performance & Misc)
  -- ==========================================
  `latency_ms` INT UNSIGNED DEFAULT 0 COMMENT '总处理耗时 (ms)',
  `latency_chain_ms` INT UNSIGNED DEFAULT 0 COMMENT '链上交互耗时 (ms)',
  `user_agent` TEXT COMMENT '客户端设备信息',
  `extra_meta` JSON COMMENT '扩展字段：存储 header、payload dump 等非结构化数据',

  -- ==========================================
  -- [新增] 聚合支付核心字段 (Batch Payment)
  -- ==========================================
  `batch_id` VARCHAR(64) DEFAULT NULL COMMENT '聚合批次ID (若非聚合则可为空或同invoice_id)',
  `batch_index` INT UNSIGNED DEFAULT 0 COMMENT '批次内的执行顺序 (0,1,2...)',
  `is_aggregated` TINYINT(1) DEFAULT 0 COMMENT '是否是聚合交易',

  -- ==========================================
  -- 索引设计 (Indexes)
  -- ==========================================
  PRIMARY KEY (`id`),
  
  -- 核心业务查询索引：根据订单号查状态
  UNIQUE KEY `idx_invoice_id` (`invoice_id`), 
  
  -- 链上对账索引：根据 Hash 查交易
  KEY `idx_tx_hash` (`tx_hash`),
  
  -- 链路追踪索引：根据 TraceID 串联日志
  KEY `idx_trace_id` (`trace_id`),
  
  -- BI统计索引：查某个用户的交易记录
  KEY `idx_from_address` (`from_address`),
  
  -- BI统计索引：按时间范围统计
  KEY `idx_created_at` (`created_at`),
  
  -- 状态监控索引：查找失败/挂起的交易
  KEY `idx_status_time` (`tx_status`, `created_at`),

  -- 聚合支付索引：根据批次ID查交易
  KEY `idx_batch_id` (`batch_id`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='x402 支付协议审计日志表';

