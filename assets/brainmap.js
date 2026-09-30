/* The engine, drawn while it runs.
 *
 * A slide for the room: questions on the left, the engine in the middle, the
 * book on the right, with the room's answers travelling through it.
 *
 * Everything here is real. Node size is the live response count on that
 * question, edge weight is that question's MEASURED influence on the book
 * (from the validator's sensitivity pass, not a guess), sleeve size is the
 * actual allocation and the holdings are the actual holdings. Nothing is
 * animated that is not happening. If the room changes an answer and the book
 * moves, the map moves with it; if an edge is thin it is because that
 * question genuinely did not matter much.
 */
window.BRAINMAP = (function () {
  "use strict";

  var COLOURS = {
    equities: "#3f7fd8", fixedIncome: "#e0603c", notes: "#199e70",
    fx: "#c98500", options: "#8c5cd6"
  };

  var STAGE_LABEL = {
    allocation: "Allocate", notesAllocation: "Allocate",
    optionsAllocation: "Allocate", fxAllocation: "Allocate",
    productRiskTilt: "Select", productSelection: "Select",
    equitySelection: "Select", fixedIncomeSelection: "Select",
    notesSelection: "Select", optionsSelection: "Select",
    currencySelection: "Select", selection: "Select",
    smallProductTilt: "Select"
  };

  var cv, ctx, W = 0, H = 0, dpr = 1, raf = null, reduced = false;
  var model = null;          /* what to draw */
  var pulses = [];
  var t0 = 0;

  function css(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  function resize() {
    if (!cv) return;
    var r = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(320, r.width); H = Math.max(240, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (model) layout(model);
  }

  /* ---- build the model from live engine state ---- */

  function build(agg, sim, alloc, influence) {
    var axes = (window.AXES || []).map(function (a) {
      var live = agg && agg.axes && agg.axes[a.id];
      var inf = influence && influence[a.id];
      return {
        id: a.id,
        label: shortLabel(a),
        answered: live ? live.respondents : 0,
        /* Measured share of portfolio variation, not an assumption. */
        influence: inf ? (inf.shareOfVariation || 0) : 0,
        stages: stagesFor(a.id, inf)
      };
    });

    var sleeves = (sim && sim.buckets ? sim.buckets : []).map(function (b) {
      return {
        key: b.key, label: b.label, weight: b.weight || 0,
        colour: COLOURS[b.key] || "#8a94a6",
        lines: (b.lines || []).slice(0, 4).map(function (l) {
          return { name: l.item.ticker || l.item.name, weight: l.weight };
        })
      };
    });

    return {
      axes: axes, sleeves: sleeves,
      responses: agg ? agg.count : 0,
      total: sleeves.reduce(function (t, s) { return t + s.weight; }, 0)
    };
  }

  function longestLabel() {
    if (!ctx) return 120;
    var prev = ctx.font;
    ctx.font = "500 11px " + (css("--font-ui", "") || "system-ui, sans-serif");
    var w = 0;
    (window.AXES || []).forEach(function (a) {
      w = Math.max(w, ctx.measureText(shortLabel(a)).width);
    });
    ctx.font = prev;
    return w + 34;                 /* room for the percentage too */
  }

  function shortLabel(a) {
    return ({ riskProfile: "Risk", marketView: "View", horizon: "Horizon",
              leverage: "Leverage", country: "Region", sector: "Sector",
              usd: "Dollar", capitalIncome: "Capital / income",
              duration: "Duration", credit: "Credit" })[a.id] || a.id;
  }

  function stagesFor(id, inf) {
    var roles = (inf && inf.roles) ||
      ((window.PORTFOLIO_VALIDATOR || {}).AXIS_ROLE || {})[id] || [];
    var out = {};
    roles.forEach(function (r) { out[STAGE_LABEL[r] || "Select"] = 1; });
    return Object.keys(out);
  }

  /* ---- geometry ---- */

  function layout(m) {
    var padX = Math.max(18, W * 0.035);
    var colA = padX + 4;
    /* Where edges may start: past the longest question label, so the lines
       do not run underneath the text they belong to. */
    m.edgeStart = colA + 22 + longestLabel();
    var colB = W * 0.46;
    var colC = W - padX - Math.max(150, W * 0.2);

    var topPad = 26, botPad = 18;
    var n = m.axes.length || 1;
    var stepA = (H - topPad - botPad) / n;
    m.axes.forEach(function (a, i) {
      a.x = colA; a.y = topPad + stepA * (i + 0.5);
      a.r = 4 + Math.min(9, Math.sqrt(a.answered) * 1.5);
    });

    m.stages = [
      { label: "Allocate", x: colB, y: H * 0.34 },
      { label: "Select",   x: colB, y: H * 0.68 }
    ];

    var ns = m.sleeves.length || 1;
    var stepC = (H - topPad - botPad) / ns;
    m.sleeves.forEach(function (s, i) {
      s.x = colC; s.y = topPad + stepC * (i + 0.5);
      s.h = Math.max(8, Math.min(stepC - 12, (s.weight / 100) * H * 1.5));
    });
  }

  /* ---- drawing ---- */

  function line(x1, y1, x2, y2, alpha, width, colour) {
    var mx = (x1 + x2) / 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.strokeStyle = colour;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function pointOnCurve(x1, y1, x2, y2, t) {
    var mx = (x1 + x2) / 2, u = 1 - t;
    return {
      x: u * u * u * x1 + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * x2,
      y: u * u * u * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y2
    };
  }

  function draw(now) {
    if (!ctx || !model) return;
    var m = model;
    var dim = css("--line", "#232c3d");
    var text = css("--text-2", "#c7ced9");
    var muted = css("--muted", "#7d8798");
    var bright = css("--accent-bright", "#eaf0fb");

    ctx.clearRect(0, 0, W, H);
    ctx.font = "500 11px " + (css("--font-ui", "") || "system-ui, sans-serif");
    ctx.textBaseline = "middle";

    /* edges: question -> stage, weighted by measured influence */
    m.axes.forEach(function (a) {
      var w = 0.6 + a.influence * 14;
      a.stages.forEach(function (st) {
        var s = m.stages.filter(function (x) { return x.label === st; })[0];
        if (!s) return;
        var alive = a.answered > 0;
        line(m.edgeStart, a.y, s.x - 30, s.y,
             alive ? 0.10 + a.influence * 1.6 : 0.05, w, alive ? "#5b8fd6" : dim);
      });
    });

    /* edges: stage -> sleeve */
    m.sleeves.forEach(function (s) {
      m.stages.forEach(function (st) {
        line(st.x + 30, st.y, s.x - 6, s.y,
             s.weight > 0 ? 0.16 : 0.05,
             1 + (s.weight / 100) * 7, s.colour);
      });
    });

    /* pulses */
    ctx.globalAlpha = 1;
    pulses.forEach(function (p) {
      var pt = pointOnCurve(p.x1, p.y1, p.x2, p.y2, p.t);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.colour;
      ctx.globalAlpha = Math.sin(p.t * Math.PI) * 0.85;
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    /* question nodes */
    m.axes.forEach(function (a) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = a.answered ? "#5b8fd6" : dim;
      ctx.globalAlpha = a.answered ? 0.95 : 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = a.answered ? text : muted;
      ctx.textAlign = "left";
      var lx = a.x + a.r + 8;
      /* Measured in the font the label is drawn in. Measuring after switching
         to the smaller percentage font under-reported the width and printed
         the two on top of each other. */
      var lw = ctx.measureText(a.label).width;
      ctx.fillText(a.label, lx, a.y);

      if (a.influence > 0.001) {
        ctx.fillStyle = muted;
        ctx.font = "400 10px " + (css("--font-ui", "") || "system-ui, sans-serif");
        ctx.fillText(Math.round(a.influence * 100) + "%", lx + lw + 7, a.y);
        ctx.font = "500 11px " + (css("--font-ui", "") || "system-ui, sans-serif");
      }
    });

    /* stage nodes */
    m.stages.forEach(function (s) {
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(s.x - 34, s.y - 15, 68, 30, 6)
                    : ctx.rect(s.x - 34, s.y - 15, 68, 30);
      ctx.fillStyle = css("--surface-2", "#161d2b");
      ctx.fill();
      ctx.strokeStyle = dim; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = bright;
      ctx.textAlign = "center";
      ctx.fillText(s.label, s.x, s.y);
    });

    /* sleeves */
    ctx.textAlign = "left";
    m.sleeves.forEach(function (s) {
      ctx.fillStyle = s.colour;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      var bh = Math.max(6, s.h);
      ctx.roundRect ? ctx.roundRect(s.x, s.y - bh / 2, 5, bh, 2.5)
                    : ctx.rect(s.x, s.y - bh / 2, 5, bh);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = text;
      ctx.fillText(s.label, s.x + 14, s.y - 7);
      ctx.fillStyle = s.colour;
      ctx.fillText(s.weight + "%", s.x + 14, s.y + 8);

      ctx.fillStyle = muted;
      ctx.font = "400 10px " + (css("--font-ui", "") || "system-ui, sans-serif");
      var names = s.lines.map(function (l) { return l.name; }).join(" · ");
      if (names) ctx.fillText(names, s.x + 14 + 52, s.y + 8);
      ctx.font = "500 11px " + (css("--font-ui", "") || "system-ui, sans-serif");
    });
  }

  /* ---- animation ---- */

  function spawn() {
    if (!model || reduced) return;
    var m = model;
    var live = m.axes.filter(function (a) { return a.answered > 0; });
    if (!live.length) return;

    /* Which question fires next is weighted by its measured influence, so
       the busiest paths on screen are the ones actually moving the book. */
    var total = live.reduce(function (t, a) { return t + 0.05 + a.influence; }, 0);
    var pick = ((Date.now() / 97) % 1) * total;
    var acc = 0, chosen = live[0];
    for (var i = 0; i < live.length; i++) {
      acc += 0.05 + live[i].influence;
      if (acc >= pick) { chosen = live[i]; break; }
    }

    var stage = m.stages[chosen.stages.indexOf("Allocate") >= 0 ? 0 : 1];
    pulses.push({ x1: chosen.x, y1: chosen.y, x2: stage.x - 30, y2: stage.y,
                  t: 0, sp: 0.014 + Math.random() * 0.01, r: 2.2,
                  colour: "#7fb0ee", next: stage });
  }

  function tick(now) {
    if (!t0) t0 = now;
    if (now - t0 > 190) { t0 = now; spawn(); }

    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      p.t += p.sp;
      if (p.t >= 1) {
        if (p.next && model && model.sleeves.length) {
          /* hand the pulse on to a sleeve, chosen by its weight */
          var s = model.sleeves[Math.floor(Math.random() * model.sleeves.length)];
          pulses[i] = { x1: p.next.x + 30, y1: p.next.y, x2: s.x - 6, y2: s.y,
                        t: 0, sp: 0.016 + Math.random() * 0.012, r: 2.6,
                        colour: s.colour, next: null };
        } else {
          pulses.splice(i, 1);
        }
      }
    }
    if (pulses.length > 90) pulses.splice(0, pulses.length - 90);

    draw(now);
    raf = requestAnimationFrame(tick);
  }

  /* ---- api ---- */

  function mount(canvas) {
    cv = canvas;
    if (!cv || !cv.getContext) return false;
    ctx = cv.getContext("2d");
    try {
      reduced = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { reduced = false; }
    resize();
    window.addEventListener("resize", resize);
    if (!raf) raf = requestAnimationFrame(tick);
    return true;
  }

  function update(agg, sim, influence) {
    if (!ctx) return;
    model = build(agg, sim, null, influence);
    layout(model);
    if (reduced) draw(0);
  }

  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  return { mount: mount, update: update, stop: stop };
})();
