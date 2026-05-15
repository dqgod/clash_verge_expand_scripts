# Clash Script

## 项目概述

Clash Verge Rev 全局扩展脚本，基于 JavaScript（QuickJS 兼容），在配置加载时自动按代理目标地区和服务类型创建代理组及规则。

## 文件说明

| 文件 | 用途 |
|------|------|
| `extension-script.js` | Clash Verge 扩展脚本（核心） |
| `config.yaml` | Clash 代理配置（托管订阅，~6800行） |
| `site-list.txt` | 服务规则集 URL 列表（参考用） |

## extension-script.js 架构

### 两大功能模块

1. **地区分组** — 解析代理名称中的目标地区，自动创建 `url-test` 类型代理组
2. **服务分组** — 基于 Surge 规则集创建 `select` 类型代理组，不含单个代理，只引用上游组

### 配置区（顶部）

- `USE_PROXY` / `PROXY_URL` — GitHub 访问代理开关
- `SITE_CONFIG` — 服务规则集配置，支持两种格式：
  - 字符串：`'https://.../YouTube.list'` — 名称从 URL 自动提取，默认图标 🌐
  - 对象：`{ url: '...', icon: '💳' }` — 名称仍自动提取，可覆盖图标
- `DOMAIN_CACHE` — 预拉取的域名数据（自更新生成，勿手动编辑）

### 地区检测逻辑

根据代理名称的三条规则推断目标地区：
1. "转" 后的第一个已知地区关键词（`上海电信转台湾BGP` → 台湾）
2. 名称以已知地区开头（`台湾HiNet` → 台湾）
3. 包含"广港"或"深港"（`广港专线`、`深港专线` → 香港）

支持的 8 个地区：台湾、香港、日本、新加坡、美国、德国、英国、韩国

### QuickJS 兼容要求

Clash Verge 运行在 QuickJS 沙箱中，代码必须遵循：
- `main(config, profileName)` 必须同步返回 config 对象（不支持 async）
- 禁止 `require()`、`module.exports`（仅 Node.js 测试环境使用）
- 避免箭头函数、`for...of`、`Set`/`Map`、spread 操作符（兼容性）
- 使用 `var`、传统 `for` 循环、`indexOf`、`Object.keys`

### 幂等性

脚本可能被多次调用（配置刷新时），所有操作均检查是否已存在：
- 代理组名去重
- 规则去重
- 服务组不注入 `🚀 节点选择`（防止循环依赖：服务组 → 节点选择 → 服务组）

### 规则优先级

新增服务规则插入到规则列表**最前面**，确保优先于通用规则（如 `🌍 国外媒体`）匹配。

## 核心代理组关系

```
🚀 节点选择 (select)
  ├── ♻️ 自动选择 (url-test, 所有节点)
  ├── 🇹🇼 台湾节点 (url-test)
  ├── 🇭🇰 香港节点 (url-test)
  ├── ... (其他地区节点)
  └── DIRECT

💳 PayPal (select, 只引用其他组)
  ├── 🚀 节点选择
  ├── ♻️ 自动选择
  ├── 各地区节点...
  └── 🎯 全球直连
```

服务组不被注入到节点选择中（避免循环依赖），用户直接在代理面板中切换。

## 开发流程

### 新增服务

1. 编辑 `extension-script.js`，在 `SITE_CONFIG` 中加一行 URL
2. 运行 `node extension-script.js` 拉取域名（需代理 `127.0.0.1:7897`）
3. 将 `extension-script.js` 填入 Clash Verge → Settings → Extension Script

### 测试

```bash
node -e "
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.load(fs.readFileSync('./config.yaml', 'utf8'));
const { main } = require('./extension-script.js');
const result = main(JSON.parse(JSON.stringify(config)));
// 检查 result['proxy-groups'] 和 result.rules
"
```

### 自更新

```bash
node extension-script.js
```

读取 `SITE_CONFIG` → 通过代理拉取所有域名 → 更新 `DOMAIN_CACHE` 行。

## 注意事项

- `config.yaml` 由托管 URL 定期更新，不应手动修改
- 代理端口：HTTP 7890, SOCKS 7891, 本地代理 7897, API 9090
- `DOMAIN_CACHE` 是 SITE_CONFIG 的快照缓存，改 SITE_CONFIG 后必须运行自更新
