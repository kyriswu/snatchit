import axios from 'axios';

// 默认 Facilitator 服务地址
const DEFAULT_FACILITATOR_URL = 'http://localhost:4000';

/**
 * Facilitator API 客户端
 * 封装所有与 Facilitator 服务的交互接口
 */
class FacilitatorClient {
    /**
     * @param {Object} options - 可选配置
     * @param {string} options.baseUrl - Facilitator 服务地址（默认 http://localhost:4000）
     * @param {number} options.timeout - 请求超时时间（ms）
     */
    constructor(options = {}) {
        this.baseUrl = (options.baseUrl || DEFAULT_FACILITATOR_URL).replace(/\/$/, '');
        this.timeout = options.timeout || 30000;
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * 风控检查接口
     * @param {Object} payload - 风控检查数据
     * @param {string} payload.from - 付款方地址
     * @param {string} payload.to - 收款方地址
     * @param {string} payload.value - 支付金额
     * @param {string} payload.policy - 策略名称
     * @returns {Promise<Object>} 风控结果
     */
    async checkRisk(payload) {
        try {
            const response = await this.axiosInstance.post('/check-risk', payload);
            return {
                success: response.data.success,
                data: response.data.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * 结算接口 - 提交签名并执行链上转账
     * @param {Object} payload - 结算数据
     * @param {Object} payload.authorization - EIP-712 授权数据
     * @param {string} payload.signature - 签名
     * @returns {Promise<Object>} 结算结果（包含 txId）
     */
    async settle(payload) {
        try {
            const response = await this.axiosInstance.post('/settle', payload);
            return {
                success: true,
                txId: response.data.txId,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * 验证支付 - 服务端验证 x402 payload
     * @param {Object} payload - 验证数据
     * @param {Object} payload.authorization - 授权信息
     * @param {string} payload.signature - 签名
     * @returns {Promise<Object>} 验证结果
     */
    async verifyPayment(payload) {
        try {
            const response = await this.axiosInstance.post('/verify', payload);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * 查询交易状态
     * @param {string} invoiceId - 订单号/发票ID
     * @returns {Promise<Object>} 交易状态
     */
    async getPaymentStatus(invoiceId) {
        try {
            const response = await this.axiosInstance.get(`/payment-status/${invoiceId}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * 批量风控检查（聚合支付）
     * @param {Array} payments - 支付数组
     * @returns {Promise<Object>} 批量风控结果
     */
    async checkRiskBatch(payments) {
        try {
            const response = await this.axiosInstance.post('/check-risk-batch', { payments });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * 批量结算（聚合支付）
     * @param {Object} payload - 批量结算数据
     * @param {string} payload.batchId - 批次ID
     * @param {Array} payload.transactions - 交易数组
     * @returns {Promise<Object>} 批量结算结果
     */
    async settleBatch(payload) {
        try {
            const response = await this.axiosInstance.post('/settle-batch', payload);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * 获取支付策略信息
     * @param {string} policyName - 策略名称
     * @returns {Promise<Object>} 策略详情
     */
    async getPolicyInfo(policyName) {
        try {
            const response = await this.axiosInstance.get(`/policy/${policyName}`);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * 创建支付日志
     * @param {Object} payload - 支付日志数据
     * @param {string} payload.requestId - 请求ID
     * @param {string} payload.accessKey - 访问密钥
     * @param {string} payload.fromAddress - 付款方地址
     * @param {string} payload.toAddress - 收款方地址
     * @param {string} payload.amount - 支付金额
     * @param {string} payload.status - 支付状态（可选，默认 PENDING）
     * @param {string} payload.txHash - 交易哈希（可选）
     * @param {string} payload.errorMessage - 错误信息（可选）
     * @returns {Promise<Object>} 创建结果
     */
    async createPaymentLog(payload) {
        try {
            const response = await this.axiosInstance.post('/createPaymentLog', payload);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * 健康检查
     * @returns {Promise<Object>} 服务健康状态
     */
    async healthCheck() {
        try {
            const response = await this.axiosInstance.get('/health');
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 设置自定义请求头
     * @param {Object} headers - 自定义请求头
     */
    setHeaders(headers) {
        Object.assign(this.axiosInstance.defaults.headers, headers);
    }

    /**
     * 设置超时时间
     * @param {number} timeout - 超时时间（ms）
     */
    setTimeout(timeout) {
        this.timeout = timeout;
        this.axiosInstance.defaults.timeout = timeout;
    }
}

/**
 * 创建 Facilitator 客户端实例
 * @param {Object} options - 可选配置
 * @param {string} options.baseUrl - Facilitator 服务地址（可选，默认 http://localhost:4000）
 * @param {number} options.timeout - 请求超时时间（ms）
 * @returns {FacilitatorClient} 客户端实例
 */
export function createFacilitatorClient(options = {}) {
    return new FacilitatorClient(options);
}

export { FacilitatorClient };
export default FacilitatorClient;
