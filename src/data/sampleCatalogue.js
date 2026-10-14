// Demo data only. Prices are decimal strings in PKR, not floating-point calculations.
module.exports = [
  {
    name: "Electronics", slug: "electronics", prefix: "ELE",
    products: [
      { name: "Wireless Mouse", price: "1800.00", stock: 30, description: "A comfortable wireless mouse for daily computer use." },
      { name: "USB Keyboard", price: "2500.00", stock: 25, description: "A full-size wired keyboard for home and office." },
      { name: "Bluetooth Speaker", price: "4500.00", stock: 20, description: "A compact portable speaker with Bluetooth connectivity." },
      { name: "USB-C Cable", price: "700.00", stock: 50, description: "A one-metre USB-C charging and data cable." },
      { name: "Phone Stand", price: "900.00", stock: 35, description: "An adjustable tabletop stand for your phone." }
    ]
  },
  {
    name: "Fashion", slug: "fashion", prefix: "FAS",
    products: [
      { name: "Cotton T-Shirt", price: "1500.00", stock: 40, description: "An everyday cotton T-shirt with a relaxed fit." },
      { name: "Classic Cap", price: "850.00", stock: 30, description: "A simple adjustable cap for everyday outings." },
      { name: "Canvas Backpack", price: "3200.00", stock: 18, description: "A lightweight backpack with practical storage pockets." },
      { name: "Everyday Wallet", price: "1200.00", stock: 22, description: "A compact wallet with card slots and a note section." },
      { name: "Socks Pack", price: "600.00", stock: 45, description: "A three-pair pack of soft everyday socks." }
    ]
  },
  {
    name: "Home and Kitchen", slug: "home-kitchen", prefix: "HOM",
    products: [
      { name: "Ceramic Mug", price: "650.00", stock: 35, description: "A reusable ceramic mug for tea or coffee." },
      { name: "Water Bottle", price: "1100.00", stock: 28, description: "A reusable bottle for your desk, gym or travel bag." },
      { name: "Lunch Box", price: "1400.00", stock: 20, description: "A practical lunch box for school or work." },
      { name: "Desk Lamp", price: "2800.00", stock: 15, description: "A compact lamp for reading and desk work." },
      { name: "Storage Basket", price: "950.00", stock: 24, description: "A small basket for keeping everyday items organised." }
    ]
  },
  {
    name: "Sports", slug: "sports", prefix: "SPO",
    products: [
      { name: "Football", price: "2200.00", stock: 18, description: "A standard recreational football for practice and play." },
      { name: "Skipping Rope", price: "550.00", stock: 40, description: "A lightweight skipping rope for everyday exercise." },
      { name: "Yoga Mat", price: "1800.00", stock: 20, description: "A comfortable exercise mat for stretching and yoga." },
      { name: "Resistance Band", price: "900.00", stock: 25, description: "A flexible resistance band for basic home exercise." },
      { name: "Gym Towel", price: "750.00", stock: 30, description: "A compact towel for your workout bag." }
    ]
  },
  {
    name: "Books", slug: "books", prefix: "BOK",
    products: [
      { name: "Everyday Notebook", price: "350.00", stock: 60, description: "A ruled notebook for notes, ideas and daily writing." },
      { name: "Weekly Planner", price: "900.00", stock: 25, description: "A simple planner for organising your week." },
      { name: "JavaScript Practice Workbook", price: "1600.00", stock: 15, description: "A demo workbook item for practising JavaScript basics." },
      { name: "Sketchbook", price: "700.00", stock: 28, description: "A blank sketchbook for drawings and creative ideas." },
      { name: "Pocket Journal", price: "450.00", stock: 35, description: "A small journal you can take with you." }
    ]
  }
];
