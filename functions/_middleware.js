// ============================================
// CLOUDFLARE PAGES FUNCTION — SEO SSR MIDDLEWARE
// Portfolio + Multi-Domain version
// Intercepts bot/crawler requests and returns pre-rendered HTML
// with all meta tags, JSON-LD, and OG tags baked into the response.
// Normal users get the original static files (no change).
// ============================================

const BOT_USER_AGENTS = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'sogou', 'exabot', 'facebot', 'facebookexternalhit',
    'ia_archiver', 'twitterbot', 'linkedinbot', 'embedly', 'quora link preview',
    'showyoubot', 'outbrain', 'pinterest', 'applebot', 'semrushbot',
    'ahrefsbot', 'mj12bot', 'telegrambot', 'whatsapp', 'discordbot',
    'slackbot', 'rogerbot', 'dotbot', 'petalbot', 'bytespider',
    'gptbot', 'chatgpt-user', 'claudebot', 'anthropic-ai'
];

function isBot(userAgent) {
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    return BOT_USER_AGENTS.some(bot => ua.includes(bot));
}

export async function onRequest(context) {
    const { request, next } = context;
    const ua = request.headers.get('user-agent') || '';
    const url = new URL(request.url);

    if (!isBot(ua)) return next();
    // Let static assets through
    if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|avif|json|xml|txt)$/i)) {
        return next();
    }
    if (url.pathname !== '/' && url.pathname !== '/index.html') {
        return next();
    }

    try {
        const [configResp, templatesResp] = await Promise.all([
            context.env.ASSETS.fetch(new URL('/config.js', url.origin)),
            context.env.ASSETS.fetch(new URL('/assets/js/templates.js', url.origin))
        ]);

        const configText = await configResp.text();
        const templatesText = await templatesResp.text();

        const { portfolioConfig, allDomainConfigs, creator } = extractConfigs(configText);
        const templates = extractTemplates(templatesText);

        if (!portfolioConfig) return next();

        const hostname = url.hostname.replace('www.', '');
        const isPortfolio = (hostname === portfolioConfig.domain);

        let html;
        if (isPortfolio) {
            html = renderPortfolioHTML(portfolioConfig, allDomainConfigs, templates, creator, url);
        } else {
            const domainConfig = allDomainConfigs[hostname] || allDomainConfigs['_default'];
            if (!domainConfig || !domainConfig.domain) return next();
            const template = templates[domainConfig.template] || templates[1] || {};
            html = renderSalePageHTML(domainConfig, template, allDomainConfigs, portfolioConfig, creator, url);
        }

        return new Response(html, {
            status: 200,
            headers: {
                'content-type': 'text/html; charset=utf-8',
                'cache-control': 'public, max-age=3600, s-maxage=86400',
                'x-robots-tag': 'index, follow',
                'x-rendered-by': 'ssr-bot-middleware'
            }
        });
    } catch (e) {
        console.error('SSR middleware error:', e);
        return next();
    }
}

// ============================================
// CONFIG EXTRACTION
// ============================================

function extractConfigs(configText) {
    try {
        let cleaned = configText
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');

        // Extract PORTFOLIO_CONFIG
        let portfolioConfig = null;
        const pcMatch = cleaned.match(/(?:let|const|var)\s+PORTFOLIO_CONFIG\s*=\s*(\{[\s\S]*?\});/);
        if (pcMatch) {
            portfolioConfig = safeParseObject(pcMatch[1]);
        }

        // Extract ALL_DOMAIN_CONFIGS — complex nested object
        let allDomainConfigs = {};
        const adcMatch = cleaned.match(/(?:let|const|var)\s+ALL_DOMAIN_CONFIGS\s*=\s*(\{[\s\S]*\});\s*(?:const|let|var)\s+CREATOR/);
        if (adcMatch) {
            allDomainConfigs = parseAllDomainConfigs(adcMatch[1]);
        }

        // Extract CREATOR
        let creator = { name: 'ABTDomain', github: 'https://github.com/ABTdomain', version: '1.0.0' };
        const creatorMatch = cleaned.match(/(?:let|const|var)\s+CREATOR\s*=\s*(\{[\s\S]*?\});/);
        if (creatorMatch) {
            try { creator = safeParseObject(creatorMatch[1]); } catch (e) { /* defaults */ }
        }

        return { portfolioConfig, allDomainConfigs, creator };
    } catch (e) {
        console.error('Config extraction error:', e);
        return { portfolioConfig: null, allDomainConfigs: {}, creator: {} };
    }
}

