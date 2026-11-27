import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { evaluateJavaTestSuite } from '@/lib/javaCompiler';

export async function POST(req) {
  try {
    const { questionId, studentCode } = await req.json();

    if (!questionId || !studentCode) {
      return NextResponse.json(
        { success: false, message: 'Question ID and student code are required' },
        { status: 400 }
      );
    }

    let question = null;

    // 1. Fetch from Supabase if configured
    if (supabase) {
      try {
        const { data } = await supabase
          .from('coding_questions')
          .select('*')
          .eq('id', questionId)
          .single();
        if (data) {
          question = {
            ...data,
            testCases: data.test_cases || data.testCases || [],
            points: data.points || 10,
          };
        }
      } catch {
        // Fallback to local store
      }
    }

    // 2. Fallback to local store
    if (!question) {
      const store = getStore();
      question = store.codingQuestions.find((q) => q.id === questionId);
    }

    if (!question) {
      return NextResponse.json(
        { success: false, message: `Question not found: ${questionId}` },
        { status: 404 }
      );
    }

    const testCases = question.test_cases || question.testCases || [];
    const evalResult = await evaluateJavaTestSuite(studentCode, testCases);

    const totalTests = testCases.length;
    const passedCount = (evalResult.results || []).filter((r) => r.passed).length;
    const maxPoints = Number(question.points ?? 5);
    const score = totalTests > 0 ? Number(((passedCount / totalTests) * maxPoints).toFixed(2)) : 0;

    return NextResponse.json({
      success: true,
      totalTests,
      passedTests: passedCount,
      score,
      maxScore: maxPoints,
      results: evalResult.results,
      hasCompilationError: evalResult.hasCompilationError,
      compilationError: evalResult.compilationError || null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
