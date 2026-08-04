(() => {
  'use strict';

  const D = window.KOINE_DATA || {};
  const app = document.getElementById('app');
  const nav = document.getElementById('mainNav');
  const menuButton = document.getElementById('menuButton');

  const DEFAULT_STATE = {
    completed: {},
    quizScores: {},
    vocab: {},
    notes: {},
    xp: 0,
    streak: 0,
    lastVisit: null,
    gameScores: [],
    lastLesson: null,
  };

  function loadState() {
    try {
      const raw = localStorage.getItem('tanos-koine-progress-v1');
      return { ...DEFAULT_STATE, ...(raw ? JSON.parse(raw) : {}) };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem('tanos-koine-progress-v1', JSON.stringify(state));
  }

  function updateStreak() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const last = state.lastVisit ? new Date(state.lastVisit) : null;
    if (last) last.setHours(0,0,0,0);
    const diff = last ? Math.round((today - last) / 86400000) : null;
    if (diff === null) state.streak = 1;
    else if (diff === 1) state.streak = Math.max(1, (state.streak || 0) + 1);
    else if (diff > 1) state.streak = 1;
    state.lastVisit = new Date().toISOString();
    saveState();
  }

  updateStreak();

  function esc(value='') {
    return String(value)
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function attr(value='') { return esc(value); }
  function lessonBySlug(slug) { return (D.lessons || []).find(x => x.slug === slug); }
  function trackById(id) { return (D.tracks || []).find(x => x.id === id); }
  function vocabById(id) { return (D.vocabulary || []).find(x => x.id === id); }
  function completedCount() { return Object.values(state.completed || {}).filter(Boolean).length; }
  function percentage() { return D.lessons?.length ? Math.round(completedCount() / D.lessons.length * 100) : 0; }

  function toast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  function go(path) {
    history.pushState({}, '', path);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-link]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#')) return;
    e.preventDefault();
    nav.classList.remove('open');
    go(href);
  });
  window.addEventListener('popstate', render);
  menuButton.addEventListener('click', () => nav.classList.toggle('open'));

  function setActiveNav(path) {
    nav.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', href === '/' ? path === '/' : path.startsWith(href));
    });
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return toast('Speech is not supported in this browser.');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const greek = voices.find(v => /^el/i.test(v.lang));
    if (greek) u.voice = greek;
    u.lang = greek?.lang || 'el-GR';
    u.rate = 0.78;
    speechSynthesis.speak(u);
  }

  function home() {
    const done = completedCount();
    const last = state.lastLesson ? lessonBySlug(state.lastLesson) : null;
    return `
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Biblical Greek • Beginner to Scholar</span>
          <h1>Read the New Testament <span>in its original language.</span></h1>
          <p>Learn Koine Greek through clear lessons, English-to-Greek comparisons, pronunciation practice, vocabulary, parsing, real New Testament readings, assignments and quizzes.</p>
          <div class="actions">
            <a class="btn primary" href="${last ? `/learn/${last.slug}` : '/learn'}" data-link>${last ? 'Continue learning' : 'Start the course'}</a>
            <a class="btn" href="/alphabet" data-link>Open alphabet lab</a>
          </div>
          <div class="stats">
            <div class="stat"><strong>${done}/${D.lessons.length}</strong><span>Lessons completed</span></div>
            <div class="stat"><strong>${percentage()}%</strong><span>Course progress</span></div>
            <div class="stat"><strong>${state.xp || 0}</strong><span>Experience points</span></div>
            <div class="stat"><strong>${state.streak || 1}</strong><span>Day streak</span></div>
          </div>
        </div>
        <aside class="hero-side">
          <div class="quote greek">Ἐν ἀρχῇ ἦν ὁ λόγος</div>
          <p class="quote-translation">“In the beginning was the Word.” — John 1:1</p>
          <div class="progress"><span style="width:${percentage()}%"></span></div>
          <p class="muted" style="text-align:center">${percentage()}% of the full course completed</p>
        </aside>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>Four learning tracks</h2><p>Move from alphabet and pronunciation to scholarly reading and research.</p></div></div>
        <div class="grid four">
          ${D.tracks.map(track => {
            const lessons = D.lessons.filter(l => l.trackId === track.id);
            const trackDone = lessons.filter(l => state.completed[l.slug]).length;
            return `<article class="panel hover track-card">
              <span class="tag gold">${trackDone}/${lessons.length} complete</span>
              <div class="greek">${esc(track.greekName)}</div>
              <h3>${esc(track.name)}</h3>
              <p><strong>${esc(track.tagline)}</strong></p>
              <p>${esc(track.description)}</p>
              <div class="progress"><span style="width:${lessons.length ? trackDone/lessons.length*100 : 0}%"></span></div>
              <div class="actions"><a class="btn small" href="/learn?track=${track.id}" data-link>View lessons</a></div>
            </article>`;
          }).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>Practice every skill</h2><p>Read, hear, remember, parse and apply.</p></div></div>
        <div class="grid three">
          ${[
            ['/vocabulary','Vocabulary','Study 148 high-frequency words with search and review.'],
            ['/flashcards','Flashcards','Use browser-saved review ratings to build long-term memory.'],
            ['/parsing','Parsing Gym','Identify noun and verb forms from the actual course data.'],
            ['/reader','Interlinear Reader','Read Greek passages word by word with parsing help.'],
            ['/library','Video Library','Use curated Biblical Greek lectures and playlists.'],
            ['/games','Learning Games','Turn vocabulary and morphology practice into quick challenges.'],
          ].map(([url,title,text]) => `<a class="panel hover" href="${url}" data-link><h3>${title}</h3><p class="muted">${text}</p><span class="tag sky">Open</span></a>`).join('')}
        </div>
      </section>`;
  }

  function learnPage() {
    const params = new URLSearchParams(location.search);
    const selected = params.get('track');
    const tracks = selected ? D.tracks.filter(t => t.id === selected) : D.tracks;
    return `<section class="page-head"><span class="eyebrow">Course curriculum</span><h1>Lessons</h1><p>${D.lessons.length} lessons arranged from beginner foundations to scholarly study.</p></section>
      <div class="toolbar">
        <a class="btn small ${!selected ? 'primary' : ''}" href="/learn" data-link>All tracks</a>
        ${D.tracks.map(t => `<a class="btn small ${selected===t.id?'primary':''}" href="/learn?track=${t.id}" data-link>${esc(t.name)}</a>`).join('')}
      </div>
      ${tracks.map(track => {
        const lessons = D.lessons.filter(l => l.trackId === track.id);
        return `<section class="section">
          <div class="section-head"><div><span class="tag gold">${esc(track.greekName)}</span><h2>${esc(track.name)}</h2><p>${esc(track.tagline)}</p></div></div>
          <div class="grid two">${lessons.map((l,i) => lessonCard(l,i)).join('')}</div>
        </section>`;
      }).join('')}`;
  }

  function lessonCard(l, i) {
    const done = !!state.completed[l.slug];
    return `<article class="panel hover lesson-card">
      <div class="lesson-index">Lesson ${i+1} • ${l.minutes} min</div>
      <div class="lesson-meta"><span class="tag ${done?'green':'gold'}">${done?'Completed':'Not completed'}</span><span class="tag">${esc(l.kind)}</span></div>
      <h3><span class="greek">${esc(l.greekTitle)}</span><br>${esc(l.title)}</h3>
      <p>${esc(l.summary)}</p>
      <div class="actions"><a class="btn small ${done?'':'primary'}" href="/learn/${l.slug}" data-link>${done?'Review lesson':'Open lesson'}</a></div>
    </article>`;
  }

  function renderGrammarTable(table) {
    if (!table) return '';
    return `<div class="table-wrap"><table><caption style="padding:12px;text-align:left;color:#f7d277">${esc(table.caption||'')}</caption><thead><tr>${table.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function lessonPage(slug) {
    const lesson = lessonBySlug(slug);
    if (!lesson) return notFound();
    state.lastLesson = slug; saveState();
    const track = trackById(lesson.trackId);
    const idx = D.lessons.findIndex(l => l.slug === slug);
    const prev = D.lessons[idx-1], next = D.lessons[idx+1];
    const guide = D.deepGuides?.[slug];
    const assignments = D.assignments?.[slug] || [];
    const cards = D.lessonCards?.[slug] || [];
    const voc = lesson.vocabIds.map(vocabById).filter(Boolean);
    const done = !!state.completed[slug];
    return `<section class="lesson-layout">
      <aside class="panel lesson-sidebar">
        <span class="tag gold">${esc(track?.name || '')}</span>
        <p class="muted">Lesson ${idx+1} of ${D.lessons.length}</p>
        <button class="active" data-tab="overview">Overview</button>
        <button data-tab="guide">Deep guide</button>
        <button data-tab="vocab">Vocabulary</button>
        <button data-tab="quiz">Quiz</button>
        <button data-tab="assignments">Assignments</button>
        <button data-tab="notes">My notes</button>
        <div class="actions"><button id="completeLesson" class="btn ${done?'success':'primary'}">${done?'✓ Completed':'Mark complete'}</button></div>
      </aside>
      <article class="panel content">
        <span class="tag">${lesson.minutes} minutes</span>
        <div class="lesson-greek greek">${esc(lesson.greekTitle)}</div>
        <h1 class="lesson-title">${esc(lesson.title)}</h1>
        <p class="muted">${esc(lesson.summary)}</p>
        <div class="tabs">
          <button class="tab active" data-tab="overview">Overview</button>
          <button class="tab" data-tab="guide">Deep guide</button>
          <button class="tab" data-tab="vocab">Vocabulary</button>
          <button class="tab" data-tab="quiz">Quiz</button>
          <button class="tab" data-tab="assignments">Assignments</button>
          <button class="tab" data-tab="notes">Notes</button>
        </div>

        <section class="tab-panel active" data-panel="overview">
          <h2>Learning objectives</h2><ul>${lesson.objectives.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
          ${lesson.videos?.length ? `<h2>Recommended videos</h2><div class="grid two">${lesson.videos.map(v => `<article class="panel"><span class="tag sky">${esc(v.channel)}</span><h3>${esc(v.title)}</h3><p class="muted">${esc(v.note)}</p><a class="btn small" target="_blank" rel="noopener" href="https://www.youtube.com/${v.kind==='playlist'?'playlist?list=':'watch?v='}${encodeURIComponent(v.id)}">Watch video ↗</a></article>`).join('')}</div>`:''}
          ${lesson.listening?.length ? `<h2>Listen and repeat</h2>${lesson.listening.map(x => `<div class="audio-row"><div><div class="greek">${esc(x.greek)}</div><small>${esc(x.translit||'')} • ${esc(x.gloss)}</small></div><button class="btn small speak" data-speak="${attr(x.greek)}">▶ Speak</button></div>`).join('')}`:''}
          <h2>Grammar and explanation</h2>
          ${lesson.grammar.map(g => `<section><h3>${esc(g.heading)}</h3>${g.body.map(p=>`<p>${esc(p)}</p>`).join('')}${renderGrammarTable(g.table)}${g.tip?`<div class="callout"><strong>Study tip:</strong> ${esc(g.tip)}</div>`:''}</section>`).join('')}
          ${lesson.reading ? `<h2>${esc(lesson.reading.ref)}</h2><p>${esc(lesson.reading.intro)}</p>${lesson.reading.verses.map(v=>`<div class="audio-row"><div><div class="greek">${esc(v.greek)}</div><small>${esc(v.english)}</small></div><button class="btn small speak" data-speak="${attr(v.greek)}">▶ Speak</button></div>`).join('')}`:''}
        </section>

        <section class="tab-panel" data-panel="guide">${guide ? renderGuide(guide) : '<div class="empty">No deep guide is available for this lesson yet.</div>'}</section>
        <section class="tab-panel" data-panel="vocab"><h2>Lesson vocabulary</h2><div class="vocab-grid">${voc.map(v=>vocabCard(v)).join('')}</div>${cards.length?`<h2>Lesson concept cards</h2><div class="grid two">${cards.map(c=>`<div class="panel"><div class="greek" style="font-size:25px">${esc(c.front)}</div><h3>${esc(c.back)}</h3><p class="muted">${esc(c.hint||'')}</p></div>`).join('')}</div>`:''}</section>
        <section class="tab-panel" data-panel="quiz">${renderQuiz(lesson)}</section>
        <section class="tab-panel" data-panel="assignments">${renderAssignments(assignments)}</section>
        <section class="tab-panel" data-panel="notes"><h2>My notes</h2><p class="muted">These notes are saved privately in this browser.</p><textarea id="lessonNotes" class="textarea" placeholder="Write your observations, questions and translation notes...">${esc(state.notes[slug]||'')}</textarea><div class="actions"><button id="saveNotes" class="btn primary">Save notes</button></div></section>

        <div class="actions" style="justify-content:space-between;margin-top:35px">
          ${prev?`<a class="btn" href="/learn/${prev.slug}" data-link>← ${esc(prev.title)}</a>`:'<span></span>'}
          ${next?`<a class="btn primary" href="/learn/${next.slug}" data-link>${esc(next.title)} →</a>`:''}
        </div>
      </article>
    </section>`;
  }

  function renderGuide(guide) {
    return `<h2>Deep learning guide</h2><p>${esc(guide.intro||'')}</p>${(guide.sections||[]).map(s=>`<section><h2>${esc(s.title)}</h2>${s.subtitle?`<p class="muted"><strong>${esc(s.subtitle)}</strong></p>`:''}${(s.body||[]).map(p=>`<p>${esc(p)}</p>`).join('')}${(s.englishVsGreek||[]).length?`<div class="grid two">${s.englishVsGreek.map(x=>`<div class="panel"><strong>${esc(x.english)}</strong><div class="greek" style="font-size:22px;margin:8px 0">${esc(x.greek)}</div><p class="muted">${esc(x.whyItMatters)}</p></div>`).join('')}</div>`:''}${(s.examples||[]).map(x=>`<div class="callout"><div class="greek" style="font-size:24px">${esc(x.greek)}</div><p><strong>Literal:</strong> ${esc(x.literal)}</p><p><strong>Natural:</strong> ${esc(x.natural)}</p><p>${esc(x.breakdown)}</p></div>`).join('')}${(s.thinkLikeGreek||[]).length?`<h3>Think like Greek</h3><ul>${s.thinkLikeGreek.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${s.memoryTrick?`<div class="callout"><strong>Memory trick:</strong> ${esc(s.memoryTrick)}</div>`:''}</section>`).join('')}`;
  }

  function renderQuiz(lesson) {
    const prior = state.quizScores[lesson.slug];
    return `<h2>Lesson quiz</h2><p class="muted">Choose one answer for each question, then submit.</p>
      <form id="quizForm" data-slug="${attr(lesson.slug)}">
        ${lesson.quiz.map((q,i)=>`<div class="quiz-item"><h4>${i+1}. ${esc(q.prompt)}</h4>${q.greek?`<div class="greek" style="font-size:24px;margin-bottom:10px">${esc(q.greek)}</div>`:''}${q.options.map((o,j)=>`<label class="option"><input type="radio" name="q${i}" value="${j}"> ${esc(o)}</label>`).join('')}<div id="feedback${i}"></div></div>`).join('')}
        <button class="btn primary" type="submit">Check answers</button>
      </form>${prior!=null?`<p class="callout">Best saved score: ${prior}%</p>`:''}`;
  }

  function renderAssignments(items) {
    if (!items.length) return '<div class="empty">No assignments are available for this lesson yet.</div>';
    return `<h2>Practice assignments</h2>${items.map(a=>`<article class="panel" style="margin:14px 0"><div class="lesson-meta"><span class="tag gold">${esc(a.tier)}</span><span class="tag">${esc(a.kind)}</span><span class="tag green">${a.xp} XP</span></div><h3>${esc(a.title)}</h3><p>${esc(a.instruction)}</p><div class="callout"><strong>English bridge:</strong> ${esc(a.englishBridge)}</div><h4>Tasks</h4><ol>${a.tasks.map(t=>`<li>${esc(t.prompt)}${t.hint?`<div class="muted">Hint: ${esc(t.hint)}</div>`:''}</li>`).join('')}</ol><details><summary class="btn small">Show model answers</summary>${a.modelAnswers.map(m=>`<p><strong>${esc(m.answer)}</strong><br><span class="muted">${esc(m.note)}</span></p>`).join('')}</details><h4>Rubric</h4><ul>${a.rubric.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></article>`).join('')}`;
  }

  function setupLesson(slug) {
    document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
      const name = btn.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));
      document.querySelectorAll('[data-panel]').forEach(x=>x.classList.toggle('active',x.dataset.panel===name));
    }));
    document.querySelectorAll('.speak').forEach(btn=>btn.addEventListener('click',()=>speak(btn.dataset.speak)));
    document.getElementById('completeLesson')?.addEventListener('click', () => {
      const was = !!state.completed[slug];
      state.completed[slug] = !was;
      if (!was) state.xp = (state.xp || 0) + 20;
      saveState(); toast(!was ? 'Lesson completed! +20 XP' : 'Lesson marked incomplete'); render();
    });
    document.getElementById('saveNotes')?.addEventListener('click',()=>{
      state.notes[slug] = document.getElementById('lessonNotes').value;
      saveState(); toast('Notes saved');
    });
    document.getElementById('quizForm')?.addEventListener('submit',(e)=>{
      e.preventDefault(); const lesson=lessonBySlug(slug); let correct=0;
      lesson.quiz.forEach((q,i)=>{
        const selected=e.currentTarget.querySelector(`input[name="q${i}"]:checked`);
        const box=document.getElementById(`feedback${i}`);
        if(selected && Number(selected.value)===q.answer){correct++;box.className='feedback ok';box.textContent='Correct. '+q.explain;}
        else{box.className='feedback bad';box.textContent='Not correct. '+q.explain;}
      });
      const score=Math.round(correct/lesson.quiz.length*100);
      if ((state.quizScores[slug]??-1) < score) state.quizScores[slug]=score;
      state.xp=(state.xp||0)+correct*5; saveState(); toast(`Quiz score: ${score}%`);
    });
  }

  function vocabCard(v) {
    const mastery = state.vocab[v.id] || 0;
    return `<article class="panel vocab-card"><div class="greek">${esc(v.lemma)}</div><h3>${esc(v.gloss)}</h3><p>${esc(v.translit||'')}</p><p>${esc(v.pos)} • frequency ${Number(v.frequency||0).toLocaleString()}</p><div class="progress"><span style="width:${Math.min(100,mastery*25)}%"></span></div><div class="actions"><button class="btn small speak" data-speak="${attr(v.lemma)}">▶ Speak</button></div></article>`;
  }

  function alphabetPage() {
    return `<section class="page-head"><span class="eyebrow">Alphabet lab</span><h1>The 24 Greek letters</h1><p>Click any letter to hear it and study its forms, sounds and example word.</p></section>
      <div class="alphabet-grid">${D.alphabet.map((l,i)=>`<article class="panel hover letter-card" data-letter="${i}"><div class="letters greek">${esc(l.upper)} ${esc(l.lower)}</div><strong>${esc(l.name)}</strong><small>${esc(l.translit)} • ${esc(l.type)}</small></article>`).join('')}</div>
      <section id="letterDetail" class="section panel"></section>
      <section class="section"><div class="section-head"><div><h2>Diphthongs</h2><p>Common two-vowel combinations.</p></div></div><div class="grid three">${(D.diphthongs||[]).map(d=>`<div class="panel"><div class="greek" style="font-size:30px">${esc(d.form||d.greek||'')}</div><h3>${esc(d.name||d.translit||'')}</h3><p class="muted">${esc(d.erasmian||d.sound||d.koine||'')}</p></div>`).join('')}</div></section>`;
  }

  function showLetter(i) {
    const l=D.alphabet[i]; if(!l)return;
    const box=document.getElementById('letterDetail');
    box.innerHTML=`<div class="grid two"><div><span class="tag gold">Letter ${i+1}</span><div class="greek" style="font-size:84px">${esc(l.upper)} ${esc(l.lower)}</div><h2>${esc(l.greekName)} — ${esc(l.name)}</h2><p>Transliteration: <strong>${esc(l.translit)}</strong></p><button class="btn primary" id="speakLetter">▶ Hear ${esc(l.name)}</button></div><div><h3>Pronunciation</h3><p><strong>Erasmian:</strong> ${esc(l.erasmian)}</p><p><strong>Koine:</strong> ${esc(l.koine)}</p><p><strong>Modern:</strong> ${esc(l.modern)}</p><h3>Example</h3><div class="greek" style="font-size:32px">${esc(l.example)}</div><p>${esc(l.exampleGloss)}</p><p class="muted">Ancient numeric value: ${esc(l.numeric)}</p></div></div>`;
    document.getElementById('speakLetter').addEventListener('click',()=>speak(`${l.greekName}. ${l.example}`));
  }

  function setupAlphabet(){document.querySelectorAll('[data-letter]').forEach(x=>x.addEventListener('click',()=>showLetter(Number(x.dataset.letter))));showLetter(0);}

  function vocabularyPage() {
    return `<section class="page-head"><span class="eyebrow">Word bank</span><h1>Vocabulary</h1><p>${D.vocabulary.length} high-frequency words from the course.</p></section>
      <div class="toolbar"><div class="field" style="flex:1;min-width:240px"><label>Search</label><input id="vocabSearch" class="input" placeholder="Greek, English, part of speech..."></div><div class="field" style="min-width:180px"><label>Level</label><select id="vocabLevel" class="select"><option value="">All levels</option>${D.tracks.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div></div>
      <div id="vocabResults" class="vocab-grid"></div>`;
  }

  function setupVocabulary() {
    const search=document.getElementById('vocabSearch'), level=document.getElementById('vocabLevel'), results=document.getElementById('vocabResults');
    const draw=()=>{const q=search.value.toLowerCase().trim(),lv=level.value;const list=D.vocabulary.filter(v=>(!lv||v.level===lv)&&(!q||`${v.lemma} ${v.translit} ${v.gloss} ${v.pos} ${v.detail}`.toLowerCase().includes(q)));results.innerHTML=list.map(vocabCard).join('')||'<div class="empty">No vocabulary items match your search.</div>';results.querySelectorAll('.speak').forEach(b=>b.addEventListener('click',()=>speak(b.dataset.speak)));};
    search.addEventListener('input',draw);level.addEventListener('change',draw);draw();
  }

  let flashIndex=0, flashBack=false;
  function flashcardsPage() {
    return `<section class="page-head"><span class="eyebrow">Spaced review</span><h1>Flashcards</h1><p>Click the card to reveal the answer, then rate how well you remembered it.</p></section><div id="flashArea"></div>`;
  }
  function drawFlash(){
    const list=[...D.vocabulary].sort((a,b)=>(state.vocab[a.id]||0)-(state.vocab[b.id]||0));
    if(flashIndex>=list.length)flashIndex=0;const v=list[flashIndex];
    const area=document.getElementById('flashArea'); if(!area)return;
    area.innerHTML=`<div class="panel flashcard" id="flashCard">${flashBack?`<div><div class="back">${esc(v.gloss)}</div><div class="detail">${esc(v.pos)} • ${esc(v.detail||'')}</div><div class="greek" style="font-size:28px;margin-top:18px">${esc(v.lemma)}</div></div>`:`<div><div class="front greek">${esc(v.lemma)}</div><div class="detail">${esc(v.translit||'')}</div><p class="muted">Click to reveal</p></div>`}</div><div class="rating-row"><button class="btn danger" data-rate="0">Again</button><button class="btn" data-rate="1">Hard</button><button class="btn" data-rate="2">Good</button><button class="btn success" data-rate="3">Easy</button></div><p class="muted" style="text-align:center">Card ${flashIndex+1} of ${list.length}</p>`;
    document.getElementById('flashCard').addEventListener('click',()=>{flashBack=!flashBack;drawFlash();});
    area.querySelectorAll('[data-rate]').forEach(b=>b.addEventListener('click',()=>{const r=Number(b.dataset.rate);state.vocab[v.id]=Math.max(0,Math.min(4,r+1));state.xp=(state.xp||0)+r+1;saveState();flashIndex++;flashBack=false;drawFlash();}));
  }

  let parseCurrent=null, parseScore=0, parseTotal=0;
  function parsingPage(){return `<section class="page-head"><span class="eyebrow">Morphology practice</span><h1>Parsing Gym</h1><p>Identify the grammatical form before revealing the answer.</p></section><div id="parseArea"></div>`;}
  function nextParse(){parseCurrent=D.parsing[Math.floor(Math.random()*D.parsing.length)];drawParse();}
  function drawParse(){
    const x=parseCurrent||D.parsing[0]; const noun=x.kind==='noun';
    const answer=noun?`${x.case}, ${x.number}, ${x.gender}`:`${x.tense}, ${x.voice}, ${x.mood}${x.person?`, ${x.person}`:''}${x.number?`, ${x.number}`:''}`;
    document.getElementById('parseArea').innerHTML=`<div class="panel"><p class="muted" style="text-align:center">${noun?'Noun form':'Verb form'} • Score ${parseScore}/${parseTotal}</p><div class="game-prompt greek">${esc(x.form)}</div><p style="text-align:center">Lemma: <span class="greek">${esc(x.lemma)}</span> • ${esc(x.gloss||'')}</p><div class="actions" style="justify-content:center"><button id="showParse" class="btn primary">Show parsing</button><button id="nextParse" class="btn">Next form</button></div><div id="parseAnswer" class="callout hidden"><strong>${esc(answer)}</strong><br>${esc(x.note||'')}</div></div>`;
    document.getElementById('showParse').addEventListener('click',()=>{document.getElementById('parseAnswer').classList.remove('hidden');parseTotal++;saveState();});
    document.getElementById('nextParse').addEventListener('click',nextParse);
  }

  function readerPage(){return `<section class="page-head"><span class="eyebrow">Interlinear reader</span><h1>Read the Greek New Testament</h1><p>Click any Greek word for its lemma, parsing and English gloss.</p></section><div class="toolbar"><select id="passageSelect" class="select">${D.passages.map((p,i)=>`<option value="${i}">${esc(p.reference)} — ${esc(p.title)}</option>`).join('')}</select></div><div id="readerArea"></div>`;}
  function drawReader(i=0){
    const p=D.passages[i];
    document.getElementById('readerArea').innerHTML=`<div class="grid two"><article class="panel content"><span class="tag gold">${esc(p.level)}</span><h2>${esc(p.title)}</h2><p>${esc(p.blurb)}</p>${p.verses.map((v,vi)=>`<section class="reader-verse"><strong>${esc(v.ref)}</strong><div>${v.words.map((w,wi)=>`<span class="word greek" data-word="${vi}:${wi}">${esc(w.g)}</span>`).join('')}</div><p class="translation">${esc(v.english)}</p></section>`).join('')}</article><aside id="wordInfo" class="panel word-info"><div class="empty">Select a Greek word to inspect it.</div></aside></div>`;
    document.querySelectorAll('[data-word]').forEach(el=>el.addEventListener('click',()=>{document.querySelectorAll('[data-word]').forEach(x=>x.classList.remove('active'));el.classList.add('active');const [vi,wi]=el.dataset.word.split(':').map(Number);const w=p.verses[vi].words[wi];document.getElementById('wordInfo').innerHTML=`<span class="tag sky">${esc(p.verses[vi].ref)}</span><div class="greek" style="font-size:52px;margin:15px 0">${esc(w.g)}</div><h3>Lemma: <span class="greek">${esc(w.l)}</span></h3><p><strong>Parsing:</strong> ${esc(w.p)}</p><p><strong>Gloss:</strong> ${esc(w.e)}</p><button class="btn small" id="speakWord">▶ Speak</button>`;document.getElementById('speakWord').addEventListener('click',()=>speak(w.g));}));
  }

  function libraryPage(){return `<section class="page-head"><span class="eyebrow">Curated resources</span><h1>Video Library</h1><p>${D.media.length} selected Biblical Greek lectures, courses and playlists.</p></section><div class="grid three">${D.media.map(m=>`<article class="panel hover"><div class="lesson-meta"><span class="tag sky">${esc(m.level)}</span><span class="tag">${esc(m.kind)}</span></div><h3>${esc(m.title)}</h3><p><strong>${esc(m.creator)}</strong></p><p class="muted">${esc(m.description)}</p><a class="btn small" target="_blank" rel="noopener" href="https://www.youtube.com/${m.kind==='playlist'?'playlist?list=':'watch?v='}${encodeURIComponent(m.youtubeId)}">Open on YouTube ↗</a></article>`).join('')}</div>`;}

  function gamesPage(){return `<section class="page-head"><span class="eyebrow">Practice games</span><h1>Greek Games</h1><p>Choose a quick challenge. Scores are saved on this browser.</p></section><div class="grid three"><button class="panel hover" data-game="word"><h2>Word Sprint</h2><p class="muted">Choose the correct English gloss for a Greek word.</p></button><button class="panel hover" data-game="parse"><h2>Parsing Rush</h2><p class="muted">Choose the correct case or tense as quickly as possible.</p></button><button class="panel hover" data-game="sentence"><h2>Sentence Scramble</h2><p class="muted">Put the words of a short Greek sentence in order.</p></button></div><div id="gameArea" class="section"></div>`;}
  function startGame(type){if(type==='word')wordGame();else if(type==='parse')parseGame();else sentenceGame();}
  function saveGame(type,score){state.gameScores.unshift({type,score,date:new Date().toISOString()});state.gameScores=state.gameScores.slice(0,50);state.xp=(state.xp||0)+score;saveState();}
  function wordGame(){let round=0,score=0;const area=document.getElementById('gameArea');const next=()=>{if(round>=10){saveGame('Word Sprint',score);area.innerHTML=`<div class="panel" style="text-align:center"><div class="score-big">${score}/10</div><h2>Word Sprint complete</h2><button class="btn primary" id="againGame">Play again</button></div>`;document.getElementById('againGame').onclick=wordGame;return;}const correct=D.vocabulary[Math.floor(Math.random()*D.vocabulary.length)];const opts=[correct];while(opts.length<4){const x=D.vocabulary[Math.floor(Math.random()*D.vocabulary.length)];if(!opts.includes(x))opts.push(x);}opts.sort(()=>Math.random()-.5);area.innerHTML=`<div class="panel"><p class="muted" style="text-align:center">Round ${round+1}/10 • Score ${score}</p><div class="game-prompt greek">${esc(correct.lemma)}</div><div class="game-options">${opts.map(o=>`<button class="btn game-answer" data-ok="${o===correct}">${esc(o.gloss)}</button>`).join('')}</div></div>`;area.querySelectorAll('.game-answer').forEach(b=>b.onclick=()=>{if(b.dataset.ok==='true'){score++;toast('Correct');}else toast(`Answer: ${correct.gloss}`);round++;setTimeout(next,350);});};next();}
  function parseGame(){let round=0,score=0;const area=document.getElementById('gameArea');const next=()=>{if(round>=10){saveGame('Parsing Rush',score);area.innerHTML=`<div class="panel" style="text-align:center"><div class="score-big">${score}/10</div><h2>Parsing Rush complete</h2><button class="btn primary" id="againGame">Play again</button></div>`;document.getElementById('againGame').onclick=parseGame;return;}const x=D.parsing[Math.floor(Math.random()*D.parsing.length)];const key=x.kind==='noun'?x.case:x.tense;const pool=[...new Set(D.parsing.filter(y=>y.kind===x.kind).map(y=>x.kind==='noun'?y.case:y.tense).filter(Boolean))];const opts=[key];while(opts.length<Math.min(4,pool.length)){const y=pool[Math.floor(Math.random()*pool.length)];if(!opts.includes(y))opts.push(y);}opts.sort(()=>Math.random()-.5);area.innerHTML=`<div class="panel"><p class="muted" style="text-align:center">Round ${round+1}/10 • Score ${score}</p><div class="game-prompt greek">${esc(x.form)}</div><p style="text-align:center">Choose the ${x.kind==='noun'?'case':'tense'}</p><div class="game-options">${opts.map(o=>`<button class="btn game-answer" data-ok="${o===key}">${esc(o)}</button>`).join('')}</div></div>`;area.querySelectorAll('.game-answer').forEach(b=>b.onclick=()=>{if(b.dataset.ok==='true'){score++;toast('Correct');}else toast(`Answer: ${key}`);round++;setTimeout(next,350);});};next();}
  function sentenceGame(){const sentences=[['θεὸς','ἀγάπη','ἐστίν'],['Ἐν','ἀρχῇ','ἦν','ὁ','λόγος'],['χάρις','ὑμῖν','καὶ','εἰρήνη'],['ὁ','θεὸς','φῶς','ἐστιν']];let round=0,score=0,chosen=[];const area=document.getElementById('gameArea');const next=()=>{if(round>=sentences.length){saveGame('Sentence Scramble',score);area.innerHTML=`<div class="panel" style="text-align:center"><div class="score-big">${score}/${sentences.length}</div><h2>Sentence Scramble complete</h2><button class="btn primary" id="againGame">Play again</button></div>`;document.getElementById('againGame').onclick=sentenceGame;return;}chosen=[];const target=sentences[round];const shuffled=[...target].sort(()=>Math.random()-.5);const draw=()=>{area.innerHTML=`<div class="panel"><p class="muted" style="text-align:center">Sentence ${round+1}/${sentences.length} • Score ${score}</p><div class="callout greek" style="min-height:60px;font-size:25px;text-align:center">${chosen.map(esc).join(' ')||'Choose the words in order'}</div><div class="actions" style="justify-content:center">${shuffled.map((w,i)=>`<button class="btn word-choice" data-i="${i}" ${chosen.includes(w)?'disabled':''}>${esc(w)}</button>`).join('')}</div><div class="actions" style="justify-content:center"><button class="btn primary" id="checkSentence">Check</button><button class="btn" id="resetSentence">Reset</button></div></div>`;area.querySelectorAll('.word-choice').forEach(b=>b.onclick=()=>{chosen.push(shuffled[Number(b.dataset.i)]);draw();});document.getElementById('resetSentence').onclick=()=>{chosen=[];draw();};document.getElementById('checkSentence').onclick=()=>{if(chosen.join(' ')===target.join(' ')){score++;toast('Correct');}else toast('Try again: '+target.join(' '));round++;setTimeout(next,500);};};draw();};next();}

  function leaderboardPage(){const scores=[...(state.gameScores||[])].sort((a,b)=>b.score-a.score);return `<section class="page-head"><span class="eyebrow">Local results</span><h1>Scores and Progress</h1><p>This dashboard belongs to this browser. A central teacher dashboard requires online accounts and a database.</p></section><div class="stats"><div class="stat"><strong>${state.xp||0}</strong><span>Total XP</span></div><div class="stat"><strong>${completedCount()}</strong><span>Lessons complete</span></div><div class="stat"><strong>${state.streak||1}</strong><span>Day streak</span></div><div class="stat"><strong>${scores.length}</strong><span>Games played</span></div></div><section class="section panel"><h2>Game results</h2><div class="score-list">${scores.length?scores.map((s,i)=>`<div class="score-row"><div class="rank">#${i+1}</div><div><strong>${esc(s.type)}</strong><div class="muted">${new Date(s.date).toLocaleString()}</div></div><strong>${s.score}</strong></div>`).join(''):'<div class="empty">Play a game to record your first score.</div>'}</div></section><section class="section panel"><h2>Backup your progress</h2><p class="muted">Download a copy before clearing browser data or changing devices.</p><div class="actions"><button class="btn primary" id="exportProgress">Download backup</button><label class="btn">Restore backup<input id="importProgress" type="file" accept="application/json" hidden></label><button class="btn danger" id="resetProgress">Reset progress</button></div></section>`;}

  function notFound(){return `<div class="error-box"><h2>Page not found</h2><p>The requested page does not exist.</p><a class="btn" href="/" data-link>Return home</a></div>`;}

  function render() {
    try {
      const path = location.pathname.replace(/\/+$/,'') || '/';
      setActiveNav(path);
      let html;
      if(path==='/')html=home();
      else if(path==='/learn')html=learnPage();
      else if(path.startsWith('/learn/'))html=lessonPage(decodeURIComponent(path.split('/')[2]||''));
      else if(path==='/alphabet')html=alphabetPage();
      else if(path==='/vocabulary')html=vocabularyPage();
      else if(path==='/flashcards')html=flashcardsPage();
      else if(path==='/parsing')html=parsingPage();
      else if(path==='/reader')html=readerPage();
      else if(path==='/library')html=libraryPage();
      else if(path==='/games')html=gamesPage();
      else if(path==='/leaderboard')html=leaderboardPage();
      else html=notFound();
      app.innerHTML=html;

      if(path.startsWith('/learn/'))setupLesson(path.split('/')[2]);
      if(path==='/alphabet')setupAlphabet();
      if(path==='/vocabulary')setupVocabulary();
      if(path==='/flashcards'){flashBack=false;drawFlash();}
      if(path==='/parsing'){nextParse();}
      if(path==='/reader'){drawReader(0);document.getElementById('passageSelect').addEventListener('change',e=>drawReader(Number(e.target.value)));}
      if(path==='/games')document.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>startGame(b.dataset.game)));
      if(path==='/leaderboard')setupLeaderboard();
    } catch (err) {
      console.error(err);
      app.innerHTML=`<div class="error-box"><h2>The page could not load</h2><p>${esc(err?.message||'Unknown error')}</p><button class="btn" onclick="location.reload()">Reload</button></div>`;
    }
  }

  function setupLeaderboard(){
    document.getElementById('exportProgress')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tanos-koine-progress.json';a.click();URL.revokeObjectURL(a.href);});
    document.getElementById('importProgress')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{state={...DEFAULT_STATE,...JSON.parse(await f.text())};saveState();toast('Progress restored');render();}catch{toast('That backup file is invalid');}});
    document.getElementById('resetProgress')?.addEventListener('click',()=>{if(confirm('Delete all progress stored in this browser?')){state={...DEFAULT_STATE,lastVisit:new Date().toISOString(),streak:1};saveState();render();}});
  }

  render();
})();
