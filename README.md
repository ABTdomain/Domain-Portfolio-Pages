# Domain Portfolio Pages

[![Deploy with Cloudflare Pages](https://static.cloudflare.com/pages/button.svg)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/your-repo-name)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful, config-driven system to automatically generate and manage a professional portfolio homepage and an unlimited number of individual landing pages for your domains and digital assets.

This project is built with vanilla JavaScript and is deeply optimized for performance, SEO, and seamless deployment on **Cloudflare Pages**. It allows you to manage your entire online presence by editing a single `config.js` file, making it the ultimate tool for domain investors, indie hackers, and digital creators.

Samples:
https://portfolio.domainpickup.com/

## ✨ Core Features

- **Multi-Domain Intelligent Routing**: Use one codebase to serve a main portfolio site and countless unique landing pages on different custom domains.
- **Dual-Mode Rendering Engine**: Automatically displays a beautiful portfolio homepage on your main domain and detailed, conversion-focused sales pages on your asset domains.
- **Deeply SEO-Optimized**: Built with a "static-first" approach, ensuring all content is perfectly visible to search engine crawlers.
- **Highly Customizable**: Easily define custom titles, logos, images, themes, prices, currencies, and contact info for each individual asset via a central config file.
- **Zero Dependencies & Zero Build Steps**: Written in pure, vanilla JavaScript. No frameworks, no `npm install`, no complications. Just edit and deploy.

## 🚀 Deployment with Cloudflare Pages (Recommended)

This project is designed to work perfectly with Cloudflare Pages.

1. **Fork this repository** to your own GitHub account.
2. **Configure your portfolio:**
   - Edit the `config.js` file in your forked repository. Define your main portfolio in `PORTFOLIO_CONFIG` and add all your assets to `ALL_DOMAIN_CONFIGS`.
   - (Optional) Upload any images to the `assets/img/` directory and reference them in `config.js`.
3. **Deploy to Cloudflare Pages:**
   - Log in to your Cloudflare dashboard and go to **Workers & Pages**.
   - Click **Create application** > **Pages** > **Connect to Git**.
   - Select your forked repository.
   - In the "Build settings", you can leave everything as default. No build command or output directory is needed.
   - Click **Save and Deploy**.
4. **Add Custom Domains:**
   - Once deployed, go to your new Pages project's settings and click on the **Custom domains** tab.
   - Add your main portfolio domain and all your asset domains/subdomains. Cloudflare will guide you through the verification process.

That's it! Your entire portfolio is now live on Cloudflare's global edge network, and any future changes you push to the `main` branch of your repository will trigger an automatic redeployment.

## ⚙️ Configuration

All customization happens inside `config.js`. The file is self-documented and allows you to control every aspect of your project.

- `PORTFOLIO_CONFIG`: Defines the content and appearance of your main homepage.
- `ALL_DOMAIN_CONFIGS`: Acts as the database for all your individual assets. Each key is the domain/subdomain that triggers the rendering of a specific page.