function parseAllDomainConfigs(rawStr) {
    const configs = {};
    // Match each key: { ... } block
    const entryRegex = /'([^']+)'\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    let m;
    while ((m = entryRegex.exec(rawStr)) !== null) {
        const key = m[1];
        const body = m[2];
        const config = {};

        // Extract string properties
        ['domain', 'title', 'displayUrl', 'price', 'logoOrImage', 'currency', 'googleAnalytics'].forEach(prop => {
            const re = new RegExp(`${prop}\\s*:\\s*["']([^"']*)["']`);
            const pm = body.match(re);
            if (pm) config[prop] = pm[1];
        });

        // Extract template number
        const tplMatch = body.match(/template\s*:\s*(\d+)/);
        if (tplMatch) config.template = parseInt(tplMatch[1]);

        // Extract booleans
        const negMatch = body.match(/priceNegotiable\s*:\s*(true|false)/);
        if (negMatch) config.priceNegotiable = negMatch[1] === 'true';

        // Extract features array
        const featMatch = body.match(/features\s*:\s*\[([\s\S]*?)\]/);
        if (featMatch) {
            config.features = [];
            const featStr = featMatch[1];
            const fRe = /["']([^"']+)["']/g;
            let fm;
            while ((fm = fRe.exec(featStr)) !== null) {
                config.features.push(fm[1]);
            }
        }

        // Extract marketplaces array
        const mpMatch = body.match(/marketplaces\s*:\s*\[([\s\S]*?)\]/);
        if (mpMatch) {
            config.marketplaces = [];
            const mpRe = /["']([^"']+)["']/g;
            let mm;
            while ((mm = mpRe.exec(mpMatch[1])) !== null) {
                config.marketplaces.push(mm[1]);
            }
        }

        // Extract payments array
        const payMatch = body.match(/payments\s*:\s*\[([\s\S]*?)\]/);
        if (payMatch) {
            config.payments = [];
            const payRe = /["']([^"']+)["']/g;
            let pm;
            while ((pm = payRe.exec(payMatch[1])) !== null) {
                config.payments.push(pm[1]);
            }
        }

        // Extract contact object
        const contactMatch = body.match(/contact\s*:\s*\{([^}]*)\}/);
        if (contactMatch) {
            config.contact = {};
            const cRe = /(\w+)\s*:\s*["']([^"']*)["']/g;
            let cm;
            while ((cm = cRe.exec(contactMatch[1])) !== null) {
                config.contact[cm[1]] = cm[2];
            }
        }

        configs[key] = config;
    }
    return configs;
}

function safeParseObject(str) {
    try {
        const cleaned = str
            .replace(/'/g, '"')
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/(\w+)\s*:/g, '"$1":');
        return JSON.parse(cleaned);
    } catch (e) {
        // Fallback: extract basic properties
        const obj = {};
        const re = /(\w+)\s*:\s*["']([^"']*)["']/g;
        let m;
        while ((m = re.exec(str)) !== null) {
            obj[m[1]] = m[2];
        }
        // Extract nested contact
        const contactMatch = str.match(/contact\s*:\s*\{([\s\S]*?)\}/);
        if (contactMatch) {
            obj.contact = {};
            const cRe = /(\w+)\s*:\s*["']([^"']*)["']/g;
            let cm;
            while ((cm = cRe.exec(contactMatch[1])) !== null) {
                obj.contact[cm[1]] = cm[2];
            }
        }
        // Extract template number
        const tplMatch = str.match(/template\s*:\s*(\d+)/);
        if (tplMatch) obj.template = parseInt(tplMatch[1]);
        return obj;
    }
}

