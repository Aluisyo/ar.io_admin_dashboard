import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Try multiple endpoints for compatibility between docker and localhost
  const endpoints = [
<<<<<<< Updated upstream
    'http://ar-io-node-upload-service-1:5100',  // Docker service name (full container name)
    'http://bundler:5100',      // Docker service name (short alias, if configured)
=======
    'http://bundler:5100',      // Docker service name
>>>>>>> Stashed changes
    'http://localhost:5100',    // Localhost
    'http://127.0.0.1:5100'     // Alternative localhost
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying bundler info at: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add a reasonable timeout
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully connected to bundler info at: ${endpoint}`);
        
        return NextResponse.json({
          success: true,
          endpoint,
          data
        });
      } else {
        console.log(`Failed to fetch from ${endpoint}: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.log(`Error fetching from ${endpoint}: ${error.message}`);
    }
  }

  // If all endpoints fail
  return NextResponse.json({
    success: false,
    error: 'Unable to connect to bundler service on port 5100',
    endpoints: endpoints
  }, { status: 503 });
}
