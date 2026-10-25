import { useEffect, useMemo, useState } from "react";
import packs from "./data/packs.json";

const COLORS = {
  Grameenphone: "from-blue-500 to-blue-700",
  Robi: "from-red-500 to-red-700",
  Banglalink: "from-orange-400 to-orange-600",
  Teletalk: "from-green-500 to-green-700",
};
const OPERATORS = Object.keys(COLORS);
const VALIDITY = [3, 7, 15, 30];
const LAST_UPDATED = "2026-10-25";
const STORAGE_KEY = "bd-data-packs-custom";

// metrics used on the compare page
const METRICS = [
  { key: "price", label: "Price", unit: "৳", better: "low", fmt: (v) => `৳${v}` },
  { key: "dataGB", label: "Data", unit: "GB", better: "high", fmt: (v) => `${v} GB` },
  { key: "validityDays", label: "Validity", unit: "days", better: "high", fmt: (v) => `${v} days` },
  { key: "perGB", label: "Cost per GB", unit: "৳/GB", better: "low", fmt: (v) => `৳${v.toFixed(1)}` },
  { key: "perDay", label: "Cost per day", unit: "৳/day", better: "low", fmt: (v) => `৳${v.toFixed(1)}` },
  { key: "gbPerDay", label: "Data per day", unit: "GB/day", better: "high", fmt: (v) => `${v.toFixed(2)} GB` },
];

const inputCls =
  "w-full rounded-xl bg-slate-100 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700";

