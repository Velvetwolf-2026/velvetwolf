import { describe, it, expect } from "vitest";
import { pageMeta, productLd, organizationLd, faqLd, SITE_URL } from "../velvetwolf/utils/seo";
import { FAQ } from "../velvetwolf/gallery/help/content";

const find = (meta, pred) => meta.find(pred);

describe("seo", () => {
  it("gives every page a www canonical, social cards and its structured data", () => {
    const meta = pageMeta({ title: "Size guide · VelvetWolf", description: "x".repeat(100), path: "/size-guide", schema: [{ "@type": "WebPage" }] });
    expect(SITE_URL).toBe("https://www.velvetwolf.in");
    expect(find(meta, (m) => m.rel === "canonical").href).toBe("https://www.velvetwolf.in/size-guide");
    expect(find(meta, (m) => m.property === "og:url").content).toBe("https://www.velvetwolf.in/size-guide");
    expect(find(meta, (m) => m.property === "og:image").content).toMatch(/^https:\/\/www\.velvetwolf\.in\//);
    expect(find(meta, (m) => m.name === "twitter:card").content).toBe("summary_large_image");
    expect(find(meta, (m) => m["script:ld+json"])["script:ld+json"]["@context"]).toBe("https://schema.org");
  });

  it("leaves noindex pages without a canonical", () => {
    const meta = pageMeta({ title: "t", description: "d", path: "/cart", noindex: true });
    expect(find(meta, (m) => m.rel === "canonical")).toBeUndefined();
    expect(find(meta, (m) => m.name === "robots").content).toBe("noindex");
  });

  it("describes a product with price, stock, returns and delivery", () => {
    const ld = productLd({ id: "p1", slug: "quiet", name: "Quiet Tee", price: 599, stock: 0, images: ["Black::https://cdn.example/a.jpg"], sizes: ["S", "M"] });
    expect(ld.offers).toMatchObject({ price: 599, priceCurrency: "INR", availability: "https://schema.org/OutOfStock" });
    expect(ld.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(7);
    expect(ld.offers.shippingDetails.shippingRate.value).toBe(0);
    expect(ld.image[0]).toBe("https://cdn.example/a.jpg");
    expect(ld.brand.name).toBe("VelvetWolf");
  });

  it("states the business's contact details and hours, and the FAQ as plain text", () => {
    const org = organizationLd();
    expect(org.contactPoint[0]).toMatchObject({ email: "info@velvetwolf.in", telephone: "+917338816732" });
    expect(org.openingHoursSpecification[0].dayOfWeek).toHaveLength(6);
    const faq = faqLd(FAQ);
    expect(faq.mainEntity).toHaveLength(FAQ.length);
    expect(faq.mainEntity.every((q) => !/<[a-z]/i.test(q.acceptedAnswer.text))).toBe(true);
  });
});
