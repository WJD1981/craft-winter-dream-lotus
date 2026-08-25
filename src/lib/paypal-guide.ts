export const PAYPAL_SDK_TITLE = "PayPal is the till";

export const PAYPAL_SDK_INTRO =
  "Customers pay you with PayPal Checkout. Plus subscriptions and the 20% take land in the same PayPal Business account. After delivery you pay the runner 80% from that balance. Then you transfer what’s left — the take and Plus — to your bank.";

export const PAYPAL_SDK_STEPS = [
  {
    n: "01",
    title: "Open a PayPal Business account",
    body: "This is the account that receives every locked fare and every $9.99 Plus payment. Personal accounts cannot take marketplace checkout or send runner payouts. Use this login for Developer and for withdrawing to your bank.",
    href: "https://www.paypal.com/business",
    hrefLabel: "PayPal Business",
  },
  {
    n: "02",
    title: "Create a REST app in Developer",
    body: "Developer Dashboard → Apps & Credentials. Sandbox to test, Live for real money. Create App, name it Askfare, copy the Client ID and Secret. Paste them in the form below.",
    href: "https://developer.paypal.com/dashboard/applications",
    hrefLabel: "Apps & Credentials",
  },
  {
    n: "03",
    title: "Turn on Checkout and Payouts",
    body: "Checkout is how posters pay you (fare + take, and Plus). Payouts is how you send the runner their 80%. Request Payouts if PayPal asks for a review. The 20% (or 5% with Plus) never leaves your PayPal unless you transfer it.",
    href: "https://www.paypal.com/payoutsweb/landing",
    hrefLabel: "Request Payouts",
  },
  {
    n: "04",
    title: "What the app charges",
    body: "When a run locks, PayPal Checkout charges the poster on the spot: runner share + your take. Askfare Plus is a separate $9.99 PayPal charge for 30 days. Both hit this Business account.",
  },
  {
    n: "05",
    title: "Sandbox first, then Live",
    body: "Test with a sandbox buyer from Developer → Sandbox → Accounts. When a test lock captures and a test payout lands, switch this form to Live and paste Live keys. Mixing Live keys with Sandbox mode will fail.",
  },
  {
    n: "06",
    title: "Collect your money",
    body: "Open PayPal → Wallet. The balance is yours: 20% (or 5%) of each named fare, and Plus. Transfer to bank whenever you want. The runner’s 80% is paid out after delivery and should not be withdrawn as yours.",
    href: "https://www.paypal.com/myaccount/transfer",
    hrefLabel: "Transfer to bank",
  },
] as const;
