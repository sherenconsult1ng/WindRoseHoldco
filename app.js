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
    setJSON(LS_NEWS, []);
  }

  if (!localStorage.getItem(LS_PRODUCTS)) {
    setJSON(LS_PRODUCTS, [
      {
        id: cryptoId(),
        title: "Sample Product Factsheet",
        description: "This is a placeholder product entry. Replace it from the Admin panel with your actual product materials — factsheets, brochures, term sheets, or any file members should access [...]
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
function addNews(title, date, body, file, caption) {
  return new Promise((resolve) => {
    const news = getJSON(LS_NEWS, []);
    const finish = (fileData, fileName) => {
      news.unshift({ id: cryptoId(), title, date, body, caption: caption || null, fileName: fileName || null, fileData: fileData || null });
      setJSON(LS_NEWS, news);
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

/* ---------- data export/import helpers (new) ---------- */
// Export all local data (members, products, news) to a JSON file so it can be imported into another browser/profile.
function exportAllData() {
  const payload = {
    members: getJSON(LS_MEMBERS, []),
    products: getJSON(LS_PRODUCTS, []),
    news: getJSON(LS_NEWS, [])
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wr-data-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Import a JSON file exported with exportAllData(). This WILL overwrite the current data after user confirmation.
function importAllDataFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== 'object') throw new Error('Invalid file format');
        if (!confirm('Importing will replace the current members, products and news in this browser. Continue?')) {
          return resolve({ ok: false, message: 'Import cancelled' });
        }
        setJSON(LS_MEMBERS, parsed.members || []);
        setJSON(LS_PRODUCTS, parsed.products || []);
        setJSON(LS_NEWS, parsed.news || []);
        resolve({ ok: true });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
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

// Public helper used by the static pages (news/product) to show a preview of files stored as data URLs or blob/object URLs.
// If `url` is a data: URL or blob: URL we use it directly, otherwise we fetch the resource so we can create an object URL for viewing.
function openFilePreview(url, filename) {
  return new Promise(async (resolve, reject) => {
    try {
      if (typeof url !== 'string') return reject(new Error('Invalid url'));

      // If data: or blob: -> open directly in new tab
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        const win = window.open(url, '_blank', 'noopener');
        if (!win) {
          // popup blocked -> navigate same tab
          window.location.href = url;
        }
        return resolve({ ok: true, url });
      }

      // For external URLs: open a blank tab synchronously to avoid popup blocking
      const previewWin = window.open('', '_blank', 'noopener');
      try {
        const resp = await fetch(url, { mode: 'cors' });
        if (!resp.ok) throw new Error('Fetch error: ' + resp.status);
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);

        // prefer viewing in the opened tab
        if (previewWin) {
          try { previewWin.location.href = objectUrl; } catch (e) { window.location.href = objectUrl; }
          // revoke when window closed (polling)
          const t = setInterval(() => {
            try {
              if (previewWin.closed) {
                URL.revokeObjectURL(objectUrl);
                clearInterval(t);
              }
            } catch (e) { /* ignore */ }
          }, 1000);
        } else {
          // popup blocked; navigate current tab
          window.location.href = objectUrl;
          // revoke after timeout
          setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
        }

        return resolve({ ok: true, url: objectUrl });
      } catch (fetchErr) {
        // If fetch fails (often due to CORS), navigate the blank window (if any) to the original URL as a fallback
        console.warn('openFilePreview fetch failed:', fetchErr);
        try {
          if (previewWin) previewWin.location.href = url;
          else window.open(url, '_blank', 'noopener');
        } catch (e) {
          window.location.href = url;
        }
        return reject(fetchErr);
      }
    } catch (err) {
      // Final fallback
      try { window.open(url, '_blank', 'noopener'); } catch (e) { window.location.href = url; }
      return reject(err);
    }
  });
}

