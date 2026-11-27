import { NextResponse } from 'next/server';
import { getStore, saveStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      test_id,
      testId,
      title,
      description,
      constraints,
      sample_input,
      sampleInput,
      sample_output,
      sampleOutput,
      starter_code,
      starterCode,
      test_cases,
      testCases,
      points,
    } = body;

    const finalTestId = test_id || testId;
    if (!finalTestId || !title || !description) {
      return NextResponse.json(
        { success: false, message: 'test_id, title, and description are required' },
        { status: 400 }
      );
    }

    const sInput = sample_input ?? sampleInput ?? '';
    const sOutput = sample_output ?? sampleOutput ?? '';
    const sCode = starter_code ?? starterCode ?? 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}';
    const tCases = test_cases ?? testCases ?? [];
    const pts = parseInt(points, 10) || 10;

    // 1. Try Supabase if configured
    if (supabase) {
      const { data, error } = await supabase
        .from('coding_questions')
        .insert([
          {
            test_id: finalTestId,
            title,
            description,
            constraints: constraints || '',
            sample_input: sInput,
            sample_output: sOutput,
            starter_code: sCode,
            test_cases: tCases,
            points: pts,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, question: data });
      }
    }

    // 2. Fallback to Local Persistent Store
    const store = getStore();
    const newQuestion = {
      id: `code_${Date.now()}`,
      testId: finalTestId,
      title,
      description,
      constraints: constraints || '',
      sampleInput: sInput,
      sampleOutput: sOutput,
      starterCode: sCode,
      testCases: tCases,
      points: pts,
      createdAt: new Date().toISOString(),
    };

    store.codingQuestions.push(newQuestion);
    saveStore(store);

    return NextResponse.json({ success: true, question: newQuestion });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
