const el = document.getElementById.bind(document)
const events = []

function renderEvents(events) {
  let str = ''
  events.forEach(event => event.time = (new Date(event.startDate)).getTime())
  events.sort((a, b) => a.time - b.time)
  events.forEach((event, i) => { str += eventTemplate(event, i) })
  el('timeline').innerHTML = str
}

function eventTemplate(event, i) {
  return `
    <div class="sign ${i % 2 ? 'odd' : 'even'}" style="transform: translateZ(calc(var(--dist-var) + ${(event.time - 1279666800000) / 10000000 - 45500}px));">
      <p class="date">${new Date(event.startDate).toLocaleString('en-CA', {year: 'numeric', month: 'short', day: '2-digit'})}</p>
      <p>${event.title}</p>
    </div>`
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

globalPerspective = 0;
document.addEventListener("wheel", (e) => {
  globalPerspective += e.deltaY
  el('timeline').style.setProperty("--dist-var", globalPerspective + 'px')
})

// TODO:
// - make a car
// - fix screen height dependencies
// - get it working in safari etc
// - honk the horn
// - incorporate other timeline info
// - make signs clickable (go to individual event viewer)
// - make signs look better
// - add sun and clouds? maybe time passes as you drive... sunrise, sunset
// - add critters crossing the road 
