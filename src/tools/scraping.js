const puppeteer = require("puppeteer");
const fs = require("fs/promises");
require("dotenv").config();
const TurndownService = require("turndown");
const turndownService = new TurndownService();

async function scrapeMeetupEvents() {
  // Launch the browser with improved configuration
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1920,1080",
      "--max-old-space-size=4096",
      "--memory-pressure-off",
    ],
    protocolTimeout: 600000, // Increased from 300000 to 600000 (10 minutes)
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 5000)); // Give browser time to stabilize

  const allEventData = [];

  try {
    // Open a new page with improved configuration
    const page = await browser.newPage();

    // Set up page with better network handling
    await page.setDefaultNavigationTimeout(120000);
    await page.setDefaultTimeout(120000);
    await page.setRequestInterception(true);

    // Filter out unnecessary requests to improve performance
    page.on("request", (request) => {
      const resourceType = request.resourceType();
      if (
        resourceType === "image" ||
        resourceType === "stylesheet" ||
        resourceType === "font"
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Set up console log forwarding from browser to Node
    page.on("console", async (msg) => {
      const args = msg.args();
      const vals = [];
      for (let i = 0; i < args.length; i++) {
        vals.push(await args[i].jsonValue());
      }
      console.log(vals.map((v) => JSON.stringify(v)).join("\t"));
    });

    const cookies = [
      {
        name: "__meetup_auth_access_token",
        value: process.env.MEETUP_AUTH_TOKEN,
        domain: ".meetup.com",
      },
      {
        name: "MEETUP_SESSION",
        value: process.env.MEETUP_SESSION,
        domain: ".meetup.com",
      },
      {
        name: "memberId",
        value: process.env.MEETUP_MEMBER_ID,
        domain: ".meetup.com",
      },
    ];

    await page.setCookie(...cookies);

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    console.log("Accessing past events list page...");

    // Function to retry page loading with exponential backoff
    async function loadPageWithRetry(page, url, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt}/${maxRetries} to load ${url}`);

          // Add delay between retries with exponential backoff
          if (attempt > 1) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          // Try to load the page with different wait conditions
          try {
            await page.goto(url, {
              waitUntil: "domcontentloaded",
              timeout: 60000,
            });

            // Wait for a specific element that indicates the page is loaded
            await page
              .waitForSelector('div[data-testid="event-card"]', {
                timeout: 30000,
              })
              .catch(() =>
                console.log("Event cards not found, but continuing...")
              );

            return true;
          } catch (error) {
            console.log(`Navigation attempt ${attempt} failed:`, error.message);

            // Try alternative wait condition if the first one fails
            try {
              await page.goto(url, {
                waitUntil: "load",
                timeout: 60000,
              });
              return true;
            } catch (retryError) {
              console.log(
                `Alternative navigation attempt ${attempt} failed:`,
                retryError.message
              );
              if (attempt === maxRetries) throw retryError;
            }
          }
        } catch (error) {
          console.log(`Page load attempt ${attempt} failed:`, error.message);
          if (attempt === maxRetries) throw error;
        }
      }
    }

    // Access the first past events list page with retry mechanism
    try {
      await loadPageWithRetry(
        page,
        "https://www.meetup.com/torontojs/events/?type=past"
      );
      console.log("Successfully loaded the events page");
    } catch (error) {
      console.error("Failed to load the events page after all retries:", error);
      throw error;
    }

    // Setup and execute the infinite scroll logic
    await page.evaluate(() => {
      window.atBottom = false;
      window.scrollAttempts = 0;
      window.maxScrollAttempts = 200; // Increased from 1000 to 200
      window.lastHeight = 0;
      window.sameHeightCount = 0;

      const wait = (duration) =>
        new Promise((resolve) => setTimeout(resolve, duration));

      (async () => {
        const scroller = document.documentElement;

        while (
          !window.atBottom &&
          window.scrollAttempts < window.maxScrollAttempts
        ) {
          window.scrollAttempts++;

          // Scroll to bottom
          scroller.scrollTop = scroller.scrollHeight;

          // Wait for content to load
          await wait(1000);

          const currentHeight = scroller.scrollHeight;

          if (currentHeight === window.lastHeight) {
            window.sameHeightCount++;
            if (window.sameHeightCount >= 5) {
              window.atBottom = true;
              console.log("Reached bottom of page!");
            }
          } else {
            window.sameHeightCount = 0;
            window.lastHeight = currentHeight;
          }

          console.log(
            `Scroll attempt ${window.scrollAttempts}/${window.maxScrollAttempts}`
          );
        }
      })();
    });

    // Wait for the scrolling to complete with improved timeout handling
    console.log("Waiting for infinite scroll to complete...");
    try {
      await page.waitForFunction("window.atBottom == true", {
        timeout: 300000, // 5 minutes timeout
        polling: 1000,
      });
    } catch (error) {
      console.log("Scroll timeout reached, proceeding with current results...");
    }
    console.log("Infinite scroll completed, retrieving event links...");

    // Get all event links with improved selector
    const eventLinks = await page.evaluate(() => {
      const uniqueLinks = new Set();
      const eventCards = document.querySelectorAll('a[href*="/events/"]');

      eventCards.forEach((card) => {
        const href = card.getAttribute("href");
        // Only include links that match the event pattern and exclude non-event pages
        if (
          href &&
          href.includes("/events/") &&
          !href.includes("?type=") &&
          !href.includes("/calendar") &&
          !href.endsWith("/events/")
        ) {
          uniqueLinks.add(href);
        }
      });

      return Array.from(uniqueLinks);
    });

    console.log(`Found ${eventLinks.length} event links`);
    console.log({ eventLinks });

    async function processEventWithRetry(page, url, maxRetries = 5) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            const delay = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
            console.log(`Waiting ${delay}ms before retry ${attempt}`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          // Create a new page for each attempt with improved configuration
          const newPage = await page.browser().newPage();

          try {
            // Set up page with better network handling
            await newPage.setDefaultNavigationTimeout(60000); // Reduced from 120000
            await newPage.setDefaultTimeout(60000);
            await newPage.setRequestInterception(true);

            // Filter out unnecessary requests
            newPage.on("request", (request) => {
              const resourceType = request.resourceType();
              if (
                resourceType === "image" ||
                resourceType === "stylesheet" ||
                resourceType === "font" ||
                resourceType === "media"
              ) {
                request.abort();
              } else {
                request.continue();
              }
            });

            await newPage.setUserAgent(
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            );

            // Add a random delay between 2-5 seconds before each request
            await new Promise((resolve) =>
              setTimeout(resolve, 2000 + Math.random() * 3000)
            );

            // Try to load the page with improved navigation
            await newPage.goto(url, {
              waitUntil: "domcontentloaded",
              timeout: 60000,
            });

            // Wait for the main content to be visible
            await newPage
              .waitForSelector("h1", { timeout: 30000 })
              .catch(() => console.log("Title not found, but continuing..."));

            // Extract event information
            const eventData = await newPage.evaluate(() => {
              // title
              const title =
                document.querySelector("h1")?.textContent.trim() || "No title";

              // hosts
              const hostText =
                document
                  .querySelector('a[data-event-label="hosted-by"] .font-medium')
                  ?.textContent.trim() || "";
              const hosts = hostText
                ? hostText.split(" and ").map((name) => name.trim())
                : [];

              // startDate and endDate
              const dateTimeElement = document.querySelector("time[datetime]");
              const startDate = dateTimeElement
                ? dateTimeElement.getAttribute("datetime")
                : new Date().toISOString();
              const endDate = startDate;

              // status
              const canceledElement = document.querySelector(
                '[data-testid="event-canceled-banner"]'
              );
              const status = canceledElement ? "canceled" : "active";

              // locationType
              const venueNameElement = document.querySelector(
                '[data-testid="venue-name-value"]'
              );
              const locationType =
                venueNameElement?.textContent.trim() === "Online event"
                  ? "virtual"
                  : "in-person";

              // image
              const imageElement = document.querySelector(
                '[data-testid="event-description-image"] img'
              );
              const image = imageElement
                ? imageElement.getAttribute("src")
                : null;

              // details
              const detailsHTML =
                document.getElementById("event-details")?.innerHTML || "";

              // tags
              const tags = Array.from(document.querySelectorAll("a.tag--topic"))
                .map((tag) => tag.textContent.trim())
                .filter((tag) => tag);

              return {
                title,
                hosts,
                startDate,
                endDate,
                status,
                locationType,
                image,
                detailsHTML,
                tags,
              };
            });

            // Convert HTML to Markdown
            eventData.details = turndownService.turndown(eventData.detailsHTML);
            delete eventData.detailsHTML;

            console.log(
              `Successfully retrieved information for event "${eventData.title}"`
            );

            // Close the new page
            await newPage.close();

            return eventData;
          } catch (error) {
            // Close the page if there was an error
            try {
              await newPage.close();
            } catch (closeError) {
              console.log("Error closing page:", closeError.message);
            }
            throw error;
          }
        } catch (error) {
          console.log(`Attempt ${attempt}/${maxRetries} failed for ${url}`);
          console.log(`Error type: ${error.name}`);
          console.log(`Error message: ${error.message}`);

          if (attempt === maxRetries) {
            console.error(
              `Failed to process event after ${maxRetries} attempts:`,
              {
                url,
                errorType: error.name,
                errorMessage: error.message,
                stack: error.stack,
              }
            );
            return null;
          }
        }
      }
    }

    // Process events in smaller batches with longer delays
    const BATCH_SIZE = 1; // Process one event at a time
    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < eventLinks.length; i += BATCH_SIZE) {
      const batch = eventLinks.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(eventLinks.length / BATCH_SIZE);

      console.log(
        `\nProcessing batch ${batchNumber}/${totalBatches} (${processedCount} successful, ${failedCount} failed)`
      );

      const promises = batch.map((eventUrl) =>
        processEventWithRetry(page, eventUrl)
      );
      const results = await Promise.all(promises);

      results.forEach((eventData) => {
        if (eventData) {
          allEventData.push(eventData);
          processedCount++;
        } else {
          failedCount++;
        }
      });

      // Add a longer delay between batches (20-30 seconds)
      const batchDelay = 20000 + Math.random() * 10000;
      console.log(
        `Waiting ${Math.round(batchDelay / 1000)} seconds before next batch...`
      );
      await new Promise((resolve) => setTimeout(resolve, batchDelay));
    }

    console.log(`\nProcessing complete!`);
    console.log(`Successfully processed: ${processedCount} events`);
    console.log(`Failed to process: ${failedCount} events`);

    for (const eventData of allEventData) {
      // Extract date from startDate (assumes ISO format)
      const eventDate = new Date(eventData.startDate);
      const formattedDate = eventDate.toISOString().split("T")[0]; // Gets YYYY-MM-DD

      // Create filename
      const filename = `src/data/events/event-${formattedDate}.json`;

      // Ensure the directory exists
      await fs.mkdir("src/data/events", { recursive: true });

      // Save individual event file
      await fs.writeFile(filename, JSON.stringify(eventData, null, 2), "utf8");
      console.log(`Saved event file: ${filename}`);
    }

    console.log(
      `Scraping completed. Saved ${allEventData.length} individual event files.`
    );

    return allEventData;
  } catch (error) {
    console.error("An error occurred during the scraping process:", error);
  } finally {
    // Close the browser
    await browser.close();
  }
}

// Execute the function
scrapeMeetupEvents();
