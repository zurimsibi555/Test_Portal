'use client';

import { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Film,
  ArrowRight,
  ArrowDown,
} from 'lucide-react';

const SCENES = {
  'jvm-pipeline': [
    {
      title: 'Step 1: Write Source Code (Main.java)',
      caption: 'Developer writes human-readable Java code inside Main.java using JDK.',
    },
    {
      title: 'Step 2: Compile with javac',
      caption: 'javac checks syntax and translates Main.java into platform-independent Main.class Bytecode.',
    },
    {
      title: 'Step 3: Class Loader & Bytecode Verifier',
      caption: 'JVM starts via `java Main`, loads .class into memory, and verifies bytecode safety.',
    },
    {
      title: 'Step 4: Execution Engine (Interpreter + JIT)',
      caption: 'Interpreter + JIT Compiler convert hot bytecode into native CPU machine code (0s & 1s).',
    },
    {
      title: 'Step 5: Output Printed on Console',
      caption: 'CPU executes instructions and System.out prints the final output on screen!',
    },
  ],
  'loops-flow': [
    {
      title: 'Step 1: Initialization (int i = 1)',
      caption: 'Runs ONCE when the loop starts. Variable `i` is created with value 1.',
    },
    {
      title: 'Step 2: Condition Check (i <= 3)',
      caption: 'Before every iteration, condition `1 <= 3` is evaluated -> TRUE. Enter loop body.',
    },
    {
      title: 'Step 3: Loop Body Executes',
      caption: 'Prints `1 `, then moves to the update expression.',
    },
    {
      title: 'Step 4: Update (i++) -> i becomes 2',
      caption: 'i increments to 2, checks `2 <= 3` (TRUE), prints `2 `, then increments to 3 -> prints `3 `.',
    },
    {
      title: 'Step 5: Condition False (4 <= 3) -> Loop Exits',
      caption: 'When i becomes 4, `4 <= 3` is FALSE. Loop terminates cleanly.',
    },
  ],
  'conditionals-flow': [
    {
      title: 'Step 1: Input Value Arrives (marks = 82)',
      caption: 'Your program receives an input value and starts checking conditions from top to bottom.',
    },
    {
      title: 'Step 2: Check First Branch (marks >= 90)',
      caption: '82 >= 90 is FALSE, so Java skips the A+ block and moves to the next else-if.',
    },
    {
      title: 'Step 3: Match Found (marks >= 75)',
      caption: '82 >= 75 is TRUE! Java enters this block, sets Grade = "A", and skips all remaining branches.',
    },
    {
      title: 'Step 4: Print Result & Exit Ladder',
      caption: 'Only one matching branch runs. Output printed: "Grade A".',
    },
  ],
  'class-objects': [
    {
      title: 'Step 1: Define the Class Blueprint',
      caption: '`class Student` defines fields (name, rollNo) and method display(). Zero object Heap memory yet!',
    },
    {
      title: 'Step 2: Instantiate Object s1 (new Student())',
      caption: '`new Student()` allocates an independent object block in Heap; `s1` on Stack stores its address.',
    },
    {
      title: 'Step 3: Instantiate Object s2 (new Student())',
      caption: 'A second `new Student()` creates a separate Heap object for `s2` with its own fields.',
    },
    {
      title: 'Step 4: Invoke Methods via Dot Operator',
      caption: 'Calling `s1.display()` reads s1’s Heap data; `s2.display()` reads s2’s Heap data independently.',
    },
  ],
  'inheritance-types': [
    {
      title: '1. Single Inheritance (Parent -> Child)',
      caption: 'One subclass inherits from one superclass: `class Dog extends Animal`.',
    },
    {
      title: '2. Multilevel Inheritance (GrandParent -> Parent -> Child)',
      caption: 'Chain of classes: `Device -> Phone -> SmartPhone` inherits features down every level.',
    },
    {
      title: '3. Hierarchical Inheritance (1 Parent -> Multiple Children)',
      caption: 'Both `Circle` and `Rectangle` extend the same `Shape` parent class.',
    },
    {
      title: '4. Multiple Inheritance via Interfaces',
      caption: 'Classes cannot extend 2 classes (Diamond Problem), so a class uses `implements Printable, Rechargeable`.',
    },
  ],
  'polymorphism-dispatch': [
    {
      title: '1. Compile-Time: Method Overloading',
      caption: 'Same class has `add(int, int)` and `add(double, double)`. Compiler picks exact match at compile time.',
    },
    {
      title: '2. Overloading by Parameter Count',
      caption: 'Calling `calc.add(1, 2, 3)` matches the 3-parameter signature statically.',
    },
    {
      title: '3. Runtime: Upcasting (Parent ref -> Child object)',
      caption: '`Payment p = new UpiPayment();` — reference type is Payment, actual Heap object is UpiPayment.',
    },
    {
      title: '4. Dynamic Method Dispatch at Runtime',
      caption: 'At runtime, JVM inspects the actual Heap object and routes `p.pay(500)` to `UpiPayment.pay()`!',
    },
  ],
  'constructor-lifecycle': [
    {
      title: 'Step 1: `new Employee("Kabir", 205)` Called',
      caption: 'JVM allocates raw Heap memory for the new Employee object (including inherited Person fields).',
    },
    {
      title: 'Step 2: `super("Engineer")` Runs Parent Constructor First',
      caption: 'Before Employee’s body executes, `super(...)` initializes `Person.role = "Engineer"`.',
    },
    {
      title: 'Step 3: Employee Constructor Body Executes',
      caption: 'Employee constructor sets `this.name = "Kabir"` and `this.id = 205`.',
    },
    {
      title: 'Step 4: Ready Object Reference Returned',
      caption: 'Fully initialized Heap address is stored in Stack variable `e2`.',
    },
  ],
  'this-pointer': [
    {
      title: 'Step 1: Parameter Shadowing Problem',
      caption: 'Constructor `Student(String name)` has parameter `name` hiding instance field `name`.',
    },
    {
      title: 'Step 2: Without `this` -> Self-Assignment Bug',
      caption: 'Writing `name = name;` only reassigns the local Stack parameter to itself; Heap field stays null!',
    },
    {
      title: 'Step 3: With `this.name = name` -> Resolves to Heap Object',
      caption: '`this` holds the current object’s Heap address, storing `"Aryan"` into the Heap field.',
    },
    {
      title: 'Step 4: `this(...)` Chaining & `return this;`',
      caption: '`this(...)` delegates to another constructor on line 1; `return this;` enables fluent chaining.',
    },
  ],
};

