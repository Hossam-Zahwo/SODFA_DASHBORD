-- SODFA — Smart Product Categories
-- Run this entire script in Supabase SQL Editor.
-- It is safe to run on an existing project that already has product_categories.

begin;

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_categories
  add column if not exists slug text,
  add column if not exists keywords text[] not null default '{}';

-- Keep category names unique regardless of letter case.
create unique index if not exists product_categories_name_ci_unique
  on public.product_categories (lower(btrim(name)));

create unique index if not exists product_categories_slug_unique
  on public.product_categories (slug)
  where slug is not null;

create or replace function public.set_product_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_product_categories_updated_at on public.product_categories;
create trigger trg_product_categories_updated_at
before update on public.product_categories
for each row execute function public.set_product_categories_updated_at();

-- Default SODFA categories. Arabic + English aliases are stored in keywords.
with seed(name, slug, keywords) as (
  values
  ('أدوات التقديم والضيافة', 'serving-hospitality', array['ضيافة','تقديم','صينية تقديم','tray','serving tray','طبق تقديم','طبق تسالي','snack plate','زيارة','visitors','serving']),
  ('أطباق وأوعية', 'plates-bowls', array['طبق','أطباق','وعاء','سلطانية','bowl','plate','dish','صحن','صحون']),
  ('أطباق تسالي ومكسرات', 'snack-nut-bowls', array['تسالي','مكسرات','طبق تسالي','snack','nuts','candy bowl','طبق مكسرات']),
  ('كوسترات وحوامل أكواب', 'coasters-cup-holders', array['كوستر','كوسترات','coaster','coasters','حامل كوب','cup holder','مفرش كوب']),
  ('أكواب ومجات', 'cups-mugs', array['كوب','أكواب','مج','mug','cup','cups','coffee mug','tea cup']),
  ('القهوة والشاي', 'coffee-tea', array['قهوة','coffee','espresso','شاي','tea','ركوة','cezve','coffee accessories','tea accessories']),
  ('إكسسوارات القهوة', 'coffee-accessories', array['ملحقات قهوة','coffee accessories','tamper','dripper','filter','فلاتر','مصفاة قهوة','حامل كبسولات']),
  ('تنظيم المطبخ', 'kitchen-organization', array['تنظيم مطبخ','kitchen organizer','منظم مطبخ','spice organizer','منظم توابل','حامل أدوات']),
  ('أدوات المطبخ', 'kitchen-tools', array['مطبخ','kitchen','أداة مطبخ','kitchen tool','ملعقة','مغرفة','spatula','whisk','تقشير','peeler']),
  ('تخزين الطعام', 'food-storage', array['حفظ طعام','food storage','علبة حفظ','container','storage box','لانش بوكس','lunch box','حافظة طعام']),
  ('توابل وبهارات', 'spices-seasonings', array['توابل','بهارات','spice','spices','seasoning','برطمان توابل','spice jar']),
  ('أدوات الخَبز والحلويات', 'baking-pastry', array['خبز','baking','cake','كيك','pastry','حلويات','mold','قالب','فرن','oven']),
  ('منظمات الأدراج والخزائن', 'drawer-cabinet-organizers', array['منظم درج','drawer organizer','منظم خزانة','cabinet organizer','organizer','تقسيم درج']),
  ('تنظيم الإكسسوارات', 'accessory-organization', array['منظم اكسسوارات','منظم إكسسوارات','accessory organizer','jewelry organizer','حامل اكسسوارات']),
  ('منظمات الساعات', 'watch-organizers', array['منظم ساعات','صندوق ساعات','watch organizer','watch box','watch case','ساعة']),
  ('منظمات النظارات', 'eyewear-organizers', array['منظم نظارات','صندوق نظارات','eyewear organizer','glasses organizer','sunglasses organizer']),
  ('منظمات المجوهرات', 'jewelry-organizers', array['منظم مجوهرات','jewelry organizer','حامل خواتم','ring organizer','necklace organizer','إكسسوارات']),
  ('منظمات الحقائب والبكليات', 'bags-buckles-organizers', array['منظم شنط','منظم حقائب','bag organizer','منظم بكليات','belt organizer','buckle organizer']),
  ('أدوات الحمام', 'bathroom-accessories', array['حمام','bathroom','bath accessories','صابون','soap','حامل صابون','soap holder','فرشاة حمام']),
  ('تنظيم الحمام', 'bathroom-organization', array['منظم حمام','bathroom organizer','رف حمام','bathroom shelf','toiletry organizer']),
  ('ديكور المنزل', 'home-decor', array['ديكور','decor','home decor','زينة منزل','ديكور منزل','تحفة']),
  ('شموع ومعطرات', 'candles-fragrance', array['شمعة','شموع','candle','candles','معطر','fragrance','diffuser','مبخرة']),
  ('إضاءة وديكور LED', 'led-lighting-decor', array['led','إضاءة','lighting','lamp','مصباح','night light','لمبة']),
  ('منسوجات ومفروشات منزلية', 'home-textiles', array['مفرش','مفروشات','textile','table cloth','placemat','وسادة','cushion']),
  ('تنظيم المنزل', 'home-organization', array['منظم','organizer','organization','storage','تخزين','منظم منزل']),
  ('تنظيف المنزل', 'home-cleaning', array['تنظيف','cleaning','فرشاة تنظيف','cleaning brush','ممسحة','منظف']),
  ('أدوات الغسيل', 'laundry-accessories', array['غسيل','laundry','سلة غسيل','laundry basket','مشابك','hanger']),
  ('إكسسوارات السفر', 'travel-accessories', array['سفر','travel','travel organizer','منظم سفر','حقيبة سفر','passport holder']),
  ('زجاجات وحافظات مشروبات', 'bottles-drinkware', array['زجاجة','bottle','water bottle','thermos','ترمس','حافظة مشروب']),
  ('إكسسوارات المكتب', 'office-accessories', array['مكتب','office','office organizer','منظم مكتب','desk organizer','حامل قلم']),
  ('ألعاب وهدايا', 'toys-gifts', array['هدية','gift','gifts','لعبة','toy','هدايا']),
  ('إكسسوارات الموبايل', 'mobile-accessories', array['موبايل','mobile','phone','هاتف','إكسسوارات موبايل','mobile accessories']),
  ('كفرات الموبايل', 'phone-cases', array['كفر','كفرات','جراب','case','phone case','mobile case','cover','iphone case','samsung case']),
  ('واقيات الشاشة', 'screen-protectors', array['اسكرينة','واقي شاشة','screen protector','tempered glass','privacy glass','زجاج حماية']),
  ('كابلات وشحن', 'cables-charging', array['كابل','cable','usb','type c','lightning','charging cable','سلك شحن']),
  ('شواحن ومحولات', 'chargers-adapters', array['شاحن','charger','adapter','محول','charging adapter','power adapter','fast charger']),
  ('أغطية الشواحن والكابلات', 'charger-cable-covers', array['غطاء شاحن','cover charger','charger cover','غطاء كابل','cable cover','حماية كابل']),
  ('باور بانك', 'power-banks', array['باور بانك','power bank','portable charger','بطارية متنقلة']),
  ('حوامل الموبايل', 'phone-holders', array['حامل موبايل','phone holder','mobile holder','stand','حامل هاتف','car mount']),
  ('سماعات وصوتيات', 'headphones-audio', array['سماعة','سماعات','headphones','earbuds','bluetooth headset','speaker','بلوتوث']),
  ('إكسسوارات الكمبيوتر والإلكترونيات', 'computer-electronics-accessories', array['كمبيوتر','computer','laptop','keyboard','mouse','usb hub','electronics','إلكترونيات']),
  ('نظارات شمسية', 'sunglasses', array['نظارة شمس','نظارات شمسية','sunglasses','sun glasses','uv']),
  ('نظارات قراءة', 'reading-glasses', array['نظارة قراءة','reading glasses','reading glass','prescription style']),
  ('إكسسوارات النظارات', 'eyewear-accessories', array['جراب نظارة','glasses case','eyeglass case','مناديل نظارات','lens cloth','eyewear accessory'])
)
insert into public.product_categories (name, slug, keywords)
select s.name, s.slug, s.keywords
from seed s
where not exists (
  select 1 from public.product_categories c
  where lower(btrim(c.name)) = lower(btrim(s.name))
);

-- Smart bilingual category suggestion based on title text and saved category aliases.
create or replace function public.suggest_product_categories(
  p_query text,
  p_limit integer default 5
)
returns table (
  id text,
  name text,
  score integer
)
language sql
stable
as $$
  with q as (
    select lower(btrim(coalesce(p_query, ''))) as query
  ), scored as (
    select
      c.id::text as id,
      c.name,
      (
        case when q.query <> '' and position(lower(c.name) in q.query) > 0 then 8 else 0 end
        + coalesce((
          select sum(
            case
              when length(btrim(k)) >= 2 and position(lower(btrim(k)) in q.query) > 0 then
                case when length(btrim(k)) >= 6 then 4 else 2 end
              else 0
            end
          )
          from unnest(coalesce(c.keywords, '{}')) as k
        ), 0)
      )::integer as score
    from public.product_categories c
    cross join q
  )
  select id, name, score
  from scored
  where score > 0
  order by score desc, name asc
  limit greatest(1, least(coalesce(p_limit, 5), 10));
$$;

revoke all on function public.suggest_product_categories(text, integer) from public;
grant execute on function public.suggest_product_categories(text, integer) to anon, authenticated;

commit;
