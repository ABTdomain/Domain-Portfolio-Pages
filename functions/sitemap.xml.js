// ============================================
// DYNAMIC SITEMAP GENERATOR — Portfolio version
// Lists portfolio page + all individual domain pages
// ============================================

export async function onRequest(context) {
    const url = new URL(context.request.url);
    const today = new Date().toISOString().split('T')[0];

    let portfolioDomain = url.hostname;
    const domainUrls = [];

    try {
        const configResp = await context.env.ASSETS.fetch(new URL('/config.js', url.origin));
        const configText = await configResp.text();

        // Extract portfolio domain
        const pdMatch = configText.match(/PORTFOLIO_CONFIG[\s\S]*?domain\s*:\s*["']([^"']+)["']/);
        if (pdMatch) portfolioDomain = pdMatch[1];

        // Extract all subdomain keys
        const keyRe = /'([^']+\.portfolio\.[^']+)'/g;
        let m;
        while ((m = keyRe.exec(configText)) !== null) {
            domainUrls.push(`https://${m[1]}/`);
        }
    } catch (e) { /* use defaults */ }

    const canonicalUrl = `https://${portfolioDomain}/`;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${canonicalUrl}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>`;

    domainUrls.forEach(dUrl => {
        xml += `
    <url>
        <loc>${dUrl}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
    });

    xml += `
</urlset>`;

    return new Response(xml, {
        status: 200,
        headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600, s-maxage=86400'
        }
    });
}
