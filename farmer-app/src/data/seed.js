/**
 * In-memory seed data — mirrors the Flask/SQLite demo dataset.
 * Everything lives in localStorage so the React-only app stays
 * fully self-contained (no backend required for Vercel deploy).
 */

const DEMO_PASSWORD = "demo1234";

const CATEGORIES = [
  "Vegetables","Fruits","Grains","Pulses","Dairy","Spices","Oilseeds","Other",
];

const UNITS = ["kg","quintal","tonne","litre","dozen","piece","crate","bundle"];

const UNIT_BY_CATEGORY = {
  Vegetables:"kg", Fruits:"kg", Grains:"quintal", Pulses:"kg",
  Dairy:"litre", Spices:"kg", Oilseeds:"quintal", Other:"kg",
};

const CHANNEL_LABELS = { direct:"Direct sale", marketplace:"Marketplace order" };
const ORDER_STATUSES = ["pending","confirmed","completed","cancelled"];

const CURRENCY = "₹";

// ---------- demo users ----------
const USERS = [
  { id:1, role:"farmer", name:"Ramesh Patil", email:"ramesh@demo.com", phone:"9820011223",
    farm_name:"Patil Farms", village:"Shirur", district:"Nashik", state:"Maharashtra" },
  { id:2, role:"farmer", name:"Anita Devi", email:"anita@demo.com", phone:"9410055667",
    farm_name:"Devi Organics", village:"Barwani", district:"Indore", state:"Madhya Pradesh" },
  { id:3, role:"buyer", name:"Sunita Traders", email:"sunita@demo.com", phone:"9873344556",
    farm_name:"Sunita Wholesale", village:"Nashik Road", district:"Nashik", state:"Maharashtra" },
];

// ---------- demo listings ----------
const PRODUCTS = [
  { id:1,farmer_id:1,name:"Tomatoes",category:"Vegetables",unit:"kg",quantity_available:900,price_per_unit:29.5,description:"Fresh hybrid tomatoes, hand-picked this week.",harvest_date:"2026-10-25",district:"Nashik",is_active:1 },
  { id:2,farmer_id:1,name:"Onions",category:"Vegetables",unit:"kg",quantity_available:1500,price_per_unit:21,description:"Firm red onions, stored dry and graded.",harvest_date:"2026-10-18",district:"Nashik",is_active:1 },
  { id:3,farmer_id:1,name:"Grapes (Thompson)",category:"Fruits",unit:"kg",quantity_available:400,price_per_unit:68,description:"Export-quality seedless grapes from Nashik.",harvest_date:"2026-11-01",district:"Nashik",is_active:1 },
  { id:4,farmer_id:1,name:"Pomegranate",category:"Fruits",unit:"kg",quantity_available:250,price_per_unit:92,description:"Bhagwa variety, medium to large fruit.",harvest_date:"2026-10-20",district:"Nashik",is_active:1 },
  { id:5,farmer_id:1,name:"Wheat (Sharbati)",category:"Grains",unit:"quintal",quantity_available:60,price_per_unit:2480,description:"Clean, moisture-checked Sharbati wheat.",harvest_date:"2026-09-15",district:"Nashik",is_active:1 },
  { id:6,farmer_id:1,name:"Tur Dal",category:"Pulses",unit:"kg",quantity_available:300,price_per_unit:82,description:"Unpolished tur dal, machine cleaned.",harvest_date:"2026-10-10",district:"Nashik",is_active:1 },
  { id:7,farmer_id:1,name:"Groundnut",category:"Oilseeds",unit:"quintal",quantity_available:40,price_per_unit:5900,description:"Bold groundnut, sun dried.",harvest_date:"2026-09-28",district:"Nashik",is_active:1 },
  { id:8,farmer_id:1,name:"Cow Milk",category:"Dairy",unit:"litre",quantity_available:120,price_per_unit:52,description:"Daily morning collection, chilled.",harvest_date:"2026-11-10",district:"Nashik",is_active:1 },
  { id:9,farmer_id:1,name:"Turmeric",category:"Spices",unit:"kg",quantity_available:120,price_per_unit:318,description:"Sangli turmeric fingers, 5% curcumin.",harvest_date:"2026-10-05",district:"Nashik",is_active:1 },
  { id:10,farmer_id:1,name:"Green Chilli",category:"Vegetables",unit:"kg",quantity_available:18,price_per_unit:15,description:"Pungent local chilli - last of the lot, priced to clear.",harvest_date:"2026-11-08",district:"Nashik",is_active:1 },
  { id:11,farmer_id:2,name:"Soybean",category:"Oilseeds",unit:"quintal",quantity_available:80,price_per_unit:4620,description:"Locally grown soybean, low moisture.",harvest_date:"2026-09-20",district:"Indore",is_active:1 },
  { id:12,farmer_id:2,name:"Chickpeas (Chana)",category:"Pulses",unit:"quintal",quantity_available:35,price_per_unit:5350,description:"Desi chana, hand sorted.",harvest_date:"2026-10-01",district:"Indore",is_active:1 },
  { id:13,farmer_id:2,name:"Red Chilli",category:"Spices",unit:"kg",quantity_available:200,price_per_unit:208,description:"Sun-dried Guntur-style red chilli.",harvest_date:"2026-10-15",district:"Indore",is_active:1 },
  { id:14,farmer_id:2,name:"Bhindi (Okra)",category:"Vegetables",unit:"kg",quantity_available:150,price_per_unit:31,description:"Tender okra, cut every morning.",harvest_date:"2026-11-05",district:"Indore",is_active:1 },
  { id:15,farmer_id:2,name:"Buffalo Milk",category:"Dairy",unit:"litre",quantity_available:90,price_per_unit:58,description:"Rich buffalo milk, 6.5% fat.",harvest_date:"2026-11-09",district:"Indore",is_active:1 },
];

