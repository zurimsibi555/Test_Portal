import { NextResponse } from 'next/server';
import { runJavaCode } from '@/lib/javaCompiler';

export async function POST(req) {
  try {
    const { code, stdin } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Java code is required',
          output: '',
          error: 'No code provided.',
        },
        { status: 400 }
      );
    }

    const result = await runJavaCode(code, stdin || '');

    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      durationMs: result.durationMs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while executing Java code',
        output: '',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
