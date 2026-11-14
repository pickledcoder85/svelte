-- Barcodes on food bank items (Phase 5.1, 2026-11-14).
-- Stored as a 14-digit GTIN (zero-padded) so UPC-A, EAN-13, and EAN-8 forms of the same code
-- match. One food per barcode: rescanning updates the existing food instead of duplicating it.
ALTER TABLE food_catalog ADD COLUMN barcode TEXT;

CREATE UNIQUE INDEX idx_food_catalog_barcode ON food_catalog (barcode) WHERE barcode IS NOT NULL;
