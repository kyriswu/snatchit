// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITRC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract AgentPayBatch {
    address public owner;
    ITRC20 public usdtToken;

    event PaymentExecuted(address indexed payer, address indexed recipient, uint256 amount, string orderId);

    constructor(address _usdtAddress) {
        owner = msg.sender;
        usdtToken = ITRC20(_usdtAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only Agent can trigger payment");
        _;
    }

    /**
     * @dev 批量执行支付
     * @param _payers 用户地址数组
     * @param _recipients 收款地址数组
     * @param _amounts 金额数组
     * @param _orderIds 订单号数组
     */
    function executeBatchPayments(
        address[] calldata _payers,
        address[] calldata _recipients,
        uint256[] calldata _amounts,
        string[] calldata _orderIds
    ) external onlyOwner {
        uint256 len = _payers.length;
        
        // 基础检查：确保所有数组长度一致
        require(len == _recipients.length && len == _amounts.length && len == _orderIds.length, "Array lengths mismatch");

        for (uint256 i = 0; i < len; i++) {
            address payer = _payers[i];
            address recipient = _recipients[i];
            uint256 amount = _amounts[i];
            string calldata orderId = _orderIds[i];

            // 1. 检查授权额度
            uint256 allowance = usdtToken.allowance(payer, address(this));
            require(allowance >= amount, "Insufficient allowance for a specific payer");

            // 2. 执行转账
            bool success = usdtToken.transferFrom(payer, recipient, amount);
            require(success, "Transfer failed in batch");

            // 3. 抛出事件
            emit PaymentExecuted(payer, recipient, amount, orderId);
        }
    }
}