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

  function labelFor(axisId, value) {
    var axis = window.AXIS_BY_ID[axisId];
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) {
      if (!value.length) return "—";   /* a real answer on an opt-out axis */
      return value.map(function (v) { return labelFor(axisId, v); }).join("; ");
    }
    var opt = axis.options.find(function (o) { return o.v === value; });
    return opt ? opt.label : String(value);
  }

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
      window.AXES.map(function (a) {
        var step = window.SCHEMA.steps.find(function (s) { return s.id === a.step; });
        return "<th><small>" + esc(step.title) + "</small>" + esc(a.label) + "</th>";
      }).join("") +
      "<th><small>Submitted</small>Time</th>" +
      "<th><small>Link token</small>ID</th>" +
      "</tr>";

    if (!rows.length) {
      tbody.innerHTML = '<tr><td class="a-empty" colspan="' + (window.AXES.length + 6 + extraFields().length) +
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
  }

  function refresh() {
    window.STORE.roster(savedKey()).then(function (list) {
      unlock();
      rows = list;
      document.getElementById("nCount").textContent = rows.length;
      build();
    }).catch(function (e) {
      if (e && e.code === 401) {
        forgetKey();
        lock("That password was not accepted.");
        return;
      }
      console.error(e);
      document.getElementById("tbody").innerHTML =
        '<tr><td class="a-empty" colspan="20">Could not reach the vote backend.</td></tr>';
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
      : "No sections are open, so the quiz is gated shut. Open the first one when you are ready — " +
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
