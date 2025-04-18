const el = document.getElementById.bind(document)

function renderTimeline(data) {
  let str = ''
  for(let i = 0; i < data.length; i++) {
    const event = data[i]
    const srcPath = `events/${event.file}`
    str += `<li><a href="#" onclick="showEvent('${srcPath}')">${event.title}</a> - ${new Date(event.startDate).toLocaleString()}</li>`
  }
  el('timeline').innerHTML = str
}

function showEvent(srcPath) {
  fetchJSON(srcPath, eventData => {
    el('event').innerHTML = `<pre>${JSON.stringify(eventData, (k,v) => k !== 'details' ? v : v.replace(/\n/g, '<br>'), 2)}</pre>`
  })
}

function fetchJSON(srcPath, callback) {
  const prefix = 'https://raw.githubusercontent.com/torontojs/historical-archive/main/src/data/'
  fetch(prefix + srcPath)
  .then(resp => resp.json())
  .then(data => callback(data))
  .catch(err => console.error('Fetch went awry', err, srcPath, callback))
}

// init
fetchJSON('directory.json', renderTimeline)