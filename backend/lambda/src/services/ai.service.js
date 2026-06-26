import { supabaseAdmin } from "../config/supabase.js";
import { logInfo, logError } from "../utils/http.js";

// Helper to calculate size based on height (cm), weight (kg), age, and preferred fit
export function recommendSize({ height, weight, age, preferredFit }) {
  // Convert height if passed as feet/inches
  let heightCm = Number(height);
  if (heightCm < 10) { // Assume feet (e.g. 5.9)
    const feet = Math.floor(heightCm);
    const inches = (heightCm - feet) * 10;
    heightCm = (feet * 30.48) + (inches * 2.54);
  }
  
  const weightKg = Number(weight);
  const ageYears = Number(age);
  const fit = String(preferredFit || "Regular").toLowerCase();

  // Validate inputs
  if (!heightCm || !weightKg) {
    return "M"; // default fallback
  }

  // Calculate BMI
  const bmi = weightKg / ((heightCm / 100) ** 2);
  
  // Base size map based on BMI
  let sizeIndex = 2; // Default "M"
  // XS, S, M, L, XL, XXL
  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

  if (bmi < 18.5) {
    sizeIndex = 1; // S
  } else if (bmi >= 18.5 && bmi < 23) {
    sizeIndex = 2; // M
  } else if (bmi >= 23 && bmi < 26) {
    sizeIndex = 3; // L
  } else if (bmi >= 26 && bmi < 29) {
    sizeIndex = 4; // XL
  } else if (bmi >= 29) {
    sizeIndex = 5; // XXL
  }

  // Adjust for age (slightly larger for comfort if older)
  if (ageYears > 40 && sizeIndex < 5) {
    sizeIndex += 1;
  }

  // Adjust for preferred fit
  if (fit === "tight" || fit === "fitted") {
    sizeIndex = Math.max(0, sizeIndex - 1);
  } else if (fit === "loose" || fit === "oversized" || fit === "relaxed") {
    sizeIndex = Math.min(sizes.length - 1, sizeIndex + 1);
  }

  return sizes[sizeIndex];
}

