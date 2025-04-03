const puppeteer = require("puppeteer");
const fs = require("fs/promises");
require("dotenv").config();

async function scrapeMeetupEvents() {
  // Launch the browser
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const allEventData = [];
  let pageIndex = 1;

  try {
    // Open a new page
    const page = await browser.newPage();

    // Set up console log forwarding from browser to Node
    page.on("console", async (msg) => {
      const args = msg.args();
      const vals = [];
      for (let i = 0; i < args.length; i++) {
        vals.push(await args[i].jsonValue());
      }
      console.log(vals.join("\t"));
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

    // Set page timeout
    page.setDefaultNavigationTimeout(60000);

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    console.log("Accessing past events list page...");

    // Access the first past events list page
    await page.goto("https://www.meetup.com/torontojs/events/?type=past", {
      waitUntil: "networkidle2",
    });

    // Setup and execute the infinite scroll logic
    await page.evaluate(() => {
      window.atBottom = false;

      const wait = (duration) => {
        console.log("Waiting", duration, "ms");
        return new Promise((resolve) => setTimeout(resolve, duration));
      };

      (async () => {
        const scroller = document.documentElement;
        let lastPosition = -1;
        let noChangeCount = 0;

        while (!window.atBottom) {
          // Scroll down in increments rather than all at once
          scroller.scrollTop += 800;

          await wait(500);

          const currentPosition = scroller.scrollTop;
          console.log("Current scroll position:", currentPosition);

          if (currentPosition > lastPosition) {
            // Still scrolling, reset counter
            lastPosition = currentPosition;
            noChangeCount = 0;
          } else {
            // Position didn't change, increment counter
            noChangeCount++;
            console.log("No change count:", noChangeCount);

            // If position hasn't changed for multiple checks, we're at the bottom
            if (noChangeCount >= 3) {
              window.atBottom = true;
              console.log("Reached bottom of page!");
            }
          }
        }
      })();
    });

    // Wait for the scrolling to complete
    console.log("Waiting for infinite scroll to complete...");
    await page.waitForFunction("window.atBottom == true", {
      timeout: 300000, // 5 minutes timeout
      polling: 1000, // Poll every second
    });
    console.log("Infinite scroll completed, retrieving event links...");

    // Now get all event links after the scrolling is complete
    const eventLinks = await page.evaluate(() => {
      const links = [];
      const eventCards = document.querySelectorAll('a[href*="/events/"]');

      eventCards.forEach((card) => {
        const href = card.getAttribute("href");
        // Check if the URL matches the specific pattern
        const urlPattern =
          /^https:\/\/www\.meetup\.com\/torontojs\/events\/\d+\/\?eventOrigin=group_events_list$/;
        if (href && urlPattern.test(href) && !links.includes(href)) {
          links.push(href);
        }
      });

      return links;
    });

    console.log(`Found ${eventLinks.length} event links`);
    console.log({ eventLinks });

    // Access each event page and retrieve detailed information
    for (let i = 0; i < eventLinks.length; i++) {
      const eventUrl = eventLinks[i];
      console.log(
        `Processing event ${i + 1}/${eventLinks.length}: ${eventUrl}`
      );

      try {
        await page.goto(eventUrl, { waitUntil: "networkidle2" });

        // Extract event information
        const eventData = await page.evaluate(() => {
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

          // startDate and endDate (assuming end date is same as start date if not specified)
          const dateTimeElement = document.querySelector("time[datetime]");
          const startDate = dateTimeElement
            ? dateTimeElement.getAttribute("datetime") // Already in ISO format
            : new Date().toISOString();
          const endDate = startDate; // Set end date same as start date if not available

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
          const image = imageElement ? imageElement.getAttribute("src") : null;

          // details
          const detailsElement = document.querySelector("#event-details");
          const details = detailsElement ? detailsElement.innerHTML : "";

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
            details,
            tags,
          };
        });

        console.log(`Retrieved information for event "${eventData.title}"`);
        allEventData.push(eventData);

        // Set random wait time (to avoid scraping detection)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 + Math.random() * 2000)
        );
      } catch (error) {
        console.error(
          `Error occurred while processing event page: ${eventUrl}`,
          error.message
        );
        // Continue despite error
        continue;
      }
    }

    // Save results as JSON file
    await fs.writeFile(
      "src/data/torontojs_events.json",
      JSON.stringify(allEventData, null, 2),
      "utf8"
    );
    console.log(
      `Scraping completed. Saved information for ${allEventData.length} events.`
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
