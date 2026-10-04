/* NextGen Portfolio Builder — the guest flow.
 * welcome -> registration -> the questions -> the room average. State lives
 * in memory; the finished answer set goes to STORE on submit.
 */
(function () {
  var app      = document.getElementById("app");
  var rail     = document.getElementById("rail");
  var actions  = document.getElementById("actions");
  var btnBack  = document.getElementById("btnBack");
  var btnNext  = document.getElementById("btnNext");
  var stepCount= document.getElementById("stepCount");

  var steps = window.SCHEMA.activeSteps;
  var answers = {};
  var guest = readUrlIdentity();   /* { token, fromLink, fields: {...} } */
  var view = "welcome";            /* "welcome" | "register" | 0..n | "results" */
  var roomData = null;
  var openSections = null;   /* null = not loaded yet; {} = nothing open */
  var waitingFor = null;     /* step index the guest is held at */

  /* A section is open when the admin has opened it. Before the state has
     loaded we hold rather than guess, so a guest never sees a section
     that is still meant to be closed. */
  function sectionOpen(stepId) {
    if (openSections === null) return false;
    /* No locks configured at all means the admin is not gating this
       session, so everything runs as one continuous quiz. */
    if (!Object.keys(openSections).length) return true;
    return !!openSections[stepId];
  }
  function gatingOn() {
    return openSections !== null && Object.keys(openSections).length > 0;
  }

  /* A personal link — ?g=TOKEN&n=Name, which is what qr-gen.html prints —
   * identifies the guest up front, so they never see the name field. The
   * token is what ties this device's answers to a row on the guest list. */
  function regFields() { return window.CONFIG.REGISTER_FIELDS || []; }

  function readUrlIdentity() {
    var q = new URLSearchParams(window.location.search);
    var token = q.get("g") || "";
    var name  = q.get("n") || "";
    var group = q.get("t") || "";
    if (token || name) {
      return { token: token, fromLink: !!token, fields: { name: name, group: group } };
    }
    var saved = window.STORE.savedGuest();
    if (saved) return saved;
    return { token: "", fromLink: false, fields: {} };
  }

  /* The registration step is skipped entirely when identity is off, or
     when a personal link already named this guest. */
  function needsRegistration() {
    return window.CONFIG.IDENTIFY !== "off" && !guest.fromLink && regFields().length > 0;
  }

  function identityOk() {
    if (window.CONFIG.IDENTIFY !== "required") return true;
    if (guest.fromLink) return true;
    return regFields().every(function (f) {
      if (!f.required) return true;
      var v = (guest.fields[f.id] || "").trim();
      return v.length >= 2;
    });
  }

  /* The screens a guest moves through, in order. */
  function flow() {
    var out = [];
    if (needsRegistration()) out.push("register");
    steps.forEach(function (_, i) { out.push(i); });
    return out;
  }
  function flowIndex(v) { return flow().indexOf(v); }

  /* ---------- helpers ---------- */

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------- render ---------- */

  function render() {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    app.innerHTML = "";
    if (view === "welcome")       renderWelcome();
    else if (view === "register") renderRegister();
    else if (view === "waiting")  renderWaiting();
    else if (view === "results")  renderResults();
    else                          renderStep(view);
    renderChrome();
  }

  function renderChrome() {
    var seq = flow();
    var at = flowIndex(view);
    var inFlow = at !== -1;

    if (view === "waiting") {
      var wseq = flow(), wat = wseq.indexOf(waitingFor);
      rail.hidden = false;
      rail.innerHTML = "";
      wseq.forEach(function (_, i) {
        rail.appendChild(el("span", i < wat ? "done" : ""));
      });
      stepCount.textContent = "Waiting";
      actions.hidden = true;
      return;
    }

    rail.hidden = !inFlow;
    actions.hidden = (view === "results");

    if (inFlow) {
      rail.innerHTML = "";
      seq.forEach(function (_, i) {
        rail.appendChild(el("span", i < at ? "done" : i === at ? "active" : ""));
      });
      stepCount.textContent = "Step " + (at + 1) + " of " + seq.length;
      btnBack.hidden = false;
      btnBack.textContent = at === 0 ? "Start over" : "Back";

      var last = at === seq.length - 1;
      btnNext.textContent = last ? "Finished" : "Continue";
      btnNext.disabled = view === "register" ? !identityOk() : !stepComplete(view);
    } else if (view === "welcome") {
      stepCount.textContent = "";
      btnBack.hidden = true;
      btnNext.textContent = "Begin";
      btnNext.disabled = false;
    } else {
      stepCount.textContent = "Complete";
    }
  }

  function stepComplete(i) {
    return steps[i].questions.every(function (q) {
      var v = answers[q.id];
      if (q.kind === "range") return typeof v === "number";
      if (v === undefined || v === null) return false;
      /* An opt-out multi (min: 0) counts as answered once it has been
         touched, because picking nothing is a real answer there. */
      if (q.kind === "multi" && q.min !== 0) return v.length > 0;
      return true;
    });
  }

  function renderWelcome() {
    var s = el("section", "screen");
    var hero = el("div", "hero");
    /* No eyebrow here: the header two lines above already says NextGen,
       and the headline carries the rest. */
    hero.innerHTML =
      '<h1>Build the room&rsquo;s portfolio.</h1>' +
      '<p>' + countWord(steps.length) + ' short steps. Answer the questions and we will ' +
      'calculate the room average and find the portfolio that fits it best.</p>';
    s.appendChild(hero);

    if (guest.fromLink && guest.fields.name) {
      s.appendChild(el("div", "notice",
        "<div>Signed in as <b>" + esc(guest.fields.name) + "</b>" +
        (guest.fields.group ? ", " + esc(guest.fields.group) : "") + "</div>"));
    }

    app.appendChild(s);
  }

  function countWord(n) {
    var w = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][n];
    return w || String(n);
  }

  /* Registration — the first step, not a form bolted under the intro. */
  function renderRegister() {
    var s = el("section", "screen");
    var optional = window.CONFIG.IDENTIFY === "optional";

    s.appendChild(el("div", "step-head", "<h2>Registration</h2>"));

    var wrap = el("div", "idblock");
    regFields().forEach(function (f) {
      var lab = el("label", "field");
      var soft = optional || !f.required;
      lab.innerHTML = '<span class="field-label">' + esc(f.label) +
        (soft ? ' <em>optional</em>' : ' <em>required</em>') + "</span>";

      var input = document.createElement("input");
      input.type = f.type || "text";
      input.className = "field-input";
      input.placeholder = f.placeholder || "";
      if (f.autocomplete) input.autocomplete = f.autocomplete;
      input.value = guest.fields[f.id] || "";
      input.addEventListener("input", function () {
        guest.fields[f.id] = input.value;
        renderChrome();
      });
      /* Enter moves on rather than doing nothing, which is what a phone
         keyboard's "go" key is expected to do. */
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); if (identityOk()) advance(); }
      });
      lab.appendChild(input);
      wrap.appendChild(lab);
    });
    s.appendChild(wrap);

    if (window.CONFIG.PRIVACY_NOTE) s.appendChild(el("p", "footnote", esc(window.CONFIG.PRIVACY_NOTE)));
    app.appendChild(s);
  }

  function renderStep(i) {
    /* Guests see only the questions. Section titles and blurbs belong to
       the host's screens (admin board and presenter). */
    var step = steps[i];
    var s = el("section", "screen screen-q");

    step.questions.forEach(function (q) {
      var block = el("div", "q");
      block.appendChild(el("div", "q-label", esc(q.label)));
      if (q.hint) block.appendChild(el("div", "q-hint", esc(q.hint)));

      if (q.kind === "range") {
        block.appendChild(rangeControl(q));
        s.appendChild(block);
        return;
      }

      var multi = q.kind === "multi";
      if (multi && !Array.isArray(answers[q.id])) answers[q.id] = [];

      /* FX currency lists are short and uniform — two columns reads better
         than one tall stack on a phone. */
      var twoUp = q.options.length >= 6 && q.options.every(function (o) { return o.label.length <= 4; });
      var opts = el("div", "opts" + (twoUp ? " two" : "") + (multi ? " multi" : ""));
      opts.setAttribute("role", multi ? "group" : "radiogroup");
      opts.setAttribute("aria-label", q.label);

      var counter = multi ? el("div", "q-count") : null;
      function updateCounter() {
        if (!counter) return;
        var n = answers[q.id].length;
        counter.textContent = q.max
          ? n + " of " + q.max + " selected"
          : (n === 0 ? "None selected" : n + " selected");
        counter.classList.toggle("full", !!q.max && n >= q.max);
      }

      q.options.forEach(function (o) {
        var isSel = multi
          ? answers[q.id].indexOf(o.v) !== -1
          : answers[q.id] === o.v;
        var b = el("button", "opt" + (isSel ? " sel" : ""));
        b.type = "button";
        b.setAttribute("role", multi ? "checkbox" : "radio");
        b.setAttribute("aria-checked", isSel ? "true" : "false");
        b.innerHTML =
          '<span class="tick" aria-hidden="true"></span>' +
          '<span class="opt-txt"><span class="opt-main">' + esc(o.label) + "</span>" +
          (o.sub ? '<span class="opt-sub">' + esc(o.sub) + "</span>" : "") +
          "</span>";

        b.addEventListener("click", function () {
          if (multi) {
            var list = answers[q.id];
            var at = list.indexOf(o.v);
            if (at !== -1) {
              list.splice(at, 1);
            } else {
              /* At the cap, a new pick drops the oldest rather than
                 silently doing nothing, since a dead tap reads as broken. */
              if (q.max && list.length >= q.max) list.shift();
              list.push(o.v);
            }
            /* Repaint the whole group: a capped pick can deselect another. */
            Array.prototype.forEach.call(opts.children, function (c, idx) {
              var on = list.indexOf(q.options[idx].v) !== -1;
              c.classList.toggle("sel", on);
              c.setAttribute("aria-checked", on ? "true" : "false");
            });
            updateCounter();
          } else {
            answers[q.id] = o.v;
            /* repaint just this group — a full re-render would scroll away */
            Array.prototype.forEach.call(opts.children, function (c) {
              c.classList.remove("sel");
              c.setAttribute("aria-checked", "false");
            });
            b.classList.add("sel");
            b.setAttribute("aria-checked", "true");
          }
          renderChrome();
        });
        opts.appendChild(b);
      });

      block.appendChild(opts);
      if (counter) { updateCounter(); block.appendChild(counter); }
      s.appendChild(block);
    });

    app.appendChild(s);
  }

  /* A slider for the continuous questions — horizon, duration, USD share.
     The live read-out is the control's whole feedback, so it is large and
     sits above the track rather than in a corner. */
  function rangeControl(q) {
    if (typeof answers[q.id] !== "number") {
      answers[q.id] = typeof q.def === "number" ? q.def : Math.round((q.min + q.max) / 2);
    }

    var wrap = el("div", "rng");
    var read = el("div", "rng-read");
    var input = document.createElement("input");
    input.type = "range";
    input.className = "rng-input";
    input.min = q.min;
    input.max = q.max;
    input.step = q.step || 1;
    input.value = answers[q.id];
    input.setAttribute("aria-label", q.label);

    function show() {
      var v = Number(input.value);
      read.textContent = q.format ? q.format(v) : v + (q.unit || "");
      /* Paint the filled part of the track up to the thumb. */
      var pct = ((v - q.min) / ((q.max - q.min) || 1)) * 100;
      input.style.setProperty("--fill", pct + "%");
      input.setAttribute("aria-valuetext", read.textContent);
    }

    input.addEventListener("input", function () {
      answers[q.id] = Number(input.value);
      show();
      renderChrome();
    });

    wrap.appendChild(read);
    wrap.appendChild(input);
    wrap.appendChild(el("div", "rng-ends",
      "<span>" + esc(q.minLabel || q.min + (q.unit || "")) + "</span>" +
      "<span>" + esc(q.maxLabel || q.max + (q.unit || "")) + "</span>"));
    show();
    return wrap;
  }

  /* ---------- results ---------- */

  function renderLoading() {
    app.innerHTML = "";
    var s = el("section", "screen");
    s.appendChild(el("div", "result-head",
      '<div class="eyebrow">Matching</div>' +
      '<h2 class="display">Reading the room&hellip;</h2>'));
    app.appendChild(s);
    rail.hidden = true;
    actions.hidden = true;
  }

  function submit() {
    renderLoading();
    window.STORE.submit(answers, guest)
      .then(function () { return window.STORE.results(); })
      .then(function (res) { roomData = res; view = "results"; render(); watchRoom(); })
      .catch(function (err) {
        /* A dropped connection must never strand a guest mid-session —
           fall back to their own result and say so. */
        console.error(err);
        roomData = { agg: window.ENGINE.aggregate([{ id: "me", answers: answers }]),
                     real: 1, synthetic: 0, mode: "offline" };
        view = "results";
        render();
        watchRoom();
      });
  }

  /* The guest's final screen is the room average only: everyone's answers
     averaged into one profile, matched to the shelf. It refreshes while the
     guest waits, so it fills in as the rest of the room finishes. */
  function renderResults() {
    var s = el("section", "screen");
    var agg = roomData.agg;
    var roomCount = agg.count;
    var roomTop = roomCount ? window.ENGINE.rank(window.ENGINE.aggProfile(agg))[0] : null;

    if (!roomTop || roomTop.blocked) {
      s.appendChild(el("div", "result-head",
        '<div class="eyebrow">Room average</div>' +
        '<h2 class="display">Reading the room&hellip;</h2>' +
        '<p class="tagline">The result appears as soon as answers come in.</p>'));
      app.appendChild(s);
      return;
    }

    var p = roomTop.portfolio;
    s.appendChild(el("div", "result-head",
      '<div class="eyebrow">Room average</div>' +
      '<h2 class="display">' + esc(p.name) + "</h2>" +
      '<p class="tagline">' + esc(p.tagline) + "</p>"));

    var about = el("div", "card");
    about.innerHTML =
      '<p class="body">' + esc(p.blurb) + "</p>" +
      '<p class="footnote" style="margin-top:14px">' + roomCount + " guest" +
        (roomCount === 1 ? "" : "s") + " averaged so far</p>";
    s.appendChild(about);

    s.appendChild(allocCard(p));

    if (roomData.mode === "demo" && roomData.synthetic) {
      s.appendChild(el("div", "notice",
        "<div><b>Demo mode.</b> " + roomData.synthetic +
        " of these responses are a simulated audience so the screens are populated before the room fills up. " +
        "Connect the vote backend for live-only numbers.</div>"));
    } else if (roomData.mode === "offline") {
      s.appendChild(el("div", "notice",
        "<div><b>Offline.</b> We could not reach the vote server, " +
        "so this shows your own answers only.</div>"));
    }

    s.appendChild(el("p", "footnote",
      "Illustrative only, built for the NextGen session. Not investment advice, " +
      "not an offer, and not a recommendation to buy or sell any instrument."));

    app.appendChild(s);
  }

  /* Keep the room average live while the guest sits on the final screen.
     Only repaint when the result actually moves, and never scroll. */
  var roomTimer = null;
  function watchRoom() {
    if (roomTimer) return;
    roomTimer = setInterval(function () {
      if (view !== "results") { clearInterval(roomTimer); roomTimer = null; return; }
      window.STORE.results().then(function (res) {
        var before = roomKey(roomData);
        roomData = res;
        if (roomKey(res) === before || view !== "results") return;
        app.innerHTML = "";
        renderResults();
      }).catch(function () { /* keep the last good result on screen */ });
    }, Math.max(3000, window.CONFIG.POLL_MS || 3000));
  }
  function roomKey(res) {
    if (!res || !res.agg || !res.agg.count) return "0";
    var top = window.ENGINE.rank(window.ENGINE.aggProfile(res.agg))[0];
    return res.agg.count + ":" + (top ? top.portfolio.id : "");
  }

  var ASSET_CLASSES = [
    { k: "equities",    label: "Equities",         c: "var(--series-equities)" },
    { k: "fixedIncome", label: "Fixed income",     c: "var(--series-fixedincome)" },
    { k: "notes",       label: "Structured notes", c: "var(--series-notes)" },
    { k: "cash",        label: "Cash",             c: "var(--series-cash)" }
  ];

  function allocCard(p) {
    var card = el("div", "card");
    var keys = ASSET_CLASSES;
    card.innerHTML = "<h3>Allocation</h3>" +
      '<div class="alloc-bar">' +
        keys.map(function (x) {
          return '<i style="flex:' + p.alloc[x.k] + ' 0 0;background:' + x.c + '"></i>';
        }).join("") +
      "</div>" +
      '<div class="legend">' +
        keys.map(function (x) {
          return "<div><s style=\"background:" + x.c + '"></s>' + x.label +
                 "<b>" + p.alloc[x.k] + "%</b></div>";
        }).join("") +
      "</div>";
    return card;
  }

  /* ---------- navigation ---------- */

  function advance() {
    var seq = flow();
    var at = flowIndex(view);
    if (at === -1) return;
    if (view === "register" ? !identityOk() : !stepComplete(view)) return;

    /* Each finished section is saved as the guest goes, so the room can
       see that section's results while the next one is still closed. */
    if (typeof view === "number") saveProgress();

    if (at === seq.length - 1) { submit(); return; }

    var next = seq[at + 1];
    if (typeof next === "number" && !sectionOpen(steps[next].id)) {
      waitingFor = next;
      view = "waiting";
      render();
      return;
    }
    view = next;
    render();
  }

  /* Fire-and-forget upsert of whatever is answered so far. */
  function saveProgress() {
    window.STORE.submit(answers, guest).catch(function (e) {
      console.warn("progress not saved", e);
    });
  }

  /* The five mascot frames are cut from the desk's rendered shield artwork,
     one per section, and they are the first choice because they are the real
     thing rather than an approximation of it. The procedural SVG below stays
     as the fallback: it needs no network, so a guest on bad venue wifi still
     gets a mascot rather than a hole in the screen. */
  /* Eight poses cut from the desk's rendered shield artwork, laid out as one
     strip and stepped through in CSS. One request rather than eight, and the
     animation is real frames rather than a transform pretending to be one.
     Each section starts on a different pose, so a guest held twice does not
     sit through the same loop from the same place. */
  var MASCOT_FRAMES = 8;
  var MASCOT_START = {
    profile: 0, equities: 1, fixedincome: 5, notes: 6, fx: 3
  };

  function renderWaiting() {
    var stepId = steps[waitingFor].id;
    var start = MASCOT_START[stepId] || 0;
    var s = el("section", "screen");
    s.appendChild(el("div", "wait",
      '<div class="wait-crest" aria-hidden="true">' +
        '<div class="wait-mascot">' +
          /* No build stamp: bump-build.sh only rewrites URLs written in the
             HTML, and the strip is immutable — replacing it means renaming it. */
          '<img src="assets/brand/mascot/workout.webp" alt="" decoding="async" ' +
               'style="animation-delay:' + (-start * 0.9) + 's">' +
        "</div>" +
      "</div>" +
      '<div class="eyebrow">Locked</div>' +
      '<h2 class="display">Hold on for the host to enable the next step.</h2>'));
    app.appendChild(s);

    var img = s.querySelector(".wait-mascot img");
    if (img) {
      img.addEventListener("error", function () {
        /* No strip: draw the vector mascot instead of leaving a gap. */
        var crest = s.querySelector(".wait-crest");
        crest.innerHTML = mascotSVG(stepId);
        var m = crest.querySelector(".mascot");
        if (m && m.pauseAnimations && window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches) m.pauseAnimations();
      });
    }
  }

  /* The Safra shield as a little gym mascot, doing a different exercise
     at each locked section. The face is the real crest, cut from the logo
     artwork onto a white shield. Each exercise is a list of poses; SMIL
     tweens limbs, gloves, sneakers and props between them, because it
     animates SVG geometry the same way on every phone. */
  var EXERCISE_FOR_STEP = {
    profile: "jacks", equities: "curls", fixedincome: "zen", notes: "press", fx: "rope"
  };
  var SHOULDER = { l: [54, 64], r: [106, 64] }, HIP = { l: [70, 104], r: [90, 104] };
  var EASE = "0.45 0 0.55 1";

  function exercise(kind) {
    function stand(dy) {
      dy = dy || 0;
      return { lk: [70, 116 + dy], la: [68, 128 + dy], rk: [90, 116 + dy], ra: [92, 128 + dy] };
    }
    function pose(o) {
      var base = stand(0);
      Object.keys(o).forEach(function (k) { base[k] = o[k]; });
      return base;
    }
    if (kind === "jacks") return { dur: 1.2, sweat: 1, poses: [
      { t: 0,   p: pose({ b: [0, 2],  le: [46, 86], lh: [44, 103], re: [114, 86], rh: [116, 103],
                          lk: [70, 117], la: [70, 129], rk: [90, 117], ra: [90, 129], floor: 36 }) },
      { t: 0.5, p: pose({ b: [0, -7], le: [38, 42], lh: [56, 14],  re: [122, 42], rh: [104, 14],
                          lk: [61, 108], la: [54, 119], rk: [99, 108], ra: [106, 119], floor: 27 }) },
      { t: 1,   p: null } ] };
    if (kind === "press") return { dur: 1.9, sweat: 1, bar: 1, poses: [
      { t: 0,   p: pose({ b: [0, 4], le: [38, 78], lh: [34, 58], re: [122, 78], rh: [126, 58],
                          lk: [59, 117], la: [66, 128], rk: [101, 117], ra: [94, 128], floor: 38 }) },
      { t: 0.4, p: pose({ b: [0, 0], le: [40, 38], lh: [34, 14], re: [120, 38], rh: [126, 14],
                          lk: [68, 115], la: [66, 128], rk: [92, 115], ra: [94, 128], floor: 31 }) },
      { t: 0.6, p: "hold" },
      { t: 1,   p: null } ] };
    if (kind === "curls") {
      var down = { l: [[42, 86], [40, 104]], r: [[118, 86], [120, 104]] };
      var up   = { l: [[42, 86], [50, 64]],  r: [[118, 86], [110, 64]] };
      return { dur: 2.4, dumbbells: 1, poses: [
        { t: 0,    p: pose({ b: [0, 1],  le: down.l[0], lh: down.l[1], re: down.r[0], rh: down.r[1], floor: 34 }) },
        { t: 0.25, p: pose({ b: [-1, 0], le: up.l[0],   lh: up.l[1],   re: down.r[0], rh: down.r[1], floor: 34 }) },
        { t: 0.5,  p: pose({ b: [0, 1],  le: down.l[0], lh: down.l[1], re: down.r[0], rh: down.r[1], floor: 34 }) },
        { t: 0.75, p: pose({ b: [1, 0],  le: down.l[0], lh: down.l[1], re: up.r[0],   rh: up.r[1],   floor: 34 }) },
        { t: 1,    p: null } ] };
    }
    if (kind === "rope") return { dur: 0.9, sweat: 1, rope: 1, poses: [
      { t: 0,   p: pose({ b: [0, 1],  le: [44, 88], lh: [33, 98], re: [116, 88], rh: [127, 98],
                          lk: [72, 117], la: [72, 129], rk: [88, 117], ra: [88, 129], rope: -46, floor: 34 }) },
      { t: 0.5, p: pose({ b: [0, -8], le: [44, 82], lh: [29, 92], re: [116, 82], rh: [131, 92],
                          lk: [72, 109], la: [72, 120], rk: [88, 109], ra: [88, 120], rope: 178, floor: 26 }) },
      { t: 1,   p: null } ] };
    /* zen: cross-legged, floating, breathing */
    function zen(dy, floor) {
      return pose({ b: [0, dy], le: [40, 94 + dy], lh: [47, 115 + dy], re: [120, 94 + dy], rh: [113, 115 + dy],
                    lk: [49, 118 + dy], la: [88, 123 + dy], rk: [111, 118 + dy], ra: [72, 123 + dy], floor: floor });
    }
    return { dur: 4, aura: 1, poses: [
      { t: 0, p: zen(2, 34) }, { t: 0.5, p: zen(-7, 25) }, { t: 1, p: null } ] };
  }

  function mascotSVG(stepId) {
    var ex = exercise(EXERCISE_FOR_STEP[stepId] || "press");
    /* resolve "hold" (repeat previous) and null (loop back to first) */
    var poses = ex.poses.map(function (k, i, all) {
      var p = k.p === "hold" ? all[i - 1].p : (k.p === null ? all[0].p : k.p);
      if (k.p === "hold") all[i].p = p;
      return { t: k.t, p: p };
    });
    var keyTimes = poses.map(function (k) { return k.t; }).join(";");
    var splines = poses.slice(1).map(function () { return EASE; }).join(";");
    var timing = 'dur="' + ex.dur + 's" repeatCount="indefinite" calcMode="spline" keyTimes="' +
                 keyTimes + '" keySplines="' + splines + '"';
    function vals(fn) { return poses.map(function (k) { return fn(k.p); }).join(";"); }
    function anim(attr, fn) { return '<animate attributeName="' + attr + '" values="' + vals(fn) + '" ' + timing + "/>"; }
    function move(fn) {
      return '<animateTransform attributeName="transform" type="translate" values="' + vals(fn) + '" ' + timing + "/>";
    }
    function xy(a) { return a[0] + "," + a[1]; }
    function off(a, b) { return (a[0] + b[0]) + "," + (a[1] + b[1]); }
    function first(fn) { return fn(poses[0].p); }
    function limb(fn) { return '<polyline class="m-limb" points="' + first(fn) + '">' + anim("points", fn) + "</polyline>"; }
    function at(key, inner) { return '<g transform="translate(' + first(function (p) { return p[key][0] + " " + p[key][1]; }) + ')">' +
      move(function (p) { return p[key][0] + " " + p[key][1]; }) + inner + "</g>"; }

    var LOGO = "assets/brand/safra-logo.png";
    var shoe = '<path class="m-shoe" d="M-9,-3 h18 a5,5 0 0 1 5,5 v4 h-28 v-4 a5,5 0 0 1 5,-5z"/>';
    var dumbbell = ex.dumbbells
      ? '<rect class="m-bar" x="-9" y="-1.5" width="18" height="3" rx="1.5"/>' +
        '<rect class="m-plate" x="-11" y="-5" width="4" height="10" rx="1.2"/>' +
        '<rect class="m-plate" x="7" y="-5" width="4" height="10" rx="1.2"/>'
      : "";
    var glove = '<circle class="m-glove" r="5.5"/>';

    var out = '<svg class="mascot" viewBox="0 0 160 150" width="150" height="141" xmlns="http://www.w3.org/2000/svg">';
    if (ex.aura) {
      out += '<circle class="m-aura" cx="80" cy="76" r="44">' +
        '<animate attributeName="r" values="40;50;40" dur="' + ex.dur + 's" repeatCount="indefinite"/>' +
        '<animate attributeName="opacity" values="0.35;0.9;0.35" dur="' + ex.dur + 's" repeatCount="indefinite"/></circle>';
    }
    out += '<ellipse class="m-floor" cx="80" cy="140" rx="' + first(function (p) { return p.floor; }) + '" ry="4">' +
      anim("rx", function (p) { return p.floor; }) + "</ellipse>";
    if (ex.rope) {
      out += '<path class="m-rope" d="' + first(ropeD) + '">' + anim("d", ropeD) + "</path>";
    }
    function ropeD(p) { return "M" + xy(p.lh) + " Q80," + p.rope + " " + xy(p.rh); }

    /* legs and sneakers */
    out += limb(function (p) { return off(HIP.l, p.b) + " " + xy(p.lk) + " " + xy(p.la); });
    out += limb(function (p) { return off(HIP.r, p.b) + " " + xy(p.rk) + " " + xy(p.ra); });
    out += at("la", shoe) + at("ra", shoe);

    /* arms behind the shield */
    out += limb(function (p) { return off(SHOULDER.l, p.b) + " " + xy(p.le) + " " + xy(p.lh); });
    out += limb(function (p) { return off(SHOULDER.r, p.b) + " " + xy(p.re) + " " + xy(p.rh); });

    /* the shield: white backing + the real crest artwork, cropped; headband; sweat */
    out += '<g transform="translate(' + first(function (p) { return p.b[0] + " " + p.b[1]; }) + ')">' +
      move(function (p) { return p.b[0] + " " + p.b[1]; }) +
      '<svg x="50" y="30" width="60" height="72" viewBox="0 0 140 168" preserveAspectRatio="xMinYMin slice">' +
        '<path class="m-face" d="M8,14 C40,4 100,4 132,14 L132,92 C130,128 104,150 70,166 C36,150 10,128 8,92 Z"/>' +
        '<image href="' + LOGO + '" xlink:href="' + LOGO + '" width="552" height="168"/>' +
      "</svg>" +
      '<rect class="m-band" x="51" y="36" width="58" height="9" rx="2"/>' +
      '<rect class="m-stripe" x="51" y="38.2" width="58" height="1.4"/>' +
      '<rect class="m-stripe" x="51" y="41.4" width="58" height="1.4"/>' +
      '<path class="m-tail" d="M108,38 q8,1 10,7 q-6,-2 -10,-2z"/>' +
      (ex.sweat
        ? '<path class="m-drop" d="M115,30 q3,4 0,6 q-3,-2 0,-6z" opacity="0">' +
            '<animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.4;0.55;1" dur="' + ex.dur + 's" repeatCount="indefinite"/>' +
            '<animateTransform attributeName="transform" type="translate" values="0 0;0 0;2 -2;7 9" keyTimes="0;0.4;0.55;1" dur="' + ex.dur + 's" repeatCount="indefinite"/>' +
          "</path>"
        : "") +
      "</g>";

    /* barbell rides with the hands */
    if (ex.bar) {
      out += '<g>' + move(function (p) { return "0 " + (p.lh[1] - 56); }) +
        '<rect class="m-bar" x="10" y="54.5" width="140" height="3" rx="1.5"/>' +
        '<rect class="m-plate" x="12" y="44" width="7" height="24" rx="2"/>' +
        '<rect class="m-plate" x="20" y="48" width="5" height="16" rx="1.5"/>' +
        '<rect class="m-plate" x="141" y="44" width="7" height="24" rx="2"/>' +
        '<rect class="m-plate" x="135" y="48" width="5" height="16" rx="1.5"/>' +
        "</g>";
    }
    out += at("lh", dumbbell + glove) + at("rh", dumbbell + glove);
    return out + "</svg>";
  }

  btnNext.addEventListener("click", function () {
    if (view === "welcome") {
      var first = flow()[0];
      if (typeof first === "number" && !sectionOpen(steps[first].id)) {
        waitingFor = first; view = "waiting";
      } else {
        view = first;
      }
      render();
      return;
    }
    advance();
  });

  btnBack.addEventListener("click", function () {
    var seq = flow();
    var at = flowIndex(view);
    if (at <= 0) { answers = {}; view = "welcome"; }
    else view = seq[at - 1];
    render();
  });

  /* Keep the lock state fresh so a guest held at a closed section moves
     on by themselves the moment the admin opens it. */
  function watchSections() {
    function poll() {
      window.STORE.sections().then(function (map) {
        var before = JSON.stringify(openSections);
        openSections = map || {};
        if (JSON.stringify(openSections) === before) return;
        if (view === "waiting" && waitingFor !== null &&
            sectionOpen(steps[waitingFor].id)) {
          view = waitingFor;
          waitingFor = null;
          render();
        } else if (view === "waiting" || view === "welcome") {
          render();
        }
      }).catch(function () { if (openSections === null) openSections = {}; });
    }
    poll();
    setInterval(poll, 4000);
  }

  /* Wait for the portfolio base before the first paint, so a replaced
     data/portfolios.json is in force from the very first screen. */
  window.BASE.ready.then(function () {
    watchSections();
    render();
  });
})();
