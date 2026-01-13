import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { BUSINESS, DEFAULT_SERVICES, BOOKING, SUPABASE, ADMIN, GALLERY } from "./config.js";

/*  DOM helpers */
const $ = (id) => document.getElementById(id);

const setText = (id, value) => {
  const el = $(id);
  if (el) el.textContent = value ?? "";
};

const setHref = (id, value) => {
  const el = $(id);
  if (el) el.href = value ?? "#";
};

const encode = (s) => encodeURIComponent(String(s || "").trim());
const mapsSearchUrl = (query) =>
  `https://yandex.com/maps/?text=${encodeURIComponent(query)}`;

const mapsEmbedUrl = (query) =>
  `https://yandex.com/map-widget/v1/?text=${encodeURIComponent(query)}&mode=search`;

/* Formatting */
const formatRub = (n) => `${Number(n).toFixed(0)} ₽`;

const formatDuration = (min, max) => {
  const a = Number(min);
  const b = Number(max);
  if (!Number.isFinite(a)) return "";
  if (!Number.isFinite(b) || a === b) return `${a} min`;
  return `${a}-${b} min`;
};

const pad2 = (n) => String(n).padStart(2, "0");
const timeToLabel = (t) => String(t).slice(0, 5);
const timeToDb = (hh, mm) => `${pad2(hh)}:${pad2(mm)}:00`;

