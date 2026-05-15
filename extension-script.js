// Clash Verge 全局扩展脚本
// 功能：
//   1. 按代理目标地区自动创建 url-test 类型的代理组
//   2. 按服务（PayPal/OpenAI/TikTok等）创建 select 类型代理组，并添加对应规则
//
// 用法：将此文件路径填入 Clash Verge → Settings → Extension Script
// 更新域名数据：node update-domains.js

// ==================== 配置区 ====================

// 是否走本地代理访问 GitHub（仅 update-domains.js 使用）
var USE_PROXY = true;
// 本地代理地址
var PROXY_URL = 'http://127.0.0.1:7897';

// 服务规则集配置
// 支持两种格式：
//   1. 仅 URL 字符串 → 自动从文件名提取名称，默认图标 🌐
//   2. {url, icon} 对象 → 可覆盖图标（name 仍自动提取）
// 新增服务只需添加一行 URL 即可，无需手动指定 name/icon
var SITE_CONFIG = [
    { url: 'https://raw.githubusercontent.com/ConnersHua/RuleGo/refs/heads/master/Surge/Ruleset/Extra/PayPal.list', icon: '💳' },
    { url: 'https://raw.githubusercontent.com/ConnersHua/RuleGo/refs/heads/master/Surge/Ruleset/Extra/GenAI/Anthropic.list', icon: '🤖' },
    { url: 'https://raw.githubusercontent.com/ConnersHua/RuleGo/refs/heads/master/Surge/Ruleset/Extra/GenAI/OpenAI.list', icon: '🤖' },
    { url: 'https://raw.githubusercontent.com/ConnersHua/RuleGo/refs/heads/master/Surge/Ruleset/Extra/Streaming/Video/TikTok.list', icon: '🎬' },
    'https://raw.githubusercontent.com/ConnersHua/RuleGo/refs/heads/master/Surge/Ruleset/Extra/Streaming/Video/YouTube.list',
];

// ==================== 预拉取的域名缓存 ====================
// 由 update-domains.js 自动生成，请勿手动编辑

var DOMAIN_CACHE = { "PayPal": { "icon": "💳", "rules": [{ "type": "DOMAIN-SUFFIX", "domain": "paypal.com" }, { "type": "DOMAIN-SUFFIX", "domain": "paypal.me" }, { "type": "DOMAIN-SUFFIX", "domain": "paypal-mktg.com" }, { "type": "DOMAIN-SUFFIX", "domain": "paypalobjects.com" }] }, "Anthropic": { "icon": "🤖", "rules": [{ "type": "DOMAIN-SUFFIX", "domain": "claude.ai" }, { "type": "DOMAIN-SUFFIX", "domain": "claude.com" }, { "type": "DOMAIN-SUFFIX", "domain": "anthropic.com" }] }, "OpenAI": { "icon": "🤖", "rules": [{ "type": "DOMAIN-SUFFIX", "domain": "chat.com" }, { "type": "DOMAIN-SUFFIX", "domain": "chatgpt.com" }, { "type": "DOMAIN-SUFFIX", "domain": "livekit.cloud" }, { "type": "DOMAIN-SUFFIX", "domain": "oaistatic.com" }, { "type": "DOMAIN-SUFFIX", "domain": "oaiusercontent.com" }, { "type": "DOMAIN-SUFFIX", "domain": "openai.com" }, { "type": "DOMAIN-SUFFIX", "domain": "sora.com" }, { "type": "DOMAIN", "domain": "api.statsig.com" }, { "type": "DOMAIN", "domain": "api-iam.intercom.io" }, { "type": "DOMAIN", "domain": "o33249.ingest.sentry.io" }, { "type": "DOMAIN", "domain": "openaiapi-site.azureedge.net" }] }, "TikTok": { "icon": "🎬", "rules": [{ "type": "DOMAIN-SUFFIX", "domain": "byteoversea.com" }, { "type": "DOMAIN-SUFFIX", "domain": "ibytedtos.com" }, { "type": "DOMAIN-SUFFIX", "domain": "muscdn.com" }, { "type": "DOMAIN-SUFFIX", "domain": "musical.ly" }, { "type": "DOMAIN-SUFFIX", "domain": "tiktok.com" }, { "type": "DOMAIN-SUFFIX", "domain": "tik-tokapi.com" }, { "type": "DOMAIN-SUFFIX", "domain": "tiktokcdn.com" }, { "type": "DOMAIN-SUFFIX", "domain": "tiktokcdn-eu.com" }, { "type": "DOMAIN-SUFFIX", "domain": "tiktokv.com" }, { "type": "DOMAIN-SUFFIX", "domain": "ttwstatic.com" }] }, "YouTube": { "icon": "🌐", "rules": [{ "type": "DOMAIN-SUFFIX", "domain": "googlevideo.com" }, { "type": "DOMAIN-SUFFIX", "domain": "withyoutube.com" }, { "type": "DOMAIN-SUFFIX", "domain": "youtu.be" }, { "type": "DOMAIN-SUFFIX", "domain": "youtube.com" }, { "type": "DOMAIN-SUFFIX", "domain": "youtubeeducation.com" }, { "type": "DOMAIN-SUFFIX", "domain": "youtubegaming.com" }, { "type": "DOMAIN-SUFFIX", "domain": "youtubekids.com" }, { "type": "DOMAIN-SUFFIX", "domain": "youtube-nocookie.com" }, { "type": "DOMAIN-SUFFIX", "domain": "yt.be" }, { "type": "DOMAIN-SUFFIX", "domain": "ytimg.com" }, { "type": "DOMAIN", "domain": "youtubei.googleapis.com" }, { "type": "DOMAIN", "domain": "yt3.ggpht.com" }] } };

