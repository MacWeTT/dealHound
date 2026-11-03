import { describe, expect, it } from 'vitest';

import { extractOfferFromHtml, isSafePublicProductUrl } from '@/server/acquisition/json-ld-extractor';

describe('json-ld-extractor', () => {
  it('extracts an INR offer, MPN, stock status, and image from schema.org/Product JSON-LD', () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "Asus TUF Gaming A15 FA507NV-LP082W (Ryzen 7 8845HS / 16GB DDR5 / 1TB SSD / RTX 5060 8GB)",
              "sku": "MDC-FA507NV",
              "mpn": "FA507NV-LP082W",
              "image": ["https://mdcomputers.in/images/tuf-a15.jpg"],
              "offers": {
                "@type": "Offer",
                "priceCurrency": "INR",
                "price": "88,990.00",
                "availability": "https://schema.org/InStock"
              }
            }
          </script>
        </head>
        <body></body>
      </html>
    `;

    const offer = extractOfferFromHtml(
      html,
      'https://mdcomputers.in/asus-tuf-a15-fa507nv-lp082w.html',
      'mdcomputers',
      '2026-11-04T01:00:00.000Z',
    );

    expect(offer).not.toBeNull();

    if (offer) {
      expect(offer.retailerId).toBe('mdcomputers');
      expect(offer.retailerName).toBe('MDComputers');
      expect(offer.mpn).toBe('FA507NV-LP082W');
      expect(offer.basePricePaise).toBe(8_899_000);
      expect(offer.inStock).toBe(true);
    }
  });

  it('guards against SSRF by blocking loopback, private LAN, link-local metadata, and non-HTTPS hosts', () => {
    expect(isSafePublicProductUrl('https://www.amazon.in/dp/B0DF5060NV')).toBe(true);
    expect(isSafePublicProductUrl('https://mdcomputers.in/laptop.html')).toBe(true);
    expect(isSafePublicProductUrl('http://www.amazon.in/dp/B0DF5060NV')).toBe(false);
    expect(isSafePublicProductUrl('https://localhost:3000/secret')).toBe(false);
    expect(isSafePublicProductUrl('https://127.0.0.1/admin')).toBe(false);
    expect(isSafePublicProductUrl('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isSafePublicProductUrl('https://192.168.1.10/router')).toBe(false);
  });
});

