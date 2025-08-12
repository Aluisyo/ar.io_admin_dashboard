import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { gatewayUrl, adminApiKey } = await request.json();
    if (!gatewayUrl || !adminApiKey) {
      return NextResponse.json({ error: 'Gateway URL and Admin API Key are required.' }, { status: 400 });
    }

    console.log(`Proxy prune-stable-data-items: POST ${gatewayUrl}/ar-io/admin/prune-stable-data-items with key ${adminApiKey}`);
    const response = await fetch(`${gatewayUrl}/ar-io/admin/prune-stable-data-items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminApiKey}`,
        'X-Admin-Api-Key': adminApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AR.IO Prune Stable Data Items API error: ${response.status} - ${errorText}`);
      return NextResponse.json({ error: `AR.IO Gateway Error: ${response.status} - ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error calling AR.IO prune-stable-data-items:', error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
