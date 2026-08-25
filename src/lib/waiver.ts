export const WAIVER_VERSION = "2026-08-22-v3";

export const WAIVER_TITLE = "Waiver and Release of Liability — Homemade Food";

export const WAIVER_NOTICE =
  "This is a legally binding agreement. If you sign it, you give up the right to sue Second Table and other users if leftover homemade food makes you sick, causes an allergic reaction, injures you, or causes death — including claims that someone was careless or negligent. If you cannot accept that, do not use Second Table.";

export type WaiverSection = {
  heading: string;
  paragraphs: string[];
  conspicuous?: boolean;
};

export const WAIVER_SECTIONS: WaiverSection[] = [
  {
    heading: "1. Who this Agreement is with, and what you get",
    paragraphs: [
      "This Waiver and Release of Liability (the “Agreement”) is between you and the people who operate the Second Table website and related services (“Second Table”).",
      "You sign this Agreement in exchange for permission to use Second Table. That permission includes creating an account, posting leftover food, browsing listings, requesting food, and arranging pickup.",
      "You may refuse to sign. If you refuse, you may not use Second Table. Signing is voluntary.",
    ],
  },
  {
    heading: "2. What Second Table is — and is not",
    paragraphs: [
      "Second Table is a neighborhood notice board. Private people may offer leftover homemade food for sale, trade, or donation.",
      "Second Table is not a restaurant, grocery, caterer, food truck, cottage-food business, or other food establishment. It does not prepare, store, transport, or serve food.",
      "Second Table does not inspect kitchens. It does not test food. It does not verify recipes, temperatures, ingredients, or allergen lists. It does not refrigerate, reheat, or hold food. It does not promise that any listing is lawful where you live.",
      "Every plate is homemade by a private person. Commercial food-safety rules, health-department inspections, and restaurant standards do not apply. You are responsible for following the food and sales laws that apply to you.",
    ],
  },
  {
    heading: "3. Words used in this Agreement",
    paragraphs: [
      "“Food” means any food, drink, leftover, ingredient, or container obtained, offered, described, or picked up through Second Table.",
      "“Users” means people who post, claim, transport, store, or host pickup of Food, and anyone acting with them.",
      "“Released Parties” means Second Table; its operators, owners, helpers, and contractors; every User; and each of their heirs, successors, and assigns.",
    ],
  },
  {
    heading: "4. The risks — read this even if you have no allergy",
    paragraphs: [
      "Homemade leftover Food is dangerous in ways that packaged grocery food is not. You understand and accept the following risks, which cannot be fully removed.",
      "Allergy and cross-contact. Home kitchens share pans, boards, oils, fryers, toasters, sponges, and storage. Food can contain undeclared allergens. Allergen notes on listings are written by Users. They may be wrong, incomplete, or out of date. Food labeled “none,” “safe,” or “may contain” can still cause a reaction. Allergic reactions can include hives, breathing trouble, anaphylaxis, permanent injury, and death.",
      "Foodborne illness. Leftover Food may have been undercooked, cooled too slowly, stored too long, left out, reheated poorly, or contaminated with bacteria, viruses, parasites, or toxins — including salmonella, E. coli, listeria, norovirus, campylobacter, and botulism. It may contain bones, pits, shell, glass, or other physical hazards. Illness can mean vomiting, hospitalization, long-term harm, and death.",
      "Photographs and descriptions may not match the Food you receive. Pickup is in person. Second Table does not deliver. You must inspect Food yourself before you eat it or serve it.",
      "If you have a food allergy, intolerance, celiac disease, a weakened immune system, or if you are pregnant, the only reliable way to avoid these risks may be to not take Food from Second Table.",
    ],
  },
  {
    heading: "5. You assume those risks",
    paragraphs: [
      "You have read the risks in section 4. You understand them. You assume all of them, known and unknown, for yourself.",
      "You assume the risk of allergic reaction, including from Food that a listing said contained no allergens. You assume the risk of foodborne illness and physical injury from Food. You assume the risk that Users will make mistakes, forget ingredients, or handle Food carelessly.",
      "You choose to use Second Table with full knowledge of these risks. Assumption of risk is independent of the release in section 7. If a court will not enforce the release, this assumption of risk still applies.",
    ],
  },
  {
    heading: "6. No warranty",
    paragraphs: [
      "Food is offered “as is” and “as available.”",
      "The Released Parties make no warranty of any kind, express or implied. That includes warranties of merchantability, fitness for a particular purpose, safety, freshness, lawful production, or accuracy of any listing — including price, pickup details, ingredients, and allergen statements.",
      "No one promises that Food is edible, that it is legal to sell or give away where you live, or that it is suitable for children, pregnancy, or a medical diet.",
    ],
  },
  {
    heading: "7. Release and promise not to sue",
    conspicuous: true,
    paragraphs: [
      "TO THE FULLEST EXTENT ALLOWED BY LAW, YOU RELEASE, WAIVE, AND FOREVER DISCHARGE THE RELEASED PARTIES FROM ANY AND ALL CLAIMS, DEMANDS, AND CAUSES OF ACTION ARISING OUT OF OR RELATED TO FOOD OR YOUR USE OF SECOND TABLE.",
      "THIS RELEASE INCLUDES CLAIMS FOR ALLERGIC REACTION, ANAPHYLAXIS, FOOD POISONING AND OTHER FOODBORNE ILLNESS, CONTAMINATION, MISLABELING, PERSONAL INJURY, WRONGFUL DEATH, AND PROPERTY DAMAGE. THIS RELEASE INCLUDES CLAIMS ARISING FROM THE ORDINARY NEGLIGENCE OR CARELESSNESS OF THE RELEASED PARTIES.",
      "You promise not to sue the Released Parties for any claim this section releases. That promise is a covenant not to sue, in addition to the release.",
      "This section binds you, your heirs, and your estate. It covers claims you know about and claims you do not.",
      "This Agreement does not release liability for gross negligence, recklessness, or intentional harm if a court in the applicable place holds that such a release is not allowed. It does not waive rights that a statute says cannot be waived.",
    ],
  },
  {
    heading: "8. If you offer Food, and if you take Food",
    paragraphs: [
      "House rules for every user. Whenever you prepare, pack, or reheat Food for Second Table, you must wear clean disposable gloves and a hair net (or a cap that fully contains your hair), and you must use a working food thermometer. You represent that you own that thermometer. You will confirm leftovers reach 165°F before they are eaten hot, and that cold Food is held at 40°F or below. If you do not have gloves, a hair net, and a thermometer, you may not handle Food for this service.",
      "Second Table does not inspect kitchens or watch you work. Attesting to these rules on a listing is not a warranty that you followed them. Breaking them does not revive any claim this Agreement releases. It is grounds for losing permission to use the service.",
      "If you post Food, you also agree to describe known allergens in good faith, to be honest about when the Food was made, and not to offer Food you know is spoiled or unsafe. Those are promises of effort. They are not a warranty.",
      "If you request or pick up Food, you agree to inspect it, ask questions, keep it at a safe temperature, wear gloves and a hair net if you handle or re-prepare it, and reheat it to 165°F measured with a thermometer if it is meant to be eaten hot. You agree not to serve Food to another adult unless that person has also accepted this Agreement. You agree not to serve Food to a child unless you are that child’s parent or legal guardian and you accept these same risks on the child’s behalf.",
      "If you are a parent or legal guardian and you serve Food to your minor child, then to the fullest extent the law allows you also release the Released Parties from claims brought by or for that child, and you assume the risks in section 4 on the child’s behalf.",
    ],
  },
  {
    heading: "9. Indemnity for people you share Food with",
    paragraphs: [
      "If you share Food with someone who has not signed this Agreement, or if someone makes a claim against a Released Party because you gave them Food, you will defend, indemnify, and hold the Released Parties harmless from that claim — including reasonable attorneys’ fees — to the fullest extent the law allows.",
      "This indemnity covers claims by your guests, family, and anyone else you feed, except where a court holds that indemnity for that kind of claim is not allowed.",
    ],
  },
  {
    heading: "10. Electronic signature, capacity, and records",
    paragraphs: [
      "You represent that you are at least 18 years old and have legal capacity to make this Agreement. You are not signing for another adult.",
      "By checking the boxes below, typing your legal name, and clicking the sign button, you intend to sign this Agreement electronically. You agree that this electronic signature and this electronic record are as valid as a wet-ink signature on paper, including under the U.S. Electronic Signatures in Global and National Commerce Act and any applicable Uniform Electronic Transactions Act.",
      "Second Table may keep a record of your name, account, the version you signed, and the time you signed. You agree that this record is evidence that you signed.",
    ],
  },
  {
    heading: "11. Other terms",
    paragraphs: [
      "This Agreement is the entire agreement about liability for Food and for use of Second Table. It replaces any prior understanding on that subject.",
      "If a court finds any part unenforceable, the rest remains in force. If a court will not enforce a release of ordinary negligence, your assumption of risk in section 5 still applies, and the rest of the release still applies to the extent it can.",
      "This Agreement is governed by the laws of the state where you live when you sign, without regard to conflict-of-law rules. You and Second Table agree that the courts of that state, in the county where you live or where the Food was picked up, are the proper place for any dispute that a court may hear.",
      "Using Second Table after you sign is a reaffirmation of this Agreement. If Second Table publishes a new version, you must sign the new version before you continue.",
      "Headings are for reading convenience only. They do not change the meaning of any section.",
    ],
  },
];

