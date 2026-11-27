import { NextResponse } from 'next/server';
import { getStore, saveStore } from '@/lib/store';
import { deleteSubmissionPdf, clearAllSubmissionPdfs } from '@/lib/pdfReport';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const store = getStore();
    const isAdmin = verifyAdmin(req);
    return NextResponse.json(
      {
        success: true,
        isAdmin,
        serverTimeMs: Date.now(),
        submissionCount: Array.isArray(store.submissions) ? store.submissions.length : 0,
        tests: store.tests,
        mcqQuestions: store.mcqQuestions,
        codingQuestions: store.codingQuestions,
        submissions: isAdmin ? store.submissions : [],
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authorized = verifyAdmin(req);
    if (!authorized) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Invalid admin secret.' }, { status: 401 });
    }

    const body = await req.json();
    const { type } = body;
    const store = getStore();

    // 1. Create New Test
    if (type === 'test') {
      const { title, description, durationMinutes, scheduledStartTime, entryWindowMinutes } = body;
      const newTest = {
        id: `test_${Date.now()}`,
        title,
        description: description || '',
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        scheduledStartTime: scheduledStartTime || '2026-11-28T13:00:00+05:30',
        entryWindowMinutes: parseInt(entryWindowMinutes, 10) || 30,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      store.tests.unshift(newTest);
      saveStore(store);
      return NextResponse.json({ success: true, test: newTest });
    }

    // 2. Add MCQ Question
    if (type === 'mcq') {
      const { testId, question, options, correctOption, points } = body;
      const newMcq = {
        id: `mcq_${Date.now()}`,
        testId,
        question,
        options: options || [],
        correctOption: parseInt(correctOption, 10) || 0,
        points: parseFloat(points) || 2.5
      };
      store.mcqQuestions.push(newMcq);
      saveStore(store);
      return NextResponse.json({ success: true, question: newMcq });
    }

    // 3. Add Coding Question (Java)
    if (type === 'coding') {
      const { testId, title, description, constraints, sampleInput, sampleOutput, testCases, points, starterCode } = body;
      const newCoding = {
        id: `code_${Date.now()}`,
        testId,
        title,
        description,
        constraints: constraints || '',
        sampleInput: sampleInput || '',
        sampleOutput: sampleOutput || '',
        testCases: testCases || [],
        points: parseInt(points, 10) || 10,
        starterCode: starterCode || `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}`
      };
      store.codingQuestions.push(newCoding);
      saveStore(store);
      return NextResponse.json({ success: true, question: newCoding });
    }

    return NextResponse.json({ success: false, message: 'Invalid entity type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const { testId, scheduledStartTime, entryWindowMinutes, durationMinutes, alwaysOpen } = await req.json();
    const store = getStore();
    const test = store.tests.find((t) => t.id === testId);
    if (!test) {
      return NextResponse.json({ success: false, message: 'Test not found' }, { status: 404 });
    }
    if (scheduledStartTime) test.scheduledStartTime = scheduledStartTime;
    if (entryWindowMinutes !== undefined) test.entryWindowMinutes = parseInt(entryWindowMinutes, 10) || 30;
    if (durationMinutes !== undefined) test.durationMinutes = parseInt(durationMinutes, 10) || 45;
    if (alwaysOpen !== undefined) test.alwaysOpen = Boolean(alwaysOpen);
    saveStore(store);
    return NextResponse.json({ success: true, test });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    if (!verifyAdmin(req)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('submissionId');
    const clearAll = searchParams.get('clearAll') === 'true';

    const store = getStore();

    if (clearAll) {
      store.submissions = [];
      store.sessions = {};
      saveStore(store);
      clearAllSubmissionPdfs();
      return NextResponse.json({ success: true, message: 'All test reports and sessions cleared.' });
    }

    if (submissionId) {
      const target = store.submissions.find((s) => s.id === submissionId);
      if (!target) {
        return NextResponse.json({ success: false, message: 'Submission not found' }, { status: 404 });
      }
      store.submissions = store.submissions.filter((s) => s.id !== submissionId);
      saveStore(store);
      deleteSubmissionPdf(submissionId);
      return NextResponse.json({ success: true, message: 'Report deleted successfully.' });
    }

    return NextResponse.json({ success: false, message: 'submissionId or clearAll=true is required' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
