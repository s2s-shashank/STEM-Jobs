/**
 * The questions on the teacher worksheets.
 *
 * Both the web page and the print version use these, so a teacher never
 * sees two different versions of the same worksheet.
 */
export interface WorksheetQuestion {
  /** The question, in words. */
  q: string;
  /** How many blank lines to print under it. */
  space: number;
}

export const WORKSHEET_QUESTIONS: WorksheetQuestion[] = [
  {
    q: 'Pick a STEM job you have never heard of. Look it up in the career list. What does the person actually do all day?',
    space: 4,
  },
  {
    q: 'Find the median pay for that job in your state. Convert it to an hourly rate. Would that pay cover rent, a car payment and some fun money?',
    space: 4,
  },
  {
    q: 'Is that job growing or shrinking? What would have to happen for the answer to change?',
    space: 3,
  },
  {
    q: 'Find one real opening in that field on your state page. What did the employer ask for? Which of those things can you start this year?',
    space: 4,
  },
  {
    q: 'Compare two states on the same job. Why might the pay be different? (Think about cost of living, and who is hiring.)',
    space: 3,
  },
];