function extractTemplates(templatesText) {
    try {
        let cleaned = templatesText
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');
        const match = cleaned.match(/(?:let|const|var)\s+TEMPLATES\s*=\s*(\{[\s\S]*\});/);
        if (!match) return {};
        const templates = {};
        const templateRegex = /(\d+)\s*:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
        let m;
        while ((m = templateRegex.exec(match[1])) !== null) {
            const id = parseInt(m[1]);
            const body = m[2];
            const t = {};
            ['name', 'background', 'primaryColor', 'secondaryColor', 'textColor',
                'buttonColor', 'buttonTextColor', 'font', 'fontHeading', 'cardStyle',
                'borderRadius', 'cardBackground', 'cardBorder'].forEach(prop => {
                const re = new RegExp(`${prop}\\s*:\\s*["']([^"']+)["']`);
                const pm = body.match(re);
                if (pm) t[prop] = pm[1];
            });
            templates[id] = t;
        }
        return templates;
    } catch (e) {
        return {};
    }
}

// ============================================
// PORTFOLIO PAGE RENDERING
// ============================================

function renderPortfolioHTML(portfolioConfig, allDomainConfigs, templates, creator, url) {
    const title = portfolioConfig.title || 'Domain Portfolio';
    const description = portfolioConfig.description || 'Premium domain portfolio for sale.';
    const canonicalUrl = `https://${portfolioConfig.domain}/`;
    const template = templates[portfolioConfig.template] || templates[10] || {};

    // Build domain list for structured data
    const domainList = Object.keys(allDomainConfigs)
        .filter(k => k !== '_default')
        .map(k => allDomainConfigs[k]);

    const schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": title,
        "description": description,
        "url": canonicalUrl,
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": domainList.length,
            "itemListElement": domainList.map((d, i) => ({
                "@type": "ListItem",
                "position": i + 1,
                "item": {
                    "@type": "Product",
                    "name": d.title || d.domain,
                    "url": d.displayUrl || `https://${d.domain}`,
                    "offers": {
                        "@type": "Offer",
                        "price": (d.price || '0').replace(/,/g, ''),
                        "priceCurrency": d.currency || 'USD'
                    }
                }
            }))
        }
    };

    const fontsLink = buildFontsLink(template);

    // Build domain cards
    let cardsHtml = '';
    domainList.forEach(d => {
        const price = formatPrice(d);
        const linkUrl = d.displayUrl || `https://${d.domain}`;
        const displayName = d.title || d.domain;
        cardsHtml += `                    <a href="${escHtml(linkUrl)}" class="card portfolio-card">
                        <div class="portfolio-card-domain">${escHtml(displayName)}</div>
                        <div class="portfolio-card-price">${escHtml(price)}</div>
                        <div class="portfolio-card-feature">${escHtml(d.features?.[0] || 'Premium Domain')}</div>
                    </a>\n`;
    });

    // Contact section
    let contactHtml = '';
    if (portfolioConfig.contact) {
        const c = portfolioConfig.contact;
        contactHtml = `            <section class="section" id="portfolioContactSection">
                <div class="container">
                    <h2 class="section-title">${escHtml(c.title || 'Get In Touch')}</h2>
                    <p class="portfolio-description">${escHtml(c.text || '')}</p>
                    <div class="grid">
                        ${c.email ? `<a href="mailto:${escHtml(c.email)}" target="_blank" rel="noopener" class="card"><div class="label">Email</div><div class="value">${escHtml(c.email)}</div></a>` : ''}
                        ${c.x ? `<a href="https://x.com/${escHtml(c.x.replace('@', ''))}" target="_blank" rel="noopener" class="card"><div class="label">X (Twitter)</div><div class="value">${escHtml(c.x)}</div></a>` : ''}
                    </div>
                </div>
            </section>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escHtml(title)}</title>
    <meta name="description" content="${escHtml(description)}">
    <meta name="keywords" content="domain portfolio, premium domains, domains for sale, ${escHtml(domainList.map(d => d.domain).join(', '))}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <link rel="canonical" href="${canonicalUrl}">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escHtml(title)}">
    <meta property="og:description" content="${escHtml(description)}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="${escHtml(title)}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escHtml(title)}">
    <meta name="twitter:description" content="${escHtml(description)}">

    <!-- Structured Data -->
    <script type="application/ld+json">${JSON.stringify(schema)}</script>

    <link rel="stylesheet" href="assets/css/styles.css">
    ${fontsLink}
</head>
<body${template.cardStyle ? ` class="theme-${template.cardStyle}"` : ''}>
    <div id="app">
        <div id="portfolioView">
            <section class="section" id="portfolioHero">
                <div class="container">
                    <h1 class="portfolio-title">${escHtml(title)}</h1>
                    <p class="portfolio-description">${escHtml(description)}</p>
                </div>
            </section>
            <section class="section" id="portfolioDomains">
                <div class="container">
                    <h2 class="section-title">Available Domains</h2>
                    <div class="grid" id="portfolioGrid">
${cardsHtml}                    </div>
                </div>
            </section>
${contactHtml}
        </div>

        <main id="salePageMain" style="display: none;">
            <section class="hero">
                <a href="#" id="backToPortfolioLink" class="portfolio-back-link" style="display: none;">&larr; Back to Portfolio</a>
                <div class="domain-badge">For Sale</div>
                <h1 class="domain-name" id="domainName"></h1>
                <div class="domain-price" id="domainPrice"></div>
                <div class="price-badge" id="priceNegotiable"></div>
                <div class="cta-buttons">
                    <a href="#contactSection" class="cta-button" id="ctaButton">Get This Domain</a>
                    <a href="#" target="_blank" rel="noopener" class="cta-button-secondary" id="analyzeButton">Analyze Domain</a>
                </div>
            </section>
            <section class="section" id="logoSection" style="display: none;">
                <div class="container text-center"><img src="" alt="" id="logoImage" class="logo-image"></div>
            </section>
            <section class="section" id="featuresSection" style="display: none;">
                <div class="container"><h2 class="section-title">Why This Domain</h2><div class="grid" id="featuresGrid"></div></div>
            </section>
            <section class="section" id="contactSection" style="display: none;">
                <div class="container"><h2 class="section-title">Get In Touch</h2><div class="grid" id="contactGrid"></div></div>
            </section>
            <section class="section" id="marketplacesSection" style="display: none;">
                <div class="container"><h2 class="section-title">Buy Through Trusted Marketplaces</h2><div class="grid" id="marketplacesGrid"></div></div>
            </section>
            <section class="section" id="paymentsSection" style="display: none;">
                <div class="container"><h2 class="section-title">Secure Payment Methods</h2><div class="payment-methods" id="paymentsList"></div></div>
            </section>
            <section class="section" id="otherDomainsSection" style="display: none;">
                <div class="container"><h2 class="section-title">Explore Other Domains</h2><div class="grid" id="otherDomainsGrid"></div></div>
            </section>
        </main>

        <footer class="creator-badge">
            <div>
                <span>Powered by</span>
                <a href="https://abtdomain.com" target="_blank" rel="noopener">ABTDomain.com</a>
                <span>|</span>
                <a href="${escHtml(creator.github || 'https://github.com/ABTdomain')}" target="_blank" rel="noopener" id="githubLink">GitHub</a>
                <span style="opacity: 0.7;" id="version">v${escHtml(creator.version || '1.0.0')}</span>
            </div>
        </footer>
    </div>

    <script src="config.js" defer></script>
    <script src="assets/js/templates.js" defer></script>
    <script src="assets/js/app.js" defer></script>
</body>
</html>`;
}