/*  IDs  */
const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`);

/* Supabase client  */
const hasSupabase = Boolean(SUPABASE.url && SUPABASE.anonKey);
const sb = hasSupabase ? createClient(SUPABASE.url, SUPABASE.anonKey) : null;

/* Services storage */
const servicesStore = {
  read() {
    try {
      const raw = localStorage.getItem(ADMIN.servicesStorageKey);
      if (!raw) return structuredClone(DEFAULT_SERVICES);
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return structuredClone(DEFAULT_SERVICES);
      return data;
    } catch {
      return structuredClone(DEFAULT_SERVICES);
    }
  },
  write(services) {
    localStorage.setItem(ADMIN.servicesStorageKey, JSON.stringify(services));
  },
  reset() {
    localStorage.removeItem(ADMIN.servicesStorageKey);
  },
};

let services = servicesStore.read();

/*  services render */
function renderServicesPublic() {
  const list = $("services-list");
  if (!list) return;

  list.innerHTML = "";
  services.forEach((svc) => {
    const card = document.createElement("div");
    card.className = "service";

    const name = document.createElement("h3");
    name.className = "service__name";
    name.textContent = svc.name;

    const meta = document.createElement("div");
    meta.className = "service__meta";

    const price = document.createElement("span");
    price.textContent = formatRub(svc.priceRub);

    const dur = document.createElement("span");
    dur.textContent = formatDuration(svc.durationMin, svc.durationMax);

    meta.append(price, dur);
    card.append(name, meta);
    list.appendChild(card);
  });
}

/*  Booking logic */
function setStatus(type, msg) {
  const el = $("booking-status");
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    el.className = "status";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
  el.className = `status ${type === "ok" ? "status--ok" : "status--err"}`;
}

function normalizePhone(phone) {
  const p = String(phone || "").trim();
  if (!p) return "";
  return p.replace(/[^\d+]/g, "");
}

function getLocalYmd(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function getDayType(dateStr) {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  return day === 0 || day === 6 ? "weekends" : "weekdays";
}

function hoursHintForDate(dateStr) {
  const dayType = getDayType(dateStr);
  const h = BOOKING.hours[dayType];
  return `${dayType === "weekdays" ? "Booking hours (weekdays)" : "Booking hours (weekends)"}: ${h.open}–${h.close}`;
}

function parseHHMM(str) {
  const [hh, mm] = String(str).split(":").map((x) => Number(x));
  return { hh, mm };
}

function generateSlotsForDate(dateStr) {
  const dayType = getDayType(dateStr);
  const { open, close } = BOOKING.hours[dayType];
  const o = parseHHMM(open);
  const c = parseHHMM(close);

  const start = o.hh * 60 + o.mm;
  const end = c.hh * 60 + c.mm;
  const step = BOOKING.slotIntervalMinutes;

  const slots = [];
  for (let t = start; t + step <= end; t += step) {
    slots.push(timeToDb(Math.floor(t / 60), t % 60));
  }
  return slots;
}

async function getBookedSlots(dateStr) {
  if (!sb) throw new Error("Booking DB is not configured.");
  const { data, error } = await sb.rpc(SUPABASE.bookingsRpc, { p_date: dateStr });
  if (error) throw error;
  return new Set((data || []).map((r) => r.slot_time));
}

function populateBookingServices() {
  const sel = $("booking-service");
  if (!sel) return;

  sel.innerHTML = "";
  services.forEach((svc) => {
    const opt = document.createElement("option");
    opt.value = svc.id;
    opt.textContent = `${svc.name} — ${formatRub(svc.priceRub)} (${formatDuration(svc.durationMin, svc.durationMax)})`;
    sel.appendChild(opt);
  });

  if (!sel.value && services.length > 0) sel.value = services[0].id;
  updateServiceHint();
}

function updateServiceHint() {
  const sel = $("booking-service");
  const hint = $("booking-service-hint");
  if (!sel || !hint) return;

  const svc = services.find((s) => s.id === sel.value);
  hint.textContent = svc ? `Duration: ${formatDuration(svc.durationMin, svc.durationMax)}. Slot size: ${BOOKING.slotIntervalMinutes} min.` : "";
}

async function refreshSlots() {
  const dateEl = $("booking-date");
  const selEl = $("booking-service");
  const slotsWrap = $("booking-slots");
  const hiddenSlot = $("booking-slot");

  if (!dateEl || !selEl || !slotsWrap || !hiddenSlot) return;

  const dateStr = dateEl.value;
  const svc = services.find((s) => s.id === selEl.value);

  setText("booking-hours-hint", dateStr ? hoursHintForDate(dateStr) : "");
  hiddenSlot.value = "";
  setStatus("", "");

  slotsWrap.innerHTML = "";
  if (!dateStr || !svc) return;

  const loading = document.createElement("span");
  loading.className = "muted small";
  loading.textContent = hasSupabase ? "Loading availability..." : "Booking DB not configured.";
  slotsWrap.appendChild(loading);

  if (!hasSupabase) {
    setStatus("err", "Booking is not available until Supabase is configured. Use Call/WhatsApp.");
    return;
  }

  try {
    const allSlots = generateSlotsForDate(dateStr);
    const booked = await getBookedSlots(dateStr);

    slotsWrap.innerHTML = "";
    if (allSlots.length === 0) {
      const msg = document.createElement("span");
      msg.className = "muted small";
      msg.textContent = "No slots available for this date.";
      slotsWrap.appendChild(msg);
      return;
    }

    allSlots.forEach((slotTime) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot";
      btn.textContent = timeToLabel(slotTime);
      if (booked.has(slotTime)) btn.disabled = true;

      btn.addEventListener("click", () => {
  hiddenSlot.value = slotTime;

  [...slotsWrap.querySelectorAll(".slot")].forEach((b) => b.classList.remove("slot--selected"));
  btn.classList.add("slot--selected");

  const hint = document.getElementById("booking-selected-hint");
  if (hint) hint.textContent = `Selected: ${timeToLabel(slotTime)}`;

  setStatus("", "");
  if (typeof resetBookingBtn === "function") resetBookingBtn();
});
      slotsWrap.appendChild(btn);
    });
  } catch {
    slotsWrap.innerHTML = "";
    setStatus("err", "Failed to load availability. Please try again or use Call/WhatsApp.");
  }
}

function makeBookingRef() {
  // Produces The Business Zm-XXXXXX
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return `The Business Zm-${String(n).padStart(6, "0")}`;
}

function openBookingConfirmDialog({ dateStr, slotTime, serviceName, ref }) {
  const dlg = document.getElementById("booking-confirm-dialog");
  if (!dlg) return;

  const timeLabel = timeToLabel(slotTime);

  const dt = document.getElementById("confirm-datetime");
  const svc = document.getElementById("confirm-service");
  const r = document.getElementById("confirm-ref");

  if (dt) dt.textContent = `${dateStr} • ${timeLabel}`;
  if (svc) svc.textContent = serviceName;
  if (r) r.textContent = ref;

  dlg.showModal();
}

function closeBookingConfirmDialog() {
  const dlg = document.getElementById("booking-confirm-dialog");
  if (dlg) dlg.close();
}

function initBookingConfirmDialog() {
  const closeBtn = document.getElementById("confirm-close");
  const doneBtn = document.getElementById("confirm-done");
  if (closeBtn) closeBtn.addEventListener("click", closeBookingConfirmDialog);
  if (doneBtn) doneBtn.addEventListener("click", closeBookingConfirmDialog);

  const dlg = document.getElementById("booking-confirm-dialog");
  if (dlg) {
    dlg.addEventListener("click", (e) => {
      // click outside closes
      const rect = dlg.getBoundingClientRect();
      const inDialog =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inDialog) dlg.close();
    });
  }
}
async function submitBooking() {
  const dateEl = $("booking-date");
  const selEl = $("booking-service");
  const slotEl = $("booking-slot");
  const nameEl = $("booking-name");
  const phoneEl = $("booking-phone");

  const booking_date = dateEl.value;
  const service = services.find((s) => s.id === selEl.value);
  const slot_time = slotEl.value;
  const customer_name = String(nameEl.value || "").trim();
  const customer_phone = normalizePhone(phoneEl.value);

  setStatus("", "");

  if (!hasSupabase) return setStatus("err", "Booking is not available until Supabase is configured.");
  if (!booking_date) return setStatus("err", "Please select a date.");
  if (!service) return setStatus("err", "Please select a service.");
  if (!slot_time) return setStatus("err", "Please select a time slot.");
  if (!customer_name) return setStatus("err", "Please enter your name.");
  if (!customer_phone || customer_phone.length < 8) return setStatus("err", "Please enter a valid phone number.");

  $("booking-submit").disabled = true;
  setStatus("ok", "Submitting booking...");

  try {
    // generate a customer reference for the confirmation popup
    const booking_ref = makeBookingRef();

    const payload = {
      id: uid(),
      booking_date,
      slot_time,
      service_id: service.id,
      service_name: service.name,
      duration_min: Number(service.durationMin) || BOOKING.slotIntervalMinutes,
      duration_max: Number(service.durationMax) || Number(service.durationMin) || BOOKING.slotIntervalMinutes,
      customer_name,
      customer_phone,
      status: "pending",
      booking_ref, //stored in superbase for reference
    };

    const { error } = await sb.from(SUPABASE.bookingsTable).insert(payload);
    if (error) {
      if (String(error.code) === "23505") {
        setStatus("err", "That slot was just booked. Please choose another time.");
        slotEl.value = "";
        const selHint = document.getElementById("booking-selected-hint");
        if (selHint) selHint.textContent = "";
        await refreshSlots();
        return;
      }
      throw error;
    }

    // Show confirmation popup 
    openBookingConfirmDialog({
      dateStr: booking_date,
      slotTime: slot_time,
      serviceName: service.name,
      ref: booking_ref,
    });

    // MVP-simple message under the form
    setStatus("ok", "Booking request sent. We will confirm or cancel by WhatsApp/phone.");

    // Reset form fields so UI is ready for the next booking
    slotEl.value = "";
    nameEl.value = "";
    phoneEl.value = "";
    const selHint = document.getElementById("booking-selected-hint");
    if (selHint) selHint.textContent = "";

    await refreshSlots();
  } catch (e) {
  console.error("BOOKING ERROR:", e);
  setStatus(
    "err",
    e?.message ? `Booking failed: ${e.message}` : "Booking failed. Please try again or use Call/WhatsApp."
  );
} finally {
  $("booking-submit").disabled = false;
}
}

/* Admin: Auth + Bookings + Services */
let adminSession = null;
let bookingsMode = "today"; // "today" | "upcoming"

function show(el, yes) { if (el) el.hidden = !yes; }

function setError(el, msg) {
  if (!el) return;
  if (!msg) { el.hidden = true; el.textContent = ""; return; }
  el.hidden = false;
  el.textContent = msg;
}

function badgeClass(status) {
  if (status === "pending") return "badge badge--pending";
  if (status === "confirmed") return "badge badge--confirmed";
  if (status === "cancelled") return "badge badge--cancelled";
  if (status === "completed") return "badge badge--completed";
  return "badge";
}

async function adminRefreshSession() {
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  adminSession = data?.session ?? null;
}

function adminIsAuthed() {
  return Boolean(adminSession?.user?.id);
}

function openAdmin() {
  const dlg = $("admin-dialog");
  if (!dlg) return;
  setError($("admin-login-error"), "");
  setError($("bookings-error"), "");
  dlg.showModal();
  renderAdminState();
}

function closeAdmin() {
  const dlg = $("admin-dialog");
  if (dlg) dlg.close();
}

async function adminLogin() {
  if (!sb) return setError($("admin-login-error"), "Supabase is not configured.");
  const email = String($("admin-email").value || "").trim();
  const password = String($("admin-password").value || "");

  setError($("admin-login-error"), "");
  if (!email || !password) return setError($("admin-login-error"), "Email and password are required.");

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return setError($("admin-login-error"), "Login failed. Check credentials.");

  adminSession = data.session;
  await loadBookings();
  renderAdminState();
}

async function adminLogout() {
  if (!sb) return;
  await sb.auth.signOut();
  adminSession = null;
  renderAdminState();
}

function renderAdminState() {
  const authed = adminIsAuthed();
  show($("admin-login-view"), !authed);
  show($("admin-panel-view"), authed);

  if (authed) {
    // bookings tab
    activateTopTab("bookings");
  }
}

function activateTopTab(which) {
  const isBookings = which === "bookings";
  const isServices = which === "services";
  const isReviews = which === "reviews";

  document.getElementById("tab-bookings").classList.toggle("tab--active", isBookings);
  document.getElementById("tab-services").classList.toggle("tab--active", isServices);
  document.getElementById("tab-reviews").classList.toggle("tab--active", isReviews);

  show(document.getElementById("admin-bookings-view"), isBookings);
  show(document.getElementById("admin-services-view"), isServices);
  show(document.getElementById("admin-reviews-view"), isReviews);

  if (isBookings) loadBookings();
  if (isServices) renderAdminServicesList();
  if (isReviews) {
    activateReviewsFilter(reviewsMode); // loads admin reviews
  }
}

function activateBookingsFilter(which) {
  bookingsMode = which;
  $("filter-today").classList.toggle("tab--active", which === "today");
  $("filter-upcoming").classList.toggle("tab--active", which === "upcoming");
  loadBookings();
}

async function loadBookings() {
  if (!sb) return;
  if (!adminIsAuthed()) return;

  setError($("bookings-error"), "");
  const list = $("bookings-list");
  list.innerHTML = "";

  const today = getLocalYmd();
  try {
    let q = sb
      .from(SUPABASE.bookingsTable)
      .select("id, booking_ref, booking_date, slot_time, service_name, customer_name, customer_phone, status, created_at")
      .order("booking_date", { ascending: true })
      .order("slot_time", { ascending: true });

    if (bookingsMode === "today") q = q.eq("booking_date", today);
    if (bookingsMode === "upcoming") q = q.gt("booking_date", today);

    const { data, error } = await q;
    if (error) {
      setError($("bookings-error"), "Cannot load bookings (admin access not granted or RLS not configured).");
      return;
    }

    if (!data || data.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.textContent = bookingsMode === "today" ? "No bookings today." : "No upcoming bookings.";
      list.appendChild(empty);
      return;
    }

    data.forEach((b) => list.appendChild(renderBookingCard(b)));
  } catch {
    setError($("bookings-error"), "Failed to load bookings.");
  }
}

function renderBookingCard(b) {
  const card = document.createElement("div");
  card.className = "bookingcard";

  const top = document.createElement("div");
  top.className = "bookingcard__top";

  const title = document.createElement("p");
  title.className = "bookingcard__title";
  title.textContent = `${b.booking_date} • ${timeToLabel(b.slot_time)} • ${b.service_name}`;

  const badge = document.createElement("span");
  badge.className = badgeClass(b.status);
  badge.textContent = b.status;

  top.append(title, badge);

  const meta = document.createElement("p");
  meta.className = "bookingcard__meta";
  meta.textContent = `${b.customer_name} • ${b.customer_phone}${b.booking_ref ? " • " + b.booking_ref : ""}`;

  const actions = document.createElement("div");
  actions.className = "bookingcard__actions";

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "btn btn--ghost";
  confirmBtn.type = "button";
  confirmBtn.textContent = "Confirm";
  confirmBtn.disabled = b.status === "confirmed" || b.status === "cancelled" || b.status === "completed";
  confirmBtn.addEventListener("click", () => updateBookingStatus(b.id, "confirmed"));

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn--ghost";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.disabled = b.status === "cancelled" || b.status === "completed";
  cancelBtn.addEventListener("click", () => updateBookingStatus(b.id, "cancelled"));

  const completeBtn = document.createElement("button");
  completeBtn.className = "btn btn--ghost";
  completeBtn.type = "button";
  completeBtn.textContent = "Complete";
  completeBtn.disabled = b.status === "completed" || b.status === "cancelled";
  completeBtn.addEventListener("click", () => updateBookingStatus(b.id, "completed"));

  actions.append(confirmBtn, cancelBtn, completeBtn);

  card.append(top, meta, actions);
  return card;
}

async function updateBookingStatus(id, status) {
  if (!sb) return;
  if (!adminIsAuthed()) return;

  setError($("bookings-error"), "");
  try {
    const { error } = await sb.from(SUPABASE.bookingsTable).update({ status }).eq("id", id);
    if (error) {
      setError($("bookings-error"), "Update failed (admin permissions missing).");
      return;
    }
    await loadBookings();

    // Important:refresh public availability
    await refreshSlots();
  } catch {
    setError($("bookings-error"), "Update failed.");
  }
}

/* Admin: Services CRUD */
function clearServiceForm() {
  $("service-edit-id").value = "";
  $("service-name").value = "";
  $("service-price").value = "";
  $("service-min").value = "";
  $("service-max").value = "";
}

function parseServiceForm() {
  const name = $("service-name").value.trim();
  const priceRub = Number($("service-price").value);
  const durationMin = Number($("service-min").value);
  const durationMax = Number($("service-max").value);

  if (!name) return { error: "Service name is required." };
  if (!Number.isFinite(priceRub) || priceRub < 0) return { error: "Price must be a valid number (>= 0)." };
  if (!Number.isFinite(durationMin) || durationMin < 1) return { error: "Duration min must be >= 1." };
  if (!Number.isFinite(durationMax) || durationMax < 1) return { error: "Duration max must be >= 1." };
  if (durationMax < durationMin) return { error: "Duration max must be >= duration min." };

  return { value: { name, priceRub: Math.round(priceRub), durationMin: Math.round(durationMin), durationMax: Math.round(durationMax) } };
}

function saveServicesAndRerender() {
  servicesStore.write(services);
  renderServicesPublic();
  populateBookingServices();
  refreshSlots();
  renderAdminServicesList();
}

function renderAdminServicesList() {
  const wrap = $("admin-services-list");
  if (!wrap) return;

  wrap.innerHTML = "";
  services.forEach((svc) => {
    const item = document.createElement("div");
    item.className = "adminitem";

    const top = document.createElement("div");
    top.className = "adminitem__top";

    const left = document.createElement("div");

    const title = document.createElement("h5");
    title.className = "adminitem__name";
    title.textContent = svc.name;

    const meta = document.createElement("p");
    meta.className = "adminitem__meta";
    meta.textContent = `${formatRub(svc.priceRub)} • ${formatDuration(svc.durationMin, svc.durationMax)} • id: ${svc.id}`;

    left.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "adminitem__actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn--ghost";
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      $("service-edit-id").value = svc.id;
      $("service-name").value = svc.name;
      $("service-price").value = String(svc.priceRub);
      $("service-min").value = String(svc.durationMin);
      $("service-max").value = String(svc.durationMax);
      setError($("service-form-error"), "");
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn--ghost";
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      const ok = confirm(`Delete service: "${svc.name}"?`);
      if (!ok) return;
      services = services.filter((x) => x.id !== svc.id);
      saveServicesAndRerender();
      clearServiceForm();
      setError($("service-form-error"), "");
    });

    actions.append(editBtn, delBtn);
    top.append(left, actions);
    item.append(top);
    wrap.appendChild(item);
  });
}

/* business info */
function initBusinessInfo() {
  $("page-title").textContent = BUSINESS.name;
  setText("business-name", BUSINESS.name);
  setText("business-tagline", BUSINESS.tagline);

  setText("hours-weekdays", BUSINESS.hours.weekdays);
  setText("hours-weekends", BUSINESS.hours.weekends);

  setText("business-address", BUSINESS.address);

  setHref("call-btn", `tel:${BUSINESS.phoneE164}`);
  setHref("wa-btn", `https://wa.me/${BUSINESS.whatsappE164}`);

  const mapQuery = BUSINESS.map.query || BUSINESS.address;
  setHref("map-link", mapsSearchUrl(mapQuery));

  const mapEmbed = $("map-embed");
  if (mapEmbed) mapEmbed.src = mapsEmbedUrl(mapQuery);

  const year = new Date().getFullYear();
  setText("footer-text", `© ${year} ${BUSINESS.name}.`);
}