// ==================== 地区检测 ====================

var REGION_INFO = {
    '台湾': { flag: '🇹🇼' },
    '香港': { flag: '🇭🇰' },
    '日本': { flag: '🇯🇵' },
    '新加坡': { flag: '🇸🇬' },
    '美国': { flag: '🇺🇸' },
    '德国': { flag: '🇩🇪' },
    '英国': { flag: '🇬🇧' },
    '韩国': { flag: '🇰🇷' },
};

var KNOWN_REGIONS = ['台湾', '香港', '日本', '新加坡', '美国', '德国', '英国', '韩国'];

function detectRegion(name) {
    var idx = name.indexOf('转');
    if (idx !== -1) {
        var after = name.slice(idx + 1);
        for (var i = 0; i < KNOWN_REGIONS.length; i++) {
            if (after.indexOf(KNOWN_REGIONS[i]) === 0) {
                return KNOWN_REGIONS[i];
            }
        }
    }

    for (var i = 0; i < KNOWN_REGIONS.length; i++) {
        if (name.indexOf(KNOWN_REGIONS[i]) === 0) {
            return KNOWN_REGIONS[i];
        }
    }

    if (name.indexOf('广港') !== -1 || name.indexOf('深港') !== -1) {
        return '香港';
    }

    return null;
}

// ==================== 辅助函数 ====================

function arrayIncludes(arr, val) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === val) return true;
    }
    return false;
}

function dedupPush(arr, val) {
    if (!arrayIncludes(arr, val)) {
        arr.push(val);
    }
}

// 统一 SITE_CONFIG 条目为 {url, name, icon} 格式
// 支持传入 URL 字符串或 {url, name?, icon?} 对象
function normalizeSiteConfig(site) {
    if (typeof site === 'string') {
        var name = site.split('/').pop().replace('.list', '');
        return { url: site, name: name, icon: '\u{1F310}' }; // 🌐
    }
    return {
        url: site.url,
        name: site.name || site.url.split('/').pop().replace('.list', ''),
        icon: site.icon || '\u{1F310}',
    };
}

function makeRuleProviderName(serviceName) {
    var raw = String(serviceName || '').toLowerCase();
    var out = '';
    var lastDash = false;

    for (var i = 0; i < raw.length; i++) {
        var code = raw.charCodeAt(i);
        var isNumber = code >= 48 && code <= 57;
        var isLower = code >= 97 && code <= 122;

        if (isNumber || isLower) {
            out += raw.charAt(i);
            lastDash = false;
        } else if (!lastDash && out.length > 0) {
            out += '-';
            lastDash = true;
        }
    }

    if (out.charAt(out.length - 1) === '-') {
        out = out.slice(0, out.length - 1);
    }

    return 'site-' + (out || 'ruleset');
}

// ==================== 主函数 ====================

