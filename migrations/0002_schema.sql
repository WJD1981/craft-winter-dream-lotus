-- Second Table marketplace schema

create table if not exists waivers (
  user_id text primary key,
  legal_name text not null,
  version text not null,
  allergy_ack boolean not null,
  poisoning_ack boolean not null,
  homemade_ack boolean not null,
  sue_ack boolean not null,
  age_ack boolean not null,
  accepted_at timestamptz not null default now()
);

create table if not exists listings (
  id serial primary key,
  user_id text not null,
  poster_name text not null,
  title text not null,
  description text not null,
  offer_type text not null check (offer_type in ('sale', 'trade', 'donate')),
  price_cents integer,
  trade_want text,
  servings integer not null default 1,
  allergens text not null default '',
  ingredients text not null default '',
  made_at text not null default '',
  pickup_window text not null default '',
  neighborhood text not null,
  pickup_notes text not null default '',
  dish_key text not null,
  status text not null default 'open' check (status in ('open', 'claimed', 'gone')),
  created_at timestamptz not null default now()
);

create index if not exists listings_status_idx on listings (status, created_at desc);
create index if not exists listings_user_id_idx on listings (user_id);

create table if not exists claims (
  id serial primary key,
  listing_id integer not null references listings(id) on delete cascade,
  user_id text not null,
  claimant_name text not null,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists claims_listing_idx on claims (listing_id);
create index if not exists claims_user_idx on claims (user_id);

-- Seed neighbor listings so the table is not empty on first visit
insert into listings (
  user_id, poster_name, title, description, offer_type, price_cents, trade_want,
  servings, allergens, ingredients, made_at, pickup_window, neighborhood,
  pickup_notes, dish_key, status
) values
(
  'community',
  'Mira K.',
  'Thursday roast chicken',
  'Half a roast chicken from last night, carved, with pan juices and roasted carrots. Reheat at 350 until steaming. Cooked in a kitchen that also uses dairy and wheat, though this plate itself has none added.',
  'sale',
  800,
  null,
  2,
  'May contain dairy, wheat (shared kitchen)',
  'Chicken, olive oil, garlic, thyme, carrots, salt, pepper',
  'Last night',
  'Tonight 6–8pm or tomorrow morning',
  'Eastside',
  'Porch pickup. Leave the Pyrex — I will rinse it.',
  'roast-chicken',
  'open'
),
(
  'community',
  'Jonas P.',
  'Extra lasagna, still in the pan',
  'A family pan of meat lasagna. We ate two squares. The rest is yours if you want it tonight. Contains dairy, wheat, and egg.',
  'trade',
  null,
  'Salad, bread, or a six-pack',
  6,
  'Milk, wheat, egg',
  'Pasta, beef, tomato, ricotta, mozzarella, parmesan, egg, onion, garlic, basil',
  'This afternoon',
  'Tonight before 9pm',
  'Riverside',
  'Text on claim and I will meet you at the lobby.',
  'lasagna',
  'open'
),
(
  'community',
  'Asha R.',
  'Banana bread loaf',
  'One loaf, already sliced. Made with ripe bananas and walnuts. Happy to give it away rather than let it stale.',
  'donate',
  null,
  null,
  8,
  'Wheat, egg, milk, tree nuts (walnuts)',
  'Bananas, flour, butter, sugar, eggs, walnuts, baking soda, vanilla',
  'This morning',
  'Anytime today until 7pm',
  'Midtown',
  'Brown paper bag on the stoop once I accept.',
  'banana-bread',
  'open'
),
(
  'community',
  'Dev S.',
  'Coconut chickpea curry',
  'Pot of leftover coconut curry with chickpeas and spinach. Vegan. Made with a blender that has processed peanuts in the past — treat as may contain peanuts.',
  'sale',
  600,
  null,
  3,
  'May contain peanuts (shared blender), coconut',
  'Chickpeas, coconut milk, onion, garlic, ginger, spinach, tomatoes, spices, rice',
  'Yesterday',
  'Lunchtime today or after 5pm',
  'West End',
  'Bring a container. I will ladle it out.',
  'coconut-curry',
  'open'
),
(
  'community',
  'Elena V.',
  'Garden minestrone',
  'A pot of vegetable minestrone from the weekend. Vegetarian. Parmesan rind was simmered in the broth, so it is not vegan and contains dairy.',
  'donate',
  null,
  null,
  4,
  'Milk (parmesan rind), may contain wheat (shared pot)',
  'Tomato, beans, zucchini, carrot, celery, onion, garlic, parmesan rind, olive oil, herbs',
  'Sunday',
  'This evening 5–7pm',
  'Downtown',
  'Apartment 4B. Buzz Varga.',
  'minestrone',
  'open'
),
(
  'community',
  'Samir T.',
  'Almond baklava — six pieces',
  'Leftover baklava from a family lunch. Phyllo, butter, almonds, pistachios, honey. Tree nuts throughout. Not a joke — do not take this if you have a nut allergy.',
  'sale',
  500,
  null,
  6,
  'Tree nuts (almond, pistachio), wheat, milk',
  'Phyllo, butter, almonds, pistachios, honey, sugar, lemon, cinnamon',
  'Yesterday',
  'After 4pm today',
  'Eastside',
  'I will pack them in wax paper.',
  'baklava',
  'open'
);