/* booking UI */
function initBooking() {
  const dateEl = $("booking-date");
  const selEl = $("booking-service");

  const today = getLocalYmd();
  const now = new Date();
  const max = new Date(now.getFullYear(), now.getMonth(), now.getDate() + BOOKING.maxDaysAhead);
  const maxStr = getLocalYmd(max);

  dateEl.min = today;
  dateEl.max = maxStr;
  dateEl.value = today;

  populateBookingServices();
  updateServiceHint();
  setText("booking-hours-hint", hoursHintForDate(today));

  selEl.addEventListener("change", async () => {
    updateServiceHint();
    await refreshSlots();
  });

  dateEl.addEventListener("change", async () => {
    setText("booking-hours-hint", hoursHintForDate(dateEl.value));
    await refreshSlots();
  });

  $("booking-submit").addEventListener("click", submitBooking);

  refreshSlots();
}

/* admin UI*/
async function initAdmin() {
  $("admin-open").addEventListener("click", openAdmin);
  $("admin-close").addEventListener("click", closeAdmin);

  $("admin-login-btn").addEventListener("click", adminLogin);
  $("admin-logout-btn").addEventListener("click", adminLogout);

  $("tab-bookings").addEventListener("click", () => activateTopTab("bookings"));
  $("tab-services").addEventListener("click", () => activateTopTab("services"));

const tabReviews = document.getElementById("tab-reviews");
if (tabReviews) tabReviews.addEventListener("click", () => activateTopTab("reviews"));

const rfP = document.getElementById("review-filter-pending");
const rfA = document.getElementById("review-filter-approved");
const rfH = document.getElementById("review-filter-hidden");
const rr = document.getElementById("reviews-refresh");

if (rfP) rfP.addEventListener("click", () => activateReviewsFilter("pending"));
if (rfA) rfA.addEventListener("click", () => activateReviewsFilter("approved"));
if (rfH) rfH.addEventListener("click", () => activateReviewsFilter("hidden"));
if (rr) rr.addEventListener("click", loadAdminReviews);

  $("filter-today").addEventListener("click", () => activateBookingsFilter("today"));
  $("filter-upcoming").addEventListener("click", () => activateBookingsFilter("upcoming"));
  $("bookings-refresh").addEventListener("click", loadBookings);

  $("admin-reset-btn").addEventListener("click", () => {
    const ok = confirm("Reset services to defaults?");
    if (!ok) return;
    servicesStore.reset();
    services = servicesStore.read();
    saveServicesAndRerender();
    clearServiceForm();
    setError($("service-form-error"), "");
  });

  $("service-save-btn").addEventListener("click", () => {
    const parsed = parseServiceForm();
    if (parsed.error) return setError($("service-form-error"), parsed.error);

    const editId = $("service-edit-id").value.trim();
    const next = parsed.value;

    if (editId) {
      const idx = services.findIndex((s) => s.id === editId);
      if (idx === -1) return setError($("service-form-error"), "Service not found.");
      services[idx] = { ...services[idx], ...next };
    } else {
      services.push({ id: uid(), ...next });
    }

    setError($("service-form-error"), "");
    clearServiceForm();
    saveServicesAndRerender();
  });

  $("service-cancel-btn").addEventListener("click", () => {
    clearServiceForm();
    setError($("service-form-error"), "");
  });

  if (sb) {
    await adminRefreshSession();
    sb.auth.onAuthStateChange(async (_event, session) => {
      adminSession = session;
      if (adminIsAuthed()) await loadBookings();
      renderAdminState();
    });
  }
}

