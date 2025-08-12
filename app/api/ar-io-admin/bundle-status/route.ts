import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { gatewayUrl, adminApiKey, id } = await request.json();
    if (!gatewayUrl || !adminApiKey || !id) {
      return NextResponse.json({ error: 'Gateway URL, Admin API Key, and Bundle ID are required.' }, { status: 400 });
    }

    console.log(`Proxy bundle-status: GET ${gatewayUrl}/ar-io/admin/bundle-status/${id} with key ${adminApiKey}`);
    const response = await fetch(`${gatewayUrl}/ar-io/admin/bundle-status/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminApiKey}`,
        'X-Admin-Api-Key': adminApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AR.IO Bundle Status API error: ${response.status} - ${errorText}`);
      return NextResponse.json({ error: `AR.IO Gateway Error: ${response.status} - ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error calling AR.IO bundle-status:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
