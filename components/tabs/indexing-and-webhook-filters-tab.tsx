'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, RefreshCw } from 'lucide-react'

interface IndexingAndWebhookFiltersTabProps {
  service: string
}

export function IndexingAndWebhookFiltersTab({ service }: IndexingAndWebhookFiltersTabProps) {
  const [filterJson, setFilterJson] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isJsonValid, setIsJsonValid] = useState(true);

  const fetchFilters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/filters`); // Fetch all filters
      if (response.ok) {
        const data = await response.json();
        // Combine all four filters into a single JSON string for the textarea
        const combinedFilters = {
          ANS104_UNBUNDLE_FILTER: data.unbundleFilter,
          ANS104_INDEX_FILTER: data.indexFilter,
          WEBHOOK_INDEX_FILTER: data.webhookIndexFilter,
          WEBHOOK_BLOCK_FILTER: data.webhookBlockFilter,
        };
        setFilterJson(JSON.stringify(combinedFilters, null, 2));
        setIsJsonValid(true);
      } else {
        setFilterJson(JSON.stringify({
          ANS104_UNBUNDLE_FILTER: {},
          ANS104_INDEX_FILTER: {},
          WEBHOOK_INDEX_FILTER: {},
          WEBHOOK_BLOCK_FILTER: {},
        }, null, 2)); // Default to empty JSON for all
        setIsJsonValid(true);
      }
    } catch (error) {
      console.error('Failed to fetch filters:', error);
      setFilterJson(JSON.stringify({
        ANS104_UNBUNDLE_FILTER: {},
        ANS104_INDEX_FILTER: {},
        WEBHOOK_INDEX_FILTER: {},
        WEBHOOK_BLOCK_FILTER: {},
      }, null, 2));
      setIsJsonValid(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, [service]);

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
      
      // Validate that the parsed object contains the expected keys
      const expectedKeys = ['ANS104_UNBUNDLE_FILTER', 'ANS104_INDEX_FILTER', 'WEBHOOK_INDEX_FILTER', 'WEBHOOK_BLOCK_FILTER'];
      const missingKeys = expectedKeys.filter(key => !(key in parsedFilters));
      if (missingKeys.length > 0) {
        setMessage(`Error: Missing required filter keys in JSON: ${missingKeys.join(', ')}. Please include all four filter types.`);
        setIsJsonValid(false);
        setSaving(false);
        return;
      }

      const response = await fetch(`/api/filters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedFilters), // Send the parsed object
      });

      if (response.ok) {
        setMessage('Filters saved successfully to .env!');
      } else {
        const errorData = await response.json();
        setMessage(`Failed to save filters: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      setMessage(`Error saving filters: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading filters...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription className="text-gray-300">
          Define JSON-based filters for unbundling, indexing, and webhook triggers. These will be saved to your Gateway's .env file.
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
          placeholder={`{\n  "ANS104_UNBUNDLE_FILTER": { "tags": [ { "name": "App-Name", "value": "MyPermawebApp" } ] },\n  "ANS104_INDEX_FILTER": { "attributes": { "data_size": 1000 } },\n  "WEBHOOK_INDEX_FILTER": { "tags": [ { "name": "Content-Type", "valueStartsWith": "image/" } ] },\n  "WEBHOOK_BLOCK_FILTER": { "isNestedBundle": true }\n}`}
        />
      </CardContent>
    </Card>
  );
}
