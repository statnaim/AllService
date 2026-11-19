
/* =========================================================
   KHULNA LOCAL SERVICE DIRECTORY
   Frontend JavaScript
   Google Apps Script + Google Sheets
   ========================================================= */


/* 1. GOOGLE APPS SCRIPT API URL */

const API_URL = "https://script.google.com/macros/s/AKfycbyKAFdTNDY2Eipr_fPFTjG0W0KZw5sfZiIzKVp3nbnZl0o1Bdm15yuv8gNqPdRH6m2K/exec";


/* 2. SERVICE CATEGORIES */

const CATEGORIES = [
  "ইলেকট্রিশিয়ান",
  "প্লাম্বার",
  "এসি মেকানিক",
  "ফ্রিজ মেকানিক",
  "টিভি মেকানিক",
  "মোবাইল সার্ভিসিং",
  "কম্পিউটার সার্ভিসিং",
  "টাইলস মিস্ত্রি",
  "রাজমিস্ত্রি",
  "কাঠমিস্ত্রি",
  "রং মিস্ত্রি",
  "ওয়েল্ডিং মিস্ত্রি",
  "থাই অ্যালুমিনিয়াম মিস্ত্রি",
  "গ্যাস মিস্ত্রি",
  "পানির মোটর মেকানিক",
  "ক্লিনিং সার্ভিস",
  "বাসা-বাড়ি মেরামত",
  "অন্যান্য"
];


/* 3. GLOBAL VARIABLES */

let technicians = [];

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];


/* 4. BASIC FUNCTIONS */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}


function digits(value) {
  return String(value || "").replace(/\D/g, "");
}


function normalizePhone(value) {
  let number = digits(value);

  if (number.startsWith("8801") && number.length === 13) {
    number = "0" + number.slice(3);
  }

  if (number.startsWith("1") && number.length === 10) {
    number = "0" + number;
  }

  return number;
}


function validPhone(value) {
  return /^01[3-9]\d{8}$/.test(normalizePhone(value));
}


function phoneLink(value) {
  return "+88" + normalizePhone(value);
}


function money(value) {
  if (value === "" || value == null) {
    return "আলোচনা সাপেক্ষে";
  }

  return "৳" + Number(value).toLocaleString("bn-BD");
}


function showMessage(element, message, type = "") {
  if (!element) return;

  element.textContent = message;
  element.className = "form-message " + type;
}


function on(selector, event, callback) {
  const element = $(selector);

  if (element) {
    element.addEventListener(event, callback);
  }
}


/* 5. CHECK API URL */

function apiReady() {
  return API_URL.startsWith("https://script.google.com/macros/s/") &&
    API_URL.endsWith("/exec");
}


/* 6. GOOGLE APPS SCRIPT GET API
   JSONP ব্যবহার করা হয়েছে যাতে GET request-এ
   সাধারণ CORS সমস্যা এড়ানো যায়।
*/

function apiGet(params = {}) {

  return new Promise((resolve, reject) => {

    if (!apiReady()) {
      reject(new Error("Google Apps Script URL সঠিক নয়।"));
      return;
    }

    const callback =
      "kls_callback_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2);

    const script = document.createElement("script");

    let completed = false;

    const timer = setTimeout(() => {
      finish(new Error("সার্ভার থেকে উত্তর পাওয়া যায়নি।"));
    }, 20000);

    function finish(error, data) {

      if (completed) return;

      completed = true;

      clearTimeout(timer);

      delete window[callback];

      script.remove();

      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    }

    window[callback] = data => {

      if (!data || !data.ok) {
        finish(new Error(
          data?.message || "তথ্য লোড করা যায়নি।"
        ));
        return;
      }

      finish(null, data);
    };

    const query = new URLSearchParams({
      ...params,
      callback
    });

    script.src =
      API_URL +
      "?action=list&" +
      query.toString();

    script.onerror = () => {
      finish(new Error(
        "API সংযোগ করা যাচ্ছে না। Apps Script deployment পরীক্ষা করুন।"
      ));
    };

    document.head.appendChild(script);

  });

}


/* 7. GOOGLE APPS SCRIPT POST API

   গুরুত্বপূর্ণ:
   no-cors ব্যবহারের কারণে POST response সরাসরি
   পড়া যায় না।

   তাই Submit-এর আগে এবং পরে Directory পরীক্ষা করা হবে।
*/

