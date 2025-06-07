const BASE_URL = 'https://raw.githubusercontent.com/torontojs/historical-archive/main/src/data/';

const el = document.getElementById.bind(document);

// Function to render the timeline from the fetched data
function renderTimeline(data) {
  let str = '';

  // Loop through the data and build HTML for each event
  for (let i = 0; i < data.length; i++) {
    const event = data[i];
    const srcPath = `events/${event.file}`;

    // Check if event.tags exists and is an array, else default to an empty array
    const tags = Array.isArray(event.tags) ? event.tags : [];

    // Build HTML for each event card
    str += `
      <li class="event-card">
        <h2>${event.title}</h2>
        <p class="date">${new Date(event.startDate).toLocaleString()}</p>
        <div class="tags">
          ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <a href="#" onclick="showEvent('${srcPath}')">View Details</a>
      </li>
    `;
  }

  // Insert the HTML into the timeline container
  el('timeline').innerHTML = str;
}

// Function to show detailed event data
function showEvent(srcPath) {
  fetchJSON(srcPath, eventData => {
    // Function to convert plain text URLs to clickable links
    function convertLinks(text) {
      // Convert any URLs to clickable links
      return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="event-link">$1</a>');
    }

    // Function to convert text into properly formatted paragraphs
    function formatText(text) {
      // Split text by new lines and wrap each line in a <p> tag
      return text.split('\n').map(line => `<p>${line}</p>`).join('');
    }

    // Format the details content
    const formattedDetails = eventData.details ? convertLinks(eventData.details) : 'No details available for this event.';

    // Apply paragraph formatting to the details
    const formattedDetailsWithParagraphs = formatText(formattedDetails);

    // Create HTML for the event details with an image if available
    const eventHtml = `
      <h2>${eventData.title}</h2>
      <p><strong>Hosted by:</strong> ${eventData.hosts.join(', ')}</p>
      <p><strong>Start Date:</strong> ${new Date(eventData.startDate).toLocaleString()}</p>
      <p><strong>Status:</strong> ${eventData.status}</p>
      <p><strong>Location:</strong> ${eventData.locationType}</p>
      <div class="event-image">
        ${eventData.image ? `<img src="${new URL(eventData.image, new URL('./events/', BASE_URL)).toString()}" alt="${eventData.title}" />` : ''}
      </div>
      <div class="event-details">${formattedDetailsWithParagraphs}</div>
    `;

    // Insert the event details HTML into the event container
    el('event').innerHTML = eventHtml;
  });
}

// Function to fetch JSON data
function fetchJSON(srcPath, callback) {
  fetch(new URL(srcPath, BASE_URL))
    .then(resp => resp.json())
    .then(data => callback(data))
    .catch(err => console.error('Fetch went awry', err, srcPath, callback));
}

// Initialize the page by fetching the directory JSON
fetchJSON('directory.json', renderTimeline);
