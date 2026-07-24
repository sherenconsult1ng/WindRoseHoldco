/* Wind Rose Holding Limited — shared site logic
   ------------------------------------------------------------
   PROTOTYPE NOTICE
   This is a self-contained, front-end-only prototype. All member
   accounts, products and news are stored in the browser's
   localStorage on the device you use — there is no real server
   or database, and passwords are NOT securely hashed (only
   lightly obfuscated). Do not use this build for real members
   or real client data. It exists to demonstrate the page flow,
   layout and admin workflow before a production backend is built.
   ------------------------------------------------------------ */

const LS_MEMBERS   = "wr_members";
const LS_PRODUCTS  = "wr_products";
const LS_NEWS      = "wr_news";
const LS_SESSION   = "wr_session";
const LS_ADMIN     = "wr_admin_session";

// Demo-only admin credential. Change before any real use.
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "WindRose@2026";

/* ---------- storage helpers ---------- */
function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* Very light obfuscation — NOT real security. Prototype only. */
function obfuscate(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

/* ---------- seed placeholder content on first run ---------- */
function seedData() {
  if (!localStorage.getItem(LS_NEWS)) {
    setJSON(LS_NEWS, [
      {
        id: cryptoId(),
        title: "Wind Rose Holding Limited Launches Member Portal",
        date: "2026-07-10",
        body: "We are pleased to announce the launch of our member-only product portal, giving registered clients direct access to the latest offering materials, factsheets and updates in one place."
      },
      {
        id: cryptoId(),
        title: "Market Note: Positioning for the Second Half",
        date: "2026-06-28",
        body: "Our investment team continues to favour a balanced, risk-aware approach heading into the second half of the year, with an emphasis on quality and diversification. Members can log in to the Product section for the full briefing."
      },
      {
        id: cryptoId(),
        title: "Office Update",
        date: "2026-06-01",
        body: "Wind Rose Holding Limited confirms business operations continue as normal across all client service channels. Please see Contact Us for the fastest way to reach our team."
      }
    ]);
  }

  if (!localStorage.getItem(LS_PRODUCTS)) {
    setJSON(LS_PRODUCTS, [
      {
        id: cryptoId(),
        title: "Sample Product Factsheet",
        description: "This is a placeholder product entry. Replace it from the Admin panel with your actual product materials — factsheets, brochures, term sheets, or any file members should access.",
        fileName: null,
        fileData: null,
        uploadedAt: new Date().toISOString().slice(0, 10)
      }
    ]);
  }

  if (!localStorage.getItem(LS_MEMBERS)) {
    setJSON(LS_MEMBERS, []);
  }
}

function cryptoId() {
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

/* ---------- validation ---------- */
// Username: exactly 8 digits
function validateUsername(username) {
  return /^[0-9]{8}$/.test(username);
}
// Password: exactly 6 characters, must include a letter, a digit and a symbol
function validatePassword(password) {
  if (password.length !== 6) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return hasLetter && hasDigit && hasSymbol;
}

/* ---------- member auth ---------- */
function signupMember(username, password) {
  if (!validateUsername(username)) {
    return { ok: false, message: "Username must be exactly 8 digits (0-9)." };
  }
  if (!validatePassword(password)) {
    return { ok: false, message: "Password must be exactly 6 characters and include a letter, a number and a symbol." };
  }
  const members = getJSON(LS_MEMBERS, []);
  if (members.some(m => m.username === username)) {
    return { ok: false, message: "This username is already registered." };
  }
  members.push({
    username,
    password: obfuscate(password),
    createdAt: new Date().toISOString().slice(0, 10)
  });
  setJSON(LS_MEMBERS, members);
  return { ok: true, message: "Account created. You can now log in." };
}

function loginMember(username, password) {
  const members = getJSON(LS_MEMBERS, []);
  const match = members.find(m => m.username === username && m.password === obfuscate(password));
  if (!match) {
    return { ok: false, message: "Incorrect username or password." };
  }
  setJSON(LS_SESSION, { username });
  return { ok: true, message: "Welcome back." };
}

function currentMember() {
  return getJSON(LS_SESSION, null);
}

function logoutMember() {
  localStorage.removeItem(LS_SESSION);
}

/* ---------- admin auth ---------- */
function loginAdmin(username, password) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    setJSON(LS_ADMIN, true);
    return { ok: true };
  }
  return { ok: false, message: "Incorrect admin credentials." };
}
function isAdminLoggedIn() {
  return getJSON(LS_ADMIN, false) === true;
}
function logoutAdmin() {
  localStorage.removeItem(LS_ADMIN);
}

/* ---------- products ---------- */
function getProducts() {
  return getJSON(LS_PRODUCTS, []);
}
function addProduct(title, description, file) {
  return new Promise((resolve) => {
    const products = getJSON(LS_PRODUCTS, []);
    const finish = (fileData, fileName) => {
      products.unshift({
        id: cryptoId(),
        title,
        description,
        fileName: fileName || null,
        fileData: fileData || null,
        uploadedAt: new Date().toISOString().slice(0, 10)
      });
      setJSON(LS_PRODUCTS, products);
      resolve();
    };
    if (file) {
      const reader = new FileReader();
      reader.onload = () => finish(reader.result, file.name);
      reader.readAsDataURL(file);
    } else {
      finish(null, null);
    }
  });
}
function deleteProduct(id) {
  const products = getJSON(LS_PRODUCTS, []).filter(p => p.id !== id);
  setJSON(LS_PRODUCTS, products);
}

/* ---------- news ---------- */
function getNews() {
  return getJSON(LS_NEWS, []).sort((a, b) => (a.date < b.date ? 1 : -1));
}
function addNews(title, date, body) {
  const news = getJSON(LS_NEWS, []);
  news.unshift({ id: cryptoId(), title, date, body });
  setJSON(LS_NEWS, news);
}
function deleteNews(id) {
  const news = getJSON(LS_NEWS, []).filter(n => n.id !== id);
  setJSON(LS_NEWS, news);
}

/* ---------- members list (admin view) ---------- */
function getMembers() {
  return getJSON(LS_MEMBERS, []);
}
function deleteMember(username) {
  const members = getJSON(LS_MEMBERS, []).filter(m => m.username !== username);
  setJSON(LS_MEMBERS, members);
}

/* ---------- nav state (runs on every page) ---------- */
function renderAuthState() {
  const slot = document.getElementById("auth-slot");
  if (!slot) return;
  const member = currentMember();
  if (member) {
    slot.innerHTML =
      `<span class="auth-status">Signed in: ${member.username}</span>` +
      `<button class="btn btn-ghost" id="logout-btn">Log out</button>`;
    const btn = document.getElementById("logout-btn");
    if (btn) btn.addEventListener("click", () => {
      logoutMember();
      window.location.reload();
    });
  } else {
    slot.innerHTML = `<a class="btn btn-ghost" href="product.html">Member Login</a>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  seedData();
  renderAuthState();
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
