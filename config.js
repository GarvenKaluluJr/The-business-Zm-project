export const BUSINESS = {
  name: "The Business Zm",
  tagline: "Barbershop services — clean cuts, on time.",
  phoneDisplay: "+7(995)-890-65-01",
  phoneE164: "+79958906501",
  whatsappE164: "79958906501",
  address: "Санкт-Петербург, ИМОП or Гражданский проспект, 28",
  hours: {
    weekdays: "Anytime starting at 14:00",
    weekends: "12:00 – 20:00 (Saturday & Sunday)",
  },
  map: {
    query: "ИМОП Гражданский проспект 28 Санкт-Петербург",
  },
};

export const ADMIN = {
  servicesStorageKey: "mvp_services_v1",
};

export const DEFAULT_SERVICES = [
  {
    id: "svc_full_haircut",
    name: "Full haircut (everything included)",
    priceRub: 500,
    durationMin: 25,
    durationMax: 30,
  },
  {
    id: "svc_lining",
    name: "Lining",
    priceRub: 150,
    durationMin: 10,
    durationMax: 15,
  },
  {
    id: "svc_beard",
    name: "Beard trim",
    priceRub: 200,
    durationMin: 10,
    durationMax: 15,
  },
];

export const BOOKING = {
  // For MVP simplicity: fixed slot size (prevents overlap cleanly).
  slotIntervalMinutes: 30,

  // Needed for slot generation (backend logic).
  // Assumption for weekdays closing time in MVP: 20:00.
  hours: {
    weekdays: { open: "14:00", close: "20:00" },
    weekends: { open: "12:00", close: "20:00" },
  },

  // UI limits
  maxDaysAhead: 30,
};

export const SUPABASE = {
  //https://lkmrjsdvvoynqwojunfr.supabase.co
  url: "https://lkmrjsdvvoynqwojunfr.supabase.co",
  anonKey: "sb_publishable_hJWrb8JhvM8l1y7CYSeTGw_YdT55wEG",  // public anon key
  bookingsRpc: "get_booked_slots",
  bookingsTable: "bookings",
  reviewsTable: "reviews",
};

export const GALLERY = [
  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/lining%201.jpeg",
    alt: "Haircut result 1",
    caption: "Clean lineup haircut",
  },
  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/lining%202.jpeg",
    alt: "Haircut result 2",
    caption: "Clean lineup haircut",
  },
  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/lining%203.jpeg",
    alt: "Haircut result 3",
    caption: "Clean lineup haircut",
  },
  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/WhatsApp%20Image%202026-01-10%20at%2003.28.45.jpeg",
    alt: "Haircut result 1",
    caption: "Full clean haircut",
  },
  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/WhatsApp%20Image%202026-01-10%20at%2003.28.48%20(1).jpeg",
    alt: "Haircut result 2",
    caption: "full clean haircut",
  },
  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/WhatsApp%20Image%202026-01-10%20at%2003.28.48.jpeg",
    alt: "Haircut result 3",
    caption: "full clean haircut",
  },
  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/WhatsApp%20Image%202026-01-10%20at%2003.29.36.jpeg",
    alt: "Haircut result 4",
    caption: "full clean haircut",
  },
  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/WhatsApp%20Image%202026-01-10%20at%2003.36.45%20(1).jpeg",
    alt: "Haircut result 5",
    caption: "full clean haircut",
  },
  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/WhatsApp%20Image%202026-01-10%20at%2003.36.45%20(2).jpeg",
    alt: "Haircut result 6",
    caption: "full clean haircut",
  },

  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/WhatsApp%20Image%202026-01-10%20at%2003.36.45%20(3).jpeg",
    alt: "Haircut result 7",
    caption: "full clean haircut",
  },
  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/WhatsApp%20Image%202026-01-10%20at%2003.36.45.jpeg",
    alt: "Haircut result 8",
    caption: "full clean haircut",
  },
  {
    src: "https://lkmrjsdvvoynqwojunfr.supabase.co/storage/v1/object/public/gallery/WhatsApp%20Image%202026-01-10%20at%2004.04.25.jpeg",
    alt: "Haircut result 9",
    caption: "full clean haircut",
  },
];