function loadCustom() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [tab, setTab] = useState("packs");
  const [dark, setDark] = useState(false);
  const [ops, setOps] = useState([]);
  const [validity, setValidity] = useState(null);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [sort, setSort] = useState("value");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState([]);
  const [custom, setCustom] = useState(loadCustom);
  const [form, setForm] = useState({
    operator: "Grameenphone",
    name: "",
    dataGB: "",
    validityDays: "",
    price: "",
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    } catch {
      /* ignore */
    }
  }, [custom]);

  // all packs = built-in + your own, with calculated values
  const allPacks = useMemo(
    () =>
      [...packs, ...custom].map((p) => ({
        ...p,
        perGB: p.price / p.dataGB,
        perDay: p.price / p.validityDays,
        gbPerDay: p.dataGB / p.validityDays,
      })),
    [custom]
  );

  const list = useMemo(() => {
    const r = allPacks
      .filter((p) => !ops.length || ops.includes(p.operator))
      .filter((p) => !validity || p.validityDays === validity)
      .filter((p) => p.price <= maxPrice)
      .filter((p) => (p.operator + p.name).toLowerCase().includes(q.toLowerCase()));
    const s = {
      value: (a, b) => a.perGB - b.perGB,
      cheap: (a, b) => a.price - b.price,
      data: (a, b) => b.dataGB - a.dataGB,
    }[sort];
    return r.sort(s);
  }, [allPacks, ops, validity, maxPrice, sort, q]);

  const bestId = list.length
    ? list.reduce((a, b) => (b.perGB < a.perGB ? b : a)).id
    : null;

  const toggleOp = (o) =>
    setOps((x) => (x.includes(o) ? x.filter((i) => i !== o) : [...x, o]));
  const toggleSel = (id) =>
    setSelected((x) =>
      x.includes(id) ? x.filter((i) => i !== id) : x.length < 3 ? [...x, id] : x
    );

  const chosen = selected
    .map((id) => allPacks.find((p) => p.id === id))
    .filter(Boolean);

  // best pack per metric
  const winner = (m) => {
    if (chosen.length < 2) return null;
    const vals = chosen.map((p) => p[m.key]);
    const target = m.better === "low" ? Math.min(...vals) : Math.max(...vals);
    return chosen.find((p) => p[m.key] === target)?.id;
  };

  // overall verdict: most wins
  const verdict = useMemo(() => {
    if (chosen.length < 2) return null;
    const score = {};
    chosen.forEach((p) => (score[p.id] = 0));
    METRICS.forEach((m) => {
      const w = winner(m);
      if (w) score[w]++;
    });
    const top = chosen.reduce((a, b) => (score[b.id] > score[a.id] ? b : a));
    const cheapestGB = chosen.reduce((a, b) => (b.perGB < a.perGB ? b : a));
    return { top, wins: score[top.id], cheapestGB };
    // eslint-disable-next-line
  }, [chosen]);

  const addPack = () => {
    const dataGB = parseFloat(form.dataGB);
    const validityDays = parseInt(form.validityDays, 10);
    const price = parseFloat(form.price);
    if (!form.name.trim()) return setMsg("❌ Please enter a pack name");
    if (!(dataGB > 0)) return setMsg("❌ Data (GB) must be more than 0");
    if (!(validityDays > 0)) return setMsg("❌ Validity (days) must be more than 0");
    if (!(price > 0)) return setMsg("❌ Price must be more than 0");
    setCustom((c) => [
      ...c,
      {
        id: "c" + Date.now(),
        operator: form.operator,
        name: form.name.trim(),
        dataGB,
        validityDays,
        price,
        custom: true,
      },
    ]);
    setForm({ ...form, name: "", dataGB: "", validityDays: "", price: "" });
    setMsg("✅ Pack added! Find it in the Packs tab.");
  };

  const deleteCustom = (id) => {
    setCustom((c) => c.filter((p) => p.id !== id));
    setSelected((s) => s.filter((i) => i !== id));
  };

  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-4 text-white shadow-lg">
        <div>
          <h1 className="text-xl font-bold">BD Data Packs</h1>
          <p className="text-xs opacity-80">Updated: {LAST_UPDATED}</p>
        </div>
        <button
          onClick={() => setDark(!dark)}
          className="rounded-full bg-white/20 px-4 py-2 text-lg active:scale-95"
        >
          {dark ? "☀️" : "🌙"}
        </button>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {/* ============ PACKS TAB ============ */}
        {tab === "packs" && (
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="🔍 Search packs..."
              className="mb-3 w-full rounded-2xl bg-white px-4 py-3 shadow outline-none dark:bg-slate-800"
            />

            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {OPERATORS.map((o) => (
                <button
                  key={o}
                  onClick={() => toggleOp(o)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
                    ops.includes(o)
                      ? `bg-gradient-to-r ${COLORS[o]} text-white shadow`
                      : "bg-white shadow dark:bg-slate-800"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>

            <div className="mb-3 flex gap-2 overflow-x-auto">
              {[null, ...VALIDITY].map((v) => (
                <button
                  key={v ?? "all"}
                  onClick={() => setValidity(v)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${
                    validity === v
                      ? "bg-indigo-600 text-white"
                      : "bg-white shadow dark:bg-slate-800"
                  }`}
                >
                  {v ? `${v} days` : "All"}
                </button>
              ))}
            </div>

            <div className="mb-4 rounded-2xl bg-white p-4 shadow dark:bg-slate-800">
              <label className="text-sm">Max price: ৳{maxPrice}</label>
              <input
                type="range"
                min="20"
                max="3000"
                step="10"
                value={maxPrice}
                onChange={(e) => setMaxPrice(+e.target.value)}
                className="w-full accent-indigo-600"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={`mt-2 ${inputCls}`}
              >
                <option value="value">Best value (৳/GB)</option>
                <option value="cheap">Cheapest</option>
                <option value="data">Most data</option>
              </select>
            </div>

            <div className="space-y-3">
              {list.map((p) => (
                <div
                  key={p.id}
                  className="relative overflow-hidden rounded-3xl bg-white shadow-md dark:bg-slate-800"
                >
                  <div
                    className={`flex items-center gap-2 bg-gradient-to-r ${COLORS[p.operator]} px-4 py-2 text-sm font-semibold text-white`}
                  >
                    {p.operator}
                    {p.custom && (
                      <span className="rounded-full bg-white/30 px-2 text-xs">My pack</span>
                    )}
                  </div>
                  {p.id === bestId && (
                    <span className="absolute right-3 top-2 rounded-full bg-yellow-300 px-3 py-0.5 text-xs font-bold text-yellow-900">
                      ⭐ Best Value
                    </span>
                  )}
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-2xl font-bold">{p.dataGB} GB</p>
                      <p className="text-sm opacity-70">
                        {p.validityDays} days · ৳{p.perGB.toFixed(1)}/GB · ৳
                        {p.perDay.toFixed(1)}/day
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                        ৳{p.price}
                      </p>
                      <button
                        onClick={() => toggleSel(p.id)}
                        className={`mt-2 rounded-xl px-4 py-2 text-sm active:scale-95 ${
                          selected.includes(p.id)
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-700"
                        }`}
                      >
                        {selected.includes(p.id) ? "✓ Added" : "+ Compare"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!list.length && (
                <p className="py-10 text-center opacity-60">No packs found</p>
              )}
            </div>
            <p className="mt-6 text-center text-xs opacity-60">
              Prices may change. Please confirm with your operator.
            </p>
          </>
        )}

        {/* ============ COMPARE TAB ============ */}
        {tab === "compare" && (
          <>
            <h2 className="mb-3 text-lg font-bold">Compare up to 3 packs</h2>

            {/* picker */}
            <div className="mb-4 rounded-2xl bg-white p-4 shadow dark:bg-slate-800">
              <select
                value=""
                disabled={selected.length >= 3}
                onChange={(e) => e.target.value && toggleSel(e.target.value.startsWith("c") ? e.target.value : +e.target.value)}
                className={inputCls}
              >
                <option value="">
                  {selected.length >= 3 ? "Maximum 3 packs selected" : "➕ Choose a pack to add..."}
                </option>
                {OPERATORS.map((o) => (
                  <optgroup key={o} label={o}>
                    {allPacks
                      .filter((p) => p.operator === o && !selected.includes(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.dataGB}GB · {p.validityDays}d · ৳{p.price}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>

              <div className="mt-3 flex flex-wrap gap-2">
                {chosen.map((p) => (
                  <span
                    key={p.id}
                    className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${COLORS[p.operator]} px-3 py-1 text-sm text-white`}
                  >
                    {p.operator} · {p.name}
                    <button onClick={() => toggleSel(p.id)} className="font-bold">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {chosen.length < 2 ? (
              <p className="py-10 text-center opacity-60">
                Choose at least 2 packs to see the comparison.
              </p>
            ) : (
              <>
                {/* verdict */}
                {verdict && (
                  <div className="mb-4 rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white shadow-lg">
                    <p className="text-sm opacity-80">🏆 Best overall</p>
                    <p className="text-xl font-bold">
                      {verdict.top.operator} · {verdict.top.name}
                    </p>
                    <p className="text-sm opacity-90">
                      Wins {verdict.wins} of {METRICS.length} categories. Lowest cost per GB:{" "}
                      {verdict.cheapestGB.operator} (৳{verdict.cheapestGB.perGB.toFixed(1)}/GB).
                    </p>
                  </div>
                )}

                {/* side-by-side cards */}
                <div
                  className={`mb-4 grid gap-2 ${
                    chosen.length === 3 ? "grid-cols-3" : "grid-cols-2"
                  }`}
                >
                  {chosen.map((p) => (
                    <div
                      key={p.id}
                      className="overflow-hidden rounded-2xl bg-white text-center shadow dark:bg-slate-800"
                    >
                      <div
                        className={`bg-gradient-to-r ${COLORS[p.operator]} px-1 py-2 text-xs font-bold text-white`}
                      >
                        {p.operator}
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs opacity-70">{p.name}</p>
                        <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                          ৳{p.price}
                        </p>
                        <p className="text-sm font-semibold">{p.dataGB} GB</p>
                        <p className="text-xs opacity-70">{p.validityDays} days</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* charts */}
                <div className="space-y-4">
                  {METRICS.map((m) => {
                    const max = Math.max(...chosen.map((p) => p[m.key]));
                    const win = winner(m);
                    return (
                      <div
                        key={m.key}
                        className="rounded-2xl bg-white p-4 shadow dark:bg-slate-800"
                      >
                        <p className="mb-3 text-sm font-bold">
                          {m.label}{" "}
                          <span className="font-normal opacity-60">
                            ({m.better === "low" ? "lower is better" : "higher is better"})
                          </span>
                        </p>
                        <div className="space-y-2">
                          {chosen.map((p) => (
                            <div key={p.id}>
                              <div className="mb-1 flex justify-between text-xs">
                                <span>
                                  {p.operator} {win === p.id && "🏆"}
                                </span>
                                <span className="font-semibold">{m.fmt(p[m.key])}</span>
                              </div>
                              <div className="h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${COLORS[p.operator]}`}
                                  style={{ width: `${Math.max((p[m.key] / max) * 100, 4)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {chosen.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="mt-4 w-full rounded-2xl bg-red-500 py-3 text-white active:scale-95"
              >
                Clear all
              </button>
            )}
          </>
        )}

        {/* ============ ADD TAB ============ */}
        {tab === "add" && (
          <>
            <h2 className="mb-3 text-lg font-bold">Add your own pack</h2>
            <div className="space-y-3 rounded-3xl bg-white p-4 shadow dark:bg-slate-800">
              <div>
                <label className="mb-1 block text-sm">Operator</label>
                <select value={form.operator} onChange={setF("operator")} className={inputCls}>
                  {OPERATORS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Pack name</label>
                <input
                  value={form.name}
                  onChange={setF("name")}
                  placeholder="e.g. Weekend Offer"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-sm">Data (GB)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.dataGB}
                    onChange={setF("dataGB")}
                    placeholder="10"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Days</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.validityDays}
                    onChange={setF("validityDays")}
                    placeholder="30"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Price ৳</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.price}
                    onChange={setF("price")}
                    placeholder="399"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* live preview */}
              {parseFloat(form.dataGB) > 0 &&
                parseFloat(form.price) > 0 &&
                parseInt(form.validityDays, 10) > 0 && (
                  <p className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    ৳{(form.price / form.dataGB).toFixed(1)} per GB · ৳
                    {(form.price / form.validityDays).toFixed(1)} per day
                  </p>
                )}

              <button
                onClick={addPack}
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 font-semibold text-white active:scale-95"
              >
                ➕ Add pack
              </button>
              {msg && <p className="text-center text-sm">{msg}</p>}
            </div>

            <h3 className="mb-2 mt-6 font-bold">My packs ({custom.length})</h3>
            <div className="space-y-2">
              {custom.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-2xl bg-white p-3 shadow dark:bg-slate-800"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {p.operator} · {p.name}
                    </p>
                    <p className="text-xs opacity-70">
                      {p.dataGB} GB · {p.validityDays} days · ৳{p.price}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteCustom(p.id)}
                    className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-600 active:scale-95 dark:bg-red-950"
                  >
                    🗑 Delete
                  </button>
                </div>
              ))}
              {!custom.length && (
                <p className="py-6 text-center text-sm opacity-60">No packs added yet.</p>
              )}
            </div>
          </>
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        {[
          ["packs", "📦", "Packs"],
          ["compare", "⚖️", `Compare (${selected.length})`],
          ["add", "➕", "Add"],
        ].map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-3 text-sm ${
              tab === id ? "font-bold text-indigo-600" : "opacity-60"
            }`}
          >
            <div className="text-xl">{icon}</div>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}