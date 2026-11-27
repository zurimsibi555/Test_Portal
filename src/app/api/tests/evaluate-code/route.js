import { POST as submitCodePost } from '@/app/api/submit-code/route';

// Alias route: /api/tests/evaluate-code shares exact evaluation logic with /api/submit-code
export const POST = submitCodePost;
