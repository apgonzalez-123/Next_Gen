/* NextGen Portfolio Builder — the guest flow.
 * welcome -> 5 steps -> results. State lives in memory; the finished
 * answer set goes to STORE on submit.
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
  function labelFor(axisId, value) { return window.axisLabel(axisId, value) || "None"; }

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
      btnNext.textContent = last ? "See my portfolio" : "Continue";
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
    hero.innerHTML =
      '<div class="eyebrow">NextGen Session</div>' +
      '<h1>Build the room&rsquo;s portfolio.</h1>' +
      '<p>Five short steps. Pick what you would actually do with your own capital. ' +
      'We average every answer in the room and find the portfolio that fits it best.</p>';
    s.appendChild(hero);

    var preview = el("div", "steps-preview");
    steps.forEach(function (st) {
      preview.appendChild(el("div", "", '<i>0' + st.n + '</i><span>' + esc(st.title) + "</span>"));
    });
    s.appendChild(preview);

    if (guest.fromLink && guest.fields.name) {
      s.appendChild(el("div", "notice",
        "<div>Signed in as <b>" + esc(guest.fields.name) + "</b>" +
        (guest.fields.group ? ", " + esc(guest.fields.group) : "") + "</div>"));
    }

    s.appendChild(el("p", "footnote", "Takes about two minutes."));
    app.appendChild(s);
  }

  /* Registration — the first step, not a form bolted under the intro. */
  function renderRegister() {
    var s = el("section", "screen");
    var optional = window.CONFIG.IDENTIFY === "optional";

    s.appendChild(el("div", "step-head",
      "<h2>Registration</h2><p>So your host can match this portfolio back to you.</p>"));

    var wrap = el("div", "idblock");
    regFields().forEach(function (f) {
      var lab = el("label", "field");
      var soft = optional || !f.required;
      lab.innerHTML = '<span class="field-label">' + esc(f.label) +
        (soft ? ' <em>optional</em>' : "") + "</span>";

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

    s.appendChild(el("p", "footnote", esc(window.CONFIG.PRIVACY_NOTE)));
    app.appendChild(s);
  }

  function renderStep(i) {
    var step = steps[i];
    var s = el("section", "screen");

    var head = el("div", "step-head");
    head.innerHTML = "<h2>" + esc(step.title) + "</h2><p>" + esc(step.blurb) + "</p>";
    s.appendChild(head);

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
      .then(function (res) { roomData = res; view = "results"; render(); })
      .catch(function (err) {
        /* A dropped connection must never strand a guest mid-session —
           fall back to their own result and say so. */
        console.error(err);
        roomData = { agg: window.ENGINE.aggregate([{ id: "me", answers: answers }]),
                     real: 1, synthetic: 0, mode: "offline" };
        view = "results";
        render();
      });
  }

  function renderResults() {
    var s = el("section", "screen");
    var ranked = window.ENGINE.rank(answers);
    var ruledOut = ranked.filter(function (r) { return r.blocked; });
    var mine = ranked[0];
    var agg = roomData.agg;
    var roomCount = agg.count;
    var roomProfile = window.ENGINE.aggProfile(agg);
    var roomTop = window.ENGINE.rank(roomProfile)[0];
    var split = window.ENGINE.aggSplit(agg);

    /* --- hero: the guest's own match --- */
    if (mine.blocked) {
      /* Every portfolio on the shelf clashes with this guest's exclusions.
         That is a real answer, not an error, so say so plainly rather than
         recommending something they have ruled out. */
      s.appendChild(el("div", "result-head",
        '<div class="eyebrow">Your match</div>' +
        '<h2 class="display" style="font-size:clamp(28px,7vw,40px)">Nothing on the shelf fits</h2>' +
        '<p class="tagline">Your exclusions rule out every portfolio we hold.</p>'));
      s.appendChild(el("div", "notice",
        "<div>This is worth a conversation with your advisor. " +
        "a mandate this constrained needs a portfolio built for it.</div>"));
    } else {
      s.appendChild(el("div", "result-head",
        '<div class="eyebrow">' +
          (guest.fields.name ? esc(guest.fields.name) + "&rsquo;s portfolio" : "Your portfolio") +
        "</div>" +
        '<h2 class="display">' + esc(mine.portfolio.name) + "</h2>" +
        '<p class="tagline">' + esc(mine.portfolio.tagline) + "</p>"));
    }

    var fitCard = el("div", "card");
    fitCard.innerHTML =
      "<h3>Fit</h3>" +
      '<div class="fit"><b>' + mine.fit + '</b><span>out of 100</span></div>' +
      '<div class="meter"><i style="width:0"></i></div>' +
      '<p class="body" style="margin-top:16px">' + esc(mine.portfolio.blurb) + "</p>";
    s.appendChild(fitCard);

    /* --- allocation --- */
    s.appendChild(allocCard(mine.portfolio));

    /* --- characteristics --- */
    var traits = el("div", "card");
    var dl = '<dl style="margin:0">' +
      '<div class="kv"><dt>Expected return</dt><dd>' + esc(mine.portfolio.expReturn) + "</dd></div>" +
      '<div class="kv"><dt>Volatility</dt><dd>' + esc(mine.portfolio.vol) + "</dd></div>" +
      "</dl>";
    traits.innerHTML = "<h3>Profile</h3>" + dl +
      '<div class="traits" style="margin-top:18px">' +
      mine.portfolio.traits.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") +
      "</div>";
    s.appendChild(traits);

    /* --- the proposed book and its risk --- */
    if (!mine.blocked) {
      var hc = holdingsCard(mine.portfolio);
      if (hc) s.appendChild(hc);
      var rc = riskCard(mine.portfolio);
      if (rc) s.appendChild(rc);
    }

    if (ruledOut.length && !mine.blocked) {
      s.appendChild(el("div", "notice",
        "<div><b>Ruled out by your exclusions:</b> " +
        ruledOut.map(function (r) {
          return esc(r.portfolio.name) + " <span style=\"opacity:.7\">(" +
                 esc(r.blockedBy.join(", ")) + ")</span>";
        }).join(" &middot; ") +
        "</div>"));
    }

    /* --- the room --- */
    s.appendChild(el("div", "result-head", '<div class="eyebrow">The room</div>' +
      '<h2 class="display" style="font-size:clamp(28px,8vw,40px)">' + esc(roomTop.portfolio.name) + "</h2>" +
      '<p class="tagline">' + roomCount + " guest" + (roomCount === 1 ? "" : "s") + ", averaged</p>"));

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

    /* --- room split: the reveal --- */
    var splitCard = el("div", "card");
    splitCard.innerHTML = "<h3>Where the room landed</h3>";
    var bars = el("div", "bars");
    split.forEach(function (row) {
      var isLead = row === split[0];
      var isMine = row.portfolio.id === mine.portfolio.id;
      var r = el("div", "bar-row" + (isLead ? " lead" : "") + (isMine ? " mine" : ""));
      r.innerHTML =
        '<div class="bar-top"><span class="bar-name">' + esc(row.portfolio.name) + "</span>" +
        '<span class="bar-val">' + row.count + " &middot; " + row.pct + "%</span></div>" +
        '<div class="bar-track"><i class="bar-fill" style="width:0" data-w="' + row.pct + '"></i></div>';
      bars.appendChild(r);
    });
    splitCard.appendChild(bars);
    splitCard.appendChild(el("p", "footnote",
      "Each guest matched on their own answers. The headline above averages everyone into a single profile, " +
      "which is why it can differ from the most common individual result."));
    s.appendChild(splitCard);

    /* --- where this guest stands against the room --- */
    s.appendChild(standingCard(agg, roomProfile, split, mine));

    /* --- what the room picked on the categorical questions --- */
    var picks = el("div", "card");
    picks.innerHTML = "<h3>The room&rsquo;s consensus</h3>";
    var pl = document.createElement("dl");
    pl.style.margin = "0";
    window.AXES.filter(function (a) {
      return a.kind === "choice" || a.kind === "multi";
    }).forEach(function (axis) {
      var dist = window.ENGINE.aggDistribution(agg, axis.id);
      var sorted = dist.bars.slice().sort(function (a, b) { return b.count - a.count; });
      var dd;
      if (axis.kind === "multi") {
        /* A multi axis has no single winner — show what the room actually
           converged on, or say plainly that it ruled nothing out. */
        var kept = sorted.filter(function (b) { return b.pct >= 25; }).slice(0, 3);
        dd = kept.length
          ? kept.map(function (b) {
              return esc(b.label) + ' <span style="color:var(--muted);font-weight:400">' + b.pct + "%</span>";
            }).join("<br>")
          : '<span style="color:var(--muted);font-weight:400">no clear consensus</span>';
      } else {
        dd = esc(sorted[0].label) +
             ' <span style="color:var(--muted);font-weight:400">' + sorted[0].pct + "%</span>";
      }
      var row = el("div", "kv");
      row.innerHTML = "<dt>" + esc(axis.label) + "</dt><dd>" + dd + "</dd>";
      pl.appendChild(row);
    });
    picks.appendChild(pl);
    s.appendChild(picks);

    var again = el("button", "btn btn-ghost", "Start over");
    again.type = "button";
    again.style.width = "100%";
    again.style.marginTop = "10px";
    again.addEventListener("click", function () {
      answers = {};
      /* A shared device (an iPad on the table) hands over to the next
         guest: keep the group, clear the person. */
      if (!guest.fromLink) {
        /* A shared device (an iPad on the table) hands over to the next
           guest: keep the group, clear the person. */
        guest = { token: "", fromLink: false, fields: { group: guest.fields.group || "" } };
      }
      view = "welcome";
      render();
    });
    s.appendChild(again);

    s.appendChild(el("p", "footnote",
      "Illustrative only, built for the NextGen session. Not investment advice, " +
      "not an offer, and not a recommendation to buy or sell any instrument."));

    app.appendChild(s);
    animateBars(s);
  }

  var ASSET_CLASSES = [
    { k: "equities",    label: "Equities",         c: "var(--series-equities)" },
    { k: "fixedIncome", label: "Fixed income",     c: "var(--series-fixedincome)" },
    { k: "notes",       label: "Structured notes", c: "var(--series-notes)" },
    { k: "cash",        label: "Cash",             c: "var(--series-cash)" }
  ];

  /* Where this guest sits relative to everyone else.
     A headline percentile on risk appetite, then every numeric question
     with the guest's own answer against the room's average, and finally
     how many others landed on the same portfolio. */
  function standingCard(agg, roomProfile, split, mine) {
    var card = el("div", "card");
    card.innerHTML = "<h3>Where you stand</h3>";

    var numeric = window.AXES.filter(function (a) {
      return a.kind === "scale" || a.kind === "range";
    });

    /* Headline: risk appetite if we have it, else the first numeric axis. */
    var lead = window.AXIS_BY_ID.riskProfile ? "riskProfile" : (numeric[0] && numeric[0].id);
    var pct = lead ? window.ENGINE.percentile(agg, lead, answers[lead]) : null;
    if (pct !== null && agg.count > 1) {
      var word = pct >= 50 ? "more" : "less";
      var side = pct >= 50 ? pct : 100 - pct;
      card.appendChild(el("div", "stand-head",
        "<b>" + side + "%</b> <span>of the room is " + word +
        " cautious than you</span>"));
    }

    numeric.forEach(function (axis) {
      var mineV = answers[axis.id];
      var roomV = roomProfile[axis.id];
      if (mineV === null || mineV === undefined || roomV === null) return;

      var base = axis.kind === "range" ? axis.min : 0;
      var sp = window.ENGINE.span(axis);
      var youPos  = ((mineV - base) / sp) * 100;
      var roomPos = ((roomV - base) / sp) * 100;

      var youTxt = axis.kind === "range"
        ? window.axisLabel(axis.id, mineV)
        : axis.options[mineV].label;
      /* A bare "0.9" means nothing on its own — say what it is out of. */
      var roomTxt = axis.kind === "range"
        ? window.axisLabel(axis.id, Math.round(roomV))
        : roomV.toFixed(1) + " of " + (axis.options.length - 1);

      var row = el("div", "scale-row");
      row.innerHTML =
        '<div class="scale-q">' + esc(axis.label) +
          '<span class="scale-vals">you <b>' + esc(youTxt) + "</b> &middot; room " +
          esc(roomTxt) + "</span></div>" +
        '<div class="scale-track">' +
          '<span class="you" style="left:' + youPos + '%"></span>' +
          '<span class="room" style="left:' + roomPos + '%"></span>' +
        "</div>" +
        '<div class="scale-ends"><span>' +
          esc(axis.kind === "range" ? (axis.minLabel || axis.min) : axis.options[0].label) +
        "</span><span>" +
          esc(axis.kind === "range" ? (axis.maxLabel || axis.max) : axis.options[axis.options.length - 1].label) +
        "</span></div>";
      card.appendChild(row);
    });

    card.appendChild(el("div", "legend-inline",
      '<div><s class="room"></s>Room average</div><div><s class="you"></s>You</div>'));

    /* How much company they have on their own result. */
    var mineRow = split.filter(function (r) { return r.portfolio.id === mine.portfolio.id; })[0];
    if (mineRow && mineRow.count > 0 && agg.complete > 1) {
      var others = mineRow.count - 1;
      card.appendChild(el("p", "stand-foot",
        others > 0
          ? "<b>" + others + "</b> other guest" + (others === 1 ? "" : "s") +
            " landed on " + esc(mine.portfolio.name) + ", " + mineRow.pct + "% of the room."
          : "No one else landed on " + esc(mine.portfolio.name) + ". You are the only one."));
    }
    return card;
  }

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

  /* The proposed book: every line the portfolio would actually hold,
     grouped by asset class and weighted. */
  function holdingsCard(p) {
    if (!p.holdings || !p.holdings.length) return null;
    var card = el("div", "card");
    card.innerHTML = "<h3>Proposed portfolio</h3>";
    var host = el("div", "hold");

    ASSET_CLASSES.forEach(function (cls) {
      var lines = p.holdings.filter(function (h) { return h.cls === cls.k; });
      if (!lines.length) return;
      var total = lines.reduce(function (a, h) { return a + h.weight; }, 0);

      host.appendChild(el("div", "hold-group",
        '<s style="background:' + cls.c + '"></s>' + esc(cls.label) + "<b>" + total + "%</b>"));

      lines.forEach(function (h) {
        var row = el("div", "hold-row");
        row.innerHTML =
          "<div><div class=\"hold-name\">" + esc(h.name) + "</div>" +
          '<div class="hold-meta">' +
            (h.ticker ? '<span class="tick-id">' + esc(h.ticker) + "</span>" : "") +
            esc(h.detail || "") + "</div></div>" +
          '<div class="hold-w">' + h.weight + "%</div>" +
          '<div class="hold-bar"><i style="width:0;background:' + cls.c +
            '" data-w="' + h.weight + '"></i></div>';
        host.appendChild(row);
      });
    });

    card.appendChild(host);
    return card;
  }

  /* Risk metrics and the three-case scenario band. */
  function riskCard(p) {
    var r = p.risk;
    if (!r) return null;
    var card = el("div", "card");
    card.innerHTML = "<h3>Risk &amp; scenarios</h3>";

    var m = el("dl", "metrics");
    [
      { t: "Expected return", v: r.expReturn.toFixed(1), u: "% p.a." },
      { t: "Volatility",      v: r.vol.toFixed(1),       u: "% p.a." },
      { t: "Max drawdown",    v: r.maxDrawdown.toFixed(1), u: "%", neg: true },
      { t: "Sharpe ratio",    v: r.sharpe.toFixed(2),    u: "" },
      { t: "Running yield",   v: r.yield.toFixed(1),     u: "%" }
    ].forEach(function (x) {
      var d = el("div", "metric");
      d.innerHTML = "<dt>" + esc(x.t) + "</dt><dd" + (x.neg ? ' class="neg"' : "") + ">" +
        esc(x.v) + (x.u ? "<small>" + esc(x.u) + "</small>" : "") + "</dd>";
      m.appendChild(d);
    });
    card.appendChild(m);

    /* Bars grow from a shared zero line, scaled to the widest case either
       way, so bull and bear are visually comparable. */
    var span = Math.max.apply(null, r.scenarios.map(function (s) { return Math.abs(s.pct); })) || 1;
    var zeroAt = 100 * (span / (2 * span));   /* zero sits mid-track */
    var scen = el("div", "scen");
    scen.style.marginTop = "18px";

    r.scenarios.forEach(function (sc) {
      var up = sc.pct >= 0;
      var w = (Math.abs(sc.pct) / span) * 50;   /* half-track max */
      var row = el("div", "scen-row");
      row.innerHTML =
        '<div class="scen-top"><span class="scen-name">' + esc(sc.label) + "</span>" +
        '<span class="scen-val ' + (up ? "up" : "down") + '">' +
          (up ? "+" : "") + sc.pct.toFixed(1) + "%</span></div>" +
        '<div class="scen-track">' +
          '<span class="scen-zero" style="left:' + zeroAt + '%"></span>' +
          '<i style="' + (up ? "left:" + zeroAt + "%" : "right:" + (100 - zeroAt) + "%") +
            ";width:0;background:" + (up ? "var(--pos)" : "var(--neg)") +
            '" data-w="' + w + '"></i>' +
        "</div>" +
        '<div class="scen-driver">' + esc(sc.driver) + "</div>";
      scen.appendChild(row);
    });
    card.appendChild(scen);

    card.appendChild(el("div", "disclaim",
      "<b>Hypothetical.</b> Return, volatility and drawdown figures are modelled " +
      "illustrations for this session, not actual or predicted performance. " +
      "Scenario outcomes are not probabilities and are not guaranteed."));
    return card;
  }

  /* Bars and meters start at zero and grow once painted — the motion is
     what makes the reveal land on a projector. */
  function animateBars(root) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.querySelectorAll("[data-w]").forEach(function (f) {
          f.style.width = f.getAttribute("data-w") + "%";
        });
        var meter = root.querySelector(".meter i");
        if (meter) {
          var fit = root.querySelector(".fit b");
          meter.style.width = (fit ? fit.textContent : 0) + "%";
        }
      });
    });
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
    var step = steps[waitingFor];
    var s = el("section", "screen");
    s.appendChild(el("div", "wait",
      '<div class="wait-pulse" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '<div class="eyebrow">Up next</div>' +
      '<h2 class="display">' + esc(step.title) + "</h2>" +
      "<p>Your answers so far are saved. This section opens when your host reaches " +
      "that part of the presentation, and this page moves on by itself.</p>"));
    app.appendChild(s);
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