// ============================================
// SALE PAGE RENDERING
// ============================================

function renderSalePageHTML(config, template, allDomainConfigs, portfolioConfig, creator, url) {
    const domain = config.domain || 'Domain';
    const displayName = config.title || domain;
    const price = formatPrice(config);
    const firstFeature = config.features?.[0] || '';
    const negotiable = config.priceNegotiable ? 'Price Negotiable' : 'Fixed Price';

    const pageTitle = firstFeature
        ? `${displayName} - For Sale - ${firstFeature}`
        : `${displayName} - For Sale`;

    const description = firstFeature
        ? `${displayName} - ${firstFeature}. Available for purchase. Price: ${price}. ${config.priceNegotiable ? 'Price negotiable.' : 'Fixed price.'}`
        : `${displayName} is available for purchase. Premium asset for sale. Price: ${price}. ${config.priceNegotiable ? 'Price negotiable.' : 'Fixed price.'}`;

    const ogTitle = firstFeature ? `${displayName} - ${firstFeature}` : `${displayName} For Sale`;
    const keywords = ['domain for sale', 'buy domain', 'premium domain', domain, displayName, ...(config.features || [])];
    const canonicalUrl = config.displayUrl || `https://${domain}/`;

    const schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": displayName,
        "description": `Premium asset ${domain} for sale`,
        "url": canonicalUrl,
        "offers": {
            "@type": "Offer",
            "price": (config.price || '0').replace(/,/g, ''),
            "priceCurrency": config.currency || 'USD',
            "availability": "https://schema.org/InStock",
            "seller": {
                "@type": "Organization",
                "name": `${domain} Owner`,
                ...(config.contact?.email && { "email": config.contact.email }),
                ...(config.contact?.whatsapp && { "telephone": config.contact.whatsapp })
            }
        }
    };

    const fontsLink = buildFontsLink(template);
    const portfolioUrl = `https://${portfolioConfig.domain}`;

    // Build features
    let featuresHtml = '';
    if (config.features?.length) {
        featuresHtml = `            <section class="section" id="featuresSection">
                <div class="container">
                    <h2 class="section-title">Why This Domain</h2>
                    <div class="grid" id="featuresGrid">\n`;
        config.features.forEach(f => {
            featuresHtml += `                        <div class="card">${escHtml(f)}</div>\n`;
        });
        featuresHtml += `                    </div>
                </div>
            </section>\n`;
    }

    // Build contact
    let contactHtml = '';
    if (config.contact && Object.values(config.contact).some(v => v)) {
        const platforms = {
            email: { name: 'Email', prefix: 'mailto:' },
            telegram: { name: 'Telegram', prefix: 'https://t.me/' },
            whatsapp: { name: 'WhatsApp', prefix: 'https://wa.me/' },
            x: { name: 'X (Twitter)', prefix: 'https://x.com/' },
            wechat: { name: 'WeChat', prefix: '#', display: true },
            facebook: { name: 'Facebook', prefix: 'https://facebook.com/' },
            discord: { name: 'Discord', prefix: 'https://discord.gg/' },
            linkedin: { name: 'LinkedIn', prefix: 'https://linkedin.com/in/' },
            instagram: { name: 'Instagram', prefix: 'https://instagram.com/' },
            youtube: { name: 'YouTube', prefix: 'https://youtube.com/@' },
            github: { name: 'GitHub', prefix: 'https://github.com/' },
            reddit: { name: 'Reddit', prefix: 'https://reddit.com/u/' }
        };
        contactHtml = `            <section class="section" id="contactSection">
                <div class="container">
                    <h2 class="section-title">Get In Touch</h2>
                    <div class="grid" id="contactGrid">\n`;
        Object.entries(config.contact).forEach(([key, value]) => {
            if (!value || !platforms[key]) return;
            const p = platforms[key];
            const clean = value.replace(/^@/, '');
            if (p.display) {
                contactHtml += `                        <div class="card"><div class="label">${p.name}</div><div class="value">${escHtml(value)}</div></div>\n`;
            } else {
                const href = key === 'email' ? `${p.prefix}${value}` : `${p.prefix}${clean}`;
                contactHtml += `                        <a href="${escHtml(href)}" target="_blank" rel="noopener" class="card"><div class="label">${p.name}</div><div class="value">${escHtml(value)}</div></a>\n`;
            }
        });
        contactHtml += `                    </div>
                </div>
            </section>\n`;
    }

    // Build marketplaces
    let marketplacesHtml = '';
    if (config.marketplaces?.length) {
        marketplacesHtml = `            <section class="section" id="marketplacesSection">
                <div class="container">
                    <h2 class="section-title">Buy Through Trusted Marketplaces</h2>
                    <div class="grid" id="marketplacesGrid">\n`;
        config.marketplaces.forEach(name => {
            const mpUrl = getMarketplaceUrl(name, domain);
            marketplacesHtml += `                        <a href="${escHtml(mpUrl)}" target="_blank" rel="noopener" class="card"><div class="value">${escHtml(name)}.com</div></a>\n`;
        });
        marketplacesHtml += `                    </div>
                </div>
            </section>\n`;
    }

    // Build payments
    let paymentsHtml = '';
    if (config.payments?.length) {
        paymentsHtml = `            <section class="section" id="paymentsSection">
                <div class="container">
                    <h2 class="section-title">Secure Payment Methods</h2>
                    <div class="payment-methods" id="paymentsList">\n`;
        config.payments.forEach(p => {
            paymentsHtml += `                        <div class="payment-badge">${escHtml(p)}</div>\n`;
        });
        paymentsHtml += `                    </div>
                </div>
            </section>\n`;
    }

    // Build other domains (first 3)
    let otherDomainsHtml = '';
    const otherKeys = Object.keys(allDomainConfigs)
        .filter(k => k !== '_default' && k !== url.hostname.replace('www.', ''));
    if (otherKeys.length > 0) {
        const shown = otherKeys.slice(0, 3);
        otherDomainsHtml = `            <section class="section" id="otherDomainsSection">
                <div class="container">
                    <h2 class="section-title">Explore Other Domains</h2>
                    <div class="grid" id="otherDomainsGrid">\n`;
        shown.forEach(key => {
            const d = allDomainConfigs[key];
            const linkUrl = d.displayUrl || `https://${d.domain}`;
            otherDomainsHtml += `                        <a href="${escHtml(linkUrl)}" class="card">${escHtml(d.title || d.domain)}</a>\n`;
        });
        otherDomainsHtml += `                    </div>
                </div>
            </section>\n`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escHtml(pageTitle)}</title>
    <meta name="description" content="${escHtml(description)}">
    <meta name="keywords" content="${escHtml([...new Set(keywords)].join(', '))}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <link rel="canonical" href="${escHtml(canonicalUrl)}">
    <link rel="sitemap" type="application/xml" href="/sitemap.xml">

    <!-- Open Graph -->
    <meta property="og:type" content="product">
    <meta property="og:title" content="${escHtml(ogTitle)}">
    <meta property="og:description" content="${escHtml(description)}">
    <meta property="og:url" content="${escHtml(canonicalUrl)}">
    <meta property="og:site_name" content="${escHtml(displayName)}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escHtml(ogTitle)}">
    <meta name="twitter:description" content="${escHtml(description)}">

    <!-- Structured Data -->
    <script type="application/ld+json">${JSON.stringify(schema)}</script>

    <link rel="stylesheet" href="assets/css/styles.css">
    ${fontsLink}
