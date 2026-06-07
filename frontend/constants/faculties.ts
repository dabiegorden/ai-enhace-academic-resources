export interface Faculty {
  code: string;
  name: string;
  programs: string[];
}

export const FACULTIES: Faculty[] = [
  {
    code: "RSS",
    name: "Faculty of Religious and Social Sciences",
    programs: ["Religious Studies", "Journalism"],
  },
  {
    code: "EBA",
    name: "Faculty of Economics and Business Administration",
    programs: [
      "Business Administration in Accounting",
      "Business Administration in Management",
      "Business Administration in Economics",
      "Banking and Finance",
      "Human Resources Management",
      "Procurement and Supply Chain Management",
      "Diploma in Accounting",
      "Diploma in Human Resources Management",
    ],
  },
  {
    code: "CEMS",
    name: "Faculty of Computing, Engineering and Mathematical Sciences",
    programs: ["Computer Science", "Information Technology"],
  },
  {
    code: "EDU",
    name: "Faculty of Education",
    programs: [
      "Religious Studies",
      "Mathematics",
      "Accounting",
      "English",
      "Geography",
      "Computer Science",
    ],
  },
  {
    code: "PHAS",
    name: "School of Public Health and Allied Sciences",
    programs: [
      "Physiotherapy",
      "Public Health (Environmental Health)",
      "Public Health (Informatics)",
      "Public Health (Disease Control)",
      "Public Health (Health Promotion)",
    ],
  },
  {
    code: "SONAM",
    name: "School of Nursing and Midwifery",
    programs: ["Nursing", "Midwifery", "Public Health Nursing"],
  },
  {
    code: "SGS",
    name: "School of Graduate Studies",
    programs: [],
  },
  {
    code: "LAW",
    name: "Faculty of Law",
    programs: [],
  },
  {
    code: "MED",
    name: "Medical School",
    programs: [],
  },
];

export const FACULTY_NAMES: string[] = FACULTIES.map((faculty) => faculty.name);

export const FACULTY_PROGRAMS: Record<string, string[]> = FACULTIES.reduce(
  (acc, faculty) => {
    acc[faculty.name] = faculty.programs;
    return acc;
  },
  {} as Record<string, string[]>
);
