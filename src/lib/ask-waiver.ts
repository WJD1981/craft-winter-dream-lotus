export const ASK_WAIVER_VERSION = "1.9";

export const ASK_WAIVER_TITLE = "Askfare release";

export const ASK_WAIVER_INTRO =
  "Read this before you post a run or take one. Independents do this work. Askfare does not employ them. You name a price. They accept it or counter. Jobs include retail pickups, local businesses sending their own items, and private residence to private residence. Tobacco, alcoholic beverages, and controlled substances are banned. Runners must carry courier insurance that covers the declared value of the items. Local messenger or courier business licenses, if required, are the runner’s to obtain. Everyone must verify identity with a government ID and a selfie.";

export const ASK_WAIVER_SECTIONS = [
  {
    heading: "Who does the work",
    body: "Askfare is a board. People and businesses post a pickup or a send — an online order, will-call, takeout, a bakery box, a florist order, a parcel from one home to another — and name what they will pay. Independent people accept that number or send a counter. They are not Askfare employees. We are not the store, the shop, or a moving company.",
  },
  {
    heading: "Name a price. They can counter.",
    body: "You set the offer. A runner may take it as-is or counter with a different number. The job locks only when both sides agree. The runner is always paid 80% of that locked fare. Askfare’s take is a separate fee: 20% standard, or 5% if you have Askfare Plus ($9.99 a month). Plus saves the poster 15 percentage points; it does not raise the runner’s pay. PayPal charges the poster when the job locks.",
  },
  {
    heading: "Banned cargo",
    body: "Runners may not pick up or deliver tobacco products, alcoholic beverages, or controlled substances — cigarettes, cigars, vapes, beer, wine, liquor, cannabis, or scheduled drugs. Ordinary pharmacy pickups that are not controlled substances are allowed. If a store hands you a banned item, cancel the run as prohibited and do not take it. Askfare will refund a paid fare when a run is cancelled for this reason.",
  },
  {
    heading: "Courier insurance",
    body: "You may not accept or counter a run until you have active courier / cargo insurance (goods in transit) plus auto liability for the vehicle you use. The cargo limit on that policy must be at least the declared value of the items on that run. Goods damaged or missing in transit are a claim on that policy — not a payout from Askfare.",
  },
  {
    heading: "Local licenses",
    body: "Some cities still want a messenger or courier business license. If your city requires you to have a business license to carry other people’s goods, it is your responsibility to obtain one before you accept or counter a run. Askfare does not issue, check, or pay for local licenses. Operating without a required license is on you, not on Askfare.",
  },
  {
    heading: "Identity",
    body: "Every user must verify identity before posting or taking a run: a government-issued photo ID (driver’s license, state ID, or passport) and a live selfie, shoulders up, no hat or sunglasses. Askfare stores the ID image, last four of the document, and date of birth — not the full ID number. A verified badge is public. ID photos are not.",
  },
  {
    heading: "Data we keep",
    body: "Askfare keeps profile, identity, run, and payment records only as long as the Data Retention Policy allows. Identity photos are private and are deleted 12 months after you leave. Payment and waiver records are kept up to 7 years for tax and contract reasons. We do not sell your data. The full policy is on the Data Retention page and is part of this release.",
  },
  {
    heading: "Inspect, then dispute if you must",
    body: "Confirm the order at pickup and at the door. Runners photograph the items when they pick up. If the bags are damaged, missing, wrong, or someone no-shows, open a dispute on the run before you confirm delivery. Confirming delivery pays the runner and ends the fare dispute. The other party answers with their side. Askfare then decides: refund the poster, pay the runner, split (Askfare waives the take), or dismiss. Runner payout is held while a dispute is open.",
  },
  {
    heading: "Cancel",
    body: "Pull a run before anyone is locked and, if it was paid, PayPal refunds you. After a runner is locked, cancel if the order or parcel is not there, is unsafe to carry, or is a banned item (tobacco, alcohol, controlled substances). Do not post anything illegal, hazardous, or that a store or household will not release to a third party.",
  },
] as const;

export const ASK_WAIVER_ACKS = [
  "I understand runners are independents, not Askfare employees.",
  "I understand I name a price and they may accept or counter.",
  "I will not post or carry tobacco products, alcoholic beverages, or controlled substances.",
  "I understand runners must carry courier insurance that covers at least the declared value of the items.",
  "If my city requires a messenger or courier business license, it is my responsibility to obtain one.",
  "I will verify my identity with a government ID and a selfie before I post or take a run.",
  "I have read the Data Retention Policy and agree Askfare may keep identity, payment, and run records for the periods stated there.",
  "I will inspect at pickup and drop-off, and I will open a dispute before confirming delivery if something is wrong.",
  "I release claims against Askfare for damage, loss, delay, cooling, scuffs, and ordinary negligence as described above.",
] as const;
