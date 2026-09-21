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
      '<th class="sticky-2"><small>' + esc(window.CONFIG.GROUP_FIELD || "Group") + "</small>Group</th>" +
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
      tbody.innerHTML = '<tr><td class="a-empty" colspan="' + (window.AXES.length + 6) +
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
    var head = ["Name", window.CONFIG.GROUP_FIELD || "Group", "Matched portfolio", "Fit %"]
      .concat(window.AXES.map(function (a) { return a.label; }))
      .concat(["Submitted", "ID"]);

    var body = rows.map(function (r) {
      var top = window.ENGINE.rank(r.answers)[0];
      var noFit = top && top.blocked;
      return [r.name || "", r.group || "",
              noFit ? "none eligible" : (top ? top.portfolio.name : ""),
              noFit ? "" : (top ? top.fit : "")]
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

  function refresh() {
    window.STORE.roster().then(function (list) {
      rows = list;
      document.getElementById("nCount").textContent = rows.length;
      build();
    }).catch(function (e) {
      console.error(e);
      document.getElementById("tbody").innerHTML =
        '<tr><td class="a-empty" colspan="20">Could not reach the vote backend.</td></tr>';
    });
  }

  window.BASE.ready.then(function () {
    var badge = document.getElementById("srcBadge");
    badge.textContent = window.STORE.mode === "demo" ? "Local device only" : "Live backend";

    document.getElementById("note").innerHTML = window.STORE.mode === "demo"
      ? "<b>No backend configured.</b> This lists only the responses recorded on " +
        "<b>this device</b>. Simulated demo guests are excluded. Deploy the worker and set " +
        "<b>BACKEND_URL</b> in assets/config.js to collect the whole room here."
      : "Live responses from every guest in the room. The table scrolls sideways through all " +
        window.AXES.length + " questions; name and group stay pinned.";

    refresh();
    setInterval(refresh, 5000);
  });
})();
