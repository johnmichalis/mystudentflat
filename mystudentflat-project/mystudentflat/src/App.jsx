import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";

// ============================================
// SUPABASE CONFIG - Replace with your credentials
// ============================================
// Find these in: Supabase Dashboard > Settings > API
const SUPABASE_URL = "https://huaiffaepqdmxufbcgga.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWlmZmFlcHFkbXh1ZmJjZ2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzE1OTQsImV4cCI6MjA5MDY0NzU5NH0.1eHbyFWUmm1SxUwAMEO_FA_l0eCBaCWzyQKc0UU3mlk";

// ============================================
// MINIMAL SUPABASE CLIENT (no npm needed)
// ============================================
const supabase = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
  token: null,
  user: null,

  headers() {
    const h = { "apikey": this.key, "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    else h["Authorization"] = `Bearer ${this.key}`;
    return h;
  },

  async query(table, { select = "*", filters = [], order, limit, single = false } = {}) {
    let url = `${this.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    filters.forEach(f => { url += `&${f}`; });
    if (order) url += `&order=${order}`;
    if (limit) url += `&limit=${limit}`;
    const headers = this.headers();
    if (single) headers["Accept"] = "application/vnd.pgrst.object+json";
    else headers["Accept"] = "application/json";
    const res = await fetch(url, { headers });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || res.statusText); }
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(`${this.url}/rest/v1/${table}`, {
      method: "POST", headers: { ...this.headers(), "Prefer": "return=representation" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || res.statusText); }
    return res.json();
  },

  async update(table, id, data, idCol = "id") {
    const res = await fetch(`${this.url}/rest/v1/${table}?${idCol}=eq.${id}`, {
      method: "PATCH", headers: { ...this.headers(), "Prefer": "return=representation" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || res.statusText); }
    return res.json();
  },

  async remove(table, id, idCol = "id") {
    const res = await fetch(`${this.url}/rest/v1/${table}?${idCol}=eq.${id}`, {
      method: "DELETE", headers: this.headers(),
    });
    if (!res.ok) throw new Error(res.statusText);
  },

  async rpc(fn, params = {}) {
    const res = await fetch(`${this.url}/rest/v1/rpc/${fn}`, {
      method: "POST", headers: this.headers(), body: JSON.stringify(params),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || res.statusText); }
    return res.json();
  },

  // Auth
  async signUp(email, password, metadata = {}) {
    const res = await fetch(`${this.url}/auth/v1/signup`, {
      method: "POST",
      headers: { "apikey": this.key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, data: metadata }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || data.msg);
    if (data.access_token) { this.token = data.access_token; this.user = data.user; }
    return data;
  },

  async signIn(email, password) {
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": this.key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.msg);
    this.token = data.access_token;
    this.user = data.user;
    localStorage.setItem("msf_token", data.access_token);
    localStorage.setItem("msf_refresh", data.refresh_token);
    localStorage.setItem("msf_user", JSON.stringify(data.user));
    return data;
  },

  async refreshSession() {
    const refresh = localStorage.getItem("msf_refresh");
    if (!refresh) return null;
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "apikey": this.key, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    const data = await res.json();
    if (data.error) { this.signOut(); return null; }
    this.token = data.access_token;
    this.user = data.user;
    localStorage.setItem("msf_token", data.access_token);
    localStorage.setItem("msf_refresh", data.refresh_token);
    localStorage.setItem("msf_user", JSON.stringify(data.user));
    return data;
  },

  signOut() {
    this.token = null; this.user = null;
    localStorage.removeItem("msf_token");
    localStorage.removeItem("msf_refresh");
    localStorage.removeItem("msf_user");
  },

  restoreSession() {
    const token = localStorage.getItem("msf_token");
    const user = localStorage.getItem("msf_user");
    if (token && user) {
      this.token = token;
      this.user = JSON.parse(user);
      return true;
    }
    return false;
  },

  storageUrl(bucket, path) {
    return `${this.url}/storage/v1/object/public/${bucket}/${path}`;
  }
};

// ============================================
// CONTEXT
// ============================================
const AppContext = createContext();

// ============================================
// DEMO MODE (works without Supabase connected)
// ============================================
const DEMO_CITIES = [
  { id: 1, name: "Nicosia", country: "Cyprus", slug: "nicosia", is_active: true },
  { id: 2, name: "Limassol", country: "Cyprus", slug: "limassol", is_active: true },
  { id: 3, name: "Athens", country: "Greece", slug: "athens", is_active: true },
  { id: 4, name: "Paphos", country: "Cyprus", slug: "paphos", is_active: false },
  { id: 5, name: "Thessaloniki", country: "Greece", slug: "thessaloniki", is_active: false },
];

const DEMO_FLATS = [
  { id: 1, title: "Filokyprou / Flat 202", slug: "filokyprou-flat-202", description: "Modern fully furnished studio apartment, bright and spacious with a large balcony.", address: "Filokyprou 202, Nicosia", city_id: 1, price_per_month: 900, bedrooms: 1, bathrooms: 1, sqm: 45, floor: 2, has_balcony: true, is_furnished: true, amenities: ["WiFi","AC","Washing Machine","Balcony","Elevator"], status: "available", available_lease_durations: ["12","24"], earliest_move_in: "2026-05-01", distance_to_university: "5 min walk", is_featured: true, view_count: 142, cover_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop", cities: { name: "Nicosia", country: "Cyprus" } },
  { id: 2, title: "Averof I", slug: "averof-i", description: "Beautifully designed apartment in the heart of Athens, close to public transport.", address: "Averof 2, Athens 10433", city_id: 3, price_per_month: 780, bedrooms: 1, bathrooms: 1, sqm: 38, floor: 1, has_balcony: false, is_furnished: true, amenities: ["WiFi","AC","Washing Machine","Heating"], status: "available", available_lease_durations: ["12","24"], earliest_move_in: "2026-05-01", distance_to_university: "10 min walk", is_featured: true, view_count: 98, cover_url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop", cities: { name: "Athens", country: "Greece" } },
  { id: 3, title: "Averof II", slug: "averof-ii", description: "Cozy studio apartment, perfect for students. Fully equipped kitchen.", address: "Averof 2, Athens 10433", city_id: 3, price_per_month: 750, bedrooms: 1, bathrooms: 1, sqm: 35, floor: 3, has_balcony: true, is_furnished: true, amenities: ["WiFi","AC","Washing Machine","Balcony"], status: "available", available_lease_durations: ["12","24"], earliest_move_in: "2026-06-01", distance_to_university: "10 min walk", is_featured: false, view_count: 67, cover_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop", cities: { name: "Athens", country: "Greece" } },
  { id: 4, title: "Lerou I", slug: "lerou-i", description: "Spacious two-bedroom apartment in Kipseli, ideal for sharing.", address: "Lerou 5, Kipseli 11364, Athens", city_id: 3, price_per_month: 780, bedrooms: 2, bathrooms: 1, sqm: 52, floor: 2, has_balcony: true, is_furnished: true, amenities: ["WiFi","AC","Washing Machine","Balcony","Dishwasher"], status: "available", available_lease_durations: ["12","24"], earliest_move_in: "2026-05-01", distance_to_university: "15 min by metro", is_featured: true, view_count: 115, cover_url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop", cities: { name: "Athens", country: "Greece" } },
  { id: 5, title: "Marathonos / Flat 206", slug: "marathonos-flat-206", description: "Premium apartment in Engomi, walking distance to University of Nicosia.", address: "Marathonos 25, Engomi, Nicosia", city_id: 1, price_per_month: 980, bedrooms: 2, bathrooms: 1, sqm: 58, floor: 2, has_balcony: true, is_furnished: true, amenities: ["WiFi","AC","Washing Machine","Balcony","Parking","Elevator","Dishwasher"], status: "available", available_lease_durations: ["12","24"], earliest_move_in: "2026-05-01", distance_to_university: "3 min walk", is_featured: true, view_count: 203, cover_url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop", cities: { name: "Nicosia", country: "Cyprus" } },
  { id: 6, title: "Lerou II", slug: "lerou-ii", description: "Bright one-bedroom flat in a quiet neighborhood, close to nightlife and campus.", address: "Lerou 5, Kipseli 11364, Athens", city_id: 3, price_per_month: 750, bedrooms: 1, bathrooms: 1, sqm: 34, floor: 4, has_balcony: false, is_furnished: true, amenities: ["WiFi","AC","Washing Machine","Heating"], status: "available", available_lease_durations: ["12"], earliest_move_in: "2026-06-01", distance_to_university: "15 min by metro", is_featured: false, view_count: 54, cover_url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop", cities: { name: "Athens", country: "Greece" } },
];

// ============================================
// STYLES
// ============================================
const font = "'DM Sans', sans-serif";
const fontSerif = "'DM Serif Display', serif";
const colors = {
  bg: "#fffcf7", dark: "#1a1a2e", coral: "#f4845f", gold: "#f4d35e",
  text: "#3a3a4a", muted: "#8a8a9a", light: "#f8f5f0", green: "#22c55e",
  border: "rgba(26,26,46,0.08)", white: "#ffffff",
};

const btn = (primary = true) => ({
  padding: "12px 28px", borderRadius: 100, border: primary ? "none" : `2px solid ${colors.border}`,
  background: primary ? colors.dark : "transparent", color: primary ? colors.bg : colors.dark,
  fontSize: 14, fontFamily: font, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
});

// ============================================
// HOOKS
// ============================================
function useOnScreen(ref, threshold = 0.12) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return v;
}

function FadeIn({ children, delay = 0, className = "", style = {} }) {
  const ref = useRef();
  const v = useOnScreen(ref);
  return (
    <div ref={ref} className={className} style={{ ...style, opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(28px)", transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s` }}>
      {children}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================
