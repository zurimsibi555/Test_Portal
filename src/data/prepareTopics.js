export const PREPARE_TOPICS = [
  {
    id: 'java-basics-io',
    badge: 'Article 1 • Java Basics',
    title: 'JDK, JRE, JVM & Input / Output',
    subtitle: 'Understand how Java compiles & runs your code, and how to read input and print formatted output.',
    animationType: 'jvm-pipeline',
    definition: {
      summary:
        'Java works in three nested layers: JVM (the engine that runs bytecode), JRE (JVM + standard libraries), and JDK (JRE + developer tools like javac compiler). Every Java program is first compiled into platform-independent bytecode (.class) and then executed by the JVM.',
      analogy:
        'Think of JDK as a complete kitchen (stove + utensils + ingredients), JRE as the dining setup needed to serve the dish, and JVM as the microwave/engine that heats and runs the final recipe on any machine.',
    },
    whyAndWhen: [
      'Why JDK/JRE/JVM separation? It gives Java "Write Once, Run Anywhere" portability—compile once into .class bytecode, then run on Windows, Mac, or Linux.',
      'When do you need JDK vs JRE? Install JDK whenever you write or compile code (javac). End users who only run an existing program only need JRE/JVM.',
      'Why Scanner + printf? Raw System.in only reads raw bytes, so Scanner turns input into easy tokens (int, double, String). printf() lets you format numbers, alignment, and decimals cleanly.',
    ],
    keyRules: [
      'File name must match the public class name (e.g., public class Main -> Main.java).',
      'JRE does NOT contain javac, so you cannot compile Java files with JRE alone.',
      'System.out.print() keeps the cursor on the same line; System.out.println() moves to a new line.',
      'Format specifiers for printf: %d (int/long), %f / %.2f (float/double), %s (String), %c (char), %b (boolean), %n (new line), %% (literal % sign).',
      'Scanner nextLine() Trap: nextInt(), nextDouble(), and next() leave the Enter (\\n) in the buffer. Always call sc.nextLine() once to clear it before reading a full sentence with sc.nextLine().',
      'Scanner has NO nextChar() method—use sc.next().charAt(0) to read a single character.',
      'Use only ONE Scanner(System.in) in a program; closing it (sc.close()) also closes System.in.',
    ],
    visualTrace: {
      title: 'Visual Trace: How `Main.java` Becomes Output & How Scanner Clears `\\n`',
      steps: [
        {
          step: '1',
          codeLine: 'javac Main.java',
          state: 'Main.java  --->  Main.class (Bytecode)',
          note: 'Compiler checks syntax errors and produces OS-independent bytecode.',
        },
        {
          step: '2',
          codeLine: 'java Main',
          state: 'ClassLoader -> Verifier -> JIT Engine',
          note: 'JVM loads Main.class, verifies safety, and translates bytecode to CPU instructions.',
        },
        {
          step: '3',
          codeLine: 'int roll = sc.nextInt();',
          state: 'roll = 101  |  Buffer still has: "\\n"',
          note: 'nextInt() reads 101 but leaves the newline character waiting in the buffer.',
        },
        {
          step: '4',
          codeLine: 'sc.nextLine(); String name = sc.nextLine();',
          state: 'Buffer cleared -> name = "Rahul Sharma"',
          note: 'First nextLine() discards "\\n"; second nextLine() reads the full line properly!',
        },
      ],
    },
    comparisonTable: {
      headers: ['Component', 'Full Form', 'What It Contains', 'Can It Compile?'],
      rows: [
        ['JDK', 'Java Development Kit', 'JRE + javac, javap, jar, debugger', 'Yes (has javac)'],
        ['JRE', 'Java Runtime Environment', 'JVM + Libraries (java.lang, java.util)', 'No'],
        ['JVM', 'Java Virtual Machine', 'Class Loader, Verifier, Interpreter + JIT, GC', 'No'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Hello Java & Formatted Output (printf)',
        description: 'Demonstrates print, println, and printf format specifiers like %.2f and %-10s.',
        sampleInput: '',
        expectedOutput: 'Hello Java!\nName      |  Age |   Marks\nRahul     |   20 |   85.50',
        code: `public class Main {
    public static void main(String[] args) {
        String name = "Rahul";
        int age = 20;
        double marks = 85.5;

        System.out.println("Hello Java!");
        System.out.printf("%-10s|%5s|%8s%n", "Name", "Age", "Marks");
        System.out.printf("%-10s|%5d|%8.2f%n", name, age, marks);
    }
}`,
      },
      {
        title: 'Example 2: Reading Mixed Input with Scanner (nextLine Fix)',
        description: 'Reads an integer roll number, clears the buffer, then reads a full address line.',
        sampleInput: '101\nKoramangala Bengaluru',
        expectedOutput: 'Roll: 101 | Address: Koramangala Bengaluru',
        code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        int roll = sc.nextInt();
        sc.nextLine(); // Clear leftover Enter key from buffer
        String address = sc.nextLine();

        System.out.println("Roll: " + roll + " | Address: " + address);
        sc.close();
    }
}`,
      },
    ],
  },
  {
    id: 'conditionals-switch',
    badge: 'Article 2 • Decisions',
    title: 'Conditional Statements & Switch',
    subtitle: 'Control which path your program takes using if, if-else-if ladders, nested if, and switch.',
    animationType: 'conditionals-flow',
    definition: {
      summary:
        'Conditional statements let your program make decisions based on boolean (true/false) conditions. Depending on whether a condition passes or fails, Java runs one block of code and skips the others.',
      analogy:
        'Think of conditional statements like traffic signs or a fork in the road: "If the light is green, go; else if yellow, slow down; else stop."',
    },
    whyAndWhen: [
      'Use simple `if` when you only want an action to happen if a condition is true (e.g., print a bonus message if marks > 90).',
      'Use `if-else` when there are exactly two opposite outcomes (Even vs Odd, Eligible vs Not Eligible).',
      'Use `if-else-if` ladder when checking ranges or multiple prioritized conditions (e.g., Grade A+, A, B, C, Fail, or Electricity slab rates).',
      'Use `nested if` when a second check depends on the first check passing (e.g., first verify username, then check password).',
      'Use `switch` when matching ONE variable against fixed known values (days 1–7, menu options, traffic colors).',
    ],
    keyRules: [
      'Every `if (...)` condition MUST evaluate to a boolean (true or false).',
      'Common Mistake: Writing `if (x = 5)` is a compile error; always use `==` for number comparison.',
      'For Strings, NEVER use `==` to check text equality—always use `.equals()` or `.equalsIgnoreCase()`.',
      'Order matters in `if-else-if` ladders: put stricter/higher conditions first (`>= 90` before `>= 40`), because Java stops at the first true match.',
      'In classic `switch`, forgetting `break;` causes fall-through (all cases below also run until a `break` is found).',
      'Java 14+ Arrow Switch (`case 1 -> "Mon";`) does NOT fall through and can return a value directly.',
      'Switch works with `int`, `char`, `byte`, `short`, `enum`, and `String`—NOT `double`, `float`, `long`, or `boolean`.',
    ],
    visualTrace: {
      title: 'Visual Trace: Grade Calculator Ladder with `marks = 82`',
      steps: [
        {
          step: '1',
          codeLine: 'if (marks < 0 || marks > 100)',
          state: '82 < 0 || 82 > 100  ->  FALSE',
          note: 'Valid range check passes; move to the grade ladder.',
        },
        {
          step: '2',
          codeLine: 'else if (marks >= 90)',
          state: '82 >= 90  ->  FALSE',
          note: 'Skipped! Java moves to the next else-if condition.',
        },
        {
          step: '3',
          codeLine: 'else if (marks >= 75)',
          state: '82 >= 75  ->  TRUE (MATCH!)',
          note: 'Sets grade = "A" and IMMEDIATELY exits the entire ladder.',
        },
        {
          step: '4',
          codeLine: 'else if (marks >= 60) ... else',
          state: 'SKIPPED',
          note: 'Even though 82 >= 60 is also true, Java never checks lower branches after a match.',
        },
      ],
    },
    comparisonTable: {
      headers: ['Construct', 'Best For', 'Watch Out For'],
      rows: [
        ['if / if-else', '1 or 2 outcomes', 'Use == for numbers, .equals() for Strings'],
        ['if-else-if', 'Numeric ranges (marks, salary slabs)', 'Order conditions from highest to lowest'],
        ['Nested if', 'Dependent checks (Leap year, Login)', 'Keep braces {} aligned to avoid dangling else'],
        ['Classic switch', 'Fixed values (1..7, "add")', 'Missing break causes fall-through'],
        ['Arrow switch (->)', 'Clean single-value mapping (Java 14+)', 'No break needed; can assign directly'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Leap Year & Grade Ladder',
        description: 'Combines nested-if logic (Leap Year) and if-else-if ladder (Grades).',
        sampleInput: '2024\n82',
        expectedOutput: '2024 is a Leap Year\nMarks 82 -> Grade A',
        code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int year = sc.hasNextInt() ? sc.nextInt() : 2024;
        int marks = sc.hasNextInt() ? sc.nextInt() : 82;

        // Nested if for Leap Year
        boolean leap = false;
        if (year % 4 == 0) {
            if (year % 100 == 0) {
                leap = (year % 400 == 0);
            } else {
                leap = true;
            }
        }
        System.out.println(year + (leap ? " is a Leap Year" : " is NOT a Leap Year"));

        // if-else-if ladder for Grades
        String grade;
        if (marks >= 90) grade = "A+";
        else if (marks >= 75) grade = "A";
        else if (marks >= 60) grade = "B";
        else if (marks >= 40) grade = "C";
        else grade = "Fail";

        System.out.println("Marks " + marks + " -> Grade " + grade);
        sc.close();
    }
}`,
      },
      {
        title: 'Example 2: Switch with Fall-Through vs Arrow Switch',
        description: 'Shows classic switch (grouping months with same days) and Java 14+ arrow switch.',
        sampleInput: '2\n6',
        expectedOutput: 'Month 2 -> 28 days\nDay 6 is Weekend',
        code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int month = sc.hasNextInt() ? sc.nextInt() : 2;
        int day = sc.hasNextInt() ? sc.nextInt() : 6;

        int days = switch (month) {
            case 1, 3, 5, 7, 8, 10, 12 -> 31;
            case 4, 6, 9, 11 -> 30;
            case 2 -> 28;
            default -> -1;
        };
        System.out.println("Month " + month + " -> " + days + " days");

        String dayType = switch (day) {
            case 1, 2, 3, 4, 5 -> "Weekday";
            case 6, 7 -> "Weekend";
            default -> "Invalid";
        };
        System.out.println("Day " + day + " is " + dayType);
        sc.close();
    }
}`,
      },
    ],
  },
  {
    id: 'loops-patterns',
    badge: 'Article 3 • Loops',
    title: 'Loops, Patterns, Break & Continue',
    subtitle: 'Repeat tasks cleanly with for, while, do-while, nested pattern loops, and jump statements.',
    animationType: 'loops-flow',
    definition: {
      summary:
        'A loop executes a block of code repeatedly until a stopping condition is reached. Java provides `for`, `while`, `do-while`, and `for-each` loops, plus `break` and `continue` to control execution mid-loop.',
      analogy:
        'A `for` loop is like running 10 laps on a track (you know the count beforehand). A `while` loop is like stirring soup until it boils (you stop when a condition is met). A `do-while` loop is like tasting a dish at least once before deciding if it needs more salt.',
    },
    whyAndWhen: [
      'Use `for` when you know how many times to repeat (tables, 1 to N sum, array index loops).',
      'Use `while` when repetitions depend on a changing condition (extracting digits with `n % 10` and `n / 10`, Fibonacci, prime check).',
      'Use `do-while` when the body MUST execute at least once (ATM PIN retry, menu prompt, guessing game).',
      'Use `nested loops` for 2D grids, multiplication tables, and star/number pyramid patterns (Outer loop = rows, Inner loop = columns).',
      'Use `for-each` (`for (int x : arr)`) when you want to read every element of an array without needing its index.',
    ],
    keyRules: [
      '`for (init; condition; update)` runs `init` only ONCE, then repeats `condition -> body -> update`.',
      'In `while` and `do-while`, ALWAYS update the loop variable inside the body, otherwise you create an infinite loop.',
      '`do-while` ALWAYS ends with a semicolon: `} while (condition);`.',
      'Digit Tricks: `n % 10` gives the last digit; `n / 10` removes the last digit.',
      '`break;` exits ONLY the innermost loop immediately. To exit an outer nested loop too, use a label: `outer: for(...) { break outer; }`.',
      '`continue;` skips the rest of the current iteration and jumps to the next iteration (in a `while` loop, make sure the update happens BEFORE `continue`!).',
    ],
    visualTrace: {
      title: 'Visual Trace: Digit Reversal (`n = 123`) using `while (n > 0)`',
      steps: [
        {
          step: '1',
          codeLine: 'Start: n = 123, rev = 0',
          state: '123 > 0 (TRUE)',
          note: 'digit = 123 % 10 = 3 -> rev = 0*10 + 3 = 3 -> n = 123 / 10 = 12',
        },
        {
          step: '2',
          codeLine: 'Iteration 2: n = 12, rev = 3',
          state: '12 > 0 (TRUE)',
          note: 'digit = 12 % 10 = 2 -> rev = 3*10 + 2 = 32 -> n = 12 / 10 = 1',
        },
        {
          step: '3',
          codeLine: 'Iteration 3: n = 1, rev = 32',
          state: '1 > 0 (TRUE)',
          note: 'digit = 1 % 10 = 1 -> rev = 32*10 + 1 = 321 -> n = 1 / 10 = 0',
        },
        {
          step: '4',
          codeLine: 'Condition check: n = 0',
          state: '0 > 0 (FALSE) -> EXIT',
          note: 'Loop ends cleanly! Final reversed number = 321.',
        },
      ],
    },
    comparisonTable: {
      headers: ['Loop / Jump', 'Entry / Exit Controlled', 'Best Use Case'],
      rows: [
        ['for', 'Entry-controlled', 'Known number of steps (1..50)'],
        ['while', 'Entry-controlled', 'Condition-based (while n > 0)'],
        ['do-while', 'Exit-controlled (runs >= 1 time)', 'Menus, retry prompts'],
        ['for-each', 'Read-only array/list traversal', 'Summing or printing all items'],
        ['break / continue', 'Jump statement', 'Stop early / skip specific step (e.g., skip 45)'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Skip 45 (continue) & Prime Number Check (break)',
        description: 'Demonstrates continue inside a for loop and break inside a prime checker.',
        sampleInput: '29',
        expectedOutput: '1 2 3 4 5 6 7 8 9 10 \n29 is Prime',
        code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        // Print 1..12 skipping 5
        for (int i = 1; i <= 12; i++) {
            if (i == 5) continue;
            System.out.print(i + " ");
        }
        System.out.println();

        Scanner sc = new Scanner(System.in);
        int n = sc.hasNextInt() ? sc.nextInt() : 29;
        boolean prime = n >= 2;
        for (int i = 2; i * i <= n; i++) {
            if (n % i == 0) {
                prime = false;
                break; // Divisor found, stop early!
            }
        }
        System.out.println(n + (prime ? " is Prime" : " is NOT Prime"));
        sc.close();
    }
}`,
      },
      {
        title: 'Example 2: Centered Star Pyramid (Nested Loops)',
        description: 'Row i prints (n - i) spaces followed by (2*i - 1) stars.',
        sampleInput: '4',
        expectedOutput: '   *\n  ***\n *****\n*******',
        code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.hasNextInt() ? sc.nextInt() : 4;

        for (int i = 1; i <= n; i++) {
            for (int s = 1; s <= n - i; s++) {
                System.out.print(" ");
            }
            for (int j = 1; j <= 2 * i - 1; j++) {
                System.out.print("*");
            }
            System.out.println();
        }
        sc.close();
    }
}`,
      },
    ],
  },
  {
    id: 'oops-class-objects',
    badge: 'Article 4 • OOPs',
    title: 'Class & Objects',
    subtitle: 'Master the foundation of Object-Oriented Programming: blueprints (classes) and real instances (objects).',
    animationType: 'class-objects',
    definition: {
      summary:
        'A Class is a blueprint or template that defines what data (fields/attributes) and actions (methods/behaviors) an entity will have. An Object is a real, usable instance built from that class at runtime using the `new` keyword.',
      analogy:
        'A Class is like the architectural blueprint of a car (it describes wheels, engine, color, drive()). The actual cars built in the factory (`Car c1 = new Car();`, `Car c2 = new Car();`) are Objects—each car can have its own color and speed!',
    },
    whyAndWhen: [
      'Why use Classes & Objects? Instead of juggling loose variables (`name1, roll1, marks1, name2, roll2, marks2`), you group related data and behavior into one clean Student unit.',
      'When to create a Class? Whenever you model real-world or program entities like Student, BankAccount, Employee, Product, or Order.',
      'Why Encapsulation? Making fields `private` and exposing `public` methods prevents invalid data (e.g., negative marks or unauthorized balance changes).',
    ],
    keyRules: [
      'A Class does NOT allocate object memory; memory is allocated in the Heap only when `new ClassName()` runs.',
      'Each object created with `new` gets its own separate copy of non-static (instance) variables.',
      'Reference variables (`Student s1`) live on the Stack and store the memory address of the object in the Heap.',
      'Use the dot operator (`.`) to call methods or access fields on an object: `s1.display();`.',
      'If you try to use an uninitialized object reference (`Student s = null; s.display();`), Java throws `NullPointerException`.',
    ],
    visualTrace: {
      title: 'Visual Trace: Creating Two Independent Objects `s1` and `s2`',
      steps: [
        {
          step: '1',
          codeLine: 'class Student { String name; int marks; }',
          state: 'Blueprint Registered (0 objects in Heap)',
          note: 'Java only knows what a Student looks like; no student exists yet.',
        },
        {
          step: '2',
          codeLine: 'Student s1 = new Student(); s1.name = "Aryan"; s1.marks = 88;',
          state: 'Heap@101 { name: "Aryan", marks: 88 }  <-- s1',
          note: '`new` allocates space in Heap and stores its address in s1.',
        },
        {
          step: '3',
          codeLine: 'Student s2 = new Student(); s2.name = "Riya"; s2.marks = 94;',
          state: 'Heap@202 { name: "Riya", marks: 94 }   <-- s2',
          note: 'Second `new` creates a brand-new Heap block; s1 is completely untouched!',
        },
        {
          step: '4',
          codeLine: 's1.display(); s2.display();',
          state: 'Prints Aryan (88), then Riya (94)',
          note: 'Each call reads its own Heap object data.',
        },
      ],
    },
    comparisonTable: {
      headers: ['Aspect', 'Class', 'Object'],
      rows: [
        ['Meaning', 'Logical blueprint / template', 'Physical runtime instance'],
        ['Created With', '`class Student { ... }`', '`new Student()`'],
        ['Memory', 'Loaded once in Method Area', 'Each object gets its own Heap block'],
        ['Count', 'Defined once', 'Can create unlimited objects'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Encapsulated Student Class with Multiple Objects',
        description: 'Uses private fields, a setter method, and a result checker method.',
        sampleInput: '',
        expectedOutput: 'Roll No: 101 | Name: Aryan | Marks: 88 | Pass\nRoll No: 102 | Name: Riya | Marks: 35 | Fail',
        code: `class Student {
    private String name;
    private int rollNo;
    private int marks;

    void setDetails(String n, int r, int m) {
        name = n;
        rollNo = r;
        marks = m;
    }

    String getResult() {
        return marks >= 40 ? "Pass" : "Fail";
    }

    void display() {
        System.out.println("Roll No: " + rollNo + " | Name: " + name + " | Marks: " + marks + " | " + getResult());
    }
}