// ---------- demo orders ----------
const BUYER_NAMES = [
  "Sunita Traders","Kisan Retail Mart","Green Basket Foods","Hotel Annapurna",
  "Shree Wholesale","Local Haat Vendor","Fresh Cart Groceries","Maa Bhagwati Kirana",
];

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateOrders() {
  const rng = mulberry32(20260925);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const orders = [];
  let id = 1;
  const now = Date.now();

  const farmerProducts = {};
  PRODUCTS.forEach(p => {
    if (!farmerProducts[p.farmer_id]) farmerProducts[p.farmer_id] = [];
    farmerProducts[p.farmer_id].push(p);
  });

  for (const [farmerId, prods] of Object.entries(farmerProducts)) {
    const count = prods.length > 6 ? 26 : 16;
    for (let i = 0; i < count; i++) {
      const product = pick(prods);
      let quantity;
      if (product.unit === "quintal" || product.unit === "tonne") {
        quantity = pick([1,2,3,4,5]);
      } else if (product.unit === "litre") {
        quantity = pick([20,40,60,80,100]);
      } else {
        quantity = pick([15,25,40,60,90,120,180]);
      }
      const unit_price = +(product.price_per_unit * (0.86 + rng() * 0.2)).toFixed(2);
      const roll = rng();
      let status;
      if (roll < 0.78) status = "completed";
      else if (roll < 0.87) status = "confirmed";
      else if (roll < 0.95) status = "pending";
      else status = "cancelled";
      const channel = rng() < 0.35 ? "marketplace" : "direct";
      const daysAgo = Math.floor(rng() * 150);
      const ordered_at = new Date(now - daysAgo * 86400000).toISOString().slice(0,10);
      const buyer_name = channel === "marketplace" ? "Sunita Traders" : pick(BUYER_NAMES);
      orders.push({
        id: id++,
        product_id: product.id,
        farmer_id: +farmerId,
        buyer_id: channel === "marketplace" ? 3 : null,
        buyer_name,
        quantity,
        unit_price,
        total_amount: +(quantity * unit_price).toFixed(2),
        channel,
        status,
        ordered_at,
        product_name: product.name,
        unit: product.unit,
      });
    }
  }
  return orders;
}

// ---------- market prices ----------
function generateMarketPrices() {
  const rng = mulberry32(20260925);
  const BASE = { Vegetables:28, Fruits:66, Grains:24, Pulses:92, Dairy:48, Spices:315, Oilseeds:58, Other:35 };
  const PHASE = { Vegetables:2, Fruits:5.5, Grains:9, Pulses:8, Dairy:1, Spices:6.5, Oilseeds:7.5, Other:4 };
  const VOL = { Vegetables:.22, Fruits:.18, Grains:.08, Pulses:.11, Dairy:.05, Spices:.16, Oilseeds:.09, Other:.12 };
  const MARKETS = [
    ["Nashik APMC","Nashik",0.98],["Pune Market Yard","Pune",1.06],
    ["Indore Krishi Upaj Mandi","Indore",0.95],["Raipur Mandi","Raipur",0.92],
    ["Azadpur Mandi","Delhi",1.12],
  ];
  const now = new Date();
  const prices = [];
  let id = 1;
  for (let offset = 23; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const recorded_on = `${year}-${String(month).padStart(2,'0')}-01`;
    for (const [cat, base] of Object.entries(BASE)) {
      const seasonal = 1 + VOL[cat] * Math.sin(2 * Math.PI * (month + PHASE[cat]) / 12);
      const drift = 1 + 0.012 * ((year * 12 + month) - (now.getFullYear() * 12 + (now.getMonth()+1)));
      for (const [market, district, factor] of MARKETS) {
        const noise = 1 + (rng() * 0.07 - 0.035);
        const price = +(base * seasonal * factor * drift * noise).toFixed(2);
        prices.push({ id: id++, category:cat, market, district, unit:"kg", price_per_unit:price, recorded_on });
      }
    }
  }
  return prices;
}

// ---------- initializer ----------
export function initStore() {
  if (!localStorage.getItem("agri_users")) {
    localStorage.setItem("agri_users", JSON.stringify(USERS));
    localStorage.setItem("agri_products", JSON.stringify(PRODUCTS));
    localStorage.setItem("agri_orders", JSON.stringify(generateOrders()));
    localStorage.setItem("agri_market_prices", JSON.stringify(generateMarketPrices()));
    localStorage.setItem("agri_next_product_id", "16");
    localStorage.setItem("agri_next_order_id", "50");
  }
}

export function resetStore() {
  localStorage.removeItem("agri_users");
  localStorage.removeItem("agri_products");
  localStorage.removeItem("agri_orders");
  localStorage.removeItem("agri_market_prices");
  localStorage.removeItem("agri_next_product_id");
  localStorage.removeItem("agri_next_order_id");
  localStorage.removeItem("agri_session");
  initStore();
}

export { CATEGORIES, UNITS, UNIT_BY_CATEGORY, CHANNEL_LABELS, ORDER_STATUSES, CURRENCY, DEMO_PASSWORD };

