/* Pair-based contact response. Positions are never teleported to resolve a hit. */
(() => {
  'use strict';
  function create() {
    const contacts = new Map();
    function reset() { contacts.clear(); }
    function step(cars, dt, time, onHit, roadOffset = () => 0) {
      const touched = new Set();
      for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i], b = cars[j];
        if (a.finishTime !== null || b.finishTime !== null) continue;
        const dy = Math.abs((a.visualLane - b.visualLane) * 68 + roadOffset(a.distance) - roadOffset(b.distance));
        const gap = Math.abs(a.distance - b.distance);
        if (dy >= 29 || gap >= 18) continue;
        const key = [a.id, b.id].sort().join(':'); touched.add(key);
        const front = a.distance >= b.distance ? a : b;
        const rear = front === a ? b : a;
        if (!contacts.has(key)) {
          const closing = Math.abs(rear.velocity - front.velocity);
          const rearSpeed = rear.velocity, frontSpeed = front.velocity;
          rear.velocity = Math.min(rearSpeed, Math.max(8, Math.min(rearSpeed * .58, frontSpeed * .8)));
          front.velocity = Math.min(frontSpeed, Math.max(12, frontSpeed * .82 - closing * .08));
          onHit(rear, front, closing);
          contacts.set(key, time);
        } else contacts.set(key, time);
        // Contact pressure slows the following car until the bodies separate.
        // Other pairs remain independent, so the next car can hit the queue.
        rear.velocity = Math.min(rear.velocity, Math.max(0, front.velocity * .85));
      }
      for (const [key, lastTouch] of contacts) if (!touched.has(key) && time - lastTouch > .35) contacts.delete(key);
    }
    return { step, reset };
  }
  window.RaceCollisions = Object.freeze({ create });
})();