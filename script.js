let inventory;
document.addEventListener("DOMContentLoaded", () => {
  inventory = document.getElementById("inventory");
  cleanupProducts();
  render();
});
let products = JSON.parse(localStorage.getItem("products")) || [];
let openId = null;

/* =========================
   CLEANUP
========================= */
function cleanupProducts() {
  products = products.filter(
    p => getDaysLeft(p.expiry) > 0 && p.quantity > 0
  );
}

/* =========================
   ADD PRODUCT
========================= */
function addProduct() {
  const name = document.getElementById("name").value.trim();
  const category = document.getElementById("category").value || "—";
  const price = Number(document.getElementById("price").value || 0);
  const quantity = Number(document.getElementById("quantity").value);
  const unit = document.getElementById("unit").value;
  const expiry = document.getElementById("expiry").value;

  if (!name || !quantity || !unit || !expiry) {
    alert("Please fill all required fields");
    return;
  }

  products.push({
    id: Date.now(),
    name,
    category,
    price,
    quantity,
    unit,
    expiry
  });

  cleanupProducts();
  save();
  clearForm();
  render();
}

/* =========================
   RENDER
========================= */
function render() {
  inventory.innerHTML = "";

  products.forEach(p => {
    const days = getDaysLeft(p.expiry);
    const color =
      days > 2 ? "#22c55e" :
      days >= 2 ? "#facc15" :
      "#ef4444";

    const li = document.createElement("li");
    li.className = "item";
    if (p.id === openId) li.classList.add("open");
    li.style.borderColor = color;

    li.innerHTML = `
      <div class="header">
        <div>
          <div class="name">${p.name}</div>
          <div class="sub">${days} days left</div>
        </div>
      </div>

      <div class="details">
        <div>Category: ${p.category}</div>
        <div>Expiry Date: ${p.expiry}</div>
        <div>Price: ₹${p.price}</div>

        <div class="qty">
          <strong>Qty</strong>
          <button class="dec">−</button>
          <span>${p.quantity} ${p.unit}</span>
          <button class="inc">+</button>
        </div>

        <div class="actions">
          <span class="edit">✏️</span>
          <span class="delete">🗑️</span>
        </div>
      </div>
    `;

    li.querySelector(".header").onclick = () => {
      openId = openId === p.id ? null : p.id;
      render();
    };

    li.querySelector(".inc").onclick = e => changeQty(e, p.id, 1);
    li.querySelector(".dec").onclick = e => changeQty(e, p.id, -1);
    li.querySelector(".delete").onclick = e => deleteItem(e, p.id);
    li.querySelector(".edit").onclick = e => editItem(e, p.id);

    addSwipeToDelete(li, p.id);
    inventory.appendChild(li);
  });

  renderAlerts();
}

/* =========================
   QUANTITY
========================= */
function changeQty(e, id, delta) {
  e.stopPropagation();
  const p = products.find(p => p.id === id);
  if (!p) return;

  p.quantity += delta;
  cleanupProducts();
  save();
  render();
}

/* =========================
   DELETE
========================= */
function deleteItem(e, id) {
  e.stopPropagation();
  products = products.filter(p => p.id !== id);
  if (openId === id) openId = null;
  save();
  render();
}

/* =========================
   EDIT
========================= */
function editItem(e, id) {
  e.stopPropagation();
  const p = products.find(p => p.id === id);
  if (!p) return;

  name.value = p.name;
  category.value = p.category === "—" ? "" : p.category;
  price.value = p.price;
  quantity.value = p.quantity;
  unit.value = p.unit;
  expiry.value = p.expiry;

  products = products.filter(x => x.id !== id);
  openId = null;
  save();
  render();
}

/* =========================
   SWIPE
========================= */
function addSwipeToDelete(el, id) {
  let startX = 0;
  el.addEventListener("touchstart", e => startX = e.touches[0].clientX);
  el.addEventListener("touchend", e => {
    if (startX - e.changedTouches[0].clientX > 80) {
      products = products.filter(p => p.id !== id);
      if (openId === id) openId = null;
      save();
      render();
    }
  });
}

