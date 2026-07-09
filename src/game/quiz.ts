import type { Character } from "./types";
import { inSchool } from "./education";

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index into options
}

export type QuizCategory =
  | "elementary"
  | "middle"
  | "high"
  | "college"
  | "sat"
  | "act"
  | "lsat"
  | "gmat"
  | "mcat"
  | "bar"
  | "ib_econ"
  | "ib_bio"
  | "ib_science"
  | "ib_math"
  | "ib_history"
  | "ib_cs"
  | "ib_lang"
  | "ib_society"
  | "ib_arts"
  | "leadership"
  | "athletics"
  | "interview"
  | "debate"
  | "robotics"
  | "finance";

const BANK: Record<QuizCategory, QuizQuestion[]> = {
  elementary: [
    { q: "What is 7 + 8?", options: ["13", "14", "15", "16"], answer: 2 },
    { q: "What is 6 x 4?", options: ["18", "24", "28", "30"], answer: 1 },
    { q: "Which word is a noun?", options: ["Run", "Happy", "Dog", "Quickly"], answer: 2 },
    { q: "How many continents are there?", options: ["5", "6", "7", "8"], answer: 2 },
    { q: "What planet do we live on?", options: ["Mars", "Earth", "Venus", "Jupiter"], answer: 1 },
    { q: "What is 20 - 9?", options: ["9", "10", "11", "12"], answer: 2 },
    { q: "Which is a mammal?", options: ["Shark", "Frog", "Whale", "Eagle"], answer: 2 },
    {
      q: "Blue and yellow mixed make?",
      options: ["Purple", "Green", "Orange", "Brown"],
      answer: 1,
    },
  ],
  middle: [
    { q: "Solve: 3x = 21. x = ?", options: ["6", "7", "8", "9"], answer: 1 },
    {
      q: "The powerhouse of the cell is the?",
      options: ["Nucleus", "Ribosome", "Mitochondria", "Membrane"],
      answer: 2,
    },
    {
      q: "Who was the first U.S. President?",
      options: ["Lincoln", "Jefferson", "Washington", "Adams"],
      answer: 2,
    },
    { q: "What is a synonym of 'rapid'?", options: ["Slow", "Quiet", "Fast", "Heavy"], answer: 2 },
    { q: "What is 12 squared?", options: ["124", "132", "144", "154"], answer: 2 },
    {
      q: "Water is made of hydrogen and?",
      options: ["Nitrogen", "Oxygen", "Carbon", "Helium"],
      answer: 1,
    },
    { q: "Which is a prime number?", options: ["9", "15", "17", "21"], answer: 2 },
    { q: "A triangle's angles add up to?", options: ["90", "180", "270", "360"], answer: 1 },
  ],
  high: [
    {
      q: "In a democracy, ultimate power rests with the?",
      options: ["Military", "People", "Courts", "President"],
      answer: 1,
    },
    {
      q: "Supply rises and demand falls. Price will?",
      options: ["Rise", "Fall", "Stay flat", "Double"],
      answer: 1,
    },
    {
      q: "Area of a circle is?",
      options: ["2 pi r", "pi r squared", "pi d", "r squared"],
      answer: 1,
    },
    {
      q: "Who wrote 'Romeo and Juliet'?",
      options: ["Dickens", "Shakespeare", "Twain", "Poe"],
      answer: 1,
    },
    { q: "The chemical symbol for gold is?", options: ["Go", "Gd", "Au", "Ag"], answer: 2 },
    {
      q: "A recession is defined by falling?",
      options: ["Inflation", "GDP", "Interest", "Taxes"],
      answer: 1,
    },
    { q: "Solve: x squared = 49. x = ?", options: ["6", "7", "8", "9"], answer: 1 },
    {
      q: "U.S. branches: legislative, judicial, and?",
      options: ["Federal", "Military", "Executive", "State"],
      answer: 2,
    },
  ],
  college: [
    {
      q: "A valid argument with true premises is?",
      options: ["Invalid", "Sound", "Biased", "Circular"],
      answer: 1,
    },
    {
      q: "Compound interest beats simple interest because it?",
      options: ["Ignores time", "Earns on interest", "Lowers principal", "Is untaxed"],
      answer: 1,
    },
    {
      q: "A thesis statement should be?",
      options: ["Vague", "A question", "Arguable", "A quote"],
      answer: 2,
    },
    {
      q: "Correlation does not imply?",
      options: ["Data", "Causation", "Sampling", "Variance"],
      answer: 1,
    },
    {
      q: "Opportunity cost is the value of the?",
      options: ["Cheapest option", "Next best alternative", "Total budget", "Sunk cost"],
      answer: 1,
    },
    {
      q: "A hypothesis must be?",
      options: ["Proven", "Testable", "Popular", "Complex"],
      answer: 1,
    },
    {
      q: "Which strengthens an argument?",
      options: ["Repetition", "A relevant statistic", "Longer sentences", "Bold text"],
      answer: 1,
    },
    {
      q: "Diversification reduces which risk?",
      options: ["Market", "Unsystematic", "Inflation", "Currency"],
      answer: 1,
    },
  ],
  sat: [
    { q: "If 2x + 5 = 17, x = ?", options: ["5", "6", "7", "8"], answer: 1 },
    {
      q: "Best synonym for 'meticulous':",
      options: ["Careless", "Careful", "Loud", "Brief"],
      answer: 1,
    },
    { q: "15% of 200 is?", options: ["25", "30", "35", "40"], answer: 1 },
    {
      q: "Which is grammatically correct?",
      options: ["Their going home", "There going home", "They're going home", "Theyre going home"],
      answer: 2,
    },
    {
      q: "A passage's main idea is its?",
      options: ["Tone", "Central claim", "Diction", "Rhyme"],
      answer: 1,
    },
    {
      q: "A shirt costs $40 after 20% off. Original price?",
      options: ["$48", "$50", "$52", "$60"],
      answer: 1,
    },
    { q: "Antonym of 'expand':", options: ["Grow", "Widen", "Contract", "Extend"], answer: 2 },
    { q: "Slope of y = 3x - 2 is?", options: ["-2", "2", "3", "1"], answer: 2 },
  ],
  act: [
    {
      q: "A car goes 150 miles in 3 hours. Speed?",
      options: ["40 mph", "45 mph", "50 mph", "55 mph"],
      answer: 2,
    },
    {
      q: "Best transition to add contrast:",
      options: ["Therefore", "However", "Moreover", "Thus"],
      answer: 1,
    },
    {
      q: "A control group is used to?",
      options: ["Add variables", "Compare results", "Speed testing", "Reduce cost"],
      answer: 1,
    },
    {
      q: "Which is punctuated correctly?",
      options: ["Its cold out.", "It's cold out.", "Its' cold out.", "It cold's out."],
      answer: 1,
    },
    {
      q: "A line rising left to right shows a trend that is?",
      options: ["Negative", "Flat", "Positive", "None"],
      answer: 2,
    },
    { q: "Square root of 81 = ?", options: ["7", "8", "9", "11"], answer: 2 },
    {
      q: "A reliable experiment must be?",
      options: ["Expensive", "Repeatable", "Long", "Secret"],
      answer: 1,
    },
    {
      q: "Concise revision of 'due to the fact that':",
      options: ["because", "since due", "owing that", "as of"],
      answer: 0,
    },
  ],
  lsat: [
    {
      q: "All roses are flowers. This tulip is a flower. So it's a rose. This is?",
      options: ["Valid", "A fallacy", "Sound", "Certain"],
      answer: 1,
    },
    {
      q: "If it rains, the game is cancelled. It was NOT cancelled. So?",
      options: ["It rained", "It did not rain", "Unknown", "It snowed"],
      answer: 1,
    },
    {
      q: "Which weakens 'Coffee causes productivity'?",
      options: [
        "Coffee tastes good",
        "Productive people drink it for other reasons",
        "Coffee is popular",
        "Coffee is warm",
      ],
      answer: 1,
    },
    {
      q: "A necessary condition for X is one X?",
      options: ["Guarantees", "Cannot occur without", "Prevents", "Follows"],
      answer: 1,
    },
    {
      q: "Only members may vote. Sam voted. So Sam?",
      options: ["Is not a member", "Is a member", "Might be a member", "Is an officer"],
      answer: 1,
    },
    {
      q: "Assumption in 'Ban ads; they lower sales'?",
      options: ["Ads are cheap", "Lower sales are undesirable", "Sales are high", "Ads are common"],
      answer: 1,
    },
    { q: "Sequence: 2, 4, 8, 16, ?", options: ["24", "30", "32", "20"], answer: 2 },
    {
      q: "If some A are B, it must be true that?",
      options: ["All A are B", "Some B are A", "No A are B", "All B are A"],
      answer: 1,
    },
  ],
  gmat: [
    {
      q: "Revenue $500k, costs $350k. Profit margin?",
      options: ["20%", "30%", "35%", "40%"],
      answer: 1,
    },
    { q: "If x/4 = 9, x = ?", options: ["27", "32", "36", "40"], answer: 2 },
    {
      q: "Which strengthens 'raise prices to boost profit'?",
      options: [
        "Demand is inelastic",
        "Competitors are cheaper",
        "Costs rose",
        "Customers are price-sensitive",
      ],
      answer: 0,
    },
    {
      q: "Sales doubling yearly is growth that is?",
      options: ["Linear", "Exponential", "Flat", "Negative"],
      answer: 1,
    },
    { q: "20 is what percent of 80?", options: ["20%", "25%", "30%", "40%"], answer: 1 },
    {
      q: "To find a square's area you need?",
      options: ["Its color", "One side length", "Two sides", "The diagonal only"],
      answer: 1,
    },
    {
      q: "Rising costs with flat revenue means profit?",
      options: ["Rises", "Falls", "Flat", "Doubles"],
      answer: 1,
    },
    { q: "Average of 10, 20, 30 is?", options: ["15", "20", "25", "30"], answer: 1 },
  ],
  mcat: [
    {
      q: "DNA is composed of units called?",
      options: ["Amino acids", "Nucleotides", "Lipids", "Sugars"],
      answer: 1,
    },
    { q: "The pH of a neutral solution is?", options: ["0", "7", "10", "14"], answer: 1 },
    {
      q: "Which organ produces insulin?",
      options: ["Liver", "Kidney", "Pancreas", "Spleen"],
      answer: 2,
    },
    {
      q: "Enzymes are primarily made of?",
      options: ["Carbohydrates", "Proteins", "Fats", "Minerals"],
      answer: 1,
    },
    {
      q: "An acid donates?",
      options: ["Electrons", "Protons (H+)", "Neutrons", "Oxygen"],
      answer: 1,
    },
    {
      q: "The variable a scientist changes is the?",
      options: ["Dependent variable", "Independent variable", "Control", "Constant"],
      answer: 1,
    },
    {
      q: "Red blood cells carry oxygen using?",
      options: ["Insulin", "Hemoglobin", "Collagen", "Keratin"],
      answer: 1,
    },
    {
      q: "Cellular respiration mainly produces?",
      options: ["DNA", "ATP", "Glucose", "Oxygen"],
      answer: 1,
    },
  ],
  bar: [
    {
      q: "A contract requires offer, acceptance, and?",
      options: ["Notary", "Consideration", "Witnesses", "Payment"],
      answer: 1,
    },
    {
      q: "Burden of proof in a criminal case is?",
      options: ["Preponderance", "Beyond reasonable doubt", "Probable cause", "Clear intent"],
      answer: 1,
    },
    {
      q: "Which amendment protects against self-incrimination?",
      options: ["First", "Fourth", "Fifth", "Tenth"],
      answer: 2,
    },
    {
      q: "Confidentiality is owed to the?",
      options: ["Court", "Client", "Public", "Opposing counsel"],
      answer: 1,
    },
    {
      q: "Judicial review was established in?",
      options: ["Roe v. Wade", "Marbury v. Madison", "Brown v. Board", "Miranda v. Arizona"],
      answer: 1,
    },
    {
      q: "A tort is a?",
      options: ["Criminal charge", "Civil wrong", "Contract term", "Tax form"],
      answer: 1,
    },
    {
      q: "A lawyer must avoid a conflict of?",
      options: ["Schedule", "Interest", "Opinion", "Venue"],
      answer: 1,
    },
    {
      q: "Due process is in the 5th and which amendment?",
      options: ["10th", "14th", "2nd", "8th"],
      answer: 1,
    },
  ],
  ib_econ: [
    {
      q: "If supply falls and demand is unchanged, price will?",
      options: ["Fall", "Rise", "Stay flat", "Hit zero"],
      answer: 1,
    },
    {
      q: "Inflation is a sustained rise in?",
      options: ["Wages", "The general price level", "Exports", "Taxes"],
      answer: 1,
    },
    {
      q: "GDP measures a country's total?",
      options: ["Debt", "Output of goods & services", "Population", "Money supply"],
      answer: 1,
    },
    {
      q: "Opportunity cost is the value of the?",
      options: ["Cheapest good", "Next best alternative forgone", "Total budget", "Imported goods"],
      answer: 1,
    },
    {
      q: "A price ceiling below equilibrium causes?",
      options: ["Surplus", "Shortage", "No change", "Deflation"],
      answer: 1,
    },
    {
      q: "Elastic demand means quantity responds strongly to?",
      options: ["Weather", "Price changes", "Advertising", "Population"],
      answer: 1,
    },
  ],
  ib_bio: [
    {
      q: "The basic unit of life is the?",
      options: ["Atom", "Cell", "Organ", "Tissue"],
      answer: 1,
    },
    { q: "Genes are made of?", options: ["Protein", "DNA", "Lipids", "Starch"], answer: 1 },
    {
      q: "Natural selection favors traits that improve?",
      options: ["Size", "Survival & reproduction", "Speed only", "Color"],
      answer: 1,
    },
    {
      q: "Photosynthesis converts light energy into?",
      options: ["Heat", "Chemical energy (glucose)", "Motion", "Sound"],
      answer: 1,
    },
    {
      q: "Mitosis produces cells that are?",
      options: ["Genetically identical", "Haploid", "Random", "Larger"],
      answer: 0,
    },
    {
      q: "Enzymes speed up reactions by lowering?",
      options: ["Temperature", "Activation energy", "pH", "Mass"],
      answer: 1,
    },
  ],
  ib_science: [
    { q: "The chemical symbol for sodium is?", options: ["So", "Na", "Sd", "N"], answer: 1 },
    {
      q: "Force equals mass times?",
      options: ["Velocity", "Acceleration", "Distance", "Time"],
      answer: 1,
    },
    {
      q: "An exothermic reaction releases?",
      options: ["Light only", "Heat", "Electrons", "Mass"],
      answer: 1,
    },
    { q: "Current is measured in?", options: ["Volts", "Amperes", "Ohms", "Watts"], answer: 1 },
    {
      q: "The pH of an acid is?",
      options: ["Above 7", "Below 7", "Exactly 7", "Zero always"],
      answer: 1,
    },
    {
      q: "Energy cannot be created or destroyed \u2014 this is conservation of?",
      options: ["Mass", "Energy", "Charge", "Momentum"],
      answer: 1,
    },
  ],
  ib_math: [
    { q: "If f(x) = 2x + 3, f(4) = ?", options: ["9", "10", "11", "12"], answer: 2 },
    {
      q: "Solve: x\u00b2 - 9 = 0",
      options: ["x = 3 only", "x = \u00b13", "x = 9", "x = -9"],
      answer: 1,
    },
    {
      q: "The probability of two independent events both occurring is their?",
      options: ["Sum", "Product", "Difference", "Average"],
      answer: 1,
    },
    { q: "The gradient of y = 5x - 7 is?", options: ["-7", "5", "7", "0"], answer: 1 },
    { q: "log\u2081\u2080(1000) = ?", options: ["2", "3", "10", "100"], answer: 1 },
    {
      q: "A function maps each input to how many outputs?",
      options: ["Exactly one", "Two", "Any number", "Zero"],
      answer: 0,
    },
  ],
  ib_history: [
    {
      q: "A primary source is one created?",
      options: [
        "By historians later",
        "At the time of the event",
        "For textbooks",
        "By governments only",
      ],
      answer: 1,
    },
    { q: "World War I began in?", options: ["1912", "1914", "1918", "1939"], answer: 1 },
    {
      q: "The Cold War was primarily between the USA and?",
      options: ["Germany", "The Soviet Union", "Japan", "China"],
      answer: 1,
    },
    {
      q: "Appeasement in the 1930s aimed to avoid war by?",
      options: [
        "Building alliances",
        "Conceding to demands",
        "Blockades",
        "Disarmament treaties only",
      ],
      answer: 1,
    },
    {
      q: "Historians weigh a source's origin, purpose, and?",
      options: ["Length", "Content & limitations", "Language", "Age of author"],
      answer: 1,
    },
    {
      q: "The Treaty of Versailles ended?",
      options: ["WWII", "WWI", "The Cold War", "The Napoleonic Wars"],
      answer: 1,
    },
  ],
  ib_cs: [
    {
      q: "An algorithm is a?",
      options: ["Programming language", "Step-by-step procedure", "Type of computer", "Data file"],
      answer: 1,
    },
    {
      q: "Binary search requires the data to be?",
      options: ["Random", "Sorted", "Numeric only", "Small"],
      answer: 1,
    },
    {
      q: "A loop that never ends is called?",
      options: ["A recursion", "An infinite loop", "A branch", "A stack"],
      answer: 1,
    },
    {
      q: "Which structure is LIFO (last in, first out)?",
      options: ["Queue", "Stack", "Array", "Graph"],
      answer: 1,
    },
    {
      q: "A variable stores?",
      options: ["Hardware", "A value", "The compiler", "The screen"],
      answer: 1,
    },
    {
      q: "Big-O notation describes an algorithm's?",
      options: ["Author", "Growth of cost with input size", "Language", "Bug count"],
      answer: 1,
    },
  ],
  ib_lang: [
    {
      q: "A metaphor compares two things without using?",
      options: ["Verbs", "'Like' or 'as'", "Nouns", "Punctuation"],
      answer: 1,
    },
    {
      q: "The narrator's attitude toward the subject is the?",
      options: ["Plot", "Tone", "Setting", "Theme"],
      answer: 1,
    },
    {
      q: "An unreliable narrator is one whose account?",
      options: ["Rhymes", "Cannot be fully trusted", "Is in third person", "Is historical"],
      answer: 1,
    },
    {
      q: "Juxtaposition places two elements together to?",
      options: ["Save space", "Highlight contrast", "End a scene", "Add rhyme"],
      answer: 1,
    },
    {
      q: "The central message of a literary work is its?",
      options: ["Genre", "Theme", "Climax", "Diction"],
      answer: 1,
    },
    {
      q: "Persuasive texts primarily aim to?",
      options: ["Entertain", "Convince the audience", "Rhyme", "Describe weather"],
      answer: 1,
    },
  ],
  ib_society: [
    {
      q: "In psychology, a variable manipulated by researchers is the?",
      options: ["Dependent", "Independent", "Control", "Random"],
      answer: 1,
    },
    {
      q: "Globalization increases the movement of goods, people and?",
      options: ["Weather", "Ideas & capital", "Continents", "Time zones"],
      answer: 1,
    },
    {
      q: "A market with a single seller is a?",
      options: ["Duopoly", "Monopoly", "Oligopoly", "Commons"],
      answer: 1,
    },
    {
      q: "Sovereignty means a state's authority to?",
      options: ["Trade freely", "Govern itself", "Print maps", "Join alliances"],
      answer: 1,
    },
    {
      q: "Push factors in migration include?",
      options: [
        "Better wages abroad",
        "Conflict or hardship at home",
        "Family reunification",
        "Tourism",
      ],
      answer: 1,
    },
    {
      q: "Utilitarian ethics judges actions by their?",
      options: ["Intentions", "Consequences for wellbeing", "Legality", "Tradition"],
      answer: 1,
    },
  ],
  ib_arts: [
    {
      q: "The arrangement of visual elements in art is called?",
      options: ["Palette", "Composition", "Medium", "Gallery"],
      answer: 1,
    },
    {
      q: "In music, tempo refers to?",
      options: ["Volume", "Speed", "Pitch", "Harmony"],
      answer: 1,
    },
    {
      q: "In theatre, blocking refers to?",
      options: ["Lighting cues", "Actors' movement on stage", "Ticket sales", "Costume design"],
      answer: 1,
    },
    {
      q: "A film shot from high above the subject is a?",
      options: ["Close-up", "Bird's-eye/high-angle shot", "Dolly zoom", "Cutaway"],
      answer: 1,
    },
    {
      q: "Complementary colors sit where on the color wheel?",
      options: ["Adjacent", "Opposite", "Center", "Random"],
      answer: 1,
    },
    {
      q: "A motif is a(n)?",
      options: ["One-off effect", "Recurring element or idea", "Type of brush", "Stage exit"],
      answer: 1,
    },
  ],
  leadership: [
    {
      q: "A good leader delegates in order to?",
      options: ["Avoid work", "Empower the team and scale output", "Take credit", "Hide mistakes"],
      answer: 1,
    },
    {
      q: "When a team disagrees, an effective chair should?",
      options: [
        "Pick the loudest voice",
        "Facilitate discussion toward consensus",
        "Cancel the vote",
        "Ignore the issue",
      ],
      answer: 1,
    },
    {
      q: "A campaign platform should primarily communicate?",
      options: ["Rivals' flaws", "Clear, achievable priorities", "Jokes", "Nothing specific"],
      answer: 1,
    },
    {
      q: "Accountability in a leader means?",
      options: ["Blaming others", "Owning outcomes", "Avoiding decisions", "Staying silent"],
      answer: 1,
    },
    {
      q: "The best way to build a coalition is to?",
      options: [
        "Threaten opponents",
        "Find shared interests",
        "Promise everything",
        "Work alone",
      ],
      answer: 1,
    },
    {
      q: "Constructive feedback should be?",
      options: ["Vague", "Specific and actionable", "Public shaming", "Withheld"],
      answer: 1,
    },
  ],
  athletics: [
    {
      q: "The best response to a tough loss is to?",
      options: ["Quit", "Review film and adjust", "Blame teammates", "Skip practice"],
      answer: 1,
    },
    {
      q: "Overtraining without rest most often leads to?",
      options: ["Faster gains", "Injury and burnout", "Better sleep", "Higher IQ"],
      answer: 1,
    },
    {
      q: "In a close championship, a smart team manages the clock by?",
      options: [
        "Rushing every play",
        "Controlling possession late",
        "Fouling randomly",
        "Ignoring the score",
      ],
      answer: 1,
    },
    {
      q: "Proper hydration during competition helps prevent?",
      options: ["Cramps and fatigue", "Winning", "Teamwork", "Strategy"],
      answer: 0,
    },
    {
      q: "A captain leads best by?",
      options: ["Yelling only", "Example and communication", "Sitting out", "Hogging the ball"],
      answer: 1,
    },
    {
      q: "Warming up before a game primarily?",
      options: ["Wastes energy", "Reduces injury risk", "Lowers morale", "Slows you down"],
      answer: 1,
    },
  ],
  interview: [
    {
      q: "When asked 'Why this school?', the strongest answer is?",
      options: [
        "It's famous",
        "Specific programs that fit my goals",
        "My friends go here",
        "It's nearby",
      ],
      answer: 1,
    },
    {
      q: "Describing a weakness in an interview works best when you?",
      options: [
        "Deny having any",
        "Show self-awareness and how you improve",
        "Blame others",
        "Give a fake strength",
      ],
      answer: 1,
    },
    {
      q: "Good interview body language includes?",
      options: ["Avoiding eye contact", "Confident posture and eye contact", "Slouching", "Checking your phone"],
      answer: 1,
    },
    {
      q: "The best time to ask thoughtful questions is?",
      options: ["Never", "At the end, about the school", "Interrupting", "Only about money"],
      answer: 1,
    },
    {
      q: "To show fit, you should connect your?",
      options: [
        "Hobbies to gossip",
        "Values and goals to the school's mission",
        "Complaints to rivals",
        "Grades to luck",
      ],
      answer: 1,
    },
    {
      q: "A strong candidate demonstrates?",
      options: ["Arrogance", "Genuine curiosity and preparation", "Indifference", "Memorized lies"],
      answer: 1,
    },
  ],
  debate: [
    {
      q: "A rebuttal should primarily?",
      options: [
        "Repeat your case",
        "Directly address the opponent's argument",
        "Change the topic",
        "Attack the person",
      ],
      answer: 1,
    },
    {
      q: "An 'ad hominem' fallacy attacks the?",
      options: ["Argument", "Person instead of the argument", "Evidence", "Topic"],
      answer: 1,
    },
    {
      q: "A strong claim is supported by?",
      options: ["Volume", "Evidence and reasoning", "Repetition", "Emotion alone"],
      answer: 1,
    },
    {
      q: "If it rains, the match is cancelled. It was NOT cancelled, so?",
      options: ["It rained", "It did not rain", "Unknown", "It snowed"],
      answer: 1,
    },
    {
      q: "The burden of proof falls on the side that?",
      options: ["Speaks last", "Makes the claim", "Is louder", "Has more members"],
      answer: 1,
    },
    {
      q: "A slippery slope fallacy assumes one step?",
      options: [
        "Is well-reasoned",
        "Inevitably leads to extreme outcomes",
        "Has evidence",
        "Is neutral",
      ],
      answer: 1,
    },
  ],
  robotics: [
    {
      q: "A sensor on a robot is used to?",
      options: ["Store code", "Gather information about the environment", "Power the motor", "Paint parts"],
      answer: 1,
    },
    {
      q: "A feedback loop adjusts output based on?",
      options: ["Random guesses", "Measured results", "Color", "Weight only"],
      answer: 1,
    },
    {
      q: "Torque in a motor relates to its?",
      options: ["Color", "Rotational force", "Price", "Name"],
      answer: 1,
    },
    {
      q: "Which is a step in the engineering design process?",
      options: ["Ignore the problem", "Prototype and test", "Skip testing", "Guess only"],
      answer: 1,
    },
    {
      q: "A microcontroller primarily?",
      options: ["Cools the robot", "Runs the control program", "Adds weight", "Displays ads"],
      answer: 1,
    },
    {
      q: "To reduce a robot's error, engineers should?",
      options: ["Add random parts", "Iterate and calibrate", "Never test", "Increase size"],
      answer: 1,
    },
  ],
  finance: [
    {
      q: "Diversification reduces which type of risk?",
      options: ["Market", "Company-specific (unsystematic)", "Inflation", "Interest rate"],
      answer: 1,
    },
    {
      q: "A stock's P/E ratio compares price to?",
      options: ["Dividends", "Earnings", "Debt", "Revenue only"],
      answer: 1,
    },
    {
      q: "Compound interest grows faster because it earns on?",
      options: ["Principal only", "Principal plus prior interest", "Taxes", "Fees"],
      answer: 1,
    },
    {
      q: "A bull market is one that is generally?",
      options: ["Falling", "Rising", "Flat", "Closed"],
      answer: 1,
    },
    {
      q: "When pitching a stock, the strongest case cites?",
      options: [
        "A hunch",
        "Fundamentals and a valuation thesis",
        "Popularity",
        "The logo",
      ],
      answer: 1,
    },
    {
      q: "Higher expected return usually comes with higher?",
      options: ["Certainty", "Risk", "Liquidity", "Taxes"],
      answer: 1,
    },
  ],
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a randomized quiz of `count` questions from a category. */
export function buildQuiz(category: QuizCategory, count: number): QuizQuestion[] {
  return shuffle(BANK[category]).slice(0, Math.min(count, BANK[category].length));
}

/** The assignment category appropriate for the player's current stage. */
export function assignmentCategory(c: Character): QuizCategory {
  if (!inSchool(c)) return "high";
  if (c.education === "college") return "college";
  if (c.education === "high") return "high";
  if (c.education === "middle") return "middle";
  return "elementary";
}
