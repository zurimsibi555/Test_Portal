import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * Remove internal Windows / temp filesystem paths from error messages
 * e.g. "C:\Users\...\Temp\java_xyz\Main.java:7: error: ..." -> "Main.java:7: error: ..."
 */
export function sanitizeErrorMessage(errorStr, tempDir = '') {
  if (!errorStr || typeof errorStr !== 'string') return '';
  let sanitized = errorStr;
  if (tempDir) {
    const escapedDir = tempDir.replace(/\\/g, '\\\\');
    sanitized = sanitized.replace(new RegExp(escapedDir + '[\\\\/]', 'g'), '');
  }
  // Remove absolute Windows temp paths
  sanitized = sanitized.replace(/[A-Za-z]:\\[^:\n\r]+[\\/]([A-Za-z0-9_]+\.java)/g, '$1');
  return sanitized.trim();
}

/**
 * Robust Java source preprocessor:
 * 1. Removes package declarations.
 * 2. Neutralizes duplicate "Scanner <var> = new Scanner(System.in);" declarations into assignments.
 * 3. Identifies the class containing "public static void main" even if helper classes appear before it.
 * 4. Ensures only the main class has the "public" access modifier so javac never rejects multiple public classes.
 */
export function normalizeJavaCode(code) {
  let cleanedCode = (code || '').replace(/^\s*package\s+[\w\.]+;\s*/gm, '');

  // Normalize duplicate Scanner sc = new Scanner(System.in); declarations in the same code
  const seenScanners = new Set();
  cleanedCode = cleanedCode.replace(
    /\bScanner\s+([A-Za-z0-9_]+)\s*=\s*new\s+Scanner\s*\(\s*System\.in\s*\)\s*;/g,
    (match, varName) => {
      if (seenScanners.has(varName)) {
        return `${varName} = new Scanner(System.in);`;
      }
      seenScanners.add(varName);
      return match;
    }
  );

  // 1. Accurately find the class containing main method
  let className = 'Main';
  const mainPos = cleanedCode.search(/public\s+static\s+void\s+main\s*\(/);
  if (mainPos !== -1) {
    const codeBeforeMain = cleanedCode.slice(0, mainPos);
    const classMatches = [...codeBeforeMain.matchAll(/(?:public\s+)?class\s+([A-Za-z0-9_]+)/g)];
    if (classMatches.length > 0) {
      className = classMatches[classMatches.length - 1][1];
    }
  } else {
    const publicClassMatch = cleanedCode.match(/public\s+class\s+([A-Za-z0-9_]+)/);
    if (publicClassMatch) {
      className = publicClassMatch[1];
    } else {
      const anyClassMatch = cleanedCode.match(/class\s+([A-Za-z0-9_]+)/);
      if (anyClassMatch) {
        className = anyClassMatch[1];
      }
    }
  }

  // 2. Ensure only className has the "public" modifier to avoid javac multiple public class errors
  let normalizedCode = cleanedCode.replace(/public\s+class\s+([A-Za-z0-9_]+)/g, (match, cName) => {
    return cName === className ? `public class ${cName}` : `class ${cName}`;
  });
  if (!normalizedCode.includes(`public class ${className}`)) {
    normalizedCode = normalizedCode.replace(new RegExp(`\\bclass\\s+${className}\\b`), `public class ${className}`);
  }

  return { className, normalizedCode };
}

/**
 * Standardize output for comparison
 */
export function normalizeOutput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Flexible output comparator for test cases
 */
export function compareOutputs(actual, expected) {
  const actualNorm = normalizeOutput(actual);
  const expectedNorm = normalizeOutput(expected);

  if (actualNorm === expectedNorm) return true;
  // Whitespace-collapsed comparison (e.g. single line vs multiple lines with spaces)
  if (actualNorm.replace(/\s+/g, ' ') === expectedNorm.replace(/\s+/g, ' ')) return true;
  // Case-insensitive comparison
  if (actualNorm.toLowerCase() === expectedNorm.toLowerCase()) return true;
  // Equation spacing normalization (e.g. "Area = 50" vs "Area=50")
  if (
    actualNorm.replace(/\s*=\s*/g, ' = ').toLowerCase() ===
    expectedNorm.replace(/\s*=\s*/g, ' = ').toLowerCase()
  ) {
    return true;
  }
  return false;
}

/**
 * Execute Java code locally with sandboxed directory, stdin piping, and execution timeout.
 * Uses JDK single-file launcher (`java -XX:TieredStopAtLevel=1 Main.java`) to avoid
 * spawning two separate JVMs (javac + java), cutting Windows cold-start time nearly in half.
 */
export async function executeJavaLocal(code, stdin = '', timeoutMs = 20000) {
  const runId = `java_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const tempDir = path.join(os.tmpdir(), runId);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    const { className, normalizedCode } = normalizeJavaCode(code);
    const filePath = path.join(tempDir, `${className}.java`);
    await fs.writeFile(filePath, normalizedCode, 'utf8');

    const runStartTime = Date.now();
    const runResult = await new Promise((resolve) => {
      const javaProc = spawn('java', ['-XX:TieredStopAtLevel=1', filePath], { shell: false });

      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      const timer = setTimeout(() => {
        isTimedOut = true;
        try {
          javaProc.kill('SIGKILL');
        } catch {}
        resolve({
          success: false,
          output: stdout,
          error: 'Time Limit Exceeded (TLE): Program exceeded 20 seconds execution limit.',
        });
      }, timeoutMs);

      // Prevent unhandled EPIPE on stdin
      javaProc.stdin.on('error', () => {});

      const inputPayload = stdin !== undefined && stdin !== null ? String(stdin) : '';
      if (inputPayload) {
        const payloadWithNewline = inputPayload.endsWith('\n') ? inputPayload : inputPayload + '\n';
        try {
          javaProc.stdin.write(payloadWithNewline);
        } catch {}
      }
      try {
        javaProc.stdin.end();
      } catch {}

      javaProc.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > 512 * 1024) {
          try {
            javaProc.kill();
          } catch {}
        }
      });

      javaProc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      javaProc.on('close', (exitCode) => {
        clearTimeout(timer);
        if (isTimedOut) return;

        resolve({
          success: exitCode === 0,
          output: stdout,
          error: exitCode === 0 ? '' : sanitizeErrorMessage(stderr || `Process exited with code ${exitCode}`, tempDir),
        });
      });

      javaProc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          output: stdout,
          error: `java not found or execution error: ${err.message}`,
        });
      });
    });

    return {
      success: runResult.success,
      output: runResult.output,
      error: runResult.error,
      durationMs: Date.now() - runStartTime,
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: sanitizeErrorMessage(err.message, tempDir),
      durationMs: 0,
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Fallback to Remote Piston Engine API if local Java isn't available
 */
export async function executeJavaRemote(code, stdin = '') {
  const apiUrl = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute';
  const startTime = Date.now();
  const { className, normalizedCode } = normalizeJavaCode(code);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'java',
        version: '15.0.2',
        files: [{ name: `${className}.java`, content: normalizedCode }],
        stdin: stdin || '',
      }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await response.json();
    const compileError = data.compile?.stderr || '';
    const runError = data.run?.stderr || '';
    const stdout = data.run?.stdout || '';
    const combinedError = compileError || runError;

    return {
      success: !combinedError,
      output: stdout,
      error: sanitizeErrorMessage(combinedError),
      durationMs: Date.now() - startTime,
    };
  } catch (fetchErr) {
    return {
      success: false,
      output: '',
      error: `Remote execution failed: ${fetchErr.message}`,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Universal Java runner: uses local execution first, falls back to remote
 */
export async function runJavaCode(code, stdin = '') {
  try {
    const localResult = await executeJavaLocal(code, stdin);
    // If local execution failed due to javac/java binary not found, try remote
    if (
      localResult.error &&
      (localResult.error.includes('not found') ||
        localResult.error.includes('ENOENT') ||
        localResult.error.includes('execution error'))
    ) {
      return await executeJavaRemote(code, stdin);
    }
    return localResult;
  } catch {
    return await executeJavaRemote(code, stdin);
  }
}

/**
 * High-performance test suite evaluator:
 * Compiles the Java code ONCE, then runs all test cases sequentially against the compiled bytecode.
 */
export async function evaluateJavaTestSuite(code, testCases = [], timeoutMs = 8000) {
  const runId = `eval_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const tempDir = path.join(os.tmpdir(), runId);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    const { className, normalizedCode } = normalizeJavaCode(code);
    const filePath = path.join(tempDir, `${className}.java`);
    await fs.writeFile(filePath, normalizedCode, 'utf8');

    // 1. Compile ONCE using javac with fast startup flags
    const compileResult = await new Promise((resolve) => {
      let compileErr = '';
      let compileOut = '';
      const javac = spawn('javac', ['-J-XX:TieredStopAtLevel=1', '-g:none', filePath], { shell: false });

      const compileTimer = setTimeout(() => {
        try {
          javac.kill();
        } catch {}
        resolve({
          success: false,
          error: 'Compilation timed out (took longer than 25 seconds).',
        });
      }, 25000);

      javac.stdout.on('data', (d) => {
        compileOut += d.toString();
      });

      javac.stderr.on('data', (d) => {
        compileErr += d.toString();
      });

      javac.on('close', (exitCode) => {
        clearTimeout(compileTimer);
        if (exitCode === 0) {
          resolve({ success: true, warnings: compileErr });
        } else {
          resolve({
            success: false,
            error: sanitizeErrorMessage(compileErr || compileOut || `Compilation failed with exit code ${exitCode}`, tempDir),
          });
        }
      });

      javac.on('error', (err) => {
        clearTimeout(compileTimer);
        resolve({
          success: false,
          error: `javac not found or execution error: ${err.message}`,
        });
      });
    });

    // If compilation failed
    if (!compileResult.success) {
      // If javac binary not found locally, fallback to sequential remote execution
      if (
        compileResult.error.includes('not found') ||
        compileResult.error.includes('ENOENT')
      ) {
        return await fallbackRemoteEvaluation(code, testCases);
      }

      // Local compilation error: return immediately
      return {
        hasCompilationError: true,
        compilationError: compileResult.error,
        results: testCases.map((tc, idx) => ({
          testCaseNumber: idx + 1,
          isHidden: !!tc.isHidden,
          passed: false,
          input: tc.isHidden ? '[Hidden Test Case]' : tc.input,
          expected: tc.isHidden ? '[Hidden]' : (tc.output || '').trim(),
          actual: '[Compilation Error]',
          error: compileResult.error,
          durationMs: 0,
        })),
      };
    }

    // 2. Run each test case against the compiled bytecode
    const testResults = [];
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const stdinPayload = tc.input !== undefined && tc.input !== null ? String(tc.input) : '';

      const tcStartTime = Date.now();
      const runResult = await new Promise((resolve) => {
        const javaProc = spawn('java', ['-XX:TieredStopAtLevel=1', '-cp', tempDir, className], { shell: false });

        let stdout = '';
        let stderr = '';
        let isTimedOut = false;

        const timer = setTimeout(() => {
          isTimedOut = true;
          try {
            javaProc.kill('SIGKILL');
          } catch {}
          resolve({
            success: false,
            output: stdout,
            error: 'Time Limit Exceeded (TLE): Execution exceeded 3.5 seconds.',
          });
        }, timeoutMs);

        // Safe stdin
        javaProc.stdin.on('error', () => {});

        if (stdinPayload) {
          const payloadWithNewline = stdinPayload.endsWith('\n') ? stdinPayload : stdinPayload + '\n';
          try {
            javaProc.stdin.write(payloadWithNewline);
          } catch {}
        }
        try {
          javaProc.stdin.end();
        } catch {}

        javaProc.stdout.on('data', (d) => {
          stdout += d.toString();
          if (stdout.length > 512 * 1024) {
            try {
              javaProc.kill();
            } catch {}
          }
        });

        javaProc.stderr.on('data', (d) => {
          stderr += d.toString();
        });

        javaProc.on('close', (exitCode) => {
          clearTimeout(timer);
          if (isTimedOut) return;
          resolve({
            success: exitCode === 0,
            output: stdout,
            error: exitCode === 0 ? '' : sanitizeErrorMessage(stderr || `Exited with code ${exitCode}`, tempDir),
          });
        });

        javaProc.on('error', (err) => {
          clearTimeout(timer);
          resolve({
            success: false,
            output: stdout,
            error: `Execution error: ${err.message}`,
          });
        });
      });

      const actualRaw = (runResult.output || '').replace(/\r\n/g, '\n');
      const expectedRaw = (tc.output || '').replace(/\r\n/g, '\n');
      const isPassed = runResult.success && compareOutputs(actualRaw, expectedRaw);

      testResults.push({
        testCaseNumber: i + 1,
        isHidden: !!tc.isHidden,
        passed: isPassed,
        input: tc.isHidden ? '[Hidden Test Case]' : tc.input,
        expected: tc.isHidden ? '[Hidden]' : expectedRaw.trim(),
        actual: tc.isHidden ? (isPassed ? '[Passed]' : '[Mismatch]') : (actualRaw.trim() || '(no output)'),
        error: runResult.error || null,
        durationMs: Date.now() - tcStartTime,
      });
    }

    return {
      hasCompilationError: false,
      compilationError: null,
      results: testResults,
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Fallback remote evaluation against Piston if local environment lacks javac
 */
async function fallbackRemoteEvaluation(code, testCases) {
  const testResults = [];
  let compilationError = null;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const exec = await executeJavaRemote(code, tc.input || '');

    if (!exec.success && exec.error && (exec.error.includes('error:') || exec.error.includes('Compilation failed'))) {
      compilationError = exec.error;
    }

    const actualRaw = (exec.output || '').replace(/\r\n/g, '\n');
    const expectedRaw = (tc.output || '').replace(/\r\n/g, '\n');
    const isPassed = exec.success && compareOutputs(actualRaw, expectedRaw);

    testResults.push({
      testCaseNumber: i + 1,
      isHidden: !!tc.isHidden,
      passed: isPassed,
      input: tc.isHidden ? '[Hidden Test Case]' : tc.input,
      expected: tc.isHidden ? '[Hidden]' : expectedRaw.trim(),
      actual: tc.isHidden ? (isPassed ? '[Passed]' : '[Mismatch]') : (actualRaw.trim() || '(no output)'),
      error: exec.error || null,
      durationMs: exec.durationMs,
    });

    if (compilationError && i === 0) {
      for (let j = 1; j < testCases.length; j++) {
        testResults.push({
          testCaseNumber: j + 1,
          isHidden: !!testCases[j].isHidden,
          passed: false,
          input: testCases[j].isHidden ? '[Hidden Test Case]' : testCases[j].input,
          expected: testCases[j].isHidden ? '[Hidden]' : (testCases[j].output || '').trim(),
          actual: '[Compilation Error]',
          error: compilationError,
          durationMs: 0,
        });
      }
      break;
    }
  }

  return {
    hasCompilationError: !!compilationError,
    compilationError: compilationError || null,
    results: testResults,
  };
}
