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

  function renderWaiting() {
    var s = el("section", "screen");
    s.appendChild(el("div", "wait",
      '<div class="wait-crest" aria-hidden="true">' + mascotSVG() + '</div>' +
      '<div class="eyebrow">Locked</div>' +
      '<h2 class="display">Hold on for the host to enable the next step.</h2>'));
    app.appendChild(s);
    var m = s.querySelector(".mascot");
    if (m && m.pauseAnimations && window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) m.pauseAnimations();
  }

  /* The Safra shield as a little gym mascot: headband on, pressing a
     barbell overhead with a squat on each rep. The face is the real crest,
     cut from the logo artwork onto a white shield. SMIL drives the limbs
     because it animates SVG geometry the same way on every phone. */
  function mascotSVG() {
    var T = 'dur="1.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.4;0.6;1" ' +
            'keySplines="0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1"';
    function anim(attr, a, b) {
      return '<animate attributeName="' + attr + '" values="' + a + ";" + b + ";" + b + ";" + a + '" ' + T + "/>";
    }
    function move(a, b) {
      return '<animateTransform attributeName="transform" type="translate" values="' +
        a + ";" + b + ";" + b + ";" + a + '" ' + T + "/>";
    }
    var LOGO = "assets/brand/safra-logo.png";
    return '' +
    '<svg class="mascot" viewBox="0 0 160 150" width="150" height="141" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="80" cy="140" rx="34" ry="4" class="m-floor">' + anim("rx", "38", "30") + "</ellipse>" +

      /* legs: hip → knee → ankle, knees bend out at the bottom of the rep */
      '<polyline class="m-limb" points="70,104 60,116 66,128">' +
        anim("points", "70,104 60,116 66,128", "70,100 67,114 66,128") + "</polyline>" +
      '<polyline class="m-limb" points="90,104 100,116 94,128">' +
        anim("points", "90,104 100,116 94,128", "90,100 93,114 94,128") + "</polyline>" +
      '<path class="m-shoe" d="M56,126 h14 a4,4 0 0 1 4,4 v3 h-22 v-3 a4,4 0 0 1 4,-4z"/>' +
      '<path class="m-shoe" d="M90,126 h14 a4,4 0 0 1 4,4 v3 h-22 v-3 a4,4 0 0 1 4,-4z"/>' +

      /* upper body bobs with the squat */
      "<g>" + move("0 4", "0 0") +
        /* arms: shoulder → elbow → hand, pressing from chest to overhead */
        '<polyline class="m-limb" points="54,64 38,76 34,56">' +
          anim("points", "54,64 38,76 34,56", "54,60 40,38 34,14") + "</polyline>" +
        '<polyline class="m-limb" points="106,64 122,76 126,56">' +
          anim("points", "106,64 122,76 126,56", "106,60 120,38 126,14") + "</polyline>" +

        /* the shield: white backing + the real crest artwork, cropped */
        '<svg x="50" y="30" width="60" height="72" viewBox="0 0 140 168" preserveAspectRatio="xMinYMin slice">' +
          '<path class="m-face" d="M8,14 C40,4 100,4 132,14 L132,92 C130,128 104,150 70,166 C36,150 10,128 8,92 Z"/>' +
          '<image href="' + LOGO + '" xlink:href="' + LOGO + '" width="552" height="168"/>' +
        "</svg>" +

        /* headband */
        '<rect class="m-band" x="51" y="36" width="58" height="9" rx="2"/>' +
        '<rect class="m-stripe" x="51" y="38.2" width="58" height="1.4"/>' +
        '<rect class="m-stripe" x="51" y="41.4" width="58" height="1.4"/>' +

        /* sweat drop at the top of each rep */
        '<path class="m-drop" d="M114,34 q3,4 0,6 q-3,-2 0,-6z" opacity="0">' +
          '<animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.45;0.6;1" dur="1.8s" repeatCount="indefinite"/>' +
          '<animateTransform attributeName="transform" type="translate" values="0 0;0 0;2 -2;6 8" keyTimes="0;0.45;0.6;1" dur="1.8s" repeatCount="indefinite"/>' +
        "</path>" +

        /* barbell + gloves travel together */
        "<g>" + move("0 0", "0 -42") +
          '<rect class="m-bar" x="10" y="54.5" width="140" height="3" rx="1.5"/>' +
          '<rect class="m-plate" x="12" y="44" width="7" height="24" rx="2"/>' +
          '<rect class="m-plate" x="20" y="48" width="5" height="16" rx="1.5"/>' +
          '<rect class="m-plate" x="141" y="44" width="7" height="24" rx="2"/>' +
          '<rect class="m-plate" x="135" y="48" width="5" height="16" rx="1.5"/>' +
          '<circle class="m-glove" cx="34" cy="56" r="5.5"/>' +
          '<circle class="m-glove" cx="126" cy="56" r="5.5"/>' +
        "</g>" +
      "</g>" +
    "</svg>";
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