// NLP Parser to understand search intent
export async function parseSearchIntent(queryText) {
  const q = queryText.toLowerCase().trim();
  const intent = {
    color: null,
    fit: null,
    category: null,
    maxPrice: null,
    collection: null,
    styleIntent: null,
    searchKeyword: null
  };

  // Color extraction
  const colors = ["black", "white", "beige", "sand", "green", "forest green", "red", "blue", "grey", "navy"];
  for (const c of colors) {
    if (q.includes(c)) {
      intent.color = c === "sand" ? "beige" : c;
      break;
    }
  }

  // Fit extraction
  const fits = ["oversized", "regular", "relaxed", "fitted", "loose"];
  for (const f of fits) {
    if (q.includes(f)) {
      intent.fit = f === "loose" ? "relaxed" : f;
      break;
    }
  }

  // Category extraction
  if (q.includes("tshirt") || q.includes("t-shirt") || q.includes("tee") || q.includes("shirt")) {
    intent.category = "tshirt";
  } else if (q.includes("cargo") || q.includes("pant") || q.includes("bottom") || q.includes("trouser")) {
    intent.category = "cargo";
  } else if (q.includes("hoodie") || q.includes("sweatshirt") || q.includes("jacket")) {
    intent.category = "hoodie";
  } else if (q.includes("cap") || q.includes("hat")) {
    intent.category = "cap";
  }

  // Max price extraction (e.g. "under 1000", "below 1500")
  const priceMatch = q.match(/(?:under|below|less than|within|in|price)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i) || q.match(/(\d+)\s*(?:rs\.?|inr|₹)?\s*(?:under|below|limit)/i);
  if (priceMatch && priceMatch[1]) {
    intent.maxPrice = Number.parseInt(priceMatch[1], 10);
  }

  // Styling / Ocassion intent
  if (q.includes("office") || q.includes("work") || q.includes("casual") || q.includes("formal") || q.includes("premium")) {
    intent.styleIntent = "premium";
    intent.collection = "silent-luxury";
  } else if (q.includes("college") || q.includes("campus") || q.includes("hangout") || q.includes("everyday")) {
    intent.styleIntent = "college";
    intent.fit = intent.fit || "oversized";
  } else if (q.includes("trip") || q.includes("travel") || q.includes("weekend") || q.includes("vacation")) {
    intent.styleIntent = "travel";
    intent.fit = intent.fit || "relaxed";
  } else if (q.includes("gym") || q.includes("workout") || q.includes("fitness") || q.includes("train")) {
    intent.styleIntent = "fitness";
    intent.collection = "beast-mode";
  }

  // Explicit Collection matching based on display names / common terms if not already set
  if (!intent.collection) {
    if (q.includes("ai") || q.includes("tech") || q.includes("coding") || q.includes("developer")) {
      intent.collection = "ai-tech";
    } else if (q.includes("anime") || q.includes("slayer") || q.includes("demon") || q.includes("anarchy")) {
      intent.collection = "anime";
    } else if (q.includes("beast") || q.includes("grind")) {
      intent.collection = "beast-mode";
    } else if (q.includes("silent") || q.includes("luxury")) {
      intent.collection = "silent-luxury";
    } else if (q.includes("founder") || q.includes("hustle") || q.includes("builder")) {
      intent.collection = "founder";
    } else if (q.includes("savage") || q.includes("quotes")) {
      intent.collection = "savage-quotes";
    } else if (q.includes("xp") || q.includes("game") || q.includes("gaming")) {
      intent.collection = "xp-mode";
    } else if (q.includes("mind") || q.includes("mayhem")) {
      intent.collection = "mind-mayhem";
    }
  }

  // Keywords if nothing fits
  if (!intent.color && !intent.fit && !intent.category && !intent.collection) {
    intent.searchKeyword = queryText;
  }

  return intent;
}

