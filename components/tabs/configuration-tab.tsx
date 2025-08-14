'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, RefreshCw, PlusCircle, Trash2, Info } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ConfigVar {
  id: number;
  key: string;
  value: string;
}

interface ConfigurationTabProps {
  service: string
}

export function ConfigurationTab({ service }: ConfigurationTabProps) {
  const [configVars, setConfigVars] = useState<ConfigVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const nextIdRef = useRef(0);

  // Common admin dashboard environment variables with descriptions
  const ADMIN_ENV_HINTS: Record<string, string> = {
    'ADMIN_USERNAME': 'Username for dashboard login authentication',
    'ADMIN_PASSWORD': 'Password for dashboard login authentication', 
    'NEXTAUTH_SECRET': 'Secret key for NextAuth session encryption (generate with: openssl rand -base64 32)',
    'NEXTAUTH_URL': 'Base URL where the admin dashboard is hosted (e.g., http://localhost:3001)',
    'AR_IO_NODE_PATH': 'Path to the AR.IO node directory (default: ~/ar-io-node)',
    'DOCKER_PROJECT': 'Docker Compose project name (default: ar-io-node)',
    'NEXT_PUBLIC_GRAFANA_URL': 'Public URL for Grafana dashboard (e.g., http://localhost:1024)',
    'ADMIN_API_KEY': 'API key for AR.IO admin endpoints - must match gateway configuration'
  };

  // Define services that share the main .env file
  const SHARED_ENV_SERVICES = [
    'gateway',
    'observer',
    'envoy',
    'autoheal',
    'clickhouse',
    'litestream',
    'grafana'
  ];

  const getConfigFile = (service: string) => {
    if (SHARED_ENV_SERVICES.includes(service)) {
      return '.env';
    }
    if (service === 'admin') return '.env.dashboard';
    if (service === 'ao-cu') return '.env.ao';
    if (service === 'bundler') return '.env.bundler';
    return '.env'; // Fallback, though SHARED_ENV_SERVICES should cover most
  };

  const getConfigDescription = (service: string) => {
    const configFile = getConfigFile(service);
    if (configFile === '.env') {
      const sharedServicesNames = SHARED_ENV_SERVICES.map(s => {
        const names: Record<string, string> = {
          gateway: 'Gateway',
          observer: 'Observer',
          envoy: 'Envoy',
          autoheal: 'Autoheal',
          clickhouse: 'Clickhouse',
          litestream: 'Litestream',
          grafana: 'Grafana'
        };
        return names[s] || s;
      }).join(', ');
      return `This configuration (${configFile}) is shared across: ${sharedServicesNames}.`;
    } else if (service === 'admin') {
      return `Edit the Admin Dashboard configuration (${configFile}) that controls authentication, API keys, and dashboard settings.`;
    } else {
      return `Edit the ${configFile} file for the ${service} service.`;
    }
  };

  const fetchConfig = async () => {
    setLoading(true);
    setMessage('');
    try {
      const configFile = getConfigFile(service);
      const response = await fetch(`/api/config/${service}?file=${configFile}`);
      if (response.ok) {
        const data: Record<string, string> = await response.json();
        const parsedVars: ConfigVar[] = Object.entries(data).map(([key, value], index) => ({
          id: index,
          key,
          value,
        }));
        nextIdRef.current = parsedVars.length;
        setConfigVars(parsedVars);
      } else {
        setConfigVars([]);
        setMessage('Failed to fetch configuration. Starting with empty.');
      }
    } catch (error) {
      console.error('Failed to fetch configuration:', error);
      setConfigVars([]);
      setMessage('Error fetching configuration. Starting with empty.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [service]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const updates: Record<string, string> = {};
      configVars.forEach(v => {
        if (v.key.trim() !== '') {
          updates[v.key.trim()] = v.value;
        }
      });

      const configFile = getConfigFile(service);
      const response = await fetch(`/api/config/${service}?file=${configFile}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setMessage('Configuration saved successfully!');
        await fetchConfig(); // Re-fetch to ensure UI reflects exactly what's in the .env file
      } else {
        const errorData = await response.json();
        setMessage(`Failed to save configuration: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      setMessage(`Error saving configuration: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariable = () => {
    setConfigVars(prev => [...prev, { id: nextIdRef.current++, key: '', value: '' }]);
  };

  const handleRemoveVariable = (idToRemove: number) => {
    setConfigVars(prev => prev.filter(v => v.id !== idToRemove));
  };

  const handleVariableChange = (id: number, field: 'key' | 'value', newValue: string) => {
    setConfigVars(prev =>
      prev.map(v => (v.id === id ? { ...v, [field]: newValue } : v))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" message="Loading configuration..." />
      </div>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle>Environment Configuration</CardTitle>
        <CardDescription className="text-gray-300">
          {getConfigDescription(service)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button onClick={fetchConfig} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAddVariable} variant="outline">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Variable
          </Button>
        </div>

        {message && (
          <Alert className="mt-2">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        
        {service === 'admin' && (
          <Alert className="border-gray-600 bg-gray-800">
            <AlertDescription className="text-white">
              <strong>Important:</strong> Changes to the Admin Dashboard configuration require restarting the admin service to take effect. 
              Some changes (like NEXTAUTH_SECRET) may require clearing browser sessions.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {configVars.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-400">
              <p>No configuration variables found. Click "Add Variable" to start.</p>
            </div>
          )}
          {configVars.map((configVar) => (
            <div key={configVar.id} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor={`key-${configVar.id}`} className="sr-only">Key</Label>
                <Input
                  id={`key-${configVar.id}`}
                  placeholder="KEY_NAME"
                  value={configVar.key}
                  onChange={(e) => handleVariableChange(configVar.id, 'key', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor={`value-${configVar.id}`} className="sr-only">Value</Label>
                <div className="relative">
                  <Input
                    id={`value-${configVar.id}`}
                    placeholder="value"
                    value={configVar.value}
                    onChange={(e) => handleVariableChange(configVar.id, 'value', e.target.value)}
                    className="form-input"
                    type={configVar.key.toLowerCase().includes('password') || configVar.key.toLowerCase().includes('secret') ? 'password' : 'text'}
                  />
                  {service === 'admin' && ADMIN_ENV_HINTS[configVar.key] && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <Info className="h-4 w-4 icon-info" title={ADMIN_ENV_HINTS[configVar.key]} />
                    </div>
                  )}
                </div>
                {service === 'admin' && ADMIN_ENV_HINTS[configVar.key] && (
                  <p className="text-xs text-gray-400 mt-1">{ADMIN_ENV_HINTS[configVar.key]}</p>
                )}
              </div>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleRemoveVariable(configVar.id)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove variable</span>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
