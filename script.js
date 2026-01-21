const inventory = document.getElementById("inventory");
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
   INIT
========================= */
cleanupProducts();
render();

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

function showRecipes() {
  const recipeBox = document.getElementById("recipeList");
  recipeBox.innerHTML = "";

  const expiring = products.filter(p => getDaysLeft(p.expiry) <= 2);

  if (expiring.length === 0) {
    recipeBox.innerHTML = "<p>No expiring products found.</p>";
  } else {
    const names = expiring.map(p => p.name).join(", ");

    recipeBox.innerHTML = `
      <p><strong>Using:</strong> ${names}</p>
      <ul>
        <li>🥗 Mixed ${names} Stir Fry</li>
        <li>🍲 Simple ${names} Curry</li>
        <li>🍚 ${names} Rice Bowl</li>
      </ul>
      <p style="font-size:13px;color:#6b7280">
        AI-powered recipes will be enabled in the next phase.
      </p>
    `;
  }

  document.getElementById("recipeModal").classList.remove("hidden");
}

function closeRecipes() {
  document.getElementById("recipeModal").classList.add("hidden");
}