// Fetch products based on NLP intent
export async function searchAiProducts(queryText, personalityType = null) {
  logInfo("Performing AI semantic search", { queryText, personalityType });
  const intent = await parseSearchIntent(queryText);
  
  // Fetch all active products
  const { data: allProducts, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("is_active", true);

  if (error) {
    logError("Supabase products fetch failed for AI search", { error });
    throw error;
  }

  // Score and filter products in-memory
  const scored = (allProducts || []).map((p) => {
    let score = 0;
    const nameLower = p.name.toLowerCase();
    const descLower = (p.description || "").toLowerCase();
    const collectionLower = (p.collection || "").toLowerCase();

    // 1. Color matching
    if (intent.color) {
      const colorsArr = Array.isArray(p.colors) ? p.colors : [];
      const hasColor = colorsArr.some(c => c.toLowerCase().includes(intent.color)) || nameLower.includes(intent.color) || descLower.includes(intent.color);
      if (hasColor) score += 5;
      else return { product: p, score: -1 }; // strict mismatch filter
    }

    // 2. Fit matching
    if (intent.fit) {
      const fitVal = (p.fit || "").toLowerCase();
      const hasFit = fitVal.includes(intent.fit) || nameLower.includes(intent.fit) || descLower.includes(intent.fit);
      if (hasFit) score += 3;
    }

    // 3. Category matching
    if (intent.category) {
      const categoryVal = (p.category || "").toLowerCase();
      const synonyms = {
        tshirt: ["tshirt", "t-shirt", "tee", "shirt"],
        cargo: ["cargo", "pant", "bottom", "trouser"],
        hoodie: ["hoodie", "sweatshirt", "jacket"],
        cap: ["cap", "hat"]
      }[intent.category] || [intent.category];

      const nameHasCat = synonyms.some(syn => nameLower.includes(syn) || descLower.includes(syn)) || categoryVal.includes(intent.category);
      if (nameHasCat) score += 5;
      else return { product: p, score: -1 }; // strict mismatch filter
    }

    // 4. Collection matching
    if (intent.collection) {
      if (collectionLower.includes(intent.collection)) score += 4;
    }

    // 5. Price restriction
    if (intent.maxPrice) {
      if (Number(p.price) <= intent.maxPrice) score += 3;
      else return { product: p, score: -1 }; // strict mismatch filter
    }

    // 6. Style context / keywords
    if (intent.styleIntent) {
      if (intent.styleIntent === "premium" && (collectionLower.includes("silent-luxury") || descLower.includes("egyptian") || descLower.includes("supima"))) {
        score += 3;
      }
      if (intent.styleIntent === "college" && (p.fit === "Oversized" || collectionLower.includes("anime") || collectionLower.includes("tech"))) {
        score += 2;
      }
      if (intent.styleIntent === "travel" && (p.fit === "Relaxed Fit" || nameLower.includes("cargo") || descLower.includes("canvas") || descLower.includes("comfort"))) {
        score += 2;
      }
    }

    // 7. General search term fallback
    if (intent.searchKeyword) {
      const kw = intent.searchKeyword.toLowerCase();
      const tagLower = (p.tag || "").toLowerCase();
      
      const collectionDisplayNames = {
        "ai-tech": ["ai & tech humor", "ai and tech", "ai", "tech", "coding", "developer", "neural network"],
        "anime": ["anime", "anime anarchy", "demon", "slayer"],
        "beast-mode": ["beast mode", "beast mode grind", "fitness", "gym", "workout", "grind"],
        "silent-luxury": ["silent luxury", "minimalist", "premium"],
        "founder": ["founder", "founder energy", "hustle"],
        "savage-quotes": ["savage quotes", "quotes"],
        "xp-mode": ["xp mode", "gaming", "game"],
        "mind-mayhem": ["mind over mayhem", "mind palace", "mayhem"],
      };

      const matchedColKeywords = collectionDisplayNames[p.collection] || [];
      const hasCollectionNameMatch = matchedColKeywords.some(kwVal => kw.includes(kwVal) || kwVal.includes(kw));

      if (nameLower.includes(kw)) score += 10;
      else if (descLower.includes(kw)) score += 5;
      else if (collectionLower.includes(kw)) score += 3;
      else if (tagLower.includes(kw) || (kw === "bestseller" && tagLower === "bestseller") || (kw === "most loved" && tagLower === "most loved") || (kw === "trending" && tagLower === "trending")) score += 8;
      else if (hasCollectionNameMatch) score += 8;
      else return { product: p, score: -1 };
    }

    // 8. User Personality Type booster
    if (personalityType) {
      const pType = String(personalityType).toUpperCase();
      if (pType === "BUILDER") {
        if (collectionLower === "ai-tech" || collectionLower === "founder") score += 5;
        if (fitVal === "oversized") score += 2;
      } else if (pType === "ALPHA") {
        if (collectionLower === "beast-mode") score += 5;
        if (p.tag === "BESTSELLER" || p.tag === "TRENDING" || p.tag === "HOT") score += 3;
      } else if (pType === "SHADOW") {
        if (collectionLower === "silent-luxury") score += 5;
        if (nameLower.includes("black") || descLower.includes("black")) score += 3;
      } else if (pType === "CREATOR") {
        if (collectionLower === "anime") score += 5;
        if (p.tag === "LIMITED" || p.tag === "NEW") score += 3;
      }
    }

    return { product: p, score };
  });

  // Sort by score and filter out negatives
  return scored
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.product);
}