public class Main {
    public static void main(String[] args) {
        Student s1 = new Student();
        s1.setDetails("Aryan", 101, 88);

        Student s2 = new Student();
        s2.setDetails("Riya", 102, 35);

        s1.display();
        s2.display();
    }
}`,
      },
    ],
  },
  {
    id: 'oops-inheritance',
    badge: 'Article 5 • OOPs',
    title: 'Inheritance & Its Types',
    subtitle: 'Reuse parent class code in child classes and master Single, Multilevel, Hierarchical & Interface inheritance.',
    animationType: 'inheritance-types',
    definition: {
      summary:
        'Inheritance is the mechanism where one class (Child / Subclass) acquires the fields and methods of another class (Parent / Superclass) using the `extends` keyword. It models an "IS-A" relationship (e.g., a Car IS-A Vehicle, a Dog IS-A Animal).',
      analogy:
        'Just like a child inherits traits from parents and builds new skills on top of them, a `SmartPhone` inherits basic calling from `Phone` and adds 5G, camera, and apps without rewriting calling code.',
    },
    whyAndWhen: [
      'Why use Inheritance? Eliminates duplicate code—write common properties (`brand`, `powerOn()`) once in a parent class and reuse them across all child classes.',
      'When to use Inheritance? Only when there is a true "IS-A" relationship (e.g., `Manager IS-A Employee`, `Circle IS-A Shape`).',
      'When to use Interfaces (`implements`)? When you want a class to gain capabilities from multiple sources (e.g., `Printable` + `Rechargeable`) without causing multiple-class ambiguity.',
    ],
    keyRules: [
      'Single Inheritance: One child extends one parent (`class Dog extends Animal`).',
      'Multilevel Inheritance: Chain of inheritance (`class SmartPhone extends Phone`, `class Phone extends Device`).',
      'Hierarchical Inheritance: Multiple children share one common parent (`Circle extends Shape`, `Rectangle extends Shape`).',
      'Multiple Inheritance with Classes is NOT allowed in Java (`class C extends A, B` fails to compile) because of the Diamond Problem (ambiguity if both A and B have the same method).',
      'Multiple Inheritance IS supported via Interfaces: `class SmartPhone extends Phone implements Printable, Rechargeable`.',
      '`private` members and constructors of the parent class are NOT directly inherited by the child (though `super()` runs parent constructors).',
      'Every class in Java implicitly extends `java.lang.Object` at the top of the hierarchy.',
    ],
    visualTrace: {
      title: 'Visual Trace: Multilevel + Interface Lookup on `SmartPhone sp = new SmartPhone();`',
      steps: [
        {
          step: '1',
          codeLine: 'sp.powerOn();',
          state: 'Found in GrandParent -> Device.powerOn()',
          note: 'SmartPhone doesn’t define powerOn(), so Java walks up to Phone -> Device and runs it!',
        },
        {
          step: '2',
          codeLine: 'sp.call();',
          state: 'Found in Parent -> Phone.call()',
          note: 'Inherited directly from Phone.',
        },
        {
          step: '3',
          codeLine: 'sp.printSpec(); sp.charge();',
          state: 'Implemented inside SmartPhone',
          note: 'Satisfies both Printable and Rechargeable interfaces cleanly!',
        },
      ],
    },
    comparisonTable: {
      headers: ['Inheritance Type', 'Diagram', 'Keyword', 'Supported in Java?'],
      rows: [
        ['Single', 'A -> B', 'extends', 'Yes'],
        ['Multilevel', 'A -> B -> C', 'extends', 'Yes'],
        ['Hierarchical', 'A -> B and A -> C', 'extends', 'Yes'],
        ['Multiple (Classes)', 'A, B -> C', 'extends', 'No (Diamond Problem)'],
        ['Multiple (Interfaces)', 'I1, I2 -> C', 'implements', 'Yes'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Multilevel + Multiple Interface Inheritance',
        description: 'Device -> Phone -> SmartPhone implementing two interfaces.',
        sampleInput: '',
        expectedOutput: 'TechCorp device powered ON\nMaking a voice call...\n5G SmartPhone\nFast charging at 65W',
        code: `interface Printable {
    void printSpec();
}

