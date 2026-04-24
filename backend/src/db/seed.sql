-- backend/src/db/seed.sql
-- ElecSHOP Seed Data
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING

-- ─────────────────────────────────────────────────────────────────────────────
-- Categories
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO categories (name, slug, icon) VALUES
  ('Smartphones',  'smartphones',  'smartphone'),
  ('Laptops',      'laptops',      'laptop'),
  ('Audio',        'audio',        'headphones'),
  ('Wearables',    'wearables',    'watch'),
  ('Gaming',       'gaming',       'gamepad'),
  ('Accessories',  'accessories',  'cable')
ON CONFLICT (slug) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- Products — Smartphones (6 products)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO products (name, slug, description, price, image_url, category_id, stock, rating, review_count, is_featured, specs)
SELECT
  p.name, p.slug, p.description, p.price, p.image_url, c.id, p.stock, p.rating, p.review_count, p.is_featured, p.specs::jsonb
FROM (VALUES
  (
    'NovaPro X15',
    'novapro-x15',
    'The flagship NovaPro X15 delivers a stunning 6.7" Dynamic AMOLED display, triple-lens camera system with 200MP main sensor, and an all-day 5000mAh battery. 5G-ready and powered by the latest Snapdragon 8 Gen 3 processor.',
    1299.99,
    '/images/products/smartphone-novapro-x15.webp',
    150, 4.8, 1247, true,
    '{"display":"6.7\" Dynamic AMOLED 120Hz","processor":"Snapdragon 8 Gen 3","ram":"12GB","storage":"256GB","camera":"200MP + 12MP + 10MP","battery":"5000mAh","os":"Android 14"}'
  ),
  (
    'NovaPro S12',
    'novapro-s12',
    'A perfect balance of performance and price. The NovaPro S12 features a 6.4" Super AMOLED screen, 108MP camera, and fast 45W charging. Great for everyday use.',
    799.99,
    '/images/products/smartphone-novapro-s12.webp',
    240, 4.5, 892, false,
    '{"display":"6.4\" Super AMOLED 90Hz","processor":"Snapdragon 7s Gen 3","ram":"8GB","storage":"128GB","camera":"108MP + 8MP + 5MP","battery":"4500mAh","os":"Android 14"}'
  ),
  (
    'LitePhone Z',
    'litephone-z',
    'Ultra-slim design at just 6.7mm. The LitePhone Z packs a punch with its 48MP camera and vibrant 6.1" OLED screen, all in a featherlight 159g form factor.',
    549.99,
    '/images/products/smartphone-litephone-z.webp',
    320, 4.3, 541, false,
    '{"display":"6.1\" OLED 60Hz","processor":"Helio G99","ram":"6GB","storage":"128GB","camera":"48MP + 5MP","battery":"3800mAh","os":"Android 13"}'
  ),
  (
    'Apex Ultra Fold',
    'apex-ultra-fold',
    'The future is foldable. Apex Ultra Fold opens to a 7.6" flexible AMOLED display and folds to a compact 6.2" cover screen. With IPX8 water resistance and Gorilla Glass Victus 2.',
    1799.99,
    '/images/products/smartphone-apex-fold.webp',
    80, 4.7, 312, true,
    '{"display":"7.6\" Foldable AMOLED + 6.2\" Cover","processor":"Snapdragon 8 Gen 3","ram":"12GB","storage":"512GB","camera":"50MP + 12MP + 10MP","battery":"4400mAh","os":"Android 14"}'
  ),
  (
    'BudgetPro 5G',
    'budgetpro-5g',
    'Affordable 5G smartphone with a large 6.5" LCD display and 50MP main camera. Ideal for budget-conscious buyers who still want modern connectivity.',
    299.99,
    '/images/products/smartphone-budgetpro-5g.webp',
    500, 4.0, 1823, false,
    '{"display":"6.5\" LCD 90Hz","processor":"Dimensity 700","ram":"4GB","storage":"64GB","camera":"50MP + 2MP","battery":"5000mAh","os":"Android 13"}'
  ),
  (
    'MiniPhone Pro',
    'miniphone-pro',
    'Compact powerhouse. The MiniPhone Pro squeezes flagship specs into a 5.4" form factor, making it the perfect one-handed phone with premium build quality.',
    649.99,
    '/images/products/smartphone-miniphone-pro.webp',
    175, 4.4, 687, false,
    '{"display":"5.4\" Super Retina OLED","processor":"A16 Bionic","ram":"6GB","storage":"128GB","camera":"12MP + 12MP","battery":"2438mAh","os":"iOS 17"}'
  )
) AS p(name, slug, description, price, image_url, stock, rating, review_count, is_featured, specs)
JOIN categories c ON c.slug = 'smartphones'
ON CONFLICT (slug) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- Products — Laptops (4 products)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO products (name, slug, description, price, image_url, category_id, stock, rating, review_count, is_featured, specs)
SELECT
  p.name, p.slug, p.description, p.price, p.image_url, c.id, p.stock, p.rating, p.review_count, p.is_featured, p.specs::jsonb