// Personalized Recommendations based on browsing history, wishlist, and cart activity
export async function getPersonalizedRecommendations({ history = [], wishlist = [], cart = [], userId }) {
  logInfo("Generating personalized recommendations", { userId, historyLen: history.length });

  // Load all active products
  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  // Get active product IDs in cart
  const cartIds = cart.map(item => item.id || item.product_id);
  const wishlistIds = wishlist.map(item => item.id || item.product_id);

  // If no history, return top rated or best sellers
  if (history.length === 0 && wishlistIds.length === 0 && cartIds.length === 0) {
    return (products || [])
      .sort((a, b) => Number(b.rating || 4.5) - Number(a.rating || 4.5))
      .slice(0, 6);
  }

  // Determine user's preferred collections/fits/categories
  const interactiveProducts = (products || []).filter(p => 
    history.includes(p.id) || history.includes(p.slug) || wishlistIds.includes(p.id) || cartIds.includes(p.id)
  );

  const preferredCollections = interactiveProducts.map(p => p.collection).filter(Boolean);
  const preferredFits = interactiveProducts.map(p => p.fit).filter(Boolean);
  const preferredCategories = interactiveProducts.map(p => p.category).filter(Boolean);

  // Fetch user personality type if logged in
  let personalityType = null;
  if (userId) {
    try {
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("personality_type")
        .eq("id", userId)
        .maybeSingle();
      personalityType = userData?.personality_type;
    } catch {
      // Ignore DB read failure for guest/offline scenarios
    }
  }

  // Score other products
  const scored = (products || [])
    .filter(p => !cartIds.includes(p.id)) // exclude products already in cart
    .map(p => {
      let score = 0;
      if (preferredCollections.includes(p.collection)) score += 3;
      if (preferredFits.includes(p.fit)) score += 2;
      if (preferredCategories.includes(p.category)) score += 2;
      if (wishlistIds.includes(p.id)) score += 5; // highly valued
      if (p.is_best_seller) score += 1;

      // Personality type booster
      if (personalityType) {
        const collectionLower = (p.collection || "").toLowerCase();
        const pType = String(personalityType).toUpperCase();
        if (pType === "BUILDER" && (collectionLower === "ai-tech" || collectionLower === "founder" || collectionLower === "silent-luxury")) {
          score += 4;
        } else if (pType === "ALPHA" && (collectionLower === "beast-mode" || collectionLower === "savage-quotes")) {
          score += 4;
        } else if (pType === "SHADOW" && collectionLower === "silent-luxury") {
          score += 4;
        } else if (pType === "CREATOR" && (collectionLower === "anime" || collectionLower === "ai-tech")) {
          score += 4;
        }
      }

      return { product: p, score };
    });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(item => item.product);
}

// Smart Bundles matching recommendation
export async function getSmartBundles(productId) {
  // Find current product
  const { data: baseProduct, error: baseError } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (baseError || !baseProduct) {
    // If not found by ID, try slug
    const { data: fallbackProduct } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("slug", productId)
      .single();
    if (!fallbackProduct) return [];
    productId = fallbackProduct.id;
  }

  // Load all products
  const { data: allProducts } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("is_active", true)
    .neq("id", productId);

  if (!allProducts || allProducts.length === 0) return [];

  // Rules:
  // If product is a Tee -> bundle with Cargo and Cap
  // If product is a Cargo -> bundle with Tee and Cap
  // If product is a Hoodie -> bundle with Cargo and Cap
  // If product is a Cap -> bundle with Tee and Cargo

  const bundleList = [];
  const cargoes = allProducts.filter(p => String(p.name || "").toLowerCase().includes("cargo") || p.category === "cargo");
  const tees = allProducts.filter(p => String(p.name || "").toLowerCase().includes("tee") || String(p.name || "").toLowerCase().includes("tshirt") || p.category === "tshirt");
  const caps = allProducts.filter(p => String(p.name || "").toLowerCase().includes("cap") || p.category === "cap");

  const nameLower = String(baseProduct.name).toLowerCase();
  const isTee = nameLower.includes("tee") || nameLower.includes("tshirt") || baseProduct.category === "tshirt";
  const isCargo = nameLower.includes("cargo") || baseProduct.category === "cargo";
  const isCap = nameLower.includes("cap") || baseProduct.category === "cap";

  if (isTee) {
    if (cargoes.length > 0) bundleList.push(cargoes[0]);
    if (caps.length > 0) bundleList.push(caps[0]);
    if (tees.length > 0 && bundleList.length < 2) bundleList.push(tees[0]);
  } else if (isCargo) {
    if (tees.length > 0) bundleList.push(tees[0]);
    if (caps.length > 0) bundleList.push(caps[0]);
  } else if (isCap) {
    if (tees.length > 0) bundleList.push(tees[0]);
    if (cargoes.length > 0) bundleList.push(cargoes[0]);
  } else {
    // general fallback - recommend next two highly rated items
    allProducts.slice(0, 2).forEach(p => bundleList.push(p));
  }

  return bundleList;
}

