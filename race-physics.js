(() => {
  'use strict';
  const BASE_SPEED = 310, ERS_GAIN = 25, DRAFT_GAIN = 18;
  function buildTrack(length, random = Math.random) {
    const corners = [];
    let start = 350 + random() * 450;
    while (start < length - 500) {
      const severity = random();
      const end = Math.min(length - 260, start + 120 + random() * 180);
      corners.push({ start, end, speed: Math.round(220 - severity * 85), direction: random() < .5 ? -1 : 1, bend: 18 + severity * 13 });
      start = end + 300 + random() * 550;
    }
    return corners;
  }  function trackAt(distance, corners) {
    const current = corners.find(c => distance >= c.start && distance < c.end) || null;
    const next = corners.find(c => c.start > distance) || null;
    const previous = [...corners].reverse().find(c => c.end <= distance) || null;
    const brakingLimit = current ? current.speed : next ? Math.sqrt((next.speed / 3.6) ** 2 + 2 * 23 * Math.max(0, next.start - distance)) * 3.6 : Infinity;
    return { current, next, previous, brakingLimit };
  }
  // Fictional Apex Series balance order. No real-world constructor data is used.
  const TEAM_ORDER = Object.freeze(['veltrix', 'apexnova', 'oriongp', 'blackridge', 'vanguard', 'solstice', 'crimsonarrow', 'titan', 'eclipse', 'northstar', 'monarchgp']);
  function teamSpeed(slug) {
    const configured = window.RaceRoster?.catalog.find(team => team.slug === slug); if (configured) return configured.speed;
    const rank = TEAM_ORDER.indexOf(slug);
    return rank < 0 ? BASE_SPEED : 320 - rank * 2;
  }
  function draft(car, leader) {
    if (!leader) return 0;
    const gap = leader.distance - car.distance;
    if (gap <= 24 || gap >= 120) return 0;
    const clamp = value => Math.max(0, Math.min(1, value));
    // Full wake at 40m, fading toward 120m; unsafe close following loses benefit.
    const distanceFactor = gap < 40 ? (gap - 24) / 16 : (120 - gap) / 80;
    const speedFactor = clamp((Math.min(car.velocity, leader.velocity) - 100) / 200);
    const alignment = clamp(1 - Math.abs((car.visualLane ?? car.lane) - (leader.visualLane ?? leader.lane)) / .6);
    return DRAFT_GAIN * distanceFactor * speedFactor * alignment;
  }
  function energy(energy, requested, braking, throttle, dt, locked = false) {
    if (energy >= 20) locked = false;
    const active = requested && !braking && !locked && energy > 0;
    energy = Math.max(0, Math.min(100, energy + (active ? -22 : braking ? 10 : throttle ? .7 : 2.5) * dt));
    if (energy === 0) locked = true;
    return { energy, active: active && energy > 0, locked };
  }
  function gripLevel(previous, velocity, safeSpeed, dt) {
    const demand = Math.max(0, Math.min(1, (velocity - safeSpeed - 8) / 100));
    const next = previous + (demand - previous) * (1 - Math.exp(-dt * (demand > previous ? 3 : 2.5)));
    return next < .005 ? 0 : next;
  }
  window.RacePhysics = Object.freeze({ BASE_SPEED, ERS_GAIN, DRAFT_GAIN, TEAM_ORDER, teamSpeed, buildTrack, trackAt, draft, energy, gripLevel });
})();