async function apiPost(payload) {

  if (!apiReady()) {
    throw new Error("Google Apps Script URL সঠিক নয়।");
  }

  if (payload.action !== "submit") {
    throw new Error("এই API পদ্ধতি শুধু Registration-এর জন্য।");
  }

  await fetch(API_URL, {

    method: "POST",

    mode: "no-cors",

    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },

    body: JSON.stringify(payload)

  });

  return true;

}


/* 8. LOAD SERVICE OPTIONS */

function populateSelect(select, values, firstLabel) {

  if (!select) return;

  select.innerHTML =
    `<option value="">${escapeHTML(firstLabel)}</option>` +

    values.map(value =>
      `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`
    ).join("");

}


function initOptions() {

  populateSelect(
    $("#formCategory"),
    CATEGORIES,
    "সার্ভিস নির্বাচন করুন"
  );

  populateSelect(
    $("#filterCategory"),
    CATEGORIES,
    "সব সার্ভিস"
  );

}


/* 9. GET TECHNICIAN INFORMATION */

function getName(t) {
  return t.fullName || t.FullName || "";
}


function getMobile(t) {
  return t.mobile || t.Mobile || "";
}


function getCategory(t) {
  return t.category || t.Category || "";
}


function getCharge(t) {
  return t.charge ?? t.Charge ?? "";
}


function getLocation(t) {
  return t.location || t.Location || "";
}


function getExperience(t) {
  return t.experience ?? t.Experience ?? "";
}


function getWhatsApp(t) {
  return t.whatsapp || t.WhatsApp || "";
}


/* 10. LOAD PUBLIC DIRECTORY */

async function loadDirectory() {

  const grid = $("#technicianGrid");

  if (grid) {
    grid.innerHTML =
      '<div class="loading-state">তথ্য লোড হচ্ছে...</div>';
  }

  const status = $("#dataStatus");

  if (status) {
    status.textContent = "সার্ভারের সঙ্গে সংযোগ করা হচ্ছে...";
  }

  try {

    const data = await apiGet({
      action: "list"
    });

    technicians = Array.isArray(data.technicians)
      ? data.technicians
      : [];

    if (status) {
      status.textContent = "সর্বশেষ তথ্য দেখানো হচ্ছে";
    }

    applyFilters();

  } catch (error) {

    if (grid) {

      grid.innerHTML = `
        <div class="empty-state">
          ${escapeHTML(error.message)}

          <br>

          <button class="btn btn-outline" id="retryLoad">
            আবার চেষ্টা করুন
          </button>
        </div>
      `;

      on("#retryLoad", "click", loadDirectory);
    }

    if (status) {
      status.textContent = "সংযোগ সমস্যা";
    }

  }

}


/* 11. TECHNICIAN CARD */

function renderCards(list) {

  const grid = $("#technicianGrid");

  if (!grid) return;

  const count = $("#resultCount");

  if (count) {
    count.textContent =
      list.length.toLocaleString("bn-BD") +
      " জন মিস্ত্রি পাওয়া গেছে";
  }

  if (!list.length) {

    grid.innerHTML = `
      <div class="empty-state">
        এখনো কোনো মিস্ত্রির তথ্য পাওয়া যায়নি।
      </div>
    `;

    return;
  }

  grid.innerHTML = list.map((t, index) => `

    <article class="technician-card">

      <div class="card-top">

        <div class="avatar avatar-fallback">
          👨‍🔧
        </div>

        <div>

          <h3 class="card-name">
            ${escapeHTML(getName(t))}
          </h3>

          <div class="card-category">
            ${escapeHTML(getCategory(t))}
          </div>

        </div>

      </div>

      <div class="card-body">

        <div class="card-charge">
          ${money(getCharge(t))}
        </div>

        <div class="card-meta">

          <span>
            📍 ${escapeHTML(getLocation(t))}
          </span>

          <span>
            🧰 ${escapeHTML(getExperience(t))} বছর অভিজ্ঞতা
          </span>

        </div>

      </div>

      <div class="card-actions">

        <button
          class="btn btn-outline details-btn"
          data-index="${index}">
          বিস্তারিত
        </button>

        <a
          class="btn btn-call"
          href="tel:${escapeHTML(phoneLink(getMobile(t)))}">
          ☎ কল করুন
        </a>

      </div>

    </article>

  `).join("");


  $$(".details-btn", grid).forEach(button => {

    button.addEventListener("click", () => {

      const index = Number(button.dataset.index);

      openDetails(list[index]);

    });

  });

}


