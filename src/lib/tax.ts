export const TAX_DISCLAIMER =
  "This is a plain-language briefing for Second Table, not tax, legal, or accounting advice. Sales tax is set by your state and city. If you sell food, check your department of revenue or a tax professional before you post a priced plate.";

export const TAX_SECTIONS = [
  {
    heading: "Who collects sales tax",
    paragraphs: [
      "If a sale is taxable, the buyer pays the tax and the seller is usually the one who must collect it and send it to the state. The tax is not a tip, and it is not Second Table’s 20%.",
      "Second Table charges priced plates with PayPal when they are claimed. In most U.S. states a “marketplace facilitator” collects tax when it both lists goods and takes payment. If your state treats this checkout that way, we still do not compute or remit sales tax on leftover homemade food — the listed price is pre-tax, and any tax due remains the cook’s responsibility to handle with their state.",
    ],
  },
  {
    heading: "What leftover food often is, for tax",
    paragraphs: [
      "Many states exempt grocery staples but tax prepared food and meals — including food sold hot, sold ready to eat, or sold as a leftover plate. A pan of lasagna sold to a neighbor is more like a meal than a bag of dry pasta. Whether your plate is taxable depends on your state, how it is sold, and whether you are in the business of selling food.",
      "Some states excuse isolated or occasional sales by people who are not really in business. Posting leftovers once is different from regularly selling plates. Cottage-food or home-kitchen rules (health permits) are separate from tax. A permit does not decide whether you charge tax, and skipping a permit does not erase tax if a sale is due.",
    ],
  },
  {
    heading: "Gifts, trades, and the 20% take",
    paragraphs: [
      "Gifts (donate) have no sales price on this table, so there is nothing here to take 20% of, and typically no sales tax on a true gift. A trade can still be treated as a sale or barter in some places. If you are unsure, do not assume a swap is invisible to tax.",
      "The table take is 20% of the listed pre-tax price, charged when the buyer pays with PayPal. It is a commission, not a tax. Example: listed price $10. Buyer is charged $10. Table take $2 stays in Second Table’s PayPal. Cook is paid $8 to their PayPal after pickup.",
    ],
  },
  {
    heading: "What you must do",
    paragraphs: [
      "If you offer a sale, you are responsible for knowing whether you must register for a seller’s permit, charge tax, and file. List a pre-tax price. The app charges that listed price at claim time. If you must collect tax, do not bury it in the listing so the 20% is calculated on tax — handle tax with your state separately.",
      "If you cannot follow the tax rules that apply to you, do not post a sale. Donate or trade instead — those stay free of table take.",
    ],
  },
] as const;
