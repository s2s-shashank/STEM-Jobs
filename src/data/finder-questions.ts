/**
 * The questions for the Career Finder popup.
 *
 * This file is imported both by the server (to fill in the fun facts with
 * real numbers) and by the browser (to render the slides and to score the
 * answers), so it must not import any data-heavy module.
 */

/**
 * Every interest tag gets a phrase we can show the student, so the results
 * screen can explain *why* a job matched instead of just listing jobs.
 */
export const TAG_PHRASES: Record<string, string> = {
  code: 'coding and computers',
  numbers: 'numbers and patterns',
  lab: 'labs and experiments',
  people: 'helping people',
  build: 'building things from scratch',
  hands: 'working with your hands',
  nature: 'the planet and living things',
  space: 'space and flight',
  art: 'design and how things look',
  energy: 'big machines and power',
  animals: 'animals',
  safety: 'keeping people safe',
  food: 'food and how it is made',
  water: 'water and the environment',
  manage: 'leading a team',
};

export interface FinderOption {
  id: string;
  emoji: string;
  label: string;
  /** Interest tags this choice points at. */
  tags: string[];
  /**
   * A fact to show after the student picks this option. `{title}`,
   * `{jobs}`, `{wage}`, `{hourly}` and `{growth}` are filled in with real
   * numbers from the government data on the server.
   */
  fun?: { soc: string; text: string };
}

export interface FinderQuestion {
  id: string;
  /** Big question at the top of the slide. */
  title: string;
  /** Small line under the question. */
  kicker?: string;
  /** Allow more than one answer. */
  multi?: boolean;
  options: FinderOption[];
}

/**
 * The questions. They are written like an adventure, not like a form:
 * every option is a scenario a student can picture themselves in.
 */
