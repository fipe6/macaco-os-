-- Fotos de productos + catálogo público sin costos.
-- NO se borra ni se modifica ningún dato existente: solo se agrega.
-- Vuelta atrás al final del archivo.

-- 1) La foto de cada producto (URL pública del bucket product-images).
alter table public.inventario add column if not exists imagen_url text;

-- 2) Lo que el catálogo web puede leer sin login: SIN precio_costo ni margen.
--    Hoy `inventario` solo se puede leer con login (RLS), así que el catálogo,
--    que entra con la clave pública, no ve nada. Esta vista expone solo lo
--    público. (Vista con permisos del dueño: el anon lee la vista, no la tabla.)
create or replace view public.catalogo_publico
with (security_invoker = false) as
  select id, producto, stock_actual, stock_minimo, precio_venta, imagen_url, activo, updated_at
  from public.inventario
  where activo = true;
grant select on public.catalogo_publico to anon, authenticated;

-- 3) El trigger que reescribe app_data.macaco:productos desde inventario
--    ahora también conserva la foto (si no, la borraría en cada cambio).
create or replace function public.sync_inventario_to_app_data()
returns trigger language plpgsql as $function$
begin
  update app_data
  set valor = (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', replace(lower(i.producto), ' ', '-'),
        'name', i.producto,
        'stock', i.stock_actual,
        'cost', coalesce(i.precio_costo, 0),
        'price', coalesce(i.precio_venta, 0),
        'status', case
          when i.stock_actual <= 0 then 'out'
          when i.stock_minimo is not null and i.stock_actual <= i.stock_minimo then 'low'
          else 'ok'
        end
      ) || case when i.imagen_url is not null then jsonb_build_object('imagen', i.imagen_url) else '{}'::jsonb end
      order by i.producto
    ), '[]'::jsonb)
    from inventario i
    where i.activo = true
  ),
  actualizado_en = now()
  where clave = 'macaco:productos';
  return null;
end;
$function$;

-- 4) Subir, cambiar y borrar fotos: solo con login (la app). Leer: público (ya existe).
create policy product_images_insert_auth on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');
create policy product_images_update_auth on storage.objects
  for update to authenticated using (bucket_id = 'product-images');
create policy product_images_delete_auth on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');

-- ─── VUELTA ATRÁS (si algo sale mal) ────────────────────────────────────────
-- drop policy if exists product_images_insert_auth on storage.objects;
-- drop policy if exists product_images_update_auth on storage.objects;
-- drop policy if exists product_images_delete_auth on storage.objects;
-- drop view if exists public.catalogo_publico;
-- (función del trigger: volver a la versión sin el bloque `|| case ... imagen`)
-- alter table public.inventario drop column if exists imagen_url;   -- borra las URLs de fotos