</head>
<body${template.cardStyle ? ` class="theme-${template.cardStyle}"` : ''}>
    <div id="app">
        <div id="portfolioView" style="display: none;"></div>

        <main id="salePageMain">
            <section class="hero">
                <a href="${escHtml(portfolioUrl)}" class="portfolio-back-link" id="backToPortfolioLink">&larr; Back to Portfolio</a>
                <div class="domain-badge">For Sale</div>
                <h1 class="domain-name" id="domainName">${escHtml(displayName)}</h1>
                <div class="domain-price" id="domainPrice">${escHtml(price)}</div>
                <div class="price-badge" id="priceNegotiable">${escHtml(negotiable)}</div>
                <div class="cta-buttons">
                    <a href="#contactSection" class="cta-button" id="ctaButton">Get This Domain</a>
                    <a href="https://domainkits.com/ai/analysis?domain=${encodeURIComponent(domain)}" target="_blank" rel="noopener" class="cta-button-secondary" id="analyzeButton">Analyze Domain</a>
                </div>
            </section>

${featuresHtml}${contactHtml}${marketplacesHtml}${paymentsHtml}${otherDomainsHtml}
        </main>

        <footer class="creator-badge">
            <div>
                <span>Powered by</span>
                <a href="https://abtdomain.com" target="_blank" rel="noopener">ABTDomain.com</a>
                <span>|</span>
                <a href="${escHtml(creator.github || 'https://github.com/ABTdomain')}" target="_blank" rel="noopener" id="githubLink">GitHub</a>
                <span style="opacity: 0.7;" id="version">v${escHtml(creator.version || '1.0.0')}</span>
            </div>
        </footer>
    </div>

    <script src="config.js" defer></script>
    <script src="assets/js/templates.js" defer></script>
    <script src="assets/js/app.js" defer></script>
