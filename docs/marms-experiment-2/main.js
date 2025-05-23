const el = document.getElementById.bind(document);

let currentPage = 1;
let eventsPerPage = 5; // Number of events per page
let totalEvents = 0;
let eventsData = []; // Store all events data

function renderTimeline(data) {
  eventsData = data;
  totalEvents = data.length;
  displayPage(currentPage);
}

function displayPage(page) {
  const startIndex = (page - 1) * eventsPerPage;
  const endIndex = Math.min(startIndex + eventsPerPage, totalEvents);

  let str = '';
  for (let i = startIndex; i < endIndex; i++) {
    const event = eventsData[i];
    const srcPath = `events/${event.file}`;
    str += `<li class="timeline-item"><a href="#" data-src="${srcPath}">${event.title}</a> - ${new Date(event.startDate).toLocaleString()}</li>`;
  }

  el('timeline').innerHTML = str;

  // Enable/Disable buttons based on the current page
  el('prev-btn').disabled = currentPage === 1;
  el('next-btn').disabled = currentPage * eventsPerPage >= totalEvents;
}

function showEvent(eventElement) {
  const srcPath = eventElement.getAttribute('data-src');

  // Fetch the event data
  fetchJSON(srcPath, eventData => {
    // Check if eventData is structured correctly
    console.log(eventData); // Check the structure in the console for debugging

    // Convert newline characters to <br> tags
    const detailsWithLineBreaks = eventData.details.replace(/\n/g, '<br>');

    // Display the event details in the card
    el('event').innerHTML = `
      <h2>${eventData.title}</h2>
      <p>${eventData.description || 'No description available.'}</p>
      <h3>Details:</h3>
      <p>${detailsWithLineBreaks}</p>
    `;
  });
}

function fetchJSON(srcPath, callback) {
  const prefix = 'https://raw.githubusercontent.com/torontojs/historical-archive/main/src/data/';
  fetch(prefix + srcPath)
    .then(resp => resp.json())
    .then(data => callback(data))
    .catch(err => console.error('Fetch went awry', err, srcPath, callback));
}

function changePage(direction) {
  currentPage += direction;
  displayPage(currentPage);
}

// Attach event listeners dynamically
document.addEventListener('DOMContentLoaded', () => {
  el('timeline').addEventListener('click', event => {
    if (event.target.tagName === 'A') {
      event.preventDefault();
      showEvent(event.target);
    }
  });

  el('prev-btn').addEventListener('click', () => changePage(-1));
  el('next-btn').addEventListener('click', () => changePage(1));

  // Fetch initial data
  fetchJSON('directory.json', renderTimeline);
});
