/* Minimal SVG charts for the pyroCb research site (no dependencies). */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const CLS = ["pyroCb", "pyroCu", "ambiguous", "none"];
  const CLS_NAME = { pyroCb: "pyroCb", pyroCu: "pyroCu", ambiguous: "ordinary storms over fire", none: "no deep plume cloud" };
  const CLS_DEF = {
    pyroCb: "Fire-rooted cloud top colder than -40 C in at least two GOES scans: the plume became a thunderstorm.",
    pyroCu: "Fire-rooted cloud top colder than -20 C in at least two scans, but not -40 C: a deep cumulus cap.",
    ambiguous: "Ambient thunderstorms or cloud over or beside the fire; satellite can't separate a pyroCb, so left out of scoring.",
    none: "Fewer than two scans with a fire-rooted cloud colder than -20 C: the plume stayed shallow or was smoke only. Not 'no plume'.",
  };
  const CLS_VAR = { pyroCb: "--c-pyrocb", pyroCu: "--c-pyrocu", ambiguous: "--c-amb", none: "--c-none" };
  const color = (c) => `var(${CLS_VAR[c] || "--c-none"})`;
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const fmt = (v, d) => (v === null || v === undefined || v === "inf") ? (v === "inf" ? "no solution" : "–")
    : (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : (+v).toFixed(d === undefined ? (Math.abs(v) < 10 ? 2 : 1) : d));

  // ---------- metrics shared by every page
  const M = {
    ratio_max: { label: "Fire power ÷ PFT (same hour, day max)", short: "FP/PFT", log: true, hi: true, unit: "", nd: 2,
      what: "The fire's heat output divided by the least heat the air needs to make a pyroCb, in the same hour. The best single separator." },
    pft_min_gw: { label: "Pyrocb firepower threshold, day minimum (GW)", short: "PFT", log: true, hi: false, unit: "GW", nd: 0,
      what: "Tory & Kepert (2021): the least fire power (GW) the atmosphere needs before a plume can become a pyroCb. Lower = more favourable air. 'No solution' = the air is too dry or stable at any fire power." },
    fp_max_gw: { label: "Fire power, peak hour (GW)", short: "FP", log: true, hi: true, unit: "GW", nd: 0,
      what: "Convective heat from the fire: GOES fire radiative power × 3.9." },
    z_fc_km: { label: "Free-convection height at PFT minimum (km AGL)", short: "z_fc", log: false, hi: false, unit: "km", nd: 1,
      what: "How high the plume must rise before it can convect freely. Enters PFT squared, so it dominates." },
    dtheta_fc: { label: "Extra plume warmth needed, Δθ_fc (K)", short: "Δθ_fc", log: false, hi: false, unit: "K", nd: 1,
      what: "How much warmer than the mixed layer the plume must be at z_fc to punch through stable layers above." },
    u_ml: { label: "Mixed-layer wind at PFT minimum (m/s)", short: "U_ML", log: false, hi: false, unit: "m/s", nd: 1,
      what: "Wind through the plume's lower layer. Strong wind bends plumes over and raises the threshold." },
    q_ml_gkg: { label: "Mixed-layer moisture, day max (g/kg)", short: "q_ML", log: false, hi: true, unit: "g/kg", nd: 1,
      what: "Moisture mixed through the hot boundary layer. Monsoon surges raise it, lowering the condensation level." },
    q700_era5: { label: "700 hPa moisture at the fire, ERA5 (g/kg)", short: "q700", log: false, hi: true, unit: "g/kg", nd: 1,
      what: "Mid-level moisture (~10,000 ft). The AI and global weather ensembles forecast this field days ahead." },
    radar_rooted_top_km: { label: "Radar: fire-rooted plume echo top (km MSL)", short: "radar top", log: false, hi: true, unit: "km", nd: 1,
      what: "Height of the NEXRAD echo column rising from the fire's ash and debris. Usable radars only." },
    omps_ai_d0: { label: "OMPS aerosol index near the fire, same-day pass", short: "OMPS AI", log: false, hi: true, unit: "", nd: 1,
      what: "Peak UV Aerosol Index within 150 km of the fire front on the ~13:30 satellite pass (Suomi NPP OMPS, 50 km pixels, for these fires). High values mean absorbing smoke high in the atmosphere; above about 10, the upper troposphere or stratosphere. Not a pyroCb test here: see the Satellite page." },
    omps_ai_d1: { label: "OMPS aerosol index within 500 km, next-day pass", short: "OMPS AI next day", log: false, hi: true, unit: "", nd: 1,
      what: "Peak UV Aerosol Index within 500 km of the fire on the next day's pass, when smoke from an afternoon pyroCb would first be seen. Smoke from other fires gets in." },
    pcape_max_jkg: { label: "Pyroconvective CAPE, day max (J/kg)", short: "PCAPE", log: false, hi: true, unit: "J/kg", nd: 0,
      what: "Buoyant energy of the pyroCb parcel from its free-convection height (z_fc) up to its equilibrium level: the area between the parcel path and the environment. 0 = no pyroCb parcel that day. The best single atmosphere-only measure in the study." },
    dcape_max_jkg: { label: "Downdraft CAPE, day max (J/kg)", short: "DCAPE", log: false, hi: true, unit: "J/kg", nd: 0,
      what: "Downdraft CAPE: the energy a parcel of mid-level air gains sinking to the ground once rain or ice evaporates into it, from the driest (lowest theta-e) air in the lowest 400 hPa. High values mean strong potential downdrafts and outflow winds at the surface." },
    pcape_fc_max: { label: "Forecast PCAPE, 05 PDT HRRR at yesterday's front (J/kg)", short: "forecast PCAPE", log: false, hi: true, unit: "J/kg", nd: 0,
      what: "PCAPE as the morning HRRR forecast saw it for the afternoon (f09-f15), at the fire front known that morning." },
    growth_ac: { label: "Satellite-mapped growth (acres / fire day)", short: "growth", log: true, hi: true, unit: "ac", nd: 0,
      what: "Area burned that fire day (06–06 local), from VIIRS/MODIS detections inside the final perimeter." },
    fp_fuel_gw: { label: "LANDFIRE fuel fire power, Scott & Burgan (GW)", short: "LANDFIRE fuel FP", log: true, hi: true, unit: "GW", nd: 0,
      what: "Area burned × pre-fire LANDFIRE available fuel (Scott & Burgan fine and live loads plus crown fuel) × heat yield ÷ burning time: an energy estimate independent of the satellite. Assumes all available fuel burns, whatever its moisture." },
    ratio_fuel: { label: "LANDFIRE fuel fire power ÷ PFT", short: "LANDFIRE FP/PFT", log: true, hi: true, unit: "", nd: 2,
      what: "The fire-against-air ratio with the LANDFIRE (Scott & Burgan) fuel fire power." },
    fofem_fp_surface_gw: { label: "FCCS fuel fire power, FOFEM surface fuel (GW)", short: "FCCS fuel FP", log: true, hi: true, unit: "GW", nd: 0,
      what: "Area burned × the surface fuel FOFEM says burns (LANDFIRE FCCS fuelbeds: litter, duff, dead wood by size, herbs, shrubs) at that day's gridMET fuel moisture × heat yield ÷ burning time. Crown fuel left out." },
    ratio_fofem_surface: { label: "FCCS fuel fire power ÷ PFT", short: "FCCS FP/PFT", log: true, hi: true, unit: "", nd: 2,
      what: "The fire-against-air ratio with the FCCS/FOFEM fuel fire power: the best fuel-based version, matching satellite FP/PFT." },
    erc_psa: { label: "Energy Release Component, fire's PSA (fuel model Y)", short: "ERC", log: false, hi: true, unit: "", nd: 0,
      what: "NFDRS ERC averaged over the RAWS of the fire's Predictive Services Area: the energy available per unit area at the flaming front, driven by dead and live fuel moisture over weeks." },
    erc_pct: { label: "ERC percentile, PSA's June–October record", short: "ERC percentile", log: false, hi: true, unit: "", nd: 0,
      what: "Where that day's PSA ERC ranks among every June–October day since 2005 in the same PSA (100 = driest on record)." },
    fm1000_psa: { label: "1000-h fuel moisture, fire's PSA (%)", short: "1000-h (PSA)", log: false, hi: false, unit: "%", nd: 1,
      what: "NFDRS 1000-hour dead fuel moisture (3–8 inch wood), PSA average: the slow, weeks-long drying of heavy fuel." },
    fm100_psa: { label: "100-h fuel moisture, fire's PSA (%)", short: "100-h (PSA)", log: false, hi: false, unit: "%", nd: 1,
      what: "NFDRS 100-hour dead fuel moisture (1–3 inch wood), PSA average: drying over a few days." },
    fm1000: { label: "1000-h fuel moisture at the fire, gridMET (%)", short: "1000-h (gridMET)", log: false, hi: false, unit: "%", nd: 1,
      what: "gridMET 4 km 1000-hour dead fuel moisture at the fire's hot front: the value FOFEM uses for duff and log consumption." },
    lfmc_shrub: { label: "Shrub live fuel moisture, field samples (%)", short: "shrub LFMC", log: false, hi: false, unit: "%", nd: 0,
      what: "Measured live fuel moisture of shrubs (National Fuel Moisture Database) at sites within 60 km, the latest sample in the 21 days before." },
    ahead_avail_kgm2: { label: "Fuel ahead of the front: available fuel (kg/m²)", short: "fuel ahead", log: false, hi: true, unit: "kg/m²", nd: 2,
      what: "Surface fine fuel plus crown fuel on crown-fire-prone ground, within 5 km of the previous day's growth (LANDFIRE 2016, pre-fire)." },
    ahead_canopy_load_kgm2: { label: "Fuel ahead: canopy fuel load (kg/m²)", short: "canopy load", log: false, hi: true, unit: "kg/m²", nd: 2,
      what: "Canopy bulk density × canopy depth ahead of the front (LANDFIRE)." },
    ahead_slope_deg: { label: "Fuel ahead: mean slope (°)", short: "slope", log: false, hi: true, unit: "°", nd: 0,
      what: "Mean slope of unburned ground within 5 km of the previous day's growth." },
    burned_avail_kgm2: { label: "Burned that day: available fuel (kg/m²)", short: "fuel burned", log: false, hi: true, unit: "kg/m²", nd: 2,
      what: "Available fuel on the ground that burned that day (LANDFIRE, pre-fire)." },
    pft_fc_min: { label: "Forecast PFT, 05 PDT HRRR at yesterday's front (GW)", short: "forecast PFT", log: true, hi: false, unit: "GW", nd: 0,
      what: "The threshold as the morning HRRR forecast saw it, at the fire front known that morning." },
    r_prev_goes_fc: { label: "Yesterday's peak fire power ÷ forecast PFT", short: "morning ratio", log: true, hi: true, unit: "", nd: 2,
      what: "What an analyst could compute at 6 a.m.: persistence fire power against the forecast threshold." },
  };
  const val = (d, k) => {
    const v = d[k];
    if (v === "inf") return M[k] && M[k].log ? 3000 : null;
    return v === null || v === undefined ? null : +v;
  };

  // ---------- tooltip
  function tip(container) {
    let t = container.querySelector(".tip");
    if (!t) { t = document.createElement("div"); t.className = "tip"; container.appendChild(t); }
    return {
      show(html, ev) {
        t.innerHTML = html; t.style.display = "block";
        const r = container.getBoundingClientRect();
        let x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
        if (x + 290 > r.width) x = ev.clientX - r.left - 290;
        t.style.left = Math.max(0, x) + "px"; t.style.top = y + "px";
      },
      hide() { t.style.display = "none"; },
    };
  }

  // ---------- scales
  function scale(domain, range, log) {
    let [a, b] = domain;
    if (log) { a = Math.log10(a); b = Math.log10(b); }
    const f = (v) => range[0] + ((log ? Math.log10(v) : v) - a) / (b - a || 1) * (range[1] - range[0]);
    f.ticks = () => {
      if (log) {
        const out = [];
        for (let e = Math.floor(a); e <= Math.ceil(b); e++) for (const m of [1, 2, 5]) {
          const v = m * Math.pow(10, e); if (v >= Math.pow(10, a) * 0.999 && v <= Math.pow(10, b) * 1.001) out.push(v);
        }
        return out.length > 9 ? out.filter((v) => String(v).startsWith("1")) : out;
      }
      const span = b - a, step = Math.pow(10, Math.floor(Math.log10(span / 5)));
      const st = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => span / s <= 7) || step * 10;
      const out = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(10));
      return out;
    };
    return f;
  }
  function extent(vals, log, pad) {
    const v = vals.filter((x) => x !== null && isFinite(x) && (!log || x > 0));
    if (!v.length) return [log ? 1 : 0, log ? 10 : 1];
    let lo = Math.min(...v), hi = Math.max(...v);
    if (log) return [Math.pow(10, Math.floor(Math.log10(lo) * 4) / 4), Math.pow(10, Math.ceil(Math.log10(hi) * 4) / 4)];
    const p = (hi - lo || 1) * (pad === undefined ? 0.06 : pad);
    return [lo - p, hi + p];
  }
  const tickLabel = (v) => v >= 1000 ? (v / 1000) + "k" : (v === 0 ? "0" : Math.abs(v) < 0.01 ? v.toExponential(0) : String(+v.toPrecision(3)));

  function axes(svg, x, y, W, H, m, xl, yl, xCat, xTicks) {
    const g = el("g", { class: "axis" }, svg);
    for (const t of y.ticks()) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: "gridline" }, g);
      el("text", { x: m.l - 6, y: y(t) + 3.5, "text-anchor": "end" }, g).textContent = tickLabel(t);
    }
    if (!xCat) for (const t of (xTicks || x.ticks().map((v) => [v, tickLabel(v)]))) {
      el("line", { x1: x(t[0]), x2: x(t[0]), y1: H - m.b, y2: H - m.b + 4 }, g);
      el("text", { x: x(t[0]), y: H - m.b + 16, "text-anchor": "middle" }, g).textContent = t[1];
    }
    el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, g);
    if (xl) el("text", { x: (m.l + W - m.r) / 2, y: H - 4, "text-anchor": "middle", class: "alabel" }, g).textContent = xl;
    if (yl) el("text", { x: 12, y: (m.t + H - m.b) / 2, "text-anchor": "middle", class: "alabel",
      transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})` }, g).textContent = yl;
  }

  // ---------- scatter: opts {points:[{x,y,cls,id,html}], xLabel,yLabel,xLog,yLog,onClick,cutX,cutY,diag,selected,xTicks:[[v,label]]}
  function scatter(container, o) {
    container.querySelectorAll("svg").forEach((s) => s.remove());
    const W = 760, H = 460, m = { l: 58, r: 16, t: 12, b: 44 };
    const pts = o.points.filter((p) => p.x !== null && p.y !== null && (!o.xLog || p.x > 0) && (!o.yLog || p.y > 0));
    const xd = o.xDomain || extent(pts.map((p) => p.x), o.xLog), yd = o.yDomain || extent(pts.map((p) => p.y), o.yLog);
    const x = scale(xd, [m.l, W - m.r], o.xLog), y = scale(yd, [H - m.b, m.t], o.yLog);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${o.yLabel} against ${o.xLabel}` });
    container.prepend(svg);
    axes(svg, x, y, W, H, m, o.xLabel, o.yLabel, false, o.xTicks);
    if (o.diag) for (const d of o.diag) {
      const lo = Math.max(xd[0], yd[0] / d.k), hi = Math.min(xd[1], yd[1] / d.k);
      if (hi > lo) {
        el("line", { x1: x(lo), y1: y(lo * d.k), x2: x(hi), y2: y(hi * d.k), class: "cutline", "stroke-dasharray": d.dash || "5 4" }, svg);
        el("text", { x: x(hi) - 4, y: y(hi * d.k) + 14, "text-anchor": "end", class: "cutlabel" }, svg).textContent = d.label;
      }
    }
    if (o.cutX !== undefined && o.cutX !== null) {
      el("line", { x1: x(o.cutX), x2: x(o.cutX), y1: m.t, y2: H - m.b, class: "cutline" }, svg);
    }
    if (o.cutY !== undefined && o.cutY !== null) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(o.cutY), y2: y(o.cutY), class: "cutline" }, svg);
      if (o.cutLabel) el("text", { x: W - m.r - 4, y: y(o.cutY) - 5, "text-anchor": "end", class: "cutlabel" }, svg).textContent = o.cutLabel;
    }
    const T = tip(container);
    const order = ["none", "ambiguous", "pyroCu", "pyroCb"];
    pts.sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls));
    for (const p of pts) {
      const c = el("circle", { cx: x(p.x), cy: y(p.y), r: p.cls === "pyroCb" ? 7.5 : 5, fill: color(p.cls),
        class: "pt" + (p.dim ? " dim" : "") + (o.selected && o.selected === p.id ? " sel" : ""), tabindex: 0 }, svg);
      c.addEventListener("mousemove", (ev) => T.show(p.html, ev));
      c.addEventListener("mouseleave", () => T.hide());
      if (o.onClick) { c.addEventListener("click", () => o.onClick(p)); c.addEventListener("keydown", (e) => { if (e.key === "Enter") o.onClick(p); }); }
    }
    return { x, y };
  }

  // ---------- strip: values by class (x categories), opts {points:[{v,cls,html,id}], log, label, cut, onClick}
  function strip(container, o) {
    container.querySelectorAll("svg").forEach((s) => s.remove());
    const W = 760, H = 330, m = { l: 58, r: 16, t: 12, b: 44 };
    const pts = o.points.filter((p) => p.v !== null && isFinite(p.v) && (!o.log || p.v > 0));
    const yd = extent(pts.map((p) => p.v), o.log);
    const y = scale(yd, [H - m.b, m.t], o.log);
    const bw = (W - m.l - m.r) / CLS.length;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${o.label} by plume class` });
    container.prepend(svg);
    axes(svg, null, y, W, H, m, null, o.label, true);
    CLS.forEach((c, i) => {
      const n = o.points.filter((p) => p.cls === c).length;
      el("text", { x: m.l + bw * (i + .5), y: H - m.b + 16, "text-anchor": "middle", class: "alabel" }, svg).textContent = `${CLS_NAME[c]} (${n})`;
    });
    if (o.cut !== undefined && o.cut !== null && isFinite(o.cut)) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(o.cut), y2: y(o.cut), class: "cutline" }, svg);
      el("text", { x: W - m.r - 4, y: y(o.cut) - 5, "text-anchor": "end", class: "cutlabel" }, svg).textContent = o.cutLabel || "";
    }
    const T = tip(container);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const p of pts) {
      const i = CLS.indexOf(p.cls);
      const c = el("circle", { cx: m.l + bw * (i + .5) + (rnd() - .5) * bw * .62, cy: y(p.v), r: p.cls === "pyroCb" ? 7 : 4.5,
        fill: color(p.cls), class: "pt", tabindex: 0 }, svg);
      c.addEventListener("mousemove", (ev) => T.show(p.html, ev));
      c.addEventListener("mouseleave", () => T.hide());
      if (o.onClick) c.addEventListener("click", () => o.onClick(p));
    }
  }

  // ---------- daily bars, opts {days:[{day, v, cls, html}], label, log, cut, cutLabel, height}
  function bars(container, o) {
    container.querySelectorAll("svg").forEach((s) => s.remove());
    const W = 760, H = o.height || 230, m = { l: 58, r: 16, t: 10, b: 34 };
    const vals = o.days.map((d) => d.v === null ? 0 : d.v);
    const yd = o.log ? extent(vals.filter((v) => v > 0), true) : [0, Math.max(...vals, o.cut || 0) * 1.08 || 1];
    const y = scale(yd, [H - m.b, m.t], o.log);
    const n = o.days.length, bw = (W - m.l - m.r) / Math.max(n, 1);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.label });
    container.prepend(svg);
    axes(svg, null, y, W, H, m, null, o.label, true);
    const T = tip(container);
    o.days.forEach((d, i) => {
      const v = d.v === null ? 0 : d.v;
      if (v > 0 && (!o.log || v >= yd[0])) {
        const top = y(v), h = (H - m.b) - top;
        el("rect", { x: m.l + i * bw + 1, y: top, width: Math.max(bw - 2, 1), height: Math.max(h, 0), rx: Math.min(4, bw / 3), fill: color(d.cls) }, svg);
      }
      const hit = el("rect", { x: m.l + i * bw, y: m.t, width: bw, height: H - m.b - m.t, fill: "transparent" }, svg);
      hit.addEventListener("mousemove", (ev) => T.show(d.html, ev));
      hit.addEventListener("mouseleave", () => T.hide());
      if (o.onClick) hit.addEventListener("click", () => o.onClick(d));
      if (n <= 40 ? i % 3 === 0 : i % 7 === 0)
        el("text", { x: m.l + i * bw + bw / 2, y: H - m.b + 15, "text-anchor": "middle" }, svg).textContent = d.day.slice(5);
    });
    if (o.cut) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(o.cut), y2: y(o.cut), class: "cutline" }, svg);
      el("text", { x: W - m.r - 4, y: y(o.cut) - 5, "text-anchor": "end", class: "cutlabel" }, svg).textContent = o.cutLabel || "";
    }
  }

  // ---------- daily lines (one axis), opts {days:[...dates], series:[{name, vals, color, dash}], label, log, html(i)}
  function lines(container, o) {
    container.querySelectorAll("svg").forEach((s) => s.remove());
    const W = 760, H = o.height || 240, m = { l: 58, r: 16, t: 10, b: 34 };
    const all = o.series.flatMap((s) => s.vals).filter((v) => v !== null && isFinite(v) && (!o.log || v > 0));
    const yd = extent(all, o.log);
    const y = scale(yd, [H - m.b, m.t], o.log);
    const n = o.days.length, bw = (W - m.l - m.r) / Math.max(n, 1), xc = (i) => m.l + bw * (i + .5);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.label });
    container.prepend(svg);
    axes(svg, null, y, W, H, m, null, o.label, true);
    for (const s of o.series) {
      let d = "", pen = false;
      s.vals.forEach((v, i) => {
        if (v === null || !isFinite(v) || (o.log && v <= 0)) { pen = false; return; }
        d += (pen ? "L" : "M") + xc(i).toFixed(1) + " " + y(Math.min(Math.max(v, yd[0]), yd[1])).toFixed(1); pen = true;
      });
      el("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-dasharray": s.dash || "", "stroke-linejoin": "round" }, svg);
      s.vals.forEach((v, i) => { if (v !== null && isFinite(v) && (!o.log || v > 0)) el("circle", { cx: xc(i), cy: y(Math.min(Math.max(v, yd[0]), yd[1])), r: 3, fill: s.color }, svg); });
      if (s.marks) s.marks.forEach((on, i) => { if (on) el("text", { x: xc(i), y: m.t + 9, "text-anchor": "middle", fill: s.color, style: `fill:${s.color}` }, svg).textContent = "×"; });
    }
    const T = tip(container), cross = el("line", { y1: m.t, y2: H - m.b, stroke: "var(--axis)", "stroke-width": 1, visibility: "hidden" }, svg);
    o.days.forEach((dd, i) => {
      const hit = el("rect", { x: m.l + i * bw, y: m.t, width: bw, height: H - m.b - m.t, fill: "transparent" }, svg);
      hit.addEventListener("mousemove", (ev) => { cross.setAttribute("x1", xc(i)); cross.setAttribute("x2", xc(i)); cross.setAttribute("visibility", "visible"); T.show(o.html(i), ev); });
      hit.addEventListener("mouseleave", () => { cross.setAttribute("visibility", "hidden"); T.hide(); });
      if (n <= 40 ? i % 3 === 0 : i % 7 === 0) el("text", { x: xc(i), y: H - m.b + 15, "text-anchor": "middle" }, svg).textContent = dd.slice(5);
    });
  }

  // ---------- best-cut scoring (balanced accuracy), ambiguous days excluded
  function score(days, key, cut, hi) {
    const r = { cb: 0, cbN: 0, cu: 0, cuN: 0, no: 0, noN: 0 };
    for (const d of days) {
      if (d.cls === "ambiguous") continue;
      let v = val(d, key);
      if (v === null) { if (key.startsWith("radar") || key.startsWith("ahead") || key.startsWith("burned") || key.includes("fuel") || key.includes("_fc") || key.startsWith("r_prev")) continue; v = hi ? 0 : 1e9; }
      const f = hi ? v >= cut : v <= cut;
      if (d.cls === "pyroCb") { r.cbN++; if (f) r.cb++; } else if (d.cls === "pyroCu") { r.cuN++; if (f) r.cu++; } else { r.noN++; if (f) r.no++; }
    }
    const neg = r.cuN + r.noN, fa = r.cu + r.no;
    r.bacc = 0.5 * (r.cb / Math.max(r.cbN, 1) + (neg - fa) / Math.max(neg, 1));
    return r;
  }
  function bestCut(days, key, hi) {
    const vs = [...new Set(days.filter((d) => d.cls !== "ambiguous").map((d) => val(d, key)).filter((v) => v !== null))].sort((a, b) => a - b);
    let best = null;
    for (let i = 0; i < vs.length - 1; i++) {
      const c = (vs[i] + vs[i + 1]) / 2, s = score(days, key, c, hi);
      if (!best || s.bacc > best.s.bacc) best = { c, s };
    }
    return best;
  }

  // ---------- shared page chrome
  function chrome(active) {
    const pages = [["index.html", "Overview"], ["explore.html", "Explore days"], ["factors.html", "Factors"], ["fires.html", "Fires"],
      ["patterns.html", "Weather patterns"], ["forecast.html", "Forecasting"], ["soundings.html", "Soundings"], ["satellite.html", "Satellite"], ["radar.html", "Radar"], ["methods.html", "Methods & sources"]];
    const h = document.createElement("header"); h.className = "top";
    h.innerHTML = `<div class="bar"><a class="brand" href="index.html">PyroCb Research · California</a><nav>${pages.map(([u, t]) =>
      `<a href="${u}" class="${u === active ? "on" : ""}">${t}</a>`).join("")}</nav><button class="theme-btn" type="button" aria-label="Toggle light or dark theme">◐ Theme</button></div>`;
    document.body.prepend(h);
    const btn = h.querySelector(".theme-btn"), root = document.documentElement;
    try { const s = localStorage.getItem("pyrocb-theme"); if (s) root.dataset.theme = s; } catch (e) { /* storage blocked */ }
    btn.addEventListener("click", () => {
      const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem("pyrocb-theme", root.dataset.theme); } catch (e) { /* ignore */ }
    });
    const f = document.createElement("footer");
    f.innerHTML = `Experimental research from public data, not a forecast or operational product. Built ${window.PYRO ? window.PYRO.generated : ""}.
      Data credits and licences: <a href="methods.html#credits">Methods &amp; sources</a>.`;
    document.querySelector(".wrap").appendChild(f);
  }
  function legend() {
    return `<div class="legend">${CLS.map((c) => `<span title="${CLS_DEF[c]}"><i class="sw ${c}" style="width:10px;height:10px;border-radius:50%;display:inline-block;background:${color(c)}"></i>${CLS_NAME[c]}</span>`).join("")}</div>`;
  }

  window.PC = { M, CLS, CLS_NAME, CLS_DEF, color, val, fmt, scatter, strip, bars, lines, score, bestCut, chrome, legend };
})();
