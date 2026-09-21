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

  var steps = window.SCHEMA.steps;
  var answers = {};
  var guest = readUrlIdentity();   /* { name, token, group } */
  var view = "welcome";            /* "welcome" | 0..4 | "results" */
  var roomData = null;

  /* A personal link — ?g=TOKEN&n=Name, which is what qr-gen.html prints —
   * identifies the guest up front, so they never see the name field. The
   * token is what ties this device's answers to a row on the guest list. */
  function readUrlIdentity() {
    var q = new URLSearchParams(window.location.search);
    var token = q.get("g") || "";
    var name  = q.get("n") || "";
    var group = q.get("t") || "";
    var saved = window.STORE.savedGuest();
    if (token || name) {
      return { token: token, name: name, group: group, fromLink: !!token };
    }
    return saved || { token: "", name: "", group: "", fromLink: false };
  }

  function needsName() {
    return window.CONFIG.IDENTIFY !== "off" && !guest.fromLink;
  }
  function identityOk() {
    if (window.CONFIG.IDENTIFY !== "required") return true;
    if (guest.fromLink) return true;
    return !!(guest.name && guest.name.trim().length >= 2);
  }

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
  function labelFor(axisId, value) {
    var axis = window.AXIS_BY_ID[axisId];
    var opt = axis.options.find(function (o) { return o.v === value; });
    return opt ? opt.label : "—";
  }

  /* ---------- render ---------- */

  function render() {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    app.innerHTML = "";
    if (view === "welcome")      renderWelcome();
    else if (view === "results") renderResults();
    else                         renderStep(view);
    renderChrome();
  }

  function renderChrome() {
    var onStep = typeof view === "number";
    rail.hidden = !onStep;
    actions.hidden = (view === "results");

    if (onStep) {
      rail.innerHTML = "";
      steps.forEach(function (s, i) {
        rail.appendChild(el("span", i < view ? "done" : i === view ? "active" : ""));
      });
      stepCount.textContent = "Step " + (view + 1) + " of " + steps.length;
      btnBack.hidden = false;
      btnBack.textContent = view === 0 ? "Start over" : "Back";
      btnNext.textContent = view === steps.length - 1 ? "See the results" : "Continue";
      btnNext.disabled = !stepComplete(view);
    } else if (view === "welcome") {
      stepCount.textContent = "";
      btnBack.hidden = true;
      btnNext.textContent = "Begin";
      btnNext.disabled = !identityOk();
    } else {
      stepCount.textContent = "Complete";
    }
  }

  function stepComplete(i) {
    return steps[i].questions.every(function (q) {
      return answers[q.id] !== undefined && answers[q.id] !== null;
    });
  }

  function renderWelcome() {
    var s = el("section", "screen");
    var hero = el("div", "hero");
    hero.innerHTML =
      '<div class="eyebrow">NextGen Session</div>' +
      '<h1>Build the room&rsquo;s <em>portfolio</em>.</h1>' +
      '<p>Five short steps. Pick what you would actually do with your own capital &mdash; ' +
      'then we average every answer in the room and find the portfolio that fits it best.</p>';
    s.appendChild(hero);

    var preview = el("div", "steps-preview");
    steps.forEach(function (st) {
      preview.appendChild(el("div", "", '<i>0' + st.n + '</i><span>' + esc(st.title) + "</span>"));
    });
    s.appendChild(preview);

    if (guest.fromLink && guest.name) {
      s.appendChild(el("div", "notice",
        "<span>&#9679;</span><div>Signed in as <b>" + esc(guest.name) + "</b>" +
        (guest.group ? " &middot; " + esc(guest.group) : "") + "</div>"));
    } else if (needsName()) {
      s.appendChild(identityFields());
    }

    s.appendChild(el("p", "footnote",
      esc(window.CONFIG.PRIVACY_NOTE) + " Takes about two minutes."));
    app.appendChild(s);
  }

  function identityFields() {
    var wrap = el("div", "idblock");
    var optional = window.CONFIG.IDENTIFY === "optional";

    var nameWrap = el("label", "field");
    nameWrap.innerHTML = '<span class="field-label">Your name' +
      (optional ? ' <em>optional</em>' : "") + "</span>";
    var name = document.createElement("input");
    name.type = "text";
    name.className = "field-input";
    name.placeholder = "First and last name";
    name.autocomplete = "name";
    name.value = guest.name || "";
    name.addEventListener("input", function () {
      guest.name = name.value;
      renderChrome();
    });
    nameWrap.appendChild(name);
    wrap.appendChild(nameWrap);

    if (window.CONFIG.GROUP_FIELD) {
      var gWrap = el("label", "field");
      gWrap.innerHTML = '<span class="field-label">' + esc(window.CONFIG.GROUP_FIELD) +
        ' <em>optional</em></span>';
      var grp = document.createElement("input");
      grp.type = "text";
      grp.className = "field-input";
      grp.placeholder = "e.g. Table 4";
      grp.value = guest.group || "";
      grp.addEventListener("input", function () { guest.group = grp.value; });
      gWrap.appendChild(grp);
      wrap.appendChild(gWrap);
    }
    return wrap;
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

      /* FX currency lists are short and uniform — two columns reads better
         than one tall stack on a phone. */
      var twoUp = q.options.length >= 6 && q.options.every(function (o) { return o.label.length <= 4; });
      var opts = el("div", "opts" + (twoUp ? " two" : ""));
      opts.setAttribute("role", "radiogroup");
      opts.setAttribute("aria-label", q.label);

      q.options.forEach(function (o) {
        var selected = answers[q.id] === o.v;
        var b = el("button", "opt" + (selected ? " sel" : ""));
        b.type = "button";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", selected ? "true" : "false");
        b.innerHTML =
          '<span class="tick" aria-hidden="true"></span>' +
          '<span class="opt-txt"><span class="opt-main">' + esc(o.label) + "</span>" +
          (o.sub ? '<span class="opt-sub">' + esc(o.sub) + "</span>" : "") +
          "</span>";
        b.addEventListener("click", function () {
          answers[q.id] = o.v;
          /* repaint just this group — a full re-render would scroll away */
          Array.prototype.forEach.call(opts.children, function (c) {
            c.classList.remove("sel");
            c.setAttribute("aria-checked", "false");
          });
          b.classList.add("sel");
          b.setAttribute("aria-checked", "true");
          renderChrome();
        });
        opts.appendChild(b);
      });

      block.appendChild(opts);
      s.appendChild(block);
    });

    app.appendChild(s);
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
        roomData = { responses: [{ id: "me", answers: answers }], real: 1, synthetic: 0, mode: "offline" };
        view = "results";
        render();
      });
  }

  function renderResults() {
    var s = el("section", "screen");
    var mine = window.ENGINE.rank(answers)[0];
    var responses = roomData.responses;
    var roomProfile = window.ENGINE.roomProfile(responses);
    var roomTop = window.ENGINE.rank(roomProfile)[0];
    var split = window.ENGINE.roomSplit(responses);

    /* --- hero: the guest's own match --- */
    s.appendChild(el("div", "result-head",
      '<div class="eyebrow">Your match</div>' +
      '<h2 class="display">' + esc(mine.portfolio.name) + "</h2>" +
      '<p class="tagline">' + esc(mine.portfolio.tagline) + "</p>"));

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

    /* --- the room --- */
    s.appendChild(el("div", "result-head", '<div class="eyebrow">The room</div>' +
      '<h2 class="display" style="font-size:clamp(28px,8vw,40px)">' + esc(roomTop.portfolio.name) + "</h2>" +
      '<p class="tagline">' + responses.length + " guests, averaged</p>"));

    if (roomData.mode === "demo" && roomData.synthetic) {
      s.appendChild(el("div", "notice",
        "<span>&#9679;</span><div><b>Demo mode.</b> " + roomData.synthetic +
        " of these responses are a simulated audience so the screens are populated before the room fills up. " +
        "Connect the vote backend for live-only numbers.</div>"));
    } else if (roomData.mode === "offline") {
      s.appendChild(el("div", "notice",
        "<span>&#9679;</span><div><b>Offline.</b> We could not reach the vote server, " +
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
      "Each guest matched on their own answers. The headline above averages everyone into a single profile &mdash; " +
      "which is why it can differ from the most common individual result."));
    s.appendChild(splitCard);

    /* --- you vs the room, on every scale axis --- */
    var cmp = el("div", "card");
    cmp.innerHTML = "<h3>You against the room</h3>";
    window.AXES.filter(function (a) { return a.kind === "scale"; }).forEach(function (axis) {
      var roomPos = window.ENGINE.scalePosition(roomProfile, axis.id);
      var youPos  = (answers[axis.id] / 3) * 100;
      var row = el("div", "scale-row");
      row.innerHTML =
        '<div class="scale-q">' + esc(axis.label) + "</div>" +
        '<div class="scale-track">' +
          '<span class="you" style="left:' + youPos + '%"></span>' +
          '<span class="room" style="left:' + roomPos + '%"></span>' +
        "</div>" +
        '<div class="scale-ends"><span>' + esc(axis.options[0].label) + "</span>" +
        "<span>" + esc(axis.options[axis.options.length - 1].label) + "</span></div>";
      cmp.appendChild(row);
    });
    cmp.appendChild(el("div", "legend-inline",
      '<div><s class="room"></s>Room average</div><div><s class="you"></s>You</div>'));
    s.appendChild(cmp);

    /* --- what the room picked on the categorical questions --- */
    var picks = el("div", "card");
    picks.innerHTML = "<h3>The room&rsquo;s consensus</h3>";
    var pl = document.createElement("dl");
    pl.style.margin = "0";
    window.AXES.filter(function (a) { return a.kind === "choice"; }).forEach(function (axis) {
      var dist = window.ENGINE.distribution(responses, axis.id);
      var top = dist.bars.slice().sort(function (a, b) { return b.count - a.count; })[0];
      var row = el("div", "kv");
      row.innerHTML = "<dt>" + esc(axis.label) + "</dt><dd>" + esc(top.label) +
        ' <span style="color:var(--muted);font-weight:400">' + top.pct + "%</span></dd>";
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
      if (!guest.fromLink) guest = { token: "", name: "", group: guest.group, fromLink: false };
      view = "welcome";
      render();
    });
    s.appendChild(again);

    s.appendChild(el("p", "footnote",
      "Illustrative only. Built for the NextGen session &mdash; not investment advice, " +
      "not an offer, and not a recommendation to buy or sell any instrument."));

    app.appendChild(s);
    animateBars(s);
  }

  function allocCard(p) {
    var card = el("div", "card");
    var keys = [
      { k: "equities",    label: "Equities",      c: "var(--series-equities)" },
      { k: "fixedIncome", label: "Fixed income",  c: "var(--series-fixedincome)" },
      { k: "notes",       label: "Structured notes", c: "var(--series-notes)" },
      { k: "cash",        label: "Cash",          c: "var(--series-cash)" }
    ];
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

  /* Bars and meters start at zero and grow once painted — the motion is
     what makes the reveal land on a projector. */
  function animateBars(root) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.querySelectorAll(".bar-fill[data-w]").forEach(function (f) {
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

  btnNext.addEventListener("click", function () {
    if (view === "welcome") {
      if (!identityOk()) return;
      view = 0; render(); return;
    }
    if (typeof view === "number") {
      if (!stepComplete(view)) return;
      if (view === steps.length - 1) submit();
      else { view = view + 1; render(); }
    }
  });

  btnBack.addEventListener("click", function () {
    if (view === 0) { answers = {}; view = "welcome"; }
    else if (typeof view === "number") view = view - 1;
    render();
  });

  /* Wait for the portfolio base before the first paint, so a replaced
     data/portfolios.json is in force from the very first screen. */
  window.BASE.ready.then(render);
})();
