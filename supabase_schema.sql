-- ==============================================================================
-- Podcast Examination & Proctoring Platform - Supabase PostgreSQL Schema
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tests Table
CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    duration_minutes INT NOT NULL DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. MCQ Questions Table
CREATE TABLE IF NOT EXISTS mcq_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option INT NOT NULL,
    points INT DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Coding Questions Table (Java Online Compiler)
CREATE TABLE IF NOT EXISTS coding_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    constraints TEXT DEFAULT '',
    sample_input TEXT NOT NULL,
    sample_output TEXT NOT NULL,
    starter_code TEXT DEFAULT 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}',
    test_cases JSONB NOT NULL,
    points INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Test Sessions Table (Multi-Device Proctoring & Tracking)
CREATE TABLE IF NOT EXISTS test_sessions (
    id VARCHAR(64) PRIMARY KEY,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    roll_no VARCHAR(100) NOT NULL,
    paired BOOLEAN DEFAULT false,
    paired_at TIMESTAMP WITH TIME ZONE,
    is_started BOOLEAN DEFAULT false,
    is_submitted BOOLEAN DEFAULT false,
    violated BOOLEAN DEFAULT false,
    violation_reason TEXT,
    webcam_warnings INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Submissions Table (Grading & Cheating Records)
CREATE TABLE IF NOT EXISTS submissions (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) REFERENCES test_sessions(id) ON DELETE SET NULL,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    roll_no VARCHAR(100) NOT NULL,
    mcq_score INT DEFAULT 0,
    code_score INT DEFAULT 0,
    total_score INT DEFAULT 0,
    webcam_warnings INT DEFAULT 0,
    violated BOOLEAN DEFAULT false,
    violation_reason TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed Java Foundation Test
INSERT INTO tests (id, title, description, duration_minutes, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Java Foundation Test',
    'Comprehensive evaluation covering Core Java, Input/Output, Conditionals, Loops, Functions, and OOPs concepts.',
    45,
    true
) ON CONFLICT (id) DO NOTHING;

-- Seed MCQs (Section 1)
INSERT INTO mcq_questions (test_id, question, options, correct_option, points)
VALUES 
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'What will be the output of the following Java statement?\nSystem.out.println(10 + 20 + "Java" + 10 + 20);',
    '["60Java", "30Java1020", "30Java30", "1020Java1020"]'::jsonb,
    1,
    2
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'What is the output of the following conditional statement snippet?\nint a = 5, b = 10;\nif (a > 0 || ++b > 10) {\n    System.out.println(a + " " + b);\n}',
    '["5 11", "5 10", "6 11", "Compilation Error"]'::jsonb,
    1,
    2
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'What will be printed by the following loop with jump statements?\nint sum = 0;\nfor (int i = 1; i <= 5; i++) {\n    if (i == 3) continue;\n    if (i == 5) break;\n    sum += i;\n}\nSystem.out.println(sum);',
    '["15", "7", "3", "10"]'::jsonb,
    1,
    2
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'What will be the output of the following method overloading code?\nclass Test {\n    static void printVal(int x) { System.out.println("int: " + x); }\n    static void printVal(double x) { System.out.println("double: " + x); }\n    public static void main(String[] args) {\n        printVal(''A'');\n    }\n}',
    '["int: 65", "double: 65.0", "char: A", "Compilation Error"]'::jsonb,
    0,
    2
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'What will be printed when a Child object is created?\nclass Parent {\n    Parent() { System.out.print("Base "); }\n}\nclass Child extends Parent {\n    Child() { System.out.print("Derived "); }\n}\npublic class Main {\n    public static void main(String[] args) {\n        new Child();\n    }\n}',
    '["Derived Base ", "Base Derived ", "Derived ", "Base "]'::jsonb,
    1,
    2
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Which OOPs concept binds data members and member functions into a single unit and hides direct access using private access modifiers?',
    '["Polymorphism", "Encapsulation", "Inheritance", "Abstraction"]'::jsonb,
    1,
    2
)
ON CONFLICT DO NOTHING;

