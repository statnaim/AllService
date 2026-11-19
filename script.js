/* Khulna Local Service - Frontend
   Replace API_URL with the deployed Apps Script Web App URL ending in /exec.
*/
const API_URL = "https://script.google.com/macros/s/AKfycbyKAFdTNDY2Eipr_fPFTjG0W0KZw5sfZiIzKVp3nbnZl0o1Bdm15yuv8gNqPdRH6m2K/exec";
const CATEGORIES = ["ইলেকট্রিশিয়ান","প্লাম্বার","এসি মেকানিক","ফ্রিজ মেকানিক","টিভি মেকানিক","মোবাইল সার্ভিসিং","কম্পিউটার সার্ভিসিং","টাইলস মিস্ত্রি","রাজমিস্ত্রি","কাঠমিস্ত্রি","রং মিস্ত্রি","ওয়েল্ডিং মিস্ত্রি","থাই অ্যালুমিনিয়াম মিস্ত্রি","গ্যাস মিস্ত্রি","পানির মোটর মেকানিক","ক্লিনিং সার্ভিস","বাসা-বাড়ি মেরামত","অন্যান্য"];
const UPAZILAS = ["খুলনা সদর","সোনাডাঙ্গা","খালিশপুর","দৌলতপুর","আড়ংঘাটা","হরিণটানা","বটিয়াঘাটা","দাকোপ","দিঘলিয়া","ডুমুরিয়া","কয়রা","পাইকগাছা","ফুলতলা","তেরখাদা","রূপসা","অন্য"];
const AREAS = ["সোনাডাঙ্গা","শিববাড়ি","নিউ মার্কেট","খালিশপুর","দৌলতপুর","রয়্যাল মোড়","গল্লামারী","বয়রা","ময়লাপোতা","রূপসা","অন্যান্য"];
let technicians = [];
let adminPassword = "";
let adminStatus = "Pending";

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const apiReady = () => API_URL.startsWith("https://script.google.com/") && !API_URL.includes("PASTE_");
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const digits = value => String(value || "").replace(/\D/g,"");
const money = value => Number.isFinite(Number(value)) ? `৳${Number(value).toLocaleString("bn-BD")}` : "আলোচনা সাপেক্ষে";
const normalizePhone = value => {
  let n = digits(value);
  if (n.startsWith("8801") && n.length === 13) n = "0" + n.slice(3);
  if (n.startsWith("1") && n.length === 10) n = "0" + n;
  return n;
};
const validPhone = value => /^01[3-9]\d{8}$/.test(normalizePhone(value));
const phoneLink = value => {
  const n = normalizePhone(value);
  return n.startsWith("0") ? "+88" + n : n;
};
function showMessage(el, message, type="") { el.textContent = message; el.className = `form-message ${type}`; }
function populateSelect(select, values, firstLabel) {
  select.innerHTML = `<option value="">${escapeHTML(firstLabel)}</option>` + values.map(v=>`<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");
}
function initOptions() {
  populateSelect($("#formCategory"), CATEGORIES, "সার্ভিস নির্বাচন করুন");
  populateSelect($("#filterCategory"), CATEGORIES.filter(x=>x!=="অন্যান্য"), "সব সার্ভিস");
  populateSelect($("#filterUpazila"), UPAZILAS.filter(x=>x!=="অন্য"), "সব উপজেলা / থানা");
}
async function apiPost(payload) {
  if (!apiReady()) throw new Error("প্রথমে script.js ফাইলে API_URL বসান।");
  // text/plain avoids a browser CORS preflight for Apps Script web apps.
  const response = await fetch(API_URL, {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify(payload), redirect:"follow"});
  if (!response.ok) throw new Error("সার্ভারের সঙ্গে যোগাযোগ করা যায়নি ("+response.status+")");
  const data = await response.json();
  if (!data.ok) throw new Error(data.message || "অনুরোধটি সম্পন্ন হয়নি।");
  return data;
}
function apiGet(params={}) {
  return new Promise((resolve,reject)=>{
    if (!apiReady()) return reject(new Error("প্রথমে script.js ফাইলে API_URL বসান।"));
    const callback = "kls_cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const timer = setTimeout(()=>finish(new Error("সার্ভার থেকে উত্তর পাওয়া যায়নি।")),15000);
    function finish(error,data) {
      clearTimeout(timer); delete window[callback]; script.remove();
      error ? reject(error) : resolve(data);
    }
    window[callback] = data => {
      if (!data || !data.ok) return finish(new Error(data?.message || "তথ্য লোড করা যায়নি।"));
      finish(null,data);
    };
    const query = new URLSearchParams({...params,callback});
    script.src = API_URL + (API_URL.includes("?")?"&":"?") + query.toString();
    script.onerror = ()=>finish(new Error("API লোড করা যায়নি। URL ও deployment access পরীক্ষা করুন।"));
    document.head.appendChild(script);
  });
}
function getPhoto(t) { return t.photoUrl || t.PhotoURL || ""; }
function getName(t) { return t.fullName || t.FullName || ""; }
function getMobile(t) { return t.mobile || t.Mobile || ""; }
function getCategory(t) { return t.category || t.Category || ""; }
function getCharge(t) { return t.charge ?? t.Charge ?? ""; }
function getLocation(t) { return t.location || t.Location || ""; }
function getExperience(t) { return t.experience ?? t.Experience ?? ""; }
function getDescription(t) { return t.description || t.Description || ""; }
function avatarHTML(t, extra="") {
  const photo = getPhoto(t);
  return photo ? `<img class="avatar ${extra}" src="${escapeHTML(photo)}" alt="${escapeHTML(getName(t))}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'avatar avatar-fallback',textContent:'👨‍🔧'}))">` : `<div class="avatar avatar-fallback ${extra}">👨‍🔧</div>`;
}
function renderCards(list) {
  const grid=$("#technicianGrid");
  $("#resultCount").textContent = `${list.length.toLocaleString("bn-BD")} জন মিস্ত্রি পাওয়া গেছে`;
  if (!list.length) { grid.innerHTML='<div class="empty-state">এই শর্তে কোনো মিস্ত্রি পাওয়া যায়নি। অন্যভাবে সার্চ করুন।</div>'; return; }
  grid.innerHTML=list.map((t,i)=>`<article class="technician-card">
    <div class="card-top">${avatarHTML(t)}<div><h3 class="card-name">${escapeHTML(getName(t))}</h3><div class="card-category">${escapeHTML(getCategory(t))}</div></div></div>
    <div class="card-body"><div class="card-charge">${money(getCharge(t))} <small>${escapeHTML(t.chargeType || t.ChargeType || "")}</small></div>
      <div class="card-meta"><span>📍 ${escapeHTML(getLocation(t))}</span><span>🧰 ${escapeHTML(getExperience(t) || "উল্লেখ নেই")} বছর</span></div>
      <p class="card-desc">${escapeHTML(getDescription(t) || "সার্ভিস সম্পর্কে বিস্তারিত জানতে সরাসরি যোগাযোগ করুন।")}</p></div>
    <div class="card-actions"><button class="btn btn-outline details-btn" data-index="${i}">বিস্তারিত</button><a class="btn btn-call" href="tel:${escapeHTML(phoneLink(getMobile(t)))}">☎ কল করুন</a></div>
  </article>`).join("");
  $$(".details-btn",grid).forEach(btn=>btn.addEventListener("click",()=>openDetails(list[Number(btn.dataset.index)])));
}
function filteredTechnicians() {
  const q=$("#searchInput").value.trim().toLocaleLowerCase("bn");
  const category=$("#filterCategory").value, district=$("#filterDistrict").value, upazila=$("#filterUpazila").value;
  const loc=$("#filterLocation").value.trim().toLocaleLowerCase("bn");
  const min=$("#minCharge").value===""?null:Number($("#minCharge").value);
  const max=$("#maxCharge").value===""?null:Number($("#maxCharge").value);
  const exp=$("#filterExperience").value===""?null:Number($("#filterExperience").value);
  let list=technicians.filter(t=>{
    const hay=[getName(t),getCategory(t),getMobile(t),getLocation(t),getDescription(t),t.upazila||t.Upazila,t.district||t.District].join(" ").toLocaleLowerCase("bn");
    const charge=Number(getCharge(t)), experience=Number(getExperience(t)||0);
    return (!q||hay.includes(q)) && (!category||getCategory(t)===category) &&
      (!district||(t.district||t.District)===district) && (!upazila||(t.upazila||t.Upazila)===upazila) &&
      (!loc||[getLocation(t),t.upazila||t.Upazila].join(" ").toLocaleLowerCase("bn").includes(loc)) &&
      (min===null||charge>=min) && (max===null||charge<=max) && (exp===null||experience>=exp);
  });
  const sort=$("#sortBy").value;
  if(sort==="low") list.sort((a,b)=>Number(getCharge(a))-Number(getCharge(b)));
  if(sort==="high") list.sort((a,b)=>Number(getCharge(b))-Number(getCharge(a)));
  if(sort==="newest") list.sort((a,b)=>new Date(b.createdAt||b.CreatedAt||0)-new Date(a.createdAt||a.CreatedAt||0));
  return list;
}
function applyFilters(){renderCards(filteredTechnicians());}
async function loadDirectory() {
  $("#technicianGrid").innerHTML='<div class="loading-state">মিস্ত্রিদের তথ্য লোড হচ্ছে...</div>';
  $("#dataStatus").textContent="সার্ভারের সঙ্গে সংযোগ করা হচ্ছে...";
  try {
    const data=await apiGet({action:"list"});
    technicians=Array.isArray(data.technicians)?data.technicians:[];
    $("#dataStatus").textContent="সর্বশেষ তথ্য দেখানো হচ্ছে";
    applyFilters();
  } catch(err) {
    $("#technicianGrid").innerHTML=`<div class="empty-state">${escapeHTML(err.message)}<br><button class="btn btn-outline" id="retryLoad" style="margin-top:12px">আবার চেষ্টা করুন</button></div>`;
    $("#resultCount").textContent="তথ্য পাওয়া যায়নি"; $("#dataStatus").textContent="সংযোগ সমস্যা";
    $("#retryLoad")?.addEventListener("click",loadDirectory);
  }
}
function openDetails(t) {
  const modal=$("#detailsModal"), mobile=phoneLink(getMobile(t));
  const whatsapp=normalizePhone(t.whatsapp||t.WhatsApp||"");
  $("#modalContent").innerHTML=`<div class="modal-profile">${avatarHTML(t)}<h3 id="modalName">${escapeHTML(getName(t))}</h3><div class="card-category">${escapeHTML(getCategory(t))}</div></div>
  <div class="modal-info">
    <div><b>মোবাইল</b><br>${escapeHTML(getMobile(t))}</div>
    <div><b>কাজের চার্জ</b><br>${money(getCharge(t))}</div>
    <div><b>এলাকা</b><br>${escapeHTML(getLocation(t))}</div>
    <div><b>অভিজ্ঞতা</b><br>${escapeHTML(getExperience(t))} বছর</div>
    <div><b>WhatsApp</b><br>${whatsapp?escapeHTML(whatsapp):"দেওয়া হয়নি"}</div>
  </div>
  <a class="btn btn-primary btn-block" href="tel:${escapeHTML(mobile)}">☎ এখনই কল করুন</a>
  ${whatsapp?`<a class="btn btn-outline btn-block" target="_blank" rel="noopener" href="https://wa.me/88${escapeHTML(whatsapp)}">WhatsApp করুন</a>`:""}`;
  modal.classList.remove("hidden"); document.body.style.overflow="hidden";
}
function closeModal(){ $("#detailsModal").classList.add("hidden");document.body.style.overflow=""; }
function fileToBase64(file) {
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=()=>reject(new Error("ছবি পড়া যায়নি।"));reader.readAsDataURL(file);});
}
async function submitJoin(event) {
  event.preventDefault();
  const form=event.currentTarget, btn=$("#submitBtn"), message=$("#formMessage");
  if(!form.reportValidity()) return;
  const fd=new FormData(form);
  const mobile=normalizePhone(fd.get("mobile"));
  const whatsapp=String(fd.get("whatsapp")||"").trim();
  if(!validPhone(mobile)){
    showMessage(message,"সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01XXXXXXXXX)।","error");
    form.elements.mobile.focus(); return;
  }
  if(whatsapp && !validPhone(whatsapp)){
    showMessage(message,"WhatsApp নম্বরটি সঠিক নয়।","error");
    form.elements.whatsapp.focus(); return;
  }
  if(fd.get("category")==="অন্যান্য" && !String(fd.get("otherService")||"").trim()){
    showMessage(message,"অন্যান্য সার্ভিসের নাম লিখুন।","error"); return;
  }
  btn.disabled=true; btn.textContent="জমা হচ্ছে...";
  showMessage(message,"আপনার তথ্য জমা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন।");
  try {
    const payload={
      action:"submit",
      fullName:String(fd.get("fullName")||"").trim(),
      mobile,
      category:String(fd.get("category")||""),
      otherService:String(fd.get("otherService")||"").trim(),
      charge:Number(fd.get("charge")),
      location:String(fd.get("location")||"").trim(),
      experience:Number(fd.get("experience")),
      whatsapp:whatsapp?normalizePhone(whatsapp):"",
      // Submit করার আগে উপরের প্রকাশ-সংক্রান্ত নোটিশ দেখানো হয়েছে।
      consent:true
    };
    const result=await apiPost(payload);
    form.reset();
    $("#otherServiceWrap").classList.add("hidden");
    showMessage(message,result.message||"আপনার তথ্য সফলভাবে জমা হয়েছে এবং এখনই ওয়েবসাইটে প্রকাশিত হয়েছে।","success");
    await loadDirectory();
  } catch(err) {
    showMessage(message,err.message||"তথ্য জমা দেওয়া যায়নি। আবার চেষ্টা করুন।","error");
  } finally {
    btn.disabled=false; btn.textContent="তথ্য জমা দিন";
  }
}
function setupAdmin() {
  const show=location.hash==="#admin";
  $("#admin").hidden=!show;
  if(show) $("#admin").scrollIntoView({behavior:"smooth"});
}
async function adminRequest(action, extra={}) { return apiPost({action,adminPassword,...extra}); }
async function adminLogin(e) {
  e.preventDefault();adminPassword=$("#adminPassword").value;
  try{await adminRequest("adminList",{status:"Pending"});$("#adminLogin").hidden=true;$("#adminPanel").hidden=false;await loadAdminRows("Pending");showMessage($("#adminMessage"),"");}
  catch(err){adminPassword="";showMessage($("#adminMessage"),err.message,"error");}
}
async function loadAdminRows(status) {
  adminStatus=status;
  $$(".admin-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.status===status));
  $("#adminRows").textContent="তথ্য লোড হচ্ছে...";
  try {
    const data=await adminRequest("adminList",{status});
    const rows=data.technicians||[];
    if(!rows.length){$("#adminRows").textContent="এই বিভাগে কোনো তথ্য নেই।";return;}
    $("#adminRows").innerHTML=rows.map(t=>`<div class="admin-row"><div><b>${escapeHTML(getName(t))}</b><div class="muted">${escapeHTML(getCategory(t))} · ${escapeHTML(getMobile(t))} · ${escapeHTML(getLocation(t))}</div><small>ID: ${escapeHTML(t.id)}</small></div><div class="admin-row-actions">
      ${status!=="Approved"?`<button class="approve" data-admin="approve" data-id="${escapeHTML(t.id)}">অনুমোদন</button>`:""}
      ${status!=="Rejected"?`<button class="reject" data-admin="reject" data-id="${escapeHTML(t.id)}">বাতিল</button>`:""}
      <button data-admin="edit" data-id="${escapeHTML(t.id)}">এডিট</button><button data-admin="delete" data-id="${escapeHTML(t.id)}">ডিলিট</button>
    </div></div>`).join("");
    $$("#adminRows [data-admin]").forEach(b=>b.addEventListener("click",()=>adminAction(b.dataset.admin,b.dataset.id,rows.find(x=>x.id===b.dataset.id))));
  }catch(err){$("#adminRows").textContent=err.message;}
}
async function adminAction(action,id,row) {
  try {
    if(action==="delete"&&!confirm("এই মিস্ত্রির তথ্য স্থায়ীভাবে মুছে ফেলবেন?"))return;
    if(action==="edit"){
      const name=prompt("মিস্ত্রির নাম",row.fullName);if(name===null)return;
      const phone=prompt("মোবাইল নম্বর",row.mobile);if(phone===null)return;
      const locationText=prompt("এলাকা",row.location);if(locationText===null)return;
      await adminRequest("adminUpdate",{id,updates:{fullName:name,mobile:normalizePhone(phone),location:locationText}});
    } else if(action==="delete") await adminRequest("adminDelete",{id});
    else await adminRequest("adminStatus",{id,status:action==="approve"?"Approved":"Rejected"});
    await loadAdminRows(adminStatus);
  }catch(err){alert(err.message);}
}
function init() {
  initOptions();$("#year").textContent=new Date().getFullYear();
  $("#menuToggle").addEventListener("click",()=>{const nav=$("#mainNav"),open=nav.classList.toggle("open");$("#menuToggle").setAttribute("aria-expanded",String(open));});
  $$("#mainNav a").forEach(a=>a.addEventListener("click",()=>$("#mainNav").classList.remove("open")));
  $("#formCategory").addEventListener("change",e=>$("#otherServiceWrap").classList.toggle("hidden",e.target.value!=="অন্যান্য"));
  $("#joinForm").addEventListener("submit",submitJoin);
  ["searchInput","filterCategory","filterDistrict","filterUpazila","filterLocation","minCharge","maxCharge","filterExperience","sortBy"].forEach(id=>$("#"+id).addEventListener("input",applyFilters));
  $("#searchBtn").addEventListener("click",applyFilters);
  $("#heroSearch").addEventListener("submit",e=>{e.preventDefault();$("#searchInput").value=$("#heroQuery").value;$("#filterLocation").value=$("#heroLocation").value;applyFilters();location.hash="#directory";});
  $("#categoryGrid").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;$("#filterCategory").value=b.dataset.category;applyFilters();location.hash="#directory";});
  $("#clearFilters").addEventListener("click",()=>{$("#searchInput").value="";$("#filterCategory").value="";$("#filterDistrict").value="";$("#filterUpazila").value="";$("#filterLocation").value="";$("#minCharge").value="";$("#maxCharge").value="";$("#filterExperience").value="";$("#sortBy").value="newest";applyFilters();});
  $("#refreshBtn").addEventListener("click",loadDirectory);
  $("#modalClose").addEventListener("click",closeModal);
  $("#detailsModal").addEventListener("click",e=>{if(e.target.id==="detailsModal")closeModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
  $("#adminLoginForm").addEventListener("submit",adminLogin);
  $("#adminLogout").addEventListener("click",()=>{adminPassword="";$("#adminPanel").hidden=true;$("#adminLogin").hidden=false;$("#adminPassword").value="";});
  $$(".admin-tabs button").forEach(b=>b.addEventListener("click",()=>loadAdminRows(b.dataset.status)));
  window.addEventListener("hashchange",setupAdmin);setupAdmin();loadDirectory();
}
document.addEventListener("DOMContentLoaded",init);
