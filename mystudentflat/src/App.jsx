import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { Search, Calendar, FileText, Key, BedDouble, Droplets, Maximize2, Building2, Sun, MapPin, Wifi, Snowflake, Waves, ArrowUpDown, Car, UtensilsCrossed, Flame, Tv, Wind, ChefHat, Zap, Home, CheckCircle, Clock, AlertTriangle, Mail, Star, Quote, ChevronLeft, ChevronRight, Menu, X, LogOut, User, Edit, Trash2, Upload, Plus, Download, Eye, Play, Info, Ruler, Thermometer, Shield, Users2, Layers, ParkingCircle } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const SUPABASE_URL = "https://huaiffaepqdmxufbcgga.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YWlmZmFlcHFkbXh1ZmJjZ2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzE1OTQsImV4cCI6MjA5MDY0NzU5NH0.1eHbyFWUmm1SxUwAMEO_FA_l0eCBaCWzyQKc0UU3mlk";

const supabase = {
  url: SUPABASE_URL, key: SUPABASE_ANON_KEY, token: null, user: null,
  headers() { const h = {"apikey":this.key,"Content-Type":"application/json"}; h["Authorization"]=`Bearer ${this.token||this.key}`; return h; },
  async query(table, {select="*",filters=[],order,limit,single=false}={}) {
    let url=`${this.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    filters.forEach(fl=>{url+=`&${fl}`;});if(order)url+=`&order=${order}`;if(limit)url+=`&limit=${limit}`;
    const headers=this.headers();if(single)headers["Accept"]="application/vnd.pgrst.object+json";
    const res=await fetch(url,{headers});if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.message||res.statusText);}return res.json();
  },
  async insert(table,data){const res=await fetch(`${this.url}/rest/v1/${table}`,{method:"POST",headers:{...this.headers(),"Prefer":"return=representation"},body:JSON.stringify(data)});if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.message||res.statusText);}return res.json();},
  async update(table,id,data,idCol="id"){const res=await fetch(`${this.url}/rest/v1/${table}?${idCol}=eq.${id}`,{method:"PATCH",headers:{...this.headers(),"Prefer":"return=representation"},body:JSON.stringify(data)});if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.message||res.statusText);}return res.json();},
  async remove(table,id,idCol="id"){const res=await fetch(`${this.url}/rest/v1/${table}?${idCol}=eq.${id}`,{method:"DELETE",headers:this.headers()});if(!res.ok)throw new Error(res.statusText);},
  async uploadFile(bucket,path,file){const res=await fetch(`${this.url}/storage/v1/object/${bucket}/${path}`,{method:"POST",headers:{"apikey":this.key,"Authorization":`Bearer ${this.token||this.key}`,"Content-Type":file.type,"x-upsert":"true"},body:file});if(!res.ok)throw new Error("Upload failed");return`${this.url}/storage/v1/object/public/${bucket}/${path}`;},
  async signUp(email,password,metadata={}){const res=await fetch(`${this.url}/auth/v1/signup`,{method:"POST",headers:{"apikey":this.key,"Content-Type":"application/json"},body:JSON.stringify({email,password,data:metadata})});const data=await res.json();if(data.error)throw new Error(data.error.message);if(data.access_token){this.token=data.access_token;this.user=data.user;}return data;},
  async signIn(email,password){const res=await fetch(`${this.url}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"apikey":this.key,"Content-Type":"application/json"},body:JSON.stringify({email,password})});const data=await res.json();if(data.error)throw new Error(data.error_description);this.token=data.access_token;this.user=data.user;localStorage.setItem("msf_token",data.access_token);localStorage.setItem("msf_refresh",data.refresh_token);localStorage.setItem("msf_user",JSON.stringify(data.user));return data;},
  async refreshSession(){const refresh=localStorage.getItem("msf_refresh");if(!refresh)return null;const res=await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{"apikey":this.key,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:refresh})});const data=await res.json();if(data.error){this.signOut();return null;}this.token=data.access_token;this.user=data.user;localStorage.setItem("msf_token",data.access_token);localStorage.setItem("msf_refresh",data.refresh_token);localStorage.setItem("msf_user",JSON.stringify(data.user));return data;},
  signOut(){this.token=null;this.user=null;["msf_token","msf_refresh","msf_user"].forEach(k=>localStorage.removeItem(k));},
  restoreSession(){const t=localStorage.getItem("msf_token"),u=localStorage.getItem("msf_user");if(t&&u){this.token=t;this.user=JSON.parse(u);return true;}return false;},
};

/* ── Brand colors matching mystudentflat.com ── */
const ff="'Outfit', sans-serif", fs="'Outfit', sans-serif";
const P="#4338CA", Pl="#3730A3", Pd="#1e1b4b";
const cc={bg:"#ffffff",dark:Pd,primary:P,primaryLight:"#eef2ff",primaryDark:Pl,text:"#111827",muted:"#6b7280",light:"#f9fafb",green:"#22c55e",red:"#ef4444",border:"#e5e7eb",white:"#fff",gold:P,coral:P};
const LOGO="https://mystudentflat.com/wp-content/uploads/2025/07/Untitled-1-1.png";
const LOGO_LIGHT="https://mystudentflat.com/wp-content/uploads/2025/08/Untitled-1-05.png";
const btn=(p=true)=>({padding:"12px 28px",borderRadius:8,border:p?"none":`1px solid ${cc.border}`,background:p?P:"transparent",color:p?"#fff":cc.text,fontSize:14,fontFamily:ff,fontWeight:600,cursor:"pointer",transition:"all 0.2s",display:"inline-flex",alignItems:"center",gap:6});
const inp={width:"100%",padding:"12px 16px",borderRadius:10,border:`1px solid ${cc.border}`,fontFamily:ff,fontSize:14,outline:"none",boxSizing:"border-box"};
const lbl={display:"block",fontFamily:ff,fontSize:13,fontWeight:600,color:cc.text,marginBottom:6};
const AMENITIES=["WiFi","AC","Washing Machine","Balcony","Elevator","Parking","Dishwasher","Heating","TV","Dryer","Oven","Microwave"];

const mapPin = new L.Icon({iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],shadowSize:[41,41]});

function FlatMap({flats:mapFlats,onSelect,height="400px",center,zoom}){
  const validFlats=mapFlats.filter(f=>f.latitude&&f.longitude);
  if(validFlats.length===0)return null;
  const ct=center||[validFlats[0].latitude,validFlats[0].longitude];
  const zm=zoom||(validFlats.length===1?15:12);
  return(<div style={{borderRadius:14,overflow:"hidden",border:`1px solid ${cc.border}`}}>
    <MapContainer center={ct} zoom={zm} style={{height,width:"100%"}} scrollWheelZoom={false}>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      {validFlats.map(f=><Marker key={f.id} position={[f.latitude,f.longitude]} icon={mapPin} eventHandlers={onSelect?{click:()=>onSelect(f)}:{}}>
        <Popup><div style={{fontFamily:ff,minWidth:160}}>
          <div style={{fontWeight:600,fontSize:14,color:cc.text,marginBottom:4}}>{f.title}</div>
          <div style={{fontSize:13,color:cc.muted,marginBottom:4}}>{f.address}</div>
          <div style={{fontSize:15,fontWeight:700,color:P}}>€{f.price_per_month}/mo</div>
        </div></Popup>
      </Marker>)}
    </MapContainer>
  </div>);
}
const AppContext=createContext();

function useOnScreen(ref,th=0.1){const[v,setV]=useState(false);useEffect(()=>{const el=ref.current;if(!el)return;const o=new IntersectionObserver(([e])=>{if(e.isIntersecting)setV(true);},{threshold:th});o.observe(el);return()=>o.disconnect();},[ref,th]);return v;}
function FadeIn({children,delay=0,style:s={},className=""}){const ref=useRef();const v=useOnScreen(ref);return<div ref={ref} className={className} style={{...s,opacity:v?1:0,transform:v?"translateY(0)":"translateY(24px)",transition:`opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`}}>{children}</div>;}
function Tag({children,color=cc.green,bg="rgba(34,197,94,0.1)"}){return<span style={{padding:"4px 12px",borderRadius:100,background:bg,color,fontSize:12,fontFamily:ff,fontWeight:600,whiteSpace:"nowrap"}}>{children}</span>;}
function StatusBadge({status}){const m={available:[cc.green,"rgba(34,197,94,0.1)"],reserved:["#b45309","#fef3c7"],occupied:[cc.text,"#f3f4f6"],maintenance:[cc.red,"#fef2f2"],pending:["#b45309","#fef3c7"],confirmed:[cc.green,"rgba(34,197,94,0.1)"],cancelled:[cc.red,"#fef2f2"]};const[col,bg]=m[status]||[cc.muted,"#f3f4f6"];return<Tag color={col} bg={bg}>{status}</Tag>;}
function Modal({children,onClose}){return(<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={onClose}><div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)"}}/><div style={{position:"relative",background:cc.white,borderRadius:20,padding:32,maxWidth:480,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 48px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}><button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"none",border:"none",cursor:"pointer",color:cc.muted,display:"flex"}}><X size={20}/></button>{children}</div></div>);}
function Toast({message,type="success",onClose}){useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[onClose]);return<div style={{position:"fixed",top:20,right:20,zIndex:9999,padding:"14px 24px",borderRadius:12,background:type==="success"?Pd:cc.red,color:"#fff",fontFamily:ff,fontSize:14,fontWeight:500,boxShadow:"0 8px 30px rgba(0,0,0,0.2)",animation:"slideIn 0.3s ease"}}><span style={{display:"flex",alignItems:"center",gap:8}}>{type==="success"?<CheckCircle size={16}/>:<AlertTriangle size={16}/>}{message}</span></div>;}

function AuthModal({onClose}){
  const{setUser,setProfile}=useContext(AppContext);const[mode,setMode]=useState("login");const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[name,setName]=useState("");const[error,setError]=useState("");const[loading,setLoading]=useState(false);const[success,setSuccess]=useState(false);
  const submit=async()=>{setError("");setLoading(true);try{if(mode==="login"){const d=await supabase.signIn(email,password);setUser(d.user);try{setProfile(await supabase.query("profiles",{filters:[`id=eq.${d.user.id}`],single:true}));}catch{}onClose();}else{await supabase.signUp(email,password,{full_name:name,role:"student"});setSuccess(true);}}catch(e){setError(e.message);}setLoading(false);};
  return(<Modal onClose={onClose}>{success?(<div style={{textAlign:"center",padding:"20px 0"}}><h3 style={{fontFamily:fs,fontSize:24,color:cc.text,marginBottom:8}}>Check your email!</h3><p style={{fontFamily:ff,fontSize:15,color:cc.muted}}>Confirmation link sent to <strong>{email}</strong>.</p></div>):(<>
    <h3 style={{fontFamily:fs,fontSize:26,color:cc.text,margin:"0 0 6px"}}>{mode==="login"?"Welcome back":"Create account"}</h3>
    <p style={{fontFamily:ff,fontSize:14,color:cc.muted,margin:"0 0 24px"}}>{mode==="login"?"Sign in to your account":"Join MyStudentFlat today"}</p>
    {error&&<div style={{padding:"10px 14px",borderRadius:10,background:"#fef2f2",marginBottom:16,fontSize:13,fontFamily:ff,color:cc.red}}>{error}</div>}
    {mode==="signup"&&<div style={{marginBottom:16}}><label style={lbl}>Full Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="John Smith" style={inp}/></div>}
    <div style={{marginBottom:16}}><label style={lbl}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@university.edu" style={inp}/></div>
    <div style={{marginBottom:24}}><label style={lbl}>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={inp}/></div>
    <button onClick={submit} disabled={loading} style={{...btn(),width:"100%",justifyContent:"center",padding:"14px",fontSize:16,borderRadius:10,opacity:loading?0.6:1}}>{loading?"Please wait...":mode==="login"?"Sign In":"Create Account"}</button>
    <p style={{textAlign:"center",marginTop:20,fontFamily:ff,fontSize:14,color:cc.muted}}>{mode==="login"?"No account?":"Have an account?"} <span onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}} style={{color:P,cursor:"pointer",fontWeight:600}}>{mode==="login"?"Sign up":"Sign in"}</span></p>
  </>)}</Modal>);
}