interface Rechargeable {
    void charge();
}

class Device {
    String brand = "TechCorp";
    void powerOn() {
        System.out.println(brand + " device powered ON");
    }
}

class Phone extends Device {
    void call() {
        System.out.println("Making a voice call...");
    }
}

class SmartPhone extends Phone implements Printable, Rechargeable {
    public void printSpec() {
        System.out.println("5G SmartPhone");
    }
    public void charge() {
        System.out.println("Fast charging at 65W");
    }
}

public class Main {
    public static void main(String[] args) {
        SmartPhone sp = new SmartPhone();
        sp.powerOn();
        sp.call();
        sp.printSpec();
        sp.charge();
    }
}`,
      },
    ],
  },
  {
    id: 'oops-polymorphism',
    badge: 'Article 6 • OOPs',
    title: 'Polymorphism (Overloading & Overriding)',
    subtitle: 'Understand "one name, many forms" through Compile-Time Overloading and Runtime Overriding.',
    animationType: 'polymorphism-dispatch',
    definition: {
      summary:
        'Polymorphism literally means "many forms." In Java, it allows the same method name to behave differently depending on the inputs passed (Compile-Time Polymorphism / Method Overloading) or the actual object calling it (Runtime Polymorphism / Method Overriding).',
      analogy:
        'Think of a single "Pay" button in an app: depending on which payment object is selected (UPI, Card, or Cash), pressing `pay()` runs a completely different payment process!',
    },
    whyAndWhen: [
      'When to use Method Overloading (Compile-Time)? When an operation does the same job on different input types or counts—like `add(int, int)`, `add(double, double)`, or `System.out.println(...)`.',
      'When to use Method Overriding (Runtime)? When a child class needs its own specialized version of a parent method (e.g., `Circle.area()` vs `Rectangle.area()`).',
      'Why Upcasting (`Parent p = new Child();`)? You can write generic code for `Payment` that automatically works for any new payment method added in the future!',
    ],
    keyRules: [
      'Overloading Rule: Same method name in the same class, MUST have different parameter count, types, or order.',
      'Changing ONLY the return type with identical parameters does NOT overload—it causes a compile error!',
      'Overriding Rule: Same method name, same parameters, and compatible return type in a Parent-Child relationship.',
      'Always write `@Override` above an overridden method so the compiler catches typos in the method name or parameters.',
      'You CANNOT override `final`, `static`, or `private` methods in Java.',
      'In `Parent p = new Child();`, the compiler checks if the method exists in `Parent`, while the JVM runs `Child`’s overridden version at runtime (Dynamic Method Dispatch).',
    ],
    visualTrace: {
      title: 'Visual Trace: Overloading (Compile-Time) vs Dynamic Dispatch (Runtime)',
      steps: [
        {
          step: '1',
          codeLine: 'calc.add(2, 3);',
          state: 'Compiler picks: add(int, int)',
          note: 'Matched at compile time using argument types (int, int). Returns 5.',
        },
        {
          step: '2',
          codeLine: 'calc.add(2.5, 3.5);',
          state: 'Compiler picks: add(double, double)',
          note: 'Matched at compile time using argument types (double, double). Returns 6.0.',
        },
        {
          step: '3',
          codeLine: 'Payment p = new UpiPayment();',
          state: 'Reference: Payment  |  Actual Heap Object: UpiPayment',
          note: 'Upcasting: parent reference holds a child object.',
        },
        {
          step: '4',
          codeLine: 'p.pay(500);',
          state: 'JVM checks Heap -> runs UpiPayment.pay(500)',
          note: 'At runtime, JVM dispatches the call to UpiPayment’s overridden method!',
        },
      ],
    },
    comparisonTable: {
      headers: ['Comparison Point', 'Method Overloading', 'Method Overriding'],
      rows: [
        ['Polymorphism Type', 'Compile-Time (Static)', 'Runtime (Dynamic Dispatch)'],
        ['Where Written', 'Same class', 'Parent class & Child class'],
        ['Parameters', 'MUST be different', 'MUST be identical'],
        ['Return Type', 'Can be different', 'Same or child subtype'],
        ['static / final methods', 'Can be overloaded', 'Cannot be overridden'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Overloading + Overriding + Dynamic Dispatch',
        description: 'Shows compile-time add() overloading and runtime pay() overriding.',
        sampleInput: '',
        expectedOutput: '5\n6.0\nPaid Rs.500.0 via UPI!\nPaid Rs.1200.0 via Card!',
        code: `class Calculator {
    int add(int a, int b) { return a + b; }
    double add(double a, double b) { return a + b; }
}