-- Seed Section 2 Coding Questions
INSERT INTO coding_questions (test_id, title, description, constraints, sample_input, sample_output, starter_code, test_cases, points)
VALUES 
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'User Greeting Program (Input / Output)',
    'Write a Java program that reads a user''s name from standard input and prints a personalized greeting message.\n\nInput Format:\nA single line containing the name of the user.\n\nOutput Format:\nPrint "Welcome " followed by the name.',
    '1 <= length of name <= 50',
    'Rahul',
    'Welcome Rahul',
    'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}',
    '[{"input": "Rahul", "output": "Welcome Rahul", "isHidden": false}, {"input": "Amit", "output": "Welcome Amit", "isHidden": false}, {"input": "John Doe", "output": "Welcome John Doe", "isHidden": true}, {"input": "Priya Sharma", "output": "Welcome Priya Sharma", "isHidden": true}]'::jsonb,
    10
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Student Class with Methods (OOPs Concepts)',
    'Write an Object-Oriented Java program demonstrating classes and encapsulation.\n\nCreate a class named "Student" with:\n1. Private fields: String name, int rollNo, int marks\n2. Constructor: Student(String name, int rollNo, int marks)\n3. Method: void displayInfo() that prints:\n   "Roll No: <rollNo> | Name: <name> | Marks: <marks>"\n4. Method: String getResult() that returns "Pass" if marks >= 40, else "Fail"\n\nIn the main method of class Main:\n- Read name, rollNo, and marks from input.\n- Create a Student object.\n- Call displayInfo() and print the result on the next line as "Result: <Pass/Fail>".',
    '0 <= marks <= 100\n1 <= rollNo <= 10000',
    'Aryan\n101\n85',
    'Roll No: 101 | Name: Aryan | Marks: 85\nResult: Pass',
    'import java.util.Scanner;\n\nclass Student {\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}',
    '[{"input": "Aryan\n101\n85", "output": "Roll No: 101 | Name: Aryan | Marks: 85\nResult: Pass", "isHidden": false}, {"input": "Riya\n102\n35", "output": "Roll No: 102 | Name: Riya | Marks: 35\nResult: Fail", "isHidden": false}, {"input": "Kavita\n103\n98", "output": "Roll No: 103 | Name: Kavita | Marks: 98\nResult: Pass", "isHidden": true}, {"input": "Suresh\n104\n40", "output": "Roll No: 104 | Name: Suresh | Marks: 40\nResult: Pass", "isHidden": true}]'::jsonb,
    10
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Print 1 to 50 Except 45 (Loops & Jumps)',
    'Write a Java program using a loop to print all numbers from 1 to 50 on a single line separated by spaces, but DO NOT print the number 45.\n\nUse a loop along with the "continue" keyword to skip 45.',
    'No input is given.',
    '',
    '1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 46 47 48 49 50',
    'public class Main {\n    public static void main(String[] args) {\n    }\n}',
    '[{"input": "", "output": "1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 46 47 48 49 50", "isHidden": false}]'::jsonb,
    10
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Voting Eligibility Checker (Conditional Statements)',
    'Write a Java program to check whether a person is eligible to vote based on their age.\n\nRules:\n- If age >= 18: Print "Eligible to Vote"\n- If 0 <= age < 18: Print "Not Eligible to Vote" on line 1, and "Years left: <X>" on line 2 (where X is 18 - age)\n- If age < 0: Print "Invalid Age"',
    '-100 <= age <= 150',
    '21',
    'Eligible to Vote',
    'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}',
    '[{"input": "21", "output": "Eligible to Vote", "isHidden": false}, {"input": "15", "output": "Not Eligible to Vote\nYears left: 3", "isHidden": false}, {"input": "18", "output": "Eligible to Vote", "isHidden": true}, {"input": "17", "output": "Not Eligible to Vote\nYears left: 1", "isHidden": true}, {"input": "-5", "output": "Invalid Age", "isHidden": true}]'::jsonb,
    10
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Calculate Area of Rectangle (Functions / Methods)',
    'Write a Java program that defines and calls a method to compute the area of a rectangle.\n\nMethod Signature:\nstatic int calculateArea(int length, int breadth)\n\nThe method should take two integer parameters and return their product (length * breadth).\nIn the main method, take length and breadth as input from the user, call calculateArea(), and print the result.',
    '1 <= length, breadth <= 10^4',
    '10 5',
    'Area = 50',
    'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}',
    '[{"input": "10 5", "output": "Area = 50", "isHidden": false}, {"input": "7 8", "output": "Area = 56", "isHidden": false}, {"input": "15 20", "output": "Area = 300", "isHidden": true}, {"input": "1 1", "output": "Area = 1", "isHidden": true}, {"input": "120 45", "output": "Area = 5400", "isHidden": true}]'::jsonb,
    10
)
ON CONFLICT DO NOTHING;
