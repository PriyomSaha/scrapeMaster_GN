const randomUseragent = require("random-useragent");
const ProxyLists = require("proxy-lists");
const { chromium } = require("playwright");

/**
 * Generate a URL for the given category.
 * @param {string} category - The category to generate the URL for.
 * @returns {string} The generated URL.
 */
function generateNewsUrl(category) {
  return `https://news.google.com/topics/${category}?hl=en-US&gl=US&ceid=US%3Aen`;
}

/**
 * Retrieve a random user agent string from the available list.
 * This function uses the random-useragent library to randomly select
 * and return a user agent string, which can be used to mimic different
 * browsers during web scraping or API requests.
 * 
 * @returns {string} A random user agent string.
 */
function getRandomUserAgent() {
  let ua;
  do {
    ua = randomUseragent.getRandom(); // Get a random UA string
  } while (
    !ua || // If UA is undefined/null/empty
    ua.toLowerCase().includes("mobile") || // Filter out mobile UAs
    ua.toLowerCase().includes("android") || // Exclude Android
    ua.toLowerCase().includes("iphone") || // Exclude iPhone
    ua.toLowerCase().includes("ipad") // Exclude iPad
  );
  
  return ua;
}


/**
 * A simple delay function that resolves a promise after
 * a specified number of milliseconds. The delay time
 * is randomly generated between the given minimum
 * and maximum values.
 * 
 * @param {number} [min=5000] - The minimum delay time in milliseconds.
 * @param {number} [max=10000] - The maximum delay time in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the specified delay time.
 */
function delay(min = 5000, max = 10000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retrieves a random free proxy from the available list.
 * This function uses the proxy-lists library to
 * asynchronously retrieve a list of free proxies,
 * and then randomly selects one proxy from the
 * list. The selected proxy is then returned as a
 * string in the format "ip:port".
 * 
 * @returns {Promise<string>} A promise that resolves
 * with a random free proxy as a string in the format "ip:port".
 */
async function getFreeProxy() {
  return new Promise((resolve, reject) => {
    const gettingProxies = ProxyLists.getProxies({
      // countries: ["us", "in"],
      anonymityLevels: ["anonymous", "elite"],
      protocols: ["http"],
    });

    const onData = (proxies) => {
      if (proxies.length > 0) {
        const selected = proxies[Math.floor(Math.random() * proxies.length)];
        resolve(`${selected.ipAddress}:${selected.port}`);
        gettingProxies.removeListener("data", onData);
        gettingProxies.removeListener("error", onError);
      }
    };

    const onError = (err) => {
      reject(err);
      gettingProxies.removeListener("data", onData);
      gettingProxies.removeListener("error", onError);
    };

    gettingProxies.on("data", onData);
    gettingProxies.on("error", onError);
  });
}


/**
 * Launch a stealthy browser using Playwright.
 * The browser is launched in headless mode with a random user agent,
 * and the viewport is set to a common desktop resolution.
 * A proxy is also randomly selected from the proxy-lists and
 * set as the browser's proxy.
 * 
 * @returns {Promise<{browser: playwright.Browser, page: playwright.Page, userAgent: string}>}
 * A promise that resolves with an object containing the launched browser,
 * the page object, and the random user agent used.
 */
async function launchStealthBrowser() {
  const userAgent = getRandomUserAgent();
  const proxy = await getFreeProxy().catch(() => null);
  
  const browser = await chromium.launch({
    // Launch in headless mode
    headless: true,
  });

  const context = await browser.newContext({
    // Set a random user agent
    userAgent,
    // Explicitly disable mobile emulation
    isMobile: false,
    // Set the locale to English (US)
    locale: "en-US",
    // Set the viewport to a common desktop resolution
    viewport: { width: 1280, height: 800 },
    // Set the timezone to America/New_York
    timezoneId: "America/New_York",
    // Set a random proxy
    proxy: proxy ? { server: proxy } : undefined,
  });

  const page = await context.newPage();

  // Manual stealth injection
  // This code is used to inject a fake value for the navigator.webdriver property
  // This property is used by websites to detect if the browser is being controlled by an automation tool
  await page.addInitScript(() => {
    // Define the property as a getter that returns false
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
    });
  });
  console.log(`[launchStealthBrowser] User agent: ${userAgent}`);
  return { browser, page, userAgent };
}

/**
 * Resolve a URL by following redirects.
 * This function launches a stealthy browser using Playwright,
 * navigates to the given URL, and returns the final URL after
 * following any redirects.
 * 
 * @param {string} url - The URL to resolve.
 * @returns {Promise<string>} A promise that resolves with the final URL.
 */
async function resolveRedirect(url) {
  // Launch a stealthy browser
  const { browser, page } = await launchStealthBrowser();

  try {
    // Navigate to the given URL and wait for the DOM to be loaded
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Get the final URL after following any redirects
    const finalUrl = page.url();
    // Return the final URL
    return finalUrl;
  } catch (error) {
    // Log any errors that occur
    console.error(`Error resolving redirect for ${url}:`, error.message);
    // Return the original URL if we can't resolve the redirect
    return url;
  } finally {
    // Close the browser after we're done
    await browser.close();
  }
}

/**
 * Extract a URL from a given Google News jslog string.
 * 
 * The `jslog` string is a base64-encoded string that contains a URL.
 * This function decodes the base64 string and extracts the URL from it.
 * 
 * @param {string} jslog - The jslog string to extract the URL from.
 * @returns {Promise<string|null>} A promise that resolves with the extracted URL,
 * or `null` if the extraction fails.
 */
async function extractUrlFromJslog(jslog) {
  const base64 = jslog.split("5:")[1]?.split(";")[0];
  if (!base64) return null;

  try {
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    const match = decoded.match(/https?:\/\/[^"]+/);
    return match ? match[0] : null;
  } catch (err) {
    console.error("Failed to decode jslog:", err);
    return null;
  }
}

module.exports = {
  getRandomUserAgent,
  delay,
  getFreeProxy,
  launchStealthBrowser,
  generateNewsUrl,
  resolveRedirect,
  extractUrlFromJslog
};
