const el = document.getElementById.bind(document)
const can = el('splash')
const ctx = can.getContext('2d')
const events = []
const dim = 1000
const dim7 = dim / 7

function renderEvents(events) {
  events.forEach(event => event.time = (new Date(event.startDate)).getTime())
  events.sort((a, b) => a.time - b.time)
  events.forEach(render)
}

function render(event, i) {
  const day = (new Date(event.startDate)).getDay() 
  const x = rand(dim7) + day * dim7
  ctx.fillStyle = `hsla(${300 + day * 45 + rand(30) - 15}, 100%, 50%, 70%)`
  ctx.fillRect(x, i*2, 10, Math.max(14, Math.min(20, event.title.length / 2)))
}

function rand(n) {
  return Math.floor(Math.random() * n)
}

function fetchJSON(srcPath, callback) {
  const prefix = 'https://raw.githubusercontent.com/torontojs/historical-archive/main/src/data/'
  fetch(prefix + srcPath)
  .then(resp => resp.json())
  .then(data => callback(data))
  .catch(err => console.error('Fetch went awry', err, srcPath, callback))
}

// init
fetchJSON('directory.json', renderEvents)