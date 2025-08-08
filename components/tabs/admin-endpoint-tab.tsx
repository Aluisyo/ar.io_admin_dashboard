'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, Bug, Send, Ban, Save, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useState, useEffect } from 'react'

interface AdminEndpointTabProps {
  service: string
}

export function AdminEndpointTab({ service }: AdminEndpointTabProps) {
  const [gatewayUrl, setGatewayUrl] = useState<string>('');
  const [adminApiKey, setAdminApiKey] = useState<string>(''); // This will be fetched
  const [settingsMessage, setSettingsMessage] = useState<string>('');

  // Debug state
  const [debugResponse, setDebugResponse] = useState<string>('');
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string>('');

  // Queue TX state
  const [queueTxId, setQueueTxId] = useState<string>('');
  const [queueTxResponse, setQueueTxResponse] = useState<string>('');
  const [queueTxLoading, setQueueTxLoading] = useState(false);
  const [queueTxError, setQueueTxError] = useState<string>('');

  // Block Data state
  const [blockDataId, setBlockDataId] = useState<string>('');
  const [blockDataNotes, setBlockDataNotes] = useState<string>('');
  const [blockDataSource, setBlockDataSource] = useState<string>('');
  const [blockDataResponse, setBlockDataResponse] = useState<string>('');
  const [blockDataLoading, setBlockDataLoading] = useState(false);
  const [blockDataError, setBlockDataError] = useState<string>('');

  useEffect(() => {
    // Use NEXT_PUBLIC_GATEWAY_URL as default, fallback to localStorage or default URL
    const defaultUrl = 
      process.env.NEXT_PUBLIC_GATEWAY_URL || 
      (typeof window !== 'undefined' ? localStorage.getItem('ar-io-gateway-url') : '') || 
      'http://localhost:4000';
    
    setGatewayUrl(defaultUrl);
    
   
    if (typeof window !== 'undefined' && localStorage.getItem('ar-io-gateway-url') !== defaultUrl) {
      localStorage.setItem('ar-io-gateway-url', defaultUrl);

    // Fetch ADMIN_API_KEY from server
    const fetchAdminApiKey = async () => {
      try {
        const response = await fetch('/api/admin-api-key', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setAdminApiKey(data.adminApiKey);
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch ADMIN_API_KEY:', errorData.error);
          setSettingsMessage(`Error fetching ADMIN_API_KEY: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Network error fetching ADMIN_API_KEY:', error);
        setSettingsMessage('Network error fetching ADMIN_API_KEY.');
      }
    };
    fetchAdminApiKey();
  }, []);

  const saveGatewayUrlSetting = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ar-io-gateway-url', gatewayUrl);
      setSettingsMessage('Gateway URL saved locally!');
      setTimeout(() => setSettingsMessage(''), 3000);
    }
  };

  const callApi = async (endpoint: string, method: string, body?: any) => {
    if (!gatewayUrl || !adminApiKey) {
      throw new Error('Gateway URL or ADMIN_API_KEY is missing. Please ensure they are configured.');
    }

    const requestBody = {
      gatewayUrl,
      adminApiKey,
      ...body
    };

    const response = await fetch(`/api/ar-io-admin/${endpoint}`, { credentials: 'include',
      method: 'POST', // All client-side calls to our Next.js API are POST
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API call failed with status ${response.status}`);
    }
    return response.json();
  };

  const handleDebug = async () => {
    setDebugLoading(true);
    setDebugError('');
    setDebugResponse('');
    try {
      const data = await callApi('debug', 'GET'); // Actual method to AR.IO Gateway is GET
      setDebugResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setDebugError(err.message);
    } finally {
      setDebugLoading(false);
    }
  };

  const handleQueueTx = async () => {
    setQueueTxLoading(true);
    setQueueTxError('');
    setQueueTxResponse('');
    try {
      const data = await callApi('queue-tx', 'POST', { id: queueTxId });
      setQueueTxResponse(JSON.stringify(data, null, 2));
      // setQueueTxId(''); // Keep for easy re-testing
    } catch (err: any) {
      setQueueTxError(err.message);
    } finally {
      setQueueTxLoading(false);
    }
  };

  const handleBlockData = async () => {
    setBlockDataLoading(true);
    setBlockDataError('');
    setBlockDataResponse('');
    try {
      const data = await callApi('block-data', 'PUT', { // Actual method to AR.IO Gateway is PUT
        id: blockDataId,
        notes: blockDataNotes,
        source: blockDataSource,
      });
      setBlockDataResponse(JSON.stringify(data, null, 2));
      // setBlockDataId(''); // Keep for easy re-testing
      // setBlockDataNotes('');
      // setBlockDataSource('');
    } catch (err: any) {
      setBlockDataError(err.message);
    } finally {
      setBlockDataLoading(false);
    }
  };

  const getAdminEndpointUrl = (serviceName: string) => {
    // This is a placeholder for how you might determine the admin endpoint.
    // In a real application, this might come from a configuration file,
    // a discovery service, or be hardcoded for specific services.
    switch (serviceName) {
      case 'gateway':
        return `${gatewayUrl}/ar-io/admin`; // Example for Gateway
      case 'bundler':
        return `${gatewayUrl}/ar-io/admin`; // Example for Bundler (assuming it also has admin endpoints)
      case 'grafana':
        return 'http://localhost:3000'; // Example for Grafana
      case 'clickhouse':
        return 'http://localhost:8123'; // Example for Clickhouse HTTP interface
      default:
        return null;
    }
  };

  const endpointUrl = getAdminEndpointUrl(service);

  return (
    <div className="space-y-6">
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Server className="h-4 w-4" />Gateway Admin API Settings</CardTitle>
          <CardDescription className="text-gray-300">
            Configure the base URL for your AR.IO Gateway. Your ADMIN_API_KEY is read from the server.
            The Gateway URL setting is saved locally in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gateway-url" className="text-white">AR.IO Gateway Base URL</Label>
            <Input
              id="gateway-url"
              type="url"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="e.g., http://localhost:4000"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-400"
            />
          </div>
          <Button onClick={saveGatewayUrlSetting} className="bg-white text-black hover:bg-gray-200">
            <Save className="h-4 w-4 mr-2" />
            Save Gateway URL
          </Button>
          {settingsMessage && (
            <Alert className="mt-2">
              <AlertDescription>{settingsMessage}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="admin-api-key-display" className="text-white">ADMIN_API_KEY (from server)</Label>
            <Input
              id="admin-api-key-display"
              type="password"
              value={adminApiKey ? '********' : 'Loading...'}
              readOnly
              className="bg-gray-900 border-gray-700 text-white"
            />
            {!adminApiKey && <p className="text-sm text-red-400">ADMIN_API_KEY not loaded. Ensure it's set in your server's .env.</p>}
          </div>
        </CardContent>
      </Card>



      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-purple-600" />
            Debug Endpoint
          </CardTitle>
          <CardDescription className="text-gray-300">
            Get a comprehensive view of the current state of your Gateway.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleDebug} disabled={debugLoading || !gatewayUrl || !adminApiKey}>
            <Bug className="h-4 w-4 mr-2" />
            {debugLoading ? 'Fetching...' : 'Fetch Debug Info'}
          </Button>
          {debugError && (
            <Alert variant="destructive">
              <AlertDescription>{debugError}</AlertDescription>
            </Alert>
          )}
          {debugResponse && (
            <Textarea
              value={debugResponse}
              readOnly
              className="min-h-[300px] font-mono text-sm bg-gray-900 border-gray-700 text-white"
            />
          )}
        </CardContent>
      </Card>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-purple-600" />
            Queue Transaction
          </CardTitle>
          <CardDescription className="text-gray-300">
            Prioritize processing of a specific transaction or bundle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="queue-tx-id" className="text-white">Transaction/Bundle ID</Label>
            <Input
              id="queue-tx-id"
              type="text"
              value={queueTxId}
              onChange={(e) => setQueueTxId(e.target.value)}
              placeholder="Enter transaction or bundle ID"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-400"
            />
          </div>
          <Button onClick={handleQueueTx} disabled={queueTxLoading || !queueTxId || !gatewayUrl || !adminApiKey}>
            <Send className="h-4 w-4 mr-2" />
            {queueTxLoading ? 'Queuing...' : 'Queue Transaction'}
          </Button>
          {queueTxError && (
            <Alert variant="destructive">
              <AlertDescription>{queueTxError}</AlertDescription>
            </Alert>
          )}
          {queueTxResponse && (
            <Textarea
              value={queueTxResponse}
              readOnly
              className="min-h-[100px] font-mono text-sm bg-gray-900 border-gray-700 text-white"
            />
          )}
        </CardContent>
      </Card>

      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-purple-600" />
            Block Data
          </CardTitle>
          <CardDescription className="text-gray-300">
            Tell your Gateway to refuse to serve certain data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="block-data-id" className="text-white">Transaction ID to Block</Label>
            <Input
              id="block-data-id"
              type="text"
              value={blockDataId}
              onChange={(e) => setBlockDataId(e.target.value)}
              placeholder="Enter transaction ID"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="block-data-notes" className="text-white">Notes (Optional)</Label>
            <Input
              id="block-data-notes"
              type="text"
              value={blockDataNotes}
              onChange={(e) => setBlockDataNotes(e.target.value)}
              placeholder="e.g., Example notes"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="block-data-source" className="text-white">Source (Optional)</Label>
            <Input
              id="block-data-source"
              type="text"
              value={blockDataSource}
              onChange={(e) => setBlockDataSource(e.target.value)}
              placeholder="e.g., Public block list name"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-400"
            />
          </div>
          <Button onClick={handleBlockData} disabled={blockDataLoading || !blockDataId || !gatewayUrl || !adminApiKey}>
            <Ban className="h-4 w-4 mr-2" />
            {blockDataLoading ? 'Blocking...' : 'Block Data'}
          </Button>
          {blockDataError && (
            <Alert variant="destructive">
              <AlertDescription>{blockDataError}</AlertDescription>
            </Alert>
          )}
          {blockDataResponse && (
            <Textarea
              value={blockDataResponse}
              readOnly
              className="min-h-[100px] font-mono text-sm bg-gray-900 border-gray-700 text-white"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
