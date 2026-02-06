// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITRC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

contract AgentPayUnified {
    address public owner;
    ITRC20 public usdtToken;

    // --- EIP-712 结构定义 ---
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = 
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    
    // TypeHash 1: 单次支付签名 (针对每一笔特定订单)
    bytes32 private constant PAYMENT_TYPEHASH = 
        keccak256("Payment(address payer,address recipient,uint256 amount,string orderId,uint256 nonce,uint256 deadline)");

    // TypeHash 2: Session 授权签名 (针对开启免密支付)
    bytes32 private constant SESSION_TYPEHASH = 
        keccak256("SessionAuthorize(address user,uint256 maxAmountPerTx,uint256 expiry,uint256 nonce)");

    bytes32 public DOMAIN_SEPARATOR;
    
    // 用户 Nonce (两个模式共用一个 Nonce 计数器，防止重放)
    mapping(address => uint256) public nonces;

    // --- Session 数据结构 ---
    struct Session {
        uint256 maxAmountPerTx; // 单笔最大限制 (例如 50 U)
        uint256 expiry;         // 过期时间
        bool isActive;          // 是否激活
    }
    mapping(address => Session) public userSessions;

    // --- 事件定义 ---
    event PaymentExecuted(address indexed payer, address indexed recipient, uint256 amount, string orderId, string mode);
    event PaymentFailed(address indexed payer, string orderId, string reason);
    event SessionActivated(address indexed user, uint256 maxAmountPerTx, uint256 expiry);
    event SessionClosed(address indexed user);

    // --- 输入参数结构体 ---

    // 1. 用于单次签名支付的输入 (包含 v,r,s)
    struct SignedPaymentInput {
        address payer;
        address recipient;
        uint256 amount;
        string orderId;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    // 2. 用于 Session 免密支付的输入 (不需要签名，只需要业务数据)
    struct SessionPaymentInput {
        address payer;
        address recipient;
        uint256 amount;
        string orderId;
    }

    constructor(address _usdtAddress) {
        owner = msg.sender;
        usdtToken = ITRC20(_usdtAddress);

        DOMAIN_SEPARATOR = keccak256(abi.encode(
            EIP712_DOMAIN_TYPEHASH,
            keccak256(bytes("AgentPay")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only Agent can trigger");
        _;
    }

    // ============================================================
    // 模块 A: Session 管理 (开启/关闭)
    // ============================================================

    /**
     * @dev 激活免密 Session (需要用户签名)
     */
    function activateSession(
        address _user,
        uint256 _maxAmountPerTx,
        uint256 _expiry,
        uint8 v, bytes32 r, bytes32 s
    ) external onlyOwner {
        require(block.timestamp < _expiry, "Signature expired");

        uint256 currentNonce = nonces[_user];
        
        bytes32 structHash = keccak256(abi.encode(
            SESSION_TYPEHASH,
            _user,
            _maxAmountPerTx,
            _expiry,
            currentNonce
        ));

        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            structHash
        ));

        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0) && signer == _user, "Invalid signature");

        nonces[_user]++; // 消耗 Nonce

        // 存储 Session (不记录总额，只记录单笔上限)
        userSessions[_user] = Session({
            maxAmountPerTx: _maxAmountPerTx,
            expiry: _expiry,
            isActive: true
        });

        emit SessionActivated(_user, _maxAmountPerTx, _expiry);
    }

    function closeSession() external {
        delete userSessions[msg.sender];
        emit SessionClosed(msg.sender);
    }

    // ============================================================
    // 模块 B: 支付执行 (支持 签名支付 和 Session支付)
    // ============================================================

    /**
     * @dev 模式 1: 批量执行【单次签名】的交易
     * 适用于大额或需要用户显式确认的交易
     */
    function executeBatchSignedPayments(SignedPaymentInput[] calldata inputs) external onlyOwner {
        for (uint i = 0; i < inputs.length; i++) {
            _processSignedPayment(inputs[i]);
        }
    }

    /**
     * @dev 模式 2: 批量执行【Session免密】的交易
     * 适用于小额、后台自动扣款。不需要用户针对每笔交易签名。
     */
    function executeBatchSessionPayments(SessionPaymentInput[] calldata inputs) external onlyOwner {
        for (uint i = 0; i < inputs.length; i++) {
            _processSessionPayment(inputs[i]);
        }
    }

    // --- 内部逻辑实现 ---

    // 处理带签名的单笔支付
    function _processSignedPayment(SignedPaymentInput memory p) private {
        // 1. 检查有效期
        if (block.timestamp > p.deadline) {
            emit PaymentFailed(p.payer, p.orderId, "Signature expired");
            return;
        }

        // 2. 验证 Nonce 和 签名
        uint256 currentNonce = nonces[p.payer];
        bytes32 structHash = keccak256(abi.encode(
            PAYMENT_TYPEHASH,
            p.payer,
            p.recipient,
            p.amount,
            keccak256(bytes(p.orderId)),
            currentNonce,
            p.deadline
        ));

        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            structHash
        ));

        address signer = ecrecover(digest, p.v, p.r, p.s);

        if (signer == address(0) || signer != p.payer) {
            emit PaymentFailed(p.payer, p.orderId, "Invalid signature");
            return;
        }

        // 3. 消耗 Nonce
        nonces[p.payer]++;

        // 4. 执行转账
        _safeTransferFrom(p.payer, p.recipient, p.amount, p.orderId, "SIGNED");
    }

    // 处理 Session 免密支付
    function _processSessionPayment(SessionPaymentInput memory p) private {
        Session memory sess = userSessions[p.payer];

        // 1. 检查 Session 有效性
        if (!sess.isActive) {
            emit PaymentFailed(p.payer, p.orderId, "Session not active");
            return;
        }
        if (block.timestamp > sess.expiry) {
            emit PaymentFailed(p.payer, p.orderId, "Session expired");
            return;
        }

        // 2. 检查单笔限额 (核心逻辑)
        if (p.amount > sess.maxAmountPerTx) {
            emit PaymentFailed(p.payer, p.orderId, "Exceeds session limit");
            return;
        }

        // 3. 执行转账 (Session 模式不需要消耗 nonce，也不需要验证 v/r/s)
        _safeTransferFrom(p.payer, p.recipient, p.amount, p.orderId, "SESSION");
    }

    // 统一的转账与资金检查逻辑
    function _safeTransferFrom(address payer, address recipient, uint256 amount, string memory orderId, string memory mode) private {
        // 检查授权
        uint256 allowance = usdtToken.allowance(payer, address(this));
        if (allowance < amount) {
            emit PaymentFailed(payer, orderId, "Insufficient allowance");
            return;
        }

        // 检查余额
        uint256 balance = usdtToken.balanceOf(payer);
        if (balance < amount) {
            emit PaymentFailed(payer, orderId, "Insufficient balance");
            return;
        }

        // 执行转账 (Soft Fail)
        try usdtToken.transferFrom(payer, recipient, amount) returns (bool success) {
            if (success) {
                emit PaymentExecuted(payer, recipient, amount, orderId, mode);
            } else {
                emit PaymentFailed(payer, orderId, "Transfer returned false");
            }
        } catch {
            emit PaymentFailed(payer, orderId, "Transfer reverted");
        }
    }

    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }
}