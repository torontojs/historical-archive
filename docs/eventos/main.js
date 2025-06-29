const timelineEl = document.getElementById('timeline');
const carEl = document.getElementById('car');

// Fetch events from TorontoJS GitHub
const eventsUrl =
	'https://raw.githubusercontent.com/torontojs/historical-archive/main/src/data/directory.json';

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

let allEvents = [];
let filteredEvents = [];

function getUniqueYears(events) {
	const years = new Set(events.map(e => new Date(e.startDate).getFullYear()));
	return Array.from(years).sort((a, b) => b - a);
}

function getUniqueCategories(events) {
	const cats = new Set();
	events.forEach(e => {
		if (e.category) cats.add(e.category);
	});
	return Array.from(cats).sort();
}

function highlightMatch(text, query) {
	if (!query) return text;
	const regex = new RegExp(
		`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
		'gi'
	);
	return text.replace(regex, '<span class="highlight">$1</span>');
}

function renderTimeline(events, searchQuery = '') {
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
        <div class="title">${highlightMatch(event.title, searchQuery)}</div>
      </div>
    `;
	});
	timelineEl.innerHTML = html;
	moveCarToEvent(presentIdx);
	updateCarPosition();
	addEventListeners(events);
}

function moveCarToEvent(idx) {
	const eventEls = timelineEl.querySelectorAll('.event');
	if (!eventEls[idx]) return;

	const eventRect = eventEls[idx].getBoundingClientRect();
	const timelineRect = timelineEl.getBoundingClientRect();
	const carLeft = eventEls[idx].offsetLeft + eventRect.width / 2 - 30; // 30 = half car width

	// Add smooth transition to car movement
	carEl.style.transition = 'left 0.3s ease-out';
	carEl.style.left = carLeft + 'px';

	// Only scroll if not currently scrolling
	if (!timelineEl.classList.contains('scrolling')) {
		timelineEl.scrollTo({
			left:
				eventEls[idx].offsetLeft - timelineRect.width / 2 + eventRect.width / 2,
			behavior: 'smooth',
		});
	}
}

let autoScrollInterval = null;
let autoScrollPaused = false;
let autoScrollResumeTimeout = null;

function updateCarPosition() {
	// Bind car to the road and timeline scroll position
	const scrollLeft = timelineEl.scrollLeft;
	const maxScroll = timelineEl.scrollWidth - timelineEl.clientWidth;
	const road = document.querySelector('.road');
	if (!road) return;
	const roadRect = road.getBoundingClientRect();
	const timelineRect = timelineEl.getBoundingClientRect();
	// Car moves from left to right along the road as you scroll
	const percent = maxScroll === 0 ? 0 : scrollLeft / maxScroll;
	const minLeft = timelineRect.left - roadRect.left;
	const maxLeft = roadRect.width - carEl.offsetWidth;
	const carLeft = minLeft + percent * maxLeft;
	carEl.style.left = `${carLeft}px`;
}

function startAutoScroll() {
	if (autoScrollInterval) clearInterval(autoScrollInterval);
	autoScrollInterval = setInterval(() => {
		if (autoScrollPaused) return;
		const maxScroll = timelineEl.scrollWidth - timelineEl.clientWidth;
		if (maxScroll <= 0) return;
		let nextScroll = timelineEl.scrollLeft + 40; // px per tick
		if (nextScroll > maxScroll) nextScroll = 0; // loop
		timelineEl.scrollTo({ left: nextScroll, behavior: 'smooth' });
	}, 2000); // every 2 seconds
}

function pauseAutoScroll() {
	autoScrollPaused = true;
	if (autoScrollResumeTimeout) clearTimeout(autoScrollResumeTimeout);
	autoScrollResumeTimeout = setTimeout(() => {
		autoScrollPaused = false;
	}, 5000); // resume after 5s inactivity
}

function addEventListeners(events) {
	timelineEl.querySelectorAll('.event').forEach((el, i) => {
		el.addEventListener('click', () => showEventModal(events[i]));
	});

	// Update car position on scroll
	timelineEl.addEventListener('scroll', () => {
		updateCarPosition();
		pauseAutoScroll();
	});

	// Initial car position
	updateCarPosition();
}

// On window resize, update car position
window.addEventListener('resize', updateCarPosition);

document.addEventListener('DOMContentLoaded', () => {
	startAutoScroll();
});

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

function applyFilters() {
	const searchInput = document
		.getElementById('search-input')
		.value.trim()
		.toLowerCase();
	const yearFilter = document.getElementById('year-filter').value;
	const categoryFilter = document.getElementById('category-filter').value;

	filteredEvents = allEvents.filter(e => {
		const matchesTitle =
			!searchInput || e.title.toLowerCase().includes(searchInput);
		const matchesYear =
			!yearFilter ||
			new Date(e.startDate).getFullYear().toString() === yearFilter;
		const matchesCategory = !categoryFilter || e.category === categoryFilter;
		return matchesTitle && matchesYear && matchesCategory;
	});

	if (filteredEvents.length === 0) {
		timelineEl.innerHTML =
			'<div style="text-align:center; color:#7b8ca7; font-size:1.2rem; margin:2rem auto;">No events found.</div>';
		updateCarPosition();
		return;
	}
	renderTimeline(filteredEvents, searchInput);
}

function populateFilters(events) {
	const yearSelect = document.getElementById('year-filter');
	const years = getUniqueYears(events);
	yearSelect.innerHTML =
		'<option value="">All Years</option>' +
		years.map(y => `<option value="${y}">${y}</option>`).join('');

	const catSelect = document.getElementById('category-filter');
	const cats = getUniqueCategories(events);
	catSelect.innerHTML =
		'<option value="">All Categories</option>' +
		cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function setupSearchAndFilters(events) {
	populateFilters(events);
	document
		.getElementById('search-input')
		.addEventListener('input', applyFilters);
	document
		.getElementById('year-filter')
		.addEventListener('change', applyFilters);
	document
		.getElementById('category-filter')
		.addEventListener('change', applyFilters);
	document.getElementById('clear-search').addEventListener('click', () => {
		document.getElementById('search-input').value = '';
		document.getElementById('year-filter').value = '';
		document.getElementById('category-filter').value = '';
		applyFilters();
	});
}

// Add highlight style
const style = document.createElement('style');
style.innerHTML = `.highlight { background: #ffb347; color: #2d3a4b; border-radius: 3px; padding: 0 2px; }`;
document.head.appendChild(style);

// On load
fetchEvents().then(events => {
	events.forEach(e => (e.time = new Date(e.startDate).getTime()));
	events.sort((a, b) => b.time - a.time);
	allEvents = events;
	filteredEvents = events;
	renderTimeline(events);
	setupSearchAndFilters(events);
});
