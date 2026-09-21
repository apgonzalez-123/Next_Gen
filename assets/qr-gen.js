/* NextGen Portfolio Builder — personal QR sheet.
 *
 * Turns a guest list into one QR per guest. Each code points at
 *   <site>/?g=<token>&n=<name>&t=<group>
 * so the guest lands already identified and every answer is attributed
 * without them typing anything.
 */
(function () {
  var cards = document.getElementById("cards");
  var lastRows = [];

  /* A short, stable token per guest: a readable slug plus a hash of the
     full line, so two people called "Ana R." never collide and the same
     list always regenerates the same codes. */
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function slug(s) {
    return s.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")   /* strip accents */
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 18);
  }
  /* Slug the NAME only — the group would pad every token with the same
     "-table-1" noise — but hash the whole line, so two guests with the
     same name in different groups still get distinct tokens. */
  function tokenFor(name, line) { return slug(name) + "-" + hash(line).slice(0, 4); }

  function parseList(text) {
    return text.split("\n")
      .map(function (l) { return l.trim(); })
      .filter(Boolean)
      .map(function (line) {
        var parts = line.split(",");
        var name = parts.shift().trim();
        var group = parts.join(",").trim();
        return { name: name, group: group, token: tokenFor(name, line) };
      });
  }

  function linkFor(base, g) {
    var u = base.replace(/\/+$/, "") + "/";
    var q = "?g=" + encodeURIComponent(g.token) + "&n=" + encodeURIComponent(g.name);
    if (g.group) q += "&t=" + encodeURIComponent(g.group);
    return u + q;
  }

  function generate() {
    var base = document.getElementById("baseUrl").value.trim();
    if (!base) {
      base = window.location.href.split("?")[0].replace(/qr-gen\.html?$/, "");
      document.getElementById("baseUrl").value = base;
    }
    var rows = parseList(document.getElementById("guests").value);
    lastRows = rows.map(function (g) { return { name: g.name, group: g.group, token: g.token, link: linkFor(base, g) }; });

    cards.innerHTML = "";
    rows.forEach(function (g) {
      var card = document.createElement("div");
      card.className = "qcard";
      var box = document.createElement("div");
      box.className = "qbox";
      card.appendChild(box);

      var nm = document.createElement("div");
      nm.className = "nm";
      nm.textContent = g.name;
      card.appendChild(nm);

      if (g.group) {
        var gp = document.createElement("div");
        gp.className = "gp";
        gp.textContent = g.group;
        card.appendChild(gp);
      }

      var tk = document.createElement("div");
      tk.className = "tk";
      tk.textContent = g.token;
      card.appendChild(tk);

      var br = document.createElement("div");
      br.className = "brand";
      br.textContent = "NextGen Portfolio Lab";
      card.appendChild(br);

      cards.appendChild(card);

      new QRCode(box, {
        text: linkFor(base, g),
        width: 320, height: 320,
        colorDark: "#0A1220", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    });

    document.getElementById("count").textContent =
      rows.length ? rows.length + " code" + (rows.length === 1 ? "" : "s") + " ready" : "";
  }

  function csvCell(v) {
    v = String(v == null ? "" : v);
    if (/^[=+\-@]/.test(v)) v = "'" + v;
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  document.getElementById("btnGen").addEventListener("click", generate);
  document.getElementById("btnPrint").addEventListener("click", function () {
    if (!lastRows.length) generate();
    window.print();
  });
  document.getElementById("btnCsvTokens").addEventListener("click", function () {
    if (!lastRows.length) generate();
    var csv = [["Name", "Group", "Token", "Link"]].concat(lastRows.map(function (r) {
      return [r.name, r.group, r.token, r.link];
    })).map(function (line) { return line.map(csvCell).join(","); }).join("\r\n");

    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nextgen-tokens.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });

  /* Prefill the site address from wherever this page is being served. */
  document.getElementById("baseUrl").value =
    window.location.href.split("?")[0].replace(/qr-gen\.html?$/, "");
})();
