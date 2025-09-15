
// ============================================
// SECTION 1: PORTFOLIO HOMEPAGE CONFIGURATION
// ============================================
// This object controls the content and appearance of your main portfolio homepage.
// This is the page that visitors will see when they access your main portfolio domain.
const PORTFOLIO_CONFIG = {

    // IMPORTANT: Your main portfolio domain. 
    // The system uses this to know when to display the portfolio view.
    // Example: "my-awesome-portfolio.com"
    domain: "portfolio.domainpickup.com", 

    // The main title displayed on your portfolio homepage.
    title: "Premium Digital Asset Portfolio",

    // A short description displayed under the main title. 
    // Explain what your portfolio is about.
    description: "A curated collection of high-value domain names and innovative digital products available for acquisition. Explore opportunities for your next big project.",
    
    // The theme template to use for the portfolio homepage (1-12).
    // See templates.js for a preview of all available themes.
    template: 10,

    // Contact information specifically for the portfolio homepage.
    contact: {
        // The title for the contact section.
        title: "Get In Touch",
        // A short text inviting visitors to contact you.
        text: "Interested in an asset, have a question, or want to discuss a potential partnership? Feel free to reach out.",
        
        // Your contact methods. Leave a value as an empty string "" to hide it.
        // Example: email: "hello@myportfolio.com",
        email: "abtdomain@outlook.com", 
        x: "@ABTdomain"
    }
};


// ============================================
// SECTION 2: DIGITAL ASSETS DATABASE
// ============================================
// This is your central database for all domains and products you want to display.
// Each entry is an object, where the key is the domain/subdomain that visitors will use to access the page.
const ALL_DOMAIN_CONFIGS = {

    // --- SAFETY NET: DEFAULT FALLBACK CONFIGURATION ---
    // This configuration is used when a visitor accesses a domain that is pointed 
    // to your project but is not explicitly defined below. It's a safety measure.
    '_default': {
        domain: "portfolio.domainpickup.com",
        title: "Configuration Error",
        price: "N/A",
        currency: "USD",
        template: 11,
        priceNegotiable: false,
        contact: {},
        features: ["This page has not been configured yet. Please visit our main portfolio to see all available assets."],
        marketplaces: [],
        payments: []
    },

    // --- ASSET EXAMPLE 1: A Domain for Sale ---
    // Key: The exact domain name (all lowercase) that will trigger this page.
    'abtdomain.com': {
        // The actual domain name. Used for SEO and internal logic.
        domain: "ABTdomain.com",
        // (Optional) A custom title to display on the page and portfolio card. 
        // If omitted, the `domain` value will be used.
        title: "ABTdomain",
        // (Optional) A custom URL for the portfolio card link. Useful for product pages.
        // If omitted, the link will be https://[domain].
        displayUrl: "https://abtdomain.com",
        // The asking price. Can be a number or text like "N/A", "Subscription", "Contact for Price".
        price: "150,000",
        // The currency code (USD, EUR, GBP, JPY, CNY, CAD,etc.).
        currency: "USD",
        // (Optional) A custom logo or feature image for this page. 
        // The path should be relative to the root, starting with "/". Example: "/assets/img/my-logo.png", size is limited to 500.
        logoOrImage: "/assets/img/abtdomain.png", 
        // The theme template to use for this page (1-12).
        template: 5,
        // Set to `true` if the price is negotiable, `false` otherwise.
        priceNegotiable: true, 
        // Contact details for this specific asset.
        contact: {
            email: "abtdomain@outlook.com"
        },
        // A list of key features or selling points. The first one is the most important.
        features: ["Set here as keyword", "Powered by", "ABTdomain"],
        // A list of marketplaces where this domain is listed.
        // Supported options: "Sedo", "Afternic", "Atom", "NameClub", "Saw", "Dynadot".
        marketplaces: ["Sedo", "Afternic"],
        // A list of accepted payment methods.
        // Example options: "Escrow.com", "Bank Transfer", "Crypto", "PayPal".
        payments: ["Escrow.com", "PayPal"],
        // (Optional) Your Google Analytics Tracking ID (e.g., "G-XXXXXXXXXX").
        googleAnalytics: ""
    },

    // --- ASSET EXAMPLE 2: A Product Showcase Page ---
    // Key: The exact domain that will trigger this page.
    'domainkits.com': { 
        // The underlying domain, important for some functions.
        domain: "DomainKits.com",
        // The product name, which will be displayed prominently.
        title: "Full-Lifecycle Domain Search Engine",
        // The URL the portfolio card should link to.
        displayUrl: "https://domainkits.com",
        // Price can be descriptive text.
        price: "666,777",
        logoOrImage: "", // Example path
        currency: "USD",
        template: 2,
        priceNegotiable: false,
        contact: {
            email: "abtdomain@outlook.com",
            x: "@ABTdomain"
        },
        features: ["A Free Domain Search Engine", "Instant search", "Powered by ABTdomain"],
        marketplaces: [],
        payments: [],
        googleAnalytics: ""
    },
    
    // --- ADD YOUR NEXT DOMAIN OR PRODUCT HERE ---
    // 'your-next-domain.com': {
    //      domain: "your-next-domain.com",
    //      title: "YourNextDomain.com",
    //      ... and so on
    // }

};


// ============================================
// SECTION 3: CREATOR INFORMATION
// ============================================
// This information is used in the footer. 
// While you can edit it, keeping the link is a great way to support the project!
const CREATOR = {
   name: "ABTDomain",
   github: "https://github.com/ABTdomain/domain-portfolio-pages", // Link to the project repository
   website: "https://abtdomain.com",
   Email: "ABTdomain@outlook.com",
   version: "1.0.0" // Current version of the script
};