function openGalleryDialog({ src, alt, caption }) {
  const dlg = document.getElementById("gallery-dialog");
  const img = document.getElementById("gallery-full");
  const cap = document.getElementById("gallery-caption");
  const title = document.getElementById("gallery-title");

  if (!dlg || !img || !cap || !title) return;

  img.src = src;
  img.alt = alt || "Gallery image";
  cap.textContent = caption || "";
  title.textContent = caption ? "Preview" : "Preview";

  dlg.showModal();
}

function closeGalleryDialog() {
  const dlg = document.getElementById("gallery-dialog");
  if (!dlg) return;

  dlg.close();

  // Clear src to stop loading if user closes quickly
  const img = document.getElementById("gallery-full");
  if (img) img.src = "";
}

let galleryTimer = null;
let galleryBaseIndex = 0;

function swapTile(btn, img, item) {
  // Fade out -> swap -> fade in
  img.classList.add("is-fading");

  window.setTimeout(() => {
    btn.dataset.src = item.src || "";
    btn.dataset.alt = item.alt || "Gallery image";
    btn.dataset.caption = item.caption || "";

    img.src = item.src;
    img.alt = item.alt || "Gallery image";

    // Fade back in on load (or after a short fallback)
    const done = () => img.classList.remove("is-fading");
    img.onload = done;
    window.setTimeout(done, 260);
  }, 180);
}

function initGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  grid.innerHTML = "";

  const items = Array.isArray(GALLERY) ? GALLERY.filter((x) => x && x.src) : [];
  if (items.length === 0) return;

  const track = document.createElement("div");
  track.className = "gallery__track";
  grid.appendChild(track);

  const addItem = (item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gallery__item";

    const img = document.createElement("img");
    img.className = "gallery__img";
    img.src = item.src;
    img.alt = item.alt || "Gallery image";
    img.loading = "lazy";

    btn.dataset.src = item.src;
    btn.dataset.alt = item.alt || "Gallery image";
    btn.dataset.caption = item.caption || "";

    btn.appendChild(img);
    btn.addEventListener("click", () => {
      openGalleryDialog({
        src: btn.dataset.src,
        alt: btn.dataset.alt,
        caption: btn.dataset.caption,
      });
    });

    track.appendChild(btn);
  };

  // Render list twice for seamless -50% loop
  items.forEach(addItem);
  items.forEach(addItem);

  // Force exactly 3 tiles visible in the viewport width
  const GAP = 12;
  const sizeTiles = () => {
    const w = Math.max(160, Math.floor((grid.clientWidth - GAP * 2) / 3));
    track.querySelectorAll(".gallery__item").forEach((b) => {
      b.style.flex = `0 0 ${w}px`;
    });
  };

  sizeTiles();

  let resizeT = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(sizeTiles, 120);
  });

  const closeBtn = document.getElementById("gallery-close");
  if (closeBtn) closeBtn.addEventListener("click", closeGalleryDialog);

  const dlg = document.getElementById("gallery-dialog");
  if (dlg) {
    dlg.addEventListener("close", () => {
      const img = document.getElementById("gallery-full");
      if (img) img.src = "";
    });
  }
}

