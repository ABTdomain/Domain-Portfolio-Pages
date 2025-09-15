// ============================================
// Automatic Sitemap Generator
// ============================================
// This script runs automatically during deployment on Cloudflare Pages.
// It reads your config.js file and generates a fresh sitemap.xml.

const fs = require('fs');
const path = require('path');

// --- Configuration ---
// Manually import the config variables since this is a Node.js script
const configFilePath = path.resolve(__dirname, 'config.js');
const configContent = fs.readFileSync(configFilePath, 'utf8');

// A simple trick to execute the config file content in this script's context
const executeConfig = new Function(`${configContent}; return { PORTFOLIO_CONFIG, ALL_DOMAIN_CONFIGS };`);
const { PORTFOLIO_CONFIG, ALL_DOMAIN_CONFIGS } = executeConfig();
// --- End Configuration ---


function generateSitemap() {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    
    // Start the XML content
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // 1. Add the Portfolio Homepage
    xml += `
    <url>
        <loc>https://${PORTFOLIO_CONFIG.domain}/</loc>
        <lastmod>${today}</lastmod>
        <priority>1.0</priority>
    </url>`;

    // 2. Add all individual assets from the database
    for (const key in ALL_DOMAIN_CONFIGS) {
        if (key === '_default') {
            continue; // Skip the default config
        }

        const config = ALL_DOMAIN_CONFIGS[key];
        // Use displayUrl if it exists, otherwise fall back to the domain
        const loc = config.displayUrl || `https://${config.domain}/`;
        
        xml += `
    <url>
        <loc>${loc}</loc>
        <lastmod>${today}</lastmod>
        <priority>0.8</priority>
    </url>`;
    }
    
    // End the XML content
    xml += `
</urlset>`;

    // Write the generated XML to the sitemap.xml file
    const outputPath = path.resolve(__dirname, 'sitemap.xml');
    fs.writeFileSync(outputPath, xml.trim());

    console.log(`✅ Sitemap successfully generated with ${Object.keys(ALL_DOMAIN_CONFIGS).length} entries.`);
}

// Run the function
generateSitemap();