/* 12. SEARCH AND FILTER */

function filteredTechnicians() {

  const search =
    ($("#searchInput")?.value || "")
      .trim()
      .toLocaleLowerCase("bn");

  const category =
    $("#filterCategory")?.value || "";

  const locationSearch =
    ($("#filterLocation")?.value || "")
      .trim()
      .toLocaleLowerCase("bn");

  const minCharge =
    $("#minCharge")?.value === ""
      ? null
      : Number($("#minCharge").value);

  const maxCharge =
    $("#maxCharge")?.value === ""
      ? null
      : Number($("#maxCharge").value);

  const minExperience =
    $("#filterExperience")?.value === ""
      ? null
      : Number($("#filterExperience").value);


  let list = technicians.filter(t => {

    const name = getName(t).toLocaleLowerCase("bn");

    const service = getCategory(t).toLocaleLowerCase("bn");

    const mobile = getMobile(t);

    const location = getLocation(t).toLocaleLowerCase("bn");

    const charge = Number(getCharge(t));

    const experience = Number(getExperience(t) || 0);


    const searchable =
      [name, service, mobile, location].join(" ");


    return (

      (!search || searchable.includes(search)) &&

      (!category || getCategory(t) === category) &&

      (!locationSearch || location.includes(locationSearch)) &&

      (minCharge === null || charge >= minCharge) &&

      (maxCharge === null || charge <= maxCharge) &&

      (minExperience === null || experience >= minExperience)

    );

  });


  const sort = $("#sortBy")?.value || "newest";

  if (sort === "low") {
    list.sort((a, b) =>
      Number(getCharge(a)) - Number(getCharge(b))
    );
  }

  if (sort === "high") {
    list.sort((a, b) =>
      Number(getCharge(b)) - Number(getCharge(a))
    );
  }

  if (sort === "newest") {
    list.sort((a, b) =>
      new Date(b.createdAt || 0) -
      new Date(a.createdAt || 0)
    );
  }

  return list;

}


function applyFilters() {
  renderCards(filteredTechnicians());
}


/* 13. TECHNICIAN DETAILS */

function openDetails(t) {

  const modal = $("#detailsModal");

  const content = $("#modalContent");

  if (!modal || !content) return;

  const whatsapp = normalizePhone(getWhatsApp(t));

  content.innerHTML = `

    <div class="modal-profile">

      <div class="avatar avatar-fallback">
        👨‍🔧
      </div>

      <h3>
        ${escapeHTML(getName(t))}
      </h3>

      <div class="card-category">
        ${escapeHTML(getCategory(t))}
      </div>

    </div>

    <div class="modal-info">

      <div>
        <b>মোবাইল নম্বর</b>
        <br>
        ${escapeHTML(getMobile(t))}
      </div>

      <div>
        <b>সার্ভিসের ধরন</b>
        <br>
        ${escapeHTML(getCategory(t))}
      </div>

      <div>
        <b>কাজের চার্জ</b>
        <br>
        ${money(getCharge(t))}
      </div>

      <div>
        <b>এলাকার নাম</b>
        <br>
        ${escapeHTML(getLocation(t))}
      </div>

      <div>
        <b>অভিজ্ঞতা</b>
        <br>
        ${escapeHTML(getExperience(t))} বছর
      </div>

      <div>
        <b>WhatsApp</b>
        <br>
        ${whatsapp ? escapeHTML(whatsapp) : "দেওয়া হয়নি"}
      </div>

    </div>

    <a
      class="btn btn-primary btn-block"
      href="tel:${escapeHTML(phoneLink(getMobile(t)))}">
      ☎ এখনই কল করুন
    </a>

    ${
      whatsapp
        ? `
          <a
            class="btn btn-outline btn-block"
            target="_blank"
            rel="noopener"
            href="https://wa.me/88${escapeHTML(whatsapp)}">
            WhatsApp করুন
          </a>
        `
        : ""
    }

  `;

  modal.classList.remove("hidden");

  document.body.style.overflow = "hidden";

}