class Payment {
    void pay(double amount) {
        System.out.println("Paid Rs." + amount);
    }
}

class UpiPayment extends Payment {
    @Override
    void pay(double amount) {
        System.out.println("Paid Rs." + amount + " via UPI!");
    }
}

class CardPayment extends Payment {
    @Override
    void pay(double amount) {
        System.out.println("Paid Rs." + amount + " via Card!");
    }
}

public class Main {
    public static void main(String[] args) {
        Calculator calc = new Calculator();
        System.out.println(calc.add(2, 3));
        System.out.println(calc.add(2.5, 3.5));

        Payment p1 = new UpiPayment();
        Payment p2 = new CardPayment();
        p1.pay(500);
        p2.pay(1200);
    }
}`,
      },
    ],
  },
  {
    id: 'oops-constructor',
    badge: 'Article 7 • OOPs',
    title: 'Constructors in Java',
    subtitle: 'Why and when constructors run, why they have NO return type, same class name rule, and super() order.',
    animationType: 'constructor-lifecycle',
    definition: {
      summary:
        'A Constructor is a special block of code (similar to a method) that automatically runs the moment a new object is created with the `new` keyword. Its job is to initialize the newly created object’s fields so the object starts in a valid, ready-to-use state.',
      analogy:
        'When you buy a new phone and turn it on for the first time, the initial setup screen configures your name, language, and settings automatically. A Constructor is that automatic setup routine for a Java object!',
    },
    whyAndWhen: [
      'Why do we need Constructors? Without a constructor, every new object starts with empty/default values (`null`, `0`), and you would have to manually call `s1.setDetails(...)` every single time—forgetting to call it leaves the object half-baked.',
      'When is a Constructor called? You NEVER call it with `obj.Student()`. It is invoked AUTOMATICALLY by the `new` keyword right after Heap memory is allocated (`new Student("Kabir", 105)`).',
      'When to use Default vs Parameterized Constructors? Use a no-arg constructor for safe default values, and a parameterized constructor when an object requires values at creation time (like a Student’s name and rollNo).',
    ],
    keyRules: [
      'Exact Class Name Rule: A constructor’s name MUST be 100% identical to the class name (including capital letters).',
      'NO Return Type Rule: A constructor NEVER has a return type—NOT EVEN `void`! If you accidentally write `void Student()`, Java treats it as a normal method, NOT a constructor.',
      'Default Constructor Trap: If you write ZERO constructors, Java automatically provides an invisible no-arg constructor. But the moment you write ANY parameterized constructor `Student(String name)`, Java stops creating the default one—so `new Student()` will fail unless you write `Student() {}` yourself!',
      'Constructor Overloading: Just like methods, a class can have multiple constructors with different parameter lists (e.g., `Student()`, `Student(String)`, `Student(String, int)`).',
      'Parent Runs First (`super()`): Every subclass constructor automatically calls `super()` on its very first line, so the Parent class initializes BEFORE the Child class body runs.',
      'Constructors cannot be `abstract`, `static`, or `final`, and they are NOT inherited like normal methods.',
    ],
    visualTrace: {
      title: 'Visual Trace: What Happens Inside `Employee e = new Employee("Kabir", 205);`',
      steps: [
        {
          step: '1',
          codeLine: 'new Employee("Kabir", 205)',
          state: 'Heap Memory Allocated -> { role: null, name: null, id: 0 }',
          note: 'JVM reserves Heap space for both Person (parent) and Employee (child) fields.',
        },
        {
          step: '2',
          codeLine: 'super("Engineer"); // Line 1 of Employee constructor',
          state: 'Person constructor runs -> role = "Engineer"',
          note: 'Parent class ALWAYS initializes first before Child fields are set.',
        },
        {
          step: '3',
          codeLine: 'this.name = "Kabir"; this.id = 205;',
          state: 'Heap Object -> { role: "Engineer", name: "Kabir", id: 205 }',
          note: 'Employee constructor body finishes initializing the child fields.',
        },
        {
          step: '4',
          codeLine: 'Employee e = ...',
          state: 'Stack ref `e` points to the fully ready Heap object!',
          note: 'Notice: NO `return` statement or return type was needed—`new` returns the object reference.',
        },
      ],
    },
    comparisonTable: {
      headers: ['Point', 'Constructor', 'Regular Method'],
      rows: [
        ['Name', 'MUST match the Class name', 'Any valid method name'],
        ['Return Type', 'NONE (not even void!)', 'Required (void, int, String, etc.)'],
        ['When It Runs', 'Automatically when `new` creates an object', 'Only when you explicitly call `obj.method()`'],
        ['Purpose', 'Initialize a brand-new object', 'Perform actions/calculations on an object'],
        ['Inheritance', 'Not inherited (invoked via `super()`)', 'Inherited by child classes'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Overloaded Constructors & Parent-to-Child Execution Order',
        description: 'Shows default, parameterized, and copy constructors plus super() execution order.',
        sampleInput: '',
        expectedOutput: '1. Person(Staff) runs\n2. Employee() default runs\n1. Person(Engineer) runs\n2. Employee(Kabir, 205) runs\nEmployee[id=0, name=Unknown, role=Staff]\nEmployee[id=205, name=Kabir, role=Engineer]',
        code: `class Person {
    String role;
    Person(String role) {
        this.role = role;
        System.out.println("1. Person(" + role + ") runs");
    }
}

