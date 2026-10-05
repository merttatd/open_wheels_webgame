(() => {
  'use strict';
  const circuit = document.querySelector('.circuit');
  const start = document.getElementById('start');
  const scoreLabel = document.getElementById('score');
  const bestLabel = document.getElementById('best');
  const speedLabel = document.getElementById('speed');
  const status = document.getElementById('status');
  const up = document.getElementById('up');
  const down = document.getElementById('down');
  const brake = document.getElementById('brake');
  const accelerate = document.getElementById('accelerate');
  const heldKeys = new Set();
  document.querySelectorAll('.team-choice').forEach((button, index) => {
    const speed = document.createElement('small');
    speed.textContent = `${RacePhysics.teamSpeed(teams[index].slug)} km/sa`;
    button.append(speed);
  });
  const entrants = RaceDrivers.build(teams);
  let selectedSeat = 0, playerSlipOffset = 0;
  const pilotSelect = document.getElementById('pilot-select');
  const playerEntry = () => entrants.find(entry => entry.team === teams[selected] && entry.seat === selectedSeat);
  function updatePilotSelection() {
    pilotSelect.replaceChildren();
    entrants.filter(entry => entry.team === teams[selected]).forEach(entry => {
      const option = document.createElement('option'); option.value = entry.seat; option.textContent = entry.name;
      pilotSelect.append(option);
    });
    pilotSelect.value = String(selectedSeat);
    document.getElementById('selected-team').textContent = `${teams[selected].code} · ${playerEntry().code} · SEN`;
  }
  pilotSelect.addEventListener('change', () => {
    if (RaceLeague.active || ['running', 'paused', 'countdown', 'finishing'].includes(state)) return;
    selectedSeat = Number(pilotSelect.value); updatePilotSelection();
  });
  let selected = 0, state = 'idle', lane = 1, score = 0, best = 0;
  let player = null, traffic = [], elapsed = 0, spawnIn = 0, lastTime = 0, frame = 0;
  let width = circuit.clientWidth;
  let roadDistance = 0;
  let playerDistance = 0, playerScreenX = 0;
  const pixelsPerMeter = 4;
  const followingDistance = 82 / pixelsPerMeter + 8;
  const shiftDuration = .55;
  let playerMotion = { lane: 1, visualLane: 1, shift: null };
  let incidentTimer = 10;
  let impactCooldown = 0;
  const collisionSystem = RaceCollisions.create();
  function riskyToShift(car, target) {
    if (target < 0 || target > 2 || car.shift) return false;
    return [...traffic, playerVehicle()].every(other => other === car || !occupied(other).includes(target) || Math.abs(other.distance - car.distance) > 19);
  }
  function resolveContacts(dt) {
    const me = { id: playerEntry().id, distance: playerDistance, velocity, visualLane: playerMotion.visualLane + playerSlipOffset / 68, finishTime: playerFinishTime, node: player, isPlayer: true };
    const all = [me, ...traffic];
    collisionSystem.step(all, dt, elapsed, (rear, front) => {
      for (const hit of [rear, front]) {
        hit.node.classList.add('contact-hit');
        if (hit.isPlayer) {
          impactCooldown = 1.25; launchBoostUntil = 0;
          document.body.classList.add('crashed');
          status.textContent = rear.isPlayer ? 'Temas! Hız kaybettin' : 'Arkadan darbe! Zincirleme temas';
        } else {
          hit.damageTime = 1.5; hit.incident = Math.max(hit.incident, 1.5);
          hit.mode = 'TEMAS'; hit.ersActive = false; hit.boosting = false;
          hit.planWait = .25 + hit.driver.brakeReaction;
        }
      }
    }, roadOffset);
    velocity = me.velocity;
    speedLabel.textContent = Math.round(velocity); document.getElementById('speed-meter').value=velocity;
  }
  let gridOrder = [], playerGridSlot = 0, playerFinishTime = null, boardUpdatedAt = -1;
  const leaderboard = document.getElementById('leaderboard-list');
  const boardRows = new Map();
  function shuffledGrid() {
    const order = [...entrants];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }
  function standings() {
    const me = { racer: playerEntry(), team: teams[selected], distance: playerDistance, finishTime: playerFinishTime, gridSlot: playerGridSlot, energy, mode: cornerRecovery > 0 ? 'SAVRULMA' : ersActive ? 'ERS' : drafting ? 'HAVA' : 'SEN', isPlayer: true };
    return [...traffic, me].sort((a, b) => {
      if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime || a.gridSlot - b.gridSlot;
      if (a.finishTime !== null) return -1;
      if (b.finishTime !== null) return 1;
      return b.distance - a.distance || a.gridSlot - b.gridSlot;
    });
  }
  function buildLeaderboard() {
    leaderboard.replaceChildren(); boardRows.clear();
    for (const racer of entrants) {
      const team = racer.team;
      const row = document.createElement('li'); row.className = 'leader-row'; row.dataset.team = team.slug; row.dataset.driver = racer.id; row.title = racer.name;
      row.innerHTML = `<span class="leader-rank"></span><span class="leader-logo"><img src="assets/teams/${team.slug}.svg" alt="${team.name}" width="23" height="23"></span><span class="leader-team"><strong>${team.code}</strong><small class="leader-mode"></small></span><span class="leader-gap"></span><span class="leader-energy" title="ERS"><i></i></span>`;
      boardRows.set(racer.id, row);
    }
  }
  function updateLeaderboard(force = false) {
    if (!force && elapsed - boardUpdatedAt < .15) return;
    boardUpdatedAt = elapsed;
    const order = standings(); const first = order[0];
    leaderboard.replaceChildren();
    order.slice(0,10).forEach((entry, index) => {
      const row = boardRows.get(entry.racer.id); if (!row) return;
      row.classList.toggle('is-player', !!entry.isPlayer);
      row.querySelector('.leader-rank').textContent = index + 1;
      row.querySelector('.leader-mode').textContent = entry.finishTime !== null ? 'FİNİŞ' : state === 'countdown' || (state === 'paused' && resumeState === 'countdown') ? `GRID ${entry.gridSlot + 1}` : entry.isPlayer ? entry.mode : entry.mode || 'KALKIŞ';
      row.querySelector('strong').textContent = entry.racer.code + (entry.isPlayer ? ' · SEN' : '');
      row.querySelector('.leader-mode').textContent = entry.team.code + ' · ' + row.querySelector('.leader-mode').textContent;
      row.querySelector('.leader-gap').textContent = index === 0 ? 'LİDER' : entry.finishTime !== null && first.finishTime !== null ? `+${(entry.finishTime - first.finishTime).toFixed(2)} sn` : `+${Math.max(0, Math.round(first.distance - entry.distance))} m`;
      row.querySelector('.leader-energy i').style.width = `${Math.max(0, Math.min(100, entry.energy))}%`;
      row.querySelector('.leader-energy').title = `ERS: %${Math.round(entry.energy)}`;
      leaderboard.append(row);
    });
  }
  let corners = [], energy = 100, ersActive = false, ersLocked = false, drafting = false, cornerRecovery = 0;
  let playerSpeedCap = RacePhysics.teamSpeed(teams[selected].slug);
  const ersButton = document.getElementById('ers');
  const energyBar = document.getElementById('energy-bar');
  const energyText = document.getElementById('energy-text');
  const cornerInfo = document.getElementById('corner-info');
  const drivingInfo = document.getElementById('driving-info');
  const cornerZone = document.getElementById('corner-zone');
  const roadSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  roadSvg.classList.add('curved-road'); roadSvg.setAttribute('aria-hidden', 'true');
  roadSvg.innerHTML = '<path class="road-shoulder"/><path class="road-surface"/><path class="road-edge upper"/><path class="road-edge lower"/><path class="road-divider upper"/><path class="road-divider lower"/>';
  circuit.prepend(roadSvg);
  const roadPaths = [...roadSvg.querySelectorAll('path')];
  let track = RaceTrack.build(1000, []);
  const finishPath=document.createElementNS('http://www.w3.org/2000/svg','path');finishPath.setAttribute('class','track-finish');roadSvg.append(finishPath);
  function roadOffset() { return 0; }
  const kerbs=document.createElementNS('http://www.w3.org/2000/svg','g');roadSvg.append(kerbs);
  const markerPaths=Array.from({length:100},()=>{const p=document.createElementNS(roadSvg.namespaceURI,'path');p.setAttribute('class','kerb');kerbs.append(p);return p;});
  const distanceMarks=Array.from({length:24},()=>{const p=document.createElementNS(roadSvg.namespaceURI,'path');p.setAttribute('class','distance-mark');kerbs.append(p);return p;});
  const minimap=document.getElementById('track-map'),mapRoute=minimap.querySelector('.map-route'),mapVisible=minimap.querySelector('.map-visible'),mapPlayer=minimap.querySelector('.map-player');
  let mapPoint=()=>({x:12,y:40});
  function buildMap(){
    const points=[];for(let d=0;d<raceDistance;d+=20)points.push(track.at(d));points.push(track.at(raceDistance));
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),spanX=Math.max(...xs)-minX,spanY=Math.max(...ys)-minY,scale=Math.min(156/Math.max(1,spanX),64/Math.max(1,spanY));
    mapPoint=d=>{const p=track.at(Math.max(0,Math.min(raceDistance,d)));return{x:12+(156-spanX*scale)/2+(p.x-minX)*scale,y:8+(64-spanY*scale)/2+(p.y-minY)*scale};};
    const route=[];for(let d=0;d<raceDistance;d+=20){const p=mapPoint(d);route.push(`${route.length?'L':'M'}${p.x},${p.y}`);}const end=mapPoint(raceDistance);route.push(`L${end.x},${end.y}`);mapRoute.setAttribute('d',route.join(' '));
    const start=mapPoint(0);for(const [selector,p]of [['.map-start',start],['.map-finish',end]]){const node=minimap.querySelector(selector);node.setAttribute('cx',p.x);node.setAttribute('cy',p.y);}
  }
  function updateMap(){const p=mapPoint(playerDistance);mapPlayer.setAttribute('cx',p.x);mapPlayer.setAttribute('cy',p.y);const visible=[];for(let d=Math.max(0,playerDistance-40);d<=Math.min(raceDistance,playerDistance+width/pixelsPerMeter);d+=5){const p=mapPoint(d);visible.push(`${visible.length?'L':'M'}${p.x},${p.y}`);}mapVisible.setAttribute('d',visible.join(' '));}
  function drawTrackDetails(){
    // Segments are anchored to world metres; no independent dash animation.
    const first=Math.floor((playerDistance-90)/18)*18,last=playerDistance+width/pixelsPerMeter+100;let index=0;
    for(let d=first;d<last&&index<markerPaths.length;d+=18)for(const side of [-1,1]){const node=markerPaths[index++],points=[];for(let t=0;t<=9;t+=3){const p=project(d+t,side*107);points.push(`${t?'L':'M'}${p.x},${p.y}`);}node.setAttribute('d',points.join(' '));node.style.display='';}
    for(;index<markerPaths.length;index++)markerPaths[index].style.display='none';
    index=0;for(let d=Math.floor((playerDistance-90)/80)*80;d<last&&index<distanceMarks.length;d+=80)for(const side of [-1,1]){const a=project(d,side*121),b=project(d,side*133),node=distanceMarks[index++];node.setAttribute('d',`M${a.x},${a.y}L${b.x},${b.y}`);node.style.display='';}for(;index<distanceMarks.length;index++)distanceMarks[index].style.display='none';
  }
  function project(distance, offset=0) {
    const p=track.at(distance),origin=track.at(playerDistance),camera=track.at(playerDistance+8).angle;
    const dx=(p.x-origin.x)*pixelsPerMeter-Math.sin(p.angle)*offset,dy=(p.y-origin.y)*pixelsPerMeter+Math.cos(p.angle)*offset;
    return {x:playerX()+41+dx*Math.cos(camera)+dy*Math.sin(camera),y:circuit.clientHeight/2-dx*Math.sin(camera)+dy*Math.cos(camera),angle:p.angle-camera};
  }
  function drawRoad() {
    roadSvg.setAttribute('viewBox',`0 0 ${width} ${circuit.clientHeight}`);
    const offsets=[0,0,-107,107,-34,34];
    roadPaths.forEach((path,i)=>{const samples=[];for(let d=playerDistance-500;d<=playerDistance+width/pixelsPerMeter+500;d+=3){const p=project(d,offsets[i]);samples.push(`${samples.length?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);}path.setAttribute('d',samples.join(' '));});
    drawTrackDetails();updateMap();
    const a=project(raceDistance,-105),b=project(raceDistance,105);finishPath.setAttribute('d',`M${a.x},${a.y}L${b.x},${b.y}`);
  }
  function normalKey(key) {
    return ({ d: 'ArrowRight', a: 'ArrowLeft', w: 'ArrowUp', s: 'ArrowDown', e: 'KeyE' })[key.toLowerCase()] || key;
  }
  function updateDriving(dt) {
    const braking = heldKeys.has('ArrowLeft');
    const throttle = heldKeys.has('ArrowRight');
    const road = RacePhysics.trackAt(playerDistance, corners);
    const leader = RaceBehaviour.leaderIn(playerVehicle(), lane, traffic);
    const draftBonus = road.current ? 0 : RacePhysics.draft(playerVehicle(), leader); drafting = draftBonus > .05;
    const battery = RacePhysics.energy(energy, heldKeys.has('KeyE') && throttle && impactCooldown === 0 && cornerRecovery === 0 && !road.current, braking, throttle, dt, ersLocked);
    energy = battery.energy; ersActive = battery.active; ersLocked = battery.locked;
    playerSpeedCap = RacePhysics.teamSpeed(teams[selected].slug) + (ersActive ? RacePhysics.ERS_GAIN : 0) + draftBonus;
    if (dt > 0) {
      cornerRecovery = RacePhysics.gripLevel(cornerRecovery, velocity, road.current ? road.current.speed : Infinity, dt);
      const launch = launchBoostUntil > elapsed && impactCooldown === 0 && !braking;
      changeSpeed((braking ? -100 : throttle ? (RaceCareer.acceleration(teams[selected].slug) + (ersActive ? 35 : 0)) * (1 - .9 * cornerRecovery) : -4) * dt + (launch ? 65 * dt : 0));
      if (velocity > playerSpeedCap) velocity = Math.max(playerSpeedCap, velocity - 60 * dt);
      // Tyre scrub is a continuous loss, not a speed clamp or a backwards impulse.
      velocity = Math.max(0, velocity - cornerRecovery * 65 * dt);
      const outside = road.current ? -road.current.direction : Math.sign(playerSlipOffset);
      const targetSlip = road.current ? outside * 16 * cornerRecovery : 0;
      playerSlipOffset += (targetSlip - playerSlipOffset) * (1 - Math.exp(-dt * 4));
      if (cornerRecovery > .15) {
        launchBoostUntil = 0;
        status.textContent = 'Yol tutuş azaldı · gazı bırak veya frenle';
      }    }
    speedLabel.textContent = Math.round(velocity); document.getElementById('speed-meter').value=velocity;
    energyBar.value = energy; energyText.textContent = `${Math.round(energy)}%`;
    ersButton.classList.toggle('engaged', ersActive);
    ersButton.setAttribute('aria-pressed', String(ersActive));
    drivingInfo.textContent = cornerRecovery > 0 ? 'YOL TUTUŞ KAYBI · gazı azalt' : drafting ? `HAVA +${draftBonus.toFixed(1)} km/sa${ersActive ? ' · ERS +25' : ''}` : ersActive ? 'ERS AKTİF' : ersLocked ? 'ERS soğuyor · %20 bekle' : braking ? 'FREN · enerji geri kazanımı' : 'DÜZLÜK';
    const upcoming = road.current || road.next;
    const distance=upcoming?Math.max(0,Math.ceil(upcoming.start-playerDistance)):0;
    document.getElementById('turn-arrow').textContent=upcoming?(upcoming.direction>0?'↱':'↰'):'→';
    document.getElementById('turn-label').textContent=road.current?'VİRAJDASIN':upcoming?'SIRADAKİ VİRAJ':'SON DÜZLÜK';
    document.getElementById('turn-distance').innerHTML=upcoming?`${distance} <small>m</small>`:'—';
    document.getElementById('turn-meter').value=upcoming?Math.max(0,500-distance):0;
    const brakeAlert=!!upcoming&&velocity>road.brakingLimit-5;
    document.querySelector('.corner-instrument').classList.toggle('brake-alert',brakeAlert);
    cornerInfo.textContent=upcoming?`${upcoming.direction>0?'Sağ':'Sol'} · ${upcoming.speed} km/sa${brakeAlert?' · FREN':''}`:'Tam gaz';
    circuit.classList.toggle('in-corner', !!road.current);
    if (upcoming) {
      cornerZone.hidden = false;
      cornerZone.style.left = `${playerX() + (upcoming.start - playerDistance) * pixelsPerMeter}px`;
      cornerZone.style.width = `${(upcoming.end - upcoming.start) * pixelsPerMeter}px`;
    } else cornerZone.hidden = true;
  }
  let reactionTime = null, launchBoostUntil = 0, earlyThrottle = false;
  const launchInfo = document.getElementById('launch-info');
  function reactToStart() {
    if (state !== 'running' || reactionTime !== null) return;
    reactionTime = elapsed + Math.max(0, performance.now() - lastTime) / 1000;
    if (!earlyThrottle && reactionTime <= .35) {
      launchBoostUntil = elapsed + 2.2;
      launchInfo.textContent = `${Math.round(reactionTime * 1000)} ms · KALKIŞ BOOST!`;
    } else {
      launchInfo.textContent = earlyThrottle ? 'Erken gaz · kalkış bonusu yok' : `${Math.round(reactionTime * 1000)} ms · Normal kalkış`;
    }
  }

  let raceDistance = 0, countdownTime = 0, lightsOutAt = 0, resumeState = 'running';
  const lights = [...document.querySelectorAll('.start-light')];
  const raceInfo = document.getElementById('race-info');
  const result = document.getElementById('race-result');
  const noseOffset = 73 / pixelsPerMeter;
  function clockText(seconds) {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
  }
  function updateRaceInfo() {
    const remaining = Math.max(0, Math.ceil(raceDistance - playerDistance - noseOffset));
    const position = standings().findIndex(entry => entry.isPlayer) + 1;
    updateLeaderboard();
    raceInfo.textContent = `${Math.round(raceDistance)} m · Kalan ${remaining} m · ${position}/${entrants.length} · ${clockText(elapsed)}`;
  }
  function updateLights() {
    const count = Math.min(5, Math.floor(countdownTime));
    lights.forEach((light, i) => light.classList.toggle('lit', i < count));
    status.textContent = count ? `${count} / 5 kırmızı ışık` : 'Start için hazırlan';
  }
  let celebrated=false;
  function celebrateWinner(){if(celebrated)return;const winner=standings().find(e=>e.finishTime!==null);if(!winner)return;celebrated=true;const panel=document.getElementById('race-celebration');panel.hidden=false;panel.style.setProperty('--winner-color',winner.team.color);panel.querySelector('.winner-logo').src=`assets/teams/${winner.team.slug}.svg`;panel.querySelector('.winner-name').textContent=winner.racer.name;panel.querySelector('.winner-team').textContent=winner.team.name;panel.querySelector('.winner-race').textContent=RaceLeague.names[leagueRound];}
  function cooldown(dt){const me={...playerVehicle(),visualLane:playerMotion.visualLane};RaceCooldown.step([...traffic,me],dt);if(playerFinishTime!==null){playerDistance=me.distance;velocity=me.velocity;speedLabel.textContent=Math.round(velocity);document.getElementById('speed-meter').value=velocity;}}
  function completeRace(previousDistance,dt){
    if(playerFinishTime!==null)return;
    const fraction=Math.max(0,Math.min(1,(raceDistance-noseOffset-previousDistance)/Math.max(.0001,playerDistance-previousDistance)));
    playerFinishTime=elapsed-dt+dt*fraction;state='finishing';heldKeys.clear();ersActive=false;launchBoostUntil=0;ersButton.classList.remove('engaged');ersButton.setAttribute('aria-pressed','false');status.textContent='Finiş · soğuma turu';celebrateWinner();updateControls();
  }
  function finalizeRace(){
    const order=standings(),rank=order.findIndex(entry=>entry.isPlayer)+1,awarded=RaceLeague.POINTS[rank-1]||0;
    RaceLeague.record(leagueRound,order.map(entry=>({id:entry.racer.id,finished:entry.finishTime!==null,time:entry.finishTime})));RaceLeague.render();
    state='over';document.body.classList.remove('crashed');status.textContent='Yarış tamamlandı';updateLeaderboard(true);result.hidden=false;result.textContent=`${rank}. sıra · +${awarded} puan · ${clockText(playerFinishTime)}`;raceInfo.textContent=`${RaceLeague.names[leagueRound]} · ${rank}/${entrants.length}`;updateControls();
  }
  function occupied(car) { return car.shift ? [car.shift.from, car.shift.to] : [car.lane]; }
  function sharesLane(a, b) { return occupied(a).some(row => occupied(b).includes(row)); }
  function playerVehicle() { return { ...playerMotion, visualLane: playerMotion.visualLane + playerSlipOffset / 68, distance: playerDistance, velocity, finishTime: playerFinishTime }; }
  function safeToShift(car, target) {
    if (target < 0 || target > 2 || car.shift) return false;
    const neighbors = [...traffic, ...(car === playerMotion ? [] : [playerVehicle()])];
    const distance = car === playerMotion ? playerDistance : car.distance;
    const speed = car === playerMotion ? velocity : car.velocity;
    return neighbors.every(other => {
      if (other === car || !occupied(other).includes(target)) return true;
      const gap = other.distance - distance;
      const projected = gap + (other.velocity - speed) / 3.6 * (shiftDuration + .65);
      return Math.sign(gap) === Math.sign(projected) && Math.min(Math.abs(gap), Math.abs(projected)) >= followingDistance + 8;
    });
  }
  function startShift(car, target) {
    if (target < 0 || target > 2 || car.shift) return false;
    if (car !== playerMotion && !(car.riskUntil > elapsed ? riskyToShift(car, target) : safeToShift(car, target))) return false;
    car.shift = { from: car.lane, to: target, progress: 0 };
    return true;
  }
  function animateShift(car, dt) {
    if (!car.shift) { car.visualLane = car.lane; return; }
    const shift = car.shift;
    shift.progress = Math.min(1, shift.progress + dt / shiftDuration);
    const eased = shift.progress * shift.progress * (3 - 2 * shift.progress);
    car.visualLane = shift.from + (shift.to - shift.from) * eased;
    if (shift.progress === 1) { car.lane = shift.to; car.shift = null; }
  }
  function updateDrivers(dt) {
    animateShift(playerMotion, dt);
    lane = playerMotion.lane;
    for (const car of traffic) {
      if(car.finishTime!==null){animateShift(car,dt);car.ersActive=false;car.boosting=false;car.node.querySelector('.car-label').textContent=car.code;continue;}
      car.incident = Math.max(0, car.incident - dt);
      car.damageTime = Math.max(0, car.damageTime - dt); car.node.classList.toggle('contact-hit', car.damageTime > 0);
      car.node.style.filter = car.incident > 0 ? 'drop-shadow(0 0 3px #e6a238)' : '';
      car.node.querySelector('.car-label').textContent = car.damageTime > 0 ? 'TEMAS!' : car.incident > 0 ? 'KAYMA!' : car.boosting ? car.code + ' · BOOST' : car.code;
      animateShift(car, dt);
      car.decisionIn -= dt;
      if (car.decisionIn <= 0 && !car.shift && car.incident === 0 && elapsed > 2) {
        car.decisionIn = .6 + Math.random() * .8;
        const nearbyLeader = RaceBehaviour.leaderIn(car, car.lane, [...traffic, playerVehicle()]);
        if (elapsed > 4 && nearbyLeader && nearbyLeader.distance - car.distance < 110 && Math.random() < car.driver.riskAppetite) car.riskUntil = elapsed + 2;
        const target = RaceBehaviour.chooseLane(car, [...traffic, playerVehicle()], row => car.riskUntil > elapsed ? riskyToShift(car, row) : safeToShift(car, row));
        if (target !== null && startShift(car, target)) car.decisionIn = 2.5;
      }
    }
    incidentTimer -= dt;
    if (incidentTimer <= 0) {
      incidentTimer = 10;
      const candidates = traffic.filter(car => !car.shift && car.incident === 0 && car.x > 0 && car.x < width - 82);
      // One 5% roll per 10 seconds, independent of frame rate and traffic count.
      if (candidates.length && Math.random() < .05) candidates[Math.floor(Math.random() * candidates.length)].incident = 2.5;
    }
  }
  let velocity = 120;
  function changeSpeed(amount) {
    velocity = Math.max(0, Math.min(Math.max(playerSpeedCap, velocity), velocity + (impactCooldown > 0 && amount > 0 ? amount * .2 : amount)));
    speedLabel.textContent = Math.round(velocity); document.getElementById('speed-meter').value=velocity;
  }
  function updateRoad(dt) {
    if (state === 'running') updateDriving(dt);
    if (launchBoostUntil > 0 && elapsed >= launchBoostUntil) {
      launchBoostUntil = 0;
      launchInfo.textContent = `${Math.round(reactionTime * 1000)} ms · Kalkış bonusu tamamlandı`;
    }
    // Understeer widens the racing line: less forward progress, without reversing position.
    if(playerFinishTime===null)playerDistance += velocity / 3.6 * dt * (1 - .6 * cornerRecovery);
    const targetX = width * (.14 + Math.max(0, velocity - 60) / 285 * .16);
    playerScreenX += (targetX - playerScreenX) * Math.min(1, dt * 1.2);
    roadDistance = playerDistance * pixelsPerMeter - playerScreenX;

    const finishX = playerX() + (raceDistance - playerDistance) * pixelsPerMeter;
    circuit.style.setProperty('--finish-position', `${finishX}px`);
    drawRoad();
  }  try { best = Math.max(0, Number(localStorage.getItem('pitstop-best')) || 0); } catch (_) { /* Storage is optional. */ }
  bestLabel.textContent = best;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const playerX = () => Math.max(10, Math.min(width - 95, playerScreenX));
  function spawnOpponent(row, distance, gridRacer) {
    if (traffic.some(car => occupied(car).includes(row) && Math.abs(car.distance - distance) < 40)) return;
    const racer = gridRacer; const team = racer.team;
    const node = makeCar(team, false, racer);
    const driver = RaceBehaviour.createDriver(team);
    const cruiseSpeed = driver.cruiseSpeed;
    const car = { node, distance, driver, team, racer, id: racer.id, damageTime: 0, riskUntil: 0, planWait: 0, drivingPlan: null, gridSlot: gridOrder.indexOf(racer), mode: 'START', energy: 100, ersLocked: false, ersActive: false, boosting: false, velocity: 0, cruiseSpeed, finishTime: null, lane: row, visualLane: row, shift: null, decisionIn: 3 + Math.random() * 4, incident: 0, code: racer.code, passed: distance < playerDistance, x: 0 };
    car.x = playerX() + (car.distance - playerDistance) * pixelsPerMeter;
    place(node, car.x, row);
    traffic.push(car);
  }
  function place(node,x,row,motion=null){
    const distance=playerDistance+(x-playerX())/pixelsPerMeter;
    const p=project(distance,(row-1)*68+(node===player?playerSlipOffset:0));
    node.style.transform=`translate(${p.x-41}px,${p.y-16.5}px)`;
    const shift=motion?.shift,angle=shift?(shift.to-shift.from)*10*Math.sin(Math.PI*shift.progress)**2:0;
    node.querySelector('.car').style.transform=`rotate(${p.angle*180/Math.PI+angle}deg)`;
    node.style.visibility=p.x < -120||p.x>width+120||p.y < -100||p.y>circuit.clientHeight+100?'hidden':'visible';
  }
  function makeCar(team, isPlayer = false, racer = null) {
    const node = document.createElement('div');
    node.className = `game-car${isPlayer ? ' player' : ''}`;
    node.style.color = team.color; node.title = racer ? racer.name : team.name;
    node.style.setProperty('--accent', team.accent);
    node.innerHTML = `<svg class="car" aria-hidden="true"><use href="#racecar"/></svg><span class="car-label">${racer ? racer.code : team.code}${isPlayer ? ' · SEN' : ''}</span>`;
    circuit.append(node);
    return node;
  }
  function updateControls() {
    RaceRoster.locked = !!RaceLeague.data || ['running', 'paused', 'countdown', 'finishing'].includes(state);
    window.updateRosterLock?.();
    pilotSelect.disabled = RaceRoster.locked;
    up.disabled = state !== 'running' || !!playerMotion.shift || lane === 0;
    down.disabled = state !== 'running' || !!playerMotion.shift || lane === 2;
    brake.disabled = accelerate.disabled = ersButton.disabled = state !== 'running';
    start.textContent = RaceLeague.data?.results.length === RaceLeague.TOTAL ? 'Sezon tamamlandı' : state === 'over' ? 'Sonraki yarış' : state === 'idle' ? 'Yarışa başla' : 'Yarışı tekrarla';
    start.disabled = state==='finishing'||RaceLeague.data?.results.length === RaceLeague.TOTAL;
    const seasonButton=document.getElementById('new-season');seasonButton.textContent=RaceLeague.data?.results.length===RaceLeague.TOTAL?'Sonraki sezon →':'Yeni sezon';
    document.getElementById('new-season').disabled = ['running','paused','countdown','finishing'].includes(state);
    button.disabled = state === 'over';
    document.querySelectorAll('.team-choice').forEach(choice => { choice.disabled = RaceRoster.locked; });
  }
  function saveBest() {
    if (score > best) {
      best = score;
      bestLabel.textContent = best;
      try { localStorage.setItem('pitstop-best', String(best)); } catch (_) { /* Keep session record. */ }
    }
  }
  function updateImpact(dt) {
    if (impactCooldown <= 0) return;
    impactCooldown = Math.max(0, impactCooldown - dt);
    if (impactCooldown === 0) {
      document.body.classList.remove('crashed');
      player?.classList.remove('contact-hit');
      status.textContent = 'Yarış sürüyor';
    }
  }
  function collides(car) {
    return Math.abs((car.visualLane - playerMotion.visualLane) * 68 + roadOffset(car.distance) - roadOffset(playerDistance)) < 27 && car.x + 73 > playerX() + 9 && car.x + 9 < playerX() + 73;
  }
  function move(direction) {
    if (state !== 'running' || playerMotion.shift) return;
    const target = lane + direction;
    if (target < 0 || target > 2) return;
    startShift(playerMotion, target);
    if (impactCooldown === 0) status.textContent = 'Yarış sürüyor';
    updateControls();
  }
  function updateTraffic(dt) {
    const ourCar = playerVehicle();
    const queue = [...traffic, ourCar].sort((a, b) => b.distance - a.distance);
    const ahead = [];
    for (const car of queue) {
      if (car === ourCar) { ahead.push(car); continue; }
      if (car.finishTime !== null) {ahead.push(car);continue;}
      // Reserve both lanes while merging and advance each vehicle only once.
      const leader = ahead.filter(other => sharesLane(car, other)).sort((a, b) => a.distance - b.distance)[0];
      car.planWait -= dt;
      if (!car.drivingPlan || car.planWait <= 0) {
        car.drivingPlan = RaceBehaviour.speedPlan(car, leader, elapsed, car.riskUntil > elapsed ? 20 : followingDistance, corners, [...traffic, ourCar], row => safeToShift(car, row));
        car.planWait = car.driver.brakeReaction;
      }
      const plan = car.drivingPlan;
      const target = car.damageTime > 0 ? Math.min(plan.target, Math.max(35, car.velocity)) : plan.target;
      const battery = RacePhysics.energy(car.energy, plan.ers && car.damageTime === 0, plan.braking, plan.throttle !== false && !plan.braking, dt, car.ersLocked);
      car.energy = battery.energy; car.ersLocked = battery.locked; car.ersActive = battery.active;
      car.boosting = plan.boost || battery.active; car.mode = car.damageTime > 0 ? 'TEMAS' : car.riskUntil > elapsed && car.shift ? 'RİSKLİ ATAK' : plan.mode;
      const rate = target < car.velocity ? (plan.coasting ? 12 : 100) : plan.acceleration;
      car.velocity += Math.sign(target - car.velocity) * Math.min(Math.abs(target - car.velocity), rate * dt);
      const previousDistance = car.distance;
      const nextDistance = car.distance + car.velocity / 3.6 * dt;
      car.distance = leader?.finishTime != null ? Math.max(car.distance,Math.min(nextDistance,leader.distance-24)) : nextDistance;
      if (car.finishTime === null && car.distance + noseOffset >= raceDistance) {
        const fraction = Math.max(0, Math.min(1, (raceDistance - noseOffset - previousDistance) / Math.max(.0001, car.distance - previousDistance)));
        car.finishTime = elapsed - dt + fraction * dt;
      }
      ahead.push(car);
    }
  }
  function tick(now) {
    if (!['running','countdown','finishing','over'].includes(state)) return;
    const dt = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    if (state === 'countdown') {
      countdownTime += dt;
      updateLights();
      if (countdownTime >= lightsOutAt) {
        lights.forEach(light => light.classList.remove('lit'));
        state = 'running'; status.textContent = 'Işıklar söndü · SAĞ OK!'; launchInfo.textContent = earlyThrottle ? 'Erken gaz · bonus yok; gaz ver!' : 'Şimdi → bas · ilk 350 ms bonus!'; updateControls();
      }
      frame = requestAnimationFrame(tick);
      return;
    }
    if(state==='over'){
      cooldown(dt);updateRoad(0);place(player,playerX(),playerMotion.visualLane,playerMotion);traffic.forEach(car=>{car.x=playerX()+(car.distance-playerDistance)*pixelsPerMeter;place(car.node,car.x,car.visualLane,car);});frame=requestAnimationFrame(tick);return;
    }
    const previousDistance = playerDistance;
    elapsed += dt;
    spawnIn -= dt;
    updateImpact(dt);
    updateRoad(dt);
    updateDrivers(dt);
    updateControls();
    place(player, playerX(), playerMotion.visualLane, playerMotion);

    updateTraffic(dt);
    resolveContacts(dt);cooldown(dt);
    // Repaint after resolving any contact so every car uses the same camera position.
    updateRoad(0);
    place(player, playerX(), playerMotion.visualLane, playerMotion);
    for (const car of traffic) {
      // Both cars travel forward in world space. The camera follows our car.
      car.x = playerX() + (car.distance - playerDistance) * pixelsPerMeter;
      place(car.node, car.x, car.visualLane, car);

      if (!car.passed && car.x + 82 < playerX()) {
        car.passed = true;
        score += 10;
        scoreLabel.textContent = score;
        saveBest();
      }
    }

    updateRaceInfo();
    if (playerFinishTime===null && playerDistance + noseOffset >= raceDistance) completeRace(previousDistance, dt);
    celebrateWinner();
    if(state==='finishing'&&(traffic.every(car=>car.finishTime!==null)||elapsed-playerFinishTime>90))finalizeRace();
    frame = requestAnimationFrame(tick);
  }
  let leagueRound = 0;
  function begin() {
    if (RaceLeague.data?.results.length === RaceLeague.TOTAL) return;
    RaceLeague.start(entrants,playerEntry().id); leagueRound = RaceLeague.data.results.length; RaceLeague.render();
    cancelAnimationFrame(frame);celebrated=false;document.getElementById('race-celebration').hidden=true;
    circuit.querySelectorAll('.game-car').forEach(node => node.remove());
    collisionSystem.reset();
    gridOrder = shuffledGrid(); playerGridSlot = gridOrder.indexOf(playerEntry()); playerFinishTime = null; boardUpdatedAt = -1; buildLeaderboard();
    traffic = []; score = 0; elapsed = 0; spawnIn = 1; lane = 0; roadDistance = 0;
    heldKeys.clear(); velocity = 0; playerMotion = { lane: 0, visualLane: 0, shift: null }; incidentTimer = 10; impactCooldown = 0; reactionTime = null; launchBoostUntil = 0; earlyThrottle = false; launchInfo.textContent = 'Işıklar sönünce → · hızlı tepkiye 2,2 sn boost';
    width = circuit.clientWidth;
    const seeded = RaceLeague.random(); raceDistance = 8000 + Math.floor(seeded() * 4001); corners = RacePhysics.buildTrack(raceDistance,seeded); track=RaceTrack.build(raceDistance,corners); buildMap(); energy = 100; ersActive = false; ersLocked = false; drafting = false; cornerRecovery = 0; playerSlipOffset = 0; playerSpeedCap = RacePhysics.teamSpeed(teams[selected].slug); energyBar.value = 100; energyText.textContent = '100%'; cornerInfo.textContent = 'Start bekleniyor'; document.getElementById('speed-meter').value=0;document.getElementById('turn-distance').textContent='—';document.getElementById('turn-meter').value=0;document.querySelector('.corner-instrument').classList.remove('brake-alert'); drivingInfo.textContent = 'ERS hazır'; cornerZone.hidden = true; circuit.classList.remove('in-corner'); countdownTime = 0; lightsOutAt = 6 + Math.random() * 1.5; result.hidden = true;
    lane = playerGridSlot % 2 === 0 ? 0 : 2; playerMotion = { lane, visualLane: lane, shift: null };
    playerDistance = -playerGridSlot * 22; playerScreenX = width * .18;
    updateRoad(0);
    scoreLabel.textContent = '0';
    state = 'countdown';
    document.body.classList.add('game-active');
    document.body.classList.remove('crashed');
    setPaused(false);
    status.textContent = 'Yarış sürüyor';
    player = makeCar(teams[selected], true, playerEntry());
    place(player, playerX(), playerMotion.visualLane, playerMotion);
    gridOrder.forEach((racer, slot) => {
      if (slot !== playerGridSlot) spawnOpponent(slot % 2 === 0 ? 0 : 2, -slot * 22, racer);
    });
    updateLeaderboard(true);
    updateLights(); updateRaceInfo();
    updateControls();
    circuit.focus({ preventScroll: true });
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  }
  function pause() {
    heldKeys.clear();
    if (state === 'idle') { setPaused(!document.body.classList.contains('paused')); return; }
    if (state === 'over') return;
    if (state === 'running' || state === 'countdown' || state === 'finishing') {
      resumeState = state;
      state = 'paused';
      cancelAnimationFrame(frame);
      setPaused(true);
    } else {
      state = resumeState;
      setPaused(false);
      status.textContent = 'Yarış sürüyor';
      if (state === 'countdown') updateLights();
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
    updateControls();
  }
  for (const [control, key] of [[accelerate, 'ArrowRight'], [brake, 'ArrowLeft'], [ersButton, 'KeyE']]) {
    control.addEventListener('pointerdown', event => {
      if (state !== 'running') return;
      if (key === 'ArrowRight') reactToStart();
      heldKeys.add(key); control.setPointerCapture(event.pointerId);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) control.addEventListener(type, () => heldKeys.delete(key));
  }
  ersButton.addEventListener('keydown', event => {
    if ((event.key === ' ' || event.key === 'Enter') && state === 'running') { event.preventDefault(); heldKeys.add('KeyE'); }
  });
  ersButton.addEventListener('keyup', event => { if (event.key === ' ' || event.key === 'Enter') heldKeys.delete('KeyE'); });
  start.addEventListener('click', begin);
  button.addEventListener('click', pause);
  up.addEventListener('click', () => move(-1));
  down.addEventListener('click', () => move(1));
  brake.addEventListener('click', () => { if (state === 'running') changeSpeed(-15); });
  accelerate.addEventListener('click', () => { if (state === 'running') { reactToStart(); changeSpeed(15); } });
  document.querySelectorAll('.team-choice').forEach(choice => {
    choice.addEventListener('click', () => {
      if (RaceLeague.active || ['running', 'paused', 'countdown', 'finishing'].includes(state)) return;
      selected = Number(choice.dataset.team); selectedSeat = 0; updatePilotSelection();
      document.querySelectorAll('.team-choice').forEach(item => item.setAttribute('aria-pressed', String(item === choice)));

    });
  });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    const controlKey = normalKey(event.key);
    const key = event.key.toLowerCase();
    if ((['running', 'paused', 'countdown', 'finishing'].includes(state)) && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE'].includes(controlKey)) {
      event.preventDefault();
      if (state === 'countdown' && controlKey === 'ArrowRight' && !event.repeat) earlyThrottle = true;
      if (state !== 'running') return;
      if (controlKey === 'KeyE') { heldKeys.add('KeyE'); return; }
      if (controlKey === 'ArrowLeft' || controlKey === 'ArrowRight') {
        if (controlKey === 'ArrowRight' && !event.repeat) reactToStart();
        if (!heldKeys.has(controlKey) && !event.repeat) changeSpeed(controlKey === 'ArrowRight' ? 8 : -8);
        heldKeys.add(controlKey);
      } else if (!event.repeat) move(controlKey === 'ArrowUp' ? -1 : 1);
    }
    if (key === ' ' && event.target.tagName !== 'BUTTON' && (['running', 'paused', 'countdown', 'finishing'].includes(state))) {
      event.preventDefault();
      if (!event.repeat) pause();
    }
  });
  document.addEventListener('keyup', event => heldKeys.delete(normalKey(event.key)));
  window.addEventListener('blur', () => {
    heldKeys.clear();
    if (state === 'running' || state === 'countdown') pause();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && (state === 'running' || state === 'countdown')) pause(); });
  window.addEventListener('resize', () => {
    const previousWidth = width;
    width = circuit.clientWidth;
    playerScreenX = playerScreenX / previousWidth * width;
    if (player) place(player, playerX(), playerMotion.visualLane, playerMotion);
    traffic.forEach(car => { car.x = playerX() + (car.distance - playerDistance) * pixelsPerMeter; place(car.node, car.x, car.visualLane, car); });
    if (state === 'running' || state === 'countdown') pause();
  });
  reducedMotion.addEventListener('change', event => {
    if (state === 'idle') setPaused(event.matches);
    else if (event.matches && (state === 'running' || state === 'countdown')) pause();
  });
  if(RaceLeague.data){const racer=entrants.find(d=>d.id===RaceLeague.data.player);if(racer){selected=teams.indexOf(racer.team);selectedSeat=racer.seat;document.querySelectorAll('.team-choice').forEach(c=>c.setAttribute('aria-pressed',String(Number(c.dataset.team)===selected)));}}
  document.getElementById('new-season').addEventListener('click',()=>{if(['running','paused','countdown','finishing'].includes(state))return;try{if(RaceLeague.data?.results.length===RaceLeague.TOTAL){RaceCareer.nextSeason(RaceLeague.data);RaceLeague.reset();location.reload();return;}if(RaceLeague.active&&!confirm('Mevcut sezon puanları silinecek. Sezon yeniden başlatılsın mı?'))return;RaceLeague.reset();location.reload();}catch(error){document.getElementById('season-message').textContent='Sezon kaydedilemedi: '+error.message;}});
  if(!RaceLeague.data&&RaceCareer.data.preferredPlayer){const racer=entrants.find(d=>d.id===RaceCareer.data.preferredPlayer);if(racer){selected=teams.indexOf(racer.team);selectedSeat=racer.seat;}}
  RaceLeague.render();
  document.querySelectorAll('.team-choice').forEach(c=>c.setAttribute('aria-pressed',String(Number(c.dataset.team)===selected)));
  updatePilotSelection();
  updateControls();
})();
