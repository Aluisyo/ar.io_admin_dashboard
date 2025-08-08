import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';



export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminApiKey = process.env.ADMIN_API_KEY;
    if (!adminApiKey) {
      return NextResponse.json({ error: 'ADMIN_API_KEY not set in environment.' }, { status: 404 });
    }
    return NextResponse.json({ adminApiKey });
  } catch (error: any) {
    console.error('Error fetching ADMIN_API_KEY:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
