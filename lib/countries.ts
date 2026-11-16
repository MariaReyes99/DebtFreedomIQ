// Support directory per country. Verified November 2026 — re-check numbers every 3 months.
export type CountryCode = "NZ" | "PH" | "US" | "AU" | "GB";

export type Resource = {
  name: string;
  what: string;
  phone?: string;
  text?: string;
  email?: string;
  url?: string;
  hours?: string;
};

export type ResourceGroup = { title: string; items: Resource[] };

export type Country = {
  code: CountryCode;
  name: string;
  flag: string;
  currency: string; // ISO for Stripe
  symbol: string;
  locale: string;
  defaultPeriod: "fortnight" | "month";
  emergency: string;
  crisis: Resource; // 24/7 emotional crisis line shown on every page
  firstCall: Resource; // the single best first contact for money trouble
  groups: ResourceGroup[];
  rightsNote: string; // short, country-specific borrower-rights note used in the plan + letter
  premiumPrice: number; // one-time Premium report, local currency (≈ NZ$19)
  plusPrice: number; // Premium Plus monthly (coming later, ≈ NZ$9.99)
  adviserRegister: { name: string; url: string }; // where to check an adviser is licensed
};

export const COUNTRIES: Record<CountryCode, Country> = {
  NZ: {
    code: "NZ",
    name: "New Zealand",
    flag: "🇳🇿",
    currency: "nzd",
    symbol: "NZ$",
    locale: "en-NZ",
    defaultPeriod: "fortnight",
    emergency: "111",
    crisis: { name: "1737 – Need to Talk?", what: "Free call or text, 24/7, with a trained counsellor", phone: "1737", text: "1737", url: "https://1737.org.nz" },
    firstCall: { name: "MoneyTalks", what: "Free, confidential financial mentors (budget advisors) who help with debt and creditors", phone: "0800 345 123", text: "4029", email: "help@moneytalks.co.nz", url: "https://www.moneytalks.co.nz", hours: "Mon–Fri 8am–8pm · Sat 9am–4pm · Sun 10am–2pm" },
    groups: [
      { title: "Money & debt help (free)", items: [
        { name: "MoneyTalks", what: "Financial mentors, budgeting, negotiating with creditors, local services", phone: "0800 345 123", text: "4029", url: "https://www.moneytalks.co.nz" },
        { name: "Christians Against Poverty (CAP) Debt Help", what: "Free debt support for anyone, in several communities", phone: "0508 227 111", url: "https://capnz.org" },
        { name: "Sorted", what: "Free budget planner and debt calculator", url: "https://sorted.org.nz" },
      ]},
      { title: "Government support", items: [
        { name: "Work and Income (MSD)", what: "Jobseeker & Sole Parent Support, Accommodation Supplement, food grants, hardship help — even if you're working", phone: "0800 559 009", url: "https://www.workandincome.govt.nz" },
        { name: "Check What You Might Get", what: "Work and Income's online entitlement checker", url: "https://check.msd.govt.nz" },
        { name: "Inland Revenue – Working for Families & Child Support", what: "Family tax credits and child support", url: "https://www.ird.govt.nz/working-for-families" },
      ]},
      { title: "Food, housing & everyday needs", items: [
        { name: "Citizens Advice Bureau (CAB)", what: "Free, confidential info on rights, tenancy, local foodbanks and services", phone: "0800 367 222", url: "https://www.cab.org.nz" },
        { name: "Family Services Directory", what: "Find local foodbanks, budgeting and family services", url: "https://www.familyservices.govt.nz/directory" },
        { name: "Tenancy Services", what: "Renters' rights, bond, rent arrears", phone: "0800 836 262", url: "https://www.tenancy.govt.nz" },
      ]},
      { title: "Legal help", items: [
        { name: "Community Law Centres", what: "Free legal help, including debt and credit contracts", url: "https://communitylaw.org.nz" },
        { name: "Consumer Protection – hardship applications", what: "How to ask a lender for a hardship variation under the CCCFA", url: "https://www.consumerprotection.govt.nz" },
      ]},
      { title: "Health & hospital bills", items: [
        { name: "Work and Income – help with health costs", what: "Disability Allowance and hardship help for ongoing medical, doctor and prescription costs, even if you're working", phone: "0800 559 009", url: "https://www.workandincome.govt.nz" },
        { name: "Your hospital's billing office (Health NZ | Te Whatu Ora)", what: "Public hospital care is free for eligible residents. If you were billed (e.g. not eligible, ACC or private), ask the hospital for a payment arrangement or review", url: "https://www.tewhatuora.govt.nz" },
        { name: "Cancer Society NZ", what: "Practical and financial support information for people affected by cancer", phone: "0800 226 237", url: "https://www.cancer.org.nz" },
      ]},
      { title: "Other not-for-profit debt help", items: [
        { name: "Good Shepherd NZ – Good Loans", what: "No-interest, fee-free loans for people on low incomes for essentials, including medical costs. Debt-consolidation loans may be paused at times", phone: "0800 466 370", url: "https://goodshepherd.org.nz" },
        { name: "Ngā Tāngata Microfinance", what: "Interest-free loans (backed by Kiwibank) for things like medical costs or paying off high-interest debt", url: "https://www.ngatangatamicrofinance.org.nz" },
      ]},
      { title: "Emotional support", items: [
        { name: "1737 – Need to Talk?", what: "Free call or text 24/7", phone: "1737" },
        { name: "Emergency", what: "If someone may harm themselves or others", phone: "111" },
      ]},
    ],
    rightsNote: "Under the Credit Contracts and Consumer Finance Act (CCCFA) you can ask your lender for a hardship variation if illness, job loss, the end of a relationship or another unforeseen event makes repayments hard.",
    premiumPrice: 19,
    plusPrice: 9.99,
    adviserRegister: { name: "Financial Service Providers Register", url: "https://fsp-register.companiesoffice.govt.nz" },
  },

  PH: {
    code: "PH",
    name: "Philippines",
    flag: "🇵🇭",
    currency: "php",
    symbol: "₱",
    locale: "en-PH",
    defaultPeriod: "month",
    emergency: "911",
    crisis: { name: "NCMH Crisis Hotline", what: "24/7 mental health crisis support", phone: "1553", text: "0917-899-8727", url: "https://ncmh.gov.ph" },
    firstCall: { name: "DSWD – Assistance to Individuals in Crisis Situation (AICS)", what: "Emergency help for medical, burial, transport, food and other crisis costs — open to low and middle-income families", url: "https://www.dswd.gov.ph", hours: "Weekdays at DSWD Crisis Intervention Units and Field Offices" },
    groups: [
      { title: "Government help", items: [
        { name: "DSWD – AICS", what: "Crisis assistance and guarantee letters; visit a Crisis Intervention Unit or Field Office", url: "https://www.dswd.gov.ph" },
        { name: "Public Attorney's Office (PAO)", what: "Free legal help if you can't afford a lawyer (eligibility applies)", phone: "(02) 8929-9436", url: "https://www.pao.gov.ph" },
      ]},
      { title: "Complaints about lenders & collectors", items: [
        { name: "Bangko Sentral ng Pilipinas (BSP)", what: "Banks and credit cards — complain to the bank first, then BSP", phone: "(02) 5306-2584", email: "consumeraffairs@bsp.gov.ph", url: "https://www.bsp.gov.ph" },
        { name: "SEC Philippines", what: "Online lending apps, lending & financing companies, harassment by collectors", phone: "(02) 8818-5990", email: "flcd_complaints@sec.gov.ph", url: "https://www.sec.gov.ph" },
      ]},
      { title: "Debt restructuring", items: [
        { name: "Credit Card Association of the Philippines – IDRP", what: "Interbank Debt Relief Program: lower interest and longer terms for multiple credit-card debts (restructuring, not forgiveness)", url: "https://www.ccap.ph" },
        { name: "Integrated Bar of the Philippines – Legal Aid", what: "Free or low-cost legal assistance through local chapters", phone: "(02) 8631-3013", email: "legalaid@ibp.ph", url: "https://www.ibp.ph" },
      ]},
      { title: "Health & hospital bills", items: [
        { name: "PhilHealth – Zero Balance Billing", what: "PhilHealth members in a basic/ward bed at a DOH-retained government hospital pay ₱0 for their confinement. Ask the hospital billing or PhilHealth desk", url: "https://www.philhealth.gov.ph" },
        { name: "Malasakit Center (inside many government hospitals)", what: "One free desk combining DOH (MAIFIP), PhilHealth, DSWD (AICS) and PCSO medical assistance for the bill that's left", url: "https://doh.gov.ph" },
        { name: "PCSO Medical Assistance", what: "Guarantee letters for hospital bills and medicines; apply at a Malasakit desk or PCSO branch", url: "https://www.pcso.gov.ph" },
        { name: "Hospital Medical Social Service office", what: "Ask to be assessed for discounts and charity classification before signing a promissory note" },
      ]},
      { title: "Other not-for-profit debt help", items: [
        { name: "CCAP – Interbank Debt Relief Program", what: "Restructuring for multiple credit card debts (not forgiveness)", url: "https://www.ccap.ph" },
        { name: "IBP Legal Aid", what: "Free or low-cost legal help with collectors and court notices", phone: "(02) 8631-3013", url: "https://www.ibp.ph" },
      ]},
      { title: "Emotional support", items: [
        { name: "NCMH Crisis Hotline", what: "24/7", phone: "1553", text: "0917-899-8727" },
        { name: "Emergency", what: "Police, fire, ambulance", phone: "911" },
      ]},
    ],
    rightsNote: "SEC rules prohibit abusive collection practices such as threats, public shaming and contacting people in your phonebook. Keep records and report them. Never ignore a genuine court summons.",
    premiumPrice: 650,
    plusPrice: 349,
    adviserRegister: { name: "SEC Philippines – check registered firms", url: "https://www.sec.gov.ph" },
  },

  US: {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    currency: "usd",
    symbol: "$",
    locale: "en-US",
    defaultPeriod: "month",
    emergency: "911",
    crisis: { name: "988 Suicide & Crisis Lifeline", what: "Call or text 988, 24/7", phone: "988", text: "988", url: "https://988lifeline.org" },
    firstCall: { name: "211", what: "Free, confidential help finding local food, rent, utility and other assistance, 24/7", phone: "211", text: "211", url: "https://www.211.org" },
    groups: [
      { title: "Money & debt help (nonprofit)", items: [
        { name: "NFCC – National Foundation for Credit Counseling", what: "Nonprofit certified credit counselors; first session free", phone: "1-800-388-2227", url: "https://www.nfcc.org" },
        { name: "CFPB", what: "Free guides and complaints about lenders and debt collectors", phone: "1-855-411-2372", url: "https://www.consumerfinance.gov" },
      ]},
      { title: "Government benefits", items: [
        { name: "USA.gov – Benefits", what: "Find government benefits you may qualify for", url: "https://www.usa.gov/benefits" },
        { name: "SNAP (food benefits)", what: "Monthly food assistance through your state", url: "https://www.fns.usda.gov/snap" },
      ]},
      { title: "Food, housing & everyday needs", items: [
        { name: "211", what: "Local rent, utility, food and shelter help", phone: "211", url: "https://www.211.org" },
        { name: "Feeding America", what: "Find your local food bank", url: "https://www.feedingamerica.org/find-your-local-foodbank" },
      ]},
      { title: "Legal help", items: [
        { name: "LawHelp.org", what: "Find free legal aid in your state (debt, eviction, collections)", url: "https://www.lawhelp.org" },
      ]},
      { title: "Health & hospital bills", items: [
        { name: "Hospital financial assistance (charity care)", what: "Nonprofit hospitals must offer financial assistance; many bills can be reduced or wiped out. Ask the hospital billing office for its Financial Assistance Policy and application" },
        { name: "Dollar For", what: "Free nonprofit that checks if you qualify for hospital charity care and helps you apply", url: "https://dollarfor.org" },
        { name: "Patient Advocate Foundation", what: "Free case managers for people with serious or chronic illness: insurance denials, medical bills, financial help", phone: "(800) 532-5274", url: "https://www.patientadvocate.org" },
        { name: "HealthWell Foundation", what: "Helps eligible people with copays, deductibles and premiums for certain conditions", url: "https://www.healthwellfoundation.org" },
      ]},
      { title: "Other not-for-profit debt help", items: [
        { name: "NFCC member agencies", what: "Nonprofit credit counseling and debt management plans; avoid companies charging upfront fees", phone: "1-800-388-2227", url: "https://www.nfcc.org" },
        { name: "Upsolve", what: "Nonprofit with a free tool to file bankruptcy yourself when debts can't be repaid", url: "https://upsolve.org" },
      ]},
      { title: "Emotional support", items: [
        { name: "988 Suicide & Crisis Lifeline", what: "Call or text 24/7", phone: "988" },
        { name: "Emergency", what: "Police, fire, ambulance", phone: "911" },
      ]},
    ],
    rightsNote: "Under the Fair Debt Collection Practices Act, debt collectors may not harass, threaten or deceive you. Be wary of companies charging upfront fees to settle debt — nonprofit credit counseling is free or low-cost.",
    premiumPrice: 12,
    plusPrice: 6.49,
    adviserRegister: { name: "FINRA BrokerCheck & SEC adviser search", url: "https://brokercheck.finra.org" },
  },

  AU: {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    currency: "aud",
    symbol: "A$",
    locale: "en-AU",
    defaultPeriod: "fortnight",
    emergency: "000",
    crisis: { name: "Lifeline", what: "24/7 crisis support by phone, text or chat", phone: "13 11 14", url: "https://www.lifeline.org.au" },
    firstCall: { name: "National Debt Helpline", what: "Free, independent, confidential financial counsellors", phone: "1800 007 007", url: "https://ndh.org.au", hours: "Phone Mon–Fri 9:30am–4:30pm · Live chat Mon–Fri 9am–8pm" },
    groups: [
      { title: "Money & debt help (free)", items: [
        { name: "National Debt Helpline", what: "Financial counsellors for credit cards, loans, mortgage stress, bills and debt collectors", phone: "1800 007 007", url: "https://ndh.org.au" },
        { name: "Mob Strong Debt Help", what: "Free legal advice on money matters for Aboriginal and Torres Strait Islander peoples", phone: "1800 808 488" },
        { name: "Moneysmart", what: "Free government budgeting tools and guides", url: "https://moneysmart.gov.au" },
      ]},
      { title: "Government support", items: [
        { name: "Centrelink (Services Australia)", what: "Income support, Crisis Payment, Advance Payment", phone: "132 850", url: "https://www.servicesaustralia.gov.au" },
      ]},
      { title: "Food, housing & everyday needs", items: [
        { name: "Ask Izzy", what: "Find local food, housing, counselling and everyday help", url: "https://askizzy.org.au" },
        { name: "Foodbank Australia", what: "Find food relief near you", url: "https://www.foodbank.org.au" },
        { name: "The Salvation Army", what: "Emergency relief", phone: "13 72 58", url: "https://www.salvationarmy.org.au" },
        { name: "St Vincent de Paul", what: "Emergency relief", phone: "13 18 12", url: "https://www.vinnies.org.au" },
      ]},
      { title: "Complaints", items: [
        { name: "Australian Financial Complaints Authority (AFCA)", what: "Free complaints about banks, lenders and debt collectors", phone: "1800 931 678", url: "https://www.afca.org.au" },
      ]},
      { title: "Health & hospital bills", items: [
        { name: "Your hospital's billing or social work team", what: "Public hospital treatment is free for Medicare patients. If you have a bill (private, ambulance or non-Medicare), ask about hardship, payment plans or waivers" },
        { name: "Cancer Council", what: "Practical and financial support, including free financial counselling and pro bono legal/financial help for eligible people", phone: "13 11 20", url: "https://www.cancer.org.au" },
        { name: "Private Health Insurance Ombudsman", what: "Free help with disputes about private health insurance cover or claims", phone: "1300 362 072", url: "https://www.ombudsman.gov.au/private-health-insurance" },
      ]},
      { title: "Other not-for-profit debt help", items: [
        { name: "Good Shepherd – No Interest Loans (NILs)", what: "Interest-free, fee-free loans for essential goods and services, including medical costs, through local providers. No credit checks", phone: "13 64 57", url: "https://goodshep.org.au" },
        { name: "The Salvation Army – Moneycare", what: "Free financial counselling and support", url: "https://www.salvationarmy.org.au/moneycare" },
      ]},
      { title: "Emotional support", items: [
        { name: "Lifeline", what: "24/7", phone: "13 11 14" },
        { name: "13YARN", what: "Aboriginal & Torres Strait Islander crisis support, 24/7", phone: "13 92 76" },
        { name: "Emergency", what: "Police, fire, ambulance", phone: "000" },
      ]},
    ],
    rightsNote: "Under the National Credit Code you can ask your lender for a financial hardship arrangement. If they refuse or don't respond, you can complain free to AFCA.",
    premiumPrice: 17,
    plusPrice: 8.99,
    adviserRegister: { name: "ASIC Moneysmart – Financial advisers register", url: "https://moneysmart.gov.au/financial-advice/financial-advisers-register" },
  },

  GB: {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    currency: "gbp",
    symbol: "£",
    locale: "en-GB",
    defaultPeriod: "month",
    emergency: "999",
    crisis: { name: "Samaritans", what: "Free, any time, day or night", phone: "116 123", url: "https://www.samaritans.org" },
    firstCall: { name: "StepChange Debt Charity", what: "Free, impartial debt advice and fee-free debt solutions", phone: "0800 138 1111", url: "https://www.stepchange.org", hours: "Mon–Fri 8am–8pm · Sat 9am–2pm" },
    groups: [
      { title: "Money & debt help (free)", items: [
        { name: "StepChange Debt Charity", what: "Free debt advice, online or by phone", phone: "0800 138 1111", url: "https://www.stepchange.org" },
        { name: "National Debtline", what: "Free debt advice, sample letters, self-help packs", phone: "0808 808 4000", url: "https://www.nationaldebtline.org", hours: "Mon–Fri 9am–8pm · Sat 9:30am–1pm" },
        { name: "Citizens Advice", what: "Debt, benefits, housing and consumer rights", phone: "0800 240 4420", url: "https://www.citizensadvice.org.uk" },
        { name: "Business Debtline", what: "Free help for the self-employed", phone: "0800 197 6026", url: "https://businessdebtline.org" },
        { name: "MoneyHelper", what: "Free government-backed money guidance", phone: "0800 138 7777", url: "https://www.moneyhelper.org.uk" },
      ]},
      { title: "Benefits & grants", items: [
        { name: "Turn2us", what: "Benefits calculator and grants search", phone: "0808 802 2000", url: "https://www.turn2us.org.uk" },
      ]},
      { title: "Food, housing & everyday needs", items: [
        { name: "Trussell – Help through Hardship", what: "Benefits checks, income advice and food bank referral", phone: "0808 208 2138", url: "https://www.trussell.org.uk" },
        { name: "Shelter", what: "Housing and homelessness advice (England)", phone: "0808 800 4444", url: "https://www.shelter.org.uk" },
      ]},
      { title: "Health & hospital bills", items: [
        { name: "NHS Low Income Scheme", what: "Help with prescriptions, dental, eye care and travel to hospital if you're on a low income. You don't have to be on benefits", phone: "0300 330 1343", url: "https://www.nhsbsa.nhs.uk/nhs-low-income-scheme" },
        { name: "Macmillan Cancer Support", what: "Free money advisers and grants for people affected by cancer", phone: "0808 808 00 00", url: "https://www.macmillan.org.uk" },
        { name: "Overseas visitor NHS charges", what: "If you've been charged for NHS hospital care, ask the hospital's Overseas Visitors team about payment plans and exemptions" },
      ]},
      { title: "Other not-for-profit debt help", items: [
        { name: "Christians Against Poverty (CAP)", what: "Free face-to-face debt help for people of any faith or none", phone: "0800 328 0006", url: "https://capuk.org" },
        { name: "Turn2us – Grants Search", what: "Find charitable grants that may help with bills or debts", url: "https://www.turn2us.org.uk" },
      ]},
      { title: "Emotional support", items: [
        { name: "Samaritans", what: "Free, 24/7", phone: "116 123" },
        { name: "Shout", what: "Text SHOUT to 85258, 24/7", text: "85258" },
        { name: "Emergency", what: "Police, fire, ambulance", phone: "999" },
      ]},
    ],
    rightsNote: "In England and Wales, a free debt adviser can apply for Breathing Space — up to 60 days' protection from most interest, charges and creditor action. Never pay for debt advice; it's free from charities.",
    premiumPrice: 9,
    plusPrice: 4.99,
    adviserRegister: { name: "FCA Financial Services Register", url: "https://register.fca.org.uk" },
  },
};

export const COUNTRY_LIST = Object.values(COUNTRIES);

export function toCountryCode(v: string | null | undefined): CountryCode | null {
  if (!v) return null;
  const c = v.toUpperCase() === "UK" ? "GB" : v.toUpperCase();
  return c in COUNTRIES ? (c as CountryCode) : null;
}

export function money(c: Country, n: number, decimals = 0) {
  const v = n || 0;
  const abs = Math.abs(v).toLocaleString(c.locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${v < 0 ? "-" : ""}${c.symbol}${abs}`;
}

export const DEFAULT_COUNTRY: CountryCode = "NZ";
