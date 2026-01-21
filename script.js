const inventory = document.getElementById("inventory");
let products = JSON.parse(localStorage.getItem("products")) || [];
let openIndex = null;

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

  products.push({ name, category, price, quantity, unit, expiry });
  openIndex = products.length - 1;

  save();
  clearForm();
  render();
}

/* =========================
   RENDER INVENTORY
========================= */
function render() {
  inventory.innerHTML = "";

  // Auto-delete expired or zero-quantity items
  products = products.filter(p =>
    getDaysLeft(p.expiry) > 0 && p.quantity > 0
  );

  openIndex = null;

  products.forEach((p, i) => {
    const days = getDaysLeft(p.expiry);
    const color =
      days > 2 ? "#22c55e" :
      days >= 2 ? "#facc15" :
      "#ef4444";

    const li = document.createElement("li");
    li.className = "item";
    li.style.borderColor = color;

    li.innerHTML = `
      <div class="header" onclick="toggle(${i})">
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
          <button onclick="changeQty(event, ${i}, -1)">−</button>
          <span>${p.quantity} ${p.unit}</span>
          <button onclick="changeQty(event, ${i}, 1)">+</button>
        </div>

        <button onclick="addToCalendar(event, ${i})">📅 Add Reminder</button>

        <div class="actions">
          <span onclick="editItem(event, ${i})">✏️</span>
          <span onclick="deleteItem(event, ${i})">🗑️</span>
        </div>
      </div>
    `;

    addSwipeToDelete(li, i);
    inventory.appendChild(li);
  });

  save();
  renderAlerts();
}

/* =========================
   TOGGLE EXPAND
========================= */
function toggle(i) {
  const items = document.querySelectorAll(".item");
  items.forEach((el, idx) => {
    el.classList.toggle("open", idx === i && !el.classList.contains("open"));
  });
}

/* =========================
   QUANTITY CHANGE (UNLIMITED)
========================= */
function changeQty(e, i, delta) {
  e.stopPropagation();

  products[i].quantity += delta;

  if (products[i].quantity <= 0) {
    products.splice(i, 1);
  }

  render();
}

/* =========================
   DELETE
========================= */
function deleteItem(e, i) {
  e.stopPropagation();
  products.splice(i, 1);
  render();
}

/* =========================
   EDIT
========================= */
function editItem(e, i) {
  e.stopPropagation();
  const p = products[i];

  document.getElementById("name").value = p.name;
  document.getElementById("category").value = p.category === "—" ? "" : p.category;
  document.getElementById("price").value = p.price;
  document.getElementById("quantity").value = p.quantity;
  document.getElementById("unit").value = p.unit;
  document.getElementById("expiry").value = p.expiry;

  products.splice(i, 1);
  render();
}

/* =========================
   SWIPE TO DELETE (MOBILE)
========================= */
function addSwipeToDelete(el, index) {
  let startX = 0;

  el.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  el.addEventListener("touchend", e => {
    if (startX - e.changedTouches[0].clientX > 80) {
      products.splice(index, 1);
      render();
    }
  });
}

/* =========================
   IN-APP ALERTS
========================= */
function renderAlerts() {
  const alertBox = document.getElementById("alerts");
  alertBox.innerHTML = "";

  const today = products.filter(p => getDaysLeft(p.expiry) === 0);
  const tomorrow = products.filter(p => getDaysLeft(p.expiry) === 1);

  if (today.length > 0) {
    alertBox.innerHTML += `
      <div class="alert red">
        🔴 ${today.length} item(s) expiring today
      </div>`;
  }

  if (tomorrow.length > 0) {
    alertBox.innerHTML += `
      <div class="alert yellow">
        🟡 ${tomorrow.length} item(s) expiring tomorrow
      </div>`;
  }

  if ((today.length + tomorrow.length) > 0 && navigator.vibrate) {
    navigator.vibrate(150);
  }
}

/* =========================
   CALENDAR REMINDER (ICS)
========================= */
function addToCalendar(e, index) {
  e.stopPropagation();
  const p = products[index];

  const eventDate = new Date(p.expiry);
  eventDate.setDate(eventDate.getDate() - 1);

  const start = eventDate.toISOString().replace(/[-:]/g, "").split(".")[0];

  const ics = `
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Expiry Reminder - ${p.name}
DESCRIPTION:${p.name} expires tomorrow
DTSTART:${start}
DTEND:${start}
END:VEVENT
END:VCALENDAR
  `.trim();

  const blob = new Blob([ics], { type: "text/calendar" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${p.name}-expiry.ics`;
  link.click();
}

/* =========================
   HELPERS
========================= */
function getDaysLeft(date) {
  return Math.ceil((new Date(date) - new Date()) / 86400000);
}

function save() {
  localStorage.setItem("products", JSON.stringify(products));
}

function clearForm() {
  document.querySelectorAll("input").forEach(i => i.value = "");
}

/* =========================
   VOICE INPUT
========================= */
function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return alert("Speech recognition not supported");

  const r = new SR();
  r.lang = "en-IN";
  r.start();
  r.onresult = e => {
    document.getElementById("name").value = e.results[0][0].transcript;
  };
}
