-- Apply to the isolated CRM preview database before enabling catalog image previews.
CREATE TABLE IF NOT EXISTS catalog_image_references (
  product_reference_id bigint NOT NULL REFERENCES product_references(id) ON DELETE CASCADE,
  variant_id text NOT NULL DEFAULT '',
  variant_label text,
  image_url text NOT NULL CHECK (image_url LIKE 'https://%'),
  fallback_url text CHECK (fallback_url LIKE 'https://%'),
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_reference_id, variant_id, image_url)
);
GRANT SELECT ON catalog_image_references TO crm_qa_read_20261122, control_center_catalog_ro;
