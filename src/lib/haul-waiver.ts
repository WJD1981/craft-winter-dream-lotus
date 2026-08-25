export const HAUL_WAIVER_VERSION = "1.0";

export const HAUL_WAIVER_TITLE = "LotLift haul release";

export const HAUL_WAIVER_INTRO =
  "Read this before you post a job or take a haul. It is a release of claims for property damage, delay, and ordinary negligence. It is not insurance.";

export const HAUL_WAIVER_SECTIONS = [
  {
    heading: "What LotLift is",
    body: "LotLift is a board that matches people who bought heavy or large items at a retailer with local crews who have a truck. We are not the store, not a licensed moving company, and not a common carrier. Crews are independent neighbors, not LotLift employees.",
  },
  {
    heading: "You inspect at both ends",
    body: "The customer must be at the store lot (or on the phone with the crew) when the item is loaded, and at the door when it is unloaded. Check the carton and the item before the crew leaves. Once you sign off on delivery, there are no returns of the haul fee.",
  },
  {
    heading: "Damage, loss, and delay",
    body: "Boxed furniture, appliances, TVs, and mattresses get scuffed, dented, and dropped. Stairs, tight halls, and weather make that more likely. You assume those risks. You release LotLift, the customer, and the crew from claims for property damage, lost parts, missed windows, and ordinary negligence. This release does not cover intentional harm or reckless conduct.",
  },
  {
    heading: "Not store delivery",
    body: "Retailer delivery, haul-away, and damage policies do not apply to a LotLift job. If the store still has the item, stay inside their rules for leaving the lot. Crews do not assemble, install, haul away packing, or take old appliances unless the job says so.",
  },
  {
    heading: "Payment",
    body: "The customer pays the quoted price with PayPal when the job is posted. LotLift keeps 20% of that listed price (pre-tax). The crew is paid 80% after delivery is confirmed. Cancel before a crew is booked and PayPal refunds the customer. After a crew is booked, cancel only if the item is not at the lot or is unsafe to move.",
  },
] as const;

export const HAUL_WAIVER_ACKS = [
  "I understand LotLift is not a moving company and does not insure my item.",
  "I will inspect the item at pickup and at drop-off before the crew leaves.",
  "I release claims for property damage, delay, and ordinary negligence as described above.",
  "I will not post commercial freight, hazardous materials, or anything illegal to move.",
] as const;
