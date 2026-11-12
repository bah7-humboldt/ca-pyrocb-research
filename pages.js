/* Shared page helpers for the pyroCb research site. Needs data/site_data.js (window.PYRO) and charts.js (window.PC). */
(function () {
  const P = window.PYRO, C = window.PC;
  const fireLabel = (k) => (P.fires[k] ? P.fires[k].label : k);
  const byId = Object.fromEntries(P.days.map((d) => [d.id, d]));
  const FLAG = { nc_dry_tstorm: "dry thunderstorms", nc_ne_foehn: "NE foehn (offshore)", nc_sw_foehn: "SW foehn",
    breakdown_stage2: "ridge breakdown, stage 2", breakdown_stage3: "ridge breakdown, stage 3", ridge_persists: "ridge persists" };
  const f = C.fmt;
  const pft = (d) => (d.pft_min_gw === "inf" ? "no solution (air too dry/stable)" : `${f(d.pft_min_gw, 0)} GW` + (d.pft_min_hour_pdt !== null ? ` at ${d.pft_min_hour_pdt}:00` : ""));

  function dayTip(d) {
    return `<b>${fireLabel(d.fire)}</b> · ${d.day}<br><span class="badge ${d.cls}">${C.CLS_NAME[d.cls]}</span>` +
      `<br>Growth ${f(d.growth_ac, 0)} ac · regime ${d.regime || "–"}<br>PFT ${pft(d)}<br>Fire power ${f(d.fp_max_gw, 0)} GW · FP/PFT ${f(d.ratio_max, 2)}`;
  }

  function detail(el, d) {
    if (!d) { el.innerHTML = `<p class="note">Click a day on a chart to see its details, the satellite cloud-top review and its sounding.</p>`; return; }
    const rows = [
      ["Fire / day", `${fireLabel(d.fire)}, fire day ${d.day} (06:00–06:00 local)`],
      ["Plume class", `<span class="badge ${d.cls}">${C.CLS_NAME[d.cls]}</span>` + (d.bt_rooted_min !== null ? ` · coldest fire-rooted top ${f(d.bt_rooted_min, 0)} °C` : "")],
      ["Growth", `${f(d.growth_ac, 0)} acres`],
      ["500 hPa regime", d.regime ? `<a href="patterns.html#regime-${d.regime}">${d.regime}</a>` : "–"],
      ["Documented patterns", d.flags.length ? d.flags.map((x) => FLAG[x]).join(", ") : "–"],
      ["PFT (lowest, 12–22 PDT)", pft(d)],
      ["Fire power (peak hour)", `${f(d.fp_max_gw, 0)} GW`],
      ["FP / PFT (same hour, max)", f(d.ratio_max, 2)],
      ["Free-convection height", d.z_fc_km !== null ? `${f(d.z_fc_km, 1)} km` : "–"],
      ["Extra warmth needed", d.dtheta_fc !== null ? `${f(d.dtheta_fc, 1)} K` : "–"],
      ["Pyroconvective CAPE", d.pcape_max_jkg !== null && d.pcape_max_jkg !== undefined ? `${f(d.pcape_max_jkg, 0)} J/kg (day max)` + (d.pcape_jkg ? ` · ${f(d.pcape_jkg, 0)} at the PFT minimum` : "") + (d.pcape_capped ? " · parcel still buoyant at the top of the data (100 hPa), a lower bound" : "") + (d.el_km !== null && d.el_km !== undefined ? ` · EL ${f(d.el_km, 1)} km` : "") : "–"],
      ["Mixed-layer wind / moisture", `${f(d.u_ml, 1)} m/s · ${f(d.q_ml_gkg, 1)} g/kg`],
      ["700 hPa moisture (ERA5)", d.q700_era5 !== null ? `${f(d.q700_era5, 1)} g/kg` : "–"],
      ["Radar plume top", d.radar_rooted_top_km !== null ? `${f(d.radar_rooted_top_km, 1)} km` : "– (no usable radar)"],
      ["Fuel ahead / burned", `${f(d.ahead_avail_kgm2, 2)} / ${f(d.burned_avail_kgm2, 2)} kg/m²`],
      ["Morning forecast PFT", d.pft_fc_min === "inf" ? "no solution" : (d.pft_fc_min !== null ? `${f(d.pft_fc_min, 0)} GW` : "–")],
    ];
    el.innerHTML = `<h3>${fireLabel(d.fire)} · ${d.day}</h3><div class="kv">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join("")}</div>` +
      (d.note ? `<p class="note"><b>Analyst review:</b> ${d.note}</p>` : "") +
      (d.review_img ? `<h3>GOES-17/16 cloud tops around the coldest scan</h3><img src="${d.review_img}" alt="GOES 10.3 µm cloud-top temperature panels for ${d.day}" loading="lazy">` : "") +
      (d.sounding_img ? `<h3>Sounding (HRRR at the fire front)</h3><img src="${d.sounding_img}" alt="Skew-T sounding for ${d.day}" loading="lazy">` : "") +
      `<p class="note"><a class="gl" style="margin-left:0" href="guide.html#ex-detail">About this panel</a></p>`;
  }

  function lightbox() {
    let lb = document.querySelector(".lightbox");
    if (!lb) {
      lb = document.createElement("div"); lb.className = "lightbox"; lb.innerHTML = "<img alt=''>";
      lb.addEventListener("click", () => (lb.style.display = "none"));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") lb.style.display = "none"; });
      document.body.appendChild(lb);
    }
    return (src, alt) => { lb.querySelector("img").src = src; lb.querySelector("img").alt = alt || ""; lb.style.display = "flex"; };
  }

  // Browse-and-compare block shared by the Soundings, Satellite, Radar and Storms pages.
  // opts: items [{id, fire, day, cls, ...}], pane(item) -> html, featured(item) -> bool, featuredLabel, preset (filter preset),
  //       cols (day-list columns), onSelect(item) optional, stack: true puts a compared day below instead of beside.
  //       URL state: ?case=<id>&vs=<id>&f=<filters>.
  function browser(host, opts) {
    const items = opts.items, lb = lightbox(), q = new URLSearchParams(location.search);
    const st = { a: q.get("case"), b: q.get("vs") || "", feat: !!opts.featured && (opts.keepFeatured || (!q.get("case") && !q.get("f"))) };
    host.innerHTML = `<div class="b-filters"></div>
      ${opts.featured ? `<div class="controls"><label><input type="checkbox" class="b-feat"> ${opts.featuredLabel} only</label></div>` : ""}
      <div class="b-list"></div>
      <div class="controls" style="margin-top:10px"><label>Compare with <select class="b-cmp"></select></label></div>
      <div class="b-panes"><div class="b-a"></div><div class="b-b" style="margin-top:12px"></div></div>`;
    const $ = (s) => host.querySelector(s), cs = $(".b-cmp");
    const F = filters($(".b-filters"), { items, preset: opts.preset, onChange: () => { if (!opts.keepFeatured) { st.feat = false; if ($(".b-feat")) $(".b-feat").checked = false; } draw(); } });
    const list = dayList($(".b-list"), { cols: opts.cols, sort: opts.sort, cell: opts.cell, onPick: (id) => { st.a = id; draw(); } });
    if ($(".b-feat")) { $(".b-feat").checked = st.feat; $(".b-feat").addEventListener("change", (e) => { st.feat = e.target.checked; draw(); }); }
    cs.addEventListener("change", () => { st.b = cs.value; draw(); });
    function pane(el, c) {
      el.innerHTML = c ? opts.pane(c) : "";
      el.querySelectorAll("img").forEach((i) => { i.style.cursor = "zoom-in"; i.addEventListener("click", () => lb(i.src, i.alt)); });
      if (opts.afterPane) opts.afterPane(el, c);
    }
    function draw() {
      const shown = items.filter((c) => F.match(c) && (!st.feat || opts.featured(c)));
      F.count(shown.length, items.length, "days");
      if (!shown.find((c) => c.id === st.a)) st.a = items.find((c) => c.id === st.a) && !st.feat ? st.a : (shown.length ? shown[0].id : null);
      list.draw(shown, st.a);
      const a = items.find((c) => c.id === st.a);
      const same = a ? shown.filter((c) => c.fire === a.fire && c.id !== a.id) : [], rest = shown.filter((c) => !a || c.fire !== a.fire);
      const opt = (c) => `<option value="${c.id}">${fireLabel(c.fire)} ${c.day} (${C.CLS_NAME[c.cls]})</option>`;
      cs.innerHTML = `<option value="">nothing (one at a time)</option>` + (same.length ? `<optgroup label="Same fire">${same.map(opt).join("")}</optgroup>` : "") +
        (rest.length ? `<optgroup label="Other days in the list">${rest.slice(0, 400).map(opt).join("")}</optgroup>` : "");
      if (!items.find((c) => c.id === st.b) || st.b === st.a) st.b = "";
      if (st.b && !cs.querySelector(`option[value="${st.b}"]`)) cs.insertAdjacentHTML("beforeend", opt(items.find((c) => c.id === st.b)));
      cs.value = st.b;
      const b = items.find((c) => c.id === st.b);
      $(".b-panes").className = "b-panes" + (b && !opts.stack ? " grid2" : "");
      pane($(".b-a"), a);
      pane($(".b-b"), b);
      if (opts.onSelect) opts.onSelect(a, b);
      const p = new URLSearchParams(location.search);
      st.a ? p.set("case", st.a) : p.delete("case"); st.b ? p.set("vs", st.b) : p.delete("vs");
      history.replaceState(null, "", "?" + p.toString() + location.hash);
    }
    draw();
    return { redraw: draw };
  }

  // ---------- shared filter bar (2026-11-12): every page that shows fire days or fires filters through it.
  // filters(host, {onChange, mode: "day"|"fire", cls: [default classes], extra: [{k, label, test(d)}], preset})
  // -> {match(d), state, reset()}. State lives in the URL (?f=...) so a filtered view can be shared.
  const REGIONS = { north: "North (ONCC)", south: "South (OSCC)", hawaii: "Hawaii" };
  const YEARS = [...new Set(Object.values(P.fires).map((v) => +v.label.slice(-4)).filter((y) => y > 1990))].sort();
  const yearOf = (k) => +(P.fires[k] ? P.fires[k].label.slice(-4) : 0);
  const ALLCLS = ["pyroCb", "ambiguous", "pyroCu", "none", "no_goes"];
  const PRESETS = {
    "": ["Custom", null],
    key: ["Most important: pyroCb, storms over fire and pyroCu ≥ 5,000 ac", { cls: ["pyroCb", "ambiguous", "pyroCu"], minAc: 0, keyOnly: 1 }],
    cb: ["PyroCb days only", { cls: ["pyroCb"] }],
    storms: ["Storms over fire (unresolved by satellite)", { cls: ["ambiguous"] }],
    near: ["Near misses: pyroCu with FP/PFT ≥ 0.12", { cls: ["pyroCu"], fpr: 0.12 }],
    runs: ["Big runs with no deep plume (≥ 20,000 ac)", { cls: ["none"], minAc: 20000 }],
    radar: ["Days on a usable radar", { radarOK: 1 }],
    reviewed: ["Days with a reviewer's note", { reviewed: 1 }],
  };
  function filters(host, o) {
    const mode = o.mode || "day", q = new URLSearchParams(location.search);
    const def = () => ({ q: "", region: Object.keys(REGIONS), y0: YEARS[0], y1: YEARS[YEARS.length - 1], cls: (o.cls || ALLCLS).slice(),
      minAc: 0, regime: "", fpr: 0, radarOK: 0, reviewed: 0, keyOnly: 0, preset: "" });
    let st = def();
    try { if (q.get("f")) st = { ...st, ...JSON.parse(q.get("f")) }; else if (o.preset) apply(o.preset, false); } catch (e) { /* bad link: defaults */ }
    function apply(name, redraw = true) {
      const p = PRESETS[name] && PRESETS[name][1];
      if (p) st = { ...def(), ...p, cls: (p.cls || def().cls).slice(), preset: name };
      if (redraw) { sync(); fire(); }
    }
    const cls = ALLCLS.filter((c) => mode === "fire" || !o.items || o.items.some((d) => d.cls === c));
    host.classList.add("filters");
    host.innerHTML = `<div class="controls">
        <label>Show <select class="f-preset">${Object.entries(PRESETS).map(([k, [t]]) => `<option value="${k}">${t}</option>`).join("")}</select></label>
        <label>Fire <input class="f-q" type="search" placeholder="name contains…" size="14"></label>
        <label>Years <select class="f-y0">${YEARS.map((y) => `<option>${y}</option>`).join("")}</select>–<select class="f-y1">${YEARS.map((y) => `<option>${y}</option>`).join("")}</select></label>
        <label>${mode === "fire" ? "Fire size ≥" : "Growth ≥"} <select class="f-ac">${[0, 1000, 5000, 10000, 20000, 50000, 100000].map((v) => `<option value="${v}">${v ? v.toLocaleString() + " ac" : "any"}</option>`).join("")}</select></label>
        ${mode === "day" ? `<label>Regime <select class="f-regime"><option value="">any</option>${["A", "B", "C", "D", "E", "F"].map((r) => `<option>${r}</option>`).join("")}<option value="CAD">A, C or D</option></select></label>
        <label>FP/PFT ≥ <select class="f-fpr">${[0, 0.05, 0.12, 0.24, 0.5, 1].map((v) => `<option value="${v}">${v || "any"}</option>`).join("")}</select></label>` : ""}
        <button type="button" class="chip f-reset">Reset</button><span class="note f-count"></span></div>
      <div class="controls"><span class="note">Region</span><div class="chips f-region">${Object.entries(REGIONS).map(([k, t]) => `<span class="chip" data-k="${k}">${t}</span>`).join("")}</div>
        <span class="note">${mode === "fire" ? "Fires with a day of" : "Class"}</span><div class="chips f-cls">${cls.map((c) => `<span class="chip" data-k="${c}" title="${C.CLS_DEF[c] || ""}"><i class="sw ${c}"></i>${C.CLS_NAME[c]}</span>`).join("")}</div>
        ${mode === "day" ? `<label><input type="checkbox" class="f-radar"> usable radar only</label><label><input type="checkbox" class="f-rev"> reviewer's note</label>` : ""}</div>`;
    const $ = (s) => host.querySelector(s);
    function sync() {
      $(".f-preset").value = st.preset || ""; $(".f-q").value = st.q; $(".f-y0").value = st.y0; $(".f-y1").value = st.y1; $(".f-ac").value = st.minAc;
      if ($(".f-regime")) { $(".f-regime").value = st.regime; $(".f-fpr").value = st.fpr; $(".f-radar").checked = !!st.radarOK; $(".f-rev").checked = !!st.reviewed; }
      host.querySelectorAll(".f-region .chip").forEach((c) => c.classList.toggle("on", st.region.includes(c.dataset.k)));
      host.querySelectorAll(".f-cls .chip").forEach((c) => c.classList.toggle("on", st.cls.includes(c.dataset.k)));
    }
    const custom = () => { st.preset = ""; $(".f-preset").value = ""; };
    function fire() {
      const p = new URLSearchParams(location.search), d = JSON.stringify(def()), cur = JSON.stringify(st);
      if (cur === d) p.delete("f"); else p.set("f", cur);
      history.replaceState(null, "", "?" + p.toString() + location.hash);
      o.onChange && o.onChange();
    }
    const fireOf = (d) => P.fires[d.fire] || {};
    function matchDay(d) {
      const f = fireOf(d), y = yearOf(d.fire), s = st.q.trim().toLowerCase();
      if (s && !(f.label || d.fire).toLowerCase().includes(s)) return false;
      if (!st.region.includes(f.region || "north") || y < st.y0 || y > st.y1 || !st.cls.includes(d.cls)) return false;
      if (st.minAc && (d.growth_ac || 0) < st.minAc) return false;
      if (st.regime && !(st.regime === "CAD" ? ["A", "C", "D"].includes(d.regime) : d.regime === st.regime)) return false;
      if (st.fpr && !(d.ratio_max !== null && d.ratio_max !== "inf" && d.ratio_max >= st.fpr)) return false;
      if (st.radarOK && !(f.radar_usable && d.radar_rooted_top_km !== null && d.radar_rooted_top_km !== undefined)) return false;
      if (st.reviewed && !d.note) return false;
      if (st.keyOnly && d.cls === "pyroCu" && (d.growth_ac || 0) < 5000) return false;
      return !(o.extra || []).some((x) => st[x.k] && !x.test(d));
    }
    function matchFire(k) {
      const f = P.fires[k], y = yearOf(k), s = st.q.trim().toLowerCase();
      if (!f || !f.days || (s && !f.label.toLowerCase().includes(s))) return false;
      if (!st.region.includes(f.region || "north") || y < st.y0 || y > st.y1) return false;
      if (st.minAc && (f.acres || f.growth_ac || 0) < st.minAc) return false;
      return st.cls.length === ALLCLS.length || st.cls.some((c) => f.classes[c]);
    }
    $(".f-preset").addEventListener("change", (e) => apply(e.target.value));
    $(".f-q").addEventListener("input", (e) => { st.q = e.target.value; custom(); fire(); });
    $(".f-y0").addEventListener("change", (e) => { st.y0 = +e.target.value; custom(); fire(); });
    $(".f-y1").addEventListener("change", (e) => { st.y1 = +e.target.value; custom(); fire(); });
    $(".f-ac").addEventListener("change", (e) => { st.minAc = +e.target.value; custom(); fire(); });
    if ($(".f-regime")) {
      $(".f-regime").addEventListener("change", (e) => { st.regime = e.target.value; custom(); fire(); });
      $(".f-fpr").addEventListener("change", (e) => { st.fpr = +e.target.value; custom(); fire(); });
      $(".f-radar").addEventListener("change", (e) => { st.radarOK = e.target.checked ? 1 : 0; custom(); fire(); });
      $(".f-rev").addEventListener("change", (e) => { st.reviewed = e.target.checked ? 1 : 0; custom(); fire(); });
    }
    const toggle = (list, k) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
    host.querySelectorAll(".f-region .chip").forEach((c) => c.addEventListener("click", () => { st.region = toggle(st.region, c.dataset.k); custom(); sync(); fire(); }));
    host.querySelectorAll(".f-cls .chip").forEach((c) => c.addEventListener("click", () => { st.cls = toggle(st.cls, c.dataset.k); custom(); sync(); fire(); }));
    $(".f-reset").addEventListener("click", () => { st = def(); sync(); fire(); });
    sync();
    return { match: mode === "fire" ? matchFire : matchDay, get state() { return st; },
      count: (n, total, what) => { $(".f-count").textContent = `${n.toLocaleString()} of ${total.toLocaleString()} ${what}`; } };
  }

  // A sortable, paged list of days for the browse pages (replaces day chips once hundreds of days are listed).
  function dayList(host, o) {
    const cols = o.cols || [["day", "Day"], ["fire", "Fire"], ["cls", "Class"], ["growth_ac", "Growth (ac)"], ["ratio_max", "FP/PFT"], ["bt_rooted_min", "GOES top (°C)"], ["radar_rooted_top_km", "Radar top (km)"]];
    let sortK = o.sort || "day", dir = o.dir || -1, page = 0;
    const per = o.per || 60;
    function draw(items, selId) {
      const v = (d, k) => (k === "fire" ? fireLabel(d.fire) : d[k] === "inf" ? 1e9 : d[k]);
      const rows = items.slice().sort((a, b) => { const x = v(a, sortK), y = v(b, sortK);
        return (x === null || x === undefined) - (y === null || y === undefined) || (x > y ? 1 : x < y ? -1 : 0) * dir; });
      const pages = Math.max(1, Math.ceil(rows.length / per));
      const at = selId ? rows.findIndex((d) => d.id === selId) : -1;
      if (at >= 0) page = Math.floor(at / per);
      page = Math.min(page, pages - 1);
      const shown = rows.slice(page * per, page * per + per);
      host.innerHTML = (rows.length ? `<div class="scroll" style="max-height:330px;overflow-y:auto"><table class="daylist"><tr>${cols.map(([k, t]) =>
        `<th data-k="${k}" class="${["day", "fire", "cls"].includes(k) ? "" : "n"}" style="cursor:pointer">${t}${sortK === k ? (dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr>` +
        shown.map((d) => `<tr data-id="${d.id}" class="${d.id === selId ? "sel" : ""}" style="cursor:pointer">${cols.map(([k]) =>
          k === "fire" ? `<td>${fireLabel(d.fire)}</td>` : k === "cls" ? `<td><span class="badge ${d.cls}">${C.CLS_NAME[d.cls]}</span></td>` :
          k === "day" ? `<td>${d.day}</td>` : o.cell && o.cell(d, k) !== undefined ? `<td>${o.cell(d, k)}</td>` : `<td class="n">${C.fmt(d[k], k === "growth_ac" ? 0 : undefined)}</td>`).join("")}</tr>`).join("") +
        `</table></div>` : `<p class="note">No days match the filters.</p>`) +
        (pages > 1 ? `<div class="controls" style="margin-top:6px"><button type="button" class="chip pg-prev">‹ prev</button><span class="note">page ${page + 1} of ${pages}</span><button type="button" class="chip pg-next">next ›</button></div>` : "");
      host.querySelectorAll("th[data-k]").forEach((th) => th.addEventListener("click", () => { const k = th.dataset.k; dir = sortK === k ? -dir : (k === "day" || k === "fire" ? 1 : -1); sortK = k; draw(items, selId); }));
      host.querySelectorAll("tr[data-id]").forEach((tr) => tr.addEventListener("click", () => o.onPick(tr.dataset.id)));
      const pv = host.querySelector(".pg-prev"), nx = host.querySelector(".pg-next");
      if (pv) pv.addEventListener("click", () => { page = Math.max(0, page - 1); draw(items, null); });
      if (nx) nx.addEventListener("click", () => { page = Math.min(pages - 1, page + 1); draw(items, null); });
    }
    return { draw };
  }

  // A filter card placed under the page's intro (Factors, Forecasting, Weather patterns, Radar): charts redraw on change.
  function pageFilter(onChange, note) {
    const card = document.createElement("div");
    card.className = "card"; card.id = "filters"; card.dataset.guide = "guide.html#filters";
    card.innerHTML = `<h2 style="margin-top:0">Filter the days</h2><div class="pf"></div>${note ? `<p class="note">${note}</p>` : ""}`;
    const anchor = document.querySelector(".wrap > .sub") || document.querySelector(".wrap > h1");
    anchor.after(card);
    const F = filters(card.querySelector(".pf"), { items: P.days, onChange: () => { F.count(P.days.filter(F.match).length, P.days.length, "days"); onChange(); } });
    F.count(P.days.filter(F.match).length, P.days.length, "days");
    return F;
  }

  window.PG = { P, fireLabel, byId, dayTip, detail, lightbox, FLAG, pft, browser, filters, dayList, pageFilter, REGIONS };
})();
