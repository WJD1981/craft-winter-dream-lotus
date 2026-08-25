export const COURSE_VERSION = "2026-08-22-v2";
export const COURSE_TITLE = "Kitchen briefing";
export const COURSE_MINUTES = 6;

export type CourseLesson = {
  id: string;
  n: string;
  title: string;
  shortTitle: string;
  kicker: string;
  paragraphs: string[];
  points: string[];
  visual: "danger-zone" | "cool-fast" | "gear" | "reheat" | "allergens" | "toss";
  question: string;
  options: { id: string; label: string }[];
  correctId: string;
  explanation: string;
};

export const COURSE_LESSONS: CourseLesson[] = [
  {
    id: "danger-zone",
    n: "01",
    title: "The danger zone",
    shortTitle: "Danger zone",
    kicker: "Time and temperature",
    paragraphs: [
      "Bacteria that cause food poisoning multiply fastest between 40°F and 140°F (4°C–60°C). That range is the danger zone. Cooked leftovers pass through it every time they cool on the counter.",
      "Perishable food should not sit at room temperature for more than two hours. If the room is hotter than 90°F, the limit is one hour. A pan left out overnight is not a leftover. It is waste.",
    ],
    points: [
      "Keep cold food at 40°F or below. Keep hot food at 140°F or above.",
      "The two-hour rule starts when cooking ends — not when you remember the pan.",
      "If you do not know how long food sat out, do not offer it on Second Table.",
    ],
    visual: "danger-zone",
    question: "Cooked leftovers have been sitting on the counter. When must they go in the fridge?",
    options: [
      { id: "a", label: "Whenever they have cooled enough to taste good cold." },
      { id: "b", label: "Within 2 hours, or within 1 hour if the room is hotter than 90°F." },
      { id: "c", label: "By the next morning, as long as they are covered." },
    ],
    correctId: "b",
    explanation:
      "The USDA two-hour rule is the ceiling, not a target. Get food into the fridge sooner when you can. Overnight on the counter is never safe to share.",
  },
  {
    id: "cool-keep",
    n: "02",
    title: "Cool it fast. Keep it cold.",
    shortTitle: "Cool and keep",
    kicker: "Safe keeping",
    paragraphs: [
      "A deep pot of soup stays in the danger zone for hours as the center cools. Split large leftovers into shallow containers so heat can leave. Then refrigerate.",
      "Your fridge should be at or below 40°F. Eat or freeze leftovers within three to four days. After that, the safe choice is the bin — not a neighbor.",
    ],
    points: [
      "Use shallow containers. Do not park a giant hot pot in the fridge and hope.",
      "Label the date. Three to four days in the fridge is the usual limit.",
      "Freeze extra if you will not eat or share it in time. Frozen food still has to be reheated safely later.",
    ],
    visual: "cool-fast",
    question: "What is the safest way to put a big pot of stew in the fridge?",
    options: [
      { id: "a", label: "Leave the lid on the pot and refrigerate the whole thing once it stops steaming." },
      { id: "b", label: "Split it into shallow containers and refrigerate within two hours of cooking." },
      { id: "c", label: "Cool it on the stove overnight, then fridge it in the morning." },
    ],
    correctId: "b",
    explanation:
      "Shallow containers let heat escape. A lidded stockpot holds heat in the middle, where bacteria can grow while the surface feels cool.",
  },
  {
    id: "gear",
    n: "03",
    title: "Gloves, hair net, thermometer",
    shortTitle: "Kitchen gear",
    kicker: "Required of every user",
    paragraphs: [
      "Second Table is a home kitchen, but the house rules are not optional. Whenever you prepare, pack, or reheat food for this table, you must wear clean disposable gloves and a hair net (or a cap that fully contains your hair), and you must use a food thermometer. If you do not have all three, you may not cook for neighbors here.",
      "Wash your hands, then glove. Change gloves after you touch raw food, trash, your phone, or your face. Cover all hair — a loose bun is not a hair net. Own a working probe thermometer. Guessing by steam, color, or “it looks done” is not allowed on this table.",
    ],
    points: [
      "Gloves: clean, disposable, changed when soiled or after raw food.",
      "Hair net or a cap that fully contains hair, every time you prep.",
      "Thermometer: fridge at 40°F or below, leftovers to 165°F in the thickest part.",
    ],
    visual: "gear",
    question: "What must you have and use before you prepare leftovers for Second Table?",
    options: [
      { id: "a", label: "Washed hands and an apron. Gear is optional at home." },
      { id: "b", label: "Clean gloves, a hair net, and a food thermometer — used, not just nearby." },
      { id: "c", label: "A thermometer only if the dish contains meat." },
    ],
    correctId: "b",
    explanation:
      "Every user, every plate. Gloves and a hair net keep hair and bare-hand contact off ready-to-eat food. A thermometer is how you know temperature. Without all three, do not offer or re-prepare food here.",
  },
  {
    id: "reheat",
    n: "04",
    title: "Reheat until it is truly hot",
    shortTitle: "Reheat hot",
    kicker: "Food prep",
    paragraphs: [
      "Leftovers should be reheated to 165°F (74°C) — measured with your thermometer in the thickest part, not guessed from the edges. Stir soups, stews, and gravies. In a microwave, cover, rotate, and let the food stand so heat can finish moving, then check the temperature again.",
      "Reheat only what you will eat. Repeated cool-and-reheat cycles give bacteria another chance. If food smells or looks wrong, throw it away. A normal smell does not prove it is safe.",
    ],
    points: [
      "165°F throughout, confirmed with a thermometer. Steam alone is not enough.",
      "Sauces and soups should bubble. Casseroles should be hot in the center.",
      "Wear gloves and a hair net while you reheat and pack. Do not offer food you cannot measure.",
    ],
    visual: "reheat",
    question: "Before leftover food is eaten, it should be reheated until:",
    options: [
      { id: "a", label: "A thermometer reads 165°F in the thickest part, steaming hot all the way through." },
      { id: "b", label: "The edges are warm and the middle is still cool so it does not dry out." },
      { id: "c", label: "It has been in a 200°F oven for five minutes, regardless of thickness." },
    ],
    correctId: "a",
    explanation:
      "Warm edges and a cool center are still in the danger zone. Time in a low oven is not a substitute for an actual reading. Use the thermometer.",
  },
  {
    id: "allergens",
    n: "05",
    title: "Allergens and shared kitchens",
    shortTitle: "Allergens",
    kicker: "Food prep",
    paragraphs: [
      "Home kitchens share pans, boards, oils, fryers, toasters, and sponges. Food can pick up milk, wheat, peanuts, tree nuts, soy, egg, fish, shellfish, and sesame even when those foods were not in the recipe.",
      "On Second Table you must describe known allergens in good faith — including likely cross-contact. “None” is only honest if you are sure. If you are not sure, say so. A guest with an allergy may need to walk away. That is the right outcome.",
    ],
    points: [
      "List every allergen you used. List shared equipment when it matters.",
      "Do not guess. “I think it is nut-free” is not a label.",
      "Never pressure someone with an allergy to take a plate.",
    ],
    visual: "allergens",
    question: "You fried this dish in a pan that had peanut oil in it last week. The recipe has no peanuts. How do you label it?",
    options: [
      { id: "a", label: "“No allergens.” The recipe does not include peanuts." },
      { id: "b", label: "Disclose possible peanut cross-contact from the shared pan." },
      { id: "c", label: "Skip the allergen line. People can ask if they care." },
    ],
    correctId: "b",
    explanation:
      "Cross-contact is a real exposure. An allergen list that only names recipe ingredients is incomplete. If you cannot disclose honestly, do not offer the food.",
  },
  {
    id: "toss",
    n: "06",
    title: "When the plate does not belong on the table",
    shortTitle: "When to toss",
    kicker: "Knowing when to stop",
    paragraphs: [
      "Sharing leftovers is not a way to use up food you already distrust. If you would not eat it yourself tonight, do not put it on Second Table.",
      "Throw it away — do not post it — if it sat out too long, you lost track of the date, it smells or looks off, it was undercooked, you skipped gloves or a hair net, or you never checked the temperature. Pregnant people, young children, older adults, and anyone with a weaker immune system are at higher risk.",
    ],
    points: [
      "When in doubt, throw it out. The bin is cheaper than a hospital.",
      "Do not share raw or undercooked meat, eggs, or seafood as leftovers.",
      "No gloves, no hair net, or no thermometer reading — the plate stays off the table.",
    ],
    visual: "toss",
    question: "A pan of lasagna sat on the counter all night. What should you do?",
    options: [
      { id: "a", label: "Reheat it to 165°F and offer it as a donation." },
      { id: "b", label: "Taste a corner. If it tastes fine, post it with a warning." },
      { id: "c", label: "Throw it away. Do not offer it on Second Table." },
    ],
    correctId: "c",
    explanation:
      "Reheating does not reliably undo toxins some bacteria leave behind. Taste is not a safety test. Food that spent the night out is not a leftover. It is garbage.",
  },
];

export const COURSE_ANSWER_KEY: Record<string, string> = Object.fromEntries(
  COURSE_LESSONS.map((lesson) => [lesson.id, lesson.correctId]),
);

export function scoreCourseAnswers(answers: Record<string, string>) {
  let score = 0;
  for (const lesson of COURSE_LESSONS) {
    if (answers[lesson.id] === lesson.correctId) score += 1;
  }
  return score;
}

export function courseAnswersAreComplete(answers: Record<string, string>) {
  return COURSE_LESSONS.every((lesson) => answers[lesson.id] === lesson.correctId);
}
