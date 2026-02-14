/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://parentmap.hk',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  additionalPaths: async (config) => {
    const locationsData = require('./src/data/locations.json');
    
    const generateSlug = (name) => {
      return name
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+$/, '')
        .substring(0, 50);
    };
    
    const placeUrls = locationsData.locations.map((place) => ({
      loc: `/place/${generateSlug(place.name)}`,
      lastmod: place.checkedAt || new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.8,
    }));
    
    return placeUrls;
  },
};
