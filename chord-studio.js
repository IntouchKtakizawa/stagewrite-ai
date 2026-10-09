(() => {
  'use strict';

  const PC = {C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10};
  const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FLAT = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const TUNING = [40,45,50,55,59,64];
  const STRING_NAMES = ['E2','A2','D3','G3','B3','E4'];
  const SUFFIXES = ['', 'm', '5', '6', 'm6', '7', 'maj7', 'm7', 'mMaj7', 'dim', 'dim7', 'm7b5', 'aug', 'sus2', 'sus4', '7sus4', 'add9', 'madd9', '9', 'maj9', 'm9', '11', 'maj11', 'm11', '13', 'maj13', 'm13', '7b5', '7#5', '7b9', '7#9', '7#11', '7b13', 'maj7#11', '13sus4'];
  const BASE_INTERVALS = {
    major:[0,4,7], minor:[0,3,7], power:[0,7], dim:[0,3,6], aug:[0,4,8], sus2:[0,2,7], sus4:[0,5,7]
  };
  const DETECTION_TEMPLATES = [
    ['', [0,4,7]], ['m',[0,3,7]], ['5',[0,7]], ['6',[0,4,7,9]], ['m6',[0,3,7,9]], ['7',[0,4,7,10]], ['maj7',[0,4,7,11]], ['m7',[0,3,7,10]], ['mMaj7',[0,3,7,11]], ['dim',[0,3,6]], ['dim7',[0,3,6,9]], ['m7b5',[0,3,6,10]], ['aug',[0,4,8]], ['sus2',[0,2,7]], ['sus4',[0,5,7]], ['7sus4',[0,5,7,10]], ['add9',[0,2,4,7]], ['madd9',[0,2,3,7]], ['9',[0,2,4,7,10]], ['maj9',[0,2,4,7,11]], ['m9',[0,2,3,7,10]], ['11',[0,2,4,5,7,10]], ['m11',[0,2,3,5,7,10]], ['13',[0,2,4,7,9,10]], ['maj13',[0,2,4,7,9,11]], ['m13',[0,2,3,7,9,10]], ['7b9',[0,1,4,7,10]], ['7#9',[0,3,4,7,10]], ['maj7#11',[0,4,6,7,11]], ['13sus4',[0,2,5,7,9,10]]
  ];
  const INTERVAL_NAMES = {0:'Root',1:'Minor 2nd / ♭9',2:'Major 2nd / 9th',3:'Minor 3rd / ♯9',4:'Major 3rd',5:'Perfect 4th / 11th',6:'Tritone / ♯11',7:'Perfect 5th',8:'Augmented 5th / ♭13',9:'Major 6th / 13th',10:'Minor 7th',11:'Major 7th'};
  const ENHARMONIC = {'C#':'Db',Db:'C#','D#':'Eb',Eb:'D#','F#':'Gb',Gb:'F#','G#':'Ab',Ab:'G#','A#':'Bb',Bb:'A#'};
  const studio = document.querySelector('#chordStudio');
  const APP = window.StageWriteApp;
  const state = APP.state;
  const current = APP.current;
  const generateBass = APP.generateBass;
  const render = APP.render;
  const toast = APP.toast;
  const sections = APP.sections;
  const seekToChord = APP.seekToChord;
  const chordStartStep = APP.chordStartStep;
  const escapeHtml = APP.escapeHtml;
  let studioMode = 'add';
  let editIndex = -1;
  let activeTab = 'search';
  let activeResult = 0;
  let selectedChord = null;
  let builderFrets = [-1,-1,-1,-1,-1,-1];
  let builderName = '';
  let manualInput = '';

  function uid() {
    return `ch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  }

  function preferredNames() {
    return state.key.includes('b') || /^(F|Bb|Eb|Ab|Db) /.test(state.key) ? FLAT : SHARP;
  }

  function noteNameFor(pc) {
    return preferredNames()[((pc % 12) + 12) % 12];
  }

  function normalizeWords(raw) {
    let value = String(raw || '').trim().replace(/[♯]/g,'#').replace(/[♭]/g,'b').replace(/[–—]/g,'-');
    value = value.replace(/major\s+seventh/ig,'maj7').replace(/minor\s+seventh/ig,'m7').replace(/dominant\s+(?:seventh|7)/ig,'7');
    value = value.replace(/major/ig,'maj').replace(/minor/ig,'m').replace(/minr/ig,'m').replace(/seventh/ig,'7');
    value = value.replace(/\s+/g,'');
    return value;
  }

  function parseChord(raw) {
    const original = String(raw || '').trim();
    if (!original) return {status:'unknown', original, reason:'Type a chord to begin.'};
    let text = normalizeWords(original);
    const rootMatch = text.match(/^([A-Ga-g])([#b]?)/);
    if (!rootMatch) return {status:'unknown', original, reason:'A chord needs a root note from A to G.'};
    const root = rootMatch[1].toUpperCase() + rootMatch[2];
    let rest = text.slice(rootMatch[0].length);
    let bass = null;
    const slash = rest.match(/\/([A-Ga-g])([#b]?)$/);
    if (slash) {
      bass = slash[1].toUpperCase() + slash[2];
      rest = rest.slice(0, slash.index);
    }
    rest = rest.replace(/^Δ/i,'maj').replace(/^ø7?/i,'m7b5').replace(/^°/,'dim').replace(/^\+/,'aug').replace(/^-(?=\d|$)/,'m');
    const interpreted = normalizeWords(original) !== original.replace(/\s+/g,'') || /Δ|ø|°|\+|^-|major|minor|minr|dominant|seventh/i.test(original);
    let quality = 'major';
    let suffix = rest;
    let intervals;
    if (/^mmaj/i.test(rest)) { quality = 'minor'; intervals = [...BASE_INTERVALS.minor]; suffix = 'mMaj' + rest.slice(4); }
    else if (/^maj/i.test(rest)) { quality = 'major'; intervals = [...BASE_INTERVALS.major]; suffix = 'maj' + rest.slice(3); }
    else if (/^m(?!aj)/i.test(rest)) { quality = 'minor'; intervals = [...BASE_INTERVALS.minor]; suffix = 'm' + rest.slice(1); }
    else if (/^dim/i.test(rest)) { quality = 'diminished'; intervals = [...BASE_INTERVALS.dim]; suffix = 'dim' + rest.slice(3); }
    else if (/^aug/i.test(rest)) { quality = 'augmented'; intervals = [...BASE_INTERVALS.aug]; suffix = 'aug' + rest.slice(3); }
    else if (/^sus2/i.test(rest)) { quality = 'suspended 2'; intervals = [...BASE_INTERVALS.sus2]; suffix = 'sus2' + rest.slice(4); }
    else if (/^sus4|^sus$/i.test(rest)) { quality = 'suspended 4'; intervals = [...BASE_INTERVALS.sus4]; suffix = rest.toLowerCase() === 'sus' ? 'sus4' : 'sus4' + rest.slice(4); }
    else if (/^5$/.test(rest)) { quality = 'power chord'; intervals = [...BASE_INTERVALS.power]; }
    else intervals = [...BASE_INTERVALS.major];

    const lower = suffix.toLowerCase();
    const knownPattern = /^(?:m|maj|mmaj|dim|aug|sus2|sus4)?(?:5|6|7|9|11|13)?(?:sus2|sus4|sus)?(?:(?:add)?(?:2|4|6|9|11|13)|[#b](?:5|9|11|13))*$/i;
    if (!knownPattern.test(suffix)) return {status:'uncertain', original, root, reason:'This notation is unusual.'};
    if (/sus2/i.test(lower)) intervals = [...BASE_INTERVALS.sus2];
    if (/sus4|sus$/i.test(lower)) intervals = [...BASE_INTERVALS.sus4];
    if (/dim/i.test(lower)) intervals = [...BASE_INTERVALS.dim];
    if (/aug/i.test(lower)) intervals = [...BASE_INTERVALS.aug];
    const isMajorExtension = /maj(?:7|9|11|13)/i.test(lower) || /mmaj(?:7|9|11|13)/i.test(lower);
    const extensionSource = lower.replace(/[#b](?:5|9|11|13)/g,'').replace(/add(?:2|4|6|9|11|13)/g,'');
    const extension = [...extensionSource.matchAll(/(13|11|9|7|6)/g)].map(m => +m[1]).at(-1) || null;
    if (extension === 6) intervals.push(9);
    if (extension && extension >= 7) intervals.push(isMajorExtension ? 11 : 10);
    if (extension && extension >= 9) intervals.push(2);
    if (extension && extension >= 11) intervals.push(5);
    if (extension && extension >= 13) intervals.push(9);
    for (const match of lower.matchAll(/add(2|4|6|9|11|13)/g)) intervals.push(({2:2,4:5,6:9,9:2,11:5,13:9})[match[1]]);
    for (const match of lower.matchAll(/([#b])(5|9|11|13)/g)) {
      const natural = ({5:7,9:2,11:5,13:9})[match[2]];
      intervals = intervals.filter(i => i !== natural);
      intervals.push((natural + (match[1] === '#' ? 1 : -1) + 12) % 12);
    }
    intervals = [...new Set(intervals)].sort((a,b) => a-b);
    const canonicalSuffix = canonicalizeSuffix(suffix, quality);
    const name = root + canonicalSuffix + (bass ? '/' + bass : '');
    const pitchClasses = intervals.map(i => (PC[root] + i) % 12);
    if (bass && !pitchClasses.includes(PC[bass])) pitchClasses.unshift(PC[bass]);
    return {
      status: interpreted || name !== original.replace(/\s+/g,'') ? 'interpreted' : 'recognized',
      original, name, root, rootPc:PC[root], bass, bassPc:bass == null ? PC[root] : PC[bass], quality,
      extension, intervals, pitchClasses:[...new Set(pitchClasses)], noteNames:[...new Set(pitchClasses)].map(noteNameFor), enharmonic:ENHARMONIC[root] ? ENHARMONIC[root] + canonicalSuffix + (bass ? '/' + bass : '') : null
    };
  }

  function canonicalizeSuffix(suffix, quality) {
    let s = suffix.replace(/^mmaj/i,'mMaj').replace(/^maj/i,'maj').replace(/^m/i,'m').replace(/^dim/i,'dim').replace(/^aug/i,'aug');
    if (quality === 'suspended 4' && /^sus$/i.test(s)) s = 'sus4';
    return s;
  }

  function distance(a,b) {
    a = normalizeWords(a).toLowerCase(); b = normalizeWords(b).toLowerCase();
    const row = Array.from({length:b.length+1},(_,i)=>i);
    for (let i=1;i<=a.length;i++) {
      let previous = row[0]; row[0] = i;
      for (let j=1;j<=b.length;j++) {
        const hold = row[j];
        row[j] = Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));
        previous = hold;
      }
    }
    return row[b.length];
  }

  function candidatesFor(query) {
    const normalized = normalizeWords(query);
    const typedRoot = normalized.match(/^([A-Ga-g])([#b]?)/);
    const rootsToUse = typedRoot ? [typedRoot[1].toUpperCase()+typedRoot[2]] : preferredNames();
    const keyRoot = state.key.split(' ')[0];
    const previous = editIndex > 0 ? current()[editIndex-1] : current().at(-1);
    const next = editIndex >= 0 ? current()[editIndex+1] : null;
    const pool = [];
    rootsToUse.forEach(root => SUFFIXES.forEach(suffix => pool.push(root+suffix)));
    if (typedRoot && normalized.includes('/')) preferredNames().forEach(bass => pool.push(rootsToUse[0] + normalized.split('/')[0].slice(rootsToUse[0].length) + '/' + bass));
    loadSaved().forEach(c => pool.push(c.name));
    const unique = [...new Set(pool)];
    return unique.map(name => {
      const parsed = parseChord(name);
      let score = distance(normalized,name) * 12 + Math.abs(name.length-normalized.length) * 1.5;
      if (name.toLowerCase().startsWith(normalized.toLowerCase())) score -= 35;
      if (parsed.root === keyRoot) score -= 5;
      if (previous && parseChord(previous.theoreticalName || previous.name).root === parsed.root) score += 3;
      if (next && parseChord(next.theoreticalName || next.name).root === parsed.root) score += 2;
      if (parsed.root && ['','m','7','maj7','m7','sus4','add9','9'].includes(name.slice(parsed.root.length).split('/')[0])) score -= 2;
      return {name, parsed, score};
    }).filter(x => x.parsed.status !== 'unknown' && x.parsed.status !== 'uncertain').sort((a,b)=>a.score-b.score).slice(0,8);
  }

  function detectNotes(pitchClasses,bassPc=null) {
    const unique = [...new Set(pitchClasses.map(n => ((n%12)+12)%12))];
    if (unique.length < 2) return [];
    const names = preferredNames();
    const results = [];
    for (const rootPc of unique) {
      for (const [suffix,template] of DETECTION_TEMPLATES) {
        const target = template.map(i => (rootPc+i)%12);
        const missing = target.filter(n => !unique.includes(n)).length;
        const extra = unique.filter(n => !target.includes(n)).length;
        let score = missing*16 + extra*10 + Math.abs(target.length-unique.length)*2;
        if (bassPc === rootPc) score -= 6;
        if (rootPc === PC[state.key.split(' ')[0]]) score -= 2;
        let name = names[rootPc] + suffix;
        if (bassPc != null && bassPc !== rootPc && unique.includes(bassPc)) name += '/' + names[bassPc];
        results.push({name,rootPc,suffix,score,exact:missing===0&&extra===0,parsed:parseChord(name)});
      }
    }
    const seen = new Set();
    return results.sort((a,b)=>a.score-b.score).filter(r=>!seen.has(r.name)&&seen.add(r.name)).slice(0,6);
  }

  function notesFromFrets(frets) {
    const midi = frets.map((f,i)=>f < 0 ? null : TUNING[i]+f).filter(Number.isFinite);
    return {midi, pitchClasses:[...new Set(midi.map(n=>n%12))], bassPc:midi.length?midi[0]%12:null};
  }

  function parseManualNotes(value) {
    const tokens = String(value).replace(/[,;]+/g,' ').trim().split(/\s+/).filter(Boolean);
    const notes = [];
    for (const token of tokens) {
      const match = token.match(/^([A-Ga-g])([#b♯♭]?)(-?\d+)?$/);
      if (!match) continue;
      const name = match[1].toUpperCase() + match[2].replace('♯','#').replace('♭','b');
      if (PC[name] == null) continue;
      const midi = match[3] == null ? null : (Number(match[3])+1)*12+PC[name];
      notes.push({name,pc:PC[name],midi});
    }
    return notes;
  }

  function progressionChord(parsed, extra={}) {
    const keyPc = PC[state.key.split(' ')[0]];
    const rootPc = parsed.rootPc ?? parsed.pitchClasses?.[0] ?? 0;
    const scale = state.key.endsWith('Minor') ? [0,2,3,5,7,8,10] : [0,2,4,5,7,9,11];
    const degreeIndex = scale.indexOf((rootPc-keyPc+12)%12);
    return {
      id:uid(), degree:degreeIndex<0?1:degreeIndex+1, name:extra.customName || parsed.name || 'Custom Chord',
      theoreticalName:parsed.name || null, inputNotation:parsed.original || parsed.name || '',
      pitchClasses:[...(parsed.pitchClasses || [])], noteNames:[...(parsed.noteNames || (parsed.pitchClasses || []).map(noteNameFor))],
      bassPc:parsed.bassPc ?? rootPc, voicing:extra.voicing ? [...extra.voicing] : null,
      midiNotes:extra.midiNotes ? [...extra.midiNotes] : null, isCustom:!!extra.customName || !parsed.name,
      roman:degreeIndex<0?'CUSTOM':['I','ii','iii','IV','V','vi','vii°'][degreeIndex], fn:extra.customName?'Custom voicing':'Manual chord',
      locked:false, duration:'bar1', customBeats:3
    };
  }

  function addOrReplace(chord) {
    if (studioMode === 'replace' && current()[editIndex]) {
      const old = current()[editIndex];
      current()[editIndex] = {...chord,duration:old.duration,customBeats:old.customBeats,locked:old.locked,id:old.id||chord.id};
      state.selected = editIndex;
      toast(`${chord.name} replaced chord ${editIndex+1}`);
    } else {
      current().push(chord);
      state.length = current().length;
      state.selected = current().length-1;
      toast(`${chord.name} added to ${state.section}`);
    }
    generateBass();
    render();
    studio.close();
  }

  function renderSearch(query='') {
    const parsed = parseChord(query);
    const results = candidatesFor(query);
    let status = '';
    if (query && parsed.status === 'recognized') status = `<div class="search-result active" data-result-name="${escapeHtml(parsed.name)}"><div><strong>${escapeHtml(parsed.name)}</strong><span>Recognized chord</span></div><span class="status-chip">recognized</span></div>`;
    else if (query && parsed.status === 'interpreted') status = `<div class="search-result active" data-result-name="${escapeHtml(parsed.name)}"><div><strong>${escapeHtml(parsed.name)}</strong><span>Interpreted from “${escapeHtml(query)}”</span></div><span class="status-chip">interpreted</span></div>`;
    else if (query) status = `<div class="unknown-box"><h4>We couldn't confidently identify “${escapeHtml(query)}”.</h4><p>${escapeHtml(parsed.reason || 'Choose a close match, draw the voicing, or enter its notes. You can always keep it as a custom chord.')}</p><div class="studio-actions"><button class="ghost" data-tab-jump="fretboard">Draw It Yourself</button><button class="ghost" data-tab-jump="notes">Enter Notes</button></div></div>`;
    const suggestions = results.filter(r => !parsed.name || r.name !== parsed.name).map((r,i)=>`<button class="search-result ${!status&&i===activeResult?'active':''}" data-result-name="${escapeHtml(r.name)}"><div><strong>${escapeHtml(r.name)}</strong><span>${r.parsed.noteNames.join(' – ')}</span></div><span>${r.parsed.enharmonic?'≋ '+r.parsed.enharmonic:''}</span></button>`).join('');
    return `${status}${query?'<h4 style="font-size:.72rem;color:var(--muted);margin:15px 0 8px">'+(parsed.status==='recognized'||parsed.status==='interpreted'?'MORE POSSIBILITIES':'CLOSEST MATCHES')+'</h4>':''}<div class="search-results">${suggestions}</div>`;
  }

  function detailHtml(chord) {
    if (!chord) return `<div class="empty-studio"><strong>Select a result.</strong><br>StageWrite will show its notes, intervals, enharmonic spelling, similar chords, and playback controls here.</div>`;
    const parsed = chord.status ? chord : parseChord(chord.theoreticalName || chord.name);
    const pitchClasses = chord.pitchClasses || parsed.pitchClasses || [];
    const noteNames = chord.noteNames || pitchClasses.map(noteNameFor);
    const rootPc = parsed.rootPc ?? pitchClasses[0];
    const intervals = parsed.intervals || pitchClasses.map(pc=>(pc-rootPc+12)%12);
    const root = parsed.root || noteNameFor(rootPc);
    const suffix = parsed.name ? parsed.name.slice(root.length).split('/')[0] : '';
    const similar = [root+(suffix.startsWith('m')?'m7':'maj7'),root+(suffix.startsWith('m')?'m9':'add9'),root+'sus2',root+'sus4',root+'6',root+'9'].filter((n,i,a)=>n!==(parsed.name||chord.name)&&a.indexOf(n)===i).slice(0,6);
    return `<div class="chord-detail"><span class="status-chip">${escapeHtml(parsed.status || (chord.isCustom?'custom':'recognized'))}</span><h3>${escapeHtml(chord.name || parsed.name || 'Custom Chord')}</h3>${parsed.enharmonic?`<div class="search-hint">Enharmonic equivalent: ${escapeHtml(parsed.enharmonic)}</div>`:''}<h4>Notes</h4><div class="detail-notes">${noteNames.map(escapeHtml).join(' – ')||'Choose at least two notes'}</div><h4>Intervals</h4><div class="detail-grid">${intervals.map((n,i)=>`<span>${escapeHtml(INTERVAL_NAMES[n]||'Colour tone')}</span><strong>${escapeHtml(noteNames[i]||noteNameFor((rootPc+n)%12))}</strong>`).join('')}</div><h4>Similar chords</h4><div class="similar-list">${similar.map(name=>`<button data-result-name="${name}">${name}</button>`).join('')}</div><div class="studio-actions"><button class="ghost" id="previewStudioChord">▶ Preview</button><button class="primary" id="useStudioChord">${studioMode==='replace'?'Replace Chord':'Add to Progression'}</button></div>${studioMode==='replace'?`<div class="progression-tools"><button class="ghost" data-progression-action="duplicate">Duplicate</button><button class="ghost" data-progression-action="rename">Rename</button><button class="ghost" data-progression-action="delete">Delete</button></div>`:''}</div>`;
  }

  function fretboardHtml() {
    const data = notesFromFrets(builderFrets);
    const detected = detectNotes(data.pitchClasses,data.bassPc);
    const controls = builderFrets.map((selected,string)=>`<div class="string-control"><strong>${STRING_NAMES[string]}</strong><button class="string-state ${selected<0?'muted':selected===0?'open':'fretted'}" data-string-state="${string}" aria-label="Set ${STRING_NAMES[string]} ${selected<0?'open':'muted'}">${selected<0?'X':selected===0?'O':'●'}</button></div>`).join('');
    const rows = Array.from({length:12},(_,index)=>{const fret=index+1;return`<span class="fret-number">${fret}</span>${builderFrets.map((selected,string)=>`<button class="fret-cell ${fret===1?'nut':''}" data-string="${string}" data-fret="${fret}" aria-label="${STRING_NAMES[string]} fret ${fret}">${selected===fret?`<span class="fret-dot">${fret}</span>`:''}</button>`).join('')}`}).join('');
    const options = detected.map((d,i)=>`<button class="search-result ${i===0?'active':''}" data-detected="${escapeHtml(d.name)}"><div><strong>${escapeHtml(d.name)}</strong><span>${d.exact?'Exact note match':'Possible interpretation'}</span></div><span>${i===0?'MOST LIKELY':''}</span></button>`).join('');
    return `<div class="fret-builder"><div class="string-controls"><span></span>${controls}</div><div class="fretboard-window"><div class="fretboard-grid">${rows}</div></div><p class="fret-help">Tap a fret to place a dot. Tap the same dot again for an open string. Use the marker above each string to switch between X and O.</p></div><div class="builder-summary"><strong>Voicing</strong> ${builderFrets.map(f=>f<0?'X':f).join(' – ')}<br><strong>Notes</strong> ${data.pitchClasses.map(noteNameFor).join(' – ')||'Select open strings or frets'}</div><h4 style="font-size:.72rem;color:var(--muted)">LIVE DETECTION</h4><div class="search-results">${options||'<div class="empty-studio">Select at least two different notes. If no theory name fits, you can still name and use the exact voicing.</div>'}</div><div class="field custom-name"><label for="builderCustomName">Custom name (optional)</label><input class="control" id="builderCustomName" value="${escapeHtml(builderName)}" placeholder="e.g. Kenta Chord"></div><div class="studio-actions"><button class="ghost" id="clearFretboard">Clear</button><button class="ghost" id="saveBuilderChord">Save to My Chords</button><button class="primary" id="useBuilderChord" ${data.pitchClasses.length<2?'disabled':''}>Use Chord</button></div>`;
  }

  function notesHtml() {
    const notes = parseManualNotes(manualInput);
    const pitchClasses = notes.map(n=>n.pc);
    const found = detectNotes(pitchClasses,notes[0]?.pc);
    return `<div class="field"><label for="manualChordNotes">Enter notes</label><input class="control manual-notes" id="manualChordNotes" value="${escapeHtml(manualInput)}" placeholder="C E G Bb D" autocomplete="off"><div class="manual-example">Spaces or commas work. Optional octaves are supported: E2 G3 C4.</div></div><h4 style="font-size:.72rem;color:var(--muted);margin-top:18px">POSSIBLE INTERPRETATIONS</h4><div class="search-results">${found.map((d,i)=>`<button class="search-result ${i===0?'active':''}" data-manual-detected="${escapeHtml(d.name)}"><div><strong>${escapeHtml(d.name)}</strong><span>${d.parsed.noteNames.join(' – ')}</span></div><span>${i===0?'MOST LIKELY':''}</span></button>`).join('')||'<div class="empty-studio">Enter at least two valid notes to analyze them.</div>'}</div><div class="field custom-name"><label for="manualCustomName">Custom name (optional)</label><input class="control" id="manualCustomName" placeholder="Name it your way"></div><div class="studio-actions"><button class="ghost" id="saveManualChord" ${notes.length<2?'disabled':''}>Save to My Chords</button><button class="primary" id="useManualChord" ${notes.length<2?'disabled':''}>Use Chord</button></div>`;
  }

  function savedHtml() {
    const saved = loadSaved();
    return `<div class="saved-chords">${saved.map((c,i)=>`<article class="saved-chord"><strong>${escapeHtml(c.name)}</strong><small>${(c.noteNames||[]).map(escapeHtml).join(' – ')||'Custom voicing'}${c.voicing?'<br>'+c.voicing.map(f=>f<0?'X':f).join(' – '):''}</small><div class="studio-actions"><button class="ghost" data-saved-use="${i}">Use</button><button class="ghost" data-saved-edit="${i}">Edit shape</button><button class="ghost" data-saved-delete="${i}">Remove</button></div></article>`).join('')||'<div class="empty-studio">No saved chords yet. Build a fretboard shape or enter notes, then save it here.</div>'}</div>`;
  }

  function renderStudio(query) {
    const existingQuery = query ?? document.querySelector('#smartChordSearch')?.value ?? '';
    const pane = activeTab === 'search' ? `<div class="studio-pane active"><div class="search-wrap"><input class="control chord-search" id="smartChordSearch" value="${escapeHtml(existingQuery)}" placeholder="Search for any chord…" autocomplete="off" spellcheck="false"><div class="search-hint">Try Cmaj9/E, F# minor 7, CΔ7, G13sus4—or type imperfect notation.</div></div><div id="liveChordResults">${renderSearch(existingQuery)}</div></div>` : activeTab === 'fretboard' ? `<div class="studio-pane active">${fretboardHtml()}</div>` : activeTab === 'notes' ? `<div class="studio-pane active">${notesHtml()}</div>` : `<div class="studio-pane active">${savedHtml()}</div>`;
    document.querySelector('#chordStudioBody').innerHTML = `<section class="chord-workspace"><div class="studio-tabs"><button class="${activeTab==='search'?'active':''}" data-studio-tab="search">Search</button><button class="${activeTab==='fretboard'?'active':''}" data-studio-tab="fretboard">Build on Fretboard</button><button class="${activeTab==='notes'?'active':''}" data-studio-tab="notes">Enter Notes</button><button class="${activeTab==='saved'?'active':''}" data-studio-tab="saved">My Chords</button></div>${pane}</section><aside class="chord-sidebar" id="chordDetail">${detailHtml(selectedChord)}</aside>`;
    if (activeTab === 'search') requestAnimationFrame(()=>{const input=document.querySelector('#smartChordSearch');input?.focus();input?.setSelectionRange(input.value.length,input.value.length)});
  }

  function openStudio(mode='add',index=-1,tab='search') {
    studioMode = mode; editIndex = index; activeTab = tab; activeResult = 0;
    selectedChord = mode === 'replace' && current()[index] ? current()[index] : null;
    builderFrets = selectedChord?.voicing ? [...selectedChord.voicing] : [-1,-1,-1,-1,-1,-1];
    builderName = selectedChord?.isCustom ? selectedChord.name : '';
    manualInput = selectedChord?.noteNames?.join(' ') || '';
    document.querySelector('#chordStudioTitle').textContent = mode === 'replace' ? `Edit Chord ${index+1}` : 'Add Chord';
    renderStudio(mode === 'replace' && !selectedChord?.isCustom ? selectedChord?.theoreticalName || selectedChord?.name : '');
    if (!studio.open) studio.showModal();
  }

  function selectedFromName(name) {
    const saved = loadSaved().find(c=>c.name===name);
    selectedChord = saved || parseChord(name);
    document.querySelector('#chordDetail').innerHTML = detailHtml(selectedChord);
  }

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem('stagewrite-custom-chords') || '[]'); } catch { return []; }
  }

  function saveCustom(chord) {
    const saved = loadSaved();
    const existing = saved.findIndex(c=>c.name===chord.name);
    if (existing >= 0) saved[existing] = chord; else saved.unshift(chord);
    localStorage.setItem('stagewrite-custom-chords',JSON.stringify(saved.slice(0,80)));
    toast(`${chord.name} saved to My Chords`);
  }

  function builderChord() {
    const data = notesFromFrets(builderFrets);
    const detected = detectNotes(data.pitchClasses,data.bassPc)[0];
    const parsed = detected?.parsed || {name:null,rootPc:data.pitchClasses[0],bassPc:data.bassPc,pitchClasses:data.pitchClasses,noteNames:data.pitchClasses.map(noteNameFor),status:'custom'};
    parsed.pitchClasses = data.pitchClasses; parsed.noteNames = data.pitchClasses.map(noteNameFor); parsed.bassPc = data.bassPc;
    return progressionChord(parsed,{customName:builderName.trim()||null,voicing:builderFrets,midiNotes:data.midi});
  }

  function manualChord() {
    const notes = parseManualNotes(manualInput);
    const detection = detectNotes(notes.map(n=>n.pc),notes[0]?.pc)[0];
    const customName = document.querySelector('#manualCustomName')?.value.trim();
    const parsed = detection?.parsed || {name:null,rootPc:notes[0]?.pc,bassPc:notes[0]?.pc,pitchClasses:[...new Set(notes.map(n=>n.pc))],noteNames:[...new Set(notes.map(n=>n.name))],status:'custom'};
    parsed.pitchClasses = [...new Set(notes.map(n=>n.pc))]; parsed.noteNames = [...new Set(notes.map(n=>n.name))]; parsed.bassPc = notes[0]?.pc;
    return progressionChord(parsed,{customName:customName||null,midiNotes:notes.every(n=>n.midi!=null)?notes.map(n=>n.midi):null});
  }

  document.querySelector('#addChordBtn').addEventListener('click',()=>openStudio('add'));
  document.querySelector('#closeChordStudio').addEventListener('click',()=>studio.close());
  document.querySelector('#progression').addEventListener('click',event=>{
    if(event.target.closest('[data-hear],[data-diagram],[data-lock],[data-duration]'))return;
    const card=event.target.closest('[data-chord]');if(!card)return;
    event.preventDefault();event.stopImmediatePropagation();
    const index=+card.dataset.chord;state.selected=index;
    if(state.playing||state.paused)seekToChord(index);else{state.current=index;state.playheadStep=chordStartStep(index);openStudio('replace',index)}
  },true);
  document.querySelector('#progression').addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key)||!event.target.classList.contains('chord'))return;
    event.preventDefault();event.stopImmediatePropagation();openStudio('replace',+event.target.dataset.chord);
  },true);
  document.querySelector('#chordStudioBody').addEventListener('input',event=>{
    if (event.target.id === 'smartChordSearch') {
      activeResult = 0;
      document.querySelector('#liveChordResults').innerHTML = renderSearch(event.target.value);
      const parsed = parseChord(event.target.value);
      selectedChord = ['recognized','interpreted'].includes(parsed.status) ? parsed : null;
      document.querySelector('#chordDetail').innerHTML = detailHtml(selectedChord);
    }
    if (event.target.id === 'builderCustomName') builderName = event.target.value;
    if (event.target.id === 'manualChordNotes') { manualInput = event.target.value; renderStudio(); }
  });
  document.querySelector('#chordStudioBody').addEventListener('keydown',event=>{
    if (event.target.id !== 'smartChordSearch') return;
    const buttons = [...document.querySelectorAll('#liveChordResults [data-result-name]')];
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); activeResult = Math.max(0,Math.min(buttons.length-1,activeResult+(event.key==='ArrowDown'?1:-1)));
      buttons.forEach((b,i)=>b.classList.toggle('active',i===activeResult)); buttons[activeResult]?.scrollIntoView({block:'nearest'});
    } else if (event.key === 'Enter' && buttons.length) { event.preventDefault(); buttons[activeResult]?.click(); }
  });
  document.querySelector('#chordStudioBody').addEventListener('click',async event=>{
    const tab = event.target.closest('[data-studio-tab],[data-tab-jump]');
    if (tab) { activeTab = tab.dataset.studioTab || tab.dataset.tabJump; renderStudio(); return; }
    const result = event.target.closest('[data-result-name]');
    if (result) { selectedFromName(result.dataset.resultName); return; }
    const stringState = event.target.closest('[data-string-state]');
    if (stringState) { const string=+stringState.dataset.stringState;builderFrets[string]=builderFrets[string]<0?0:-1;renderStudio();return; }
    const fret = event.target.closest('[data-string][data-fret]');
    if (fret) { const string=+fret.dataset.string,value=+fret.dataset.fret;builderFrets[string]=builderFrets[string]===value?0:value;renderStudio();return; }
    const detected = event.target.closest('[data-detected]');
    if (detected) { selectedChord = parseChord(detected.dataset.detected); document.querySelector('#chordDetail').innerHTML=detailHtml(selectedChord); return; }
    const manualDetected = event.target.closest('[data-manual-detected]');
    if (manualDetected) { selectedChord = parseChord(manualDetected.dataset.manualDetected); document.querySelector('#chordDetail').innerHTML=detailHtml(selectedChord); return; }
    if (event.target.id === 'clearFretboard') { builderFrets=[-1,-1,-1,-1,-1,-1];builderName='';renderStudio();return; }
    if (event.target.id === 'useBuilderChord') { addOrReplace(builderChord()); return; }
    if (event.target.id === 'saveBuilderChord') { const chord=builderChord();saveCustom(chord);activeTab='saved';renderStudio();return; }
    if (event.target.id === 'useManualChord') { addOrReplace(manualChord()); return; }
    if (event.target.id === 'saveManualChord') { const chord=manualChord();saveCustom(chord);activeTab='saved';renderStudio();return; }
    if (event.target.id === 'useStudioChord' && selectedChord) { addOrReplace(selectedChord.id?selectedChord:progressionChord(selectedChord)); return; }
    if (event.target.id === 'previewStudioChord' && selectedChord) {
      const chord = selectedChord.id ? selectedChord : progressionChord(selectedChord);
      await APP.previewChord(chord); toast(`${chord.name} preview`); return;
    }
    const savedUse = event.target.closest('[data-saved-use]');
    if (savedUse) { addOrReplace({...loadSaved()[+savedUse.dataset.savedUse],id:uid()}); return; }
    const savedEdit = event.target.closest('[data-saved-edit]');
    if (savedEdit) { const chord=loadSaved()[+savedEdit.dataset.savedEdit];selectedChord=chord;builderFrets=chord.voicing?[...chord.voicing]:[-1,-1,-1,-1,-1,-1];builderName=chord.name;activeTab='fretboard';renderStudio();return; }
    const savedDelete = event.target.closest('[data-saved-delete]');
    if (savedDelete) { const saved=loadSaved();saved.splice(+savedDelete.dataset.savedDelete,1);localStorage.setItem('stagewrite-custom-chords',JSON.stringify(saved));renderStudio();return; }
    const action = event.target.closest('[data-progression-action]')?.dataset.progressionAction;
    if (action === 'duplicate') { const copy=JSON.parse(JSON.stringify(current()[editIndex]));copy.id=uid();current().splice(editIndex+1,0,copy);state.length=current().length;generateBass();render();studio.close();toast('Chord duplicated'); }
    if (action === 'delete') { current().splice(editIndex,1);state.length=current().length;state.selected=-1;generateBass();render();studio.close();toast('Chord removed'); }
    if (action === 'rename') { const chord=current()[editIndex],name=prompt('Custom chord name',chord.name);if(name?.trim()){chord.name=name.trim();chord.isCustom=true;render();renderStudio();toast('Custom name preserved');} }
  });

  sections.forEach(section=>state.progressions[section].forEach(chord=>{chord.id=chord.id||uid()}));
  [...document.querySelectorAll('.version')].filter(node=>node.textContent.includes('V1.4.1')).forEach(node=>node.textContent=node.textContent.replace('V1.4.1','V1.4.2'));
  render();
})();
