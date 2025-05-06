const el = document.getElementById.bind(document)
const svg = el('splash')
const dim = 1000
const dim7 = dim / 7
let events = [], textnodes = []

function renderEvents(data) {
  events = data
  let str = ''
  events.forEach(event => event.time = (new Date(event.startDate)).getTime())
  events.sort((a, b) => a.time - b.time)
  str = events.reduce((acc, event, i) => acc + render(event, i), '')

  svg.innerHTML = '<g id="gtag">' + str + '</g>'
}

function render(event, i) {
  const day = (new Date(event.startDate)).getDay() 
  const x = rand(dim7) + day * dim7
  let colour = `hsla(${300 + day * 45 + rand(30) - 15}, 100%, 50%, 70%)`
  return `<rect x="${x}" y="${i*2}" rx="5" ry="5" fill="${colour}" id="${"event-"+i}" />`
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

svg.addEventListener('mouseover', e => {
  const target = e.target
  if(target.id.substr(0,5) !== 'event') return false
  const event_id = target.id.substr(6)
  const event = events[event_id]

  const tn = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  tn.textContent = `${event.startDate} :: ${event.title}`
  tn.setAttribute('x', target.x.baseVal.value + 10)
  tn.setAttribute('y', target.y.baseVal.value + 20)
  tn.setAttribute('class', 'text')
  svg.appendChild(tn)
  textnodes.push(tn)
})

svg.addEventListener('mouseout', e => {
  if(e.relatedTarget?.classList?.value === 'text') return false
  textnodes.forEach(tn => svg.removeChild(tn))
  textnodes = []
})
