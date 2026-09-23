/* NextGen Portfolio Builder — admin board.
 *
 * One row per guest, one column per question, plus the portfolio each
 * guest was matched to. Exports the same data as CSV or JSON.
 *
 * Synthetic demo responses are never listed or exported — only real
 * guests appear here.
 */
(function () {
  var rows = [];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* One shared formatter, so the table, the CSV and the guest screens all
     describe a value the same way, including range answers, which have no
     option list to look up. */
  function labelFor(axisId, value) { return window.axisLabel(axisId, value); }

  /* name and group have dedicated columns; everything else the
     registration step collects gets one generated for it. */
  function regFields() { return window.CONFIG.REGISTER_FIELDS || []; }
  function groupLabel() {
    var g = regFields().find(function (f) { return f.id === "group"; });
    return g ? g.label : "Group";
  }
  function extraFields() {
    return regFields().filter(function (f) { return f.id !== "name" && f.id !== "group"; });
  }

  /* How far through the quiz a guest got. With sections gated a guest can
     legitimately be part-way, and the table should show that rather than
     implying a complete response. */
  function answeredCount(r) {
    return window.AXES.filter(function (a) {
      var v = r.answers[a.id];
      return v !== null && v !== undefined;
    }).length;
  }

  function when(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }

  function build() {
    var thead = document.getElementById("thead");
    var tbody = document.getElementById("tbody");

    thead.innerHTML = "<tr>" +
      '<th class="sticky-1"><small>Guest</small>Name</th>' +
      '<th class="sticky-2"><small>Registration</small>' + esc(groupLabel()) + "</th>" +
      extraFields().map(function (f) {
        return "<th><small>Registration</small>" + esc(f.label) + "</th>";
      }).join("") +
      "<th><small>Matched</small>Portfolio</th>" +
      "<th><small>Fit</small>Score</th>" +
      "<th><small>Answered</small>Questions</th>" +
      window.AXES.map(function (a) {
        var step = window.SCHEMA.steps.find(function (s) { return s.id === a.step; });
        return "<th><small>" + esc(step.title) + "</small>" + esc(a.label) + "</th>";
      }).join("") +
      "<th><small>Submitted</small>Time</th>" +
      "<th><small>Link token</small>ID</th>" +
      "</tr>";

    if (!rows.length) {
      tbody.innerHTML = '<tr><td class="a-empty" colspan="' + (window.AXES.length + 7 + extraFields().length) +
        '">No responses yet. They appear here as guests finish the five steps.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (r) {
      var ranked = window.ENGINE.rank(r.answers);
      var top = ranked[0];
      /* A guest whose exclusions rule out the whole shelf has no match —
         show that rather than a portfolio they said they will not own. */
      var noFit = top && top.blocked;
      return "<tr>" +
        '<td class="sticky-1">' + (r.name
          ? '<span class="a-name">' + esc(r.name) + "</span>"
          : '<span class="a-anon">anonymous</span>') + "</td>" +
        '<td class="sticky-2">' + esc(r.group || "") + "</td>" +
        extraFields().map(function (f) {
          return "<td>" + esc((r.fields && r.fields[f.id]) || "") + "</td>";
        }).join("") +
        '<td class="a-match">' + (noFit
          ? '<span class="a-nofit">none eligible</span>'
          : esc(top ? top.portfolio.name : "")) + "</td>" +
        "<td>" + (top && !noFit ? top.fit + "%" : "") + "</td>" +
        "<td>" + answeredCount(r) + " of " + window.AXES.length + "</td>" +
        window.AXES.map(function (a) {
          return "<td>" + esc(labelFor(a.id, r.answers[a.id])) + "</td>";
        }).join("") +
        "<td>" + esc(when(r.at)) + "</td>" +
        "<td>" + esc(r.token || r.id || "") + "</td>" +
        "</tr>";
    }).join("");
  }

  /* ---------- export ---------- */

  function csvCell(v) {
    v = v === null || v === undefined ? "" : String(v);
    /* A leading =, +, - or @ makes Excel treat the cell as a formula —
       prefix it so a guest's answer can never execute on open. */
    if (/^[=+\-@]/.test(v)) v = "'" + v;
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function toCSV() {
    var head = ["Name", groupLabel()]
      .concat(extraFields().map(function (f) { return f.label; }))
      .concat(["Matched portfolio", "Fit %"])
      .concat(window.AXES.map(function (a) { return a.label; }))
      .concat(["Submitted", "ID"]);

    var body = rows.map(function (r) {
      var top = window.ENGINE.rank(r.answers)[0];
      var noFit = top && top.blocked;
      return [r.name || "", r.group || ""]
        .concat(extraFields().map(function (f) { return (r.fields && r.fields[f.id]) || ""; }))
        .concat([noFit ? "none eligible" : (top ? top.portfolio.name : ""),
                 noFit ? "" : (top ? top.fit : "")])
        .concat(window.AXES.map(function (a) { return labelFor(a.id, r.answers[a.id]); }))
        .concat([r.at ? new Date(r.at).toISOString() : "", r.token || r.id || ""]);
    });

    return [head].concat(body).map(function (line) {
      return line.map(csvCell).join(",");
    }).join("\r\n");
  }

  function download(filename, text, type) {
    var blob = new Blob([text], { type: type + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  var stamp = window.CONFIG.SESSION_ID + "-" + new Date().toISOString().slice(0, 10);

  document.getElementById("btnCsv").addEventListener("click", function () {
    download("nextgen-responses-" + stamp + ".csv", "﻿" + toCSV(), "text/csv");
  });
  document.getElementById("btnJson").addEventListener("click", function () {
    download("nextgen-responses-" + stamp + ".json", JSON.stringify(rows, null, 2), "application/json");
  });

  /* ---------- load ---------- */

  /* The admin key lives only in this tab, for this visit. It is never
     written to a file this site serves, and never to localStorage. */
  var KEY_STORE = "nextgen:adminkey";
  function savedKey() {
    try { return sessionStorage.getItem(KEY_STORE) || ""; } catch (e) { return ""; }
  }
  function rememberKey(k) {
    try { sessionStorage.setItem(KEY_STORE, k); } catch (e) {}
  }
  function forgetKey() {
    try { sessionStorage.removeItem(KEY_STORE); } catch (e) {}
  }

  function lock(message) {
    document.getElementById("gate").hidden = false;
    document.getElementById("board").hidden = true;
    document.getElementById("gateMsg").textContent = message || "";
    var f = document.getElementById("gateKey");
    f.value = "";
    f.focus();
  }
  function unlock() {
    document.getElementById("gate").hidden = true;
    document.getElementById("board").hidden = false;
    /* Clear the "Checking…" notice, or it is still sitting there the next
       time the gate is shown. */
    document.getElementById("gateMsg").textContent = "";
  }

  /* The room's collective allocation across the four sleeves, plus the
     portfolio the averaged profile matches. */
  function paintAllocation(list) {
    var agg = window.ENGINE.aggregate(list);
    var bar = document.getElementById("allocBar");
    var legend = document.getElementById("allocLegend");
    var sub = document.getElementById("allocSub");

    if (!list.length) {
      bar.innerHTML = "";
      legend.innerHTML = "";
      sub.textContent = "No responses yet.";
      document.getElementById("allocTop").textContent = "Not yet";
      document.getElementById("allocTopSub").textContent = "";
      return;
    }

    var a = window.ENGINE.roomAllocation(agg);
    var keys = [
      { k: "equities",    label: "Equities",         c: "var(--series-equities)" },
      { k: "fixedIncome", label: "Fixed income",     c: "var(--series-fixedincome)" },
      { k: "notes",       label: "Structured notes", c: "var(--series-notes)" },
      { k: "fx",          label: "FX",               c: "var(--series-cash)" }
    ];

    bar.innerHTML = keys.map(function (x) {
      return '<i style="flex:' + a[x.k] + ' 0 0;background:' + x.c + '" title="' +
             esc(x.label) + " " + a[x.k] + '%"></i>';
    }).join("");

    legend.innerHTML = keys.map(function (x) {
      return '<div><s style="background:' + x.c + '"></s>' + esc(x.label) +
             "<b>" + a[x.k] + "%</b></div>";
    }).join("");

    var d = a.drivers;
    sub.innerHTML = list.length + " response" + (list.length === 1 ? "" : "s") +
      "<br>risk " + d.risk.toFixed(1) + " of 2, horizon " + Math.round(d.horizon) +
      "y, USD " + Math.round(d.usd) + "%, " + Math.round(d.levered * 100) +
      "% would use leverage, " + Math.round(d.income * 100) + "% want income";

    var top = window.ENGINE.rank(window.ENGINE.aggProfile(agg))[0];
    document.getElementById("allocTop").textContent = top ? top.portfolio.name : "Not yet";
    document.getElementById("allocTopSub").textContent = top ? "closest match · " + top.fit + "% fit" : "";
  }

  var BUCKET_COLOUR = {
    equities:    "var(--series-equities)",
    fixedIncome: "var(--series-fixedincome)",
    notes:       "var(--series-notes)",
    fx:          "var(--series-cash)"
  };

  function paintSimulation(list) {
    var grid = document.getElementById("simGrid");
    if (!list.length) {
      grid.innerHTML = '<p class="a-bucket-empty">Nothing to simulate yet. ' +
                       'The book builds itself as guests answer.</p>';
      return;
    }
    if (!window.PRODUCTS) {
      grid.innerHTML = '<p class="a-bucket-empty">Product shelf not loaded. ' +
                       'Check data/products.json.</p>';
      return;
    }

    var agg = window.ENGINE.aggregate(list);
    var sim = window.ENGINE.roomPortfolio(agg, window.PRODUCTS);
    if (!sim) { grid.innerHTML = ""; return; }

    grid.innerHTML = sim.buckets.map(function (b) {
      var colour = BUCKET_COLOUR[b.key];
      /* Line bars scale within their own bucket, so a 3% line in a small
         bucket still reads as a large part of that bucket. */
      var widest = b.lines.reduce(function (m, l) { return Math.max(m, l.weight); }, 0) || 1;

      var lines = b.lines.length
        ? b.lines.map(function (l) {
            return '<div class="a-line">' +
              '<div class="a-line-top"><span class="a-line-name">' + esc(l.item.name) + "</span>" +
              '<span class="a-line-w">' + l.weight + "%</span></div>" +
              '<div class="a-line-meta"><span class="tk">' + esc(l.item.ticker) + "</span>" +
              esc(l.note || l.item.detail || "") + "</div>" +
              '<div class="a-line-bar"><i style="width:' +
                Math.round((l.weight / widest) * 100) + "%;background:" + colour + '"></i></div>' +
              "</div>";
          }).join("")
        : '<p class="a-bucket-empty">No allocation.</p>';

      return '<div class="a-bucket">' +
        '<div class="a-bucket-top"><s style="background:' + colour + '"></s>' +
        "<h3>" + esc(b.label) + "</h3><b>" + b.weight + "%</b></div>" +
        lines + "</div>";
    }).join("");
  }

  function refresh() {
    var wasLocked = !document.getElementById("gate").hidden;

    window.STORE.roster(savedKey()).then(function (list) {
      unlock();
      rows = list;
      document.getElementById("nCount").textContent = rows.length;
      build();
      paintAllocation(rows);
      paintSimulation(rows);
    }).catch(function (e) {
      if (e && e.code === 401) {
        forgetKey();
        lock("That password was not accepted.");
        return;
      }
      console.error(e);
      /* Report the failure wherever the reader is actually looking. Writing
         it only into the table left anyone still at the gate staring at
         "Checking…" with no idea what had gone wrong. */
      var why = "Could not reach the vote backend. Check your connection and try again.";
      if (wasLocked) {
        lock(why);
      } else {
        document.getElementById("tbody").innerHTML =
          '<tr><td class="a-empty" colspan="20">' + esc(why) + "</td></tr>";
      }
    });
  }

  /* ---- section locks ---- */
  var sectionState = {};   /* stepId -> true when open */
  var secBusy = false;

  function paintSections() {
    var host = document.getElementById("secList");
    var gated = Object.keys(sectionState).length > 0;

    host.innerHTML = window.SCHEMA.activeSteps.map(function (st) {
      var open = !!sectionState[st.id];
      return '<button class="a-sec' + (open ? " open" : "") + '" type="button" data-step="' +
        esc(st.id) + '"' + (secBusy ? " disabled" : "") + '>' +
        '<span class="a-sec-n">0' + st.n + "</span>" +
        '<span class="a-sec-t">' + esc(st.title) + "</span>" +
        '<span class="a-sec-s">' + (open ? "Open" : "Locked") + "</span>" +
        "</button>";
    }).join("");

    Array.prototype.forEach.call(host.querySelectorAll(".a-sec"), function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-step");
        var next = {};
        window.SCHEMA.activeSteps.forEach(function (st) { next[st.id] = !!sectionState[st.id]; });
        next[id] = !next[id];
        pushSections(next);
      });
    });

    document.getElementById("secNote").textContent = gated
      ? "Guests can only answer the sections marked Open."
      : "No sections are open, so the quiz is gated shut. Open the first one when you are ready, " +
        "or use Open all to run it as one continuous quiz.";
  }

  function pushSections(map) {
    secBusy = true;
    paintSections();
    window.STORE.setSections(map, savedKey()).then(function (saved) {
      sectionState = saved || map;
      secBusy = false;
      paintSections();
    }).catch(function (e) {
      secBusy = false;
      if (e && e.code === 401) { forgetKey(); lock("That password was not accepted."); return; }
      paintSections();
      window.alert("Could not save the section state.");
    });
  }

  function loadSections() {
    window.STORE.sections().then(function (map) {
      /* Only repaint when it actually changed, so a click is not undone
         by a poll landing a moment later. */
      if (secBusy) return;
      var next = map || {};
      if (JSON.stringify(next) !== JSON.stringify(sectionState)) {
        sectionState = next;
        paintSections();
      }
    }).catch(function () {});
  }

  document.getElementById("secAllOpen").addEventListener("click", function () {
    var all = {};
    window.SCHEMA.activeSteps.forEach(function (st) { all[st.id] = true; });
    pushSections(all);
  });
  document.getElementById("secAllShut").addEventListener("click", function () {
    var none = {};
    window.SCHEMA.activeSteps.forEach(function (st) { none[st.id] = false; });
    pushSections(none);
  });

  function submitKey() {
    var v = document.getElementById("gateKey").value.trim();
    if (!v) return;
    rememberKey(v);
    document.getElementById("gateMsg").textContent = "Checking…";
    refresh();
  }
  document.getElementById("gateGo").addEventListener("click", submitKey);
  document.getElementById("gateKey").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); submitKey(); }
  });

  window.BASE.ready.then(function () {
    var badge = document.getElementById("srcBadge");
    badge.textContent = window.STORE.mode === "demo" ? "Local device only" : "Live backend";

    document.getElementById("note").innerHTML = window.STORE.mode === "demo"
      ? "<b>No backend configured.</b> This lists only the responses recorded on " +
        "<b>this device</b>. Simulated demo guests are excluded. Deploy the worker and set " +
        "<b>BACKEND_URL</b> in assets/config.js to collect the whole room here."
      : "Live responses from every guest in the room. The table scrolls sideways through all " +
        window.AXES.length + " questions; name and group stay pinned.";

    /* With no backend the rows never left this device, so there is nothing
       to unlock. Against the live backend the worker holds the key. */
    paintSections();

    if (window.STORE.mode !== "remote") {
      unlock();
      refresh();
      loadSections();
      setInterval(function () { refresh(); loadSections(); }, 5000);
      return;
    }

    if (savedKey()) { refresh(); loadSections(); } else lock("");
    setInterval(function () {
      if (savedKey()) { refresh(); loadSections(); }
    }, 5000);
  });
})();