function Navbar(){
  const{user,profile,navigate,setUser,setProfile,page}=useContext(AppContext);const[scrolled,setScrolled]=useState(false);const[showAuth,setShowAuth]=useState(false);const[menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>{const h=()=>setScrolled(window.scrollY>40);window.addEventListener("scroll",h);return()=>window.removeEventListener("scroll",h);},[]);
  const signOut=()=>{supabase.signOut();setUser(null);setProfile(null);navigate("home");};
  const nl=(label,pg)=><a key={pg} onClick={()=>{navigate(pg);setMenuOpen(false);}} style={{textDecoration:"none",color:page===pg?P:cc.text,fontSize:14,fontFamily:ff,fontWeight:page===pg?600:500,cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color=P} onMouseLeave={e=>{if(page!==pg)e.target.style.color=cc.text;}}>{label}</a>;
  return(<><nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:scrolled?"rgba(255,255,255,0.96)":"rgba(255,255,255,0.9)",backdropFilter:"blur(16px)",borderBottom:`1px solid ${scrolled?cc.border:"transparent"}`,transition:"all 0.3s",padding:scrolled?"8px 0":"14px 0"}}>
    <div style={{maxWidth:1200,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div onClick={()=>navigate("home")} style={{cursor:"pointer"}}><img src={LOGO} alt="MyStudentFlat" style={{height:38,objectFit:"contain"}}/></div>
      <div style={{display:"flex",alignItems:"center",gap:28}} className="nav-desktop">
        {nl("Find a Flat","listings")}{nl("About","about")}{nl("Investors","investors")}{nl("FAQ","faq")}
        {profile?.role==="admin"&&<a onClick={()=>navigate("admin")} style={{textDecoration:"none",color:P,fontSize:14,fontFamily:ff,fontWeight:600,cursor:"pointer"}}>Admin</a>}
        {user?(<div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:34,height:34,borderRadius:"50%",background:P,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:ff,fontWeight:700,fontSize:14}}>{(profile?.full_name||user.email)?.[0]?.toUpperCase()||"U"}</div><button onClick={signOut} style={{...btn(false),padding:"8px 18px",fontSize:13}}>Sign Out</button></div>)
        :<button onClick={()=>setShowAuth(true)} style={{...btn(),padding:"10px 22px",borderRadius:8}}>Login / Sign up</button>}
      </div>
      <button className="nav-mobile-btn" onClick={()=>setMenuOpen(!menuOpen)} style={{display:"none",background:"none",border:"none",fontSize:22,cursor:"pointer",color:cc.text}}>{menuOpen?<X size={22}/>:<Menu size={22}/>}</button>
    </div>
    {menuOpen&&<div style={{padding:"12px 24px 20px",background:"#fff",borderTop:`1px solid ${cc.border}`}}>
      {[["Find a Flat","listings"],["Investors","investors"],["About","about"],["FAQ","faq"]].map(([l,p])=><a key={p} onClick={()=>{navigate(p);setMenuOpen(false);}} style={{display:"block",padding:"10px 0",fontSize:15,fontFamily:ff,color:cc.text,cursor:"pointer",borderBottom:`1px solid ${cc.border}`}}>{l}</a>)}
      {profile?.role==="admin"&&<a onClick={()=>{navigate("admin");setMenuOpen(false);}} style={{display:"block",padding:"10px 0",fontSize:15,fontFamily:ff,color:P,cursor:"pointer"}}>Admin</a>}
      {user?<button onClick={signOut} style={{...btn(false),width:"100%",justifyContent:"center",marginTop:12}}>Sign Out</button>:<button onClick={()=>{setShowAuth(true);setMenuOpen(false);}} style={{...btn(),width:"100%",justifyContent:"center",marginTop:12}}>Login / Sign up</button>}
    </div>}
  </nav>{showAuth&&<AuthModal onClose={()=>setShowAuth(false)}/>}</>);
}

function Footer(){const{navigate}=useContext(AppContext);return(<footer style={{padding:"56px 24px 28px",background:"#fff",borderTop:`1px solid ${cc.border}`}}><div style={{maxWidth:1200,margin:"0 auto"}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:36,marginBottom:40}}>
  <div><div style={{marginBottom:14}}><img src={LOGO} alt="MyStudentFlat" style={{height:32,objectFit:"contain"}}/></div><p style={{fontFamily:ff,fontSize:13,lineHeight:1.6,color:cc.muted,margin:0}}>Student housing simplified. What you see is what you get.</p></div>
  {[{t:"Platform",links:[["Find a Flat","listings"],["Investors","investors"],["About","about"],["FAQ","faq"]]},{t:"Partners",links:[["Landlords","home"],["Investors","home"]]}].map(col=>(<div key={col.t}><h4 style={{fontFamily:ff,fontSize:12,fontWeight:700,color:cc.muted,textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 14px"}}>{col.t}</h4>{col.links.map(([l,p])=><a key={l} onClick={()=>navigate(p)} style={{display:"block",fontFamily:ff,fontSize:14,color:cc.text,textDecoration:"none",padding:"4px 0",cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color=P} onMouseLeave={e=>e.target.style.color=cc.text}>{l}</a>)}</div>))}
</div><div style={{borderTop:`1px solid ${cc.border}`,paddingTop:20,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}><span style={{fontFamily:ff,fontSize:12,color:cc.muted}}>Copyright © by My Student Flat</span><div style={{display:"flex",gap:16}}>{[["Terms & Conditions","terms"],["Privacy Policy","privacy"]].map(([l,p])=><a key={l} onClick={()=>navigate(p)} style={{fontFamily:ff,fontSize:12,color:cc.muted,textDecoration:"none",cursor:"pointer"}}>{l}</a>)}</div></div></div></footer>);}

function HomePage(){
  const{navigate,cities,flats}=useContext(AppContext);const[ci,setCi]=useState(0);const cn=["Nicosia","Athens","Limassol"];
  useEffect(()=>{const t=setInterval(()=>setCi(i=>(i+1)%cn.length),2800);return()=>clearInterval(t);},[]);
  const STEPS=[{t:"Browse Our Flats",d:"Explore verified listings and filter by availability, price, location, and proximity to your university.",i:"search"},{t:"Book Hassle-Free",d:"Book online and secure your future student flat.",i:"calendar"},{t:"E-Sign The Agreement",d:"Review and sign all the necessary documents digitally.",i:"file"},{t:"Ready To Move In",d:"Grab the keys and enjoy your flat.",i:"key"}];
  const REVIEWS=[{n:"Iasonas Stamatakis",t:"My student flat made it a lot easier for me to find a new apartment near my university and pleasantly surprised that they also offer cleaning services.",s:"Streamlined experience"},{n:"Sofia Nikolopoulou",t:"The flat I rented via the platform was exactly the way it was described. The booking process and signing of the contract was easy. Hassle free. Fully recommend.",s:"Hassle-free booking experience"},{n:"Nasri",t:"The apartments were beautifully decorated, and fully equipped, making my move trouble-free and without worries.",s:"Very nice apartments"}];
  return(<div>
    {/* HERO */}
    <section style={{minHeight:"92vh",display:"flex",alignItems:"center",position:"relative",overflow:"hidden",background:`linear-gradient(rgba(30,27,75,0.7),rgba(30,27,75,0.7)), url('https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&h=900&fit=crop') center/cover`}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"140px 24px 80px",width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"center"}} className="hero-grid">
        <div>
          <FadeIn><h1 style={{fontFamily:fs,fontSize:"clamp(36px,5vw,58px)",lineHeight:1.12,color:"#fff",margin:"0 0 8px",letterSpacing:"-0.02em"}}>Student Housing</h1></FadeIn>
          <FadeIn delay={0.06}><h1 style={{fontFamily:fs,fontSize:"clamp(36px,5vw,58px)",lineHeight:1.12,margin:"0 0 20px",letterSpacing:"-0.02em",color:"#fff"}}>Simplified</h1></FadeIn>
          <FadeIn delay={0.1}><p style={{fontFamily:ff,fontSize:17,lineHeight:1.7,color:"rgba(255,255,255,0.75)",maxWidth:480,margin:"0 0 32px"}}>Browse, select and book your new student flat near your University, 100% online!</p></FadeIn>
          <FadeIn delay={0.14}>
            <div style={{background:"rgba(255,255,255,0.12)",backdropFilter:"blur(12px)",borderRadius:14,padding:6,display:"flex",gap:8,maxWidth:480,border:"1px solid rgba(255,255,255,0.15)"}}>
              <input placeholder="Browse our flats near your University" style={{flex:1,padding:"14px 18px",borderRadius:10,border:"none",background:"rgba(255,255,255,0.95)",fontFamily:ff,fontSize:14,outline:"none",color:cc.text}}/>
              <button onClick={()=>navigate("listings")} style={{padding:"14px 28px",borderRadius:10,border:"none",background:P,color:"#fff",fontFamily:ff,fontSize:14,fontWeight:600,cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap"}}>Browse</button>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}><div style={{display:"flex",gap:36,marginTop:48,paddingTop:28,borderTop:"1px solid rgba(255,255,255,0.12)"}}>{[["250+","Happy Tenants"],["3","Cities"],["100%","Online Process"]].map(([n,l])=>(<div key={l}><div style={{fontFamily:fs,fontSize:28,color:"#fff"}}>{n}</div><div style={{fontFamily:ff,fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:2}}>{l}</div></div>))}</div></FadeIn>
        </div>
        <FadeIn delay={0.08} className="hero-img"><div style={{borderRadius:20,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",aspectRatio:"4/5",position:"relative"}}><img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=700&h=875&fit=crop" alt="Modern flat" style={{width:"100%",height:"100%",objectFit:"cover"}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 50%,rgba(0,0,0,0.4) 100%)"}}/><div style={{position:"absolute",bottom:20,left:20,right:20,background:"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderRadius:12,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:ff,fontWeight:600,fontSize:14,color:cc.text}}>Filokyprou 202</div><div style={{fontFamily:ff,fontSize:12,color:cc.muted}}>Nicosia · Available Now</div></div><div style={{fontFamily:fs,fontSize:20,color:P}}>€900<span style={{fontSize:12,color:cc.muted,fontFamily:ff}}>/mo</span></div></div></div></FadeIn>
      </div>
    </section>

    {/* HOW IT WORKS */}
    <section style={{padding:"90px 24px",background:"#fff"}}><div style={{maxWidth:1200,margin:"0 auto"}}>
      <FadeIn><div style={{textAlign:"center",marginBottom:56}}><h2 style={{fontFamily:fs,fontSize:"clamp(24px,3vw,36px)",color:cc.text,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.03em"}}>A New Life Begins</h2><p style={{fontFamily:ff,fontSize:15,color:cc.muted,fontStyle:"italic"}}>In Four Simple Steps</p></div></FadeIn>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:24}}>{STEPS.map((s,i)=>(<FadeIn key={i} delay={i*0.06}><div style={{padding:28,borderRadius:16,background:"#fff",border:`1px solid ${cc.border}`,height:"100%",transition:"all 0.3s",textAlign:"center"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 12px 32px rgba(67,56,202,0.08)";e.currentTarget.style.borderColor=P;}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.borderColor=cc.border;}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:cc.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>{s.i==="search"?<Search size={24} color={P}/>:s.i==="calendar"?<Calendar size={24} color={P}/>:s.i==="file"?<FileText size={24} color={P}/>:<Key size={24} color={P}/>}</div>
        <h3 style={{fontFamily:fs,fontSize:18,color:cc.text,margin:"0 0 8px"}}>{s.t}</h3><p style={{fontFamily:ff,fontSize:14,lineHeight:1.6,color:cc.muted,margin:0}}>{s.d}</p>
        <div style={{marginTop:16,fontFamily:ff,fontSize:12,fontWeight:700,color:P,letterSpacing:"0.08em"}}>0{i+1}</div>
      </div></FadeIn>))}</div>
    </div></section>

    {/* LISTINGS */}
    {flats.filter(fl=>fl.status==="available").length>0&&<section style={{padding:"90px 24px",background:cc.light}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <FadeIn><div style={{textAlign:"center",marginBottom:48}}>
          <h2 style={{fontFamily:fs,fontSize:"clamp(24px,3vw,36px)",color:cc.text,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.03em"}}>Most Viewed</h2>
          <p style={{fontFamily:ff,fontSize:15,color:cc.muted,fontStyle:"italic"}}>Check Our Listings</p>
        </div></FadeIn>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:20}}>
          {flats.filter(fl=>fl.status==="available").slice(0,6).map((fl,i)=>(
            <FadeIn key={fl.id} delay={i*0.05}>
              <div onClick={()=>navigate("flat",{id:fl.id})} style={{borderRadius:14,background:"#fff",border:`1px solid ${cc.border}`,overflow:"hidden",cursor:"pointer",transition:"all 0.3s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 12px 36px rgba(0,0,0,0.08)";}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
                <div style={{position:"relative",aspectRatio:"16/10",overflow:"hidden"}}>
                  <img src={fl.cover_url||"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=375&fit=crop"} alt={fl.title} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.4s"}} onMouseEnter={e=>e.target.style.transform="scale(1.04)"} onMouseLeave={e=>e.target.style.transform=""}/>
                  <div style={{position:"absolute",top:10,left:10}}><Tag>Available Now</Tag></div>
                </div>
                <div style={{padding:"14px 18px 18px"}}>
                  <h3 style={{fontFamily:fs,fontSize:16,color:cc.text,margin:"0 0 2px"}}>{fl.title}</h3>
                  <p style={{fontFamily:ff,fontSize:12,color:cc.muted,margin:"0 0 10px",display:"flex",alignItems:"center",gap:4}}><MapPin size={12}/>{fl.address}</p>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10,borderTop:`1px solid ${cc.border}`}}>
                    <div style={{display:"flex",gap:10}}>
                      <span style={{fontFamily:ff,fontSize:12,color:cc.muted,display:"flex",alignItems:"center",gap:3}}><BedDouble size={12}/>{fl.bedrooms}</span>
                      {fl.sqm&&<span style={{fontFamily:ff,fontSize:12,color:cc.muted,display:"flex",alignItems:"center",gap:3}}><Maximize2 size={12}/>{fl.sqm}m²</span>}
                    </div>
                    <div style={{fontFamily:fs,fontSize:18,color:P}}>€{fl.price_per_month}<span style={{fontSize:11,color:cc.muted,fontFamily:ff,fontWeight:400}}>/mo</span></div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.3}><div style={{textAlign:"center",marginTop:36}}>
          <button onClick={()=>navigate("listings")} style={{...btn(false),padding:"12px 32px",borderRadius:10}}>View All Listings</button>
        </div></FadeIn>
      </div>
    </section>}

    {/* CITIES */}
    <section style={{padding:"90px 24px",background:Pd}}><div style={{maxWidth:1200,margin:"0 auto"}}>
      <FadeIn><div style={{textAlign:"center",marginBottom:48}}><h2 style={{fontFamily:fs,fontSize:"clamp(24px,3vw,36px)",color:"#fff",margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.03em"}}>From Nicosia to Limassol</h2><p style={{fontFamily:ff,fontSize:15,color:"rgba(255,255,255,0.5)",fontStyle:"italic"}}>Choose Your City</p></div></FadeIn>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:16}}>{cities.map((ct,i)=>(<FadeIn key={ct.id} delay={i*0.05}><div onClick={()=>ct.is_active&&navigate("listings",{city:ct.id})} style={{padding:28,borderRadius:16,background:ct.is_active?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",cursor:ct.is_active?"pointer":"default",transition:"all 0.3s",opacity:ct.is_active?1:0.4,textAlign:"center"}} onMouseEnter={e=>{if(ct.is_active){e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.borderColor=P;}}} onMouseLeave={e=>{if(ct.is_active){e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}}}>
        <div style={{fontSize:28,marginBottom:10}}></div><h3 style={{fontFamily:fs,fontSize:20,color:"#fff",margin:"0 0 4px"}}>{ct.name}</h3><p style={{fontFamily:ff,fontSize:13,color:"rgba(255,255,255,0.4)",margin:0}}>{ct.is_active?"View flats →":"Coming Soon"}</p>
      </div></FadeIn>))}</div>
    </div></section>

    {/* REVIEWS */}
    <section style={{padding:"90px 24px",background:"#fff"}}><div style={{maxWidth:1200,margin:"0 auto"}}>
      <FadeIn><div style={{textAlign:"center",marginBottom:48}}><h2 style={{fontFamily:fs,fontSize:"clamp(24px,3vw,36px)",color:cc.text,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.03em"}}>Reviews</h2><p style={{fontFamily:ff,fontSize:15,color:cc.muted,fontStyle:"italic"}}>What Our Tenants Say</p></div></FadeIn>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:20}}>{REVIEWS.map((r,i)=>(<FadeIn key={i} delay={i*0.06}><div style={{padding:28,borderRadius:16,background:"#fff",border:`1px solid ${cc.border}`,height:"100%"}}>
        <div style={{color:P,marginBottom:6}}><Quote size={24}/></div><p style={{fontFamily:ff,fontSize:14,lineHeight:1.7,color:cc.text,margin:"0 0 16px",fontStyle:"italic"}}>{r.t}</p>
        <div style={{fontFamily:ff,fontWeight:700,fontSize:14,color:cc.text}}>{r.n}</div><div style={{fontFamily:ff,fontSize:12,color:cc.muted}}>{r.s}</div>
        <div style={{display:"flex",gap:2,marginTop:8}}>{[1,2,3,4,5].map(i=><Star key={i} size={14} fill="#f59e0b" color="#f59e0b"/>)}</div>
      </div></FadeIn>))}</div>
    </div></section>

    {/* CTA */}
    <section style={{padding:"90px 24px",background:cc.light}}><FadeIn><div style={{maxWidth:600,margin:"0 auto",textAlign:"center"}}>
      <h2 style={{fontFamily:fs,fontSize:"clamp(28px,4vw,42px)",color:cc.text,margin:"0 0 14px",lineHeight:1.2}}>Ready to find your new home?</h2>
      <p style={{fontFamily:ff,fontSize:16,color:cc.muted,margin:"0 0 32px"}}>Join hundreds of students who found their perfect flat.</p>
      <button onClick={()=>navigate("listings")} style={{...btn(),padding:"16px 40px",fontSize:16,borderRadius:10}}>Browse Flats Now</button>
    </div></FadeIn></section>
    <Footer/>
  </div>);
}

function ListingsPage({initialCity}){
  const{flats,cities,navigate}=useContext(AppContext);const[cf,setCf]=useState(initialCity||"all");const[pr,setPr]=useState("all");const[bf,setBf]=useState("all");const[search,setSearch]=useState("");
  const filtered=flats.filter(fl=>{if(fl.status!=="available")return false;if(cf!=="all"&&fl.city_id!==cf)return false;if(pr==="0-800"&&fl.price_per_month>800)return false;if(pr==="800-1000"&&(fl.price_per_month<800||fl.price_per_month>1000))return false;if(pr==="1000+"&&fl.price_per_month<1000)return false;if(bf!=="all"&&fl.bedrooms!==parseInt(bf))return false;if(search&&!fl.title.toLowerCase().includes(search.toLowerCase())&&!fl.address.toLowerCase().includes(search.toLowerCase()))return false;return true;});
  return(<div style={{paddingTop:80,minHeight:"100vh",background:"#fff"}}><div style={{maxWidth:1200,margin:"0 auto",padding:"40px 24px"}}>
    <FadeIn><h1 style={{fontFamily:fs,fontSize:"clamp(28px,3.5vw,40px)",color:cc.text,margin:"0 0 6px"}}>Find Your Flat</h1><p style={{fontFamily:ff,fontSize:15,color:cc.muted,margin:"0 0 28px"}}>Browse all available student apartments</p></FadeIn>
    <FadeIn delay={0.06}><div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:28,padding:16,borderRadius:14,background:cc.light,border:`1px solid ${cc.border}`}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search flats..." style={{...inp,flex:"1 1 200px",background:"#fff"}}/>
      <select value={cf} onChange={e=>setCf(e.target.value==="all"?"all":parseInt(e.target.value))} style={{...inp,width:"auto",flex:"0 1 160px",cursor:"pointer",background:"#fff"}}><option value="all">All Cities</option>{cities.filter(ct=>ct.is_active).map(ct=><option key={ct.id} value={ct.id}>{ct.name}</option>)}</select>
      <select value={bf} onChange={e=>setBf(e.target.value)} style={{...inp,width:"auto",flex:"0 1 140px",cursor:"pointer",background:"#fff"}}><option value="all">Any Beds</option><option value="1">1 Bedroom</option><option value="2">2 Bedrooms</option></select>
      <select value={pr} onChange={e=>setPr(e.target.value)} style={{...inp,width:"auto",flex:"0 1 150px",cursor:"pointer",background:"#fff"}}><option value="all">Any Price</option><option value="0-800">Under €800</option><option value="800-1000">€800–€1000</option><option value="1000+">Over €1000</option></select>
    </div></FadeIn>
    <p style={{fontFamily:ff,fontSize:13,color:cc.muted,marginBottom:18}}>{filtered.length} flat{filtered.length!==1?"s":""} found</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",gap:22}} className="listings-grid">{filtered.map((fl,i)=>(<FadeIn key={fl.id} delay={i*0.04}><div onClick={()=>navigate("flat",{id:fl.id})} style={{borderRadius:16,background:"#fff",border:`1px solid ${cc.border}`,overflow:"hidden",cursor:"pointer",transition:"all 0.3s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 14px 44px rgba(0,0,0,0.08)";}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
      <div style={{position:"relative",aspectRatio:"16/10",overflow:"hidden"}}><img src={fl.cover_url||"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=500&fit=crop"} alt={fl.title} style={{width:"100%",height:"100%",objectFit:"cover",transition:"transform 0.4s"}} onMouseEnter={e=>e.target.style.transform="scale(1.04)"} onMouseLeave={e=>e.target.style.transform=""}/><div style={{position:"absolute",top:12,left:12,display:"flex",gap:6}}><Tag>Available Now</Tag></div></div>
      <div style={{padding:"16px 20px 20px"}}><h3 style={{fontFamily:fs,fontSize:17,color:cc.text,margin:"0 0 2px"}}>{fl.title}</h3><p style={{fontFamily:ff,fontSize:13,color:cc.muted,margin:"0 0 12px"}}>{fl.address}</p><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:12,borderTop:`1px solid ${cc.border}`}}><div style={{display:"flex",gap:12}}><span style={{fontFamily:ff,fontSize:13,color:cc.muted,display:"flex",alignItems:"center",gap:4}}><BedDouble size={14}/>{fl.bedrooms} Bed</span>{fl.sqm&&<span style={{fontFamily:ff,fontSize:13,color:cc.muted,display:"flex",alignItems:"center",gap:4}}><Maximize2 size={14}/>{fl.sqm}m²</span>}</div><div style={{fontFamily:fs,fontSize:20,color:P}}>€{fl.price_per_month}<span style={{fontSize:11,color:cc.muted,fontFamily:ff,fontWeight:400}}>/month</span></div></div></div>
    </div></FadeIn>))}</div>
    
    {/* Map View */}
    {filtered.length>0&&<FadeIn delay={0.1}><div style={{marginTop:32,marginBottom:32}}>
      <h3 style={{fontFamily:fs,fontSize:20,color:cc.text,marginBottom:14}}>Map View</h3>
      <FlatMap flats={filtered} onSelect={fl=>navigate("flat",{id:fl.id})} height="450px"/>
    </div></FadeIn>}

    {filtered.length===0&&<div style={{textAlign:"center",padding:60}}><p style={{fontFamily:ff,fontSize:16,color:cc.muted}}>No flats match your filters.</p></div>}
  </div><Footer/></div>);
}

