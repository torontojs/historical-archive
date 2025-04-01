const puppeteer = require("puppeteer");
const fs = require("fs/promises");

async function scrapeMeetupEvents() {
  // Launch the browser
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const allEventData = [];
  let hasMoreEvents = true;
  let pageIndex = 1;

  try {
    // Open a new page
    const page = await browser.newPage();

    const cookies = [
      {
        name: "__meetup_auth_access_token",
        value: "YOUR TOKEN",
        domain: ".meetup.com",
      },
      {
        name: "MEETUP_SESSION",
        value: "YOUR SESSION",
        domain: ".meetup.com",
      },
      {
        name: "memberId",
        value: "YOUR ID",
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

    // Due to infinite scrolling, scroll multiple pages to collect events
    while (hasMoreEvents && pageIndex <= 5) {
      // Scroll up to 5 pages (adjust as needed)
      console.log(`Processing page ${pageIndex}...`);

      // Get all event card links
      const eventLinks = await page.evaluate(() => {
        const links = [];
        const eventCards = document.querySelectorAll('a[href*="/events/"]');

        eventCards.forEach((card) => {
          const href = card.getAttribute("href");
          // Check if the URL matches the specific pattern
          const urlPattern =
            /^https:\/\/www\.meetup\.com\/torontojs\/events\/\d+\/\?eventOrigin=group_events_list$/;
          if (href && urlPattern.test(href)) {
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
              : ["No host"];

            // startDate
            const dateTimeElement = document.querySelector("time[datetime]");
            const startDate = dateTimeElement
              ? {
                  rawDateTime: dateTimeElement.getAttribute("datetime"),
                  displayText: dateTimeElement.textContent.trim(),
                }
              : { rawDateTime: "No date", displayText: "No date" };

            // status
            const canceledElement = document.querySelector(
              '[data-testid="event-canceled-banner"]'
            );
            const status = canceledElement ? "canceled" : "active";

            // locationType
            const venueNameElement = document.querySelector(
              '[data-testid="venue-name-value"]'
            );
            const isVirtualEvent =
              venueNameElement?.textContent.trim() === "Online event";

            const locationType = isVirtualEvent ? "virtual" : "in-person";

            // image
            const imageElement = document.querySelector(
              '[data-testid="event-description-image"] img'
            );
            const image = imageElement
              ? imageElement.getAttribute("src")
              : null;

            // details
            const detailsElement = document.querySelector("#event-details");
            const details = detailsElement
              ? detailsElement.innerHTML
              : "No description";

            // tags

            return {
              title,
              hosts,
              startDate,
              status,
              locationType,
              image,
              details,
              url: window.location.href,
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

      // Check if there are more pages and load by scrolling
      const previousHeight = await page.evaluate("document.body.scrollHeight");
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for content to load after scrolling

      const newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === previousHeight) {
        // If height doesn't change after scrolling, no more content is available
        hasMoreEvents = false;
        console.log("No more events available");
      }

      pageIndex++;
    }

    // Save results as JSON file
    await fs.writeFile(
      "torontojs_events.json",
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
