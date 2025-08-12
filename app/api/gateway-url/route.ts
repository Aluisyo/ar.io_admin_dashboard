import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Define possible endpoints for AR.IO Gateway
    // Try Docker network hostnames first, then localhost
    // Using the same approach as metrics and info endpoints
    const gatewayUrls = [
      'http://envoy:3000',        // Docker network (primary via envoy)
      'http://core:4000',         // Docker network (direct to core)
      'http://localhost:3000',    // Local development (via envoy)
      'http://localhost:4000'     // Local development (direct to core)
    ];
    
    let detectedUrl = null;
    let lastError = null;
    let detectionMethod = null;

    for (const baseUrl of gatewayUrls) {
      try {
        console.log(`Trying AR.IO Gateway at: ${baseUrl}/ar-io/info`);
        const response = await fetch(`${baseUrl}/ar-io/info`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          console.log(`Successfully connected to AR.IO Gateway at: ${baseUrl}`);
          detectedUrl = baseUrl;
          
          // Determine detection method based on URL
          if (baseUrl.includes('envoy:3000')) {
            detectionMethod = 'Docker network (via Envoy proxy)';
          } else if (baseUrl.includes('core:4000')) {
            detectionMethod = 'Docker network (direct to core)';
          } else if (baseUrl.includes('localhost:3000')) {
            detectionMethod = 'Local development (via Envoy proxy)';
          } else if (baseUrl.includes('localhost:4000')) {
            detectionMethod = 'Local development (direct to core)';
          }
          
          break; // Success, exit loop
        } else {
          console.log(`Failed to connect to ${baseUrl}: HTTP ${response.status}`);
          lastError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error: any) {
        console.log(`Error connecting to ${baseUrl}:`, error.message);
        lastError = error.message;
        continue; // Try next URL
      }
    }

    if (!detectedUrl) {
      // Return default fallback with warning
      return NextResponse.json({
        gatewayUrl: 'http://localhost:4000',
        detectionMethod: 'Default fallback - auto-detection failed',
        isDetected: false,
        error: 'Unable to auto-detect Gateway URL',
        details: lastError || 'Unable to connect to gateway on any known endpoint',
        availableEndpoints: gatewayUrls
      });
    }

    return NextResponse.json({
      gatewayUrl: detectedUrl,
      detectionMethod: detectionMethod,
      isDetected: true,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error detecting AR.IO gateway URL:', error);
    return NextResponse.json({ 
      error: 'Failed to detect gateway URL',
      details: error.message,
      gatewayUrl: 'http://localhost:4000', // Fallback
      detectionMethod: 'Error fallback',
      isDetected: false
    }, { status: 500 });
  }
}
