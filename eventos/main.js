const timelineEl = document.getElementById('timeline');
const carEl = document.getElementById('car');

// Example data for demo; replace with fetch in production
const eventsUrl = '/src/data/events';

function fetchEvents() {
	return fetch(eventsUrl)
		.then(resp => resp.json())
		.catch(() => [
			{ title: 'Sample Past Event', startDate: '2022-01-01' },
			{
				title: 'Sample Present Event',
				startDate: new Date().toISOString().slice(0, 10),
			},
			{ title: 'Sample Future Event', startDate: '2025-01-01' },
		]);
}

function classifyEvent(event, now) {
	const eventTime = new Date(event.startDate).setHours(0, 0, 0, 0);
	if (eventTime < now) return 'past';
	if (eventTime === now) return 'present';
	return 'future';
}

function renderTimeline(events) {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	let html = '';
	let presentIdx = 0;
	events.forEach((event, i) => {
		const type = classifyEvent(event, now.getTime());
		if (type === 'present') presentIdx = i;
		html += `
      <div class="event ${type}" data-idx="${i}">
        <div class="date">${new Date(event.startDate).toLocaleDateString(
					'en-CA',
					{ year: 'numeric', month: 'short', day: '2-digit' }
				)}</div>
        <div class="title">${event.title}</div>
      </div>
    `;
	});
	timelineEl.innerHTML = html;
	moveCarToEvent(presentIdx);
	addEventListeners(events);
}

function moveCarToEvent(idx) {
	const eventEls = timelineEl.querySelectorAll('.event');
	if (!eventEls[idx]) return;
	const eventRect = eventEls[idx].getBoundingClientRect();
	const timelineRect = timelineEl.getBoundingClientRect();
	const carLeft = eventEls[idx].offsetLeft + eventRect.width / 2 - 30; // 30 = half car width
	carEl.style.left = carLeft + 'px';
	// Scroll timeline to center present event
	timelineEl.scrollTo({
		left:
			eventEls[idx].offsetLeft - timelineRect.width / 2 + eventRect.width / 2,
		behavior: 'smooth',
	});
}

function addEventListeners(events) {
	timelineEl.querySelectorAll('.event').forEach((el, i) => {
		el.addEventListener('click', () => showEventModal(events[i]));
	});

	// Add scroll event listener to move car
	timelineEl.addEventListener('scroll', () => {
		const events = timelineEl.querySelectorAll('.event');
		const timelineRect = timelineEl.getBoundingClientRect();
		const centerX = timelineRect.left + timelineRect.width / 2;

		let closestEvent = null;
		let minDistance = Infinity;

		events.forEach(event => {
			const rect = event.getBoundingClientRect();
			const distance = Math.abs(rect.left + rect.width / 2 - centerX);
			if (distance < minDistance) {
				minDistance = distance;
				closestEvent = event;
			}
		});

		if (closestEvent) {
			const idx = parseInt(closestEvent.dataset.idx);
			moveCarToEvent(idx);
		}
	});
}

function showEventModal(event) {
	const modal = document.createElement('div');
	modal.style.position = 'fixed';
	modal.style.top = '0';
	modal.style.left = '0';
	modal.style.width = '100vw';
	modal.style.height = '100vh';
	modal.style.background = 'rgba(44,62,80,0.4)';
	modal.style.display = 'flex';
	modal.style.alignItems = 'center';
	modal.style.justifyContent = 'center';
	modal.style.zIndex = '1000';
	modal.style.backdropFilter = 'blur(4px)';

	// Format date and time
	const eventDate = new Date(event.startDate);
	const formattedDate = eventDate.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
	const formattedTime = eventDate.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
	});

	modal.innerHTML = `
    <div style="
      background: #fff;
      padding: 2.5rem;
      border-radius: 20px;
      max-width: 90vw;
      width: 600px;
      box-shadow: 0 8px 32px rgba(44,62,80,0.18);
      position: relative;
      overflow: hidden;
    ">
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: linear-gradient(90deg, #4fd1c5, #ffb347);
      "></div>
      
      <h2 style="
        margin: 0 0 1.5rem 0;
        color: #2d3a4b;
        font-size: 1.8rem;
        font-weight: 700;
      ">${event.title}</h2>

      <div style="
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 1rem 1.5rem;
        margin-bottom: 2rem;
        color: #4a5568;
      ">
        <div style="font-weight: 600;">Date:</div>
        <div>${formattedDate}</div>
        
        <div style="font-weight: 600;">Time:</div>
        <div>${formattedTime}</div>
        
        ${
					event.location
						? `
          <div style="font-weight: 600;">Location:</div>
          <div>${event.location}</div>
        `
						: ''
				}
        
        ${
					event.organizer
						? `
          <div style="font-weight: 600;">Organizer:</div>
          <div>${event.organizer}</div>
        `
						: ''
				}
        
        ${
					event.category
						? `
          <div style="font-weight: 600;">Category:</div>
          <div>${event.category}</div>
        `
						: ''
				}
      </div>

      ${
				event.description
					? `
        <div style="
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #f7fafc;
          border-radius: 12px;
          color: #4a5568;
          line-height: 1.6;
        ">
          <h3 style="margin: 0 0 0.8rem 0; color: #2d3a4b;">Description</h3>
          <p style="margin: 0;">${event.description}</p>
        </div>
      `
					: ''
			}

      ${
				event.links
					? `
        <div style="margin-bottom: 2rem;">
          <h3 style="margin: 0 0 0.8rem 0; color: #2d3a4b;">Links</h3>
          <div style="display: flex; gap: 1rem;">
            ${Object.entries(event.links)
							.map(
								([label, url]) => `
              <a href="${url}" target="_blank" style="
                padding: 0.5rem 1rem;
                background: #4fd1c5;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 0.9rem;
                transition: background 0.2s;
              ">${label}</a>
            `
							)
							.join('')}
          </div>
        </div>
      `
					: ''
			}

      <div style="
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
      ">
        <button id="close-modal" style="
          padding: 0.8rem 1.5rem;
          border: none;
          background: #e2e8f0;
          color: #4a5568;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        ">Close</button>
        
        ${
					event.links?.register
						? `
          <a href="${event.links.register}" target="_blank" style="
            padding: 0.8rem 1.5rem;
            border: none;
            background: #4fd1c5;
            color: white;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            text-decoration: none;
            transition: background 0.2s;
          ">Register Now</a>
        `
						: ''
				}
      </div>
    </div>
  `;

	// Add hover effects
	const buttons = modal.querySelectorAll('button, a');
	buttons.forEach(button => {
		button.addEventListener('mouseover', () => {
			button.style.opacity = '0.9';
		});
		button.addEventListener('mouseout', () => {
			button.style.opacity = '1';
		});
	});

	// Add click event listener to close button
	const closeButton = modal.querySelector('#close-modal');
	closeButton.addEventListener('click', () => {
		modal.remove();
	});

	// Add click event listener to modal background to close
	modal.addEventListener('click', e => {
		if (e.target === modal) {
			modal.remove();
		}
	});

	document.body.appendChild(modal);
}

// On load
fetchEvents().then(events => {
	events.forEach(e => (e.time = new Date(e.startDate).getTime()));
	events.sort((a, b) => a.time - b.time);
	renderTimeline(events);
});
