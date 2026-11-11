const pageNumber = Number(document.body.dataset.page || 1);
const artCard = document.getElementById('art-card');
const hotspotMessage = document.getElementById('hotspot-message');
let audioContext;

function say(message) {
  if (hotspotMessage) hotspotMessage.textContent = message;
}

function playTone(type = 'soft') {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const frequencies = { soft: 440, click: 560, success: 720 };
    oscillator.frequency.value = frequencies[type] || frequencies.soft;
    oscillator.type = type === 'success' ? 'triangle' : 'sine';
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(type === 'success' ? .11 : .05, now + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, now + (type === 'success' ? .3 : .12));
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + (type === 'success' ? .33 : .14));
  } catch (error) {
    // Sound is optional, so the story remains usable if the browser blocks audio.
  }
}

function setActive(button, active = true) {
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
}

const rocketStorageKey = 'johnny-builds-to-mars-rocket';
const defaultRocketState = {
  name: '',
  color: 'coral',
  parts: { window: false, fins: false, engine: false },
};

function getRocketState() {
  try {
    const saved = JSON.parse(localStorage.getItem(rocketStorageKey) || '{}');
    return {
      ...defaultRocketState,
      ...saved,
      parts: { ...defaultRocketState.parts, ...(saved.parts || {}) },
    };
  } catch (error) {
    return { ...defaultRocketState, parts: { ...defaultRocketState.parts } };
  }
}

function saveRocketState(state) {
  try {
    localStorage.setItem(rocketStorageKey, JSON.stringify(state));
  } catch (error) {
    // The story still works if browser storage is unavailable.
  }
}

function applyRocketGraphic(graphic, state, complete = false) {
  if (!graphic) return;
  const parts = complete
    ? { window: true, fins: true, engine: true }
    : state.parts;
  graphic.className = `${graphic.dataset.baseClass || 'rocket-graphic'} rocket-color-${state.color}`;
  Object.entries(parts).forEach(([part, attached]) => {
    graphic.classList.toggle(`has-${part}`, Boolean(attached));
  });
  const nameTag = graphic.querySelector('[data-rocket-name]');
  if (nameTag) nameTag.textContent = state.name || 'Johnny’s rocket';
}

if (pageNumber === 1) {
  const telescopeButton = document.getElementById('telescope-hotspot');
  const telescopeView = document.getElementById('telescope-view');
  const telescopeClose = document.getElementById('telescope-close');
  const openTelescope = () => {
    setActive(telescopeButton);
    artCard?.classList.add('telescope-open');
    telescopeView?.removeAttribute('hidden');
    telescopeButton.textContent = 'Mars is in view!';
    telescopeButton.setAttribute('aria-label', 'Mars is in view');
    playTone('success');
    telescopeClose?.focus();
  };
  const closeTelescope = () => {
    setActive(telescopeButton, false);
    artCard?.classList.remove('telescope-open');
    telescopeView?.setAttribute('hidden', '');
    telescopeButton.textContent = 'Look through the telescope';
    telescopeButton.setAttribute('aria-label', 'Look through the telescope');
    say('');
    telescopeButton.focus();
  };
  telescopeButton?.addEventListener('click', () => {
    openTelescope();
  });
  telescopeClose?.addEventListener('click', closeTelescope);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !telescopeView?.hidden) closeTelescope();
  });
}

