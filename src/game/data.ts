import type { Character, WealthTier } from "./types";

export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "Brazil",
  "Nigeria",
  "India",
];

export const CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Austin",
  "Seattle",
  "Boston",
  "Denver",
  "Miami",
  "Atlanta",
  "Portland",
];

/** Cities always belong to the correct country. */
export const COUNTRY_CITIES: Record<string, string[]> = {
  "United States": ["New York", "Los Angeles", "Chicago", "Boston", "Seattle", "Miami", "Austin"],
  "United Kingdom": ["London", "Manchester", "Edinburgh", "Birmingham", "Bristol"],
  Canada: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
  Australia: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
  Germany: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne"],
  France: ["Paris", "Lyon", "Marseille", "Bordeaux", "Toulouse"],
  Japan: ["Tokyo", "Osaka", "Yokohama", "Kyoto", "Nagoya"],
  Brazil: ["S\u00e3o Paulo", "Rio de Janeiro", "Bras\u00edlia", "Belo Horizonte", "Curitiba"],
  Nigeria: ["Lagos", "Abuja", "Ibadan", "Port Harcourt", "Kano"],
  India: ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad"],
};

export function citiesFor(country: string): string[] {
  return COUNTRY_CITIES[country] ?? CITIES;
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const OCCUPATIONS: Record<WealthTier, string[]> = {
  poor: ["Unemployed", "Dishwasher", "Cashier", "Warehouse Worker", "Day Laborer"],
  working: ["Truck Driver", "Mechanic", "Nurse Aide", "Electrician", "Retail Supervisor"],
  middle: ["Teacher", "Accountant", "Software Developer", "Registered Nurse", "Sales Manager"],
  affluent: ["Physician", "Attorney", "Engineering Director", "Finance VP", "Business Owner"],
  wealthy: [
    "Surgeon",
    "Corporate Executive",
    "Investment Banker",
    "Real Estate Mogul",
    "Tech Founder",
  ],
};

export const CLUBS = [
  "Debate Team",
  "Chess Club",
  "Robotics",
  "Drama Club",
  "Student Council",
  "Science Olympiad",
  "Band",
  "Art Club",
  "Coding Club",
  "Model UN",
];

export const SPORTS = [
  "Soccer",
  "Basketball",
  "Track & Field",
  "Swimming",
  "Tennis",
  "Baseball",
  "Volleyball",
  "Football",
  "Wrestling",
  "Cross Country",
];

export const MALE_NAMES = [
  "James",
  "Liam",
  "Noah",
  "Ethan",
  "Marcus",
  "Julian",
  "Theo",
  "Andre",
  "Kai",
  "Leo",
  "Dominic",
  "Elias",
  "Ravi",
  "Chen",
  "Mateo",
  "Oscar",
];
export const FEMALE_NAMES = [
  "Ava",
  "Sofia",
  "Maya",
  "Isabel",
  "Nora",
  "Zoe",
  "Elena",
  "Aria",
  "Priya",
  "Ling",
  "Amara",
  "Camila",
  "Hana",
  "Freya",
  "Naomi",
  "Ivy",
];
export const LAST_NAMES = [
  "Reyes",
  "Carter",
  "Nguyen",
  "Kim",
  "Patel",
  "Okafor",
  "Rossi",
  "Novak",
  "Silva",
  "Bauer",
  "Ahmed",
  "Ford",
  "Vance",
  "Sterling",
  "Cross",
  "Hale",
];

export interface UniversityDef {
  name: string;
  prestige: number; // required smarts/gpa gate
  cost: number;
}

export const UNIVERSITIES: UniversityDef[] = [
  { name: "Harvard University", prestige: 95, cost: 62000 },
  { name: "Stanford University", prestige: 94, cost: 60000 },
  { name: "MIT", prestige: 93, cost: 59000 },
  { name: "Princeton University", prestige: 92, cost: 58000 },
  { name: "Columbia University", prestige: 88, cost: 55000 },
  { name: "Duke University", prestige: 85, cost: 52000 },
  { name: "University of Michigan", prestige: 78, cost: 34000 },
  { name: "UCLA", prestige: 76, cost: 30000 },
  { name: "State University", prestige: 55, cost: 18000 },
  { name: "City Community College", prestige: 30, cost: 6000 },
];

export const MAJORS = [
  "Finance",
  "Economics",
  "Computer Science",
  "Political Science",
  "Biology",
  "Chemistry",
  "Engineering",
  "Psychology",
  "Business",
  "Accounting",
  "Marketing",
  "Mathematics",
  "English",
];

export interface PromotionGate {
  level: number; // the ladder level being promoted INTO
  degree?: "MBA" | "JD" | "MD";
  minYearsAtLevel?: number; // years required at the current level first
  note: string; // shown when the gate blocks a promotion
}

export interface JobDef {
  id: string;
  title: string;
  company: string;
  field: string;
  baseSalary: number;
  requiresDegree: boolean;
  degreeReq?: "MBA" | "JD" | "MD"; // hard requirement to be hired at all
  requiresBar?: boolean; // must have passed the bar exam
  minSmarts: number;
  minAge: number;
  ladder: string[]; // promotion titles
  promotionGates?: PromotionGate[]; // hard gates on climbing the ladder
}

export const JOBS: JobDef[] = [
  {
    id: "retail",
    title: "Retail Associate",
    company: "MegaMart",
    field: "Retail",
    baseSalary: 26000,
    requiresDegree: false,
    minSmarts: 0,
    minAge: 16,
    ladder: ["Retail Associate", "Shift Lead", "Store Manager", "Regional Manager"],
  },
  {
    id: "barista",
    title: "Barista",
    company: "Brew & Co.",
    field: "Hospitality",
    baseSalary: 24000,
    requiresDegree: false,
    minSmarts: 0,
    minAge: 16,
    ladder: ["Barista", "Head Barista", "Café Manager", "Franchise Owner"],
  },
  {
    id: "swe",
    title: "Junior Software Engineer",
    company: "Nexus Labs",
    field: "Technology",
    baseSalary: 95000,
    requiresDegree: true,
    minSmarts: 65,
    minAge: 21,
    ladder: [
      "Junior Software Engineer",
      "Software Engineer",
      "Senior Engineer",
      "Staff Engineer",
      "VP of Engineering",
    ],
  },
  {
    id: "analyst",
    title: "Investment Banking Analyst",
    company: "Goldman Sterling",
    field: "Finance",
    baseSalary: 110000,
    requiresDegree: true,
    minSmarts: 72,
    minAge: 21,
    ladder: ["IB Analyst", "Associate", "Vice President", "Managing Director", "Partner"],
    promotionGates: [{ level: 2, degree: "MBA", note: "Vice President promotions require an MBA" }],
  },
  {
    id: "consultant",
    title: "Business Analyst",
    company: "McKinley & Co.",
    field: "Consulting",
    baseSalary: 100000,
    requiresDegree: true,
    minSmarts: 70,
    minAge: 21,
    ladder: ["Business Analyst", "Consultant", "Engagement Manager", "Partner"],
    promotionGates: [
      { level: 2, degree: "MBA", note: "Engagement Manager promotions require an MBA" },
    ],
  },
  {
    id: "nurse",
    title: "Registered Nurse",
    company: "St. Grace Hospital",
    field: "Healthcare",
    baseSalary: 68000,
    requiresDegree: true,
    minSmarts: 55,
    minAge: 21,
    ladder: ["Registered Nurse", "Charge Nurse", "Nurse Manager", "Director of Nursing"],
  },
  {
    id: "teacher",
    title: "Teacher",
    company: "Public School District",
    field: "Education",
    baseSalary: 48000,
    requiresDegree: true,
    minSmarts: 45,
    minAge: 21,
    ladder: ["Teacher", "Department Head", "Vice Principal", "Principal"],
  },
  {
    id: "biglaw",
    title: "Litigation Associate",
    company: "Cravath & Sterling LLP",
    field: "Law",
    baseSalary: 215000,
    requiresDegree: true,
    degreeReq: "JD",
    requiresBar: true,
    minSmarts: 75,
    minAge: 24,
    ladder: ["Litigation Associate", "Senior Associate", "Counsel", "Partner"],
    promotionGates: [
      { level: 3, minYearsAtLevel: 3, note: "Partner promotions require 3+ years as Counsel" },
    ],
  },
  {
    id: "physician",
    title: "Medical Resident",
    company: "St. Grace Hospital",
    field: "Medicine",
    baseSalary: 62000,
    requiresDegree: true,
    degreeReq: "MD",
    minSmarts: 75,
    minAge: 25,
    ladder: ["Medical Resident", "Attending Physician", "Senior Physician", "Chief of Medicine"],
    promotionGates: [
      {
        level: 1,
        minYearsAtLevel: 3,
        note: "Residency takes 3 years before becoming an Attending",
      },
    ],
  },
  {
    id: "marketer",
    title: "Marketing Coordinator",
    company: "Bright Media",
    field: "Marketing",
    baseSalary: 52000,
    requiresDegree: true,
    minSmarts: 40,
    minAge: 21,
    ladder: ["Marketing Coordinator", "Marketing Manager", "Director", "CMO"],
  },
  {
    id: "accountant",
    title: "Staff Accountant",
    company: "Pinnacle Advisory",
    field: "Accounting",
    baseSalary: 62000,
    requiresDegree: true,
    minSmarts: 55,
    minAge: 21,
    ladder: ["Staff Accountant", "Senior Accountant", "Manager", "Partner"],
  },
  {
    id: "engineer",
    title: "Junior Engineer",
    company: "Vertex Engineering",
    field: "Engineering",
    baseSalary: 72000,
    requiresDegree: true,
    minSmarts: 62,
    minAge: 21,
    ladder: ["Junior Engineer", "Engineer", "Senior Engineer", "Engineering Manager"],
  },
  {
    id: "politician",
    title: "Campaign Staffer",
    company: "Public Office",
    field: "Politics",
    baseSalary: 45000,
    requiresDegree: false,
    minSmarts: 45,
    minAge: 18,
    ladder: ["Campaign Staffer", "City Council Member", "Mayor", "Governor", "Senator"],
  },
  {
    id: "athlete",
    title: "Semi-Pro Athlete",
    company: "Regional League",
    field: "Athletics",
    baseSalary: 40000,
    requiresDegree: false,
    minSmarts: 0,
    minAge: 18,
    ladder: ["Semi-Pro Athlete", "Professional Athlete", "All-Star", "Hall of Famer"],
  },
  {
    id: "entrepreneur",
    title: "Founder",
    company: "Your Startup",
    field: "Entrepreneurship",
    baseSalary: 30000,
    requiresDegree: false,
    minSmarts: 50,
    minAge: 18,
    ladder: ["Founder", "CEO (Seed)", "CEO (Series A)", "CEO (Scale-up)"],
  },
  {
    id: "entertainer",
    title: "Aspiring Entertainer",
    company: "Open Mic Circuit",
    field: "Entertainment",
    baseSalary: 28000,
    requiresDegree: false,
    minSmarts: 0,
    minAge: 16,
    ladder: ["Aspiring Entertainer", "Working Performer", "Featured Act", "Headliner", "Star"],
  },
];

export function eligibleJobs(c: Character): JobDef[] {
  const hasDegree = c.education === "graduated";
  return JOBS.filter(
    (j) => c.age >= j.minAge && c.stats.smarts >= j.minSmarts && (!j.requiresDegree || hasDegree),
  );
}
