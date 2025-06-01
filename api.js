const dotenv = require("dotenv");

const main_scrapper = require("./scrapper_main/scrapper.js");
const moment = require("moment");

dotenv.config();

// Define your categories using env variables
const CATEGORY_KEYS = {
  TECHNOLOGY: process.env.TECHNOLOGY_CATEGORY,
  BUSINESS: process.env.BUSINESS_CATEGORY,
  ENTERTAINMENT: process.env.ENTERTAINMENT_CATEGORY,
  HEADLINES: process.env.HEADLINES_CATEGORY,
  HEALTH: process.env.HEALTH_CATEGORY,
  SCIENCE: process.env.SCIENCE_CATEGORY,
  SPORTS: process.env.SPORTS_CATEGORY,
  US_NEWS: process.env.US_NEWS_CATEGORY,
  WORLD: process.env.WORLD_CATEGORY,
};

class RateLimiter {
  constructor(tokensPerInterval, interval) {
    this.tokensPerInterval = tokensPerInterval;
    this.interval = interval;
    this.tokens = tokensPerInterval;
    this.lastRefill = Date.now();
  }

  async waitForToken() {
    this.refillTokens();
    if (this.tokens < 1) {
      const waitTime = this.interval - (Date.now() - this.lastRefill);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refillTokens();
    }
    this.tokens -= 1;
  }

  refillTokens() {
    const now = Date.now();
    const elapsedTime = now - this.lastRefill;
    const tokensToAdd =
      Math.floor(elapsedTime / this.interval) * this.tokensPerInterval;
    this.tokens = Math.min(this.tokensPerInterval, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// Dynamically build scraper config
const buildScrapers = () => {
  const scrapers = {};
  for (const [key, categoryId] of Object.entries(CATEGORY_KEYS)) {
    scrapers[key] = {
      scrapeNews: (start = 0, count = 10) =>
        main_scrapper.scrapeNews(categoryId, start, count),
    };
  }
  return scrapers;
};

class NewsAPI {
  constructor(requestsPerMinute = 60) {
    this.scrapers = buildScrapers();
    this.rateLimiter = new RateLimiter(
      requestsPerMinute,
      60000 / requestsPerMinute
    );
  }

  async filterAndFormatArticles(articles) {
    return articles
      .filter((article) => {
        const time = article.time || "";
        const lowercaseTime = time.toLowerCase();

        const agoCount = (lowercaseTime.match(/ago/g) || []).length;
        const yesterdayCount = (lowercaseTime.match(/yesterday/g) || []).length;

        // Exclude if: ago + ago, ago + yesterday, or yesterday + yesterday
        return !(
          agoCount > 1 ||
          (agoCount >= 1 && yesterdayCount >= 1) ||
          yesterdayCount > 1
        );
      })
      .map((article) => ({
        ...article,
        formattedTime: article.dateTime
          ? moment.utc(article.dateTime).local().format("MMMM D, YYYY h:mm A")
          : null,
      }));
  }

  async getNewsByCategory(category, start = 101, count = 10) {
    await this.rateLimiter.waitForToken();
    if (!this.scrapers[category]) {
      throw new Error(`Invalid category: ${category}`);
    }

    try {
      const articles = await this.scrapers[category].scrapeNews(start, count);
      return await this.filterAndFormatArticles(articles); // ✅ fixed here
    } catch (error) {
      console.error(`Error fetching ${category} news:`, error);
      throw error;
    }
  }

  async getNewsByCategories(categories = []) {
    const targetCategories =
      categories.length > 0 ? categories : Object.keys(this.scrapers);

    try {
      const results = await Promise.all(
        targetCategories.map(async (category) => {
          await this.rateLimiter.waitForToken();
          const articles = await this.getNewsByCategory(category);
          return { [category]: articles };
        })
      );

      return results.reduce((acc, result) => ({ ...acc, ...result }), {});
    } catch (error) {
      console.error("Error fetching multiple categories:", error);
      throw error;
    }
  }

  async searchNews(query) {
    try {
      const allNews = await this.getNewsByCategories();
      const results = {};

      Object.entries(allNews).forEach(([category, articles]) => {
        const matchingArticles = articles.filter(
          (article) =>
            article.title.toLowerCase().includes(query.toLowerCase()) ||
            (article.author &&
              article.author.toLowerCase().includes(query.toLowerCase()))
        );

        if (matchingArticles.length > 0) {
          results[category] = matchingArticles;
        }
      });

      return results;
    } catch (error) {
      console.error("Error searching news:", error);
      throw error;
    }
  }

  async getLatestNews(limit = 5) {
    try {
      const allNews = await this.getNewsByCategories();

      return Object.entries(allNews).reduce(
        (acc, [category, articles]) => ({
          ...acc,
          [category]: articles.slice(0, limit),
        }),
        {}
      );
    } catch (error) {
      console.error("Error fetching latest news:", error);
      throw error;
    }
  }
}

module.exports = NewsAPI;
