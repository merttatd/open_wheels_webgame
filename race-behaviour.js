/* Race decisions live here; game.js owns movement, collision and safe merge checks. */
(() => {
  'use strict';
  const occupies = (car, row) => car.shift ? car.shift.from === row || car.shift.to === row : car.lane === row;
  function leaderIn(car, row, vehicles) {
    return vehicles.filter(other => other !== car && other.finishTime == null && other.distance > car.distance && occupies(other, row))
      .sort((a, b) => a.distance - b.distance)[0] || null;
  }
  function assessTraffic(car, vehicles, canMerge) {
    const leader = leaderIn(car, car.lane, vehicles);
    const gap = leader ? leader.distance - car.distance : Infinity;
    const options = [car.lane - 1, car.lane + 1].filter(row => row >= 0 && row <= 2 && canMerge(row))
      .map(row => {
        const front = leaderIn(car, row, vehicles);
        const room = front ? front.distance - car.distance : 1000;
        const pace = front ? Math.min(car.driver.topSpeed + 25, front.velocity + Math.max(0, room - 40)) : car.driver.topSpeed + 25;
        return { row, room, pace };
      }).sort((a, b) => b.pace - a.pace || b.room - a.room);
    const constrained = !!leader && gap < 130 && leader.velocity < car.driver.topSpeed + 12;
    const passing = options.find(option => option.room > gap + 12 && option.pace >= leader?.velocity - 2);
    return { leader, gap, constrained, passing, options, boxed: constrained && !passing && !car.shift };
  }
  function createDriver(team, random = Math.random) {
    return {
      topSpeed: RacePhysics.teamSpeed(team.slug),
      cruiseSpeed: RacePhysics.teamSpeed(team.slug) - 6,
      acceleration: RaceCareer.acceleration(team.slug),
      reaction: .14 + random() * .56,
      confidence: .65 + random() * .35,
      riskAppetite: .08 + random() * .14,
      brakeReaction: .18 + random() * .25
    };
  }
  function speedPlan(car, leader, elapsed, safeGap, corners = [], vehicles = [], canMerge = () => false) {
    safeGap += RaceLearning.followingExtra(leader);
    const driver = car.driver;
    if (elapsed < driver.reaction) return { target: 0, acceleration: 0, boost: false, mode: 'START', ers: false, braking: false, drafting: false };
    const road = RacePhysics.trackAt(car.distance, corners);
    const draftBonus = road.current ? 0 : RacePhysics.draft(car, leader); const drafting = draftBonus > .05;
    const gap = leader ? leader.distance - car.distance : Infinity;
    const attacker = vehicles.some(other => other !== car && other.distance < car.distance && car.distance - other.distance < 65 && occupies(other, car.lane));
    const exit = road.previous && car.distance - road.previous.end < 150;
    const traffic = assessTraffic(car, vehicles, canMerge);
    const saving = !!leader && elapsed > 3 && ((traffic.boxed && gap < safeGap + 50 && car.velocity >= leader.velocity - 5) || (car.learningAction === 'save' && car.learningUntil > elapsed && RaceLearning.enabled && gap < 150));
    const attack = !!(leader && gap > 40 && gap < 150 && (traffic.passing || car.shift));
    const braking = car.velocity > road.brakingLimit - 3;
    const ers = !saving && !braking && !road.current && car.incident === 0 && !car.ersLocked && car.energy > 0 && (car.ersActive || car.energy > 25) && (attack || exit || attacker);
    const boost = driver.reaction <= .35 && elapsed < driver.reaction + 2.2 && car.incident === 0;
    let target = driver.topSpeed + (ers ? RacePhysics.ERS_GAIN : 0) + draftBonus;
    target = Math.min(target, road.brakingLimit * (.98 + driver.confidence * .02));
    let mode = road.current ? 'VİRAJ' : braking ? 'FREN' : ers ? 'ERS' : drafting ? `HAVA +${draftBonus.toFixed(1)}` : boost ? 'BOOST' : 'HIZLAN';
    if (leader) {
      target = Math.min(target, Math.max(0, leader.velocity + (gap - safeGap) * (1.5 + driver.confidence)));
      if (gap < safeGap + 20) mode = 'TAKİP';
    }
    if (saving && !road.current && !braking) {
      // Lift to open a useful passing gap instead of spending energy into a queue.
      const desiredGap = safeGap + 16;
      target = Math.min(target, Math.max(0, car.velocity - 2), Math.max(0, leader.velocity + (gap - desiredGap) * .8));
      mode = 'ERS DOLDUR';
    }
    if (car.shift && !road.current && car.incident === 0) mode = 'SOLLAMA';
    if (car.incident > 0) { target = Math.min(target, driver.cruiseSpeed * .35); mode = 'KAYMA!'; }
    return { target, acceleration: driver.acceleration + (boost ? 65 : 0) + (ers ? 35 : 0), boost, mode, ers, braking: braking || (target < car.velocity - 10 && !saving), throttle: !saving, coasting: saving && !braking, drafting };
  }  function chooseLane(car, vehicles, canMerge, random = Math.random, corners = []) {
    if (car.shift || car.incident > 0) return null;
    const learned=RaceLearning.choose(car,vehicles,canMerge,corners,random);if(learned!==undefined)return learned.lane;
    const traffic = assessTraffic(car, vehicles, canMerge);
    if (traffic.constrained && traffic.passing) return traffic.passing.row;
    // After an overtake, settle into an open lane; never weave into a closed gap.
    const best = traffic.options[0];
    if (!traffic.constrained && best && best.room > 160 && random() < .025) return best.row;
    return null;
  }  window.RaceBehaviour = Object.freeze({ createDriver, speedPlan, chooseLane, leaderIn, assessTraffic });
})();