function FlatDetailPage({flatId}){
  const{flats,user,navigate,images,showToast}=useContext(AppContext);const[showAuth,setShowAuth]=useState(false);const[ld,setLd]=useState("12");const[mid,setMid]=useState("");const[success,setSuccess]=useState(false);const[imgIdx,setImgIdx]=useState(0);const[booking,setBooking]=useState(false);const[showDepositInfo,setShowDepositInfo]=useState(false);const[showFeeInfo,setShowFeeInfo]=useState(false);const[payOption,setPayOption]=useState("split");const[agreedTerms,setAgreedTerms]=useState(false);
  const flat=flats.find(fl=>fl.id===flatId);const flatImgs=images.filter(img=>img.flat_id===flatId).sort((a,b)=>a.sort_order-b.sort_order);const allImgs=flatImgs.length>0?flatImgs.map(i=>i.image_url):[flat?.cover_url||"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop"];
  if(!flat)return<div style={{paddingTop:120,textAlign:"center"}}><p style={{fontFamily:ff,color:cc.muted}}>Flat not found.</p></div>;
  const mod=mid?(()=>{const d=new Date(mid);d.setMonth(d.getMonth()+parseInt(ld));return d.toISOString().split("T")[0];})():null;
  const handleBook=async()=>{if(!user){setShowAuth(true);return;}if(!mid){showToast("Please select a move-in date","error");return;}setBooking(true);try{await supabase.insert("bookings",{flat_id:flat.id,tenant_id:user.id,lease_duration:ld,move_in_date:mid,move_out_date:mod,monthly_rent:flat.price_per_month,status:"pending"});setSuccess(true);showToast("Booking submitted!");}catch(e){showToast("Booking failed: "+e.message,"error");}setBooking(false);};
  const amenityIcons={"WiFi":Wifi,"AC":Snowflake,"Washing Machine":Waves,"Balcony":Sun,"Elevator":ArrowUpDown,"Parking":Car,"Dishwasher":UtensilsCrossed,"Heating":Flame,"TV":Tv,"Dryer":Wind,"Oven":ChefHat,"Microwave":Zap};
  return(<div style={{paddingTop:80,minHeight:"100vh",background:"#fff"}}>{showAuth&&<AuthModal onClose={()=>setShowAuth(false)}/>}<div style={{maxWidth:1200,margin:"0 auto",padding:"32px 24px"}}>
    <button onClick={()=>navigate("listings")} style={{background:"none",border:"none",fontFamily:ff,fontSize:14,color:cc.muted,cursor:"pointer",marginBottom:20}}>← Back to listings</button>
    {success?(<FadeIn><div style={{maxWidth:500,margin:"40px auto",textAlign:"center",padding:40,borderRadius:16,background:"#fff",border:`1px solid ${cc.border}`}}><h2 style={{fontFamily:fs,fontSize:28,color:cc.text,margin:"0 0 12px"}}>Booking Submitted!</h2><p style={{fontFamily:ff,fontSize:15,color:cc.muted}}>Your booking for <strong>{flat.title}</strong> is pending.</p><button onClick={()=>navigate("listings")} style={{...btn(),marginTop:24}}>Browse More</button></div></FadeIn>):(
    <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:32,alignItems:"start"}} className="detail-grid">
      <div>
        <FadeIn><div style={{position:"relative",borderRadius:16,overflow:"hidden",marginBottom:16,aspectRatio:"16/9"}}><img src={allImgs[imgIdx]} alt={flat.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          {allImgs.length>1&&<><button onClick={()=>setImgIdx(i=>(i-1+allImgs.length)%allImgs.length)} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,0.9)",border:"none",fontSize:18,cursor:"pointer"}}>‹</button><button onClick={()=>setImgIdx(i=>(i+1)%allImgs.length)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,0.9)",border:"none",fontSize:18,cursor:"pointer"}}>›</button></>}
        </div>{allImgs.length>1&&<div style={{display:"flex",gap:8,marginBottom:24,overflowX:"auto"}}>{allImgs.map((url,i)=><img key={i} src={url} alt="" onClick={()=>setImgIdx(i)} style={{width:80,height:60,objectFit:"cover",borderRadius:8,cursor:"pointer",border:i===imgIdx?`2px solid ${P}`:"2px solid transparent",opacity:i===imgIdx?1:0.6}}/>)}</div>}</FadeIn>
        <FadeIn delay={0.06}><div style={{display:"flex",gap:8,marginBottom:14}}><StatusBadge status={flat.status}/></div><h1 style={{fontFamily:fs,fontSize:28,color:cc.text,margin:"0 0 6px"}}>{flat.title}</h1><p style={{fontFamily:ff,fontSize:15,color:cc.muted,margin:"0 0 20px"}}>{flat.address}</p><p style={{fontFamily:ff,fontSize:15,lineHeight:1.7,color:cc.text,margin:"0 0 28px"}}>{flat.description}</p></FadeIn>
        <FadeIn delay={0.1}><h3 style={{fontFamily:fs,fontSize:20,color:cc.text,marginBottom:12}}>Details</h3><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:28}} className="details-grid">{[["beds","Beds",flat.bedrooms],["baths","Baths",flat.bathrooms],["area","Area",`${flat.sqm||"—"}m²`],["floor","Floor",flat.floor||"—"],["balcony","Balcony",flat.has_balcony?"Yes":"No"],["uni","Uni",flat.distance_to_university||"—"]].map(([i,l,v])=><div key={l} style={{padding:"12px 14px",borderRadius:10,background:cc.light,display:"flex",alignItems:"center",gap:10}}><span style={{color:P,display:"flex"}}>{i==="beds"?<BedDouble size={18}/>:i==="baths"?<Droplets size={18}/>:i==="area"?<Maximize2 size={18}/>:i==="floor"?<Building2 size={18}/>:i==="balcony"?<Sun size={18}/>:<MapPin size={18}/>}</span><div><div style={{fontFamily:ff,fontSize:11,color:cc.muted}}>{l}</div><div style={{fontFamily:ff,fontSize:14,fontWeight:600,color:cc.text}}>{v}</div></div></div>)}</div></FadeIn>
        <FadeIn delay={0.14}><h3 style={{fontFamily:fs,fontSize:20,color:cc.text,marginBottom:12}}>Amenities</h3><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{flat.amenities?.map(a=>{const Icon=amenityIcons[a];return<span key={a} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:100,background:cc.light,fontSize:13,fontFamily:ff,color:cc.text,border:`1px solid ${cc.border}`}}>{Icon&&<Icon size={14} color={P}/>}{a}</span>;})}</div></FadeIn>

        {/* Property Specifications */}
        <FadeIn delay={0.18}><h3 style={{fontFamily:fs,fontSize:20,color:cc.text,marginBottom:12,marginTop:28}}>Property Specifications</h3>
        <div style={{padding:20,borderRadius:14,border:`1px solid ${cc.border}`,background:"#fff"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 24px"}} className="details-grid">
            {[
              ["Build Year",flat.build_year||"2025","calendar"],
              ["Condition",flat.condition||"New","shield"],
              ["Furnished",flat.is_furnished?"Yes":"No","layers"],
              ["Parking",flat.has_parking?"Yes":"No","car"],
                            ["Property View",flat.property_view||"Urban","eye"],
              ["Balcony Size",flat.balcony_sqm?flat.balcony_sqm+"m²":"—","ruler"],
              ["Max Occupants",flat.max_occupants||"2","users"],
              ["Floor",flat.floor||"—","building"],
              ["Energy Class",flat.energy_class||"A","thermo"],
            ].map(([label,val,icon])=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${cc.light}`}}>
                <span style={{fontFamily:ff,fontSize:13,color:cc.muted,display:"flex",alignItems:"center",gap:6}}>
                  {icon==="calendar"?<Calendar size={14} color={cc.muted}/>:icon==="shield"?<Shield size={14} color={cc.muted}/>:icon==="layers"?<Layers size={14} color={cc.muted}/>:icon==="car"?<Car size={14} color={cc.muted}/>:icon==="mappin"?<MapPin size={14} color={cc.muted}/>:icon==="eye"?<Eye size={14} color={cc.muted}/>:icon==="ruler"?<Maximize2 size={14} color={cc.muted}/>:icon==="users"?<Users2 size={14} color={cc.muted}/>:icon==="building"?<Building2 size={14} color={cc.muted}/>:<Thermometer size={14} color={cc.muted}/>}
                  {label}
                </span>
                <span style={{fontFamily:ff,fontSize:13,fontWeight:600,color:cc.text}}>{val}</span>
              </div>
            ))}
          </div>
        </div></FadeIn>

        {/* Video */}
        {flat.video_url&&<FadeIn delay={0.22}><h3 style={{fontFamily:fs,fontSize:20,color:cc.text,marginBottom:12,marginTop:28}}>Video</h3>
        <div style={{borderRadius:14,overflow:"hidden",border:`1px solid ${cc.border}`,aspectRatio:"16/9"}}>
          <iframe src={flat.video_url.replace("watch?v=","embed/").replace("youtu.be/","youtube.com/embed/")} style={{width:"100%",height:"100%",border:"none"}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
        </div></FadeIn>}

        {flat.latitude&&flat.longitude&&<FadeIn delay={0.18}><div style={{marginTop:28}}><h3 style={{fontFamily:fs,fontSize:20,color:cc.text,marginBottom:12}}>Location</h3><FlatMap flats={[flat]} height="280px"/><p style={{fontFamily:ff,fontSize:13,color:cc.muted,marginTop:8}}>{flat.address}</p></div></FadeIn>}
      </div>
      <FadeIn delay={0.08}><div style={{position:"sticky",top:100,borderRadius:18,background:"#fff",border:`1px solid ${cc.border}`,boxShadow:"0 4px 20px rgba(0,0,0,0.04)",overflow:"hidden"}}>
        <div style={{background:Pd,padding:"16px 22px"}}><div style={{fontFamily:fs,fontSize:17,fontWeight:700,color:"#fff"}}>{flat.title}</div><div style={{fontFamily:ff,fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:2}}>{flat.address}</div></div>
        <div style={{padding:"20px 22px"}}>

        <label style={lbl}>Select Move-in Date</label>
        {flat.earliest_move_in&&<div style={{padding:"8px 12px",borderRadius:8,border:`1px solid #c7d2fe`,background:"#eef2ff",marginBottom:8,display:"flex",justifyContent:"space-between"}}><span style={{fontFamily:ff,fontSize:12,color:P,fontWeight:600}}>Available dates:</span><span style={{fontFamily:ff,fontSize:12,color:cc.text}}>{flat.earliest_move_in} onwards</span></div>}
        <input type="date" value={mid} min={flat.earliest_move_in||new Date().toISOString().split("T")[0]} onChange={e=>setMid(e.target.value)} style={{...inp,marginBottom:6}}/>
        {mid&&<div style={{padding:"6px 12px",borderRadius:8,background:"#eef2ff",fontFamily:ff,fontSize:12,color:P,fontWeight:500,marginBottom:16}}>Selected move-in date: {new Date(mid).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>}

        <div style={{padding:"10px 14px",borderRadius:10,border:`1px solid #c7d2fe`,background:"#eef2ff",textAlign:"center",marginBottom:8,marginTop:mid?0:12}}><span style={{fontFamily:ff,fontSize:13,fontWeight:600,color:P}}>Minimum/Maximum Rental Period</span></div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>{(flat.available_lease_durations||["12","24"]).map(d=><button key={d} onClick={()=>setLd(d)} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${ld===d?P:cc.border}`,background:ld===d?P:"#fff",color:ld===d?"#fff":cc.text,fontFamily:ff,fontSize:14,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}>{d} Months</button>)}</div>

        {mid&&<div style={{padding:"8px 12px",borderRadius:8,border:`1px solid #c7d2fe`,background:"#eef2ff",marginBottom:16}}><span style={{fontFamily:ff,fontSize:12,color:P,fontWeight:600}}>Selected move-out date: </span><span style={{fontFamily:ff,fontSize:12,color:cc.text}}>{new Date(mod).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span></div>}

        <div style={{borderTop:`1px solid ${cc.border}`,paddingTop:14,marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontFamily:ff,fontSize:14,color:cc.muted}}>Monthly Rent:</span><span style={{fontFamily:ff,fontSize:14,fontWeight:600,color:cc.text}}>{flat.price_per_month}€</span></div>
          {mid&&<>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontFamily:ff,fontSize:14,color:cc.muted}}>Total Rent for the selected period:</span><span style={{fontFamily:ff,fontSize:14,fontWeight:600,color:cc.text}}>{(flat.price_per_month*parseInt(ld)).toLocaleString()}€</span></div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontFamily:ff,fontSize:14,color:cc.muted,display:"flex",alignItems:"center",gap:4}}>Security Deposit: <span onClick={()=>setShowDepositInfo(!showDepositInfo)} style={{width:18,height:18,borderRadius:"50%",background:P,color:"#fff",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontWeight:700}}>?</span></span><span style={{fontFamily:ff,fontSize:14,fontWeight:600,color:cc.text}}>1,500€</span></div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontFamily:ff,fontSize:14,color:cc.muted,display:"flex",alignItems:"center",gap:4}}>Platform Fee: <span onClick={()=>setShowFeeInfo(!showFeeInfo)} style={{width:18,height:18,borderRadius:"50%",background:P,color:"#fff",fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontWeight:700}}>?</span></span><span style={{fontFamily:ff,fontSize:14,fontWeight:600,color:cc.text}}>500€</span></div>
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:`1px solid ${cc.border}`}}><span style={{fontFamily:ff,fontSize:15,fontWeight:700,color:P}}>Total:</span><span style={{fontFamily:ff,fontSize:15,fontWeight:700,color:P}}>{(flat.price_per_month*parseInt(ld)+2000).toLocaleString()}€</span></div>
          </>}
        </div>

        {showDepositInfo&&<div style={{padding:14,borderRadius:10,background:cc.light,border:`1px solid ${cc.border}`,marginTop:12,marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontFamily:ff,fontSize:14,fontWeight:700,color:cc.text}}>Security Deposit Information</span><span onClick={()=>setShowDepositInfo(false)} style={{cursor:"pointer",color:cc.muted,fontSize:18,lineHeight:1}}>x</span></div><p style={{fontFamily:ff,fontSize:14,lineHeight:1.6,color:cc.muted,margin:0}}>The amount of the security deposit is refundable at the end of the agreed rental period, provided that all utility bills have been settled in full by the tenant and that no damages have occurred to the flat during the rental period. The security deposit and the platform fee are non-refundable in case of cancellation of the rental agreement.</p></div>}
        {showFeeInfo&&<div style={{padding:14,borderRadius:10,background:cc.light,border:`1px solid ${cc.border}`,marginTop:12,marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontFamily:ff,fontSize:14,fontWeight:700,color:cc.text}}>Platform Fee Information</span><span onClick={()=>setShowFeeInfo(false)} style={{cursor:"pointer",color:cc.muted,fontSize:18,lineHeight:1}}>x</span></div><p style={{fontFamily:ff,fontSize:14,lineHeight:1.6,color:cc.muted,margin:0}}>Platform fee is non-refundable.</p></div>}

        {mid&&<div style={{marginTop:14}}>
          <div style={{padding:16,borderRadius:10,border:`2px solid ${P}`,background:"#eef2ff",textAlign:"center",marginBottom:12}}>
            <div style={{fontFamily:ff,fontSize:14,fontWeight:700,color:cc.text}}>To book this flat please pay now</div>
            <div style={{fontFamily:fs,fontSize:26,fontWeight:700,color:P,marginTop:4}}>2,000€</div>
            <p style={{fontFamily:ff,fontSize:11,color:cc.muted,margin:"8px 0 0",lineHeight:1.5,fontStyle:"italic"}}>Rental payment can be processed either by Wire Transfer or by Credit Card on the day of move in to the apartment, according to the rental payment plan that you choose to create a rental agreement</p>
          </div>

          <div onClick={()=>setPayOption("split")} style={{padding:14,borderRadius:10,border:`1px solid ${payOption==="split"?P:cc.border}`,background:payOption==="split"?"#eef2ff":"#fff",cursor:"pointer",marginBottom:8}}>
            <div style={{fontFamily:ff,fontSize:14,fontWeight:600,color:cc.text}}>Split in 2</div>
            <div style={{fontFamily:ff,fontSize:13,color:cc.muted}}>Two payments of {Math.ceil((flat.price_per_month*parseInt(ld)+2000)/2).toLocaleString()}€</div>
          </div>
          <div onClick={()=>setPayOption("full")} style={{padding:14,borderRadius:10,border:`1px solid ${payOption==="full"?P:cc.border}`,background:payOption==="full"?"#eef2ff":"#fff",cursor:"pointer",marginBottom:14}}>
            <div style={{fontFamily:ff,fontSize:14,fontWeight:600,color:cc.text}}>Pay in Full</div>
            <div style={{fontFamily:ff,fontSize:13,color:cc.muted}}>{(flat.price_per_month*parseInt(ld)+2000).toLocaleString()}€ <span style={{background:cc.green,color:"#fff",padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:600,marginLeft:4}}>Save 5%</span></div>
          </div>
        </div>}

        <label style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:14,cursor:"pointer"}}><input type="checkbox" checked={agreedTerms} onChange={e=>setAgreedTerms(e.target.checked)} style={{marginTop:3}}/><span style={{fontFamily:ff,fontSize:13,color:cc.muted}}>I agree with <a onClick={()=>navigate("terms")} href="#" style={{color:P,fontWeight:600}}>Terms and Conditions</a></span></label>

        <button onClick={handleBook} disabled={booking||!agreedTerms} style={{...btn(),width:"100%",justifyContent:"center",padding:"15px",fontSize:16,borderRadius:10,opacity:(booking||!agreedTerms)?0.5:1}}>{booking?"Submitting...":user?"Book Now":"Sign In to Book"}</button>
        <p style={{textAlign:"center",fontFamily:ff,fontSize:11,color:cc.muted,marginTop:8}}>You must be a registered user to complete your booking.</p>
        </div>
      </div></FadeIn>
    </div>)}
  </div><Footer/></div>);
}