class Employee extends Person {
    String name;
    int id;

    // No-arg constructor (same name as class, NO return type)
    Employee() {
        super("Staff"); // Must be line 1
        this.name = "Unknown";
        this.id = 0;
        System.out.println("2. Employee() default runs");
    }

    // Parameterized constructor (overloaded)
    Employee(String name, int id) {
        super("Engineer"); // Parent initializes first
        this.name = name;
        this.id = id;
        System.out.println("2. Employee(" + name + ", " + id + ") runs");
    }

    void show() {
        System.out.println("Employee[id=" + id + ", name=" + name + ", role=" + role + "]");
    }
}

public class Main {
    public static void main(String[] args) {
        Employee e1 = new Employee();
        Employee e2 = new Employee("Kabir", 205);
        e1.show();
        e2.show();
    }
}`,
      },
    ],
  },
  {
    id: 'oops-this-keyword',
    badge: 'Article 8 • OOPs',
    title: 'The `this` Keyword',
    subtitle: 'Understand what `this` points to, why it fixes variable shadowing, and how `this(...)` chains constructors.',
    animationType: 'this-pointer',
    definition: {
      summary:
        '`this` is a built-in reference variable inside non-static methods and constructors that always points to the CURRENT object (the exact object on which the method or constructor was called).',
      analogy:
        'Imagine two people named "Rahul" in a room. When someone points to themselves and says "my name," that word "my" is like `this`—it removes ambiguity and points specifically to the speaker!',
    },
    whyAndWhen: [
      'Why do we need `this.field`? When a constructor/method parameter has the exact same name as an instance variable (like `String name`), Java prioritizes the local parameter. `this.name` forces Java to access the object’s field.',
      'When to use `this(...)`? When a class has multiple overloaded constructors and you want one constructor to reuse another constructor instead of duplicating setup code.',
      'When to use `return this;`? When building fluent APIs (like `acc.deposit(500).deposit(250)`) or passing the current object to another helper method (`logger.save(this)`).',
    ],
    keyRules: [
      'Shadowing Fix: `name = name;` leaves the object’s field as `null`! Always write `this.name = name;`.',
      'Constructor Chaining Rule: `this(...)` MUST be the very first statement in a constructor.',
      'You CANNOT write both `this(...)` and `super(...)` in the same constructor because both demand to be Line 1.',
      'Static Restriction: You CANNOT use `this` inside a `static` method (like `main`) because `static` belongs to the class, not any individual object.',
    ],
    visualTrace: {
      title: 'Visual Trace: `BankAccount acc = new BankAccount("Meera");`',
      steps: [
        {
          step: '1',
          codeLine: 'new BankAccount("Meera")',
          state: 'Calls 1-arg constructor -> hits `this("Meera", 1000.0);`',
          note: 'this(...) delegates immediately to the 2-arg constructor on Line 1.',
        },
        {
          step: '2',
          codeLine: 'this.holder = holder; this.balance = balance;',
          state: 'Heap@99 { holder: "Meera", balance: 1000.0 }',
          note: '`this` resolves shadowing and stores values into the Heap object.',
        },
        {
          step: '3',
          codeLine: 'acc.deposit(500).deposit(250)',
          state: 'deposit(500) -> balance=1500, returns `acc` -> deposit(250) -> balance=1750',
          note: 'Returning `this` passes the same Heap@99 reference along the chain!',
        },
      ],
    },
    comparisonTable: {
      headers: ['Form of `this`', 'Example', 'Purpose'],
      rows: [
        ['`this.field`', '`this.name = name;`', 'Distinguishes instance variable from local parameter'],
        ['`this(...)`', '`this(holder, 1000.0);`', 'Calls another constructor in the same class (Line 1)'],
        ['`return this;`', '`return this;`', 'Returns current object for method chaining'],
        ['`method(this)`', '`report.print(this);`', 'Passes current object as an argument'],
      ],
    },
    examples: [
      {
        title: 'Example 1: `this.field`, `this(...)` Chaining & `return this`',
        description: 'Shows all three primary uses of `this` in one clear BankAccount example.',
        sampleInput: '',
        expectedOutput: 'Meera -> Balance: Rs.1750.0',
        code: `class BankAccount {
    String holder;
    double balance;

    // Constructor 1 chains to Constructor 2 using this(...)
    BankAccount(String holder) {
        this(holder, 1000.0);
    }

    // Constructor 2 uses this.field to fix variable shadowing
    BankAccount(String holder, double balance) {
        this.holder = holder;
        this.balance = balance;
    }

    // Returns current object for fluent chaining
    BankAccount deposit(double amount) {
        this.balance += amount;
        return this;
    }

    void printSummary() {
        System.out.println(this.holder + " -> Balance: Rs." + this.balance);
    }
}