if (pageNumber === 2) {
  const found = new Set();
  const supplyButtons = document.querySelectorAll('[data-supply]');
  const bagTarget = document.getElementById('bag-target');
  const packSupply = (button) => {
    if (!button) return;
    const supply = button.dataset.supply;
    if (found.has(supply)) return;
    found.add(supply);
    setActive(button);
    document.querySelector(`[data-check="${supply}"]`)?.classList.add('found');
    const count = found.size;
    document.getElementById('supply-score').textContent = `${count} / 4 found`;
    bagTarget.textContent = count === 4 ? 'Bag packed!' : `${count} packed — drop another item here`;
    bagTarget.classList.toggle('filled', count > 0);
    if (count === 4) {
      say('All packed! Johnny is ready for the garage.');
      document.getElementById('supply-status').textContent = 'Everything Johnny needs is ready.';
      playTone('success');
    } else {
      say('Good find. Keep looking around the house.');
      document.getElementById('supply-status').textContent = `${4 - count} more thing${count === 3 ? '' : 's'} to find.`;
      playTone('click');
    }
  };
  supplyButtons.forEach((button) => {
    button.addEventListener('click', () => packSupply(button));
    button.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', button.dataset.supply);
      button.classList.add('dragging');
    });
    button.addEventListener('dragend', () => button.classList.remove('dragging'));
  });
  bagTarget?.addEventListener('dragover', (event) => {
    event.preventDefault();
    bagTarget.classList.add('ready');
  });
  bagTarget?.addEventListener('dragleave', () => bagTarget.classList.remove('ready'));
  bagTarget?.addEventListener('drop', (event) => {
    event.preventDefault();
    const supply = event.dataTransfer?.getData('text/plain');
    packSupply(document.querySelector(`[data-supply="${supply}"]`));
    bagTarget.classList.remove('ready');
  });
  bagTarget?.addEventListener('click', () => {
    const next = [...supplyButtons].find((button) => !found.has(button.dataset.supply));
    packSupply(next);
  });
  bagTarget?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const next = [...supplyButtons].find((button) => !found.has(button.dataset.supply));
    packSupply(next);
  });
}

if (pageNumber === 3) {
  const rocketState = getRocketState();
  const rocketPreview = document.getElementById('rocket-preview');
  const partOptions = document.querySelectorAll('[data-part]');
  const rocketSlots = document.querySelectorAll('[data-rocket-slot]');
  const nameInput = document.getElementById('rocket-name');
  const colorButtons = document.querySelectorAll('[data-rocket-color]');
  const renderRocket = () => {
    applyRocketGraphic(rocketPreview, rocketState);
    const packed = Object.values(rocketState.parts).filter(Boolean).length;
    partOptions.forEach((part) => {
      const attached = rocketState.parts[part.dataset.part];
      part.classList.toggle('packed', attached);
      part.setAttribute('aria-pressed', String(attached));
    });
    rocketSlots.forEach((slot) => {
      const attached = rocketState.parts[slot.dataset.rocketSlot];
      slot.classList.toggle('has-part', attached);
      slot.setAttribute('aria-pressed', String(attached));
    });
    colorButtons.forEach((button) => setActive(button, button.dataset.rocketColor === rocketState.color));
    document.getElementById('build-score').textContent = `${packed} / 3 built`;
    document.getElementById('build-status').textContent = packed === 3 ? 'Your rocket is ready to fly.' : 'Drag the graphics onto your rocket.';
    const nameDisplay = document.getElementById('rocket-name-display');
    if (nameDisplay) nameDisplay.textContent = rocketState.name || 'Name your rocket';
  };
  const attachPart = (part) => {
    if (!part || !(part in rocketState.parts) || rocketState.parts[part]) return;
    rocketState.parts[part] = true;
    saveRocketState(rocketState);
    renderRocket();
    if (Object.values(rocketState.parts).every(Boolean)) {
      say('You built it! Your rocket is ready for its first flight.');
      playTone('success');
    } else {
      say('That piece fits! Add another part.');
      playTone('click');
    }
  };
  partOptions.forEach((part) => {
    part.addEventListener('click', () => attachPart(part.dataset.part));
    part.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', part.dataset.part);
      part.classList.add('dragging');
    });
    part.addEventListener('dragend', () => part.classList.remove('dragging'));
  });
  rocketSlots.forEach((slot) => {
    slot.addEventListener('click', () => attachPart(slot.dataset.rocketSlot));
    slot.addEventListener('dragover', (event) => {
      event.preventDefault();
      slot.classList.add('ready');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('ready'));
    slot.addEventListener('drop', (event) => {
      event.preventDefault();
      attachPart(event.dataTransfer?.getData('text/plain'));
      slot.classList.remove('ready');
    });
  });
  rocketPreview?.addEventListener('dragover', (event) => event.preventDefault());
  rocketPreview?.addEventListener('drop', (event) => {
    event.preventDefault();
    attachPart(event.dataTransfer?.getData('text/plain'));
  });
  nameInput.value = rocketState.name;
  nameInput.addEventListener('input', () => {
    rocketState.name = nameInput.value.trim().slice(0, 18);
    saveRocketState(rocketState);
    renderRocket();
  });
  colorButtons.forEach((button) => button.addEventListener('click', () => {
    rocketState.color = button.dataset.rocketColor;
    saveRocketState(rocketState);
    renderRocket();
    playTone('soft');
  }));
  renderRocket();
}