function main(config, profileName) {
    var proxies = config.proxies;
    if (!proxies || !Array.isArray(proxies) || proxies.length === 0) {
        return config;
    }

    var proxyGroups = config['proxy-groups'] || [];
    var rules = config.rules || [];

    // ========== 第一部分：地区分组 ==========

    var regionGroups = {};
    for (var i = 0; i < KNOWN_REGIONS.length; i++) {
        regionGroups[KNOWN_REGIONS[i]] = [];
    }

    for (var i = 0; i < proxies.length; i++) {
        var name = proxies[i].name;
        if (typeof name !== 'string') continue;

        var region = detectRegion(name);
        if (!region) continue;

        regionGroups[region].push(name);
    }

    // 收集已有分组名
    var existingNames = {};
    for (var i = 0; i < proxyGroups.length; i++) {
        existingNames[proxyGroups[i].name] = true;
    }

    var newRegionGroupNames = [];

    for (var i = 0; i < KNOWN_REGIONS.length; i++) {
        var region = KNOWN_REGIONS[i];
        var proxyNames = regionGroups[region];
        if (!proxyNames || proxyNames.length === 0) continue;

        var info = REGION_INFO[region];
        var groupName = info.flag + ' ' + region + '节点';

        if (existingNames[groupName]) {
            newRegionGroupNames.push(groupName);
            continue;
        }

        proxyGroups.push({
            name: groupName,
            type: 'url-test',
            proxies: proxyNames,
            url: 'http://www.gstatic.com/generate_204',
            interval: 300,
            tolerance: 50,
        });
        existingNames[groupName] = true;
        newRegionGroupNames.push(groupName);
    }

    // ========== 第二部分：收集上游组引用 ==========

    var upstreamGroupNames = ['🚀 节点选择', '♻️ 自动选择'];
    for (var i = 0; i < newRegionGroupNames.length; i++) {
        upstreamGroupNames.push(newRegionGroupNames[i]);
    }
    upstreamGroupNames.push('🎯 全球直连');

    // ========== 第三部分：服务代理组 + 规则 ==========

    var ruleProviders = config['rule-providers'] || {};

    // 收集已有规则
    var existingRules = {};
    for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        var key = typeof r === 'string' ? r : (r.length ? r.join(',') : '');
        existingRules[key] = true;
    }

    // 以 SITE_CONFIG 为基准生成 rule-providers，由 Clash/Mihomo 内核拉取远程规则。
    // DOMAIN_CACHE 仅保留给 node extension-script.js 自更新备用，不再影响扩展脚本运行。
    var newRules = [];

    for (var si = 0; si < SITE_CONFIG.length; si++) {
        var site = normalizeSiteConfig(SITE_CONFIG[si]);
        var serviceName = site.name;
        var icon = site.icon;
        var serviceGroupName = icon + ' ' + serviceName;
        var providerName = makeRuleProviderName(serviceName);

        // 创建服务代理组
        if (!existingNames[serviceGroupName]) {
            proxyGroups.push({
                name: serviceGroupName,
                type: 'select',
                proxies: upstreamGroupNames.slice(),
            });
            existingNames[serviceGroupName] = true;
        }

        // 创建/更新远程规则集。classical + text 可直接使用 Surge/Clash 规则文本。
        ruleProviders[providerName] = {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: site.url,
            path: './ruleset/' + providerName + '.txt',
            interval: 86400,
        };

        var ruleStr = 'RULE-SET,' + providerName + ',' + serviceGroupName;
        if (!existingRules[ruleStr]) {
            newRules.push(ruleStr);
            existingRules[ruleStr] = true;
        }
    }

    // 新规则插入到规则列表最前面，确保优先匹配
    if (newRules.length > 0) {
        // reverse 保证服务配置顺序不变（PayPal 规则仍在 Anthropic 之前）
        newRules.reverse();
        for (var i = 0; i < newRules.length; i++) {
            rules.unshift(newRules[i]);
        }
    }

    config['proxy-groups'] = proxyGroups;
    config['rule-providers'] = ruleProviders;
    config.rules = rules;

    // ========== 第四部分：注入地区组到 🚀 节点选择 ==========
    // 注意：不注入服务组（PayPal等），否则会产生循环依赖
    // 服务组 ↘ 节点选择 ↘ 服务组 = 环

    var nodeSelect = null;
    for (var i = 0; i < proxyGroups.length; i++) {
        if (proxyGroups[i].name === '🚀 节点选择') {
            nodeSelect = proxyGroups[i];
            break;
        }
    }

    if (nodeSelect && nodeSelect.proxies) {
        var autoIdx = -1;
        for (var i = 0; i < nodeSelect.proxies.length; i++) {
            if (nodeSelect.proxies[i] === '♻️ 自动选择') {
                autoIdx = i;
                break;
            }
        }
        var insertIdx = autoIdx >= 0 ? autoIdx + 1 : 0;

        for (var i = 0; i < newRegionGroupNames.length; i++) {
            var gn = newRegionGroupNames[i];
            if (!arrayIncludes(nodeSelect.proxies, gn)) {
                nodeSelect.proxies.splice(insertIdx, 0, gn);
                insertIdx++;
            }
        }
    }

    return config;
}

