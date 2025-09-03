import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { readEnvFile, updateEnvFile } from '@/lib/env-utils';
import { join } from 'path';
import { homedir } from 'os';

function expandPath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace(/^~(?=$|\/|\\)/, homedir())
  }
  return path
}

// Use the AR_IO_NODE_PATH environment variable to locate the .env file
const AR_IO_NODE_PATH = expandPath(process.env.AR_IO_NODE_PATH || '~/ar-io-node');
const ENV_FILE_PATH = join(AR_IO_NODE_PATH, '.env');

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const env = await readEnvFile(ENV_FILE_PATH);
    const unbundleFilter = env.ANS104_UNBUNDLE_FILTER || '';
    const indexFilter = env.ANS104_INDEX_FILTER || '';
    const webhookIndexFilter = env.WEBHOOK_INDEX_FILTER || '';
    const webhookBlockFilter = env.WEBHOOK_BLOCK_FILTER || '';

    // Helper to safely parse JSON or return original string if invalid
    const safeParse = (jsonString: string) => {
      try {
        return jsonString ? JSON.parse(jsonString) : {};
      } catch (e) {
        console.warn(`Filter string is not valid JSON, returning as string: ${jsonString}`);
        return jsonString; // Return as string if not valid JSON
      }
    };

    return NextResponse.json({
      unbundleFilter: safeParse(unbundleFilter),
      indexFilter: safeParse(indexFilter),
      webhookIndexFilter: safeParse(webhookIndexFilter),
      webhookBlockFilter: safeParse(webhookBlockFilter),
    });
  } catch (error: any) {
    console.error('Error fetching filters from .env:', error);
    return NextResponse.json({
      unbundleFilter: {},
      indexFilter: {},
      webhookIndexFilter: {},
      webhookBlockFilter: {},
      error: `Failed to read filters: ${error.message}`
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const requestData = await request.json();
    console.log('POST /api/filters - Received data:', JSON.stringify(requestData, null, 2));
    
    const { ANS104_UNBUNDLE_FILTER, ANS104_INDEX_FILTER, WEBHOOK_INDEX_FILTER, WEBHOOK_BLOCK_FILTER } = requestData;

    // Stringify the JSON objects for storage in .env
    const updates: Record<string, string> = {};
    
    // Ensure each filter is stringified, even if it's an empty object
    updates.ANS104_UNBUNDLE_FILTER = JSON.stringify(ANS104_UNBUNDLE_FILTER || {});
    updates.ANS104_INDEX_FILTER = JSON.stringify(ANS104_INDEX_FILTER || {});
    updates.WEBHOOK_INDEX_FILTER = JSON.stringify(WEBHOOK_INDEX_FILTER || {});
    updates.WEBHOOK_BLOCK_FILTER = JSON.stringify(WEBHOOK_BLOCK_FILTER || {});
    
    console.log('POST /api/filters - Updates to write to .env:', updates);
    console.log('POST /api/filters - Writing to path:', ENV_FILE_PATH);

    await updateEnvFile(ENV_FILE_PATH, updates);

    return NextResponse.json({ success: true, message: 'Filters saved successfully to .env' });
  } catch (error: any) {
    console.error('Error saving filters to .env:', error);
    return NextResponse.json({ error: `Failed to save filters: ${error.message}. Ensure valid JSON for all filter types.` }, { status: 500 });
  }
}