// Conversation agent state handler
export async function chatAssistantDialog(messages = [], personalityType = null) {
  if (messages.length === 0) {
    const welcome = personalityType
      ? `Hello! I see you are styled as a ${personalityType} Wolf 🐺. I am your VelvetWolf AI Stylist ✦. What are you looking to wear?`
      : "Hello! I am your VelvetWolf AI Stylist ✦. What are you looking to wear? You can ask me to help you choose an outfit, find pieces under a price limit, or pick the best fit for an occasion!";
    return {
      message: welcome,
      products: []
    };
  }

  const lastMessage = messages[messages.length - 1].content || "";
  const text = lastMessage.toLowerCase().trim();

  let replyText = "";
  let recommendedProducts = [];

  try {
    if (text.includes("weekend trip") || text.includes("trip") || text.includes("travel") || text.includes("vacation")) {
      replyText = "For a weekend trip, we highly recommend an outfit that combines comfort with streetwear style. A relaxed look like our Sand/Beige Cargo coupled with our Forest Green Tee and a Signature Cap is perfect for active exploration and looking sharp. Here are some top picks for your travel canvas:";
      recommendedProducts = await searchAiProducts("relaxed beige forest green", personalityType);
      if (recommendedProducts.length === 0) {
        recommendedProducts = await searchAiProducts("cargo tee cap", personalityType);
      }
    } else if (text.includes("office") || text.includes("work") || text.includes("formal") || text.includes("casual")) {
      replyText = "For office casual or premium daily wear, less is more. We recommend our 'Silent Luxury' collection: minimalist colors (black, beige) with zero loud print, built on 220 GSM luxury Supima and Egyptian cotton. Here are our top office casual recommendations:";
      recommendedProducts = await searchAiProducts("silent luxury black beige", personalityType);
    } else if (text.includes("college") || text.includes("university") || text.includes("campus") || text.includes("friend")) {
      replyText = "For college hangouts, go bold with oversized fit streetwear and culture-first drops like Anime or AI Tech humor Tees. Pair them with relaxed cargoes. Here are some popular student styling items:";
      recommendedProducts = await searchAiProducts("oversized anime tech tee", personalityType);
    } else if (text.includes("under") || text.includes("budget") || text.includes("price") || text.includes("below")) {
      // Find digit
      const numMatch = text.match(/\d+/);
      const budget = numMatch ? Number.parseInt(numMatch[0], 10) : 1000;
      replyText = `Here are some of our finest premium streetwear pieces priced under ₹${budget}:`;
      recommendedProducts = await searchAiProducts(`under ${budget}`, personalityType);
    } else {
      // General NLP search matching
      recommendedProducts = await searchAiProducts(lastMessage, personalityType);
      if (recommendedProducts.length > 0) {
        replyText = `I found these pieces matching your request: "${lastMessage}". Let me know if you would like styling tips or size guidance!`;
      } else {
        replyText = "I couldn't find a direct match. Tell me what color, fit (e.g. oversized), or occasion you are styling for and I'll find the perfect match for you!";
        // suggest bestseller
        const { data: top } = await supabaseAdmin.from("products").select("*").eq("is_active", true).limit(3);
        recommendedProducts = top || [];
      }
    }
  } catch (err) {
    replyText = "I ran into a small error fetching styling products, but let me know what occasion you're dressing for!";
  }

  return {
    message: replyText,
    products: recommendedProducts.slice(0, 3)
  };
}