function AdminPage(){
  const{flats,setFlats,cities,profile,bookings,setBookings,showToast,images,setImages}=useContext(AppContext);const[tab,setTab]=useState("overview");const[editing,setEditing]=useState(null);const[confirmDel,setConfirmDel]=useState(null);const[formData,setFormData]=useState({});const[saving,setSaving]=useState(false);const[uploading,setUploading]=useState(false);
  if(profile?.role!=="admin")return<div style={{paddingTop:140,textAlign:"center"}}><h2 style={{fontFamily:fs,fontSize:28,color:cc.text}}>Access Denied</h2></div>;
  const stats=[{l:"Total Flats",v:flats.length,i:"home"},{l:"Available",v:flats.filter(fl=>fl.status==="available").length,i:"check"},{l:"Bookings",v:bookings.length,i:"02"},{l:"Pending",v:bookings.filter(b=>b.status==="pending").length,i:"clock"}];
  const startEdit=flat=>{setEditing(flat?.id||"new");setFormData(flat?{title:flat.title,slug:flat.slug,description:flat.description||"",address:flat.address,city_id:flat.city_id,price_per_month:flat.price_per_month,bedrooms:flat.bedrooms,bathrooms:flat.bathrooms,sqm:flat.sqm||"",floor:flat.floor||"",has_balcony:flat.has_balcony,is_furnished:flat.is_furnished,amenities:flat.amenities||[],status:flat.status,available_lease_durations:flat.available_lease_durations||["12","24"],earliest_move_in:flat.earliest_move_in?.split("T")[0]||"",latest_move_in:flat.latest_move_in?.split("T")[0]||"",latitude:flat.latitude||"",longitude:flat.longitude||"",distance_to_university:flat.distance_to_university||"",is_featured:flat.is_featured,video_url:flat.video_url||"",build_year:flat.build_year||"2025",max_occupants:flat.max_occupants||2,energy_class:flat.energy_class||"A",property_view:flat.property_view||"Urban"}:{title:"",slug:"",description:"",address:"",city_id:cities[0]?.id||1,price_per_month:700,bedrooms:1,bathrooms:1,sqm:35,floor:1,has_balcony:false,is_furnished:true,amenities:["WiFi","AC"],status:"available",available_lease_durations:["12","24"],earliest_move_in:new Date().toISOString().split("T")[0],latest_move_in:"",latitude:"",longitude:"",distance_to_university:"",is_featured:false,video_url:"",build_year:"2025",max_occupants:2,energy_class:"A",property_view:"Urban"});};
  const set=(k,v)=>setFormData(p=>({...p,[k]:v}));const autoSlug=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const handleSave=async()=>{if(!formData.title||!formData.address){showToast("Title and address required","error");return;}setSaving(true);const data={...formData,slug:formData.slug||autoSlug(formData.title),price_per_month:parseFloat(formData.price_per_month),bedrooms:parseInt(formData.bedrooms),bathrooms:parseInt(formData.bathrooms),sqm:parseFloat(formData.sqm)||null,floor:parseInt(formData.floor)||null,city_id:parseInt(formData.city_id),latest_move_in:formData.latest_move_in||null,latitude:parseFloat(formData.latitude)||null,longitude:parseFloat(formData.longitude)||null};try{if(editing==="new"){const[nf]=await supabase.insert("flats",data);setFlats(p=>[{...nf,cities:cities.find(ct=>ct.id===nf.city_id)||{},cover_url:"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=500&fit=crop"},...p]);showToast("Flat created!");}else{await supabase.update("flats",editing,data);setFlats(p=>p.map(fl=>fl.id===editing?{...fl,...data,cities:cities.find(ct=>ct.id===parseInt(data.city_id))||fl.cities}:fl));showToast("Flat updated!");}setEditing(null);}catch(e){showToast("Save failed: "+e.message,"error");}setSaving(false);};
  const handleDelete=async flat=>{try{await supabase.remove("flats",flat.id);setFlats(p=>p.filter(fl=>fl.id!==flat.id));showToast("Flat deleted");setConfirmDel(null);}catch(e){showToast("Delete failed","error");}};
  const updateBooking=async(b,status)=>{try{await supabase.update("bookings",b.id,{status});setBookings(p=>p.map(x=>x.id===b.id?{...x,status}:x));showToast(`Booking ${status}`);}catch(e){showToast("Failed","error");}};
  const handleImgUpload=async(e,fid)=>{const files=Array.from(e.target.files);if(!files.length)return;setUploading(true);const ex=images.filter(i=>i.flat_id===fid);for(const file of files){try{const path=`flat-${fid}/${Date.now()}-${file.name}`;const url=await supabase.uploadFile("flat-images",path,file);const[ni]=await supabase.insert("flat_images",{flat_id:fid,image_url:url,alt_text:file.name,sort_order:ex.length,is_cover:ex.length===0});setImages(p=>[...p,ni]);if(ex.length===0)setFlats(p=>p.map(fl=>fl.id===fid?{...fl,cover_url:url}:fl));showToast("Image uploaded!");}catch{showToast("Upload failed","error");}}setUploading(false);};
  const delImg=async img=>{try{await supabase.remove("flat_images",img.id);setImages(p=>p.filter(i=>i.id!==img.id));showToast("Deleted");}catch{showToast("Failed","error");}};

  if(editing){const flatImgs=editing!=="new"?images.filter(i=>i.flat_id===editing).sort((a,b)=>a.sort_order-b.sort_order):[];
    return(<div style={{paddingTop:80,minHeight:"100vh",background:cc.light}}><div style={{maxWidth:900,margin:"0 auto",padding:"32px 24px"}}><div style={{padding:28,borderRadius:16,background:"#fff",border:`1px solid ${cc.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><h2 style={{fontFamily:fs,fontSize:24,color:cc.text,margin:0}}>{editing==="new"?"Add New Flat":"Edit Flat"}</h2><button onClick={()=>setEditing(null)} style={{...btn(false),padding:"8px 18px",fontSize:13}}>Cancel</button></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}} className="form-grid">
        <div style={{marginBottom:16}}><label style={lbl}>Title</label><input value={formData.title} onChange={e=>{set("title",e.target.value);if(editing==="new")set("slug",autoSlug(e.target.value));}} style={inp}/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Slug</label><input value={formData.slug} onChange={e=>set("slug",e.target.value)} style={inp}/></div>
        <div style={{marginBottom:16,gridColumn:"1/-1"}}><label style={lbl}>Address</label><input value={formData.address} onChange={e=>set("address",e.target.value)} style={inp}/></div>
        <div style={{marginBottom:16,gridColumn:"1/-1"}}><label style={lbl}>Description</label><textarea value={formData.description} onChange={e=>set("description",e.target.value)} rows={3} style={{...inp,resize:"vertical"}}/></div>
        <div style={{marginBottom:16}}><label style={lbl}>City</label><select value={formData.city_id} onChange={e=>set("city_id",e.target.value)} style={{...inp,cursor:"pointer"}}>{cities.filter(ct=>ct.is_active).map(ct=><option key={ct.id} value={ct.id}>{ct.name}</option>)}</select></div>
        <div style={{marginBottom:16}}><label style={lbl}>Price (€/mo)</label><input type="number" value={formData.price_per_month} onChange={e=>set("price_per_month",e.target.value)} style={inp}/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Bedrooms</label><input type="number" value={formData.bedrooms} onChange={e=>set("bedrooms",e.target.value)} style={inp} min={1}/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Bathrooms</label><input type="number" value={formData.bathrooms} onChange={e=>set("bathrooms",e.target.value)} style={inp} min={1}/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Area (m²)</label><input type="number" value={formData.sqm} onChange={e=>set("sqm",e.target.value)} style={inp}/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Floor</label><input type="number" value={formData.floor} onChange={e=>set("floor",e.target.value)} style={inp}/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Distance to Uni</label><input value={formData.distance_to_university} onChange={e=>set("distance_to_university",e.target.value)} style={inp} placeholder="e.g. 5 min walk"/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Earliest Move-in</label><input type="date" value={formData.earliest_move_in} onChange={e=>set("earliest_move_in",e.target.value)} style={inp}/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Latest Move-in</label><input type="date" value={formData.latest_move_in||""} onChange={e=>set("latest_move_in",e.target.value)} style={inp}/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Latitude</label><input type="number" step="any" value={formData.latitude} onChange={e=>set("latitude",e.target.value)} style={inp} placeholder="e.g. 35.1575"/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Longitude</label><input type="number" step="any" value={formData.longitude} onChange={e=>set("longitude",e.target.value)} style={inp} placeholder="e.g. 33.3618"/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Status</label><select value={formData.status} onChange={e=>set("status",e.target.value)} style={{...inp,cursor:"pointer"}}>{["available","reserved","occupied","maintenance"].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        <div style={{marginBottom:16}}><label style={lbl}>Lease Options</label><div style={{display:"flex",gap:12,paddingTop:8}}>{["12","24"].map(d=><label key={d} style={{display:"flex",alignItems:"center",gap:6,fontFamily:ff,fontSize:14,cursor:"pointer"}}><input type="checkbox" checked={formData.available_lease_durations?.includes(d)} onChange={e=>set("available_lease_durations",e.target.checked?[...formData.available_lease_durations,d]:formData.available_lease_durations.filter(x=>x!==d))}/>{d} months</label>)}</div></div>
      </div>
      <div style={{marginBottom:16}}><label style={lbl}>Video URL (YouTube)</label><input value={formData.video_url} onChange={e=>set("video_url",e.target.value)} style={inp} placeholder="https://youtube.com/watch?v=..."/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0 16px"}} className="form-grid">
        <div style={{marginBottom:16}}><label style={lbl}>Build Year</label><input value={formData.build_year} onChange={e=>set("build_year",e.target.value)} style={inp}/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Max Occupants</label><input type="number" value={formData.max_occupants} onChange={e=>set("max_occupants",e.target.value)} style={inp}/></div>
        <div style={{marginBottom:16}}><label style={lbl}>Energy Class</label><select value={formData.energy_class} onChange={e=>set("energy_class",e.target.value)} style={{...inp,cursor:"pointer"}}>{["A","B","C","D"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
        <div style={{marginBottom:16}}><label style={lbl}>Property View</label><select value={formData.property_view} onChange={e=>set("property_view",e.target.value)} style={{...inp,cursor:"pointer"}}>{["Urban","Garden","Sea","Mountain","Park"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
      </div>
      <div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap"}}>{[["has_balcony","Balcony"],["is_furnished","Furnished"]].map(([k,l])=><label key={k} style={{display:"flex",alignItems:"center",gap:8,fontFamily:ff,fontSize:14,cursor:"pointer"}}><input type="checkbox" checked={formData[k]} onChange={e=>set(k,e.target.checked)}/>{l}</label>)}</div>
      <div style={{marginBottom:20}}><label style={lbl}>Amenities</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{AMENITIES.map(a=><button key={a} onClick={()=>set("amenities",formData.amenities?.includes(a)?formData.amenities.filter(x=>x!==a):[...(formData.amenities||[]),a])} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${formData.amenities?.includes(a)?P:cc.border}`,background:formData.amenities?.includes(a)?P:"#fff",color:formData.amenities?.includes(a)?"#fff":cc.text,fontFamily:ff,fontSize:13,cursor:"pointer",transition:"all 0.2s"}}>{a}</button>)}</div></div>
      {editing!=="new"&&<div style={{marginBottom:20}}><label style={lbl}>Images</label><div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{flatImgs.map(img=><div key={img.id} style={{position:"relative",width:110,height:80,borderRadius:8,overflow:"hidden",border:img.is_cover?`2px solid ${P}`:`2px solid ${cc.border}`}}><img src={img.image_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/><button onClick={()=>delImg(img)} style={{position:"absolute",top:4,right:4,width:22,height:22,borderRadius:"50%",background:"rgba(239,68,68,0.9)",border:"none",color:"#fff",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={12}/></button>{img.is_cover&&<span style={{position:"absolute",bottom:4,left:4,fontSize:10,padding:"2px 6px",borderRadius:4,background:P,color:"#fff",fontFamily:ff,fontWeight:600}}>Cover</span>}</div>)}<label style={{width:110,height:80,borderRadius:8,border:`2px dashed ${cc.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexDirection:"column",gap:4}}><span style={{display:"flex"}}>{uploading?<Clock size={20} color={cc.muted}/>:<Plus size={20} color={cc.muted}/>}</span><span style={{fontSize:11,fontFamily:ff,color:cc.muted}}>{uploading?"Uploading...":"Add"}</span><input type="file" accept="image/*" multiple onChange={e=>handleImgUpload(e,editing)} style={{display:"none"}} disabled={uploading}/></label></div></div>}
      <div style={{display:"flex",gap:12,justifyContent:"flex-end",paddingTop:16,borderTop:`1px solid ${cc.border}`}}><button onClick={()=>setEditing(null)} style={{...btn(false),padding:"12px 24px"}}>Cancel</button><button onClick={handleSave} disabled={saving} style={{...btn(),padding:"12px 32px",opacity:saving?0.6:1}}>{saving?"Saving...":editing==="new"?"Create Flat":"Save Changes"}</button></div>
    </div></div></div>);
  }

  const TH=h=><th style={{padding:"12px 16px",textAlign:"left",fontSize:12,fontWeight:700,color:cc.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>;
  return(<div style={{paddingTop:80,minHeight:"100vh",background:cc.light}}><div style={{maxWidth:1200,margin:"0 auto",padding:"32px 24px"}}>
    <FadeIn><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28,flexWrap:"wrap",gap:12}}><div><h1 style={{fontFamily:fs,fontSize:28,color:cc.text,margin:0}}>Admin Panel</h1><p style={{fontFamily:ff,fontSize:14,color:cc.muted,marginTop:4}}>Manage listings, bookings, and more</p></div><button onClick={()=>startEdit(null)} style={{...btn(),padding:"12px 28px"}}>+ Add New Flat</button></div></FadeIn>
    <div style={{display:"flex",gap:6,marginBottom:24}}>{[["overview","Overview"],["flats","Flats"],["bookings","Bookings"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{padding:"10px 22px",borderRadius:8,border:`1px solid ${tab===k?P:cc.border}`,background:tab===k?P:"#fff",color:tab===k?"#fff":cc.text,fontFamily:ff,fontSize:14,fontWeight:600,cursor:"pointer"}}>{l}</button>)}</div>

    {tab==="overview"&&<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:16,marginBottom:32}}>{stats.map(s=><div key={s.l} style={{padding:24,borderRadius:14,background:"#fff",border:`1px solid ${cc.border}`,display:"flex",alignItems:"center",gap:16}}><div style={{width:44,height:44,borderRadius:12,background:cc.primaryLight,display:"flex",alignItems:"center",justifyContent:"center"}}>{s.i==="home"?<Home size={22} color={P}/>:s.i==="check"?<CheckCircle size={22} color={P}/>:s.i==="file"?<FileText size={22} color={P}/>:<Clock size={22} color={P}/>}</div><div><div style={{fontFamily:fs,fontSize:28,color:cc.text}}>{s.v}</div><div style={{fontFamily:ff,fontSize:13,color:cc.muted}}>{s.l}</div></div></div>)}</div>
      {bookings.length>0&&<><h3 style={{fontFamily:fs,fontSize:20,color:cc.text,marginBottom:14}}>Recent Bookings</h3><div style={{borderRadius:14,background:"#fff",border:`1px solid ${cc.border}`,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontFamily:ff,fontSize:14}}><thead><tr style={{borderBottom:`2px solid ${cc.border}`}}>{["Tenant","Flat","Lease","Move-in","Status"].map(h=><TH key={h}>{h}</TH>)}</tr></thead><tbody>{bookings.slice(0,5).map(b=><tr key={b.id} style={{borderBottom:`1px solid ${cc.border}`}}><td style={{padding:"12px 16px",color:cc.text,fontWeight:600}}>{b.profiles?.full_name||"—"}</td><td style={{padding:"12px 16px"}}>{b.flats?.title||"—"}</td><td style={{padding:"12px 16px"}}>{b.lease_duration} mo</td><td style={{padding:"12px 16px"}}>{b.move_in_date}</td><td style={{padding:"12px 16px"}}><StatusBadge status={b.status}/></td></tr>)}</tbody></table></div></div></>}
    </>}

    {tab==="flats"&&<div style={{borderRadius:14,background:"#fff",border:`1px solid ${cc.border}`,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontFamily:ff,fontSize:14}}><thead><tr style={{borderBottom:`2px solid ${cc.border}`}}>{["","Flat","City","Price","Beds","Status","Views","Actions"].map(h=><TH key={h}>{h}</TH>)}</tr></thead><tbody>{flats.map(fl=><tr key={fl.id} style={{borderBottom:`1px solid ${cc.border}`}}>
      <td style={{padding:"10px 16px"}}><img src={fl.cover_url||"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=100&h=60&fit=crop"} alt="" style={{width:60,height:40,objectFit:"cover",borderRadius:6}}/></td>
      <td style={{padding:"10px 16px",fontWeight:600,color:cc.text}}>{fl.title}</td>
      <td style={{padding:"10px 16px"}}>{fl.cities?.name||"—"}</td><td style={{padding:"10px 16px",color:P,fontWeight:600}}>€{fl.price_per_month}</td><td style={{padding:"10px 16px"}}>{fl.bedrooms}</td><td style={{padding:"10px 16px"}}><StatusBadge status={fl.status}/></td><td style={{padding:"10px 16px",color:cc.muted}}>{fl.view_count||0}</td>
      <td style={{padding:"10px 16px"}}><div style={{display:"flex",gap:6}}><button onClick={()=>startEdit(fl)} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${cc.border}`,background:"#fff",fontFamily:ff,fontSize:12,cursor:"pointer",color:cc.text}}><Edit size={14} style={{marginRight:4}}/>Edit</button><button onClick={()=>setConfirmDel(fl)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #fecaca",background:"#fef2f2",fontFamily:ff,fontSize:12,cursor:"pointer",color:cc.red}}><Trash2 size={14} style={{marginRight:4}}/>Delete</button></div></td>
    </tr>)}</tbody></table></div></div>}

    {tab==="bookings"&&(bookings.length===0?<div style={{textAlign:"center",padding:60,borderRadius:14,background:"#fff",border:`1px solid ${cc.border}`}}><p style={{fontFamily:ff,color:cc.muted}}>No bookings yet.</p></div>
    :<div style={{borderRadius:14,background:"#fff",border:`1px solid ${cc.border}`,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontFamily:ff,fontSize:14}}><thead><tr style={{borderBottom:`2px solid ${cc.border}`}}>{["Tenant","Flat","Lease","Move-in","Rent","Status","Actions"].map(h=><TH key={h}>{h}</TH>)}</tr></thead><tbody>{bookings.map(b=><tr key={b.id} style={{borderBottom:`1px solid ${cc.border}`}}>
      <td style={{padding:"12px 16px",fontWeight:600,color:cc.text}}>{b.profiles?.full_name||"—"}</td><td style={{padding:"12px 16px"}}>{b.flats?.title||"—"}</td><td style={{padding:"12px 16px"}}>{b.lease_duration} mo</td><td style={{padding:"12px 16px"}}>{b.move_in_date}</td><td style={{padding:"12px 16px",color:P,fontWeight:600}}>€{b.monthly_rent}</td><td style={{padding:"12px 16px"}}><StatusBadge status={b.status}/></td>
      <td style={{padding:"12px 16px"}}>{b.status==="pending"&&<div style={{display:"flex",gap:6}}><button onClick={()=>updateBooking(b,"confirmed")} style={{padding:"5px 10px",borderRadius:6,border:"none",background:cc.green,color:"#fff",fontFamily:ff,fontSize:12,fontWeight:600,cursor:"pointer"}}>Confirm</button><button onClick={()=>updateBooking(b,"cancelled")} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${cc.border}`,background:"#fff",color:cc.red,fontFamily:ff,fontSize:12,cursor:"pointer"}}>Cancel</button></div>}</td>
    </tr>)}</tbody></table></div></div>)}

    {confirmDel&&<Modal onClose={()=>setConfirmDel(null)}><div style={{textAlign:"center",padding:"12px 0"}}><div style={{width:56,height:56,borderRadius:"50%",background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><AlertTriangle size={28} color={cc.red}/></div><h3 style={{fontFamily:fs,fontSize:22,color:cc.text,margin:"0 0 8px"}}>Delete "{confirmDel.title}"?</h3><p style={{fontFamily:ff,fontSize:14,color:cc.muted,margin:"0 0 24px"}}>This cannot be undone.</p><div style={{display:"flex",gap:10,justifyContent:"center"}}><button onClick={()=>setConfirmDel(null)} style={{...btn(false),padding:"10px 24px"}}>Cancel</button><button onClick={()=>handleDelete(confirmDel)} style={{...btn(),padding:"10px 24px",background:cc.red}}>Delete</button></div></div></Modal>}
  </div></div>);
}


function InvestorsPage(){
  const[form,setForm]=useState({name:"",surname:"",phone:"",email:"",comments:""});
  const[submitted,setSubmitted]=useState(false);
  const{showToast}=useContext(AppContext);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const handleSubmit=()=>{if(!form.name||!form.email){showToast("Please fill in name and email","error");return;}setSubmitted(true);showToast("Thank you! We will be in touch soon.");};

  return(<div style={{paddingTop:80,minHeight:"100vh",background:"#fff"}}>
    {/* Hero */}
    <section style={{padding:"80px 24px",background:`linear-gradient(rgba(30,27,75,0.75),rgba(30,27,75,0.75)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&h=600&fit=crop') center/cover`,textAlign:"center"}}>
      <div style={{maxWidth:800,margin:"0 auto"}}>
        <FadeIn><p style={{fontFamily:ff,fontSize:14,fontWeight:600,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Investors</p>
        <h1 style={{fontFamily:fs,fontSize:"clamp(32px,4vw,52px)",color:"#fff",margin:"0 0 20px",lineHeight:1.15}}>Invest With Us</h1>
        <p style={{fontFamily:ff,fontSize:17,lineHeight:1.7,color:"rgba(255,255,255,0.75)",maxWidth:680,margin:"0 auto"}}>Own a student flat near a popular university campus in Greece or Cyprus and enjoy a hassle-free, steady return on your investment.</p></FadeIn>
      </div>
    </section>

    {/* Value proposition */}
    <section style={{padding:"80px 24px",background:"#fff"}}><div style={{maxWidth:900,margin:"0 auto"}}>
      <FadeIn>
        <p style={{fontFamily:ff,fontSize:16,lineHeight:1.8,color:cc.text,marginBottom:20}}>We feature selected investment properties for sale in projects by trusted developers, within walking distance from the most sought-after university campuses in Greece and Cyprus.</p>
        <p style={{fontFamily:ff,fontSize:16,lineHeight:1.8,color:cc.text,marginBottom:20}}>What makes your potential investment truly unique is the fact that when you buy any of our featured properties, we offer you a conditional 4-year rental agreement for your property, securing you a minimum 5% return on your investment.</p>
        <p style={{fontFamily:ff,fontSize:16,lineHeight:1.8,color:cc.text,marginBottom:0}}>We guarantee that your property will be leased by our company and subleased through our platform, offering you a truly hassle-free and hands-off investment journey.</p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:16,marginTop:48}}>
          {[{v:"5%+",l:"Minimum ROI",d:"Guaranteed annual return"},{v:"4yr",l:"Rental Agreement",d:"Conditional lease included"},{v:"100%",l:"Hands-Off",d:"We manage everything"}].map(s=>
            <div key={s.l} style={{padding:28,borderRadius:14,background:cc.light,textAlign:"center",border:`1px solid ${cc.border}`}}>
              <div style={{fontFamily:fs,fontSize:32,fontWeight:700,color:P,marginBottom:4}}>{s.v}</div>
              <div style={{fontFamily:ff,fontSize:15,fontWeight:600,color:cc.text,marginBottom:4}}>{s.l}</div>
              <div style={{fontFamily:ff,fontSize:13,color:cc.muted}}>{s.d}</div>
            </div>
          )}
        </div>
      </FadeIn>
    </div></section>

    {/* Featured Investment */}
    <section style={{padding:"80px 24px",background:cc.light}}><div style={{maxWidth:1000,margin:"0 auto"}}>
      <FadeIn><div style={{textAlign:"center",marginBottom:48}}>
        <h2 style={{fontFamily:fs,fontSize:"clamp(24px,3vw,36px)",color:cc.text,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.03em"}}>Make An Investment</h2>
        <p style={{fontFamily:ff,fontSize:15,color:cc.muted,fontStyle:"italic"}}>Flats For Sale</p>
      </div></FadeIn>

      <FadeIn delay={0.06}>
        <div style={{background:"#fff",borderRadius:16,border:`1px solid ${cc.border}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}} className="hero-grid">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,padding:4}}>
              {["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop","https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=400&h=300&fit=crop","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop","https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop"].map((url,i)=>
                <img key={i} src={url} alt="Investment property" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:i===0?"12px 0 0 0":i===1?"0 12px 0 0":i===2?"0 0 0 12px":"0 0 12px 0",aspectRatio:"4/3"}}/>
              )}
            </div>
            <div style={{padding:32,display:"flex",flexDirection:"column",justifyContent:"center"}}>
              <div style={{fontFamily:ff,fontSize:12,fontWeight:600,color:P,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Investment Project 1</div>
              <h3 style={{fontFamily:fs,fontSize:24,color:cc.text,margin:"0 0 16px"}}>Modern Living in Egkomi</h3>
              <p style={{fontFamily:ff,fontSize:14,lineHeight:1.7,color:cc.muted,margin:"0 0 20px"}}>A contemporary residential building located in Egkomi, just 600m from the University of Nicosia. Comprising 11 well-designed apartments — 2 studios, 8 one-bedroom, and 1 two-bedroom — offering modern living spaces within walking distance of essential amenities and services.</p>
              <p style={{fontFamily:ff,fontSize:14,lineHeight:1.7,color:cc.text,margin:"0 0 20px",fontWeight:500}}>Ideal for investors seeking high ROI with a conditional long-term rental agreement included.</p>
              <a href="https://huaiffaepqdmxufbcgga.supabase.co/storage/v1/object/public/documents/V1-INVESTMENT-PROJECT-OVERVIEW.pdf" target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"10px 24px",borderRadius:8,background:P,color:"#fff",textDecoration:"none",fontFamily:ff,fontSize:14,fontWeight:600,width:"fit-content"}}>Download Project PDF</a>
            </div>
          </div>
        </div>
      </FadeIn>
    </div></section>

    {/* Contact Form */}
    <section style={{padding:"80px 24px",background:"#fff"}}><div style={{maxWidth:600,margin:"0 auto"}}>
      <FadeIn><div style={{textAlign:"center",marginBottom:40}}>
        <h2 style={{fontFamily:fs,fontSize:"clamp(22px,3vw,32px)",color:cc.text,margin:"0 0 8px"}}>Interested in investing?</h2>
        <p style={{fontFamily:ff,fontSize:15,color:cc.muted}}>Fill out the form below and we will get in touch as soon as possible.</p>
      </div></FadeIn>

      {submitted?(<FadeIn><div style={{textAlign:"center",padding:40,borderRadius:16,background:cc.light,border:`1px solid ${cc.border}`}}>
        <h3 style={{fontFamily:fs,fontSize:22,color:cc.text,margin:"0 0 8px"}}>Thank you for your interest!</h3>
        <p style={{fontFamily:ff,fontSize:15,color:cc.muted}}>Our team will contact you shortly to discuss investment opportunities.</p>
      </div></FadeIn>):(
      <FadeIn delay={0.06}><div style={{padding:32,borderRadius:16,border:`1px solid ${cc.border}`}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}} className="form-grid">
          <div><label style={lbl}>Name</label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Your name" style={inp}/></div>
          <div><label style={lbl}>Surname</label><input value={form.surname} onChange={e=>set("surname",e.target.value)} placeholder="Your surname" style={inp}/></div>
          <div><label style={lbl}>Phone Number</label><input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+30 or +357" style={inp}/></div>
          <div><label style={lbl}>Email</label><input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="you@email.com" style={inp}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Comments (optional)</label><textarea value={form.comments} onChange={e=>set("comments",e.target.value)} rows={4} placeholder="Tell us about your investment interests..." style={{...inp,resize:"vertical"}}/></div>
        </div>
        <button onClick={handleSubmit} style={{...btn(),width:"100%",justifyContent:"center",padding:"14px",fontSize:16,borderRadius:10,marginTop:20}}>Submit Interest</button>
      </div></FadeIn>)}
    </div></section>
    <Footer/>
  </div>);
}

function AboutPage(){return(<div style={{paddingTop:80,minHeight:"100vh",background:"#fff"}}><div style={{maxWidth:800,margin:"0 auto",padding:"60px 24px"}}><FadeIn>
  <h2 style={{fontFamily:fs,fontSize:"clamp(24px,3vw,36px)",color:cc.text,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.03em"}}>Student Housing Simplified</h2><p style={{fontFamily:ff,fontSize:15,color:cc.muted,fontStyle:"italic",margin:"0 0 28px"}}>My Student Flat</p>
  <p style={{fontFamily:ff,fontSize:16,lineHeight:1.8,color:cc.text,marginBottom:20}}>MyStudentFlat.com was created in the summer of 2025 to take the stress, disappointment, and guesswork out of finding student accommodation.</p>
  <p style={{fontFamily:ff,fontSize:16,lineHeight:1.8,color:cc.text,marginBottom:20}}>We know how frustrating it is to spend hours searching for a place, only to discover it's already taken — or worse, that it looks nothing like the photos. That's why we built a platform that does things differently.</p>
  <p style={{fontFamily:ff,fontSize:16,lineHeight:1.8,color:cc.text,marginBottom:20}}>At MyStudentFlat, we hand-pick new, modern flats located just steps from university campuses in Greece and Cyprus, and we verify their real availability. Every flat is fully furnished, fully equipped, and ready to move in — exactly as shown.</p>
  <p style={{fontFamily:ff,fontSize:16,lineHeight:1.8,color:cc.text,marginBottom:20}}>With online booking, payment, and digital contract signing, you can secure your new home in minutes, from anywhere in the world. We make sure what you see is exactly what you get.</p>
  <div style={{padding:28,borderRadius:14,background:Pd,marginTop:32}}><h3 style={{fontFamily:fs,fontSize:20,color:"#fff",margin:"0 0 8px"}}>What you see is what you get.</h3><p style={{fontFamily:ff,fontSize:15,lineHeight:1.6,color:"rgba(255,255,255,0.7)",margin:0}}>Verified, modern flats near campus — with real availability, true-to-life photos, and no last-minute surprises.</p></div>
</FadeIn></div><Footer/></div>);}

function FAQPage(){const[open,setOpen]=useState(null);const faqs=[{q:"How does MyStudentFlat work?",a:"Browse our verified listings, select a flat, choose your lease duration (12 or 24 months) and move-in date, then book online. You'll receive a digital rental agreement to e-sign."},{q:"Are the photos real?",a:"Yes! We verify every listing in person. What you see is exactly what you'll get."},{q:"What's included in the rent?",a:"All flats come fully furnished with essentials like washing machine, AC, WiFi, and kitchen equipment."},{q:"Can I book from abroad?",a:"Absolutely. Our entire process is 100% online — from browsing to signing your rental agreement."},{q:"What lease durations are available?",a:"We offer 12-month and 24-month leases, designed for academic year cycles."},{q:"What cities do you operate in?",a:"Currently Nicosia, Limassol (Cyprus) and Athens (Greece). Paphos and Thessaloniki coming soon."},{q:"Do you offer cleaning services?",a:"Yes! Optional cleaning services available through our tenant app after moving in."}];
  return(<div style={{paddingTop:80,minHeight:"100vh",background:"#fff"}}><div style={{maxWidth:700,margin:"0 auto",padding:"60px 24px"}}>
    <FadeIn><h2 style={{fontFamily:fs,fontSize:"clamp(24px,3vw,36px)",color:cc.text,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.03em"}}>FAQ</h2><p style={{fontFamily:ff,fontSize:15,color:cc.muted,fontStyle:"italic",margin:"0 0 32px"}}>Frequently Asked Questions</p></FadeIn>
    {faqs.map((fq,i)=>(<FadeIn key={i} delay={i*0.04}><div style={{marginBottom:8,borderRadius:12,border:`1px solid ${cc.border}`,background:"#fff",overflow:"hidden"}}><button onClick={()=>setOpen(open===i?null:i)} style={{width:"100%",padding:"18px 22px",background:"none",border:"none",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",textAlign:"left"}}><span style={{fontFamily:ff,fontSize:15,fontWeight:600,color:cc.text}}>{fq.q}</span><span style={{fontSize:18,color:cc.muted,transition:"transform 0.2s",transform:open===i?"rotate(45deg)":"none"}}>+</span></button>{open===i&&<div style={{padding:"0 22px 18px"}}><p style={{fontFamily:ff,fontSize:15,lineHeight:1.7,color:cc.text,margin:0}}>{fq.a}</p></div>}</div></FadeIn>))}
  </div><Footer/></div>);
}


function TermsPage(){
  const S=({children})=><h2 style={{fontFamily:fs,fontSize:18,color:cc.text,margin:"28px 0 12px"}}>{children}</h2>;
  const P=({children})=><p style={{fontFamily:ff,fontSize:14,lineHeight:1.8,color:cc.text,margin:"0 0 12px"}}>{children}</p>;
  const Li=({children})=><li style={{fontFamily:ff,fontSize:14,lineHeight:1.8,color:cc.text,marginBottom:8}}>{children}</li>;
  return(<div style={{paddingTop:80,minHeight:"100vh",background:"#fff"}}><div style={{maxWidth:800,margin:"0 auto",padding:"60px 24px"}}>
    <FadeIn>
    <h1 style={{fontFamily:fs,fontSize:"clamp(28px,3.5vw,40px)",color:cc.text,margin:"0 0 24px",textTransform:"uppercase",letterSpacing:"0.03em"}}>Terms and Conditions</h1>
    <div style={{padding:20,borderRadius:12,background:cc.light,border:`1px solid ${cc.border}`,marginBottom:24}}>
      <P><strong>Legal Notice</strong></P>
      <P>Legal entities operating under the "MY STUDENT FLAT" brand in Cyprus and Greece:</P>
      <P><strong>Cyprus</strong><br/>REPURPOSE TRAVEL & REALTY LTD<br/>95 ARCH MAKARIOS AVENUE<br/>1070 NICOSIA, CYPRUS</P>
      <P><strong>Greece</strong><br/>REPURPOSE TRAVEL & REALTY GR M.I.K.E.<br/>3 LEKKA STREET, ATHENS 10563, GREECE</P>
    </div>
    <P>The terms and conditions set out in this document ("Terms") together with the confirmation email ("Confirmation Email") provided to you for leasing the Property from the Company form the contract between you, the Guest, and the Company ("Booking").</P>
    <P><strong>By booking any property with MY STUDENT FLAT you accept the following terms & conditions:</strong></P>

    <S>1. Payment & Security Deposit</S>
    <ol style={{paddingLeft:20}}><Li><strong>Rent:</strong> Rent payments shall be made as specified in the payment plan outlined in booking confirmation.</Li>
    <Li><strong>Security Deposit:</strong> The security deposit depends on the duration, as mutually agreed upon booking the property. It must be paid to the Lessor at the time of booking. The deposit will be refunded within 60 days from the Lease expiration, provided the property remains in good condition (excluding normal wear and tear) and all outstanding invoices are cleared. If the Lessee breaches the Lease terms, the deposit is forfeited. The deposit cannot be used as rent payment.</Li>
    <Li><strong>Accounts & Other Charges:</strong> All charges shall be payable per the payment plan.</Li>
    <Li><strong>Platform Fee:</strong> The Platform fee is applicable in all bookings, payable at the time of booking the property. If the Lease is extended beyond 12 months, a proportional booking fee applies.</Li>
    <Li><strong>Late Payment:</strong> Rent payments not received within 3 days of the due date will incur a daily late fee of 0.25% on the total rental amount.</Li></ol>

    <S>2. Cancellation Policy</S>
    <ol style={{paddingLeft:20}}><Li>Cancellations received via email, at least 60 days before the Lease Start Date will get a full refund of the rent & Security deposit.</Li>
    <Li>Cancellations received via email, 59-31 days before the Lease Start Date will get an 80% refund of the rent & 100% Refund of the Security deposit.</Li>
    <Li>Cancellations received via email, 30 days or less before the Lease Start Date will get a 50% refund of the rent & 100% Refund of the Security deposit.</Li>
    <Li>In any cancellation, the Platform fee is non-refundable.</Li>
    <Li>Any cancellation must be received via email at: clientsupport@mystudentflat.com</Li></ol>

    <S>3. Early Termination & Lease Extension</S>
    <ol style={{paddingLeft:20}}><Li><strong>Early Termination:</strong> If the Lessee wishes to terminate this agreement early, they must provide at least 30 days' notice. In such cases, the rent paid for the specific 12 month rental period is forfeited as cancellation fees.</Li>
    <Li><strong>Lease Extension:</strong> The Lessee must notify MY STUDENT FLAT via email at least 30 days before the lease ends. Extensions are subject to availability & possible rent adjustments.</Li>
    <Li>All inquiries must be received via email at: clientsupport@mystudentflat.com</Li></ol>

    <S>4. Cleaning & Maintenance</S>
    <ol style={{paddingLeft:20}}><Li><strong>Use of Property:</strong> The Lessor covers repairs and maintenance of structural elements. The Lessee is responsible for any damage caused by misuse and must report issues promptly.</Li>
    <Li><strong>Repairs & Maintenance:</strong> All maintenance requests must be submitted via the MY STUDENT FLAT Application or via email to maintenance@mystudentflat.com. Emergency support is available 24/7.</Li>
    <Li><strong>Move-Out Cleaning:</strong> A cleaning fee is charged upon Lease expiration to restore the property's condition.</Li>
    <Li><strong>Bills:</strong> The Lessee is responsible for utility bills. Any discrepancies in estimated vs. actual expenses must be settled at the Lease's end.</Li></ol>

    <S>5. Use of Premises</S>
    <ol style={{paddingLeft:20}}><Li><strong>Occupancy:</strong> The property is for residential use only. The maximum occupancy is two individuals per bedroom.</Li>
    <Li><strong>Building Regulations:</strong> All residents and their guests must comply with each building's rules at all times.</Li>
    <Li><strong>Subleasing:</strong> Subleasing is strictly prohibited.</Li></ol>

    <S>6. Relocation</S>
    <ol style={{paddingLeft:20}}><Li><strong>Relocation Clause:</strong> Upon mutual agreement, the Lessee may relocate to another property, terminating the existing Lease and initiating a new one.</Li>
    <Li><strong>Lessor Termination:</strong> If the Lessor terminates the Lease, they must either compensate the Lessee for the remaining period or offer alternative accommodation.</Li></ol>

    <S>7. Code of Conduct</S>
    <ol style={{paddingLeft:20}}><Li><strong>Property access:</strong> Check-in time starts at 15:00 and check-out time is set at 11:00. Alternative arrangements require prior agreement.</Li>
    <Li><strong>Rental Inspections & Visits:</strong> The Lessor may inspect the property with 72-48 hours notice. Prospective guests may visit the property in the last 60 days of a Lease.</Li>
    <Li><strong>Smoking Policy:</strong> Smoking is prohibited inside all apartments. Cleaning costs will be deducted from the deposit if smoking occurs.</Li>
    <Li><strong>Pet Policy:</strong> Pets are welcome unless otherwise specified. An additional pet security deposit equivalent to 1/2 month's rent is required.</Li>
    <Li><strong>Keys & Access Cards:</strong> The Lessee receives two sets of keys. Lost keys must be replaced at Lessee's expense.</Li>
    <Li><strong>Illegal Activity:</strong> Any unlawful activity results in immediate Lease termination.</Li>
    <Li><strong>Termination Right:</strong> The Lessor may terminate the Lease for property damage, unpaid rent exceeding 15 days, or inappropriate conduct.</Li>
    <Li><strong>Eviction:</strong> The Lessee must vacate at Lease end. Failure to do so may result in removal of belongings after a one-week notice.</Li></ol>

    <S>8. Valuables & Liability</S>
    <ol style={{paddingLeft:20}}><Li><strong>Personal Property:</strong> The Lessor is not liable for loss or damage to the Lessee's belongings.</Li>
    <Li><strong>Lessor's Liability:</strong> The Lessor is not liable for damages arising from third-party actions, unforeseeable events, or force majeure.</Li>
    <Li><strong>Damage Reimbursement:</strong> The Lessee must reimburse the Lessor for any damage caused before Lease expiration.</Li>
    <Li><strong>Appendices:</strong> Any Lease appendices are valid only written via email at clientsupport@mystudentflat.com</Li></ol>

    <div style={{padding:16,borderRadius:10,background:"#fef3c7",border:"1px solid #fde68a",marginTop:24}}>
      <P><strong>* The advertised prices are for a 12-month lease on full prepayment basis.</strong></P>
      <P><strong>* Cash payments exceeding 500 Euro are not accepted.</strong></P>
      <P>Utility costs (Wi-Fi, fees, electricity, water, heating) are estimated and not included in rent. Utility prepayment is adjusted at lease end based on actual use.</P>
    </div>
    </FadeIn>
  </div><Footer/></div>);
}


function PrivacyPage(){
  const S=({children})=><h2 style={{fontFamily:fs,fontSize:18,color:cc.text,margin:"28px 0 12px"}}>{children}</h2>;
  const P2=({children})=><p style={{fontFamily:ff,fontSize:14,lineHeight:1.8,color:cc.text,margin:"0 0 12px"}}>{children}</p>;
  return(<div style={{paddingTop:80,minHeight:"100vh",background:"#fff"}}><div style={{maxWidth:800,margin:"0 auto",padding:"60px 24px"}}>
    <FadeIn>
    <h1 style={{fontFamily:fs,fontSize:"clamp(28px,3.5vw,40px)",color:cc.text,margin:"0 0 24px",textTransform:"uppercase",letterSpacing:"0.03em"}}>Privacy Policy</h1>

    <P2>This Privacy and Cookie Statement of REPURPOSE TRAVEL & REALTY LTD applies to you when you register as a house seeker, respond to our housing offer, rent a living space with us, use our service portal, or visit our website www.mystudentflat.com or contact us.</P2>

    <div style={{padding:20,borderRadius:12,background:cc.light,border:`1px solid ${cc.border}`,marginBottom:24}}>
      <P2><strong>Contact</strong></P2>
      <P2>REPURPOSE TRAVEL & REALTY LTD<br/>25 Aphroditis Street<br/>1060 Nicosia, CYPRUS<br/>info@mystudentflat.com<br/>+357 96237867</P2>
    </div>

    <S>Personal Data That We Process</S>
    <P2><strong>Flat Seekers:</strong> To book a flat through our website, you must register as a house seeker. We ask you to fill in personal details including your first name, last name, gender, date of birth, type of study, language, address, telephone number and living preferences. You create a password to log in using your email address. We record when you booked and which flat it concerns. We may also record communication between you and our employees.</P2>
    <P2><strong>Tenants:</strong> If you rent a flat from us, we may also process: date of your rental contract, additional services you use, repair requests, correspondence, rent payments, data about rent arrears, keys given, log data of digital keys, complaints and mediation data.</P2>
    <P2><strong>Newsletters:</strong> We process your email address to send newsletters about available flats matching your preferences.</P2>
    <P2><strong>Website Users:</strong> We may record data about the device and browser you use (device type, operating system, browser type, IP address). We use cookies as described below.</P2>

    <S>Purpose of Processing</S>
    <P2>Your personal data is processed for: offering matching flats and services, contacting you about bookings, executing lease contracts, collecting payments, offering additional services, sending updates and newsletters, handling requests and complaints, carrying out maintenance, complying with legislation, enforcing house rules, improving our services, and protecting our operations.</P2>

    <S>Legal Basis</S>
    <P2>We process personal data based on: execution of an agreement, legal obligation, legitimate interest, or your consent. You can withdraw consent at any time by contacting us.</P2>

    <S>Disclosure to Third Parties</S>
    <P2>We may provide your data to third parties when necessary to provide services, including IT and cloud service providers, website hosts, newsletter service providers, property owners or managers, external service providers, and competent authorities when legally required.</P2>

    <S>Data Retention</S>
    <P2>We process your data as long as you are registered as a flat seeker or have a rental agreement. After unsubscribing, data is stored for maximum 1 year. After lease cancellation, lease data is stored for at least 3 years. Other data may be stored for 2 years unless legally required otherwise.</P2>

    <S>Data Security</S>
    <P2>We take the protection of your data seriously with appropriate measures including security software, secure internet connections, and restricted access to authorized personnel only. If you believe your data is not well secured, contact us at info@mystudentflat.com.</P2>

    <S>Your Rights</S>
    <P2>You have the right to access, correct, or delete your personal data. You can revoke consent, object to processing, or request data transfer. Send requests to info@mystudentflat.com. We will respond within four weeks.</P2>

    <S>Cookie Statement</S>
    <P2>We use cookies on our website. A cookie is a small file stored by your browser on your device.</P2>
    <P2><strong>Necessary cookies:</strong> Help us recognize you on return visits and remember your preferences and consent choices.</P2>
    <P2><strong>Session cookies:</strong> Track which parts of the website you view during your visit. Automatically deleted when you close your browser.</P2>
    <P2><strong>Tracking cookies:</strong> With your consent, used to build a profile of your online behavior to show relevant content. Not linked to your personal details.</P2>
    <P2><strong>Google Analytics:</strong> Used to track and receive reports on how visitors use the website. Information is anonymized as much as possible.</P2>
    <P2><strong>Social media:</strong> Our website features buttons from Facebook, Instagram, YouTube and other platforms. These place their own cookies. Read their respective privacy statements for details.</P2>

    <P2 style={{marginTop:24,fontStyle:"italic",color:cc.muted}}>This Privacy Statement was last amended on August 2025.</P2>
    </FadeIn>
  </div><Footer/></div>);
}

export default function App(){
  const[page,setPage]=useState("home");const[pp,setPp]=useState({});const[user,setUser]=useState(null);const[profile,setProfile]=useState(null);const[flats,setFlats]=useState([]);const[cities,setCities]=useState([]);const[images,setImages]=useState([]);const[bookings,setBookings]=useState([]);const[loading,setLoading]=useState(true);const[toast,setToast]=useState(null);
  const navigate=useCallback((pg,params={})=>{setPage(pg);setPp(params);window.scrollTo({top:0,behavior:"smooth"});},[]);
  const showToast=useCallback((msg,type="success")=>setToast({message:msg,type}),[]);
  useEffect(()=>{(async()=>{try{if(supabase.restoreSession()){await supabase.refreshSession();if(supabase.user){setUser(supabase.user);try{setProfile(await supabase.query("profiles",{filters:[`id=eq.${supabase.user.id}`],single:true}));}catch{}}}
    const[ci,fl,im]=await Promise.all([supabase.query("cities",{order:"name.asc"}),supabase.query("flats",{select:"*,cities(name,country)",order:"is_featured.desc,created_at.desc"}),supabase.query("flat_images",{order:"sort_order.asc"})]);
    setCities(ci);setImages(im);setFlats(fl.map(f=>{const cover=im.find(i=>i.flat_id===f.id&&i.is_cover);return{...f,cover_url:cover?.image_url||im.find(i=>i.flat_id===f.id)?.image_url||"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=500&fit=crop"};}));
    if(supabase.user){try{setBookings(await supabase.query("bookings",{select:"*,profiles(full_name,email),flats(title)",order:"created_at.desc"}));}catch{}}
  }catch(e){console.error("Init:",e);}setLoading(false);})();},[]);
  useEffect(()=>{if(user&&profile?.role==="admin")supabase.query("bookings",{select:"*,profiles(full_name,email),flats(title)",order:"created_at.desc"}).then(setBookings).catch(()=>{});},[user,profile]);
  const ctx={user,setUser,profile,setProfile,flats,setFlats,cities,images,setImages,bookings,setBookings,navigate,page,showToast};
  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#fff"}}><div style={{textAlign:"center"}}><img src={LOGO} alt="Loading" style={{height:44,marginBottom:16,animation:"pulse 1.5s infinite"}}/><p style={{fontFamily:ff,color:cc.muted}}>Loading...</p></div></div>;
  return(<AppContext.Provider value={ctx}>
    <style>{`*,*::before,*::after{box-sizing:border-box;margin:0}body{margin:0;overflow-x:hidden}::selection{background:${P};color:white}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}@media(max-width:768px){.hero-grid,.detail-grid{grid-template-columns:1fr!important}.hero-img{display:none!important}.nav-desktop{display:none!important}.nav-mobile-btn{display:block!important}.listings-grid{grid-template-columns:1fr!important}.form-grid{grid-template-columns:1fr!important}.details-grid{grid-template-columns:1fr 1fr!important}}@media(min-width:769px){.nav-mobile-btn{display:none!important}}`}</style>
    <Navbar/>{toast&&<Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    {page==="home"&&<HomePage/>}{page==="listings"&&<ListingsPage initialCity={pp.city}/>}{page==="flat"&&<FlatDetailPage flatId={pp.id}/>}{page==="admin"&&<AdminPage/>}{page==="investors"&&<InvestorsPage/>}{page==="about"&&<AboutPage/>}{page==="faq"&&<FAQPage/>}{page==="terms"&&<TermsPage/>}{page==="privacy"&&<PrivacyPage/>}
  </AppContext.Provider>);
}
