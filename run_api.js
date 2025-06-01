const NewsAPI = require("./api.js");

async function runAPI() {
  // Allow 30 requests per minute
  const newsAPI = new NewsAPI(30);

  try {
    // Get news from a specific category
    console.log("Fetching technology news:");
    const techNews = await newsAPI.getNewsByCategory("BUSINESS".toUpperCase());

    // TECHNOLOGY BUSINESS ENTERTAINMENT HEALTH SCIENCE SPORTS US_NEWS WORLD;


    console.log(techNews);

    console.log("\n---\n");

    // // Get news from multiple categories
    // console.log('Fetching news from headlines and business categories:');
    // const selectedNews = await newsAPI.getNewsByCategories(['headlines', 'business']);
    // Object.entries(selectedNews).forEach(([category, articles]) => {
    //   console.log(`\n${category.toUpperCase()} NEWS:`);
    //   logArticles(articles);
    // });

    // console.log('\n---\n');

    // // Search across all categories
    // console.log('Searching for "AI" across all categories:');
    // const searchResults = await newsAPI.searchNews('AI');
    // Object.entries(searchResults).forEach(([category, articles]) => {
    //   console.log(`\n${category.toUpperCase()} NEWS (AI-related):`);
    //   logArticles(articles);
    // });

    // console.log('\n---\n');

    // // Get latest news from all categories
    // console.log('Fetching latest news (3 articles per category):');
    // const latestNews = await newsAPI.getLatestNews(3);
    // Object.entries(latestNews).forEach(([category, articles]) => {
    //   console.log(`\n${category.toUpperCase()} NEWS (Latest 3):`);
    //   logArticles(articles);
    // });
  } catch (error) {
    console.error("Error running API:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error message:", error.message);
    }
  }
}

function logArticles(articles) {
  articles.forEach((article, index) => {
    console.log(`\nArticle ${index + 1}:`);
    console.log(`Title: ${article.title}`);
    console.log(`Source: ${article.source}`);
    console.log(`Author: ${article.author}`);
    console.log(`Time: ${article.time}`);
    console.log(`Formatted Time: ${article.formattedTime}`);
    console.log(`Google Link: ${article.googleLink}`);
    console.log(`Resolved Link: ${article.link}`);
    console.log(`Image URL: ${article.imageUrl || "N/A"}`);
  });
}

(async () => {
  console.log("Starting API run...");
  const startTime = Date.now();

  try {
    await runAPI();
  } catch (error) {
    console.error("Unhandled error in API run:", error);
  }

  const endTime = Date.now();
  console.log(`API run completed in ${(endTime - startTime) / 1000} seconds.`);
})();
