/* NextGen Portfolio Builder — presenter view.
 *
 * Five slides: join (QR) -> the split -> the verdict -> two breakdown
 * boards. Arrow keys move; the data refreshes on a timer regardless of
 * which slide is up, so the counter keeps climbing on the join screen.
 *
 * Painting is DIFF-BASED on purpose. Rewriting innerHTML on every poll
 * would reset every bar to zero and re-run the grow animation every few
 * seconds — a visible flicker on a projector. Instead the DOM is built
 * once and only widths, numbers and ordering are updated, so bars glide
 * from their old value to the new one as votes land.
 */
(function () {
  var slides  = Array.prototype.slice.call(document.querySelectorAll(".p-slide"));
  var dots    = document.getElementById("dots");
  var current = 0;
  var last    = null;

  var built = false;      /* skeletons built? */
  var splitRows = {};     /* portfolio id -> { root, fill, val, name } */
  var axisRows  = {};     /* axis id -> { head, bars: { value -> {row, fill, val} } } */
  var lastVerdictId = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  /* ---------- QR ---------- */
  /* The guest URL is this page's own origin and path with present.html
     stripped, so the QR is right wherever the site is deployed and there
     is nothing to configure by hand. */
  function guestUrl() {
    var u = window.location.href.split("?")[0].split("#")[0];
    return u.replace(/present\.html?$/, "").replace(/\/$/, "") + "/";
  }

  function renderQR() {
    var url = guestUrl();
    document.getElementById("joinUrl").textContent =
      url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    new QRCode(document.getElementById("qr"), {
      text: url,
      width: 330,
      height: 330,
      colorDark: "#0A1220",
      colorLight: "#ffffff",
      /* High correction: still scans from the back of the room, and
         survives a projector washing out the contrast. */
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  /* ---------- skeletons, built once ---------- */

  function buildSkeletons() {
    /* --- split bars: one stable row per portfolio, reordered by CSS --- */
    var host = document.getElementById("splitBars");
    host.innerHTML = "";
    window.PORTFOLIOS.forEach(function (p) {
      var row = el("div", "p-bar");
      row.innerHTML =
        '<div class="p-bar-name">' + esc(p.name) + "</div>" +
        '<div class="p-bar-track"><i class="p-bar-fill" style="width:0"></i></div>' +
        '<div class="p-bar-val">0 &middot; 0%</div>';
      host.appendChild(row);
      splitRows[p.id] = {
        root: row,
        fill: row.querySelector(".p-bar-fill"),
        val:  row.querySelector(".p-bar-val")
      };
    });

    /* --- breakdown boards: fixed structure, split across two slides --- */
    var half = Math.ceil(window.AXES.length / 2);
    var hosts = [document.getElementById("breakdownA"), document.getElementById("breakdownB")];
    hosts.forEach(function (h) { h.innerHTML = ""; });

    window.AXES.forEach(function (axis, i) {
      var panel = el("div", "p-panel");
      var head = el("h4", "", esc(axis.label));
      panel.appendChild(head);
      var bars = el("div", "bars");
      var map = {};
      axis.options.forEach(function (o) {
        var row = el("div", "bar-row");
        row.innerHTML =
          '<div class="bar-top"><span class="bar-name">' + esc(o.label) + "</span>" +
          '<span class="bar-val">0%</span></div>' +
          '<div class="bar-track"><i class="bar-fill" style="width:0"></i></div>';
        bars.appendChild(row);
        map[o.v] = {
          row:  row,
          fill: row.querySelector(".bar-fill"),
          val:  row.querySelector(".bar-val")
        };
      });
      panel.appendChild(bars);
      hosts[i < half ? 0 : 1].appendChild(panel);
      axisRows[axis.id] = { head: head, label: axis.label, bars: map };
    });

    built = true;
  }

  /* ---------- painting ---------- */

  function paint(res) {
    last = res;
    var responses = res.responses;

    document.getElementById("liveCount").textContent = responses.length;
    var badge = document.getElementById("modeBadge");
    badge.hidden = res.mode !== "demo";
    if (res.mode === "demo") {
      badge.textContent = "Demo · " + res.real + " live + " + res.synthetic + " simulated";
    }

    if (!responses.length) return;
    if (!built) buildSkeletons();

    var roomProfile = window.ENGINE.roomProfile(responses);
    paintSplit(window.ENGINE.roomSplit(responses));
    paintVerdict(window.ENGINE.rank(roomProfile)[0], responses.length);
    paintBreakdown(responses, roomProfile);
  }

  function paintSplit(split) {
    split.forEach(function (row, i) {
      var r = splitRows[row.portfolio.id];
      if (!r) return;
      r.root.style.order = i;                 /* reorder without rebuilding */
      r.root.classList.toggle("lead", i === 0 && row.count > 0);
      r.fill.style.width = row.pct + "%";     /* CSS transition does the rest */
      r.val.innerHTML = row.count + " &middot; " + row.pct + "%";
    });
  }

  function ALLOC_KEYS() {
    return [
      { k: "equities",    label: "Equities",         c: "var(--series-equities)" },
      { k: "fixedIncome", label: "Fixed income",     c: "var(--series-fixedincome)" },
      { k: "notes",       label: "Structured notes", c: "var(--series-notes)" },
      { k: "cash",        label: "Cash",             c: "var(--series-cash)" }
    ];
  }

  function paintVerdict(top, n) {
    var p = top.portfolio;
    var host = document.getElementById("verdict");
    var keys = ALLOC_KEYS();

    /* Only rebuild when the winning portfolio actually changes — otherwise
       just refresh the numbers that move. */
    if (lastVerdictId !== p.id) {
      lastVerdictId = p.id;
      host.innerHTML =
        "<div>" +
          "<h1>" + esc(p.name) + "</h1>" +
          '<p class="tagline">' + esc(p.tagline) + "</p>" +
          '<p class="body">' + esc(p.blurb) + "</p>" +
        "</div>" +
        "<div>" +
          '<div class="p-fit"><b id="vFit">0</b><span>fit out of 100<br><span id="vN">0</span> responses</span></div>' +
          '<div class="alloc-bar">' +
            keys.map(function (x) {
              return '<i style="flex:' + p.alloc[x.k] + ' 0 0;background:' + x.c + '"></i>';
            }).join("") +
          "</div>" +
          '<div class="legend">' +
            keys.map(function (x) {
              return '<div><s style="background:' + x.c + '"></s>' + x.label + "<b>" + p.alloc[x.k] + "%</b></div>";
            }).join("") +
          "</div>" +
          '<dl style="margin:22px 0 0">' +
            '<div class="kv"><dt>Expected return</dt><dd>' + esc(p.expReturn) + "</dd></div>" +
            '<div class="kv"><dt>Volatility</dt><dd>' + esc(p.vol) + "</dd></div>" +
          "</dl>" +
        "</div>";
    }
    var f = document.getElementById("vFit");
    var c = document.getElementById("vN");
    if (f) f.textContent = top.fit;
    if (c) c.textContent = n;
  }

  function paintBreakdown(responses, roomProfile) {
    window.AXES.forEach(function (axis) {
      var panel = axisRows[axis.id];
      var dist = window.ENGINE.distribution(responses, axis.id);
      var maxPct = Math.max.apply(null, dist.bars.map(function (b) { return b.pct; }));

      panel.head.innerHTML = esc(panel.label) + (axis.kind === "scale" && roomProfile[axis.id] !== null
        ? ' <span style="color:var(--gold);font-weight:500">&middot; avg ' + roomProfile[axis.id].toFixed(1) + "</span>"
        : "");

      dist.bars.forEach(function (b) {
        var r = panel.bars[b.value];
        if (!r) return;
        r.fill.style.width = b.pct + "%";
        r.val.textContent = b.pct + "%";
        r.row.classList.toggle("lead", b.pct === maxPct && b.pct > 0);
      });
    });
  }

  /* ---------- slides ---------- */

  function go(i, fromHash) {
    current = (i + slides.length) % slides.length;
    slides.forEach(function (s, n) { s.classList.toggle("on", n === current); });
    Array.prototype.forEach.call(dots.children, function (d, n) {
      d.classList.toggle("on", n === current);
    });
    /* Deep-linkable: present.html#3 opens straight on slide 3, so the deck
       can be driven from a bookmark or a clicker. */
    if (!fromHash) {
      try { history.replaceState(null, "", "#" + (current + 1)); } catch (e) {}
    }
  }

  slides.forEach(function (_, i) {
    var d = document.createElement("i");
    d.addEventListener("click", function () { go(i); });
    dots.appendChild(d);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(current + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(current - 1); }
    else if (e.key === "f" || e.key === "F") {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } else if (e.key === "r" || e.key === "R") { resetVotes(); }
    else if (e.key >= "1" && e.key <= String(slides.length)) { go(parseInt(e.key, 10) - 1); }
  });

  window.addEventListener("hashchange", function () {
    var n = parseInt(location.hash.slice(1), 10);
    if (n >= 1 && n <= slides.length) go(n - 1, true);
  });

  /* ---------- polling ---------- */

  function refresh() {
    window.STORE.results()
      .then(paint)
      .catch(function (e) { console.error("results refresh failed", e); });
  }

  function resetVotes() {
    if (!window.confirm("Clear every response and start a fresh tally?")) return;

    var key = "";
    if (window.STORE.mode === "remote") {
      try { key = sessionStorage.getItem("nextgen:adminkey") || ""; } catch (e) {}
      if (!key) {
        key = window.prompt("Admin key (set with: wrangler secret put ADMIN_KEY)") || "";
        if (!key) return;
      }
    }

    window.STORE.reset(key).then(function () {
      try { if (key) sessionStorage.setItem("nextgen:adminkey", key); } catch (e) {}
      lastVerdictId = null;
      refresh();
    }).catch(function (e) {
      try { sessionStorage.removeItem("nextgen:adminkey"); } catch (err) {}
      window.alert(e.message || "Reset failed.");
    });
  }
  document.getElementById("btnReset").addEventListener("click", resetVotes);

  renderQR();

  var startAt = parseInt(location.hash.slice(1), 10);
  go(startAt >= 1 && startAt <= slides.length ? startAt - 1 : 0, true);

  window.BASE.ready.then(function () {
    refresh();
    setInterval(refresh, window.CONFIG.POLL_MS);
  });
})();
