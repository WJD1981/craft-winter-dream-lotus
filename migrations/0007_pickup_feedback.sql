-- Pickup outcomes, required feedback, real photos, categories, home-cook rule.

alter table listings drop constraint if exists listings_status_check;
alter table listings
  add constraint listings_status_check
  check (status in ('open', 'claimed', 'gone', 'picked_up', 'cancelled_pickup'));

alter table claims drop constraint if exists claims_status_check;
alter table claims
  add constraint claims_status_check
  check (status in ('pending', 'accepted', 'declined', 'picked_up', 'cancelled_pickup'));

alter table listings add column if not exists category text not null default 'meal';
alter table listings add column if not exists photo_url text not null default '';
alter table listings add column if not exists home_cook_ack boolean not null default true;

alter table claims add column if not exists cancel_reason text;
alter table claims add column if not exists picked_up_at timestamptz;

create table if not exists feedback (
  id serial primary key,
  listing_id integer not null references listings(id) on delete cascade,
  claim_id integer not null references claims(id) on delete cascade,
  author_user_id text not null,
  role text not null check (role in ('buyer', 'cook')),
  quality integer not null check (quality between 1 and 5),
  taste integer not null check (taste between 1 and 5),
  freshness integer not null check (freshness between 1 and 5),
  price integer not null check (price between 1 and 5),
  packaging integer not null check (packaging between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (claim_id, author_user_id)
);

create index if not exists feedback_listing_idx on feedback (listing_id);
create index if not exists feedback_author_idx on feedback (author_user_id);

update listings set category = 'dessert' where dish_key in ('banana-bread', 'baklava');
update listings set photo_url = '/dishes/' || dish_key || '.jpg' where photo_url = '';

insert into listings (
  user_id, poster_name, title, description, offer_type, price_cents, trade_want,
  servings, allergens, ingredients, made_at, pickup_window, neighborhood,
  pickup_notes, dish_key, status, gloves_used, hairnet_used, thermometer_used,
  for_need, category, photo_url, home_cook_ack
) values
(
  'community', 'Noor S.', 'Chocolate chip cookies, this morning',
  'A dozen cookies from a home oven. Packed in parchment. Not a bakery.',
  'donate', null, null, 6,
  'Wheat, eggs, milk, soy (shared kitchen)',
  'All-purpose flour, butter, brown sugar, white sugar, eggs, vanilla, baking soda, salt, chocolate chips',
  'This morning', 'Tonight 5–7pm', 'West End',
  'Porch tin. Bring the tin back if you can.',
  'cookies', 'open', true, true, true, true, 'dessert', '/dishes/cookies.jpg', true
),
(
  'community', 'Eli R.', 'Salted pretzels from last night',
  'Soft pretzels, cooled and bagged. Warm 5 minutes if you want them soft again.',
  'sale', 600, null, 4,
  'Wheat (shared kitchen)',
  'Bread flour, water, yeast, brown sugar, salt, baking soda bath, coarse salt, butter',
  'Last night', 'Today 4–6pm', 'Midtown',
  'Paid in the app. Inspect before you walk away.',
  'pretzels', 'open', true, true, true, false, 'snack', '/dishes/pretzels.jpg', true
),
(
  'community', 'Asha T.', 'Granola clusters',
  'Oven granola with oats and nuts. Snack jars, not a store mix.',
  'trade', null, 'Fruit or yogurt', 4,
  'Tree nuts, gluten (oats processed near wheat), sesame possible',
  'Rolled oats, maple syrup, olive oil, almonds, pumpkin seeds, cinnamon, salt, vanilla',
  'Yesterday', 'Tomorrow morning', 'North Hill',
  'Swap for fruit. Home kitchen only.',
  'granola', 'open', true, true, true, false, 'snack', '/dishes/granola.jpg', true
),
(
  'community', 'Cam V.', 'Pitcher of lemonade',
  'Fresh lemon, sugar, water. Non-alcoholic. Keep cold. Shake before pouring.',
  'donate', null, null, 6,
  'None declared — citrus; shared kitchen',
  'Lemons, sugar, cold water, ice, a pinch of salt',
  'This afternoon', 'Tonight 6–8pm', 'Riverside',
  'Bring a bottle. No alcohol on this table.',
  'lemonade', 'open', true, true, true, true, 'drink', '/dishes/lemonade.jpg', true
),
(
  'community', 'Jules D.', 'Berry crumble squares',
  'Pan of oat crumble with frozen berries. Dessert from a home oven.',
  'sale', 700, null, 4,
  'Wheat, milk (butter), may contain tree nuts (shared kitchen)',
  'Mixed berries, sugar, lemon, butter, rolled oats, flour, brown sugar, cinnamon, salt',
  'This morning', 'Tonight 5–7pm', 'The Flats',
  'Pay in the app. Look at it before you take it.',
  'crumble', 'open', true, true, true, false, 'dessert', '/dishes/crumble.jpg', true
),
(
  'community', 'Priya N.', 'Mint iced tea',
  'Black tea, mint, lemon. Unsweetened. Non-alcoholic only.',
  'donate', null, null, 4,
  'None declared — tea and mint; shared kitchen',
  'Black tea, fresh mint, lemon, cold water, ice',
  'This morning', 'This afternoon', 'Downtown',
  'Home kitchen. No restaurants. Inspect the jar.',
  'iced-tea', 'open', true, true, true, true, 'drink', '/dishes/iced-tea.jpg', true
);