/* =========================
   ALERTS
========================= */
function renderAlerts() {
  const box = document.getElementById("alerts");
  box.innerHTML = "";

  const today = products.filter(p => getDaysLeft(p.expiry) === 0);
  const tomorrow = products.filter(p => getDaysLeft(p.expiry) === 1);

  if (today.length)
    box.innerHTML += `<div class="alert red">🔴 ${today.length} expiring today</div>`;
  if (tomorrow.length)
    box.innerHTML += `<div class="alert yellow">🟡 ${tomorrow.length} expiring tomorrow</div>`;

  if ((today.length + tomorrow.length) && navigator.vibrate)
    navigator.vibrate(150);
}

/* =========================
   CALENDAR
========================= */
function downloadAllReminders() {
  const expiring = products.filter(p => getDaysLeft(p.expiry) <= 2);
  if (!expiring.length) return alert("No expiring items");

  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

  if (isMobile) {
    const p = expiring[0];
    const date = p.expiry.replace(/-/g, "");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Expiry:+${p.name}&dates=${date}/${date}`;
    window.open(url, "_blank");
    return;
  }

  // Desktop ICS
  let events = "";
  expiring.forEach(p => {
    const d = new Date(p.expiry);
    d.setDate(d.getDate() - 1);
    const s = d.toISOString().replace(/[-:]/g, "").split(".")[0];
    events += `BEGIN:VEVENT\nSUMMARY:Expiry - ${p.name}\nDTSTART:${s}\nDTEND:${s}\nEND:VEVENT\n`;
  });

  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\n${events}END:VCALENDAR`;
  const blob = new Blob([ics], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Expiry-Reminders.ics";
  a.click();
}

/* =========================
   HELPERS
========================= */
function getDaysLeft(d) {
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

function save() {
  localStorage.setItem("products", JSON.stringify(products));
}

function clearForm() {
  document.querySelectorAll("input").forEach(i => i.value = "");
}

/* =========================
   VOICE
========================= */
function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    alert("Voice input not supported in this browser. Please type manually.");
    return;
  }

  const r = new SR();
  r.lang = "en-IN";
  r.start();

  r.onresult = e => {
    document.getElementById("name").value =
      e.results[0][0].transcript;
  };

  r.onerror = () => {
    alert("Microphone permission denied or unavailable.");
  };
}

/* =========================
   SHOW RECEPIES IN AI
========================= */
async function showRecipes() {
  const recipeBox = document.getElementById("recipeList");
  recipeBox.innerHTML = "<p>Generating smart recipes...</p>";
  const expiring = products.filter(p => getDaysLeft(p.expiry) <= 2);
  if (!expiring.length) {
    recipeBox.innerHTML = "<p>No expiring products found.</p>";
    document.getElementById("recipeModal").classList.remove("hidden");
    return;
  }

  const ingredientNames = expiring.map(p => p.name);

  document.getElementById("recipeModal").classList.remove("hidden");

  const recipes = await fetchAIRecipes(ingredientNames);

renderManualSelection();
renderAIRecipes(recipes);
}

function closeRecipes() {
  document.getElementById("recipeModal").classList.add("hidden");
}
const BACKEND_URL = "https://smart-expiry-backend.onrender.com";

async function fetchAIRecipes(ingredients) {
  try {
    const res = await fetch(`${BACKEND_URL}/recipes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ingredients })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Backend error:", data);
      throw new Error("Backend failed");
    }

    return data.recipes;

  } catch (err) {
    console.error("Fetch AI Recipes failed:", err);

    document.getElementById("recipeList").innerHTML =
      "<p style='color:red'>⚠️ Backend or AI is sleeping. Try again in 30 seconds.</p>";

    return [];
  }
}


function renderAIRecipes(recipes) {
  const recipeBox = document.getElementById("recipeList");
  recipeBox.innerHTML = "";

  if (!recipes.length) {
    recipeBox.innerHTML = "<p>No recipes generated.</p>";
    return;
  }

  recipes.forEach(r => {
    const div = document.createElement("div");
    div.className = "recipe-card";

    div.innerHTML = `
      <h4>🍽️ ${r.name}</h4>

      <strong>Ingredients:</strong>
      <ul>
        ${r.ingredients.map(i => `<li>${i}</li>`).join("")}
      </ul>

      <strong>Steps:</strong>
      <ol>
        ${r.steps.map(s => `<li>${s}</li>`).join("")}
      </ol>

      <hr/>
    `;

    recipeBox.appendChild(div);
  });
}

/* =========================
   MANUAL SELECTION AI RECIPES 
========================= */
function renderManualSelection() {
  const box = document.getElementById("manualSelect");
  box.innerHTML = "";

  if (!products.length) {
    box.innerHTML = "<p>No products available.</p>";
    return;
  }

  box.innerHTML = `
    <p><strong>Select products manually:</strong></p>
    ${products.map(p => `
      <label style="display:block">
        <input type="checkbox" value="${p.name}">
        ${p.name}
      </label>
    `).join("")}
    <button onclick="generateManualRecipes()">Generate Recipes</button>
    <hr/>
  `;
}

async function generateManualRecipes() {
  const checked = document.querySelectorAll(
    "#manualSelect input[type='checkbox']:checked"
  );

  const ingredients = Array.from(checked).map(c => c.value);

  if (ingredients.length < 2) {
    alert("Please select at least 2 food items");
    return;
  }

  const recipeBox = document.getElementById("recipeList");
  recipeBox.innerHTML = "<p>Generating recipes...</p>";

  const recipes = await fetchAIRecipes(ingredients);

  if (!recipes || recipes.length === 0) {
    recipeBox.innerHTML =
      "<p>AI could not generate recipes for these items. Try different foods.</p>";
    return;
  }

  renderAIRecipes(recipes);
}
/* =========================
	LANGUAGE TRANSLATION
========================= */

const translations = {
  en: {
    title: "Smart Expiry",
    subtitle: "Track, reduce waste, and get smart recipe suggestions",
    addProduct: "Add Product",
    productName: "Product Name",
    quantity: "Quantity",
    expiry: "Expiry Date",
    inventory: "Inventory",
    add: "Add",
    recipeIdeas: "Recipe Ideas"
  },
  hi: {
    title: "स्मार्ट एक्सपायरी",
    subtitle: "भोजन की बर्बादी कम करें और स्मार्ट रेसिपी पाएं",
    addProduct: "उत्पाद जोड़ें",
    productName: "उत्पाद नाम",
    quantity: "मात्रा",
    expiry: "समाप्ति तिथि",
    inventory: "सूची",
    add: "जोड़ें",
    recipeIdeas: "रेसिपी सुझाव"
  },
  te: {
    title: "స్మార్ట్ ఎక్స్‌పైరీ",
    subtitle: "ఆహార వ్యర్థాలను తగ్గించండి మరియు స్మార్ట్ వంటకాలు పొందండి",
    addProduct: "ఉత్పత్తి జోడించండి",
    productName: "ఉత్పత్తి పేరు",
    quantity: "పరిమాణం",
    expiry: "గడువు తేదీ",
    inventory: "జాబితా",
    add: "జోడించండి",
    recipeIdeas: "వంటకాల ఆలోచనలు"
  },
  };

function changeLanguage(lang) {
  const t = translations[lang];
  if (!t) return;

  document.getElementById("appTitle").innerText = t.title;
  document.getElementById("appSubtitle").innerText = t.subtitle;

  document.getElementById("addProductTitle").innerText = t.addProduct;
  document.getElementById("productNameLabel").innerText = t.productName;
  document.getElementById("inventoryTitle").innerText = t.inventory;
  document.getElementById("addBtn").innerText = t.add;
  document.getElementById("recipeTitle").innerText = t.recipeIdeas;

  document.getElementById("quantity").placeholder = t.quantity;

  localStorage.setItem("language", lang);
}
document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("language") || "en";
  changeLanguage(savedLang);
  const sel = document.getElementById("languageSelect");
  if (sel) sel.value = savedLang;
});
function toggleLang() {
  document.getElementById("langMenu").classList.toggle("hidden");
}

function selectLang(lang) {
  changeLanguage(lang);
  localStorage.setItem("language", lang);
  document.getElementById("langMenu").classList.add("hidden");
}
