export interface Product {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description: string;
}

export const products: Product[] = [
  { id: "hoodie", name: "Crypto Hoodie", emoji: "\ud83e\udde5", price: 0.99, description: "Stay warm, stay decentralized" },
  { id: "coffee-mug", name: "HODL Mug", emoji: "\u2615", price: 0.49, description: "Diamond hands need coffee" },
  { id: "laptop-bag", name: "Blockchain Bag", emoji: "\ud83d\udcbb", price: 0.89, description: "Carry your nodes in style" },
  { id: "sticker", name: "Sticker Pack", emoji: "\ud83c\udfa8", price: 0.10, description: "Plaster your laptop" },
  { id: "hat", name: "Web3 Cap", emoji: "\ud83e\udde2", price: 0.59, description: "Tip your cap to the future" },
  { id: "socks", name: "Gas Fee Socks", emoji: "\ud83e\udde6", price: 0.29, description: "Warm feet, low gas" },
  { id: "tshirt", name: "DeFi T-Shirt", emoji: "\ud83d\udc55", price: 0.79, description: "Yield farming casual wear" },
  { id: "poster", name: "Moon Poster", emoji: "\ud83c\udf19", price: 0.39, description: "When moon? Now moon." },
  { id: "keychain", name: "Private Key-chain", emoji: "\ud83d\udd11", price: 0.19, description: "Not your keys, not your crypto" },
];