function closeModal() {

  const modal = $("#detailsModal");

  if (modal) {
    modal.classList.add("hidden");
  }

  document.body.style.overflow = "";

}


/* 14. REGISTRATION FORM SUBMIT */

async function submitJoin(event) {

  event.preventDefault();

  const form = event.currentTarget;

  const button = $("#submitBtn");

  const message = $("#formMessage");


  if (!form.reportValidity()) return;


  const fd = new FormData(form);


  const fullName =
    String(fd.get("fullName") || "").trim();

  const mobile =
    normalizePhone(fd.get("mobile"));

  const category =
    String(fd.get("category") || "").trim();

  const otherService =
    String(fd.get("otherService") || "").trim();

  const charge =
    Number(fd.get("charge"));

  const location =
    String(fd.get("location") || "").trim();

  const experience =
    Number(fd.get("experience"));

  const whatsappText =
    String(fd.get("whatsapp") || "").trim();

  const whatsapp =
    whatsappText ? normalizePhone(whatsappText) : "";


  /* Validation */

  if (!fullName) {
    showMessage(message, "পূর্ণ নাম লিখুন।", "error");
    return;
  }

  if (!validPhone(mobile)) {
    showMessage(
      message,
      "সঠিক বাংলাদেশি মোবাইল নম্বর দিন।",
      "error"
    );
    return;
  }

  if (!category) {
    showMessage(message, "সার্ভিস নির্বাচন করুন।", "error");
    return;
  }

  if (category === "অন্যান্য" && !otherService) {
    showMessage(
      message,
      "অন্যান্য সার্ভিসের নাম লিখুন।",
      "error"
    );
    return;
  }

  if (!Number.isFinite(charge) || charge < 0) {
    showMessage(message, "সঠিক কাজের চার্জ লিখুন।", "error");
    return;
  }

  if (!location) {
    showMessage(message, "এলাকার নাম লিখুন।", "error");
    return;
  }

  if (!Number.isInteger(experience) || experience < 0 || experience > 60) {
    showMessage(message, "সঠিক অভিজ্ঞতার বছর লিখুন।", "error");
    return;
  }

  if (whatsapp && !validPhone(whatsapp)) {
    showMessage(message, "সঠিক WhatsApp নম্বর দিন।", "error");
    return;
  }


  /* Confirmation */

  if (!confirm(
    "আপনার দেওয়া তথ্য ওয়েবসাইটে প্রকাশিত হবে। আপনি কি সম্মত?"
  )) {
    return;
  }


  button.disabled = true;

  button.textContent = "জমা হচ্ছে...";

  showMessage(
    message,
    "আপনার তথ্য জমা হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন।"
  );


  try {

    /* Save old IDs before submission */

    const beforeData = await apiGet({
      action: "list"
    });

    const oldIDs = new Set(
      (beforeData.technicians || []).map(t => String(t.id))
    );


    /* Data sent to Code.gs */

    const payload = {

      action: "submit",

      fullName: fullName,

      mobile: mobile,

      category: category,

      otherService: otherService,

      charge: charge,

      location: location,

      experience: experience,

      whatsapp: whatsapp,

      consent: true

    };


    /* Send POST */

    await apiPost(payload);


    /* Verify through public directory */

    let savedTechnician = null;

    for (let i = 0; i < 8; i++) {

      await new Promise(resolve =>
        setTimeout(resolve, 1500)
      );

      const latestData = await apiGet({
        action: "list"
      });

      const latestList = latestData.technicians || [];

      savedTechnician = latestList.find(t => {

        const isNew = !oldIDs.has(String(t.id));

        const sameMobile =
          normalizePhone(t.mobile || t.Mobile) === mobile;

        return isNew && sameMobile;

      });

      if (savedTechnician) {

        technicians = latestList;

        break;

      }

    }


    if (!savedTechnician) {

      throw new Error(
        "তথ্য পাঠানো হয়েছে, কিন্তু Directory-তে নতুন তথ্য পাওয়া যায়নি। Google Sheet পরীক্ষা করুন। আবার Submit করবেন না।"
      );

    }


    /* Success */

    form.reset();

    const otherWrap = $("#otherServiceWrap");

    if (otherWrap) {
      otherWrap.classList.add("hidden");
    }

    showMessage(
      message,
      "অভিনন্দন! আপনার তথ্য সফলভাবে জমা হয়েছে এবং ওয়েবসাইটে প্রকাশিত হয়েছে।",
      "success"
    );

    applyFilters();


  } catch (error) {

    showMessage(
      message,
      error.message || "তথ্য জমা দেওয়া যায়নি।",
      "error"
    );

  } finally {

    button.disabled = false;

    button.textContent = "তথ্য জমা দিন";

  }

}


