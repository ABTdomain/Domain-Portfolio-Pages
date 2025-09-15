const SOCIAL_PLATFORMS = {
    email: { name: 'Email', urlPrefix: 'mailto:' },
    telegram: { name: 'Telegram', urlPrefix: 'https://t.me/', cleanValue: v => v.replace('@', '') },
    whatsapp: { name: 'WhatsApp', urlPrefix: 'https://wa.me/', cleanValue: v => v.replace(/[^0-9]/g, '') },
    x: { name: 'X (Twitter)', urlPrefix: 'https://x.com/', cleanValue: v => v.replace('@', '') },
    wechat: { name: 'WeChat', urlPrefix: '#', isDisplay: true },
    facebook: { name: 'Facebook', urlPrefix: 'https://facebook.com/', cleanValue: v => v.replace('@', '') },
    discord: { name: 'Discord', urlPrefix: 'https://discord.gg/' },
    linkedin: { name: 'LinkedIn', urlPrefix: 'https://linkedin.com/in/', cleanValue: v => v.replace('https://linkedin.com/in/', '').replace('/', '') },
    instagram: { name: 'Instagram', urlPrefix: 'https://instagram.com/', cleanValue: v => v.replace('@', '') },
    youtube: { name: 'YouTube', urlPrefix: 'https://youtube.com/@', cleanValue: v => v.replace('@', '') },
    github: { name: 'GitHub', urlPrefix: 'https://github.com/', cleanValue: v => v.replace('@', '') },
    reddit: { name: 'Reddit', urlPrefix: 'https://reddit.com/u/', cleanValue: v => v.replace('/u/', '').replace('u/', '') }
};

class DomainPortfolioApp {
    constructor() {
        const currentHostname = window.location.hostname.replace('www.', '');
        if (currentHostname === PORTFOLIO_CONFIG.domain) {
            this.isPortfolio = true;
            this.config = PORTFOLIO_CONFIG;
        } else {
            this.isPortfolio = false;
            this.config = ALL_DOMAIN_CONFIGS[currentHostname] || ALL_DOMAIN_CONFIGS['_default'] || {};
        }
        this.template = TEMPLATES[parseInt(this.config.template, 10) || 1] || TEMPLATES[1];
        if (!this.config.domain) {
            console.error(`CRITICAL: No valid configuration found for ${currentHostname}.`);
            document.getElementById('app').innerHTML = `<h1 style="font-family: sans-serif; text-align: center; margin-top: 2rem;">Error: Configuration for ${currentHostname} not found.</h1>`;
            return;
        }
        this.init();
    }

    init() {
        this._applyTheme();
        if (this.isPortfolio) {
            this._populatePortfolioPage();
            this._generateFavicon('P');
            document.getElementById('portfolioView').style.display = 'block';
            document.getElementById('salePageMain').style.display = 'none';
        } else {
            this.price = this._formatPrice();
            this.firstFeature = this.config.features?.[0] || '';
            this._setPageTitle();
            this._setMetaTags();
            this._populateSalePage();
            this._addEventListeners();
            this._generateFavicon();
            this._updateSEOFiles();
            this._injectAnalytics();
            this._addSchema();
            document.getElementById('portfolioView').style.display = 'none';
            document.getElementById('salePageMain').style.display = 'block';
        }
        document.getElementById('githubLink').href = CREATOR.github;
        document.getElementById('version').textContent = `v${CREATOR.version}`;
    }

    _populatePortfolioPage() {
        document.title = this.config.title;
        document.querySelector('meta[name="description"]')?.setAttribute('content', this.config.description);
        document.getElementById('portfolioTitle').textContent = this.config.title;
        document.getElementById('portfolioDescription').textContent = this.config.description;
        const grid = document.getElementById('portfolioGrid');
        grid.innerHTML = Object.keys(ALL_DOMAIN_CONFIGS)
            .filter(key => key !== '_default')
            .map(key => {
                const domainConfig = ALL_DOMAIN_CONFIGS[key];
                const price = this._formatPrice(domainConfig);
                const linkUrl = domainConfig.displayUrl || `https://${domainConfig.domain}`;
                const displayName = domainConfig.title || domainConfig.domain;
                return `
                    <a href="${linkUrl}" class="card portfolio-card">
                        <div class="portfolio-card-domain">${displayName}</div>
                        <div class="portfolio-card-price">${price}</div>
                        <div class="portfolio-card-feature">${domainConfig.features[0] || 'Premium Domain'}</div>
                    </a>
                `;
            }).join('');
        if (this.config.contact) {
            document.getElementById('portfolioContactTitle').textContent = this.config.contact.title;
            document.getElementById('portfolioContactText').textContent = this.config.contact.text;
            const contactGrid = document.getElementById('portfolioContactGrid');
            const contactConfig = this.config.contact;
            contactGrid.innerHTML = Object.entries(contactConfig).map(([key, value]) => {
                if (key === 'title' || key === 'text' || !value) return '';
                const platform = SOCIAL_PLATFORMS[key];
                if (!platform) return '';
                const url = `${platform.urlPrefix}${platform.cleanValue ? platform.cleanValue(value) : value}`;
                return `
                    <a href="${url}" target="_blank" rel="noopener" class="card">
                        <div class="label">${platform.name}</div>
                        <div class="value">${value}</div>
                    </a>
                `;
            }).join('');
        }
    }

