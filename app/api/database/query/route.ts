import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { join } from 'path'

const execAsync = promisify(exec)

// Assuming the AR_IO_NODE_PATH points to the base directory where data and configs are
const AR_IO_NODE_PATH = process.env.AR_IO_NODE_PATH || '/tmp/ar-io-node';
const GATEWAY_SQLITE_DB_PATH = join(AR_IO_NODE_PATH, 'data', 'gateway.sqlite');

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { dbType, service, query } = await request.json()

    if (!dbType || !query) {
      return NextResponse.json({ error: 'Database type and query are required.' }, { status: 400 })
    }

    let command = ''
    let result: any = {}

    switch (dbType) {
      case 'sqlite':
        if (service !== 'gateway') {
          return NextResponse.json({ error: 'SQLite queries are only supported for the Gateway service.' }, { status: 400 })
        }
        // Use sqlite3 command-line tool. -json for JSON output.
        // IMPORTANT: Direct execution of user-provided queries is dangerous.
        // In a production environment, use parameterized queries or an ORM.
        command = `sqlite3 -json ${GATEWAY_SQLITE_DB_PATH} "${query.replace(/"/g, '""')}"`
        break
      case 'clickhouse':
        if (service !== 'clickhouse') {
          return NextResponse.json({ error: 'ClickHouse queries are only supported for the Clickhouse service.' }, { status: 400 })
        }
        // Use clickhouse-client. --format JSONEachRow for JSON output.
        // Assumes clickhouse-client is installed and configured to connect to the local ClickHouse instance.
        // IMPORTANT: Direct execution of user-provided queries is dangerous.
        // In a production environment, use parameterized queries or a ClickHouse client library.
        command = `clickhouse-client --query="${query.replace(/"/g, '\\"')}" --format JSONEachRow`
        break
      default:
        return NextResponse.json({ error: 'Unsupported database type.' }, { status: 400 })
    }

    console.log(`Executing command: ${command}`);
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 }); // 10 second timeout

    if (stderr) {
      console.error(`Database query stderr: ${stderr}`);
      // Attempt to parse stderr as JSON if it looks like an error message from the DB client
      try {
        const parsedError = JSON.parse(stderr);
        return NextResponse.json({ error: parsedError.error || stderr }, { status: 500 });
      } catch (e) {
        return NextResponse.json({ error: stderr }, { status: 500 });
      }
    }

    // For SQLite, the output is a single JSON array of objects.
    // For ClickHouse with JSONEachRow, it's newline-delimited JSON objects.
    // We'll try to parse it as a single JSON array first, then as multiple lines.
    try {
      result = JSON.parse(stdout);
    } catch (e) {
      // If it's not a single JSON array, try parsing each line for ClickHouse JSONEachRow
      if (dbType === 'clickhouse' && stdout.trim()) {
        result = stdout.trim().split('\n').map(line => JSON.parse(line));
      } else {
        // Fallback to raw string if not valid JSON
        result = stdout.trim();
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing database query:', error);
    let errorMessage = 'Failed to execute query.';
    if (error.message.includes('Command failed')) {
      errorMessage = `Command execution failed: ${error.message.split('\n')[0]}`;
    } else if (error.message.includes('timed out')) {
      errorMessage = 'Query timed out. It might be too complex or the database is unresponsive.';
    } else {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
