import { pythonURI, fetchOptions, baseurl } from './api/config.js';

const EVENTS_URL = `${pythonURI}/api/rotary/events`;
const FAILURE_MESSAGE = 'Failed to fetch upcoming events.';
const UPCOMING_EMPTY_MESSAGE = 'No upcoming events.';
const ALL_EMPTY_MESSAGE = 'No events yet.';
const SIGN_IN_NOTE = 'Sign in as an administrator to add or remove events.';
const NON_ADMIN_NOTE = 'Only an administrator can add or remove events.';
const VERIFY_FAILED_NOTE = 'Could not verify your account. Please try again.';

// Fixed locale so the displayed date does not follow the browser's locale.
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const adminState = {
    isAdmin: false,
    events: [],
    refreshId: 0,
};

let appliedUser = null;

function todayISO() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
}

function formatDate(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
    if (!match) {
        return iso ?? '';
    }

    const [, year, month, day] = match;
    return DATE_FORMATTER.format(new Date(Number(year), Number(month) - 1, Number(day)));
}

function appendCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value ?? '';
    row.appendChild(cell);
    return cell;
}

function renderMessage(tbody, columns, message) {
    if (!tbody) {
        return;
    }

    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = columns;
    cell.textContent = message;
    row.appendChild(cell);
    tbody.replaceChildren(row);
}

function renderUpcomingEmpty(tbody, isAdmin) {
    renderMessage(tbody, 3, UPCOMING_EMPTY_MESSAGE);

    if (!isAdmin) {
        return;
    }

    const cell = tbody.querySelector('td');
    if (!cell) {
        return;
    }

    const link = document.createElement('a');
    link.href = `${baseurl}/events`;
    link.textContent = 'Manage events';
    cell.append(' ', link);
}

function sortByDate(events) {
    return [...events].sort((left, right) => (
        String(left.date ?? '').localeCompare(String(right.date ?? ''))
    ));
}

async function requestEvents() {
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

    return events;
}

