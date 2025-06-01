const cheerio = require("cheerio");
const {
  launchStealthBrowser,
  generateNewsUrl,
  resolveRedirect,
  delay,
  extractUrlFromJslog,
} = require("./utils");
  
async function scrapeNews(newsCategory, start = 0, count = 3) {
  console.log(
    `[scrapeNews] Starting news scraping for category: ${newsCategory}, start: ${start}, count: ${count}`
  );

  const url = generateNewsUrl(newsCategory);
  console.log(`[scrapeNews] Generated URL: ${url}`);

  console.log(`[scrapeNews] Launching browser...`);
  const { browser, page } = await launchStealthBrowser();
  console.log(`[scrapeNews] Browser launched successfully.`);

  let articles = [];
  const seenTitles = new Set();

  try {
    console.log(`[scrapeNews] Navigating to page: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    console.log(`[scrapeNews] Page loaded. Waiting for content...`);

    await delay();

    console.log(`[scrapeNews] Extracting page content...`);
    const html = await page.content();
    const $ = cheerio.load(html);

    const elements = $("div.W8yrY, article.IBr9hb, article.UwIKyb, article.IFHyqb").get();
    console.log(`[scrapeNews] Found ${elements.length} article containers.`);

    const end = start + count;
    let titleCount = 0;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const $el = $(el);

       const isIFHyqb = $el.is("article.IFHyqb");
       const linkSelector = isIFHyqb ? "a.JtKRv" : "a.gPFEn";

      const title = $el.find(linkSelector).text().trim();

      if (!title) continue;

      titleCount++;
      if (titleCount <= start) continue;
      if (titleCount > end) break;

      if (seenTitles.has(title)) continue;
      seenTitles.add(title);

      console.log(`[scrapeNews] Scraping article #${titleCount}: "${title}"`);

      const rawLink = $el.find(linkSelector).attr("href");
      const googleLink = rawLink?.startsWith("http")
        ? rawLink
        : `https://news.google.com${rawLink.replace(/^\./, "")}`;

      await delay();

      const jslog = $el.find("a.WwrzSb").attr("jslog");
      const sourceLink = await extractUrlFromJslog(jslog);

      const source = $el.find("div.vr1PYe").text().trim();
      const dateTime = $el.find("time.hvbAAd").attr("datetime");
      const time = $el.find("time.hvbAAd").text().trim();
      const authorText = $el.find("div.bInasb span").text().trim();
      const authorArray = authorText.split("By ").filter((a) => a.trim());
      const author =
        authorArray.length > 0 ? authorArray.join(", ") : "Unknown";
      // const unknownAuthor = author === "Unknown";

      const imageElement = $el.find("figure.K0q4G img.Quavad");
      const rawImageUrl =
        imageElement.length > 0 ? imageElement.attr("src") : null;
      const imageUrl = rawImageUrl
        ? `https://news.google.com${rawImageUrl}`
        : null;

      console.log(
        `[scrapeNews] -> Source: ${source}, Time: ${time}, Author: ${author}`
      );

      articles.push({
        title,
        sourceLink,
        googleLink,
        source,
        dateTime,
        time,
        author,
        imageUrl,
      });
    }

    console.log("====================================");
    console.log(
      `Scraped ${articles.length} articles from category: ${newsCategory}`
    );
    console.log("====================================");

    return articles;
  } catch (err) {
    console.error("[scrapeNews] ❌ Error while scraping news:", err.message);
    return [];
  } finally {
    console.log(`[scrapeNews] Closing browser...`);
    await browser.close();
    console.log(`[scrapeNews] Browser closed.`);
  }
}

module.exports = {
  scrapeNews: scrapeNews,
};

// Run directly
if (require.main === module) {
  async function main() {
    try {
      const technologyNews = await scrapeNews(TECHNOLOGY_CATEGORY, 165, 5);
      // console.log(JSON.stringify(technologyNews, null, 2));
      console.log('====================================');
      console.log(technologyNews);
      console.log('====================================');
    } catch (error) {
      console.error("Error in main function:", error);
    }
  }

  main();
}