    _populateSalePage() {
        document.getElementById('domainName').textContent = this.config.title || this.config.domain;
        document.getElementById('domainPrice').textContent = this.price;
        document.getElementById('priceNegotiable').textContent = this.config.priceNegotiable ? 'Price Negotiable' : 'Fixed Price';
        document.getElementById('analyzeButton').href = `https://domainbeat.com?domain=${this.config.domain}`;
        const backLink = document.getElementById('backToPortfolioLink');
        backLink.href = `https://${PORTFOLIO_CONFIG.domain}`;
        backLink.style.display = 'block';
        if (this.config.logoOrImage) {
            const logoImage = document.getElementById('logoImage');
            logoImage.src = this.config.logoOrImage;
            logoImage.alt = `${this.config.title || this.config.domain} Logo`;
            document.getElementById('logoSection').style.display = 'block';
        }
        if (this.config.features?.length) {
            document.getElementById('featuresGrid').innerHTML = this.config.features.map(f => `<div class="card">${f}</div>`).join('');
            document.getElementById('featuresSection').style.display = 'block';
        }
        if (this.config.contact && Object.values(this.config.contact).some(v => v)) {
            const grid = document.getElementById('contactGrid');
            const contactsHTML = Object.entries(this.config.contact).map(([key, value]) => {
                if (!value || !SOCIAL_PLATFORMS[key]) return '';
                const platform = SOCIAL_PLATFORMS[key];
                const cleanedValue = platform.cleanValue ? platform.cleanValue(value) : value;
                const url = `${platform.urlPrefix}${cleanedValue}`;
                const cardContent = `<div class="label">${platform.name}</div><div class="value">${value}</div>`;
                return platform.isDisplay ? `<div class="card">${cardContent}</div>` : `<a href="${url}" target="_blank" rel="noopener" class="card">${cardContent}</a>`;
            }).join('');
            if (contactsHTML) {
                grid.innerHTML = contactsHTML;
                document.getElementById('contactSection').style.display = 'block';
            }
        }
        if (this.config.marketplaces?.length) {
            const getMarketplaceUrl = (name) => {
                const domain = this.config.domain;
                switch (name.toLowerCase()) {
                    case 'sedo': return `https://sedo.com/search/details/?domain=${domain}`;
                    case 'afternic': return `https://www.afternic.com/domain/${domain}`;
                    case 'atom': return `https://www.atom.com/domains/${domain}`;
                    case 'nameclub': return `https://www.nameclub.com/domain/${domain}`;
                    case 'saw': return `https://www.sawsells.com/domain/${domain}`;
                    case 'dynadot': return `https://www.dynadot.com/market/auction/${domain}`;
                    default: return '#';
                }
            };
            document.getElementById('marketplacesGrid').innerHTML = this.config.marketplaces.map(name => `<a href="${getMarketplaceUrl(name)}" target="_blank" rel="noopener" class="card"><div class="value">${name.charAt(0).toUpperCase() + name.slice(1)}.com</div></a>`).join('');
            document.getElementById('marketplacesSection').style.display = 'block';
        }
        if (this.config.payments?.length) {
            document.getElementById('paymentsList').innerHTML = this.config.payments.map(p => `<div class="payment-badge">${p}</div>`).join('');
            document.getElementById('paymentsSection').style.display = 'block';
        }
        this._populateOtherDomains();
    }

    _populateOtherDomains() {
        const otherDomainsGrid = document.getElementById('otherDomainsGrid');
        const currentKey = window.location.hostname.replace('www.', '');
        const otherDomains = Object.keys(ALL_DOMAIN_CONFIGS)
            .filter(key => key !== '_default' && key !== currentKey)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(key => {
                const domainConfig = ALL_DOMAIN_CONFIGS[key];
                const linkUrl = domainConfig.displayUrl || `https://${domainConfig.domain}`;
                const displayName = domainConfig.title || domainConfig.domain;
                return `<a href="${linkUrl}" class="card">${displayName}</a>`;
            }).join('');
        if (otherDomains) {
            otherDomainsGrid.innerHTML = otherDomains;
            document.getElementById('otherDomainsSection').style.display = 'block';
        }
    }

    _setPageTitle() {
        const displayName = this.config.title || this.config.domain;
        if (this.firstFeature) {
            document.title = `${displayName} - For Sale - ${this.firstFeature}`;
        } else {
            document.title = `${displayName} - For Sale`;
        }
    }