FROM (VALUES
  (
    'TitanBook Pro 16',
    'titanbook-pro-16',
    'Professional-grade laptop with a stunning 16" Mini-LED display, Intel Core Ultra 9 processor, and NVIDIA RTX 4070. Built for creators and developers who demand the best.',
    2499.99,
    '/images/products/laptop-titanbook-pro16.webp',
    60, 4.9, 432, true,
    '{"display":"16\" Mini-LED 3840x2400 120Hz","processor":"Intel Core Ultra 9 185H","ram":"32GB DDR5","storage":"1TB NVMe SSD","gpu":"NVIDIA RTX 4070 8GB","battery":"99.9Wh","os":"Windows 11 Pro"}'
  ),
  (
    'SlimBook Air 14',
    'slimbook-air-14',
    'Ultraportable at just 1.2kg. The SlimBook Air 14 offers all-day battery life (up to 18 hours), a gorgeous 2.8K OLED screen, and silent fanless operation for on-the-go productivity.',
    1149.99,
    '/images/products/laptop-slimbook-air14.webp',
    120, 4.6, 798, true,
    '{"display":"14\" OLED 2880x1800 90Hz","processor":"AMD Ryzen 7 8840U","ram":"16GB LPDDR5","storage":"512GB NVMe SSD","gpu":"AMD Radeon 780M","battery":"75Wh (18hr)","os":"Windows 11 Home"}'
  ),
  (
    'GameForce G15',
    'gameforce-g15',
    'Dominate every game with the GameForce G15. Equipped with a 165Hz QHD display, RTX 4060, and advanced thermal management to stay cool under pressure.',
    1399.99,
    '/images/products/laptop-gameforce-g15.webp',
    85, 4.5, 623, false,
    '{"display":"15.6\" IPS QHD 165Hz","processor":"Intel Core i7-13700H","ram":"16GB DDR5","storage":"512GB NVMe SSD","gpu":"NVIDIA RTX 4060 8GB","battery":"86Wh","os":"Windows 11 Home"}'
  ),
  (
    'WorkStation W12',
    'workstation-w12',
    'A mobile workstation built to handle complex simulations, 3D rendering, and data science workloads. Features ECC memory support and professional-grade ISV certifications.',
    3199.99,
    '/images/products/laptop-workstation-w12.webp',
    30, 4.7, 189, false,
    '{"display":"15\" 4K IPS Anti-Glare","processor":"Intel Core Ultra 9 185HX","ram":"64GB ECC DDR5","storage":"2TB NVMe SSD","gpu":"NVIDIA RTX 3000 Ada 12GB","battery":"96Wh","os":"Windows 11 Pro"}'
  )
) AS p(name, slug, description, price, image_url, stock, rating, review_count, is_featured, specs)
JOIN categories c ON c.slug = 'laptops'
ON CONFLICT (slug) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- Products — Audio (4 products)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO products (name, slug, description, price, image_url, category_id, stock, rating, review_count, is_featured, specs)
SELECT
  p.name, p.slug, p.description, p.price, p.image_url, c.id, p.stock, p.rating, p.review_count, p.is_featured, p.specs::jsonb