export default function AnimatedExplainer({ animationType = 'jvm-pipeline' }) {
  const scenes = SCENES[animationType] || SCENES['jvm-pipeline'];
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMs, setSpeedMs] = useState(2600);

  useEffect(() => {
    setStep(0);
    setIsPlaying(true);
  }, [animationType]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % scenes.length);
    }, speedMs);
    return () => clearInterval(timer);
  }, [isPlaying, scenes.length, speedMs]);

  const currentScene = scenes[step] || scenes[0];

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
      {/* Player Header */}
      <div className="px-4 py-2.5 bg-[#FAF8F5] border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
            <Film className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-900">
              Animated Visual Explainer
            </div>
            <div className="text-[10px] text-stone-500">
              Frame {step + 1} of {scenes.length} &bull; {isPlaying ? 'Playing' : 'Paused'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSpeedMs((s) => (s === 2600 ? 1600 : 2600))}
            className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"
            title="Toggle playback speed"
          >
            {speedMs === 2600 ? '1.0x' : '1.5x'}
          </button>
          <button
            onClick={() => setStep((prev) => (prev - 1 + scenes.length) % scenes.length)}
            className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"
            title="Previous Frame"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={() => setStep((prev) => (prev + 1) % scenes.length)}
            className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"
            title="Next Frame"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setStep(0);
              setIsPlaying(true);
            }}
            className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Animated Stage Canvas */}
      <div className="p-5 bg-gradient-to-br from-[#FAF8F5] to-white min-h-[210px] flex flex-col justify-center">
        {animationType === 'jvm-pipeline' && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { label: 'Main.java', sub: 'Source Code' },
              { label: 'javac', sub: 'Compiler' },
              { label: 'Main.class', sub: 'Bytecode' },
              { label: 'JVM + JIT', sub: 'Verifier & Engine' },
              { label: 'Output', sub: 'Hello, Java!' },
            ].map((node, idx) => {
              const active = step === idx;
              const passed = step > idx;
              return (
                <div key={node.label} className="flex items-center gap-2">
                  <div
                    className={`px-3 py-2.5 rounded-xl border-2 text-center transition-all duration-500 min-w-[100px] ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-700 scale-105 shadow-md'
                        : passed
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-white text-stone-500 border-stone-200'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono">{node.label}</div>
                    <div className="text-[10px] opacity-85">{node.sub}</div>
                  </div>
                  {idx < 4 && (
                    <ArrowRight
                      className={`w-4 h-4 transition-colors duration-300 ${
                        passed ? 'text-emerald-700' : 'text-stone-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {animationType === 'conditionals-flow' && (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="px-4 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-xs font-mono font-bold text-amber-900">
              Input: marks = 82
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { cond: 'marks >= 90 -> A+', state: step === 1 ? 'checking' : step > 1 ? 'false' : 'idle' },
                { cond: 'marks >= 75 -> A', state: step === 2 || step === 3 ? 'true' : 'idle' },
                { cond: 'marks >= 60 -> B', state: step >= 3 ? 'skipped' : 'idle' },
              ].map((branch) => (
                <div
                  key={branch.cond}
                  className={`px-3.5 py-2.5 rounded-xl border-2 text-xs font-mono font-bold transition-all duration-500 ${
                    branch.state === 'true'
                      ? 'bg-emerald-700 text-white border-emerald-700 scale-105 shadow-md'
                      : branch.state === 'checking'
                      ? 'bg-amber-100 text-amber-950 border-amber-500 scale-105'
                      : branch.state === 'false'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 line-through opacity-70'
                      : branch.state === 'skipped'
                      ? 'bg-stone-100 text-stone-400 border-stone-200 opacity-50'
                      : 'bg-white text-stone-700 border-stone-200'
                  }`}
                >
                  {branch.cond}
                </div>
              ))}
            </div>
          </div>
        )}

        {animationType === 'loops-flow' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <div className="md:col-span-2 flex flex-wrap items-center gap-2 justify-center">
              {[
                { label: '1. int i = 1', activeAt: [0] },
                { label: '2. i <= 3 ?', activeAt: [1, 4] },
                { label: '3. print(i)', activeAt: [2] },
                { label: '4. i++', activeAt: [3] },
              ].map((box, idx) => {
                const active = box.activeAt.includes(step);
                return (
                  <div
                    key={box.label}
                    className={`px-3 py-2.5 rounded-xl border-2 font-mono text-xs font-bold transition-all duration-500 ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-700 scale-105 shadow-md'
                        : 'bg-white text-stone-700 border-stone-200'
                    }`}
                  >
                    {box.label}
                  </div>
                );
              })}
            </div>
            <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-stone-500">Variable i:</span>
                <span className="font-bold text-emerald-700">
                  {step < 3 ? 1 : step === 3 ? '2 -> 3' : 4}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Console:</span>
                <span className="font-bold text-amber-800">
                  {step < 2 ? '(empty)' : step === 2 ? '1 ' : '1 2 3 '}
                </span>
              </div>
            </div>
          </div>
        )}

        {animationType === 'class-objects' && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-5">
            <div
              className={`p-3.5 rounded-2xl border-2 transition-all duration-500 w-48 ${
                step === 0
                  ? 'bg-emerald-700 text-white border-emerald-700 scale-105 shadow-md'
                  : 'bg-amber-50 text-amber-950 border-amber-300'
              }`}
            >
              <div className="text-[10px] uppercase font-bold opacity-80">Class Blueprint</div>
              <div className="font-mono font-bold text-xs mt-1">class Student</div>
              <div className="text-[10px] font-mono mt-1 opacity-90">String name; int roll;</div>
            </div>

            <ArrowRight className="w-5 h-5 text-emerald-700 hidden md:block" />

            <div className="flex gap-3">
              {[
                { ref: 's1', name: '"Aryan"', roll: 101, showAt: 1 },
                { ref: 's2', name: '"Riya"', roll: 102, showAt: 2 },
              ].map((obj) => {
                const visible = step >= obj.showAt;
                const active = step === obj.showAt || step === 3;
                return (
                  <div
                    key={obj.ref}
                    className={`p-3 rounded-2xl border-2 transition-all duration-500 w-40 ${
                      !visible
                        ? 'opacity-25 bg-stone-100 border-stone-200 scale-95'
                        : active
                        ? 'bg-emerald-50 border-emerald-700 text-stone-900 shadow-md scale-105'
                        : 'bg-white border-stone-300 text-stone-800'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-emerald-700">
                      Heap Object ({obj.ref})
                    </div>
                    <div className="text-[11px] font-mono mt-1">name = {obj.name}</div>
                    <div className="text-[11px] font-mono">roll = {obj.roll}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {animationType === 'inheritance-types' && (
          <div className="flex flex-col items-center justify-center gap-3">
            {step === 0 && (
              <div className="flex items-center gap-3">
                <div className="px-4 py-2.5 rounded-xl bg-amber-50 border-2 border-amber-400 text-xs font-bold text-amber-950">
                  Animal (Parent)
                </div>
                <ArrowRight className="w-5 h-5 text-emerald-700 animate-pulse" />
                <div className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-md">
                  Dog extends Animal
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="px-3 py-2 rounded-xl bg-amber-50 border-2 border-amber-400 text-xs font-bold">
                  Device
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
                <div className="px-3 py-2 rounded-xl bg-emerald-100 border-2 border-emerald-500 text-xs font-bold text-emerald-900">
                  Phone
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
                <div className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-md">
                  SmartPhone
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="flex flex-col items-center gap-2">
                <div className="px-4 py-2 rounded-xl bg-amber-50 border-2 border-amber-400 text-xs font-bold">
                  Shape (Single Parent)
                </div>
                <div className="flex gap-8 text-emerald-700">
                  <ArrowDown className="w-4 h-4" />
                  <ArrowDown className="w-4 h-4" />
                </div>
                <div className="flex gap-3">
                  <div className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold">
                    Circle
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold">
                    Rectangle
                  </div>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-3">
                  <div className="px-3 py-2 rounded-xl bg-amber-50 border-2 border-amber-400 text-xs font-mono font-bold">
                    interface Printable
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-amber-50 border-2 border-amber-400 text-xs font-mono font-bold">
                    interface Rechargeable
                  </div>
                </div>
                <ArrowDown className="w-4 h-4 text-emerald-700" />
                <div className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-md">
                  class SmartPhone implements Printable, Rechargeable
                </div>
              </div>
            )}
          </div>
        )}

        {animationType === 'polymorphism-dispatch' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-3.5 rounded-2xl border-2 transition-all duration-500 ${
                step <= 1
                  ? 'bg-emerald-50 border-emerald-700 shadow-sm'
                  : 'bg-white border-stone-200 opacity-65'
              }`}
            >
              <div className="text-[11px] font-bold text-emerald-800 uppercase mb-1.5">
                Compile-Time (Overloading)
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className={step === 0 ? 'font-bold text-emerald-700' : 'text-stone-600'}>
                  add(int, int) &rarr; matches (2, 3)
                </div>
                <div className={step === 1 ? 'font-bold text-emerald-700' : 'text-stone-600'}>
                  add(int, int, int) &rarr; matches (1, 2, 3)
                </div>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border-2 transition-all duration-500 ${
                step >= 2
                  ? 'bg-amber-50 border-amber-600 shadow-sm'
                  : 'bg-white border-stone-200 opacity-65'
              }`}
            >
              <div className="text-[11px] font-bold text-amber-900 uppercase mb-1.5">
                Runtime (Overriding + Dispatch)
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="text-stone-700">Payment p = new UpiPayment();</div>
                <div className={step === 3 ? 'font-bold text-emerald-700' : 'text-stone-600'}>
                  p.pay(500) &rarr; UpiPayment.pay()!
                </div>
              </div>
            </div>
          </div>
        )}

        {animationType === 'constructor-lifecycle' && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              '1. new Employee()',
              '2. super("Engineer")',
              '3. this.name = "Kabir"',
              '4. Return Reference',
            ].map((label, idx) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`px-3 py-2.5 rounded-xl border-2 text-xs font-mono font-bold transition-all duration-500 ${
                    step === idx
                      ? 'bg-emerald-700 text-white border-emerald-700 scale-105 shadow-md'
                      : step > idx
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-stone-500 border-stone-200'
                  }`}
                >
                  {label}
                </div>
                {idx < 3 && <ArrowRight className="w-4 h-4 text-stone-300" />}
              </div>
            ))}
          </div>
        )}

        {animationType === 'this-pointer' && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-5">
            <div className="p-3.5 rounded-2xl bg-white border-2 border-stone-300 w-52 font-mono text-[11px] space-y-1">
              <div className="text-[10px] font-sans font-bold uppercase text-stone-500">
                Stack (Constructor Scope)
              </div>
              <div>param name = &quot;Aryan&quot;</div>
              <div
                className={`px-2 py-1 rounded ${
                  step >= 2 ? 'bg-emerald-700 text-white font-bold' : 'bg-amber-50 text-amber-900'
                }`}
              >
                this = 0x4A9F (Heap addr)
              </div>
            </div>

            <ArrowRight
              className={`w-6 h-6 transition-all duration-500 ${
                step >= 2 ? 'text-emerald-700 scale-125' : 'text-rose-500'
              }`}
            />

            <div
              className={`p-3.5 rounded-2xl border-2 w-52 font-mono text-[11px] space-y-1 transition-all duration-500 ${
                step >= 2
                  ? 'bg-emerald-50 border-emerald-700 shadow-md'
                  : 'bg-rose-50 border-rose-300'
              }`}
            >
              <div className="text-[10px] font-sans font-bold uppercase text-stone-600">
                Heap Object @ 0x4A9F
              </div>
              <div className="font-bold">
                this.name = {step >= 2 ? '"Aryan"' : 'null (bug!)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Caption & Timeline Scrubber */}
      <div className="px-4 py-3 bg-[#FAF8F5] border-t border-stone-200 space-y-2.5">
        <div>
          <div className="text-xs font-bold text-stone-900">{currentScene.title}</div>
          <p className="text-xs text-stone-600 mt-0.5">{currentScene.caption}</p>
        </div>

        {/* Interactive Progress Dots / Bars */}
        <div className="flex items-center gap-1.5">
          {scenes.map((sc, idx) => (
            <button
              key={sc.title}
              onClick={() => {
                setStep(idx);
                setIsPlaying(false);
              }}
              className={`h-2 flex-1 rounded-full transition-all ${
                idx === step
                  ? 'bg-emerald-700'
                  : idx < step
                  ? 'bg-emerald-300'
                  : 'bg-stone-200 hover:bg-stone-300'
              }`}
              title={sc.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
