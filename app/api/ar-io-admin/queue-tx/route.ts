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
      return NextResponse.json({ error: 'Gateway URL, Admin API Key, and Transaction ID are required.' }, { status: 400 });
    }

    const response = await fetch(`${gatewayUrl}/ar-io/admin/queue-tx`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminApiKey}`,
          'X-Admin-Api-Key': adminApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AR.IO Queue TX API error: ${response.status} - ${errorText}`);
      return NextResponse.json({ error: `AR.IO Gateway Error: ${response.status} - ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error queuing AR.IO transaction:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