FROM (VALUES
  (
    'SoundSphere ANC Pro',
    'soundsphere-anc-pro',
    'Industry-leading Active Noise Cancellation with 40+ hours of battery life. The SoundSphere ANC Pro delivers studio-quality audio with spatial sound and a premium build that molds to your ears.',
    349.99,
    '/images/products/audio-soundsphere-anc-pro.webp',
    200, 4.8, 2341, true,
    '{"type":"Over-ear","anc":"Adaptive ANC + Transparency","driver":"40mm Dynamic","frequency":"4Hz–40kHz","battery":"40hr (ANC on)","connection":"Bluetooth 5.3 + 3.5mm","codec":"AAC, LDAC, aptX HD"}'
  ),
  (
    'TrueAir Buds X',
    'trueair-buds-x',
    'Premium true wireless earbuds with a custom 11mm driver, 6 mic beam-forming array for crystal-clear calls, and IPX5 water resistance. Up to 36 hours total with the charging case.',
    179.99,
    '/images/products/audio-trueair-buds-x.webp',
    350, 4.5, 1876, false,
    '{"type":"In-ear TWS","anc":"Hybrid ANC","driver":"11mm Dynamic","battery":"9hr + 27hr case","connection":"Bluetooth 5.3","ipx":"IPX5","codec":"AAC, SBC"}'
  ),
  (
    'StudioPod Monitor HP',
    'studiopod-monitor-hp',
    'Reference-grade open-back headphones for audio professionals and audiophiles. Features hand-crafted memory foam ear cushions, a detachable cable system, and a flat frequency response.',
    499.99,
    '/images/products/audio-studiopod-monitor.webp',
    45, 4.9, 412, false,
    '{"type":"Over-ear open-back","driver":"50mm Planar Magnetic","impedance":"250 Ohm","frequency":"10Hz–41kHz","weight":"330g","connection":"Wired 3.5mm + 6.35mm adapter"}'
  ),
  (
    'BassBlast Speaker 360',
    'bassblast-speaker-360',
    'Omnidirectional portable speaker with 360° surround sound, deep bass radiator, and 20-hour battery life. Waterproof (IP67) and built to survive any adventure.',
    129.99,
    '/images/products/audio-bassblast-360.webp',
    280, 4.4, 934, false,
    '{"type":"Portable Bluetooth Speaker","output":"40W RMS","battery":"20hr","ipx":"IP67","connection":"Bluetooth 5.0","dimensions":"18cm × 9cm"}'
  )
) AS p(name, slug, description, price, image_url, stock, rating, review_count, is_featured, specs)
JOIN categories c ON c.slug = 'audio'
ON CONFLICT (slug) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- Products — Wearables (2 products)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO products (name, slug, description, price, image_url, category_id, stock, rating, review_count, is_featured, specs)
SELECT
  p.name, p.slug, p.description, p.price, p.image_url, c.id, p.stock, p.rating, p.review_count, p.is_featured, p.specs::jsonb
FROM (VALUES
  (
    'PulseWatch Ultra 2',
    'pulsewatch-ultra-2',
    'Advanced health tracking meets premium design. Monitor ECG, blood oxygen, sleep stages, and stress levels. Titanium case, sapphire crystal, and 18-day battery life make this the ultimate smartwatch.',
    449.99,
    '/images/products/wearable-pulsewatch-ultra2.webp',
    130, 4.7, 867, true,
    '{"display":"1.95\" Always-on AMOLED","case":"Titanium","sensors":"ECG, SpO2, Heart Rate, GPS, Thermometer","battery":"18 days","water_resistance":"100m","os":"WatchOS 4.0"}'
  ),
  (
    'FitBand Pro 6',
    'fitband-pro-6',
    'A slim, lightweight fitness band that does it all. Tracks 100+ workouts, monitors heart rate 24/7, and lasts 14 days on a charge. Perfect entry point into health tracking.',
    89.99,
    '/images/products/wearable-fitband-pro6.webp',
    420, 4.3, 2109, false,
    '{"display":"1.47\" AMOLED","sensors":"Heart Rate, SpO2, Stress","battery":"14 days","water_resistance":"5ATM","workouts":"100+ modes"}'
  )
) AS p(name, slug, description, price, image_url, stock, rating, review_count, is_featured, specs)
JOIN categories c ON c.slug = 'wearables'
ON CONFLICT (slug) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- Products — Gaming (3 products)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO products (name, slug, description, price, image_url, category_id, stock, rating, review_count, is_featured, specs)
SELECT
  p.name, p.slug, p.description, p.price, p.image_url, c.id, p.stock, p.rating, p.review_count, p.is_featured, p.specs::jsonb