// ==================== 导出 ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { main, detectRegion };
}

// ==================== 域名数据自更新 ====================
// 运行 node extension-script.js 即可拉取最新域名并更新 DOMAIN_CACHE
// Clash Verge 中不会执行此段代码

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    var fs = require('fs');
    var path = require('path');

    // 读取代理配置
    var proxyConfPath = process.env.HOME || process.env.USERPROFILE;
    proxyConfPath = path.join(proxyConfPath, 'scripts', 'proxy', 'proxy.conf');
    var proxyUrl = 'http://127.0.0.1:7897';
    try {
        var confText = fs.readFileSync(proxyConfPath, 'utf8');
        var match = confText.match(/PROXY_SERVER=(http:\/\/[^\s]+)/);
        if (match) proxyUrl = match[1];
    } catch (_) { }

    var ProxyAgent;
    try {
        ProxyAgent = require('undici').ProxyAgent;
    } catch (_) {
        console.log('正在安装 undici...');
        require('child_process').execSync('npm install undici', { cwd: __dirname, stdio: 'inherit' });
        ProxyAgent = require('undici').ProxyAgent;
    }

    var agent = new ProxyAgent(proxyUrl);

    console.log('=== 开始拉取域名数据 ===');
    console.log('代理: ' + proxyUrl);
    console.log('');

    var DOMAIN_CACHE = {};
    var totalDomains = 0;

    (async function () {
        for (var i = 0; i < SITE_CONFIG.length; i++) {
            var site = normalizeSiteConfig(SITE_CONFIG[i]);
            try {
                var resp = await fetch(site.url, { dispatcher: agent });
                var text = await resp.text();
                var rules = [];
                var lines = text.split('\n');
                for (var j = 0; j < lines.length; j++) {
                    var t = lines[j].trim();
                    if (!t || t.indexOf('#') === 0 || t.indexOf('USER-AGENT') === 0) continue;
                    if (t.indexOf('DOMAIN-KEYWORD') === 0) continue;
                    if (t.indexOf('DOMAIN-SUFFIX,') === 0) {
                        var d = t.slice('DOMAIN-SUFFIX,'.length).trim();
                        if (d) rules.push({ type: 'DOMAIN-SUFFIX', domain: d });
                    } else if (t.indexOf('DOMAIN,') === 0) {
                        var d = t.slice('DOMAIN,'.length).trim();
                        if (d) rules.push({ type: 'DOMAIN', domain: d });
                    }
                }
                DOMAIN_CACHE[site.name] = { icon: site.icon, rules: rules };
                totalDomains += rules.length;
                console.log('✓ ' + site.name + ': ' + rules.length + ' 个域名');
            } catch (e) {
                console.log('✗ ' + site.name + ': 失败 - ' + e.message);
            }
        }

        // 更新本文件中的 DOMAIN_CACHE
        var selfPath = __filename || path.join(__dirname, 'extension-script.js');
        var selfContent = fs.readFileSync(selfPath, 'utf8');
        var jsonStr = JSON.stringify(DOMAIN_CACHE);
        var newContent = selfContent.replace(
            /var DOMAIN_CACHE = \{[\s\S]*?\};/,
            'var DOMAIN_CACHE = ' + jsonStr + ';'
        );

        if (newContent !== selfContent) {
            fs.writeFileSync(selfPath, newContent, 'utf8');
            console.log('');
            console.log('✓ DOMAIN_CACHE 已更新 (' + jsonStr.length + ' bytes)');
        } else {
            console.log('');
            console.log('✓ DOMAIN_CACHE 已是最新（无需更新）');
        }
        console.log('总计: ' + totalDomains + ' 个域名, ' + Object.keys(DOMAIN_CACHE).length + ' 个服务');
        console.log('=== 完成 ===');
    })().catch(function (e) {
        console.error('更新失败: ' + e.message);
        process.exit(1);
    });
}
