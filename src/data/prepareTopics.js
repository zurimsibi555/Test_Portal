export const PREPARE_TOPICS = [
  {
    id: 'java-basics-io',
    badge: 'Article 1 • Java Basics',
    title: 'JDK, JRE, JVM & Input / Output',
    subtitle: 'Understand how Java runs your code and how to take simple input & print output.',
    animationType: 'jvm-pipeline',
    definition: {
      summary:
        'Java works in three simple layers: JVM (the engine that runs bytecode), JRE (JVM + standard Java libraries), and JDK (JRE + developer tools like javac compiler). First javac turns your .java file into .class bytecode, and then the JVM runs it.',
      analogy:
        'Think of JDK as a complete kitchen (stove + tools + ingredients), JRE as the setup needed to serve the dish, and JVM as the engine that heats and runs the recipe on any computer.',
    },
    whyAndWhen: [
      'Why JDK/JRE/JVM? It makes Java "Write Once, Run Anywhere"—compile once into .class bytecode, then run on Windows, Mac, or Linux.',
      'When do you need JDK vs JRE? Install JDK when writing/compiling Java code. End users who only run apps only need JRE/JVM.',
      'Why use Scanner? It lets your program read names, numbers, and lines typed by the user.',
    ],
    keyRules: [
      'Your file name should match your public class name (e.g., public class Main -> Main.java).',
      'JRE does NOT have javac, so you cannot compile Java code with JRE alone.',
      'System.out.print() stays on the same line; System.out.println() moves to the next line.',
      'For formatted output with printf(): %d = integer, %.2f = 2 decimal places, %s = text, %n = new line.',
      'Scanner nextLine() Fix: After sc.nextInt(), call sc.nextLine() once to clear the leftover Enter key before reading a full line.',
      'Scanner has no nextChar() method—use sc.next().charAt(0) to read a single letter.',
    ],
    visualTrace: {
      title: 'Visual Trace: How `Main.java` Prints Output',
      steps: [
        {
          step: '1',
          codeLine: 'javac Main.java',
          state: 'Main.java  --->  Main.class (Bytecode)',
          note: 'Compiler checks syntax and converts your code into bytecode.',
        },
        {
          step: '2',
          codeLine: 'java Main',
          state: 'JVM starts -> loads Main.class',
          note: 'JVM runs the main() method line by line.',
        },
        {
          step: '3',
          codeLine: 'int roll = sc.nextInt(); sc.nextLine(); String name = sc.nextLine();',
          state: 'roll = 101, name = "Rahul Sharma"',
          note: 'Extra sc.nextLine() clears the Enter key so full name is read cleanly.',
        },
      ],
    },
    comparisonTable: {
      headers: ['Component', 'Full Form', 'What It Contains', 'Can It Compile?'],
      rows: [
        ['JDK', 'Java Development Kit', 'JRE + javac compiler & tools', 'Yes'],
        ['JRE', 'Java Runtime Environment', 'JVM + Java Libraries', 'No'],
        ['JVM', 'Java Virtual Machine', 'Bytecode execution engine', 'No'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Welcome Greeting Using Scanner',
        description: 'Reads a user name from input and prints Welcome <name>.',
        sampleInput: 'Rahul',
        expectedOutput: 'Welcome Rahul',
        code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String name = sc.nextLine();
        System.out.println("Welcome " + name);
        sc.close();
    }
}`,
      },
      {
        title: 'Example 2: Simple Sum of Two Numbers',
        description: 'Reads two integers and prints their total.',
        sampleInput: '15 25',
        expectedOutput: 'Sum = 40',
        code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println("Sum = " + (a + b));
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
    subtitle: 'Make simple decisions in Java using if, if-else, else-if, and switch.',
    animationType: 'conditionals-flow',
    definition: {
      summary:
        'Conditional statements let your program choose which code block to run based on a true or false condition. If the condition is true, Java runs the `if` block; otherwise it can check `else if` or run the `else` block.',
      analogy:
        'Think of `if-else` like checking age for voting: "If age is 18 or more, print Eligible; otherwise, print Not Eligible."',
    },
    whyAndWhen: [
      'Use `if` when you want to do something only when a condition is true.',
      'Use `if-else` when there are two opposite choices (Even or Odd, Pass or Fail, Eligible or Not Eligible).',
      'Use `if-else-if` when checking multiple conditions (like Marks >= 90 -> A+, >= 75 -> A, >= 40 -> Pass).',
      'Use `switch` when matching one variable against fixed choices (like day 1..7 or "red", "yellow", "green").',
    ],
    keyRules: [
      'Condition inside `if (...)` must always give true or false.',
      'Use `==` to compare numbers (NEVER single `=`, because `=` assigns a value).',
      'Use `.equals()` to compare Strings (e.g., `color.equals("red")`).',
      'In an `if-else-if` ladder, put bigger/higher conditions first (`>= 90` before `>= 40`).',
      'In classic `switch`, put `break;` after each case so the next cases do not run automatically.',
    ],
    visualTrace: {
      title: 'Visual Trace: Voting Check (`age = 15`)',
      steps: [
        {
          step: '1',
          codeLine: 'int age = 15;',
          state: 'age = 15',
          note: 'Stores 15 inside variable age.',
        },
        {
          step: '2',
          codeLine: 'if (age >= 18)',
          state: '15 >= 18  ->  FALSE',
          note: 'Condition is false, so Java skips the if block.',
        },
        {
          step: '3',
          codeLine: 'else { System.out.println("Not Eligible"); }',
          state: 'Output: Not Eligible',
          note: 'Runs the else block instead!',
        },
      ],
    },
    comparisonTable: {
      headers: ['Statement', 'When to Use', 'Simple Example'],
      rows: [
        ['if / else', '2 possible outcomes', 'Even or Odd, Voting check'],
        ['if-else-if', 'Multiple score/number ranges', 'Grade A+, A, B, Fail'],
        ['switch', 'Fixed exact choices', 'Day 1 -> Monday, 2 -> Tuesday'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Voting Eligibility Checker',
        description: 'Checks if age >= 18 and prints whether the person can vote.',
        sampleInput: '16',
        expectedOutput: 'Not Eligible to Vote\nYears left: 2',
        code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int age = sc.nextInt();

        if (age >= 18) {
            System.out.println("Eligible to Vote");
        } else if (age >= 0) {
            System.out.println("Not Eligible to Vote");
            System.out.println("Years left: " + (18 - age));
        } else {
            System.out.println("Invalid Age");
        }
        sc.close();
    }
}`,
      },
      {
        title: 'Example 2: Even or Odd & Day Name (switch)',
        description: 'Simple % operator check and switch case example.',
        sampleInput: '7\n3',
        expectedOutput: '7 is ODD\nWednesday',
        code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int num = sc.nextInt();
        int day = sc.nextInt();

        if (num % 2 == 0) {
            System.out.println(num + " is EVEN");
        } else {
            System.out.println(num + " is ODD");
        }

        switch (day) {
            case 1: System.out.println("Monday"); break;
            case 2: System.out.println("Tuesday"); break;
            case 3: System.out.println("Wednesday"); break;
            default: System.out.println("Other day");
        }
        sc.close();
    }
}`,
      },
    ],
  },
  {
    id: 'loops-patterns',
    badge: 'Article 3 • Loops',
    title: 'Loops, Break & Continue',
    subtitle: 'Repeat tasks cleanly using for, while, do-while, break, and continue.',
    animationType: 'loops-flow',
    definition: {
      summary:
        'A loop runs a block of code again and again until a condition becomes false. Instead of writing `System.out.println` 10 times, a loop lets you write it once and repeat it 10 times.',
      analogy:
        'A `for` loop is like counting 1 to 10 on your fingers; `while` is like keeping an umbrella open while it is raining; `do-while` runs at least once before checking.',
    },
    whyAndWhen: [
      'Use `for` when you know how many times to repeat (like printing 1 to 50 or a multiplication table).',
      'Use `while` when you repeat until a condition changes (like counting until `i <= 5`).',
      'Use `do-while` when the code must run at least one time even if the condition is false.',
      'Use `continue` to skip a single step (like skipping number 5) and `break` to stop the loop early.',
    ],
    keyRules: [
      '`for (init; condition; update)` runs `init` once, then repeats: check condition -> run body -> update.',
      'In `while` and `do-while`, always update the variable (`i++`), otherwise the loop will run forever.',
      '`do-while` must end with a semicolon: `} while (condition);`.',
      '`break;` stops the loop immediately.',
      '`continue;` skips only the current turn and moves to the next number.',
    ],
    visualTrace: {
      title: 'Visual Trace: Print 1 to 4 Skipping 3 (`if (i == 3) continue;`)',
      steps: [
        {
          step: '1',
          codeLine: 'i = 1 -> 1 <= 4 (TRUE)',
          state: 'Prints: 1',
          note: 'i is not 3, so 1 is printed.',
        },
        {
          step: '2',
          codeLine: 'i = 2 -> 2 <= 4 (TRUE)',
          state: 'Prints: 2',
          note: 'i is not 3, so 2 is printed.',
        },
        {
          step: '3',
          codeLine: 'i = 3 -> if (i == 3) continue;',
          state: 'SKIPPED!',
          note: 'continue skips System.out.print(3) and jumps straight to i++.',
        },
        {
          step: '4',
          codeLine: 'i = 4 -> 4 <= 4 (TRUE)',
          state: 'Prints: 4  |  Final Output: 1 2 4',
          note: 'Next i becomes 5, 5 <= 4 is false, loop stops.',
        },
      ],
    },
    comparisonTable: {
      headers: ['Loop / Keyword', 'How It Works', 'Simple Use'],
      rows: [
        ['for', 'Know exact start & end', 'Print 1 to 10, Table of 5'],
        ['while', 'Checks condition before each run', 'Repeat while i <= 5'],
        ['do-while', 'Runs once, then checks condition', 'Run at least 1 time'],
        ['break / continue', 'Stop loop / Skip one turn', 'Stop at 7 / Skip 5'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Multiplication Table of Any Number',
        description: 'Uses a simple for loop from 1 to 10.',
        sampleInput: '5',
        expectedOutput: '5 x 1 = 5\n5 x 2 = 10\n...\n5 x 10 = 50',
        code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();

        for (int i = 1; i <= 10; i++) {
            System.out.println(n + " x " + i + " = " + (n * i));
        }
        sc.close();
    }
}`,
      },
      {
        title: 'Example 2: Print 1 to 10 Except 5 (continue) & Sum 1 to 5',
        description: 'Shows continue skipping 5 and a basic accumulator sum loop.',
        sampleInput: '',
        expectedOutput: '1 2 3 4 6 7 8 9 10 \nSum of 1 to 5 = 15',
        code: `public class Main {
    public static void main(String[] args) {
        for (int i = 1; i <= 10; i++) {
            if (i == 5) {
                continue; // Skip 5
            }
            System.out.print(i + " ");
        }
        System.out.println();

        int sum = 0;
        for (int i = 1; i <= 5; i++) {
            sum += i;
        }
        System.out.println("Sum of 1 to 5 = " + sum);
    }
}`,
      },
    ],
  },
  {
    id: 'functions-methods',
    badge: 'Article 4 • Functions',
    title: 'Functions / Methods in Java',
    subtitle: 'Write reusable blocks of code that take inputs (parameters), do a task, and return a result.',
    animationType: 'methods-flow',
    definition: {
      summary:
        'A Method (often called a Function) is a named block of code that performs a specific task whenever you call it. Instead of writing the same logic again and again inside `main()`, you put it in a method and reuse it anywhere.',
      analogy:
        'Think of a method like a fruit juicer: you put in inputs (fruits = parameters), the machine blends them (method body), and it gives back output (juice = return value).',
    },
    whyAndWhen: [
      'Why use Functions / Methods? It avoids repeating the same code, keeps `main()` short and neat, and makes fixing bugs super easy.',
      'When should you create a Method? Whenever a task needs to run multiple times (e.g., calculating area, greeting users, finding the greater of two numbers) or when organizing a program into clear steps.',
      'When to use `void` vs a return type (`int`, `String`)? Use `void` when the method only prints something and gives nothing back. Use `int`, `double`, or `String` when it computes a value and sends it back using `return`.',
    ],
    keyRules: [
      'Syntax: `static returnType methodName(parameters) { ... }` (when calling directly from `main`, include `static`).',
      'Parameters vs Arguments: Variables inside the method definition (`int length, int breadth`) are Parameters; actual values you pass (`calculateArea(10, 5)`) are Arguments.',
      'If a method has a return type like `int`, it MUST end with `return <int value>;`.',
      'If a method has `void`, it does NOT return a value (so you cannot store it in `int x = ...`).',
      'Execution jumps from `main()` into the method when called, and jumps right back to `main()` once `return` or the closing `}` is reached.',
    ],
    visualTrace: {
      title: 'Visual Trace: Calling `int area = calculateArea(10, 5);`',
      steps: [
        {
          step: '1',
          codeLine: 'int area = calculateArea(10, 5);',
          state: 'main() calls calculateArea with 10 and 5',
          note: 'main() pauses and passes 10 -> length, 5 -> breadth.',
        },
        {
          step: '2',
          codeLine: 'static int calculateArea(int length, int breadth)',
          state: 'length = 10, breadth = 5',
          note: 'Method starts running with those parameter values.',
        },
        {
          step: '3',
          codeLine: 'return length * breadth;',
          state: 'Returns 50 back to main()',
          note: '10 * 5 = 50 is sent back to the caller.',
        },
        {
          step: '4',
          codeLine: 'System.out.println("Area = " + area);',
          state: 'area = 50  |  Output: Area = 50',
          note: 'main() resumes and prints Area = 50!',
        },
      ],
    },
    comparisonTable: {
      headers: ['Feature', 'void Method', 'Value-Returning Method (int, String)'],
      rows: [
        ['Return Type', '`void`', '`int`, `double`, `String`, `boolean`, etc.'],
        ['`return` Keyword', 'Not needed to send a value', 'Must `return` matching type'],
        ['How Called', '`greet("Rahul");`', '`int ans = add(4, 6);`'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Simple Void Greeting & Add Function',
        description: 'Shows one void method (prints a greeting) and one returning method (adds two numbers).',
        sampleInput: 'Rahul\n10 20',
        expectedOutput: 'Hello, Rahul!\nSum = 30',
        code: `import java.util.Scanner;

public class Main {
    // 1. void method: only prints, returns nothing
    static void greet(String name) {
        System.out.println("Hello, " + name + "!");
    }

    // 2. int method: takes 2 numbers and returns their sum
    static int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String name = sc.next();
        int x = sc.nextInt();
        int y = sc.nextInt();

        greet(name);
        int result = add(x, y);
        System.out.println("Sum = " + result);
        sc.close();
    }
}`,
      },
      {
        title: 'Example 2: Calculate Area of Rectangle Method',
        description: 'Defines static int calculateArea(int length, int breadth) and calls it from main.',
        sampleInput: '10 5',
        expectedOutput: 'Area = 50',
        code: `import java.util.Scanner;

public class Main {
    static int calculateArea(int length, int breadth) {
        return length * breadth;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int length = sc.nextInt();
        int breadth = sc.nextInt();

        int area = calculateArea(length, breadth);
        System.out.println("Area = " + area);
        sc.close();
    }
}`,
      },
    ],
  },
  {
    id: 'oops-class-objects',
    badge: 'Article 5 • OOPs',
    title: 'Class & Objects',
    subtitle: 'Learn how a Class works as a blueprint and Objects store real data in memory.',
    animationType: 'class-objects',
    definition: {
      summary:
        'A Class is a blueprint or template that describes what data (variables/fields) and actions (methods) something has. An Object is a real item created from that class using the `new` keyword.',
      analogy:
        'A Class is like an architectural house plan. The actual houses built from that plan (`House h1 = new House();`, `House h2 = new House();`) are Objects—each house has its own color and owner!',
    },
    whyAndWhen: [
      'Why use Classes & Objects? Instead of creating messy separate variables for 50 students (`name1, roll1, name2, roll2...`), one `Student` class keeps each student’s data bundled neatly together.',
      'When to make a Class? Whenever you want to represent a real thing in code—like `Student`, `Car`, `Book`, or `BankAccount`.',
      'Why keep fields `private` (Encapsulation)? It protects data from accidental invalid edits and lets methods control how data is read or updated.',
    ],
    keyRules: [
      'A Class is only a design; memory for fields is created ONLY when you run `new ClassName()`.',
      'Every object created with `new` gets its own separate copy of instance variables.',
      'Use the dot operator (`.`) to call a method or read a field on an object: `s1.display();`.',
      'If an object reference is `null` and you call `s1.display()`, Java throws a `NullPointerException`.',
    ],
    visualTrace: {
      title: 'Visual Trace: Two Independent Student Objects (`s1` and `s2`)',
      steps: [
        {
          step: '1',
          codeLine: 'class Student { String name; int marks; }',
          state: 'Blueprint Created (0 objects in memory)',
          note: 'Defines what every Student will have.',
        },
        {
          step: '2',
          codeLine: 'Student s1 = new Student(); s1.name = "Aryan"; s1.marks = 85;',
          state: 'Object 1 (s1) -> { name: "Aryan", marks: 85 }',
          note: '`new Student()` builds the first real Student object.',
        },
        {
          step: '3',
          codeLine: 'Student s2 = new Student(); s2.name = "Riya"; s2.marks = 92;',
          state: 'Object 2 (s2) -> { name: "Riya", marks: 92 }',
          note: 'Builds a second completely separate Student object.',
        },
      ],
    },
    comparisonTable: {
      headers: ['Point', 'Class', 'Object'],
      rows: [
        ['Meaning', 'Blueprint / Template', 'Real instance built from the class'],
        ['Created With', '`class Student { ... }`', '`new Student()`'],
        ['Memory', 'No object data stored', 'Gets its own copy of fields'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Student Class with Two Objects',
        description: 'Creates two Student objects and displays each student’s info.',
        sampleInput: '',
        expectedOutput: 'Roll: 101 | Name: Aryan | Marks: 85\nRoll: 102 | Name: Riya | Marks: 92',
        code: `class Student {
    String name;
    int rollNo;
    int marks;

    void setDetails(String n, int r, int m) {
        name = n;
        rollNo = r;
        marks = m;
    }

    void display() {
        System.out.println("Roll: " + rollNo + " | Name: " + name + " | Marks: " + marks);
    }
}

public class Main {
    public static void main(String[] args) {
        Student s1 = new Student();
        s1.setDetails("Aryan", 101, 85);

        Student s2 = new Student();
        s2.setDetails("Riya", 102, 92);

        s1.display();
        s2.display();
    }
}`,
      },
    ],
  },
  {
    id: 'oops-inheritance',
    badge: 'Article 6 • OOPs',
    title: 'Inheritance & Its Types',
    subtitle: 'Reuse parent class code in child classes and learn Single, Multilevel, Hierarchical & Interface inheritance.',
    animationType: 'inheritance-types',
    definition: {
      summary:
        'Inheritance allows one class (Child / Subclass) to inherit variables and methods from another class (Parent / Superclass) using the `extends` keyword. It represents an "IS-A" relationship (for example: a Dog IS-A Animal).',
      analogy:
        'Just like a child inherits features from parents without starting from scratch, a `Dog` class inherits `eat()` from `Animal` and only adds `bark()`.',
    },
    whyAndWhen: [
      'Why use Inheritance? To reuse existing code instead of copy-pasting the same methods into every class.',
      'When to use `extends`? When one class is a specific type of another class (`Dog IS-A Animal`, `Car IS-A Vehicle`).',
      'When to use `implements` (Interfaces)? When one class needs abilities from multiple sources (like a `SmartPhone` implementing both `Camera` and `MusicPlayer`).',
    ],
    keyRules: [
      'Single Inheritance: 1 Parent -> 1 Child (`class Dog extends Animal`).',
      'Multilevel Inheritance: Chain of classes (`Device -> Phone -> SmartPhone`).',
      'Hierarchical Inheritance: 1 Parent -> Multiple Children (`Animal -> Dog` and `Animal -> Cat`).',
      'Multiple Inheritance with Classes is NOT allowed (`class C extends A, B` gives a compile error) to prevent ambiguity (Diamond Problem).',
      'Multiple Inheritance IS allowed with Interfaces (`class SmartPhone implements Camera, MusicPlayer`).',
      '`private` fields of the parent class are not directly accessible in the child class.',
    ],
    visualTrace: {
      title: 'Visual Trace: How `Dog d = new Dog();` Uses `Animal` Methods',
      steps: [
        {
          step: '1',
          codeLine: 'class Dog extends Animal',
          state: 'Dog inherits eat() from Animal + has bark()',
          note: 'Dog automatically receives non-private methods from Animal.',
        },
        {
          step: '2',
          codeLine: 'd.eat();',
          state: 'Found in Animal -> Prints: Animal is eating',
          note: 'Java looks in Dog, then finds eat() in parent Animal.',
        },
        {
          step: '3',
          codeLine: 'd.bark();',
          state: 'Found in Dog -> Prints: Dog is barking',
          note: 'Runs Dog’s own method.',
        },
      ],
    },
    comparisonTable: {
      headers: ['Type', 'Pattern', 'Keyword', 'Allowed in Java?'],
      rows: [
        ['Single', 'Animal -> Dog', 'extends', 'Yes'],
        ['Multilevel', 'Device -> Phone -> SmartPhone', 'extends', 'Yes'],
        ['Hierarchical', 'Animal -> Dog, Cat', 'extends', 'Yes'],
        ['Multiple (Classes)', 'A, B -> C', 'extends', 'No'],
        ['Multiple (Interfaces)', 'I1, I2 -> C', 'implements', 'Yes'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Single & Multilevel Inheritance',
        description: 'Shows Device -> Phone -> SmartPhone inheriting methods step by step.',
        sampleInput: '',
        expectedOutput: 'Power ON\nCalling...\nTaking 5G photo',
        code: `class Device {
    void powerOn() {
        System.out.println("Power ON");
    }
}

class Phone extends Device {
    void call() {
        System.out.println("Calling...");
    }
}

class SmartPhone extends Phone {
    void takePhoto() {
        System.out.println("Taking 5G photo");
    }
}

public class Main {
    public static void main(String[] args) {
        SmartPhone sp = new SmartPhone();
        sp.powerOn();   // From Device
        sp.call();      // From Phone
        sp.takePhoto(); // From SmartPhone
    }
}`,
      },
    ],
  },
  {
    id: 'oops-polymorphism',
    badge: 'Article 7 • OOPs',
    title: 'Polymorphism (Overloading & Overriding)',
    subtitle: 'One method name doing different things via Method Overloading and Method Overriding.',
    animationType: 'polymorphism-dispatch',
    definition: {
      summary:
        'Polymorphism means "many forms." In Java, it lets one method name behave differently in two ways: Compile-Time Polymorphism (Method Overloading — same name, different parameters in the same class) and Runtime Polymorphism (Method Overriding — child class writes its own version of a parent method).',
      analogy:
        'Think of a "Speak" action: when you ask a `Dog` to speak, it barks; when you ask a `Cat` to speak, it meows. Same action name, different behavior!',
    },
    whyAndWhen: [
      'When to use Method Overloading? When you want one clean method name like `add(...)` to work for 2 integers, 3 integers, or decimals.',
      'When to use Method Overriding? When a child class wants to customize a method it inherited from its parent (e.g., `Dog` overrides `sound()` from `Animal`).',
      'Why write `Animal a = new Dog();`? Because you can handle any animal with one variable type `Animal`, and Java automatically runs `Dog`’s `sound()` at runtime.',
    ],
    keyRules: [
      'Overloading Rule: Methods in the same class have the same name, MUST have different parameter count or types.',
      'Changing ONLY the return type with the same parameters is a compile error, NOT overloading.',
      'Overriding Rule: Child class has the exact same method name AND exact same parameters as the Parent class.',
      'Write `@Override` above overridden methods so Java checks your spelling for you.',
      'With `Parent p = new Child();`, Java runs `Child`’s overridden method at runtime (Dynamic Method Dispatch).',
    ],
    visualTrace: {
      title: 'Visual Trace: Overloading vs Overriding',
      steps: [
        {
          step: '1',
          codeLine: 'calc.add(2, 3);',
          state: 'Matches add(int, int) -> Returns 5',
          note: 'Java picks the right overloaded method while compiling.',
        },
        {
          step: '2',
          codeLine: 'calc.add(2.5, 3.5);',
          state: 'Matches add(double, double) -> Returns 6.0',
          note: 'Different parameter types select the double version.',
        },
        {
          step: '3',
          codeLine: 'Animal a = new Dog(); a.sound();',
          state: 'Actual object is Dog -> Prints: Dog barks',
          note: 'At runtime, Java runs Dog’s overridden sound() method!',
        },
      ],
    },
    comparisonTable: {
      headers: ['Difference', 'Method Overloading', 'Method Overriding'],
      rows: [
        ['Where Written', 'Same class', 'Parent & Child class'],
        ['Parameters', 'Must be different', 'Must be identical'],
        ['When Decided', 'Compile Time', 'Runtime'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Overloading (add) & Overriding (sound)',
        description: 'Clear beginner example of both types of polymorphism.',
        sampleInput: '',
        expectedOutput: '5\n6.0\nDog barks',
        code: `class Calculator {
    int add(int a, int b) {
        return a + b;
    }
    double add(double a, double b) {
        return a + b;
    }
}

class Animal {
    void sound() {
        System.out.println("Animal makes a sound");
    }
}

class Dog extends Animal {
    @Override
    void sound() {
        System.out.println("Dog barks");
    }
}

public class Main {
    public static void main(String[] args) {
        Calculator calc = new Calculator();
        System.out.println(calc.add(2, 3));
        System.out.println(calc.add(2.5, 3.5));

        Animal a = new Dog();
        a.sound();
    }
}`,
      },
    ],
  },
  {
    id: 'oops-constructor',
    badge: 'Article 8 • OOPs',
    title: 'Constructors in Java',
    subtitle: 'Why and when constructors run, why they have NO return type, same class name rule, and super().',
    animationType: 'constructor-lifecycle',
    definition: {
      summary:
        'A Constructor is a special initializer block inside a class that runs AUTOMATICALLY the moment a new object is created using `new`. It sets starting values for the object’s variables so the object is ready to use immediately.',
      analogy:
        'When you open a brand-new phone, the setup wizard runs automatically once to set your name and preferences. A Constructor is that automatic setup for every new Java object!',
    },
    whyAndWhen: [
      'Why do we need Constructors? Without a constructor, every new object starts empty (`null` or `0`), and you would have to remember to call `s1.setData(...)` manually every time.',
      'When does a Constructor run? Automatically whenever you write `new Student(...)`. You never call it manually like `s1.Student()`.',
      'When to use Default vs Parameterized? Use a no-arg constructor for default values, and a parameterized constructor when you want to pass starting values like `new Student("Aryan", 101)`.',
    ],
    keyRules: [
      'Same Class Name Rule: A constructor MUST have the exact same name as its class (including capital letters).',
      'NO Return Type Rule: A constructor has NO return type—NOT EVEN `void`! Writing `void Student()` turns it into a normal method instead of a constructor.',
      'Hidden Default Constructor: If you write zero constructors, Java gives you a hidden empty `Student()` constructor. Once you write `Student(String name)`, Java stops generating the empty one automatically.',
      'Constructor Overloading: A class can have multiple constructors with different parameter lists (`Student()` and `Student(String, int)`).',
      'Parent Runs First (`super()`): In inheritance, the parent class constructor always runs first via `super()` before the child constructor body runs.',
    ],
    visualTrace: {
      title: 'Visual Trace: Creating `Student s = new Student("Aryan", 101);`',
      steps: [
        {
          step: '1',
          codeLine: 'new Student("Aryan", 101)',
          state: 'Memory Created -> { name: null, roll: 0 }',
          note: 'Java reserves memory for the new Student object.',
        },
        {
          step: '2',
          codeLine: 'Student(String n, int r) runs automatically',
          state: 'name = "Aryan", roll = 101',
          note: 'Constructor sets the initial values right away—no extra method call needed!',
        },
        {
          step: '3',
          codeLine: 's.display();',
          state: 'Output: Name: Aryan | Roll: 101',
          note: 'Object is ready to use immediately.',
        },
      ],
    },
    comparisonTable: {
      headers: ['Rule', 'Constructor', 'Normal Method'],
      rows: [
        ['Name', 'MUST match Class name', 'Any valid name'],
        ['Return Type', 'NONE (not even void)', 'Required (void, int, etc.)'],
        ['When It Runs', 'Automatically on `new`', 'When you call `obj.method()`'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Default & Parameterized Constructors',
        description: 'Shows two overloaded constructors (no return type, same name as class).',
        sampleInput: '',
        expectedOutput: 'Name: Guest | Age: 18\nName: Aryan | Age: 20',
        code: `class Student {
    String name;
    int age;

    // Default (no-arg) constructor: no return type!
    Student() {
        name = "Guest";
        age = 18;
    }

    // Parameterized constructor
    Student(String n, int a) {
        name = n;
        age = a;
    }

    void show() {
        System.out.println("Name: " + name + " | Age: " + age);
    }
}

public class Main {
    public static void main(String[] args) {
        Student s1 = new Student();
        Student s2 = new Student("Aryan", 20);
        s1.show();
        s2.show();
    }
}`,
      },
    ],
  },
  {
    id: 'oops-this-keyword',
    badge: 'Article 9 • OOPs',
    title: 'The `this` Keyword',
    subtitle: 'Point clearly to the current object when parameter names match field names.',
    animationType: 'this-pointer',
    definition: {
      summary:
        '`this` is a built-in keyword inside a class that always refers to the CURRENT object (the object on which the constructor or method is running).',
      analogy:
        'If two people have the same name, saying "my bag" removes confusion. In Java, `this.name` means "THIS object’s name variable" (not the input parameter `name`).',
    },
    whyAndWhen: [
      'Why do we need `this.field`? When a constructor parameter has the same name as the class variable (`String name`), writing `name = name` fails to save it into the object. `this.name = name` fixes it!',
      'When to use `this(...)`? When one constructor wants to call another constructor in the same class to reuse setup code.',
      'When to use `return this;`? When you want to return the current object so methods can be chained (`acc.deposit(100).deposit(50)`).',
    ],
    keyRules: [
      'Without `this`: `name = name;` leaves the object field as `null`! Always write `this.name = name;`.',
      '`this(...)` constructor call MUST be the very first line inside a constructor.',
      'You CANNOT use `this` inside a `static` method (like `main`), because `static` belongs to the class, not an object.',
    ],
    visualTrace: {
      title: 'Visual Trace: Fixing Variable Shadowing with `this.name = name`',
      steps: [
        {
          step: '1',
          codeLine: 'Student(String name)',
          state: 'Parameter `name` = "Aryan"  |  Object field `name` = null',
          note: 'Both the parameter and field are named `name`.',
        },
        {
          step: '2',
          codeLine: 'this.name = name;',
          state: 'Object field `name` becomes "Aryan"',
          note: '`this.name` points to the object field, saving "Aryan" properly.',
        },
      ],
    },
    comparisonTable: {
      headers: ['Usage', 'Code', 'Meaning'],
      rows: [
        ['Field vs Parameter', '`this.name = name;`', 'Stores parameter into current object field'],
        ['Call Constructor', '`this("Guest", 18);`', 'Calls another constructor (must be line 1)'],
        ['Return Self', '`return this;`', 'Returns the current object'],
      ],
    },
    examples: [
      {
        title: 'Example 1: Using `this.name` & `this(...)` in Student',
        description: 'Shows `this(...)` chaining and `this.field` solving same-name parameters.',
        sampleInput: '',
        expectedOutput: 'Guest - 18\nMeera - 21',
        code: `class Student {
    String name;
    int age;

    Student() {
        this("Guest", 18); // Calls 2-arg constructor
    }

    Student(String name, int age) {
        this.name = name;
        this.age = age;
    }

    void show() {
        System.out.println(this.name + " - " + this.age);
    }
}

public class Main {
    public static void main(String[] args) {
        Student s1 = new Student();
        Student s2 = new Student("Meera", 21);
        s1.show();
        s2.show();
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
    question: 'Which toolkit includes the javac compiler to compile .java files into .class bytecode?',
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
    topic: 'Loops',
    question: 'Which loop always runs its body at least once even if the condition is false?',
    options: ['for loop', 'while loop', 'do-while loop', 'for-each loop'],
    correctOption: 2,
    explanation: 'do-while checks its condition at the end of the loop.',
  },
  {
    id: 'p-mcq-6',
    topic: 'Loops',
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
    topic: 'Functions / Methods',
    question: 'Which return type is used when a method prints a message and does NOT return any value?',
    options: ['int', 'String', 'void', 'null'],
    correctOption: 2,
    explanation: 'Use `void` when a method performs an action without returning a value.',
  },
  {
    id: 'p-mcq-8',
    topic: 'Functions / Methods',
    question: 'Which keyword sends a computed value back from a method to `main()`?',
    options: ['break', 'continue', 'return', 'static'],
    correctOption: 2,
    explanation: 'The `return` statement sends the result back to the caller.',
  },
  {
    id: 'p-mcq-9',
    topic: 'Class & Objects',
    question: 'Which keyword creates a new object from a class in Java?',
    options: ['class', 'new', 'void', 'static'],
    correctOption: 1,
    explanation: 'The new keyword creates a new object from a class.',
  },
  {
    id: 'p-mcq-10',
    topic: 'Inheritance',
    question: 'Which keyword lets a child class inherit from a parent class?',
    options: ['implements', 'extends', 'inherits', 'super'],
    correctOption: 1,
    explanation: 'Classes use extends to inherit from a parent class (and implements for interfaces).',
  },
  {
    id: 'p-mcq-11',
    topic: 'Inheritance',
    question: 'How does Java support multiple inheritance cleanly?',
    options: [
      'By extending two classes with commas',
      'By implementing multiple interfaces',
      'Using static methods only',
      'Java has no interfaces',
    ],
    correctOption: 1,
    explanation: 'A class can implement multiple interfaces (implements A, B) safely.',
  },
  {
    id: 'p-mcq-12',
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
    id: 'p-mcq-13',
    topic: 'Polymorphism',
    question: 'With `Animal a = new Dog();`, which overridden method runs when `a.sound()` is called?',
    options: [
      'Animal.sound()',
      'Dog.sound() at runtime',
      'Both run',
      'Compile error',
    ],
    correctOption: 1,
    explanation: 'At runtime, Java calls the overridden method of the actual object (Dog).',
  },
  {
    id: 'p-mcq-14',
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
    id: 'p-mcq-15',
    topic: 'Constructors',
    question: 'In inheritance, which constructor runs first when creating a Child object?',
    options: ['Child constructor', 'Parent constructor (via super())', 'Only main()', 'Neither runs'],
    correctOption: 1,
    explanation: 'The parent constructor runs first via super() before the child constructor body.',
  },
  {
    id: 'p-mcq-16',
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
    id: 'p-mcq-17',
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
