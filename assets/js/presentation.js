(function () {
  'use strict';
  var lastState = null;
  var pollFailures = 0;
  var pollBusy = false;
  var momentQueue = [];
  var momentBusy = false;
  var timerInterval = null;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  };
  function safeStorage(method, key, value) {
    try { return value === undefined ? window.sessionStorage[method](key) : window.sessionStorage[method](key, value); }
    catch (e) { return null; }
  }
  function connection(online) {
    var el = $('connection-status');
    el.classList.toggle('online', !!online);
    el.classList.toggle('offline', !online);
    el.innerHTML = '<i></i> ' + (online ? 'LIVE SYNC' : 'RECONNECTING');
  }
  function call(done) {
    if (pollBusy) return;
    pollBusy = true;
    window.TitanXApi.call('getPresentationState', []).then(function (result) {
      pollBusy = false; pollFailures = 0; connection(true); if (done) done(result);
    }).catch(function () { pollBusy = false; pollFailures += 1; connection(false); });
  }
  function phaseTitle(phase) {
    var labels = {LOBBY:'The case has not begun', INTRODUCTION:'The investigation begins', ROUND_ONE:'Round One · The Scene', ROUND_TWO:'Round Two · The Garden', ROUND_THREE:'Round Three · The Motive', FINAL_DISCUSSION:'Final discussion', VOTING_OPEN:'Make your accusation', VOTING_CLOSED:'The vote is sealed', REVEAL:'The truth is revealed', COMPLETED:'Mystery solved'};
    return labels[phase] || 'The mansion is waiting';
  }
  function phaseIndex(phase) {
    if (phase === 'LOBBY') return 0;
    if (phase === 'INTRODUCTION' || /^ROUND_/.test(phase) || phase === 'FINAL_DISCUSSION') return 1;
    if (phase.indexOf('VOTING') === 0) return 2;
    return 3;
  }
  function renderProgress(phase) {
    var current = phaseIndex(phase), labels = ['LOBBY','INVESTIGATION','VOTE','REVEAL'];
    $('show-progress').textContent = String(phase || 'LOBBY').replace(/_/g, ' ');
    $('show-progress-steps').innerHTML = labels.map(function (label, index) {
      return (index ? '<i></i>' : '') + '<span class="' + (index < current ? 'done' : index === current ? 'current' : '') + '">' + label + '</span>';
    }).join('');
  }
  function renderRoster(data) {
    var list = $('show-roster-list'), chars = data.characters || [], runoff = data.runoffCharacterIds || [];
    $('show-player-count').textContent = Number(data.playerCount || 0);
    $('show-player-limit').textContent = Number(data.playerLimit || 12);
    $('show-roster-note').textContent = data.phase === 'VOTING_OPEN' ? (runoff.length ? 'Runoff ballot · only the tied active suspects are eligible.' : 'Choose your suspect. Individual ballots remain private.') : 'Public characters and investigation status.';
    var people = chars.filter(function (c) { return c.status === 'ACTIVE' && (data.phase !== 'VOTING_OPEN' || !runoff.length || runoff.indexOf(c.id) >= 0); });
    var eliminated = chars.filter(function (c) { return c.status === 'ELIMINATED'; });
    var ordered = people.concat(eliminated);
    if (!ordered.length) { list.innerHTML = '<div class="show-empty">Awaiting investigators</div>'; return; }
    list.innerHTML = ordered.map(function (c) {
      var icon = c.avatarId === 'pumpkin-female' ? '✦' : c.avatarId === 'pumpkin-male' ? '◈' : '✧';
      return '<article class="show-person ' + (c.status === 'ELIMINATED' ? 'eliminated' : '') + '"><span class="profile-avatar ' + esc(c.avatarId || 'pumpkin-neutral') + '" aria-hidden="true">' + icon + '</span><div><b>' + esc(c.name) + '</b><small>' + esc(c.description || c.role || 'Investigator') + '</small></div><span class="person-state">' + esc(c.status || 'ACTIVE') + '</span></article>';
    }).join('');
  }
  function renderClues(data) {
    var clues = data.evidence || [];
    $('show-clue-count').textContent = clues.length + (clues.length === 1 ? ' CLUE RELEASED' : ' CLUES RELEASED');
    if (!clues.length) {
      $('show-clues').innerHTML = '<div class="show-empty">The case file is still sealed. Watch this screen as the host reveals each clue.</div>';
      return;
    }
    $('show-clues').innerHTML = clues.map(function (clue, index) {
      return '<article class="show-clue" style="animation-delay:' + Math.min(index * 70, 500) + 'ms"><small>ROUND ' + String(clue.round || 1).padStart(2, '0') + ' · EVIDENCE</small><h3>' + esc(clue.title) + '</h3><p>' + esc(clue.description) + '</p></article>';
    }).join('');
  }
  function renderResults(data) {
    var panel = $('show-vote-results');
    if (!data.resultsRevealed || data.phase !== 'VOTING_CLOSED') { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    var totals = data.voteTotals || {}, chars = data.characters || [], keys = Object.keys(totals).sort(function (a, b) { return Number(totals[b]) - Number(totals[a]); });
    var max = keys.reduce(function (m, id) { return Math.max(m, Number(totals[id])); }, 0);
    var leaders = keys.filter(function (id) { return Number(totals[id]) === max && max > 0; });
    $('show-results-title').textContent = !keys.length ? 'No votes were cast' : leaders.length > 1 ? 'The room is divided · TIE' : 'The room has spoken';
    $('show-results-note').textContent = 'ROUND ' + Number(data.votingRound || 1) + ' · ' + Number(data.voteCount || 0) + ' BALLOTS';
    if (!keys.length) { $('show-results-bars').innerHTML = '<div class="show-empty">The host can reopen voting or move the investigation forward.</div>'; return; }
    $('show-results-bars').innerHTML = keys.map(function (id, index) {
      var character = chars.filter(function (c) { return c.id === id; })[0] || {};
      var count = Number(totals[id]) || 0, width = max ? Math.round(count / max * 100) : 0;
      return '<div class="result-row"><span>' + esc(character.name || 'Suspect') + '</span><span class="result-track"><i class="result-fill" style="width:' + width + '%;animation-delay:' + index * 110 + 'ms"></i></span><strong>' + count + '</strong></div>';
    }).join('');
  }
  function renderReveal(data) {
    var panel = $('show-reveal'), r = data.reveal;
    if (!r) { panel.classList.add('hidden'); return; }
    var accusation = r.winningAccusation ? ((data.characters || []).filter(function (c) { return c.id === r.winningAccusation; })[0] || {}).name || 'Unknown' : 'Inconclusive · no ballots or a tie';
    var totals = Object.keys(r.voteTotals || {}).map(function (id) {
      var name = ((data.characters || []).filter(function (c) { return c.id === id; })[0] || {}).name || 'Suspect';
      return esc(name) + ': ' + Number(r.voteTotals[id]);
    }).join(' · ') || 'No votes were cast.';
    panel.innerHTML = '<div class="show-phase-label">THE FINAL REVEAL</div><h2>' + esc(r.culprit) + '</h2><p><b>The motive:</b> ' + esc(r.motive) + '</p><p><b>The timeline:</b> ' + esc(r.timeline) + '</p><p><b>The decisive evidence:</b> ' + esc(r.decisive) + '</p><p><b>Red herrings:</b> ' + esc(r.redHerrings) + '</p><p><b>Team accusation:</b> ' + esc(accusation) + ' · ' + (r.correctAccusation ? 'The investigators solved it.' : 'The accusation missed the culprit.') + '</p><p><b>Final tally:</b> ' + totals + '</p><h3>MYSTERY SOLVED · CASE CLOSED</h3>';
    panel.classList.remove('hidden');
  }
  function formatTime(seconds) {
    var s = Math.max(0, Math.floor(seconds));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  var playbackSequence=0,videoEl=$('intro-video'),musicEl=$('intro-music');
  var mediaManifest={intro:{video:'assets/media/intro.mp4',music:''}};
  function syncPlayback(playback){
    if(!playback||Number(playback.sequence||0)<=playbackSequence)return;
    playbackSequence=Number(playback.sequence||0);
    var intro=$('cinematic-intro');if(!videoEl||!musicEl)return;
    if(mediaManifest[playback.mediaId]&&mediaManifest[playback.mediaId].video)videoEl.src=mediaManifest[playback.mediaId].video;
    if(mediaManifest[playback.mediaId]&&mediaManifest[playback.mediaId].music)musicEl.src=mediaManifest[playback.mediaId].music;
    videoEl.volume=Number(playback.videoVolume||0);musicEl.volume=Number(playback.musicVolume||0);videoEl.muted=!!playback.muted;musicEl.muted=!!playback.muted;
    if(playback.videoStatus==='stopped'){videoEl.pause();videoEl.currentTime=0;intro.classList.add('hidden');}
    else {intro.classList.remove('hidden');if(Number.isFinite(Number(playback.videoPosition))&&Math.abs(videoEl.currentTime-Number(playback.videoPosition))>2)try{videoEl.currentTime=Number(playback.videoPosition);}catch(e){};var promise=playback.videoStatus==='playing'?videoEl.play():Promise.resolve();if(promise&&promise.catch)promise.catch(function(){$('intro-error').textContent='Presentation browser blocked playback. Click the presentation once, then ask the host to retry.';});}
    if(playback.musicStatus==='stopped'){musicEl.pause();musicEl.currentTime=0;}else if(playback.musicStatus==='playing'){var mp=musicEl.play();if(mp&&mp.catch)mp.catch(function(){});}else{musicEl.pause();}
    if($('intro-status'))$('intro-status').textContent=playback.videoStatus==='paused'?'INTRODUCTION PAUSED':playback.videoStatus==='playing'?'INTRODUCTION PLAYING':'TITANX AFTER DARK';
  }
  if(videoEl){videoEl.addEventListener('loadedmetadata',function(){if($('intro-status'))$('intro-status').textContent='INTRODUCTION READY';});videoEl.addEventListener('error',function(){$('intro-error').textContent='The introduction video could not be loaded. Check the published media path.';});}
  function updateClock() {
    if (!lastState) return;
    var d = lastState, remaining, total = Math.max(1, Number(d.durationSeconds || 180));
    if (d.phase === 'VOTING_OPEN' && d.votingDeadline) {
      remaining = Math.max(0, Math.ceil((Date.parse(d.votingDeadline) - Date.now()) / 1000));
      $('show-clock-label').textContent = 'VOTING DEADLINE';
    } else if (d.phaseStartedAt && ['LOBBY','COMPLETED'].indexOf(d.phase) < 0) {
      remaining = Math.max(0, total - Math.floor((Date.now() - Date.parse(d.phaseStartedAt)) / 1000));
      $('show-clock-label').textContent = 'PHASE CLOCK · HOST CONTROLLED';
    } else {
      $('show-clock-label').textContent = 'UNTIL THE CASE OPENS';
      remaining = null;
    }
    $('show-timer').textContent = remaining === null ? '—' : formatTime(remaining);
    var pct = remaining === null ? 0 : Math.max(0, Math.min(100, remaining / total * 100));
    $('show-meter-fill').style.width = pct + '%';
    $('show-timer').classList.toggle('urgent', remaining !== null && remaining <= 10);
  }
  function queueMoment(title, copy, kicker, countdown) {
    momentQueue.push({title:title,copy:copy,kicker:kicker||'TITANX AFTER DARK',countdown:countdown||0});
    playNextMoment();
  }
  function playNextMoment() {
    if (momentBusy || !momentQueue.length) return;
    momentBusy = true;
    var item = momentQueue.shift(), count = Number(item.countdown || 0), overlay = $('show-moment');
    $('moment-kicker').textContent = item.kicker;
    $('moment-title').textContent = item.title;
    $('moment-copy').textContent = item.copy;
    $('moment-count').textContent = count ? String(count) : '';
    overlay.classList.remove('hidden');
    var interval = count ? window.setInterval(function () { count -= 1; $('moment-count').textContent = count > 0 ? String(count) : ''; }, 1000) : null;
    window.setTimeout(function () {
      if (interval) window.clearInterval(interval);
      overlay.classList.add('hidden');
      momentBusy = false;
      playNextMoment();
    }, item.countdown ? item.countdown * 1000 + 800 : 3600);
  }
  function signature(data) {
    return [data.gameId || '',data.phase || '',Number(data.votingRound || 0),!!data.resultsRevealed,(data.evidence || []).map(function (c) { return c.id; }).join(','),data.eliminationAnnouncement || '',!!data.solutionRevealed].join('|');
  }
  function announceChanges(previous, data) {
    var eventKey = 'titanx-show-event-' + String(data.gameId || 'lobby'), currentSig = signature(data), savedSig = safeStorage('getItem', eventKey), currentEvidence = (data.evidence || []).map(function (c) { return c.id; });
    if (savedSig === currentSig) return;
    safeStorage('setItem', eventKey, currentSig);
    if (!previous) {
      if (data.phase === 'INTRODUCTION') {
        queueMoment('THE HOUSE IS SEALED', 'One of tonight’s guests destroyed Jack. Everyone has a secret.', 'TITANX AFTER DARK');
        queueMoment('WHO KILLED THE PUMPKIN?', 'Thirty-one guests. One storm-locked mansion. A truth hidden in the evidence.', 'THE LAST NIGHT OF JACK', 3);
        queueMoment('THE INVESTIGATION BEGINS', 'Meet the suspects. Follow every clue. Trust no alibi.', 'ROUND ONE');
      }
      return;
    }
    if (previous.gameId !== data.gameId) { queueMoment('A NEW CASE', 'The mansion is open. Investigators, take your places.', 'TITANX AFTER DARK'); return; }
    if (data.phase === 'VOTING_OPEN' && (previous.phase !== 'VOTING_OPEN' || previous.votingRound !== data.votingRound)) {
      queueMoment(data.runoffCharacterIds && data.runoffCharacterIds.length ? 'RUNOFF VOTE' : 'VOTING IS NOW OPEN', data.runoffCharacterIds && data.runoffCharacterIds.length ? 'The final accusation is between the tied suspects.' : 'Choose carefully. Your accusation is private.', 'CAST YOUR ACCUSATION', 3);
    } else if (previous.phase === 'VOTING_OPEN' && data.phase === 'VOTING_CLOSED') {
      queueMoment('VOTING CLOSED', 'The ballots are sealed. The room is waiting for the result.', 'THE COUNT IS IN');
    }
    if (!previous.resultsRevealed && data.resultsRevealed && data.phase === 'VOTING_CLOSED') {
      var totals = data.voteTotals || {}, values = Object.keys(totals).map(function (id) { return Number(totals[id]); }), high = Math.max.apply(Math, values.concat([0])), tied = values.filter(function (n) { return n === high; }).length > 1;
      queueMoment(tied ? 'THE ROOM IS DIVIDED' : 'THE RESULTS ARE IN', tied ? 'A tie. The investigation is not over.' : 'The leading accusation is about to be revealed.', tied ? 'TIE' : 'VOTE REVEAL');
    }
    var addedClue = (data.evidence || []).filter(function (c) { return (previous.evidence || []).map(function (p) { return p.id; }).indexOf(c.id) < 0; }).slice(-1)[0];
    if (addedClue) queueMoment(addedClue.title, addedClue.description, 'NEW EVIDENCE · ROUND ' + Number(addedClue.round || 1));
    if (previous.eliminationAnnouncement !== data.eliminationAnnouncement && data.eliminationAnnouncementName) queueMoment(data.eliminationAnnouncementName + ' IS ELIMINATED', 'The suspect leaves the active investigation. The case continues.', 'ELIMINATION');
    if (!previous.reveal && data.reveal) {
      queueMoment('THE FINAL SECRET', 'The clues are connected. The killer is…', 'THE LAST NIGHT OF JACK', 3);
      queueMoment(data.reveal.culprit, data.reveal.motive, 'MYSTERY SOLVED');
    }
  }
  function render(data) {
    if (!data || !data.ok) return;
    var d = data.data;
    syncPlayback(d.playback);
    announceChanges(lastState, d);
    lastState = d;
    $('show-phase-label').textContent = String(d.phase || 'LOBBY').replace(/_/g, ' ');
    $('show-phase-title').textContent = phaseTitle(d.phase || 'LOBBY');
    $('show-round').textContent = d.phase === 'VOTING_OPEN' ? 'Round ' + Number(d.votingRound || 1) + ' · ' + Number(d.voteCount || 0) + ' / ' + Number(d.eligibleVoters || 0) + ' ballots received' : d.phase === 'LOBBY' ? Number(d.playerCount || 0) + ' investigators are in the room · waiting for the host' : Number((d.evidence || []).length) + ' clues have been released · the host controls the next reveal';
    $('show-story').textContent = d.story || 'At the TitanX Halloween celebration, Jack the Pumpkin has been found smashed. The mansion is sealed by a storm. Every guest has a secret.';
    renderProgress(d.phase || 'LOBBY');
    renderRoster(d);
    renderClues(d);
    renderResults(d);
    renderReveal(d);
    updateClock();
  }
  function poll() {
    call(render);
    var hidden = document.hidden;
    var delay = pollFailures ? Math.min(30000, 5000 * Math.pow(2, Math.min(pollFailures, 3))) : hidden ? 15000 : 4500;
    window.setTimeout(poll, delay + Math.floor(Math.random() * 450));
  }
  poll();
  timerInterval = window.setInterval(updateClock, 1000);
})();
