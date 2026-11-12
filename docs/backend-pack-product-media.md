# Required API and database changes

This repository is the React storefront/admin client only. Apply the following
changes in the Symfony/API Platform service that owns `/api/packs`,
`/api/products`, and `/api/product_images` before deploying this client.

## Backward-compatible migration

Use the actual Doctrine table names in the generated migration. For a MySQL
schema using `packs`, `products`, `product_images`, and `flavors`, the SQL is:

```sql
-- The current API already names this pack field `sexe`. Keep that API name
-- (or map a new `gender` field to it in the serializer) rather than creating
-- two unrelated columns.
ALTER TABLE packs
  ADD sexe VARCHAR(10) NOT NULL DEFAULT 'unisex';
UPDATE packs SET sexe = 'unisex' WHERE sexe IS NULL OR sexe = '';

ALTER TABLE products
  ADD has_flavors TINYINT(1) NOT NULL DEFAULT 0;
UPDATE products SET has_flavors = 1 WHERE EXISTS (
  SELECT 1 FROM product_flavor pf WHERE pf.product_id = products.id
);

ALTER TABLE product_images
  ADD flavor_id INT DEFAULT NULL,
  ADD CONSTRAINT FK_product_images_flavor
    FOREIGN KEY (flavor_id) REFERENCES flavors (id) ON DELETE SET NULL,
  ADD INDEX IDX_product_images_flavor (flavor_id);
```

Keep the defaults for at least one release: they make existing packs unisex,
existing products non-flavored unless their join-table relation says otherwise,
and let existing product images remain product-level (`flavor_id = NULL`).

## API validation and serialization

- The deployed API currently exposes the pack gender field as `Pack.sexe`.
  It must be required and limited to `homme`, `femme`, or `unisex`. Set
  `unisex` in the entity constructor/property default and expose `sexe` in
  pack list/detail, create, and update serialization groups. Add an exact API
  Platform filter for `sexe`. The client also reads `gender` to remain
  compatible with a future English API alias.
- `Product.hasFlavors` must be a required boolean, exposed as both
  `hasFlavors` (write/read) and, if the API convention needs it, the
  `has_flavors` read alias.
- Add nullable `ProductImage.flavor` (many-to-one to `Flavor`). Validate that
  it belongs to the same product when it is supplied. The multipart
  `POST /api/product_images` DTO must accept `flavorId` and/or `flavor` in
  addition to its current `productId`, `position`, `isPrimary`, and
  `imageFile` fields. Reject an image linked to a flavor when
  `hasFlavors=false`; reject product-level images when `hasFlavors=true`.
- Ensure an image upload is JPEG, PNG, or WebP and at most 5 MB server-side as
  well as in the client. Return a useful 4xx validation response on failure.
- For a pack collection, eager-load the primary image and return
  `thumbnailUrl` (a resized asset) plus `imageUrl` (the original). The client
  renders the thumbnail in list views and the original in detail views.
- Add `id[]` filtering for `/api/products` and `product.id[]` filtering for
  `/api/product_images`. The pack detail view uses these to fetch all products
  and their images in two batched requests instead of one request per item.

## Production media delivery

- Serve `/uploads/**` through the configured HTTPS media origin/CDN. Set
  `Cache-Control: public, max-age=31536000, immutable` for fingerprinted image
  files and purge the CDN path after replacing a non-fingerprinted file.
- Allow public `GET`/`HEAD` on pack and product media. If the API and media are
  cross-origin, configure CORS for the storefront origin (including `GET`,
  `HEAD`, and `Content-Type`); upload endpoints still require authenticated
  admin origins and credentials as appropriate.
- Set `VITE_API_BASE_URL` and `VITE_MEDIA_BASE_URL` to HTTPS production URLs
  at build time. The latter must be the host that actually serves `/uploads`.
