// Clash Verge 全局扩展脚本
// 功能：按代理目标地区（台湾、香港、日本、新加坡、美国、德国、英国、韩国）
// 自动创建 url-test 类型的代理组

const REGION_INFO = {
    '台湾':   { flag: '🇹🇼' },
    '香港':   { flag: '🇭🇰' },
    '日本':   { flag: '🇯🇵' },
    '新加坡': { flag: '🇸🇬' },
    '美国':   { flag: '🇺🇸' },
    '德国':   { flag: '🇩🇪' },
    '英国':   { flag: '🇬🇧' },
    '韩国':   { flag: '🇰🇷' },
};

const KNOWN_REGIONS = Object.keys(REGION_INFO);

function detectRegion(name) {
    // 规则1: "转"后面的文字以已知地区开头
    const idx = name.indexOf('转');
    if (idx !== -1) {
        const after = name.slice(idx + 1);
        for (const region of KNOWN_REGIONS) {
            if (after.startsWith(region)) {
                return region;
            }
        }
    }

    // 规则2: 名称以已知地区开头（原生节点如 台湾HiNet、美国BGP）
    for (const region of KNOWN_REGIONS) {
        if (name.startsWith(region)) {
            return region;
        }
    }

    // 规则3: 广港/深港专线（不含"转"的直达专线）
    if (name.includes('广港') || name.includes('深港')) {
        return '香港';
    }

    return null;
}

function main(config, profileName) {
    const proxies = config.proxies;
    if (!proxies || !Array.isArray(proxies) || proxies.length === 0) {
        return config;
    }

    const proxyGroups = config['proxy-groups'] || [];

    // 按地区分组代理名称
    const regionGroups = {};
    for (const proxy of proxies) {
        const name = proxy.name;
        if (typeof name !== 'string') continue;

        const region = detectRegion(name);
        if (!region) continue;

        if (!regionGroups[region]) {
            regionGroups[region] = [];
        }
        regionGroups[region].push(name);
    }

    // 已有分组名称（用于幂等性检查）
    const existingNames = new Set(proxyGroups.map(g => g.name));

    // 收集新创建的地区组名（按地区顺序）
    const newGroupNames = [];

    // 为每个地区创建 url-test 组
    for (const region of KNOWN_REGIONS) {
        const proxyNames = regionGroups[region];
        if (!proxyNames || proxyNames.length === 0) continue;

        const info = REGION_INFO[region];
        const groupName = `${info.flag} ${region}节点`;

        if (existingNames.has(groupName)) {
            // 幂等：已存在则只记录名称用于后续注入
            newGroupNames.push(groupName);
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
        newGroupNames.push(groupName);
    }

    config['proxy-groups'] = proxyGroups;

    // 将地区分组注入到 🚀 节点选择 的 proxies 列表中
    // 插入在 ♻️ 自动选择 之后、DIRECT 之前
    const nodeSelect = proxyGroups.find(g => g.name === '🚀 节点选择');
    if (nodeSelect && nodeSelect.proxies) {
        // 找到 ♻️ 自动选择 的位置，插入到其后
        const autoIdx = nodeSelect.proxies.indexOf('♻️ 自动选择');
        let insertIdx = autoIdx >= 0 ? autoIdx + 1 : 0;

        for (const name of newGroupNames) {
            if (!nodeSelect.proxies.includes(name)) {
                nodeSelect.proxies.splice(insertIdx, 0, name);
                insertIdx++;
            }
        }
    }

    return config;
}

// 仅在 Node.js 测试环境导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { main, detectRegion };
}
