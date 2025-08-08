'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, RefreshCw } from 'lucide-react'

interface IndexFiltersTabProps {
  service: string
}

export function IndexFiltersTab({ service }: IndexFiltersTabProps) {
  const [filterJson, setFilterJson] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isJsonValid, setIsJsonValid] = useState(true);

  const fetchFilters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/index-filters`); // No service param needed for global filters
      if (response.ok) {
        const data = await response.json();
        // Combine the two filters into a single JSON string for the textarea
        const combinedFilters = {
          unbundleFilter: data.unbundleFilter,
          indexFilter: data.indexFilter,
        };
        setFilterJson(JSON.stringify(combinedFilters, null, 2));
        setIsJsonValid(true);
      } else {
        setFilterJson(JSON.stringify({ unbundleFilter: {}, indexFilter: {} }, null, 2)); // Default to empty JSON
        setIsJsonValid(true);
      }
    } catch (error) {
      console.error('Failed to fetch index filters:', error);
      setFilterJson(JSON.stringify({ unbundleFilter: {}, indexFilter: {} }, null, 2));
      setIsJsonValid(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, [service]); // Still depend on service, though the API is global, for consistency

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFilterJson(value);
    try {
      JSON.parse(value);
      setIsJsonValid(true);
    } catch (error) {
      setIsJsonValid(false);
    }
  };

  const handleSave = async () => {
    if (!isJsonValid) {
      setMessage('Error: Invalid JSON format. Please correct it before saving.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const parsedFilters = JSON.parse(filterJson);
      
      const response = await fetch(`/api/index-filters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedFilters), // Send the parsed object
      });

      if (response.ok) {
        setMessage('Index filters saved successfully to .env!');
      } else {
        const errorData = await response.json();
        setMessage(`Failed to save index filters: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      setMessage(`Error saving index filters: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading index filters...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Index Filters</CardTitle>
        <CardDescription className="text-gray-300">
          Define JSON-based filters for indexing operations. These will be saved to your Gateway's .env file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !isJsonValid}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Filters'}
          </Button>
          <Button onClick={fetchFilters} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {message && (
          <Alert variant={isJsonValid ? 'default' : 'destructive'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        {!isJsonValid && (
          <Alert variant="destructive">
            <AlertDescription>Invalid JSON. Please correct the syntax.</AlertDescription>
          </Alert>
        )}

        <Textarea
          value={filterJson}
          onChange={handleJsonChange}
          className={`min-h-[400px] font-mono text-sm bg-gray-900 border-gray-700 text-white placeholder:text-gray-300 ${!isJsonValid ? 'border-red-500 ring-red-500' : ''}`}
          placeholder={`{\n  "unbundleFilter": { "tags": { "App-Name": "Permaweb-App" } },\n  "indexFilter": { "data": { "min_size": 1000 } }\n}`}
        />
      </CardContent>
    </Card>
  );
}