export const QUESTIONS: FinderQuestion[] = [
  {
    id: 'power',
    title: 'If you could have ONE superpower for your workday, which would you grab?',
    kicker: 'Every job here uses a superpower like this. Pick your favourite.',
    options: [
      {
        id: 'animals',
        emoji: '🐾',
        label: 'Talk to any animal',
        tags: ['animals', 'nature'],
        fun: {
          soc: '29-2056',
          text: 'Veterinarians and veterinary scientists help sick animals and wild animals every single day. In New Jersey, veterinary technicians earn around {wage}.',
        },
      },
      {
        id: 'energy',
        emoji: '⚡',
        label: 'See electricity and heat',
        tags: ['energy', 'lab', 'hands'],
        fun: {
          soc: '51-8021',
          text: 'Stationary engineers run the boilers and power plants that keep buildings warm and the lights on. They earn around {wage}.',
        },
      },
      {
        id: 'hands',
        emoji: '🔧',
        label: 'Repair anything with one touch',
        tags: ['hands', 'build'],
        fun: {
          soc: '49-9041',
          text: 'Industrial machinery mechanics fix the machines that make other machines. About {jobs} people do this job in New Jersey, earning around {wage}.',
        },
      },
      {
        id: 'code',
        emoji: '💻',
        label: 'Read the code hidden inside everything',
        tags: ['code', 'numbers'],
        fun: {
          soc: '15-1252',
          text: 'Software developers in New Jersey earn around {wage} a year - and their jobs are growing {growth}.',
        },
      },
      {
        id: 'people',
        emoji: '🩺',
        label: 'Heal people with a wave of my hand',
        tags: ['people'],
        fun: {
          soc: '29-1141',
          text: 'Registered nurses are the biggest STEM job in New Jersey: about {jobs} people, with a typical salary of {wage}.',
        },
      },
    ],
  },
  {
    id: 'saturday',
    title: 'It is Saturday. You have a toolbox, a laptop and six hours. What is the plan?',
    kicker: 'No wrong answers - pick the one that sounds most fun.',
    options: [
      {
        id: 'robot',
        emoji: '🤖',
        label: 'Build a robot that does my chores',
        tags: ['code', 'build', 'lab'],
        fun: {
          soc: '15-1252',
          text: 'Robotics engineers and software developers get paid to build exactly this kind of thing. The middle salary is {wage}.',
        },
      },
      {
        id: 'rocket',
        emoji: '🚀',
        label: 'Launch a homemade rocket (sorry, neighbours)',
        tags: ['space', 'build'],
        fun: {
          soc: '17-2141',
          text: 'Aerospace engineers in New Jersey earn around {wage} - they design the parts that go up and the ones that come back down.',
        },
      },
      {
        id: 'weather',
        emoji: '🌦️',
        label: 'Set up a weather station in the backyard',
        tags: ['nature', 'numbers', 'lab'],
        fun: {
          soc: '19-2021',
          text: 'Atmospheric and space scientists study weather, climate and space. They earn about {wage} on average.',
        },
      },
      {
        id: 'prosthetic',
        emoji: '🦾',
        label: 'Make a prosthetic arm for a neighbour',
        tags: ['people', 'build', 'hands'],
        fun: {
          soc: '17-2031',
          text: 'Bioengineers design medical equipment and artificial body parts. The average salary is {wage}.',
        },
      },
      {
        id: 'website',
        emoji: '🎨',
        label: 'Design a website for my sports team',
        tags: ['code', 'art'],
        fun: {
          soc: '15-1255',
          text: 'Web developers and digital designers build the sites and apps everybody uses. They earn about {wage}.',
        },
      },
    ],
  },
  {
    id: 'day',
    title: 'You have one whole free day. Where do you go?',
    kicker: 'Different place, different kind of day.',
    options: [
      {
        id: 'hospital',
        emoji: '🏥',
        label: 'A busy hospital ward',
        tags: ['people'],
        fun: {
          soc: '29-1171',
          text: 'Nurse practitioners can diagnose and treat patients on their own. Their jobs are growing {growth} - one of the fastest-growing health careers.',
        },
      },
      {
        id: 'hangar',
        emoji: '🛩️',
        label: 'A hangar where they test rocket engines',
        tags: ['space', 'build', 'lab'],
        fun: {
          soc: '17-2112',
          text: 'Industrial engineers make factories run faster and safer. They earn around {wage}.',
        },
      },
      {
        id: 'factory',
        emoji: '🏭',
        label: 'A factory floor with 400 machines humming',
        tags: ['hands', 'build', 'energy'],
        fun: {
          soc: '49-9041',
          text: 'Machinists and mechanics are in demand: about {jobs} industrial machinery mechanics work in New Jersey.',
        },
      },
      {
        id: 'forest',
        emoji: '🌲',
        label: 'A field station deep in the woods',
        tags: ['nature', 'lab', 'animals'],
        fun: {
          soc: '19-1042',
          text: 'Environmental scientists protect the air, water and land we depend on. Average pay is {wage}.',
        },
      },
      {
        id: 'datacenter',
        emoji: '📈',
        label: 'A data centre with screens everywhere',
        tags: ['numbers', 'code'],
        fun: {
          soc: '15-2051',
          text: 'Data scientists find patterns in huge amounts of information. Their jobs are growing {growth}.',
        },
      },
      {
        id: 'site',
        emoji: '🏗️',
        label: 'A skyscraper site with a crane overhead',
        tags: ['build', 'art', 'hands'],
        fun: {
          soc: '17-2051',
          text: 'Civil engineers design the bridges, roads and towers. The middle salary is {wage}.',
        },
      },
    ],
  },
  {
    id: 'never-bored',
    title: 'Tick everything you would never get bored of',
    kicker: 'Choose as many as you like - this one is multi-select.',
    multi: true,
    options: [
      {
        id: 'microscope',
        emoji: '🔬',
        label: 'Looking at tiny things through a microscope',
        tags: ['lab'],
        fun: {
          soc: '19-4021',
          text: 'Biological technicians support lab research. They earn around {wage}.',
        },
      },
      {
        id: 'puzzle',
        emoji: '🧮',
        label: 'Numbers that do not add up yet',
        tags: ['numbers'],
        fun: {
          soc: '15-2051',
          text: 'Statisticians and data scientists make sense of big numbers for a living, earning about {wage}.',
        },
      },
      {
        id: 'code-works',
        emoji: '🖥️',
        label: 'Code that finally runs',
        tags: ['code'],
        fun: {
          soc: '15-1252',
          text: 'A software developer in New Jersey earns around {wage} a year.',
        },
      },
      {
        id: 'fix',
        emoji: '🔩',
        label: 'Machines that need fixing',
        tags: ['hands'],
        fun: {
          soc: '49-9041',
          text: 'Machine repair is a steady trade: around {jobs} people work as industrial machinery mechanics in New Jersey.',
        },
      },
      {
        id: 'planet',
        emoji: '🌎',
        label: 'The planet changing',
        tags: ['nature'],
        fun: {
          soc: '19-2041',
          text: 'Environmental scientists watch the environment and report what they find. Average salary: {wage}.',
        },
      },
      {
        id: 'help',
        emoji: '🤝',
        label: 'People who need help',
        tags: ['people'],
        fun: {
          soc: '29-1141',
          text: 'Nurses are the biggest STEM job in New Jersey, with about {jobs} people on the job.',
        },
      },
      {
        id: 'design',
        emoji: '🎨',
        label: 'How it all looks and feels',
        tags: ['art', 'build'],
        fun: {
          soc: '17-2051',
          text: 'Drafters and designers turn ideas into plans. The middle salary is {wage}.',
        },
      },
      {
        id: 'scratch',
        emoji: '🛠️',
        label: 'Building something out of nothing',
        tags: ['build'],
        fun: {
          soc: '17-2141',
          text: 'Mechanical engineers design everything from engines to prosthetics. They earn about {wage}.',
        },
      },
    ],
  },
  {
    id: 'robot-job',
    title: 'Your robot friend needs a job. Where does it go to work?',
    kicker: 'Even robots need a career plan.',
    options: [
      {
        id: 'powerlines',
        emoji: '⚡',
        label: 'Fix the power lines and elevators',
        tags: ['energy', 'hands'],
        fun: {
          soc: '49-9051',
          text: 'Electrical power-line installers work at height on the wires that light up the whole state. Average pay: {wage}.',
        },
      },
      {
        id: 'bridges',
        emoji: '🌉',
        label: 'Check every bridge in the state',
        tags: ['build', 'numbers'],
        fun: {
          soc: '17-2051',
          text: 'Civil engineers and surveying technicians check bridges and roads. The middle salary is {wage}.',
        },
      },
      {
        id: 'surgery',
        emoji: '🏥',
        label: 'Help the surgical team',
        tags: ['people', 'lab'],
        fun: {
          soc: '29-2055',
          text: 'Surgical technologists set up the operating room and help the surgeons. They earn around {wage}.',
        },
      },
      {
        id: 'sort',
        emoji: '🗂️',
        label: 'Sort out the numbers for everybody',
        tags: ['numbers', 'code'],
        fun: {
          soc: '15-2051',
          text: 'Operations research analysts use maths to make teams work better. They earn about {wage}.',
        },
      },
      {
        id: 'water',
        emoji: '🌊',
        label: 'Clean up the water',
        tags: ['nature', 'water', 'hands'],
        fun: {
          soc: '51-8031',
          text: 'Water and wastewater treatment operators make sure clean water comes out of the taps. They earn around {wage}.',
        },
      },
    ],
  },
  {
    id: 'legend',
    title: 'Which legend would you want on your team?',
    kicker: 'Pick the scientist or engineer you would want to work beside.',
    options: [
      {
        id: 'curie',
        emoji: '🔬',
        label: 'Marie Curie',
        tags: ['lab'],
        fun: {
          soc: '19-2031',
          text: 'Chemists do the same kind of work Marie Curie did. In New Jersey they earn about {wage}.',
        },
      },
      {
        id: 'johnson',
        emoji: '🔢',
        label: 'Katherine Johnson',
        tags: ['numbers'],
        fun: {
          soc: '15-2051',
          text: 'Mathematicians and data scientists are modern-day Katherine Johnsons. Average pay: {wage}.',
        },
      },
      {
        id: 'hopper',
        emoji: '💻',
        label: 'Grace Hopper',
        tags: ['code'],
        fun: {
          soc: '15-1252',
          text: 'Grace Hopper would have been at home as a software developer. That job pays about {wage} in New Jersey.',
        },
      },
      {
        id: 'armstrong',
        emoji: '👨‍🚀',
        label: 'Neil Armstrong',
        tags: ['space', 'build'],
        fun: {
          soc: '17-2141',
          text: 'Aerospace and mechanical engineers build the machines for space travel. They earn around {wage}.',
        },
      },
      {
        id: 'goodall',
        emoji: '🐒',
        label: 'Jane Goodall',
        tags: ['animals', 'nature'],
        fun: {
          soc: '19-1042',
          text: 'Zoologists and environmental scientists study animals and their habitats. The middle salary is {wage}.',
        },
      },
      {
        id: 'franklin',
        emoji: '⚡',
        label: 'Benjamin Franklin',
        tags: ['energy', 'hands'],
        fun: {
          soc: '49-9051',
          text: 'Electrical power-line installers work high up on the wires that light up the state. They earn about {wage}.',
        },
      },
    ],
  },
  {
    id: 'workstyle',
    title: 'How do you like to work?',
    kicker: 'Be honest - this changes which jobs we suggest.',
    options: [
      {
        id: 'hands',
        emoji: '👐',
        label: 'With my hands, on real things',
        tags: ['hands', 'build'],
        fun: {
          soc: '51-4041',
          text: 'Machinists shape metal into parts that end up in every machine. The middle salary is {wage}.',
        },
      },
      {
        id: 'screen',
        emoji: '🖥️',
        label: 'Mostly on a screen',
        tags: ['code', 'numbers'],
        fun: {
          soc: '15-1211',
          text: 'Systems analysts design how an organisation uses computers. They earn around {wage}.',
        },
      },
      {
        id: 'labcoat',
        emoji: '🧪',
        label: 'In a lab coat, doing experiments',
        tags: ['lab'],
        fun: {
          soc: '19-2031',
          text: 'Chemists and biological technicians work in labs. Average salary: {wage}.',
        },
      },
      {
        id: 'outdoors',
        emoji: '🌤️',
        label: 'Outdoors, in the sun',
        tags: ['nature', 'hands'],
        fun: {
          soc: '19-2041',
          text: 'Environmental scientists and technicians get to work outside, sampling soil, air and water. They earn about {wage}.',
        },
      },
      {
        id: 'people',
        emoji: '🗣️',
        label: 'Talking to people all day',
        tags: ['people', 'manage'],
        fun: {
          soc: '29-1141',
          text: 'Nursing is one of the biggest STEM jobs in the country. The middle salary is {wage}.',
        },
      },
    ],
  },
  {
    id: 'state',
    title: 'Last one: where do you live?',
    kicker: 'We will show you what these jobs pay near home.',
    options: [
      { id: 'nj', emoji: '🏖️', label: 'New Jersey', tags: [] },
      { id: 'ny', emoji: '🏙️', label: 'New York', tags: [] },
      { id: 'pa', emoji: '🔔', label: 'Pennsylvania', tags: [] },
      {
        id: 'other',
        emoji: '🌎',
        label: 'Somewhere else - show me everything',
        tags: [],
      },
    ],
  },
];
