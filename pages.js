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
      (d.sounding_img ? `<h3>Sounding (HRRR at the fire front)</h3><img src="${d.sounding_img}" alt="Skew-T sounding for ${d.day}" loading="lazy">` : "");
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

  // Browse-and-compare block shared by the Soundings, Satellite and Radar pages.
  // opts: items [{id, fire, day, cls, ...}], pane(item) -> html, featured(item) -> bool, featuredLabel,
  //       onSelect(item) optional, stack: true puts a compared day below instead of beside. URL state: ?case=<id>&vs=<id>.
  function browser(host, opts) {
    const items = opts.items, lb = lightbox(), q = new URLSearchParams(location.search);
    const fires = [...new Set(items.map((c) => c.fire))];
    const st = { fire: "_featured", cls: new Set(C.CLS), a: q.get("case"), b: q.get("vs") || "" };
    host.innerHTML = `<div class="controls"><label>Fire <select class="b-fire"></select></label>
        <span class="note">Classes</span><div class="chips b-cls"></div></div>
      <div class="chips b-days" style="margin:10px 0"></div>
      <div class="controls"><label>Compare with <select class="b-cmp"></select></label></div>
      <div class="b-panes"><div class="b-a"></div><div class="b-b" style="margin-top:12px"></div></div>`;
    const $ = (s) => host.querySelector(s), rf = $(".b-fire"), cs = $(".b-cmp");
    rf.innerHTML = `<option value="_featured">${opts.featuredLabel}</option>` + fires.map((f) => `<option value="${f}">${fireLabel(f)}</option>`).join("");
    const a0 = items.find((c) => c.id === st.a);
    if (a0 && !opts.featured(a0)) st.fire = a0.fire;
    else if (!a0 && st.a && fires.includes(st.a.slice(0, -11))) st.fire = st.a.slice(0, -11);  // that day has no picture: open its fire
    rf.value = st.fire;
    $(".b-cls").innerHTML = C.CLS.filter((k) => items.some((c) => c.cls === k)).map((k) =>
      `<span class="chip on" data-k="${k}" title="${C.CLS_DEF[k]}"><i class="sw ${k}"></i>${C.CLS_NAME[k]}</span>`).join("");
    host.querySelectorAll(".b-cls .chip").forEach((ch) => ch.addEventListener("click", () => {
      const k = ch.dataset.k; st.cls.has(k) ? st.cls.delete(k) : st.cls.add(k); ch.classList.toggle("on"); draw(); }));
    rf.addEventListener("change", () => { st.fire = rf.value; st.a = null; st.b = ""; draw(); });
    cs.addEventListener("change", () => { st.b = cs.value; draw(); });
    const short = (f) => fireLabel(f).replace(/ \(.*\)/, "").replace(/ \d{4}$/, "");
    function pane(el, c) {
      el.innerHTML = c ? opts.pane(c) : "";
      el.querySelectorAll("img").forEach((i) => { i.style.cursor = "zoom-in"; i.addEventListener("click", () => lb(i.src, i.alt)); });
    }
    function draw() {
      const list = items.filter((c) => (st.fire === "_featured" ? opts.featured(c) : c.fire === st.fire) && st.cls.has(c.cls));
      if (!list.find((c) => c.id === st.a)) st.a = list.length ? list[0].id : null;
      $(".b-days").innerHTML = list.map((c) => `<span class="chip ${c.id === st.a ? "on" : ""}" data-k="${c.id}"><i class="sw ${c.cls}"></i>` +
        `${st.fire === "_featured" ? short(c.fire) + " " : ""}${c.day}</span>`).join("") || `<p class="note">No days match the filters.</p>`;
      host.querySelectorAll(".b-days .chip").forEach((ch) => ch.addEventListener("click", () => { st.a = ch.dataset.k; draw(); }));
      const a = items.find((c) => c.id === st.a);
      const same = a ? items.filter((c) => c.fire === a.fire && c.id !== a.id) : [], rest = items.filter((c) => !a || c.fire !== a.fire);
      const opt = (c) => `<option value="${c.id}">${fireLabel(c.fire)} ${c.day} (${C.CLS_NAME[c.cls]})</option>`;
      cs.innerHTML = `<option value="">nothing (one at a time)</option>` + (same.length ? `<optgroup label="Same fire">${same.map(opt).join("")}</optgroup>` : "") +
        `<optgroup label="Other fires">${rest.map(opt).join("")}</optgroup>`;
      if (!items.find((c) => c.id === st.b) || st.b === st.a) st.b = "";
      cs.value = st.b;
      const b = items.find((c) => c.id === st.b);
      $(".b-panes").className = "b-panes" + (b && !opts.stack ? " grid2" : "");  // stack: wide pictures one above the other
      pane($(".b-a"), a);
      pane($(".b-b"), b);
      if (opts.onSelect) opts.onSelect(a, b);
      history.replaceState(null, "", "?case=" + (st.a || "") + (st.b ? "&vs=" + st.b : "") + location.hash);
    }
    draw();
  }

  window.PG = { P, fireLabel, byId, dayTip, detail, lightbox, FLAG, pft, browser };
})();
