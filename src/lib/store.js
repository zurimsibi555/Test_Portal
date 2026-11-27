import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Initial Seed Data
const initialData = {
  tests: [
    {
      id: "demo-java-test",
      title: "Java Foundation Test",
      description: "Comprehensive evaluation covering Core Java, Input/Output, Conditionals, Loops, Functions, and OOPs concepts.",
      durationMinutes: 45,
      scheduledStartTime: "2026-11-27T00:00:00+05:30",
      entryWindowMinutes: 10080,
      alwaysOpen: true,
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ],
  mcqQuestions: [
    {
      id: "mcq-1",
      testId: "demo-java-test",
      question: "What will be the output of the following Java statement?\nSystem.out.println(10 + 20 + \"Java\" + 10 + 20);",
      options: [
        "60Java",
        "30Java1020",
        "30Java30",
        "1020Java1020"
      ],
      correctOption: 1,
      points: 2.5
    },
    {
      id: "mcq-2",
      testId: "demo-java-test",
      question: "What is the output of the following conditional statement snippet?\nint a = 5, b = 10;\nif (a > 0 || ++b > 10) {\n    System.out.println(a + \" \" + b);\n}",
      options: [
        "5 11",
        "5 10",
        "6 11",
        "Compilation Error"
      ],
      correctOption: 1,
      points: 2.5
    },
    {
      id: "mcq-3",
      testId: "demo-java-test",
      question: "What will be printed by the following loop with jump statements?\nint sum = 0;\nfor (int i = 1; i <= 5; i++) {\n    if (i == 3) continue;\n    if (i == 5) break;\n    sum += i;\n}\nSystem.out.println(sum);",
      options: [
        "15",
        "7",
        "3",
        "10"
      ],
      correctOption: 1,
      points: 2.5
    },
    {
      id: "mcq-4",
      testId: "demo-java-test",
      question: "What will be the output of the following method overloading code?\nclass Test {\n    static void printVal(int x) { System.out.println(\"int: \" + x); }\n    static void printVal(double x) { System.out.println(\"double: \" + x); }\n    public static void main(String[] args) {\n        printVal('A');\n    }\n}",
      options: [
        "int: 65",
        "double: 65.0",
        "char: A",
        "Compilation Error"
      ],
      correctOption: 0,
      points: 2.5
    },
    {
      id: "mcq-5",
      testId: "demo-java-test",
      question: "What will be printed when a Child object is created?\nclass Parent {\n    Parent() { System.out.print(\"Base \"); }\n}\nclass Child extends Parent {\n    Child() { System.out.print(\"Derived \"); }\n}\npublic class Main {\n    public static void main(String[] args) {\n        new Child();\n    }\n}",
      options: [
        "Derived Base ",
        "Base Derived ",
        "Derived ",
        "Base "
      ],
      correctOption: 1,
      points: 2.5
    },
    {
      id: "mcq-6",
      testId: "demo-java-test",
      question: "Which OOPs concept binds data members and member functions into a single unit and hides direct access using private access modifiers?",
      options: [
        "Polymorphism",
        "Encapsulation",
        "Inheritance",
        "Abstraction"
      ],
      correctOption: 1,
      points: 2.5
    },
    {
      id: "mcq-7",
      testId: "demo-java-test",
      question: "What is the size of a `char` data type in Java?",
      options: [
        "1 byte",
        "2 bytes",
        "4 bytes",
        "8 bytes"
      ],
      correctOption: 1,
      points: 2.5
    },
    {
      id: "mcq-8",
      testId: "demo-java-test",
      question: "Which keyword is used to prevent a class from being inherited in Java?",
      options: [
        "static",
        "abstract",
        "final",
        "const"
      ],
      correctOption: 2,
      points: 2.5
    },
    {
      id: "mcq-9",
      testId: "demo-java-test",
      question: "What will be the output of:\nString s1 = new String(\"Java\");\nString s2 = new String(\"Java\");\nSystem.out.println(s1 == s2);",
      options: [
        "true",
        "false",
        "Compilation Error",
        "Runtime Exception"
      ],
      correctOption: 1,
      points: 2.5
    },
    {
      id: "mcq-10",
      testId: "demo-java-test",
      question: "Which of the following is NOT a valid access modifier in Java?",
      options: [
        "public",
        "protected",
        "private",
        "friend"
      ],
      correctOption: 3,
      points: 2.5
    },
    {
      id: "mcq-11",
      testId: "demo-java-test",
      question: "What is the default value of an uninitialized `boolean` instance variable in a Java class?",
      options: [
        "true",
        "false",
        "null",
        "0"
      ],
      correctOption: 1,
      points: 2.5
    },
    {
      id: "mcq-12",
      testId: "demo-java-test",
      question: "Which collection class allows duplicate elements and maintains insertion order?",
      options: [
        "HashSet",
        "TreeSet",
        "ArrayList",
        "HashMap"
      ],
      correctOption: 2,
      points: 2.5
    },
    {
      id: "mcq-13",
      testId: "demo-java-test",
      question: "What happens if an exception is thrown inside a `try` block and there is a `finally` block?",
      options: [
        "The finally block is skipped",
        "The finally block executes only if the exception is caught",
        "The finally block always executes (unless JVM exits)",
        "Compilation fails"
      ],
      correctOption: 2,
      points: 2.5
    },
    {
      id: "mcq-14",
      testId: "demo-java-test",
      question: "Which method is used to start a new thread's execution in Java?",
      options: [
        "run()",
        "start()",
        "execute()",
        "begin()"
      ],
      correctOption: 1,
      points: 2.5
    },
    {
      id: "mcq-15",
      testId: "demo-java-test",
      question: "What is the output of:\nint x = 10;\nSystem.out.println(x++ + ++x);",
      options: [
        "20",
        "21",
        "22",
        "23"
      ],
      correctOption: 2,
      points: 2.5
    },
    {
      id: "mcq-16",
      testId: "demo-java-test",
      question: "Which statement is true about an `interface` in Java?",
      options: [
        "An interface can be instantiated directly using new",
        "A class can implement multiple interfaces",
        "An interface can have constructors",
        "All methods in an interface must be private"
      ],
      correctOption: 1,
      points: 2.5
    },
    {
      id: "mcq-17",
      testId: "demo-java-test",
      question: "What is the return type of the `hashCode()` method in `java.lang.Object`?",
      options: [
        "long",
        "String",
        "int",
        "void"
      ],
      correctOption: 2,
      points: 2.5
    },
    {
      id: "mcq-18",
      testId: "demo-java-test",
      question: "Which keyword is used inside a subclass constructor to invoke the parent class constructor?",
      options: [
        "this()",
        "parent()",
        "super()",
        "base()"
      ],
      correctOption: 2,
      points: 2.5
    },
    {
      id: "mcq-19",
      testId: "demo-java-test",
      question: "What will be printed by:\nint[] arr = {2, 4, 6, 8};\nSystem.out.println(arr.length);",
      options: [
        "3",
        "4",
        "8",
        "Compilation Error"
      ],
      correctOption: 1,
      points: 2.5
    },
    {
      id: "mcq-20",
      testId: "demo-java-test",
      question: "Which package is automatically imported into every Java source file?",
      options: [
        "java.util",
        "java.io",
        "java.lang",
        "java.net"
      ],
      correctOption: 2,
      points: 2.5
    }
  ],
  codingQuestions: [
    {
      id: "code-1",
      testId: "demo-java-test",
      title: "User Greeting Program (Input / Output)",
      description: "Write a Java program that reads a user's name from standard input and prints a personalized greeting message.\n\nInput Format:\nA single line containing the name of the user.\n\nOutput Format:\nPrint 'Welcome ' followed by the name.",
      constraints: "1 <= length of name <= 50\nName contains letters and spaces only.",
      sampleInput: "Rahul",
      sampleOutput: "Welcome Rahul",
      starterCode: "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read name using sc and print: Welcome <name>\n        \n    }\n}",
      testCases: [
        {
          input: "Rahul",
          output: "Welcome Rahul",
          isHidden: false
        },
        {
          input: "Amit",
          output: "Welcome Amit",
          isHidden: false
        },
        {
          input: "John Doe",
          output: "Welcome John Doe",
          isHidden: true
        },
        {
          input: "Priya Sharma",
          output: "Welcome Priya Sharma",
          isHidden: true
        }
      ],
      points: 10
    },
    {
      id: "code-2",
      testId: "demo-java-test",
      title: "Student Class with Methods (OOPs Concepts)",
      description: "Write an Object-Oriented Java program demonstrating classes and encapsulation.\n\nCreate a class named 'Student' with:\n1. Private fields: String name, int rollNo, int marks\n2. Constructor: Student(String name, int rollNo, int marks)\n3. Method: void displayInfo() that prints:\n   'Roll No: <rollNo> | Name: <name> | Marks: <marks>'\n4. Method: String getResult() that returns 'Pass' if marks >= 40, else 'Fail'\n\nIn the main method of class Main:\n- Read name, rollNo, and marks from input.\n- Create a Student object.\n- Call displayInfo() and print the result on the next line as 'Result: <Pass/Fail>'.\n\nInput Format:\nLine 1: Student Name\nLine 2: Roll Number (integer)\nLine 3: Marks (integer, 0 to 100)\n\nOutput Format:\nLine 1: Roll No: <rollNo> | Name: <name> | Marks: <marks>\nLine 2: Result: <Pass/Fail>",
      constraints: "0 <= marks <= 100\n1 <= rollNo <= 10000",
      sampleInput: "Aryan\n101\n85",
      sampleOutput: "Roll No: 101 | Name: Aryan | Marks: 85\nResult: Pass",
      starterCode: "import java.util.Scanner;\n\nclass Student {\n    // Define attributes, constructor, and methods here\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read inputs, instantiate Student, and call methods\n        \n    }\n}",
      testCases: [
        {
          input: "Aryan\n101\n85",
          output: "Roll No: 101 | Name: Aryan | Marks: 85\nResult: Pass",
          isHidden: false
        },
        {
          input: "Riya\n102\n35",
          output: "Roll No: 102 | Name: Riya | Marks: 35\nResult: Fail",
          isHidden: false
        },
        {
          input: "Kavita\n103\n98",
          output: "Roll No: 103 | Name: Kavita | Marks: 98\nResult: Pass",
          isHidden: true
        },
        {
          input: "Suresh\n104\n40",
          output: "Roll No: 104 | Name: Suresh | Marks: 40\nResult: Pass",
          isHidden: true
        }
      ],
      points: 10
    },
    {
      id: "code-3",
      testId: "demo-java-test",
      title: "Print 1 to 50 Except 45 (Loops & Jumps)",
      description: "Write a Java program using a loop to print all numbers from 1 to 50 on a single line separated by spaces, but DO NOT print the number 45.\n\nUse a loop (for or while) along with the 'continue' keyword to skip 45.\n\nInput Format:\nNo input required.\n\nOutput Format:\nNumbers from 1 to 50 separated by single spaces, skipping 45:\n1 2 3 ... 44 46 ... 50",
      constraints: "No input is given.",
      sampleInput: "",
      sampleOutput: "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 46 47 48 49 50",
      starterCode: "public class Main {\n    public static void main(String[] args) {\n        // Use a loop from 1 to 50 and skip 45\n        \n    }\n}",
      testCases: [
        {
          input: "",
          output: "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 46 47 48 49 50",
          isHidden: false
        }
      ],
      points: 10
    },
    {
      id: "code-4",
      testId: "demo-java-test",
      title: "Voting Eligibility Checker (Conditional Statements)",
      description: "Write a Java program to check whether a person is eligible to vote based on their age.\n\nRules:\n- If age >= 18: Print 'Eligible to Vote'\n- If 0 <= age < 18: Print 'Not Eligible to Vote' on line 1, and 'Years left: <X>' on line 2 (where X is 18 - age)\n- If age < 0: Print 'Invalid Age'\n\nInput Format:\nA single integer representing age.\n\nOutput Format:\nLine 1: 'Eligible to Vote', 'Not Eligible to Vote', or 'Invalid Age'\nLine 2 (only if 0 <= age < 18): 'Years left: <X>'",
      constraints: "-100 <= age <= 150",
      sampleInput: "21",
      sampleOutput: "Eligible to Vote",
      starterCode: "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write conditional logic here\n        \n    }\n}",
      testCases: [
        {
          input: "21",
          output: "Eligible to Vote",
          isHidden: false
        },
        {
          input: "15",
          output: "Not Eligible to Vote\nYears left: 3",
          isHidden: false
        },
        {
          input: "18",
          output: "Eligible to Vote",
          isHidden: true
        },
        {
          input: "17",
          output: "Not Eligible to Vote\nYears left: 1",
          isHidden: true
        },
        {
          input: "-5",
          output: "Invalid Age",
          isHidden: true
        }
      ],
      points: 10
    },
    {
      id: "code-5",
      testId: "demo-java-test",
      title: "Calculate Area of Rectangle (Functions / Methods)",
      description: "Write a Java program that defines and calls a method to compute the area of a rectangle.\n\nMethod Signature:\nstatic int calculateArea(int length, int breadth)\n\nThe method should take two integer parameters and return their product (length * breadth).\nIn the main method, take length and breadth as input from the user, call calculateArea(), and print the result.\n\nInput Format:\nTwo space-separated integers representing length and breadth.\n\nOutput Format:\nPrint 'Area = <calculated_area>'",
      constraints: "1 <= length, breadth <= 10^4",
      sampleInput: "10 5",
      sampleOutput: "Area = 50",
      starterCode: "import java.util.Scanner;\n\npublic class Main {\n    // Define static int calculateArea(int length, int breadth) here\n    \n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int length = sc.nextInt();\n        int breadth = sc.nextInt();\n        \n        // Call calculateArea and print result\n    }\n}",
      testCases: [
        {
          input: "10 5",
          output: "Area = 50",
          isHidden: false
        },
        {
          input: "7 8",
          output: "Area = 56",
          isHidden: false
        },
        {
          input: "15 20",
          output: "Area = 300",
          isHidden: true
        },
        {
          input: "1 1",
          output: "Area = 1",
          isHidden: true
        },
        {
          input: "120 45",
          output: "Area = 5400",
          isHidden: true
        }
      ],
      points: 10
    }
  ],
  sessions: {},
  submissions: []
};

const globalForStore = globalThis;

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

export function getStore() {
  ensureDataFile();
  try {
    const stat = fs.statSync(DATA_FILE);
    const cached = globalForStore.__portalStoreCache;
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.data) {
      return cached.data;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    globalForStore.__portalStoreCache = { mtimeMs: stat.mtimeMs, data: parsed };
    return parsed;
  } catch (error) {
    console.error('Error reading store file, resetting to initial data:', error);
    return initialData;
  }
}

export function saveStore(data) {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    const stat = fs.statSync(DATA_FILE);
    globalForStore.__portalStoreCache = { mtimeMs: stat.mtimeMs, data };
    return true;
  } catch (error) {
    console.error('Error writing store file:', error);
    return false;
  }
}