public class Main {
    public static void main(String[] args) {
        BankAccount acc = new BankAccount("Meera");
        acc.deposit(500).deposit(250).printSummary();
    }
}`,
      },
    ],
  },
];

export const PRACTICE_MCQS = [
  {
    id: 'p-mcq-1',
    topic: 'Java Basics',
    question: 'Which toolkit includes the javac compiler required to compile .java files into .class bytecode?',
    options: ['JVM', 'JRE', 'JDK', 'RAM'],
    correctOption: 2,
    explanation: 'JDK (Java Development Kit) = JRE + Developer Tools like javac.',
  },
  {
    id: 'p-mcq-2',
    topic: 'Java Basics',
    question: 'Why should you call sc.nextLine() once after sc.nextInt() before reading a full line?',
    options: [
      'To close the Scanner',
      'Because nextInt() leaves the Enter (\\n) in the input buffer',
      'To convert int to double',
      'Because nextLine() only reads numbers',
    ],
    correctOption: 1,
    explanation: 'nextInt() leaves the newline in the buffer; an extra sc.nextLine() clears it.',
  },
  {
    id: 'p-mcq-3',
    topic: 'Conditionals & Switch',
    question: 'How should you compare two Strings in Java inside an if condition?',
    options: ['str1 == str2', 'str1 = str2', 'str1.equals(str2)', 'str1 != str2'],
    correctOption: 2,
    explanation: 'Always use .equals() to compare String contents.',
  },
  {
    id: 'p-mcq-4',
    topic: 'Conditionals & Switch',
    question: 'What happens in a classic switch case if you forget the break statement?',
    options: [
      'Compile error',
      'Fall-through occurs and the next cases also run',
      'Only default runs',
      'Program restarts',
    ],
    correctOption: 1,
    explanation: 'Without break, execution falls through to the cases below until a break is reached.',
  },
  {
    id: 'p-mcq-5',
    topic: 'Loops & Patterns',
    question: 'Which loop always runs its body at least once even if the condition is false?',
    options: ['for loop', 'while loop', 'do-while loop', 'for-each loop'],
    correctOption: 2,
    explanation: 'do-while checks its condition at the end of the loop.',
  },
  {
    id: 'p-mcq-6',
    topic: 'Loops & Patterns',
    question: 'What does the continue keyword do inside a loop?',
    options: [
      'Stops the entire loop immediately',
      'Skips only the current iteration and moves to the next one',
      'Restarts main()',
      'Exits the program',
    ],
    correctOption: 1,
    explanation: 'continue skips the rest of the current iteration; break exits the loop completely.',
  },
  {
    id: 'p-mcq-7',
    topic: 'Class & Objects',
    question: 'Which keyword creates a new object from a class in Java?',
    options: ['class', 'new', 'void', 'static'],
    correctOption: 1,
    explanation: 'The new keyword allocates memory for a new object in the Heap.',
  },
  {
    id: 'p-mcq-8',
    topic: 'Inheritance',
    question: 'Which keyword lets a child class inherit from a parent class?',
    options: ['implements', 'extends', 'inherits', 'super'],
    correctOption: 1,
    explanation: 'Classes use extends to inherit from a parent class (and implements for interfaces).',
  },
  {
    id: 'p-mcq-9',
    topic: 'Inheritance',
    question: 'How does Java support multiple inheritance cleanly?',
    options: [
      'By extending two classes with commas',
      'By implementing multiple interfaces',
      'Using static methods only',
      'Java has no interfaces',
    ],
    correctOption: 1,
    explanation: 'A class can implement multiple interfaces (implements A, B) to avoid the Diamond Problem.',
  },
  {
    id: 'p-mcq-10',
    topic: 'Polymorphism',
    question: 'Method Overloading means:',
    options: [
      'Same method name with different parameters in the same class',
      'Same method name and same parameters in a child class',
      'Changing only the return type',
      'Deleting a parent method',
    ],
    correctOption: 0,
    explanation: 'Overloading uses the same method name with different parameter counts or types.',
  },
  {
    id: 'p-mcq-11',
    topic: 'Polymorphism',
    question: 'With `Parent p = new Child();`, which overridden method runs when `p.show()` is called?',
    options: [
      'Parent.show()',
      'Child.show() at runtime',
      'Both run',
      'Compile error',
    ],
    correctOption: 1,
    explanation: 'Dynamic method dispatch runs the overridden method on the actual Heap object (Child).',
  },
  {
    id: 'p-mcq-12',
    topic: 'Constructors',
    question: 'Which statement is TRUE about a Java constructor?',
    options: [
      'It must return int',
      'It must have void as return type',
      'It has the same name as the class and NO return type',
      'It must be named start()',
    ],
    correctOption: 2,
    explanation: 'Constructors share the class name and never specify a return type (not even void).',
  },
  {
    id: 'p-mcq-13',
    topic: 'Constructors',
    question: 'In inheritance, which constructor runs first when creating a Child object?',
    options: ['Child constructor', 'Parent constructor (via super())', 'Only main()', 'Neither runs'],
    correctOption: 1,
    explanation: 'The parent constructor runs first via super() before the child constructor body.',
  },
  {
    id: 'p-mcq-14',
    topic: 'this Keyword',
    question: 'What does `this.name = name;` solve inside a constructor?',
    options: [
      'Makes the variable static',
      'Separates the object field from the parameter with the same name',
      'Deletes the parameter',
      'Creates a new class',
    ],
    correctOption: 1,
    explanation: 'this.name refers to the current object field, while name refers to the parameter.',
  },
  {
    id: 'p-mcq-15',
    topic: 'this Keyword',
    question: 'Can `this` be used inside a `static` method?',
    options: [
      'Yes',
      'No, because static methods do not belong to any object instance',
      'Only inside loops',
      'Only with String',
    ],
    correctOption: 1,
    explanation: 'static methods belong to the class, not an object, so `this` is not allowed there.',
  },
];
