export const COMPANY = {
  name: "Etsy, Inc.",
  erpSystem: "Oracle Fusion",
  paymentRun: "MX-WEEKLY-APR16",
  financeContact: "M. Rodriguez",
  sourceCurrency: "USD",
  disbursementCurrency: "MXN",
};

export const DISBURSEMENTS = [
  {
    id: "ETY-2026-04-0892",
    seller: "Casa Talavera Oaxaca",
    shopName: "CasaTalavera",
    description: "Weekly sales disbursement — 14 Apr 2026",
    category: "Ceramics & Pottery",
    ordersCount: 23,
    amountUSD: 1,
    amountMXN: 19,
    amountUSDC: 1,
    periodEnd: "2026-04-14",
    status: "overdue" as const,
    overdueDays: 3,
    bank: "BBVA Bancomer",
    clabe: "012180015457898085",
    recipient: "Aranza Sofia Venegas Torres",
    accountNumber: "1545789808",
    city: "Oaxaca de Juárez",
    state: "Oaxaca",
  },
  {
    id: "ETY-2026-04-0891",
    seller: "Bordados San Cristóbal",
    shopName: "BordadosSC",
    description: "Weekly sales disbursement — 14 Apr 2026",
    category: "Textiles & Embroidery",
    ordersCount: 15,
    amountUSD: 2,
    amountMXN: 38,
    amountUSDC: 2,
    periodEnd: "2026-04-14",
    status: "due" as const,
    overdueDays: 0,
    bank: "Banamex",
    clabe: "002180015432109876",
    recipient: "María Guadalupe Hernández",
    accountNumber: "1432109876",
    city: "San Cristóbal de las Casas",
    state: "Chiapas",
  },
  {
    id: "ETY-2026-04-0890",
    seller: "Plata Taxco Artesanos",
    shopName: "PlataTaxco",
    description: "Weekly sales disbursement — 14 Apr 2026",
    category: "Silver Jewelry",
    ordersCount: 31,
    amountUSD: 3,
    amountMXN: 57,
    amountUSDC: 3,
    periodEnd: "2026-04-14",
    status: "due" as const,
    overdueDays: 0,
    bank: "Santander MX",
    clabe: "014180015432109877",
    recipient: "Roberto Castillo Morales",
    accountNumber: "1432109877",
    city: "Taxco de Alarcón",
    state: "Guerrero",
  },
];

export type DisbursementBase = {
  id: string;
  seller: string;
  shopName: string;
  description: string;
  category: string;
  ordersCount: number;
  amountUSD: number;
  amountMXN: number;
  amountUSDC: number;
  periodEnd: string;
  status: "overdue" | "due" | "paid";
  overdueDays: number;
  bank: string;
  clabe: string;
  recipient: string;
  accountNumber: string;
  city: string;
  state: string;
};

export type Disbursement = DisbursementBase;

export const FX_RATE = 19.14;
export const USDC_MXN_RATE = 16.094;

export const SELLER_POOL = [
  {
    seller: "Alfarería Tonalá",
    shopName: "AlfareriaTonala",
    category: "Ceramics & Pottery",
    city: "Tonalá",
    state: "Jalisco",
    bank: "BBVA Bancomer",
    clabe: "012180015457898086",
    recipient: "Sofía Ramírez Gutiérrez",
    accountNumber: "1545789809",
  },
  {
    seller: "Huichol Art Studio",
    shopName: "HuicholArtMX",
    category: "Indigenous Art & Beadwork",
    city: "Tepic",
    state: "Nayarit",
    bank: "Banamex",
    clabe: "002180015432109877",
    recipient: "José Luis Carrillo",
    accountNumber: "1432109877",
  },
  {
    seller: "Textiles Teotitlán",
    shopName: "TeotilanWeavers",
    category: "Handwoven Rugs & Textiles",
    city: "Teotitlán del Valle",
    state: "Oaxaca",
    bank: "Santander MX",
    clabe: "014180015432109878",
    recipient: "Elena Mendoza Cruz",
    accountNumber: "1432109878",
  },
  {
    seller: "Lacas Uruapan",
    shopName: "LacasUruapan",
    category: "Lacquerware",
    city: "Uruapan",
    state: "Michoacán",
    bank: "Banorte",
    clabe: "006180015432109879",
    recipient: "Miguel Ángel Torres",
    accountNumber: "1432109879",
  },
  {
    seller: "Amate Paper Art",
    shopName: "AmateArteMX",
    category: "Paper Art & Bark Painting",
    city: "Xalitla",
    state: "Guerrero",
    bank: "HSBC México",
    clabe: "021180015432109880",
    recipient: "Lucía Flores Bautista",
    accountNumber: "1432109880",
  },
];
