import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const execAsync = promisify(exec)

export async function GET(
  request: NextRequest,
  { params }: { params: { service: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const service = params.service
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const logLevel = searchParams.get('level'); // Get log level from query params
    const exportAll = searchParams.get('exportAll') === 'true'; // Check if we want all logs
    const isTailing = searchParams.get('tail') === 'true'; // Check if this is a tailing request
    const sinceTimestamp = searchParams.get('since'); // Get since timestamp for tailing
    
    // First try to find the container using docker compose
    const { stdout: composeOutput } = await execAsync(`docker compose -p ar-io-node ps ${service} --format "{{.Name}}" 2>/dev/null || echo ""`)
    let containerName = composeOutput.trim()

    // If not found via compose, try the manual mapping
    if (!containerName) {
      const containerMap: Record<string, string> = {
        'gateway': 'ar-io-node-core-1',
        'observer': 'ar-io-node-observer-1',
        'envoy': 'ar-io-node-envoy-1',
        'autoheal': 'ar-io-node-autoheal-1',
        'clickhouse': 'ar-io-node-clickhouse-1',
        'litestream': 'ar-io-node-litestream-1',
        'grafana': 'ar-io-node-grafana-1',
        'ao-cu': 'ar-io-node-ao-cu-1',
        'bundler': 'ar-io-node-upload-service-1',
        'admin': 'ar-io-node-admin-dashboard-1'
      }
      containerName = containerMap[service] || `ar-io-node-${service}-1`
    }

    // Base docker logs command
    let logsCommand: string;
    if (exportAll) {
      // For full export, don't limit the number of lines
      if (service === 'envoy') {
        logsCommand = `docker compose -p ar-io-node logs ${service} 2>/dev/null || docker logs ${containerName} 2>&1`;
      } else {
        logsCommand = `docker logs ${containerName} 2>&1`;
      }
    } else if (isTailing && sinceTimestamp) {
      // For tailing, get logs since the specified timestamp
      const sinceDate = new Date(sinceTimestamp);
      const sinceSeconds = Math.floor(sinceDate.getTime() / 1000) - 10; // Go back 10 seconds to avoid missing logs
      if (service === 'envoy') {
        logsCommand = `docker compose -p ar-io-node logs --since ${sinceSeconds} ${service} 2>/dev/null || docker logs --since ${sinceSeconds} ${containerName} 2>&1`;
      } else {
        logsCommand = `docker logs --since ${sinceSeconds} ${containerName} 2>&1`;
      }
    } else {
      // For regular viewing, limit to last 100 lines
      if (service === 'envoy') {
        logsCommand = `docker compose -p ar-io-node logs --tail 100 ${service} 2>/dev/null || docker logs --tail 100 ${containerName} 2>&1`;
      } else {
        logsCommand = `docker logs --tail 100 ${containerName} 2>&1`;
      }
    }

    // Apply log level filter
    if (logLevel && logLevel !== 'all') {
      let grepPattern = '';
      switch (logLevel) {
        case 'info':
          grepPattern = 'INFO|information|notice';
          break;
        case 'warning':
          grepPattern = 'WARN|WARNING';
          break;
        case 'error':
          grepPattern = 'ERROR|ERR|Failed|Failure';
          break;
        case 'debug':
          grepPattern = 'DEBUG|DBG';
          break;
        default:
          break;
      }
      if (grepPattern) {
        logsCommand += ` | grep -i -E "${grepPattern}"`; // -E for extended regex
      }
    }

    // Apply keyword filter after log level filter
    if (keyword) {
      logsCommand += ` | grep -i "${keyword}"`;
    }
    
    logsCommand += ` || echo "No logs available"`; // Fallback if grep finds nothing or command fails

    const { stdout: logsOutput } = await execAsync(logsCommand);

    return new NextResponse(logsOutput, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  } catch (error) {
    console.error('Error fetching container logs:', error)
    return new NextResponse('Error fetching logs', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}