/* Reviews display */
function starsText(rating) {
  const r = Math.max(1, Math.min(5, Number(rating) || 0));
  return "★★★★★".slice(0, r) + "☆☆☆☆☆".slice(0, 5 - r);
}

/* Reviews logic  */
function setReviewStatus(type, msg) {
  const el = document.getElementById("review-status");
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    el.className = "status";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
  el.className = `status ${type === "ok" ? "status--ok" : "status--err"}`;
}

async function loadApprovedReviews() {
  const list = document.getElementById("reviews-list");
  if (!list) return;

  list.innerHTML = "";
  if (!sb) {
    const msg = document.createElement("p");
    msg.className = "muted small";
    msg.textContent = "Reviews are unavailable until Supabase is configured.";
    list.appendChild(msg);
    return;
  }

  const { data, error } = await sb
    .from(SUPABASE.reviewsTable)
    .select("id, customer_name, rating, comment, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    const msg = document.createElement("p");
    msg.className = "muted small";
    msg.textContent = "Failed to load reviews.";
    list.appendChild(msg);
    return;
  }

  if (!data || data.length === 0) {
    const msg = document.createElement("p");
    msg.className = "muted small";
    msg.textContent = "No reviews yet.";
    list.appendChild(msg);
    return;
  }

  data.forEach((r) => {
    const card = document.createElement("div");
    card.className = "reviewcard";

    const top = document.createElement("div");
    top.className = "reviewcard__top";

    const name = document.createElement("p");
    name.className = "reviewcard__name";
    name.textContent = r.customer_name;

    const stars = document.createElement("span");
    stars.className = "stars";
    stars.textContent = starsText(r.rating);

    top.append(name, stars);

    const meta = document.createElement("p");
    meta.className = "reviewcard__meta";
    meta.textContent = String(r.comment || "");

    card.append(top, meta);
    list.appendChild(card);
  });
}
function openReviewThanksDialog() {
  const dlg = document.getElementById("review-thanks-dialog");
  if (dlg) dlg.showModal();
}