async function readJson(response) {
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Homepage: upcoming events only
// ---------------------------------------------------------------------------

async function loadUpcomingEvents() {
    const tbody = document.getElementById('upcoming-events-body');
    if (!tbody) {
        return;
    }

    // The homepage table stays read-only, but an Admin gets a link to the page
    // where events can be managed.
    const { user } = await resolveCurrentUser();
    const isAdmin = user?.is_admin === true;
    const manageLink = document.getElementById('upcoming-events-admin-link');
    if (manageLink) {
        manageLink.hidden = !isAdmin;
    }

    try {
        const events = await requestEvents();
        const today = todayISO();
        const upcoming = sortByDate(events).filter((event) => (
            String(event.date ?? '') >= today
        ));

        if (upcoming.length === 0) {
            renderUpcomingEmpty(tbody, isAdmin);
            return;
        }

        tbody.replaceChildren();
        upcoming.forEach((event) => {
            const row = document.createElement('tr');
            appendCell(row, formatDate(event.date));
            appendCell(row, event.program);
            appendCell(row, event.speaker);
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to fetch upcoming events:', error);
        renderMessage(tbody, 3, FAILURE_MESSAGE);
    }
}

// ---------------------------------------------------------------------------
// Management page: all events, add form, delete buttons
// ---------------------------------------------------------------------------

function getAdminElements() {
    return {
        tbody: document.getElementById('all-events-body'),
        addSection: document.getElementById('add-event-section'),
        note: document.getElementById('events-access-note'),
        actionsHeader: document.getElementById('event-actions-header'),
        form: document.getElementById('add-event-form'),
        button: document.getElementById('add-event-button'),
        formMessage: document.getElementById('event-form-message'),
        formErrors: document.getElementById('event-form-errors'),
        status: document.getElementById('events-status'),
    };
}

function setAdminVisibility(isAdmin) {
    adminState.isAdmin = isAdmin;
    const { addSection, actionsHeader } = getAdminElements();

    if (addSection) {
        addSection.hidden = !isAdmin;
    }
    if (actionsHeader) {
        actionsHeader.hidden = !isAdmin;
    }

    // Keep the Actions header and each row's cell count in sync: renderAdminEvents
    // reads adminState.isAdmin to choose between 3 and 4 cells.
    renderAdminEvents(adminState.events);
}

function showAccessNote(message, showLogin = false) {
    const { note } = getAdminElements();
    if (!note) {
        return;
    }

    const messageElement = document.getElementById('events-access-message');
    const loginLink = document.getElementById('events-access-login');

    if (messageElement) {
        messageElement.textContent = message;
    } else {
        note.textContent = message;
    }
    if (loginLink) {
        loginLink.hidden = !showLogin;
    }

    note.hidden = false;
}

function hideAccessNote() {
    const { note } = getAdminElements();
    if (note) {
        note.hidden = true;
    }
}

function showAdminStatus(message) {
    const { status } = getAdminElements();
    if (status) {
        status.textContent = message;
    }
}

// login.js sets window.user on pages that load it. PowPAC pages do not load
// login.js, so read the existing session here instead of building a second
// login flow. On pages where login.js already ran, its value is reused.
//
// The result keeps the HTTP status so callers can tell 401 (no session) from
// 403 (signed in but not allowed, e.g. an account pending verification).
async function resolveCurrentUser() {
    if (window.user) {
        return { status: 200, user: window.user, message: '' };
    }

    try {
        const response = await fetch(`${pythonURI}/api/id`, {
            ...fetchOptions,
            method: 'GET',
        });
        const payload = await readJson(response);

        if (response.ok && payload && typeof payload === 'object') {
            window.user = payload;
            return { status: response.status, user: payload, message: '' };
        }

        return {
            status: response.status,
            user: null,
            message: payload?.message || '',
        };
    } catch (error) {
        return { status: 0, user: null, message: '' };
    }
}

function clearFormFeedback() {
    const { formMessage, formErrors } = getAdminElements();

    if (formMessage) {
        formMessage.textContent = '';
    }
    if (formErrors) {
        formErrors.replaceChildren();
        formErrors.hidden = true;
    }
}

function showFormErrors(messages) {
    const { formErrors, formMessage } = getAdminElements();
    const items = messages.map(String).filter((message) => message.trim() !== '');

    if (formMessage) {
        formMessage.textContent = '';
    }
    if (!formErrors) {
        return;
    }

    formErrors.replaceChildren();
    items.forEach((message) => {
        const item = document.createElement('li');
        item.textContent = message;
        formErrors.appendChild(item);
    });
    formErrors.hidden = items.length === 0;
}

function showFormMessage(message) {
    const { formMessage, formErrors } = getAdminElements();

    if (formErrors) {
        formErrors.replaceChildren();
        formErrors.hidden = true;
    }
    if (formMessage) {
        formMessage.textContent = message;
    }
}

function setFormBusy(busy) {
    const { form, button } = getAdminElements();

    if (button) {
        button.disabled = busy;
        button.textContent = busy ? 'Adding…' : 'Add event';
    }
    if (form) {
        form.querySelectorAll('input, button').forEach((control) => {
            control.disabled = busy;
        });
    }
}

function validateEvent({ date, program, speaker }) {
    const errors = [];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.push('date is required and must be YYYY-MM-DD');
    }
    if (!program) {
        errors.push('program is required');
    } else if (program.length > 255) {
        errors.push('program must be 255 characters or fewer');
    }
    if (!speaker) {
        errors.push('speaker is required');
    } else if (speaker.length > 255) {
        errors.push('speaker must be 255 characters or fewer');
    }

    return errors;
}

function handleAccessError(status, payload) {
    const message = status === 401
        ? SIGN_IN_NOTE
        : payload?.message || NON_ADMIN_NOTE;

    setAdminVisibility(false);
    showAccessNote(message, status === 401);
    showFormMessage(message);
}

function renderAdminEvents(events) {
    const { tbody } = getAdminElements();
    if (!tbody) {
        return;
    }

    adminState.events = sortByDate(events);

    if (adminState.events.length === 0) {
        renderMessage(tbody, adminState.isAdmin ? 4 : 3, ALL_EMPTY_MESSAGE);
        return;
    }

    tbody.replaceChildren();
    adminState.events.forEach((event) => {
        const row = document.createElement('tr');
        appendCell(row, formatDate(event.date));
        appendCell(row, event.program);
        appendCell(row, event.speaker);

        if (adminState.isAdmin) {
            const actionCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'ocs__btn alert-red small';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => deleteEvent(event, deleteButton));
            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);
        }

        tbody.appendChild(row);
    });
}

async function refreshAdminEvents() {
    const { tbody } = getAdminElements();
    if (!tbody) {
        return;
    }

    const refreshId = ++adminState.refreshId;

    try {
        const events = await requestEvents();
        if (refreshId !== adminState.refreshId) {
            return;
        }
        renderAdminEvents(events);
    } catch (error) {
        if (refreshId !== adminState.refreshId) {
            return;
        }
        console.error('Failed to fetch events:', error);
        renderMessage(tbody, adminState.isAdmin ? 4 : 3, FAILURE_MESSAGE);
    }
}

