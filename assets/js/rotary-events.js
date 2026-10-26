import { pythonURI, fetchOptions } from './api/config.js';

const EVENTS_URL = `${pythonURI}/api/rotary/events`;
const FAILURE_MESSAGE = 'Failed to fetch upcomming events.';

function renderEvents(events) {
    const tbody = document.getElementById('upcoming-events-body');
    if (!tbody) {
        return;
    }

    tbody.replaceChildren();

    events.forEach((event) => {
        const row = document.createElement('tr');

        [event.date, event.program, event.speaker].forEach((value) => {
            const cell = document.createElement('td');
            cell.textContent = value ?? '';
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}

function renderFailure() {
    const tbody = document.getElementById('upcoming-events-body');
    if (!tbody) {
        return;
    }

    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = FAILURE_MESSAGE;
    row.appendChild(cell);

    tbody.replaceChildren(row);
}

async function loadUpcomingEvents() {
    try {
        const response = await fetch(EVENTS_URL, {
            ...fetchOptions,
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const events = await response.json();
        if (!Array.isArray(events)) {
            throw new Error('Unexpected events response');
        }

        renderEvents(events);
    } catch (error) {
        console.error('Failed to fetch upcoming events:', error);
        renderFailure();
    }
}

loadUpcomingEvents();