    _setMetaTags() {
        const displayName = this.config.title || this.config.domain;
        let description;
        if (this.firstFeature) {
            description = `${displayName} - ${this.firstFeature}. Available for purchase. Price: ${this.price}. ${this.config.priceNegotiable ? 'Price negotiable.' : 'Fixed price.'}`;
        } else {
            description = `${displayName} is available for purchase. Premium asset for sale. Price: ${this.price}. ${this.config.priceNegotiable ? 'Price negotiable.' : 'Fixed price.'}`;
        }
        document.querySelector('meta[name="description"]')?.setAttribute('content', description);
        document.querySelector('meta[property="og:title"]')?.setAttribute('content', this.firstFeature ? `${displayName} - ${this.firstFeature}` : `${displayName} For Sale`);
        document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
        const keywords = ['domain for sale', 'buy domain', 'premium domain', this.config.domain, displayName, ...(this.config.features || [])];
        let keywordsMeta = document.querySelector('meta[name="keywords"]');
        if (!keywordsMeta) {
            keywordsMeta = document.createElement('meta');
            keywordsMeta.name = 'keywords';
            document.head.appendChild(keywordsMeta);
        }
        keywordsMeta.content = [...new Set(keywords)].join(', ');
    }

    _formatPrice(config = this.config) {
        const symbols = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: '$', AUD: '$', CNY: '¥', INR: '₹' };
        if (config.price === "N/A" || config.price === "Subscription" || config.price === "Free Tool") {
            return config.price;
        }
        return `${symbols[config.currency] || '$'}${config.price}`;
    }

    _applyTheme() {
        const t = this.template;
        const root = document.documentElement;
        root.style.setProperty('--primary', t.primaryColor);
        root.style.setProperty('--secondary', t.secondaryColor);
        root.style.setProperty('--text', t.textColor);
        root.style.setProperty('--button', t.buttonColor);
        root.style.setProperty('--button-text', t.buttonTextColor);
        const body = document.body;
        body.style.background = t.background;
        body.style.backgroundAttachment = 'fixed';
        body.style.backgroundSize = '100vw 100vh';
        body.style.backgroundRepeat = 'no-repeat';
        body.style.color = t.textColor;
        if (this.config.template === 4) body.classList.add('minimal-theme');
        if (this.config.template === 5) body.classList.add('crypto-theme');
        if (!this.isPortfolio) {
            document.getElementById('ctaButton').style.background = t.buttonColor;
            document.getElementById('ctaButton').style.color = t.buttonTextColor;
            const analyzeButton = document.getElementById('analyzeButton');
            analyzeButton.style.color = t.textColor;
            analyzeButton.style.borderColor = t.buttonColor;
        }
    }

    _generateFavicon(letter) {
        const firstLetter = letter || (this.config.title || this.config.domain).charAt(0).toUpperCase();
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 64, 64);
        gradient.addColorStop(0, this.template.primaryColor);
        gradient.addColorStop(1, this.template.secondaryColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = this.template.textColor || '#ffffff';
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(firstLetter, 32, 32);
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/x-icon';
        link.href = canvas.toDataURL('image/x-icon');
        document.querySelector('link[rel="icon"]')?.remove();
        document.head.appendChild(link);
    }

    _addEventListeners() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelector(anchor.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    _updateSEOFiles() {
        if (this.isPortfolio) return;
        const canonicalUrl = this.config.displayUrl || `https://${this.config.domain}/`;
        if (!document.querySelector('link[rel="canonical"]')) {
            const link = document.createElement('link');
            link.rel = 'canonical';
            link.href = canonicalUrl;
            document.head.appendChild(link);
        }
        if (!document.querySelector('link[rel="sitemap"]')) {
            const sitemapLink = document.createElement('link');
            sitemapLink.rel = 'sitemap';
            sitemapLink.type = 'application/xml';
            sitemapLink.href = '/sitemap.xml';
            document.head.appendChild(sitemapLink);
        }
    }
    
    _injectAnalytics() {
        const gaId = this.config.googleAnalytics?.trim();
        if (!gaId) return;
        const gaScript1 = document.createElement('script');
        gaScript1.async = true;
        gaScript1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(gaScript1);
        const gaScript2 = document.createElement('script');
        gaScript2.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
        `;
        document.head.appendChild(gaScript2);
    }
    
    _addSchema() {
        if (this.isPortfolio) return;
        const schema = document.createElement('script');
        schema.type = 'application/ld+json';
        schema.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": this.config.title || this.config.domain,
            "description": `Premium asset ${this.config.domain} for sale`,
            "url": window.location.href,
            "offers": {
                "@type": "Offer",
                "price": (this.config.price.replace(/,/g, '') || 0),
                "priceCurrency": this.config.currency,
                "availability": "https://schema.org/InStock",
                "seller": {
                    "@type": "Organization",
                    "name": `${this.config.domain} Owner`,
                    "email": this.config.contact?.email || undefined,
                    "telephone": this.config.contact?.whatsapp || undefined
                }
            }
        });
        document.head.appendChild(schema);
    }
}

document.addEventListener('DOMContentLoaded', () => {
   new DomainPortfolioApp();
});