FROM (VALUES
  (
    'NextGen Handheld Pro',
    'nextgen-handheld-pro',
    'Play your PC game library anywhere. The NextGen Handheld Pro features a stunning 7" 144Hz OLED screen, AMD Ryzen 7 8840U, and 50Wh battery with quick-charge support.',
    699.99,
    '/images/products/gaming-handheld-pro.webp',
    95, 4.6, 741, true,
    '{"display":"7\" OLED 1080p 144Hz","processor":"AMD Ryzen 7 8840U","ram":"16GB LPDDR5","storage":"512GB NVMe SSD","battery":"50Wh","os":"SteamOS / Windows 11"}'
  ),
  (
    'ProPad Titan Controller',
    'propad-titan-controller',
    'Tournament-grade wireless controller with Hall Effect thumbsticks (zero drift), adjustable triggers, instant polling rate, and 30-hour battery. Compatible with PC and all modern consoles.',
    129.99,
    '/images/products/gaming-propad-titan.webp',
    260, 4.8, 1432, false,
    '{"thumbsticks":"Hall Effect (zero drift)","triggers":"Adjustable resistance + Hall Effect","connection":"2.4GHz wireless + Bluetooth + USB-C","battery":"30hr","polling_rate":"1000Hz"}'
  ),
  (
    'ViperRGB Gaming Mouse',
    'viperrgb-gaming-mouse',
    '8000 DPI optical sensor with hardware-accurate tracking. Ultralight honeycomb design at 71g, 8 programmable buttons, and per-key RGB lighting. The go-to choice for FPS pros.',
    79.99,
    '/images/products/gaming-viper-rgb.webp',
    380, 4.7, 2876, false,
    '{"sensor":"8000 DPI Optical","weight":"71g (honeycomb)","buttons":"8 programmable","connection":"Wired USB 2.4GHz","rgb":"Per-button RGB"}'
  )
) AS p(name, slug, description, price, image_url, stock, rating, review_count, is_featured, specs)
JOIN categories c ON c.slug = 'gaming'
ON CONFLICT (slug) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- Products — Accessories (3 products)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO products (name, slug, description, price, image_url, category_id, stock, rating, review_count, is_featured, specs)
SELECT
  p.name, p.slug, p.description, p.price, p.image_url, c.id, p.stock, p.rating, p.review_count, p.is_featured, p.specs::jsonb
FROM (VALUES
  (
    'HyperDesk 200W Charging Hub',
    'hyperdesk-200w-hub',
    'One hub to rule them all. 12-in-1 USB-C docking station with 200W pass-through charging, dual 4K HDMI, 10Gbps USB-A, SD card reader, and Gigabit Ethernet.',
    149.99,
    '/images/products/accessory-hyperdesk-hub.webp',
    190, 4.6, 543, false,
    '{"ports":"12-in-1 (2x HDMI 4K, 4x USB-A 10Gbps, 2x USB-C, SD/microSD, GbE)","power_delivery":"200W pass-through","connection":"USB-C Thunderbolt 4"}'
  ),
  (
    'MagCharge Pro Pad',
    'magcharge-pro-pad',
    'Ultra-fast magnetic wireless charging pad supporting 15W Qi2 charging for phones, 5W for earbuds, and a dedicated slot for smartwatch charging. Charges up to 3 devices simultaneously.',
    59.99,
    '/images/products/accessory-magcharge-pad.webp',
    310, 4.4, 821, false,
    '{"standard":"Qi2 (15W)","devices":"3 simultaneous (phone + earbuds + watch)","input":"USB-C 30W","material":"Nano-suction MagSafe-compatible"}'
  ),
  (
    'ArmorCase Ultra-Slim',
    'armorcase-ultra-slim',
    'Military-grade drop protection (MIL-STD-810H) in a case that adds only 1.2mm to your phone width. The patented corner cushion system absorbs impacts from up to 3m.',
    39.99,
    '/images/products/accessory-armorcase.webp',
    650, 4.5, 1987, false,
    '{"protection":"MIL-STD-810H (3m drop)","thickness":"+1.2mm","material":"Polycarbonate + TPU","compatibility":"NovaPro X15, S12, MiniPhone Pro"}'
  )
) AS p(name, slug, description, price, image_url, stock, rating, review_count, is_featured, specs)
JOIN categories c ON c.slug = 'accessories'
ON CONFLICT (slug) DO NOTHING;