async function deleteEvent(event, button) {
    if (!window.confirm(`Delete the event on ${formatDate(event.date)}?`)) {
        return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Deleting…';
    showAdminStatus('');

    try {
        const response = await fetch(`${EVENTS_URL}/${encodeURIComponent(event.id)}`, {
            ...fetchOptions,
            method: 'DELETE',
        });

        if (response.status === 401 || response.status === 403) {
            const payload = await readJson(response);
            handleAccessError(response.status, payload);
            return;
        }

        // A missing event means it is already gone; refetch so the row disappears.
        if (response.status === 404) {
            await refreshAdminEvents();
            return;
        }

        if (!response.ok) {
            const payload = await readJson(response);
            throw new Error(payload?.message || `Request failed with status ${response.status}`);
        }

        await refreshAdminEvents();
    } catch (error) {
        console.error('Failed to delete event:', error);
        showAdminStatus(error.message || 'Could not delete the event.');
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function submitEvent(event) {
    event.preventDefault();

    if (!adminState.isAdmin) {
        showAccessNote(NON_ADMIN_NOTE);
        return;
    }

    const { form } = getAdminElements();
    if (!form) {
        return;
    }

    clearFormFeedback();
    showAdminStatus('');

    const date = String(form.elements.namedItem('date')?.value ?? '').trim();
    const program = String(form.elements.namedItem('program')?.value ?? '').trim();
    const speaker = String(form.elements.namedItem('speaker')?.value ?? '').trim();

    const errors = validateEvent({ date, program, speaker });
    if (errors.length > 0) {
        showFormErrors(errors);
        return;
    }

    setFormBusy(true);

    try {
        const response = await fetch(EVENTS_URL, {
            ...fetchOptions,
            method: 'POST',
            body: JSON.stringify({ date, program, speaker }),
        });
        const payload = await readJson(response);

        if (response.status === 201) {
            form.reset();
            showFormMessage('Event added.');
            await refreshAdminEvents();
            return;
        }

        if (response.status === 400) {
            const messages = Array.isArray(payload?.errors)
                ? payload.errors.map(String)
                : [];
            showFormErrors(messages.length > 0
                ? messages
                : [payload?.message || 'Invalid event']);
            return;
        }

        if (response.status === 401 || response.status === 403) {
            handleAccessError(response.status, payload);
            return;
        }

        showFormMessage(payload?.message || 'Could not save the event.');
    } catch (error) {
        console.error('Failed to add event:', error);
        showFormMessage('Could not save the event. Check your connection and try again.');
    } finally {
        setFormBusy(false);
    }
}

function applyUser({ status, user, message }) {
    appliedUser = user ?? null;

    if (user?.is_admin === true) {
        setAdminVisibility(true);
        hideAccessNote();
        return;
    }

    // 401 means there is no session, so offer the login page. 403 means the
    // viewer is signed in but not allowed (role, or account pending
    // verification), so show the backend's reason without a login link.
    const note = status === 401
        ? SIGN_IN_NOTE
        : message || (status === 403 || user ? NON_ADMIN_NOTE : VERIFY_FAILED_NOTE);

    setAdminVisibility(false);
    showAccessNote(note, status === 401);
}

// login.js sets window.user asynchronously on pages that load it. If this page
// read the session before that finished, re-check briefly so an early empty
// read cannot hide the controls permanently.
function watchForLateUser() {
    let attempts = 0;
    const timer = window.setInterval(() => {
        attempts += 1;

        if (window.user && window.user !== appliedUser) {
            window.clearInterval(timer);
            applyUser({ status: 200, user: window.user, message: '' });
            refreshAdminEvents();
            return;
        }

        if (window.user || attempts >= 20) {
            window.clearInterval(timer);
        }
    }, 100);
}

async function initAdminPage() {
    const { tbody, form } = getAdminElements();
    if (!tbody) {
        return;
    }

    if (form) {
        form.addEventListener('submit', submitEvent);
    }

    // Wait for the current user before deciding whether the controls belong on
    // the page, so an early empty read cannot hide them permanently.
    const currentUser = await resolveCurrentUser();
    applyUser(currentUser);

    await refreshAdminEvents();
    watchForLateUser();
}

function init() {
    if (document.getElementById('upcoming-events-body')) {
        loadUpcomingEvents();
    }

    if (document.getElementById('all-events-body')) {
        initAdminPage();
    }
}

init();
