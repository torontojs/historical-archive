const el = document.getElementById.bind(document)

let currentPage = 1
const eventsPerPage = 6

const cardStyles = ['card-blue-light', 'card-yellow', 'card-blue-dark', 'card-red', 'card-purple', 'card-orange']

// Render the timeline with pagination
function renderTimeline(data) {
  let str = ''
  const startIndex = (currentPage - 1) * eventsPerPage
  const endIndex = currentPage * eventsPerPage
  const pageData = data.slice(startIndex, endIndex)

  pageData.forEach((event, index) => {
    const srcPath = `events/${event.file}`
    const styleClass = cardStyles[index % cardStyles.length] // Cycle through styles

    str += `
      <div class="card ${styleClass}" onclick="showEvent('${srcPath}')">
        <h3>${event.title}</h3>
        <p>${new Date(event.startDate).toLocaleDateString()}</p>
        <button class="button">View Details</button>
      </div>
    `
  })

  el('timeline').innerHTML = str
}

// Fetch the event details and show them above the cards
function showEvent(srcPath) {
  fetchJSON(srcPath, eventData => {
    const detailsSection = el('event-details')
    detailsSection.innerHTML = `
      <h2>${eventData.title}</h2>
      <p><strong>Date:</strong> ${new Date(eventData.startDate).toLocaleString()}</p>
      ${eventData.location ? `<p><strong>Location:</strong> ${eventData.location}</p>` : ''}
      ${eventData.description ? `<p>${eventData.description}</p>` : ''}
      ${eventData.details ? `<p>${eventData.details.replace(/\n/g, '<br>')}</p>` : ''}
    `
  })
}

// Fetch the JSON file
function fetchJSON(srcPath, callback) {
  const prefix = 'https://raw.githubusercontent.com/torontojs/historical-archive/main/src/data/'
  fetch(prefix + srcPath)
    .then(resp => resp.json())
    .then(data => callback(data))
    .catch(err => console.error('Error fetching data:', err))
}

// Change to the next or previous page
function changePage(offset) {
  currentPage += offset
  fetchJSON('directory.json', renderTimeline)
}

// Initialize the page
fetchJSON('directory.json', renderTimeline)

el('prevBtn').addEventListener('click', () => {
  if (currentPage > 1) {
    changePage(-1)
  }
})

el('nextBtn').addEventListener('click', () => {
  changePage(1)
})
