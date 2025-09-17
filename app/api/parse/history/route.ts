import { NextRequest, NextResponse } from 'next/server';
import { ParseStorageService } from '@/lib/services/parse-storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'pdf' | 'excel' || 'pdf';
    const limit = parseInt(searchParams.get('limit') || '10');

    const storageService = new ParseStorageService();
    const history = await storageService.getParseHistory(type, limit);

    return NextResponse.json({
      success: true,
      data: history,
      type,
    });
  } catch (error: any) {
    console.error('History fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}