function closeReviewThanksDialog() {
  const dlg = document.getElementById("review-thanks-dialog");
  if (dlg) dlg.close();
}

function initReviewThanksDialog() {
  const x = document.getElementById("review-thanks-close");
  const done = document.getElementById("review-thanks-done");
  if (x) x.addEventListener("click", closeReviewThanksDialog);
  if (done) done.addEventListener("click", closeReviewThanksDialog);
}

async function submitReview() {
  if (!sb) return setReviewStatus("err", "Reviews are unavailable until Supabase is configured.");

  const nameEl = document.getElementById("review-name");
  const ratingEl = document.getElementById("review-rating");
  const commentEl = document.getElementById("review-comment");
  const btn = document.getElementById("review-submit");

  const customer_name = String(nameEl?.value || "").trim();
  const rating = Number(ratingEl?.value || 0);
  const comment = String(commentEl?.value || "").trim();

  setReviewStatus("", "");

  if (!customer_name) return setReviewStatus("err", "Please enter your name.");
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return setReviewStatus("err", "Please select a rating (1–5).");
  if (!comment || comment.length < 5) return setReviewStatus("err", "Please write a short comment (min 5 characters).");

  if (btn) btn.disabled = true;
  setReviewStatus("ok", "Submitting review...");

  try {
    const payload = {
      customer_name,
      rating,
      comment,
      status: "pending",
    };

    const { error } = await sb.from(SUPABASE.reviewsTable).insert(payload);
    if (error) throw error;

    setReviewStatus("ok", " ");
    openReviewThanksDialog();
    if (nameEl) nameEl.value = "";
    if (commentEl) commentEl.value = "";
    if (ratingEl) ratingEl.value = "5";
  } catch (e) {
    console.error("REVIEW ERROR:", e);
    setReviewStatus("err", e?.message ? `Review failed: ${e.message}` : "Review failed. Please try again.");
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* Admin: Reviews moderation */
let reviewsMode = "pending"; 

function activateReviewsFilter(which) {
  reviewsMode = which;

  const p = document.getElementById("review-filter-pending");
  const a = document.getElementById("review-filter-approved");
  const h = document.getElementById("review-filter-hidden");

  if (p) p.classList.toggle("tab--active", which === "pending");
  if (a) a.classList.toggle("tab--active", which === "approved");
  if (h) h.classList.toggle("tab--active", which === "hidden");

  loadAdminReviews();
}

async function loadAdminReviews() {
  if (!sb || !adminIsAuthed()) return;

  const errEl = document.getElementById("reviews-error");
  const list = document.getElementById("admin-reviews-list");
  if (!list) return;

  if (errEl) { errEl.hidden = true; errEl.textContent = ""; }
  list.innerHTML = "";

  const { data, error } = await sb
    .from(SUPABASE.reviewsTable)
    .select("id, customer_name, rating, comment, status, created_at")
    .eq("status", reviewsMode)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = "Cannot load reviews (admin access not granted or RLS not configured).";
    }
    return;
  }

  if (!data || data.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted small";
    empty.textContent = "No reviews in this state.";
    list.appendChild(empty);
    return;
  }

  data.forEach((r) => list.appendChild(renderAdminReviewCard(r)));
}

