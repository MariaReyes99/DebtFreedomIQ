import type { AssessmentInput } from "./types";

/** Example household used for "Try with example data" and demo previews. */
export const EXAMPLE_HOUSEHOLD: AssessmentInput = {
  country: "NZ",
  incomes: [
    { id: "i1", source: "Salary (take-home)", amount: 5900 },
    { id: "i2", source: "Partner part-time", amount: 1400 },
    { id: "i3", source: "Working for Families", amount: 350 },
  ],
  expenses: [
    { id: "e1", category: "Groceries", amount: 1100, essential: true },
    { id: "e2", category: "Power, water & internet", amount: 380, essential: true },
    { id: "e3", category: "Transport & fuel", amount: 420, essential: true },
    { id: "e4", category: "Insurance", amount: 260, essential: true },
    { id: "e5", category: "Childcare & school", amount: 300, essential: true },
    { id: "e6", category: "Streaming & subscriptions", amount: 95, essential: false },
    { id: "e7", category: "Eating out & takeaways", amount: 280, essential: false },
    { id: "e8", category: "Other spending", amount: 250, essential: false },
  ],
  debts: [
    { id: "d1", name: "Home loan", type: "mortgage", balance: 480000, rate: 5.9, minPayment: 2850 },
    { id: "d2", name: "Credit card A", type: "credit_card", balance: 7800, rate: 21.95, minPayment: 240 },
    { id: "d3", name: "Car loan", type: "car_loan", balance: 14500, rate: 12.9, minPayment: 380 },
    { id: "d4", name: "Afterpay / BNPL", type: "bnpl", balance: 900, rate: 0, minPayment: 150 },
  ],
  assets: [
    { id: "a1", name: "Family home", type: "property", value: 720000 },
    { id: "a2", name: "Car", type: "vehicle", value: 16000 },
    { id: "a3", name: "KiwiSaver (both)", type: "retirement", value: 48000 },
  ],
  savings: 3500,
  situation: { behindOnBills: false, collectionsOrCourt: false, cantAffordFood: false, housingAtRisk: false, medicalDebt: false, distressed: false },
  goals: "Pay off the credit card and car loan, build a $10k emergency fund, and pay the mortgage off faster.",
};

export const EMPTY_HOUSEHOLD = (country: string): AssessmentInput => ({
  country,
  incomes: [{ id: "i1", source: "Take-home pay", amount: 0 }],
  expenses: [
    { id: "e1", category: "Rent / board (if no mortgage)", amount: 0, essential: true },
    { id: "e2", category: "Groceries", amount: 0, essential: true },
    { id: "e3", category: "Power, water & internet", amount: 0, essential: true },
    { id: "e4", category: "Transport", amount: 0, essential: true },
    { id: "e5", category: "Other spending", amount: 0, essential: false },
  ],
  debts: [],
  assets: [],
  savings: 0,
  situation: { behindOnBills: false, collectionsOrCourt: false, cantAffordFood: false, housingAtRisk: false, medicalDebt: false, distressed: false },
  goals: "",
});
