const BASE_URL = 'https://raw.githubusercontent.com/torontojs/historical-archive/main/src/data/'

const el = document.getElementById.bind(document)
const events = []
const renderAll = throttle(renderEvents)

function throttle(fun, wait = 100) { // throttle but call it again at the end
  let throttled
  return function(...args) {
    if(throttled) return false
    throttled = true
    setTimeout(() => { throttled = false; fun(...args) }, wait)
    fun(...args)
  }
}

function renderEvents() {
  let search = el('search').value.toLowerCase()
  let str = ''
  events.filter(e => (e.title+e.details).toLowerCase().includes(search)).forEach(event => {
    str += eventTemplate(event)
  })
  el('timeline').innerHTML = str
}

function eventTemplate(event) {
  return `
    <details>
      <summary><span class="date">${new Date(event.startDate).toLocaleString('en-CA', {year: 'numeric', month: 'short', day: '2-digit'})}</span> :: ${event.title}</summary>
      <p class="tags">Tags: ${event.tags.join(', ')}</p>
      <p class="hosts">Hosts: ${event.hosts.join(', ')}</p>
      <p class="image">${event.image ? `<img src="${new URL(event.image, new URL('./events/', BASE_URL)).toString()}">` : ''}</p>
      <div class="event_details">${event.details.replace(/\n/g, '<br>')}</div>
    </details>`
}

function fetchAll(data) {
  data.forEach(eventStub => {
    const srcPath = `events/${eventStub.file}`
    fetchJSON(srcPath, event => {
      event.time = (new Date(event.startDate)).getTime()
      events.push(event)
      events.sort((a, b) => b.time - a.time) // wasteful
      renderAll()
    })
  })
}

function fetchJSON(srcPath, callback) {
  fetch(new URL(srcPath, BASE_URL))
  .then(resp => resp.json())
  .then(data => callback(data))
  .catch(err => console.error('Fetch went awry', err, srcPath, callback))
}

// init
fetchJSON('directory.json', fetchAll)
el('search').addEventListener('input', renderAll)