function renderAdminReviewCard(r) {
  const card = document.createElement("div");
  card.className = "bookingcard"; // reuse existing admin card styling

  const top = document.createElement("div");
  top.className = "bookingcard__top";

  const title = document.createElement("p");
  title.className = "bookingcard__title";
  title.textContent = `${r.customer_name} • ${starsText(r.rating)}`;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = r.status;

  top.append(title, badge);

  const meta = document.createElement("p");
  meta.className = "bookingcard__meta";
  meta.textContent = r.comment;

  const actions = document.createElement("div");
  actions.className = "bookingcard__actions";

  const approveBtn = document.createElement("button");
  approveBtn.className = "btn btn--ghost";
  approveBtn.type = "button";
  approveBtn.textContent = "Approve";
  approveBtn.disabled = r.status === "approved";
  approveBtn.addEventListener("click", () => updateReviewStatus(r.id, "approved"));

  const hideBtn = document.createElement("button");
  hideBtn.className = "btn btn--ghost";
  hideBtn.type = "button";
  hideBtn.textContent = "Hide";
  hideBtn.disabled = r.status === "hidden";
  hideBtn.addEventListener("click", () => updateReviewStatus(r.id, "hidden"));

  actions.append(approveBtn, hideBtn);

  card.append(top, meta, actions);
  return card;
}

async function updateReviewStatus(id, status) {
  if (!sb || !adminIsAuthed()) return;

  const errEl = document.getElementById("reviews-error");
  if (errEl) { errEl.hidden = true; errEl.textContent = ""; }

  const { error } = await sb.from(SUPABASE.reviewsTable).update({ status }).eq("id", id);

  if (error) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = "Update failed (admin permissions missing).";
    }
    return;
  }

  await loadAdminReviews();
  await loadApprovedReviews(); // public list updates after approvals
}

/* Boot  */
initBusinessInfo();
renderServicesPublic();
initBooking();
initAdmin();
initBookingConfirmDialog();
initGallery();
initReviewThanksDialog();

const reviewBtn = document.getElementById("review-submit");
if (reviewBtn) reviewBtn.addEventListener("click", submitReview);

loadApprovedReviews();