</body>
</html>`;
}

// ============================================
// HELPERS
// ============================================

function formatPrice(config) {
    const symbols = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: '$', AUD: '$', CNY: '¥', INR: '₹' };
    if (!config.price || config.price === 'N/A' || config.price === 'Subscription' || config.price === 'Free Tool') {
        return config.price || 'N/A';
    }
    return `${symbols[config.currency] || '$'}${config.price}`;
}

function getMarketplaceUrl(name, domain) {
    switch (name.toLowerCase()) {
        case 'sedo': return `https://sedo.com/search/details/?domain=${domain}`;
        case 'afternic': return `https://www.afternic.com/domain/${domain}`;
        case 'atom': return `https://www.atom.com/domains/${domain}`;
        case 'nameclub': return `https://www.nameclub.com/domain/${domain}`;
        case 'saw': return `https://www.sawsells.com/domain/${domain}`;
        case 'dynadot': return `https://www.dynadot.com/market/auction/${domain}`;
        default: return '#';
    }
}

function buildFontsLink(template) {
    const GOOGLE_FONTS_MAP = {
        'IBM Plex Mono': 'IBM+Plex+Mono:wght@400;600;700',
        'Space Mono': 'Space+Mono:wght@400;700',
        'Outfit': 'Outfit:wght@300;400;600;700',
        'Source Serif 4': 'Source+Serif+4:wght@400;600;700',
        'Playfair Display': 'Playfair+Display:wght@400;700;900',
        'Fira Code': 'Fira+Code:wght@400;600;700',
        'Noto Serif JP': 'Noto+Serif+JP:wght@400;700',
        'Cormorant Garamond': 'Cormorant+Garamond:wght@400;600;700',
        'DM Sans': 'DM+Sans:wght@400;500;700',
        'Press Start 2P': 'Press+Start+2P',
        'Libre Baskerville': 'Libre+Baskerville:wght@400;700'
    };
    const fonts = new Set();
    [template.font, template.fontHeading].forEach(fontStr => {
        if (!fontStr) return;
        const family = fontStr.split(',')[0].replace(/'/g, '').trim();
        if (GOOGLE_FONTS_MAP[family]) fonts.add(GOOGLE_FONTS_MAP[family]);
    });
    if (fonts.size === 0) return '';
    return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${[...fonts].map(f => `family=${f}`).join('&')}&display=swap">`;
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
