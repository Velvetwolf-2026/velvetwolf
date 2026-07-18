export const COLLECTIONS = [
  { id: "ai-tech", name: "AI & Tech Humor", icon: "cpu", color: "#4fc3f7" },
  { id: "anime", name: "Anime", icon: "sparkles", color: "#f06292" },
  { id: "xp-mode", name: "XP Mode: Activated", icon: "gamecontroller", color: "#81c784" },
  { id: "beast-mode", name: "Beast Mode Grind", icon: "dumbbell", color: "#ff8a65" },
  { id: "mind-mayhem", name: "Mind Over Mayhem", icon: "brain", color: "#ce93d8" },
  { id: "silent-luxury", name: "Silent Luxury", icon: "diamond", color: "#c9a84c" },
  { id: "savage-quotes", name: "Savage Quotes", icon: "fire", color: "#ef5350" },
  { id: "founder", name: "Founder Energy", icon: "rocket", color: "#ffd54f" },
  { id: "cars", name: "Cars", icon: "car", color: "#e57373" },
  { id: "motivation", name: "Motivation", icon: "trophy", color: "#ffb74d" },
  { id: "minimalist", name: "Minimalist", icon: "layers", color: "#e0e0e0" },
  { id: "trending", name: "Trending Now", icon: "trendingUp", color: "#80cbc4" },
  { id: "limited", name: "Limited Edition", icon: "tag", color: "#ffab91" },
  { id: "most-loved", name: "Most Loved", icon: "heart", color: "#f48fb1" },
  { id: "budget", name: "Under ₹999", icon: "rupee", color: "#a5d6a7" },
];

export const INITIAL_COLLECTION_PRODUCTS = [
  { id: "3f8b5e7a-9d2a-4c1b-b6a2-1a8f0d5e2c11", name: "Neural Network Tee", collection: "ai-tech", price: 1299, originalPrice: 1899, image: null, sizes: ["XS", "S", "M", "L", "XL", "XXL"], colors: ["#0a0a0a", "#1a1a2e", "#f0ede8"], rating: 4.8, reviews: 234, tag: "BESTSELLER", description: "Minimal circuit-board motif. 100% Egyptian cotton, 220 GSM.", stock: 45 },
  { id: "8a1c4d92-5f3e-4c8b-9f2a-6d7b1e0c3a44", name: "Silent Predator", collection: "silent-luxury", price: 2499, originalPrice: 3200, image: "/mockup_silent.webp", modelImage: "/model_silent.png", sizes: ["S", "M", "L", "XL"], colors: ["#0a0a0a", "#2c2c2c"], rating: 4.9, reviews: 189, tag: "LIMITED", description: "Embossed wolf crest. Supima cotton, hand-stitched details.", stock: 12 },
  { id: "c2d91a6e-3f5b-4b7a-a9e1-2d8c6f4b7e55", name: "Founder's Mindset", collection: "founder", price: 1599, originalPrice: 1999, image: "/mockup_founder.webp", modelImage: "/model_founder.png", sizes: ["XS", "S", "M", "L", "XL", "XXL"], colors: ["#0a0a0a", "#1a1a1a", "#faf9f7"], rating: 4.7, reviews: 312, tag: "NEW", description: "Bold motivational typography. Heavyweight fleece blend.", stock: 78 },
  { id: "f7e3b9a1-2c6d-4d8e-b1a9-9c3e7f2b1a66", name: "Demon Mode Activated", collection: "anime", price: 899, originalPrice: 1299, image: null, sizes: ["S", "M", "L", "XL"], colors: ["#0a0a0a", "#1a0010"], rating: 4.6, reviews: 445, tag: "TRENDING", description: "Anime-inspired demon slayer aesthetic. Oversized drop cut.", stock: 33 },
  { id: "1b6e4c8d-7f2a-4a3b-9e5c-5d7a9c2b8e77", name: "100 Days of Grind", collection: "beast-mode", price: 1199, originalPrice: 1499, image: "/mockup_beast.webp", modelImage: "/model_beast.png", sizes: ["M", "L", "XL", "XXL"], colors: ["#0a0a0a", "#111111"], rating: 4.8, reviews: 267, tag: "HOT", description: "Motivational beast-mode print. Moisture-wicking fabric.", stock: 56 },
  { id: "9c4a7e2b-5d1f-4f6a-8b3c-2e9a1d7c9f88", name: "Error 404: Sleep", collection: "ai-tech", price: 799, originalPrice: 999, image: null, sizes: ["XS", "S", "M", "L", "XL", "XXL"], colors: ["#0a0a0a", "#0a1628", "#faf9f7"], rating: 4.5, reviews: 523, tag: "MOST LOVED", description: "Geek humor meets streetwear. Ultra-soft jersey.", stock: 120 },
  { id: "6e2b9d4f-1c7a-4e8b-b3f2-8a6c5d1e0a99", name: "Wolf Among Sheep", collection: "savage-quotes", price: 1399, originalPrice: 1799, image: null, sizes: ["S", "M", "L", "XL"], colors: ["#0a0a0a", "#2a0a0a"], rating: 4.9, reviews: 198, tag: "SIGNATURE", description: "Signature VelvetWolf statement piece. Garment-dyed.", stock: 29 },
  { id: "4d7a1c9e-8b2f-4a6d-9c3e-7f5a2b1d0caa", name: "Mind Palace Tee", collection: "mind-mayhem", price: 1699, originalPrice: 2199, image: null, sizes: ["XS", "S", "M", "L", "XL"], colors: ["#0a0a0a", "#0a0a1a", "#1a0a0a"], rating: 4.7, reviews: 143, tag: "NEW", description: "Surrealist brain artwork. Artist collaboration piece.", stock: 41 }
];

export const HOME_COLLECTION_IDS = ["trending", "beast-mode", "anime", "ai-tech", "silent-luxury"];
export const HOME_COLLECTIONS = HOME_COLLECTION_IDS.map(id => COLLECTIONS.find(col => col.id === id)).filter(Boolean);
export const BROWSE_COLLECTIONS = COLLECTIONS;

export function getCollectionById(id) {
  return COLLECTIONS.find(col => col.id === id) || null;
}