/* 15. MOBILE MENU */

function setupMenu() {

  on("#menuToggle", "click", () => {

    const nav = $("#mainNav");

    if (!nav) return;

    const open = nav.classList.toggle("open");

    $("#menuToggle").setAttribute(
      "aria-expanded",
      String(open)
    );

  });


  $$("#mainNav a").forEach(link => {

    link.addEventListener("click", () => {

      $("#mainNav")?.classList.remove("open");

    });

  });

}


/* 16. CLEAR FILTERS */

function clearFilters() {

  [
    "#searchInput",
    "#filterCategory",
    "#filterLocation",
    "#minCharge",
    "#maxCharge",
    "#filterExperience"
  ].forEach(selector => {

    const element = $(selector);

    if (element) element.value = "";

  });

  const sort = $("#sortBy");

  if (sort) sort.value = "newest";

  applyFilters();

}


/* 17. ADMIN NOTICE

   বর্তমান Code.gs-এর POST API response এবং browser CORS
   সীমাবদ্ধতার কারণে এই Frontend সংস্করণে Admin POST
   অপারেশন চালু করা হয়নি।
*/

function setupAdmin() {

  if (location.hash === "#admin") {

    alert(
      "Admin management-এর জন্য আলাদা CORS-compatible API ব্যবস্থা প্রয়োজন।"
    );

  }

}


/* 18. INITIALIZE WEBSITE */

function init() {

  /* Service dropdown */

  initOptions();


  /* Current year */

  const year = $("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }


  /* Mobile menu */

  setupMenu();


  /* Other service field */

  on("#formCategory", "change", event => {

    const otherWrap = $("#otherServiceWrap");

    if (!otherWrap) return;

    otherWrap.classList.toggle(
      "hidden",
      event.target.value !== "অন্যান্য"
    );

  });


  /* Registration form */

  on("#joinForm", "submit", submitJoin);


  /* Search and filters */

  [
    "#searchInput",
    "#filterCategory",
    "#filterLocation",
    "#minCharge",
    "#maxCharge",
    "#filterExperience",
    "#sortBy"
  ].forEach(selector => {

    on(selector, "input", applyFilters);

    on(selector, "change", applyFilters);

  });


  /* Search button */

  on("#searchBtn", "click", applyFilters);


  /* Clear filters */

  on("#clearFilters", "click", clearFilters);


  /* Refresh directory */

  on("#refreshBtn", "click", loadDirectory);


  /* Details modal */

  on("#modalClose", "click", closeModal);


  on("#detailsModal", "click", event => {

    if (event.target.id === "detailsModal") {
      closeModal();
    }

  });


  document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
      closeModal();
    }

  });


  /* Hero search */

  on("#heroSearch", "submit", event => {

    event.preventDefault();

    const query = $("#heroQuery");
    const locationInput = $("#heroLocation");

    if (query && $("#searchInput")) {
      $("#searchInput").value = query.value;
    }

    if (locationInput && $("#filterLocation")) {
      $("#filterLocation").value = locationInput.value;
    }

    applyFilters();

    location.hash = "#directory";

  });


  /* Category buttons */

  on("#categoryGrid", "click", event => {

    const button = event.target.closest("[data-category]");

    if (!button) return;

    const category = $("#filterCategory");

    if (category) {
      category.value = button.dataset.category;
    }

    applyFilters();

    location.hash = "#directory";

  });


  /* Admin notice */

  window.addEventListener("hashchange", setupAdmin);


  /* Load public directory */

  loadDirectory();

}


/* 19. START WEBSITE */

document.addEventListener("DOMContentLoaded", init);