if (pageNumber === 4) {
  const dogButton = document.getElementById('dog-hotspot');
  const thoughts = ['Hmm.', 'Is that safe?', 'Where are the snacks?', 'Okay… blast off.'];
  let thoughtIndex = 0;
  dogButton?.addEventListener('click', () => {
    thoughtIndex = (thoughtIndex + 1) % thoughts.length;
    setActive(dogButton, true);
    say(`The dog thinks: “${thoughts[thoughtIndex]}”`);
    playTone(thoughtIndex === thoughts.length - 1 ? 'success' : 'click');
  });
}

if (pageNumber === 5) {
  const launchButtons = document.querySelectorAll('[data-launch]');
  const flightRocket = document.getElementById('flight-rocket');
  const rocketState = getRocketState();
  const hasCustomParts = Object.values(rocketState.parts).some(Boolean);
  applyRocketGraphic(flightRocket, rocketState, !hasCustomParts);
  const flightName = document.getElementById('flight-rocket-name');
  if (flightName) flightName.textContent = rocketState.name || 'Johnny’s rocket';
  let launched = false;
  const launch = () => {
    if (launched) return;
    launched = true;
    artCard?.classList.add('launched');
    flightRocket?.removeAttribute('hidden');
    launchButtons.forEach((button) => setActive(button));
    say('3… 2… 1… BLAST OFF!');
    document.getElementById('launch-status').textContent = `${rocketState.name || 'Johnny’s rocket'} is flying to Mars.`;
    playTone('success');
  };
  launchButtons.forEach((button) => button.addEventListener('click', launch));
}

if (pageNumber === 6) {
  const marsRocket = document.getElementById('mars-rocket');
  const rocketState = getRocketState();
  const hasCustomParts = Object.values(rocketState.parts).some(Boolean);
  applyRocketGraphic(marsRocket, rocketState, !hasCustomParts);
  window.setTimeout(() => {
    marsRocket?.removeAttribute('hidden');
    artCard?.classList.add('rocket-landed');
    say(`${rocketState.name || 'Your rocket'} landed on Mars!`);
  }, 250);
  const craters = document.querySelectorAll('[data-crater]');
  const explored = new Set();
  craters.forEach((crater) => crater.addEventListener('click', () => {
    const name = crater.dataset.crater;
    if (explored.has(name)) return;
    explored.add(name);
    setActive(crater);
    const count = explored.size;
    say(count === craters.length ? 'Mars is full of surprises!' : `You found a Mars crater. ${craters.length - count} more to explore.`);
    document.getElementById('mars-status').textContent = `${count} of ${craters.length} craters explored.`;
    playTone(count === craters.length ? 'success' : 'click');
  }));
}

if (pageNumber === 7) {
  const lunchButton = document.getElementById('lunch-hotspot');
  lunchButton?.addEventListener('click', () => {
    const opened = lunchButton.classList.toggle('active');
    artCard?.classList.toggle('snacks-revealed', opened);
    say(opened ? 'Oh no… just one tiny crumb.' : 'Maybe the snacks are hiding?');
    document.getElementById('snack-status').textContent = opened ? 'Next trip: pack snacks first.' : 'Tap the lunchbox to check again.';
    playTone(opened ? 'success' : 'soft');
  });
}
