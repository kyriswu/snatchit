部署合约流程
1. npm install -g tronbox （安装依赖）
2. tronbox init （去到指定的目录初始化）

TronBox 不支持把 version 指向本地文件，它只会去 ~/.tronbox/solc/soljson_v<version>.js 找缓存。
我已把配置改回版本号并把本地编译器复制到 TronBox 的缓存位置。

3. tronbox compile
4. tronbox migrate --network nile
查看合约地址：https://nile.tronscan.org/#/

AgentPay:
    (base58) TS9vEcWUkPZ9LtiC2D5XtM8e8ZDwgS82K2
    (hex) 41b18897a1981c064f88bdf4cdd23ee465abb371e2

AgentPayUnified:
    (base58) TSdxuDBC46UQ4i1YH2kq1ujs91CFiKQxDV
    (hex) 41b6d676da4bb94293c13f518f3f4533909b85621a

    AgentPayBatch:
    (base58) TFdSFLMVN7qqDZgnuzQh2DocQjYPaX8ex9
    (hex) 413e137e26beb9549b5a3dcac2c6123cc0acb9f45c