export const WAIVER_ACKNOWLEDGMENTS = [
  {
    key: "allergyAck" as const,
    label:
      "I have read section 4. I understand homemade Food may contain undeclared allergens and may cause a severe allergic reaction, including anaphylaxis and death. I assume that risk.",
  },
  {
    key: "poisoningAck" as const,
    label:
      "I understand leftover Food may be unsafe and may cause foodborne illness, hospitalization, or death. I assume that risk.",
  },
  {
    key: "homemadeAck" as const,
    label:
      "I understand Second Table does not inspect kitchens or Food, and that posters are private people, not licensed food businesses.",
  },
  {
    key: "glovesAck" as const,
    label:
      "I will wear clean disposable gloves whenever I prepare, pack, or handle Food for Second Table.",
  },
  {
    key: "hairnetAck" as const,
    label:
      "I will wear a hair net, or a cap that fully contains my hair, whenever I prepare Food for Second Table.",
  },
  {
    key: "thermometerAck" as const,
    label:
      "I own a working food thermometer and I will use it — cold food at 40°F or below, leftovers reheated to 165°F in the thickest part.",
  },
  {
    key: "sueAck" as const,
    label:
      "I release and promise not to sue the Released Parties — including Second Table and other users — for allergy, illness, injury, or death arising from Food, including claims that they were careless or negligent, to the fullest extent the law allows.",
  },
  {
    key: "ageAck" as const,
    label:
      "I am at least 18, I am signing of my own free will, and typing my name below is my electronic signature on this Agreement.",
  },
];
