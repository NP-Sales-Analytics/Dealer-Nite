import { NextResponse } from 'next/server';
import { TargetAccessError } from '@/lib/target/access';
import { TargetServiceError } from '@/lib/target/service';

export function targetErrorResponse(error: unknown) {
  if (error instanceof TargetAccessError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 403 });
  }
  if (error instanceof TargetServiceError) {
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
}
