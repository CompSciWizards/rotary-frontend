---
layout: powpac
title: Events
permalink: /events
---

<!-- markdownlint-disable MD033 MD046 -->

<div class="ocs__container">
  <span class="ocs__badge">Administration</span>
  <h1>Upcoming Events</h1>
  <p class="ocs__description">
    Add or remove the events that appear in the “Upcoming Events” table on the homepage.
  </p>

  <p id="events-access-note" class="ocs__callout" role="status" aria-live="polite" hidden>
    <span id="events-access-message">Sign in as an administrator to add or remove events.</span>
    <a id="events-access-login" href="{{ '/login' | relative_url }}">Sign in</a>
  </p>

  <section id="add-event-section" class="ocs__card" aria-labelledby="add-event-heading" hidden>
    <h2 class="ocs__section-title" id="add-event-heading">Add an event</h2>
    <form id="add-event-form" novalidate>
      <div class="ocs__stack">
        <div class="ocs__field">
          <label class="ocs__label" for="event-date">Date</label>
          <input class="ocs__input" type="date" id="event-date" name="date" required>
        </div>

        <div class="ocs__field">
          <label class="ocs__label" for="event-program">Program</label>
          <input
            class="ocs__input"
            type="text"
            id="event-program"
            name="program"
            maxlength="255"
            required
          >
        </div>

        <div class="ocs__field">
          <label class="ocs__label" for="event-speaker">Speaker</label>
          <input
            class="ocs__input"
            type="text"
            id="event-speaker"
            name="speaker"
            maxlength="255"
            required
          >
        </div>

        <p id="event-form-message" class="ocs__text" role="status" aria-live="polite"></p>
        <ul id="event-form-errors" class="ocs__callout" role="alert" hidden></ul>

        <div class="ocs__links">
          <button class="ocs__btn accent fill" type="submit" id="add-event-button">Add event</button>
        </div>
      </div>
    </form>
  </section>

  <section class="ocs__card" aria-labelledby="all-events-heading">
    <h2 class="ocs__section-title" id="all-events-heading">All events</h2>

    <div class="ocs__table-wrap">
      <table class="ocs__table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Program</th>
            <th scope="col">Speaker</th>
            <th scope="col" id="event-actions-header" hidden>Actions</th>
          </tr>
        </thead>
        <tbody id="all-events-body">
          <tr><td colspan="3">Loading events…</td></tr>
        </tbody>
      </table>
    </div>

    <p id="events-status" class="ocs__text" role="status" aria-live="polite"></p>
  </section>
</div>

<script type="module"
        src="{{ '/assets/js/rotary-events.js' | relative_url }}?v={{ site.time | date: '%s' }}"></script>

<!-- markdownlint-enable MD033 MD046 -->