function Tag({ children, color = colors.green, bg = "rgba(34,197,94,0.1)" }) {
  return <span style={{ padding: "4px 12px", borderRadius: 100, background: bg, color, fontSize: 12, fontFamily: font, fontWeight: 600 }}>{children}</span>;
}

function AmenityPill({ name }) {
  const icons = { WiFi: "📶", AC: "❄️", "Washing Machine": "🧺", Balcony: "🌅", Elevator: "🛗", Parking: "🅿️", Dishwasher: "🍽️", Heating: "🔥" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 100, background: colors.light, fontSize: 13, fontFamily: font, color: colors.text }}>
      <span>{icons[name] || "✓"}</span> {name}
    </span>
  );
}

// ============================================
// AUTH MODAL
// ============================================
function AuthModal({ onClose }) {
  const { setUser, setProfile, isDemo } = useContext(AppContext);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    if (isDemo) {
      setUser({ id: "demo-user", email }); 
      setProfile({ id: "demo-user", email, full_name: name || "Demo User", role: "admin" });
      onClose(); setLoading(false); return;
    }
    try {
      if (mode === "login") {
        const data = await supabase.signIn(email, password);
        setUser(data.user);
        const profile = await supabase.query("profiles", { filters: [`id=eq.${data.user.id}`], single: true });
        setProfile(profile);
        onClose();
      } else {
        await supabase.signUp(email, password, { full_name: name, role: "student" });
        setSuccess(true);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(26,26,46,0.5)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "white", borderRadius: 24, padding: 40, maxWidth: 420, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: colors.muted }}>✕</button>
        
        {success ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <h3 style={{ fontFamily: fontSerif, fontSize: 24, color: colors.dark, marginBottom: 8 }}>Check your email!</h3>
            <p style={{ fontFamily: font, fontSize: 15, color: colors.muted, lineHeight: 1.6 }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily: fontSerif, fontSize: 28, color: colors.dark, margin: "0 0 8px" }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h3>
            <p style={{ fontFamily: font, fontSize: 14, color: colors.muted, margin: "0 0 28px" }}>
              {mode === "login" ? "Sign in to your account" : "Join MyStudentFlat today"}
            </p>
            {isDemo && <div style={{ padding: "10px 14px", borderRadius: 12, background: "#fef3c7", marginBottom: 16, fontSize: 13, fontFamily: font, color: "#92400e" }}>Demo mode — enter any email to explore the app</div>}
            {error && <div style={{ padding: "10px 14px", borderRadius: 12, background: "#fef2f2", marginBottom: 16, fontSize: 13, fontFamily: font, color: "#dc2626" }}>{error}</div>}
            
            {mode === "signup" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleSubmit} disabled={loading} style={{ ...btn(), width: "100%", padding: "14px", fontSize: 16, opacity: loading ? 0.6 : 1 }}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
            <p style={{ textAlign: "center", marginTop: 20, fontFamily: font, fontSize: 14, color: colors.muted }}>
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} style={{ color: colors.coral, cursor: "pointer", fontWeight: 600 }}>
                {mode === "login" ? "Sign up" : "Sign in"}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// NAVBAR
// ============================================
function Navbar() {
  const { user, profile, navigate, setUser, setProfile } = useContext(AppContext);
  const [scrolled, setScrolled] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const handleSignOut = () => { supabase.signOut(); setUser(null); setProfile(null); navigate("home"); };

  return (
    <>
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? "rgba(255,252,247,0.94)" : "rgba(255,252,247,0.8)", backdropFilter: "blur(16px)", borderBottom: scrolled ? `1px solid ${colors.border}` : "none", transition: "all 0.3s", padding: scrolled ? "10px 0" : "16px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div onClick={() => navigate("home")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${colors.dark}, #16213e)`, display: "flex", alignItems: "center", justifyContent: "center", color: colors.gold, fontWeight: 800, fontSize: 15, fontFamily: fontSerif }}>m</div>
            <span style={{ fontFamily: fontSerif, fontSize: 17, color: colors.dark }}>MyStudentFlat</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }} className="nav-desktop">
            <a onClick={() => navigate("listings")} style={{ textDecoration: "none", color: colors.text, fontSize: 14, fontFamily: font, fontWeight: 500, cursor: "pointer" }}>Find a Flat</a>
            {profile?.role === "admin" && <a onClick={() => navigate("admin")} style={{ textDecoration: "none", color: colors.coral, fontSize: 14, fontFamily: font, fontWeight: 600, cursor: "pointer" }}>Admin Panel</a>}
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: colors.coral, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontFamily: font, fontWeight: 700, fontSize: 14 }}>
                  {(profile?.full_name || user.email)?.[0]?.toUpperCase() || "U"}
                </div>
                <button onClick={handleSignOut} style={{ ...btn(false), padding: "8px 18px", fontSize: 13 }}>Sign Out</button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{ ...btn(), padding: "10px 24px" }}>Sign In</button>
            )}
          </div>
          <button className="nav-mobile-btn" onClick={() => setMenuOpen(!menuOpen)} style={{ display: "none", background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>{menuOpen ? "✕" : "☰"}</button>
        </div>
        {menuOpen && (
          <div style={{ padding: "12px 24px 20px", background: "rgba(255,252,247,0.98)" }}>
            <a onClick={() => { navigate("listings"); setMenuOpen(false); }} style={{ display: "block", padding: "10px 0", fontSize: 15, fontFamily: font, color: colors.text, cursor: "pointer" }}>Find a Flat</a>
            {profile?.role === "admin" && <a onClick={() => { navigate("admin"); setMenuOpen(false); }} style={{ display: "block", padding: "10px 0", fontSize: 15, fontFamily: font, color: colors.coral, cursor: "pointer" }}>Admin Panel</a>}
            {user ? <button onClick={handleSignOut} style={{ ...btn(false), width: "100%", marginTop: 8 }}>Sign Out</button>
              : <button onClick={() => { setShowAuth(true); setMenuOpen(false); }} style={{ ...btn(), width: "100%", marginTop: 8 }}>Sign In</button>}
          </div>
        )}
      </nav>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}

// ============================================
// HOME PAGE
// ============================================
function HomePage() {
  const { navigate, cities } = useContext(AppContext);
  const [cityIdx, setCityIdx] = useState(0);
  const cityNames = ["Nicosia", "Athens", "Limassol"];
  useEffect(() => { const t = setInterval(() => setCityIdx(i => (i + 1) % cityNames.length), 2800); return () => clearInterval(t); }, []);

  const STEPS = [
    { n: "01", t: "Browse", d: "Explore verified flats by city, price, and proximity to your university.", i: "🔍" },
    { n: "02", t: "Book", d: "Select your lease duration and move-in date to secure your flat.", i: "📋" },
    { n: "03", t: "E-Sign", d: "Review and digitally sign your rental agreement from anywhere.", i: "✍️" },
    { n: "04", t: "Move In", d: "Grab the keys and enjoy your new home.", i: "🔑" },
  ];

  const REVIEWS = [
    { name: "Iasonas S.", text: "Made finding a flat near my university so much easier. They even offer cleaning services!", r: 5 },
    { name: "Sofia N.", text: "The flat was exactly as described. Booking and signing was seamless. The starter pack was great!", r: 5 },
    { name: "Nasri", text: "Beautifully decorated and fully equipped. My move was completely trouble-free.", r: 5 },
  ];

  return (
    <div>
      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", background: "linear-gradient(165deg, #fffcf7 0%, #fef3e2 40%, #fde8d0 100%)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, right: -60, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(244,132,95,0.1) 0%, transparent 70%)" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "140px 24px 80px", width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }} className="hero-grid">
          <div>
            <FadeIn>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 100, background: "rgba(26,26,46,0.05)", marginBottom: 20 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: colors.green }} />
                <span style={{ fontSize: 13, fontFamily: font, fontWeight: 500, color: colors.text }}>Now in 3 cities</span>
              </div>
            </FadeIn>
            <FadeIn delay={0.08}>
              <h1 style={{ fontFamily: fontSerif, fontSize: "clamp(38px, 5vw, 64px)", lineHeight: 1.08, color: colors.dark, margin: "0 0 6px", letterSpacing: "-0.03em" }}>Your New Home</h1>
            </FadeIn>
            <FadeIn delay={0.12}>
              <h1 style={{ fontFamily: fontSerif, fontSize: "clamp(38px, 5vw, 64px)", lineHeight: 1.08, margin: "0 0 24px", letterSpacing: "-0.03em" }}>
                <span style={{ color: colors.dark }}>in </span>
                <span style={{ color: colors.coral }}>{cityNames[cityIdx]}</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.16}>
              <p style={{ fontFamily: font, fontSize: 17, lineHeight: 1.65, color: "#5a5a6a", maxWidth: 460, margin: "0 0 32px" }}>
                Browse verified student flats near your university. Choose your lease, sign online, and move in stress-free.
              </p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={() => navigate("listings")} style={{ ...btn(), padding: "16px 36px", fontSize: 16, boxShadow: "0 4px 20px rgba(26,26,46,0.18)" }}>Browse Flats →</button>
                <button style={{ ...btn(false), padding: "16px 36px", fontSize: 16 }}>I'm a Landlord</button>
              </div>
            </FadeIn>
            <FadeIn delay={0.25}>
              <div style={{ display: "flex", gap: 32, marginTop: 44, paddingTop: 28, borderTop: `1px solid ${colors.border}` }}>
                {[["250+", "Tenants"], ["3", "Cities"], ["100%", "Online"]].map(([n, l]) => (
                  <div key={l}><div style={{ fontFamily: fontSerif, fontSize: 26, color: colors.dark }}>{n}</div><div style={{ fontFamily: font, fontSize: 12, color: colors.muted, marginTop: 2 }}>{l}</div></div>
                ))}
              </div>
            </FadeIn>
          </div>
          <FadeIn delay={0.1} className="hero-img">
            <div style={{ borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(26,26,46,0.12)", aspectRatio: "4/5", position: "relative" }}>
              <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=700&h=875&fit=crop" alt="Modern flat" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(26,26,46,0.45) 100%)" }} />
              <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, background: "rgba(255,255,255,0.93)", backdropFilter: "blur(12px)", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontFamily: font, fontWeight: 600, fontSize: 14, color: colors.dark }}>Filokyprou 202</div><div style={{ fontFamily: font, fontSize: 12, color: colors.muted }}>Nicosia, Cyprus</div></div>
                <div style={{ fontFamily: fontSerif, fontSize: 20, color: colors.coral }}>€900<span style={{ fontSize: 12, color: colors.muted, fontFamily: font }}>/mo</span></div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "90px 24px", background: colors.bg }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn><div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.coral, textTransform: "uppercase", letterSpacing: "0.12em" }}>How It Works</span>
            <h2 style={{ fontFamily: fontSerif, fontSize: "clamp(30px, 3.5vw, 44px)", color: colors.dark, margin: "10px 0 0" }}>Four steps to your new home</h2>
          </div></FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 20 }}>
            {STEPS.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.08}>
                <div style={{ padding: 28, borderRadius: 18, background: "white", border: `1px solid ${colors.border}`, transition: "all 0.3s", cursor: "default", height: "100%" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(26,26,46,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <div style={{ fontSize: 32, marginBottom: 14 }}>{s.i}</div>
                  <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: colors.coral, letterSpacing: "0.1em", marginBottom: 6 }}>STEP {s.n}</div>
                  <h3 style={{ fontFamily: fontSerif, fontSize: 22, color: colors.dark, margin: "0 0 8px" }}>{s.t}</h3>
                  <p style={{ fontFamily: font, fontSize: 14, lineHeight: 1.6, color: "#6a6a7a", margin: 0 }}>{s.d}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CITIES */}
      <section style={{ padding: "90px 24px", background: colors.dark }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn><div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.gold, textTransform: "uppercase", letterSpacing: "0.12em" }}>Our Cities</span>
            <h2 style={{ fontFamily: fontSerif, fontSize: "clamp(30px, 3.5vw, 44px)", color: "white", margin: "10px 0 0" }}>Choose your destination</h2>
          </div></FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            {cities.map((c, i) => (
              <FadeIn key={c.id} delay={i * 0.06}>
                <div onClick={() => c.is_active && navigate("listings", { city: c.id })} style={{ padding: 24, borderRadius: 18, background: c.is_active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: c.is_active ? "pointer" : "default", transition: "all 0.3s", opacity: c.is_active ? 1 : 0.45 }}
                  onMouseEnter={e => { if (c.is_active) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={e => { if (c.is_active) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                >
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{c.country === "Cyprus" ? "🇨🇾" : "🇬🇷"}</div>
                  <h3 style={{ fontFamily: fontSerif, fontSize: 20, color: "white", margin: "0 0 4px" }}>{c.name}</h3>
                  <p style={{ fontFamily: font, fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>{c.is_active ? "View flats →" : "Coming Soon"}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section style={{ padding: "90px 24px", background: colors.bg }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn><div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.coral, textTransform: "uppercase", letterSpacing: "0.12em" }}>Testimonials</span>
            <h2 style={{ fontFamily: fontSerif, fontSize: "clamp(30px, 3.5vw, 44px)", color: colors.dark, margin: "10px 0 0" }}>What our tenants say</h2>
          </div></FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {REVIEWS.map((r, i) => (
              <FadeIn key={r.name} delay={i * 0.08}>
                <div style={{ padding: 28, borderRadius: 18, background: "white", border: `1px solid ${colors.border}` }}>
                  <div style={{ color: colors.gold, fontSize: 16, marginBottom: 12 }}>★★★★★</div>
                  <p style={{ fontFamily: font, fontSize: 14, lineHeight: 1.7, color: "#4a4a5a", margin: "0 0 16px" }}>"{r.text}"</p>
                  <div style={{ fontFamily: font, fontWeight: 600, fontSize: 14, color: colors.dark }}>{r.name}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "90px 24px", background: "linear-gradient(135deg, #fef3e2, #fde8d0)" }}>
        <FadeIn><div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: fontSerif, fontSize: "clamp(30px, 4vw, 48px)", color: colors.dark, margin: "0 0 14px", lineHeight: 1.15 }}>Ready to find your new home?</h2>
          <p style={{ fontFamily: font, fontSize: 17, color: "#5a5a6a", margin: "0 0 32px" }}>Join hundreds of students who found their perfect flat.</p>
          <button onClick={() => navigate("listings")} style={{ ...btn(), padding: "16px 40px", fontSize: 16, boxShadow: "0 4px 20px rgba(26,26,46,0.18)" }}>Browse Flats Now</button>
        </div></FadeIn>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "48px 24px 28px", background: colors.dark }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(244,211,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: colors.gold, fontWeight: 800, fontSize: 13, fontFamily: fontSerif }}>m</div>
            <span style={{ fontFamily: fontSerif, fontSize: 15, color: "white" }}>MyStudentFlat</span>
          </div>
          <span style={{ fontFamily: font, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>© 2025 MyStudentFlat. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// LISTINGS PAGE
// ============================================
function ListingsPage({ initialCity }) {
  const { flats, cities, navigate } = useContext(AppContext);
  const [cityFilter, setCityFilter] = useState(initialCity || "all");
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [bedFilter, setBedFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = flats.filter(f => {
    if (cityFilter !== "all" && f.city_id !== cityFilter) return false;
    if (f.price_per_month < priceRange[0] || f.price_per_month > priceRange[1]) return false;
    if (bedFilter !== "all" && f.bedrooms !== parseInt(bedFilter)) return false;
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && !f.address.toLowerCase().includes(search.toLowerCase())) return false;
    return f.status === "available";
  });

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", background: colors.bg }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        <FadeIn>
          <h1 style={{ fontFamily: fontSerif, fontSize: "clamp(28px, 3.5vw, 40px)", color: colors.dark, margin: "0 0 8px" }}>Find Your Flat</h1>
          <p style={{ fontFamily: font, fontSize: 16, color: colors.muted, margin: "0 0 32px" }}>Browse all available student apartments</p>
        </FadeIn>

        {/* Filters */}
        <FadeIn delay={0.08}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32, padding: 20, borderRadius: 18, background: "white", border: `1px solid ${colors.border}` }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flats..." style={{ flex: "1 1 200px", padding: "10px 16px", borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 14, outline: "none" }} />
            <select value={cityFilter} onChange={e => setCityFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))} style={{ padding: "10px 16px", borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 14, outline: "none", background: "white", cursor: "pointer" }}>
              <option value="all">All Cities</option>
              {cities.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={bedFilter} onChange={e => setBedFilter(e.target.value)} style={{ padding: "10px 16px", borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 14, outline: "none", background: "white", cursor: "pointer" }}>
              <option value="all">Any Beds</option>
              <option value="1">1 Bedroom</option>
              <option value="2">2 Bedrooms</option>
            </select>
            <select value={`${priceRange[0]}-${priceRange[1]}`} onChange={e => { const [a, b] = e.target.value.split("-").map(Number); setPriceRange([a, b]); }} style={{ padding: "10px 16px", borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 14, outline: "none", background: "white", cursor: "pointer" }}>
              <option value="0-2000">Any Price</option>
              <option value="0-800">Under €800</option>
              <option value="800-1000">€800 – €1000</option>
              <option value="1000-2000">Over €1000</option>
            </select>
          </div>
        </FadeIn>

        <p style={{ fontFamily: font, fontSize: 14, color: colors.muted, marginBottom: 20 }}>{filtered.length} flat{filtered.length !== 1 ? "s" : ""} found</p>

        {/* Results */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }} className="listings-grid">
          {filtered.map((f, i) => (
            <FadeIn key={f.id} delay={i * 0.05}>
              <div onClick={() => navigate("flat", { id: f.id })} style={{ borderRadius: 18, overflow: "hidden", background: "white", border: `1px solid ${colors.border}`, cursor: "pointer", transition: "all 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(26,26,46,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden" }}>
                  <img src={f.cover_url} alt={f.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }}
                    onMouseEnter={e => e.target.style.transform = "scale(1.04)"}
                    onMouseLeave={e => e.target.style.transform = ""}
                  />
                  <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 6 }}>
                    <Tag>Available</Tag>
                    {f.is_featured && <Tag color={colors.dark} bg="rgba(255,255,255,0.9)">Featured</Tag>}
                  </div>
                </div>
                <div style={{ padding: "18px 22px 22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontFamily: fontSerif, fontSize: 18, color: colors.dark, margin: 0 }}>{f.title}</h3>
                      <p style={{ fontFamily: font, fontSize: 13, color: colors.muted, margin: "3px 0 0" }}>{f.cities?.name || "—"}, {f.cities?.country || "—"}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: fontSerif, fontSize: 22, color: colors.coral }}>€{f.price_per_month}</div>
                      <div style={{ fontFamily: font, fontSize: 11, color: colors.muted }}>/month</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${colors.border}` }}>
                    <span style={{ fontFamily: font, fontSize: 13, color: "#6a6a7a" }}>🛏 {f.bedrooms}BR</span>
                    <span style={{ fontFamily: font, fontSize: 13, color: "#6a6a7a" }}>📐 {f.sqm}m²</span>
                    <span style={{ fontFamily: font, fontSize: 13, color: "#6a6a7a" }}>📍 {f.distance_to_university}</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
            <p style={{ fontFamily: font, fontSize: 16, color: colors.muted }}>No flats match your filters. Try adjusting your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// FLAT DETAIL PAGE
// ============================================
function FlatDetailPage({ flatId }) {
  const { flats, user, navigate, isDemo } = useContext(AppContext);
  const [showAuth, setShowAuth] = useState(false);
  const [leaseDuration, setLeaseDuration] = useState("12");
  const [moveInDate, setMoveInDate] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const flat = flats.find(f => f.id === flatId);

  if (!flat) return <div style={{ paddingTop: 120, textAlign: "center" }}><p>Flat not found</p></div>;

  const moveOutDate = moveInDate ? (() => {
    const d = new Date(moveInDate);
    d.setMonth(d.getMonth() + parseInt(leaseDuration));
    return d.toISOString().split("T")[0];
  })() : null;

  const totalCost = flat.price_per_month * parseInt(leaseDuration);

  const handleBook = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!moveInDate) { alert("Please select a move-in date"); return; }
    if (!isDemo) {
      try {
        await supabase.insert("bookings", {
          flat_id: flat.id, tenant_id: user.id, lease_duration: leaseDuration,
          move_in_date: moveInDate, move_out_date: moveOutDate, monthly_rent: flat.price_per_month,
          status: "pending",
        });
      } catch (e) { alert("Booking failed: " + e.message); return; }
    }
    setBookingSuccess(true);
  };

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", background: colors.bg }}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <button onClick={() => navigate("listings")} style={{ background: "none", border: "none", fontFamily: font, fontSize: 14, color: colors.muted, cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>← Back to listings</button>

        {bookingSuccess ? (
          <FadeIn>
            <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center", padding: 40, background: "white", borderRadius: 24, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontFamily: fontSerif, fontSize: 32, color: colors.dark, margin: "0 0 12px" }}>Booking Submitted!</h2>
              <p style={{ fontFamily: font, fontSize: 16, color: colors.muted, lineHeight: 1.6, margin: "0 0 8px" }}>Your booking for <strong>{flat.title}</strong> is pending confirmation.</p>
              <p style={{ fontFamily: font, fontSize: 14, color: colors.muted }}>Lease: {leaseDuration} months · Move in: {moveInDate} · €{flat.price_per_month}/mo</p>
              <button onClick={() => navigate("listings")} style={{ ...btn(), marginTop: 28 }}>Browse More Flats</button>
            </div>
          </FadeIn>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32, alignItems: "start" }} className="detail-grid">
            {/* Left: info */}
            <div>
              <FadeIn>
                <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 24, aspectRatio: "16/9" }}>
                  <img src={flat.cover_url} alt={flat.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              </FadeIn>
              <FadeIn delay={0.08}>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <Tag>Available</Tag>
                  {flat.is_featured && <Tag color={colors.dark} bg="rgba(26,26,46,0.06)">Featured</Tag>}
                </div>
                <h1 style={{ fontFamily: fontSerif, fontSize: 32, color: colors.dark, margin: "0 0 6px" }}>{flat.title}</h1>
                <p style={{ fontFamily: font, fontSize: 15, color: colors.muted, margin: "0 0 20px" }}>{flat.address}</p>
                <p style={{ fontFamily: font, fontSize: 15, lineHeight: 1.7, color: colors.text, margin: "0 0 28px" }}>{flat.description}</p>
              </FadeIn>

              <FadeIn delay={0.12}>
                <h3 style={{ fontFamily: fontSerif, fontSize: 20, color: colors.dark, marginBottom: 14 }}>Details</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
                  {[
                    ["🛏", "Bedrooms", flat.bedrooms],
                    ["🚿", "Bathrooms", flat.bathrooms],
                    ["📐", "Area", `${flat.sqm} m²`],
                    ["🏢", "Floor", flat.floor],
                    ["🌅", "Balcony", flat.has_balcony ? "Yes" : "No"],
                    ["📍", "University", flat.distance_to_university],
                  ].map(([icon, label, val]) => (
                    <div key={label} style={{ padding: "14px 18px", borderRadius: 14, background: "white", border: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{icon}</span>
                      <div><div style={{ fontFamily: font, fontSize: 12, color: colors.muted }}>{label}</div><div style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: colors.dark }}>{val}</div></div>
                    </div>
                  ))}
                </div>
              </FadeIn>

              <FadeIn delay={0.16}>
                <h3 style={{ fontFamily: fontSerif, fontSize: 20, color: colors.dark, marginBottom: 14 }}>Amenities</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                  {flat.amenities?.map(a => <AmenityPill key={a} name={a} />)}
                </div>
              </FadeIn>
            </div>

            {/* Right: booking card */}
            <FadeIn delay={0.1}>
              <div style={{ position: "sticky", top: 100, padding: 28, borderRadius: 22, background: "white", border: `1px solid ${colors.border}`, boxShadow: "0 8px 32px rgba(26,26,46,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
                  <div><span style={{ fontFamily: fontSerif, fontSize: 32, color: colors.coral }}>€{flat.price_per_month}</span><span style={{ fontFamily: font, fontSize: 14, color: colors.muted }}>/month</span></div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 8 }}>Lease Duration</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {flat.available_lease_durations?.map(d => (
                      <button key={d} onClick={() => setLeaseDuration(d)} style={{
                        flex: 1, padding: "12px", borderRadius: 12, border: `2px solid ${leaseDuration === d ? colors.dark : colors.border}`,
                        background: leaseDuration === d ? colors.dark : "white", color: leaseDuration === d ? "white" : colors.text,
                        fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                      }}>{d} months</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 8 }}>Move-in Date</label>
                  <input type="date" value={moveInDate} min={flat.earliest_move_in || new Date().toISOString().split("T")[0]}
                    onChange={e => setMoveInDate(e.target.value)}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                {moveInDate && (
                  <div style={{ padding: 16, borderRadius: 14, background: colors.light, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontFamily: font, fontSize: 13, color: colors.muted }}>Move-out date</span>
                      <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.dark }}>{moveOutDate}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: font, fontSize: 13, color: colors.muted }}>Total ({leaseDuration} mo)</span>
                      <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.dark }}>€{totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <button onClick={handleBook} style={{ ...btn(), width: "100%", padding: "16px", fontSize: 16 }}>
                  {user ? "Book This Flat" : "Sign In to Book"}
                </button>
                <p style={{ textAlign: "center", fontFamily: font, fontSize: 12, color: colors.muted, marginTop: 12 }}>No payment required now. We'll confirm availability first.</p>
              </div>
            </FadeIn>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// ADMIN PANEL
// ============================================
function AdminPage() {
  const { flats, cities, profile, navigate, setFlats, isDemo } = useContext(AppContext);
  const [tab, setTab] = useState("flats");
  const [editFlat, setEditFlat] = useState(null);
  const [formData, setFormData] = useState({});

  if (profile?.role !== "admin") return (
    <div style={{ paddingTop: 140, textAlign: "center" }}>
      <h2 style={{ fontFamily: fontSerif, fontSize: 28, color: colors.dark }}>Access Denied</h2>
      <p style={{ fontFamily: font, color: colors.muted }}>You need admin privileges to access this page.</p>
    </div>
  );

  const startEdit = (flat) => {
    setEditFlat(flat.id);
    setFormData({ title: flat.title, price_per_month: flat.price_per_month, status: flat.status, bedrooms: flat.bedrooms, sqm: flat.sqm, description: flat.description, address: flat.address, city_id: flat.city_id });
  };

  const saveEdit = async () => {
    if (!isDemo) {
      try { await supabase.update("flats", editFlat, formData); } catch (e) { alert("Save failed: " + e.message); return; }
    }
    setFlats(prev => prev.map(f => f.id === editFlat ? { ...f, ...formData } : f));
    setEditFlat(null);
  };

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", background: colors.light }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <FadeIn>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: fontSerif, fontSize: 32, color: colors.dark, margin: 0 }}>Admin Panel</h1>
              <p style={{ fontFamily: font, fontSize: 14, color: colors.muted, marginTop: 4 }}>Manage your listings and bookings</p>
            </div>
          </div>
        </FadeIn>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {["flats", "bookings"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 24px", borderRadius: 100, border: `1px solid ${tab === t ? colors.dark : colors.border}`,
              background: tab === t ? colors.dark : "white", color: tab === t ? "white" : colors.text,
              fontFamily: font, fontSize: 14, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
            }}>{t}</button>
          ))}
        </div>

        {tab === "flats" && (
          <div style={{ background: "white", borderRadius: 20, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font, fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                    {["Flat", "City", "Price", "Beds", "Status", "Views", "Actions"].map(h => (
                      <th key={h} style={{ padding: "14px 18px", textAlign: "left", fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flats.map(f => (
                    <tr key={f.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      {editFlat === f.id ? (
                        <>
                          <td style={{ padding: "12px 18px" }}><input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={{ width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 13 }} /></td>
                          <td style={{ padding: "12px 18px" }}>
                            <select value={formData.city_id} onChange={e => setFormData({ ...formData, city_id: parseInt(e.target.value) })} style={{ padding: 8, borderRadius: 8, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 13 }}>
                              {cities.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "12px 18px" }}><input type="number" value={formData.price_per_month} onChange={e => setFormData({ ...formData, price_per_month: parseFloat(e.target.value) })} style={{ width: 80, padding: 8, borderRadius: 8, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 13 }} /></td>
                          <td style={{ padding: "12px 18px" }}><input type="number" value={formData.bedrooms} onChange={e => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })} style={{ width: 50, padding: 8, borderRadius: 8, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 13 }} /></td>
                          <td style={{ padding: "12px 18px" }}>
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} style={{ padding: 8, borderRadius: 8, border: `1px solid ${colors.border}`, fontFamily: font, fontSize: 13 }}>
                              {["available", "reserved", "occupied", "maintenance"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "12px 18px", color: colors.muted }}>{f.view_count}</td>
                          <td style={{ padding: "12px 18px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={saveEdit} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: colors.green, color: "white", fontFamily: font, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                              <button onClick={() => setEditFlat(null)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${colors.border}`, background: "white", color: colors.text, fontFamily: font, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: "14px 18px", fontWeight: 600, color: colors.dark }}>{f.title}</td>
                          <td style={{ padding: "14px 18px", color: colors.text }}>{f.cities?.name || cities.find(c => c.id === f.city_id)?.name}</td>
                          <td style={{ padding: "14px 18px", color: colors.coral, fontWeight: 600 }}>€{f.price_per_month}</td>
                          <td style={{ padding: "14px 18px" }}>{f.bedrooms}</td>
                          <td style={{ padding: "14px 18px" }}>
                            <span style={{ padding: "4px 10px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                              background: f.status === "available" ? "rgba(34,197,94,0.1)" : f.status === "reserved" ? "rgba(244,211,94,0.2)" : "rgba(0,0,0,0.05)",
                              color: f.status === "available" ? colors.green : f.status === "reserved" ? "#b45309" : colors.muted,
                            }}>{f.status}</span>
                          </td>
                          <td style={{ padding: "14px 18px", color: colors.muted }}>{f.view_count}</td>
                          <td style={{ padding: "14px 18px" }}>
                            <button onClick={() => startEdit(f)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${colors.border}`, background: "white", fontFamily: font, fontSize: 12, cursor: "pointer", color: colors.text }}>Edit</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div style={{ padding: 40, textAlign: "center", background: "white", borderRadius: 20, border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ fontFamily: font, color: colors.muted }}>Bookings will appear here when students start booking flats.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [page, setPage] = useState("home");
  const [pageParams, setPageParams] = useState({});
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [flats, setFlats] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDemo = SUPABASE_URL.includes("YOUR_PROJECT_ID");

  const navigate = useCallback((pg, params = {}) => {
    setPage(pg); setPageParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      if (isDemo) {
        setCities(DEMO_CITIES); setFlats(DEMO_FLATS);
        setLoading(false); return;
      }
      try {
        if (supabase.restoreSession()) {
          await supabase.refreshSession();
          const u = supabase.user;
          if (u) {
            setUser(u);
            const p = await supabase.query("profiles", { filters: [`id=eq.${u.id}`], single: true });
            setProfile(p);
          }
        }
        const [citiesData, flatsData] = await Promise.all([
          supabase.query("cities", { order: "name.asc" }),
          supabase.query("flats", { select: "*,cities(name,country)", order: "is_featured.desc,created_at.desc" }),
        ]);
        setCities(citiesData);
        const withCovers = await Promise.all(flatsData.map(async f => {
          try {
            const imgs = await supabase.query("flat_images", { filters: [`flat_id=eq.${f.id}`, `is_cover=eq.true`], limit: 1 });
            return { ...f, cover_url: imgs[0]?.image_url || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop" };
          } catch { return { ...f, cover_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop" }; }
        }));
        setFlats(withCovers);
      } catch (e) { console.error("Init error:", e); setCities(DEMO_CITIES); setFlats(DEMO_FLATS); }
      setLoading(false);
    };
    init();
  }, [isDemo]);

  const ctx = { user, setUser, profile, setProfile, flats, setFlats, cities, navigate, isDemo };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: colors.bg }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${colors.dark}, #16213e)`, display: "flex", alignItems: "center", justifyContent: "center", color: colors.gold, fontWeight: 800, fontSize: 22, fontFamily: fontSerif, margin: "0 auto 16px", animation: "pulse 1.5s infinite" }}>m</div>
        <p style={{ fontFamily: font, color: colors.muted }}>Loading...</p>
      </div>
    </div>
  );

  return (
    <AppContext.Provider value={ctx}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; }
        body { margin: 0; overflow-x: hidden; }
        ::selection { background: ${colors.coral}; color: white; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @media (max-width: 768px) {
          .hero-grid, .detail-grid { grid-template-columns: 1fr !important; }
          .hero-img { display: none !important; }
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: block !important; }
          .listings-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) { .nav-mobile-btn { display: none !important; } }
      `}</style>
      <Navbar />
      {isDemo && (
        <div style={{ position: "fixed", bottom: 20, left: 20, right: 20, zIndex: 99, padding: "12px 20px", borderRadius: 14, background: colors.dark, color: "white", fontFamily: font, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
          <span>🔧 <strong>Demo Mode</strong> — Connect Supabase to go live. Replace SUPABASE_URL and SUPABASE_ANON_KEY in the code.</span>
          <span style={{ color: colors.gold, fontWeight: 600 }}>Sign in with any email to test admin features</span>
        </div>
      )}
      {page === "home" && <HomePage />}
      {page === "listings" && <ListingsPage initialCity={pageParams.city} />}
      {page === "flat" && <FlatDetailPage flatId={pageParams.id} />}
      {page === "admin" && <AdminPage />}
    </AppContext.Provider>
  );
}
