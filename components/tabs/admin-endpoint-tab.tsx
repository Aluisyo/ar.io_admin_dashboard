'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bug, Send, Ban, Package, FileSearch, Shield, ShieldOff, Database, Download, Trash2 } from 'lucide-react'
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
  const [adminApiKey, setAdminApiKey] = useState<string>('');

<<<<<<< Updated upstream
  // State management for all admin endpoints
=======
  // All state for different endpoints
>>>>>>> Stashed changes
  const [states, setStates] = useState({
    debug: { response: '', loading: false, error: '' },
    queueTx: { id: '', response: '', loading: false, error: '' },
    blockData: { id: '', notes: '', source: '', response: '', loading: false, error: '' },
    queueBundle: { id: '', response: '', loading: false, error: '' },
    queueDataItem: { dataItemsJson: '', response: '', loading: false, error: '' },
    bundleStatus: { id: '', response: '', loading: false, error: '' },
    blockName: { name: '', notes: '', source: '', response: '', loading: false, error: '' },
    unblockName: { name: '', response: '', loading: false, error: '' },
    exportParquet: { outputDir: '', startHeight: '', endHeight: '', maxFileRows: '', response: '', loading: false, error: '' },
    exportStatus: { response: '', loading: false, error: '' },
    pruneData: { indexedAtThreshold: '', response: '', loading: false, error: '' }
  });

  useEffect(() => {
    const autoDetectGatewayUrl = async () => {
      try {
        const response = await fetch('/api/gateway-url', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setGatewayUrl(data.gatewayUrl);
          if (typeof window !== 'undefined') {
            localStorage.setItem('ar-io-gateway-url', data.gatewayUrl);
          }
        }
      } catch (error) {
        console.error('Error auto-detecting Gateway URL:', error);
        if (typeof window !== 'undefined') {
          const savedUrl = localStorage.getItem('ar-io-gateway-url') || 'http://localhost:4000';
          setGatewayUrl(savedUrl);
        }
      }
    };

    const fetchAdminApiKey = async () => {
      try {
        const response = await fetch('/api/admin-api-key', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setAdminApiKey(data.adminApiKey);
        }
      } catch (error) {
        console.error('Network error fetching ADMIN_API_KEY:', error);
      }
    };

    autoDetectGatewayUrl();
    fetchAdminApiKey();
  }, []);

  const callApi = async (endpoint: string, body?: any) => {
    if (!gatewayUrl || !adminApiKey) {
      throw new Error('Gateway URL or ADMIN_API_KEY is missing.');
    }

    const response = await fetch(`/api/ar-io-admin/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ gatewayUrl, adminApiKey, ...body })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API call failed with status ${response.status}`);
    }
    return response.json();
  };

  const handleApiCall = async (endpoint: string, stateKey: string, body?: any) => {
    setStates(prev => ({ 
      ...prev, 
      [stateKey]: { ...prev[stateKey], loading: true, error: '', response: '' }
    }));

    try {
      const data = await callApi(endpoint, body);
      setStates(prev => ({
        ...prev,
        [stateKey]: { ...prev[stateKey], loading: false, response: JSON.stringify(data, null, 2) }
      }));
    } catch (error: any) {
      setStates(prev => ({
        ...prev,
        [stateKey]: { ...prev[stateKey], loading: false, error: error.message }
      }));
    }
  };

  const updateStateField = (stateKey: string, field: string, value: string) => {
    setStates(prev => ({
      ...prev,
      [stateKey]: { ...prev[stateKey], [field]: value }
    }));
  };

  const renderCard = (
    icon: any,
    title: string,
    description: string,
    stateKey: string,
    buttonText: string,
    buttonAction: () => void,
    inputs?: any[],
    requiredFields?: string[]
  ) => {
<<<<<<< Updated upstream
    // Validate required field completion
=======
    // Check if all required fields have values
>>>>>>> Stashed changes
    const hasRequiredFields = !requiredFields || requiredFields.every(field => {
      const fieldValue = states[stateKey][field];
      return fieldValue && fieldValue.toString().trim() !== '';
    });
    
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inputs?.map((input, idx) => (
            <div key={idx} className="space-y-2">
              <Label htmlFor={input.id} className="text-white">
                {input.label}
<<<<<<< Updated upstream
                {input.required && <span className="text-white ml-1">*</span>}
=======
                {input.required && <span className="text-red-400 ml-1">*</span>}
>>>>>>> Stashed changes
              </Label>
              {input.type === 'textarea' ? (
                <Textarea
                  id={input.id}
                  value={input.value}
                  onChange={input.onChange}
                  placeholder={input.placeholder}
<<<<<<< Updated upstream
                  className={`form-textarea ${
                    input.required && (!input.value || input.value.trim() === '') 
                      ? 'border-gray-500 focus:border-gray-400'
=======
                  className={`min-h-[120px] font-mono text-sm bg-gray-900 border-gray-700 text-white placeholder:text-gray-400 ${
                    input.required && (!input.value || input.value.trim() === '') 
                      ? 'border-red-500 focus:border-red-400' 
>>>>>>> Stashed changes
                      : ''
                  }`}
                />
              ) : (
                <Input
                  id={input.id}
                  type="text"
                  value={input.value}
                  onChange={input.onChange}
                  placeholder={input.placeholder}
<<<<<<< Updated upstream
                  className={`form-input ${
                    input.required && (!input.value || input.value.trim() === '') 
                      ? 'border-gray-500 focus:border-gray-400'
=======
                  className={`bg-gray-900 border-gray-700 text-white placeholder:text-gray-400 ${
                    input.required && (!input.value || input.value.trim() === '') 
                      ? 'border-red-500 focus:border-red-400' 
>>>>>>> Stashed changes
                      : ''
                  }`}
                />
              )}
            </div>
          ))}
          <Button 
            onClick={buttonAction}
            disabled={
              states[stateKey].loading || 
              !gatewayUrl || 
              !adminApiKey ||
              !hasRequiredFields
            }
          >
<<<<<<< Updated upstream
            {React.cloneElement(icon, { className: `${icon.props.className || ''} mr-2 text-black` })}
=======
            {icon}
>>>>>>> Stashed changes
            {states[stateKey].loading ? 'Processing...' : buttonText}
          </Button>
        {states[stateKey].error && (
          <Alert variant="destructive">
            <AlertDescription>{states[stateKey].error}</AlertDescription>
          </Alert>
        )}
        {states[stateKey].response && (
          <Textarea
            value={states[stateKey].response}
            readOnly
            className="min-h-[150px] font-mono text-sm bg-gray-900 border-gray-700 text-white"
          />
        )}
      </CardContent>
    </Card>
  );
  };

  return (
    <div className="space-y-6">
<<<<<<< Updated upstream
      {renderCard(
        <Bug className="h-5 w-5 icon-info" />,
=======
      {/* Debug Endpoint */}
      {renderCard(
        <Bug className="h-5 w-5 text-purple-600" />,
>>>>>>> Stashed changes
        "Debug Endpoint",
        "Get a comprehensive view of the current state of your Gateway.",
        "debug",
        "Fetch Debug Info",
        () => handleApiCall('debug', 'debug')
      )}

<<<<<<< Updated upstream
      {renderCard(
        <Send className="h-5 w-5 icon-primary" />,
=======
      {/* Queue Transaction */}
      {renderCard(
        <Send className="h-5 w-5 text-purple-600" />,
>>>>>>> Stashed changes
        "Queue Transaction",
        "Prioritize processing of a specific transaction or bundle.",
        "queueTx",
        "Queue Transaction",
        () => handleApiCall('queue-tx', 'queueTx', { id: states.queueTx.id }),
        [{
          id: 'queue-tx-id',
          label: 'Transaction/Bundle ID',
          value: states.queueTx.id,
          onChange: (e) => updateStateField('queueTx', 'id', e.target.value),
          placeholder: 'Enter transaction or bundle ID',
          required: true
        }],
        ['id']
      )}

<<<<<<< Updated upstream
      {renderCard(
        <Package className="h-5 w-5 icon-success" />,
=======
      {/* Queue Bundle */}
      {renderCard(
        <Package className="h-5 w-5 text-green-600" />,
>>>>>>> Stashed changes
        "Queue Bundle",
        "Queue a bundle for indexing, bypassing any filter settings by default.",
        "queueBundle",
        "Queue Bundle",
        () => handleApiCall('queue-bundle', 'queueBundle', { id: states.queueBundle.id }),
        [{
          id: 'queue-bundle-id',
          label: 'Bundle ID',
          value: states.queueBundle.id,
          onChange: (e) => updateStateField('queueBundle', 'id', e.target.value),
          placeholder: 'Enter bundle ID',
          required: true
        }],
        ['id']
      )}

<<<<<<< Updated upstream
      {renderCard(
        <Database className="h-5 w-5 icon-info" />,
=======
      {/* Queue Data Item */}
      {renderCard(
        <Database className="h-5 w-5 text-blue-600" />,
>>>>>>> Stashed changes
        "Queue Data Item",
        "Queue data items for indexing using JSON array of data item headers.",
        "queueDataItem",
        "Queue Data Items",
        () => {
          try {
            const dataItems = JSON.parse(states.queueDataItem.dataItemsJson);
            return handleApiCall('queue-data-item', 'queueDataItem', { dataItems });
          } catch (error) {
            setStates(prev => ({
              ...prev,
              queueDataItem: { ...prev.queueDataItem, error: 'Invalid JSON format' }
            }));
          }
        },
        [{
          id: 'queue-data-items-json',
          label: 'Data Items JSON Array',
          value: states.queueDataItem.dataItemsJson,
          onChange: (e) => updateStateField('queueDataItem', 'dataItemsJson', e.target.value),
          placeholder: '[{"id": "abc123", "data_size": 1024, "owner": "owner_address", "owner_address": "address", "signature": "signature", "tags": [], "content_type": "text/plain", "target": "", "anchor": ""}]',
          required: true,
          type: 'textarea'
        }],
        ['dataItemsJson']
      )}

<<<<<<< Updated upstream
      {renderCard(
        <FileSearch className="h-5 w-5 icon-warning" />,
=======
      {/* Bundle Status */}
      {renderCard(
        <FileSearch className="h-5 w-5 text-yellow-600" />,
>>>>>>> Stashed changes
        "Bundle Status",
        "Get bundle processing status.",
        "bundleStatus",
        "Get Bundle Status",
        () => handleApiCall('bundle-status', 'bundleStatus', { id: states.bundleStatus.id }),
        [{
          id: 'bundle-status-id',
          label: 'Bundle ID',
          value: states.bundleStatus.id,
          onChange: (e) => updateStateField('bundleStatus', 'id', e.target.value),
          placeholder: 'Enter bundle ID',
          required: true
        }],
        ['id']
      )}

<<<<<<< Updated upstream
      {renderCard(
        <Ban className="h-5 w-5 icon-error" />,
=======
      {/* Block Data */}
      {renderCard(
        <Ban className="h-5 w-5 text-red-600" />,
>>>>>>> Stashed changes
        "Block Data",
        "Blocks transactions or data-items so your AR.IO Gateway will not serve them.",
        "blockData",
        "Block Data",
        () => handleApiCall('block-data', 'blockData', {
          id: states.blockData.id,
          notes: states.blockData.notes,
          source: states.blockData.source
        }),
        [
          {
            id: 'block-data-id',
            label: 'Transaction ID to Block',
            value: states.blockData.id,
            onChange: (e) => updateStateField('blockData', 'id', e.target.value),
            placeholder: 'Enter transaction ID',
            required: true
          },
          {
            id: 'block-data-notes',
            label: 'Notes (Optional)',
            value: states.blockData.notes,
            onChange: (e) => updateStateField('blockData', 'notes', e.target.value),
            placeholder: 'e.g., Example notes'
          },
          {
            id: 'block-data-source',
            label: 'Source (Optional)',
            value: states.blockData.source,
            onChange: (e) => updateStateField('blockData', 'source', e.target.value),
            placeholder: 'e.g., Public block list name'
          }
        ],
        ['id']
      )}

<<<<<<< Updated upstream
      {renderCard(
        <Shield className="h-5 w-5 icon-warning" />,
=======
      {/* Block Name */}
      {renderCard(
        <Shield className="h-5 w-5 text-orange-600" />,
>>>>>>> Stashed changes
        "Block ARNS Name",
        "Blocks an ARNS name so your AR.IO Gateway will not serve it.",
        "blockName",
        "Block Name",
        () => handleApiCall('block-name', 'blockName', {
          name: states.blockName.name,
          notes: states.blockName.notes,
          source: states.blockName.source
        }),
        [
          {
            id: 'block-name',
            label: 'ARNS Name to Block',
            value: states.blockName.name,
            onChange: (e) => updateStateField('blockName', 'name', e.target.value),
            placeholder: 'Enter ARNS name',
            required: true
          },
          {
            id: 'block-name-notes',
            label: 'Notes (Optional)',
            value: states.blockName.notes,
            onChange: (e) => updateStateField('blockName', 'notes', e.target.value),
            placeholder: 'e.g., Reason for blocking'
          },
          {
            id: 'block-name-source',
            label: 'Source (Optional)',
            value: states.blockName.source,
            onChange: (e) => updateStateField('blockName', 'source', e.target.value),
            placeholder: 'e.g., Block list source'
          }
        ],
        ['name']
      )}

<<<<<<< Updated upstream
      {renderCard(
        <ShieldOff className="h-5 w-5 icon-success" />,
=======
      {/* Unblock Name */}
      {renderCard(
        <ShieldOff className="h-5 w-5 text-green-600" />,
>>>>>>> Stashed changes
        "Unblock ARNS Name",
        "Unblock an ARNS name.",
        "unblockName",
        "Unblock Name",
        () => handleApiCall('unblock-name', 'unblockName', { name: states.unblockName.name }),
        [{
          id: 'unblock-name',
          label: 'ARNS Name to Unblock',
          value: states.unblockName.name,
          onChange: (e) => updateStateField('unblockName', 'name', e.target.value),
          placeholder: 'Enter ARNS name',
          required: true
        }],
        ['name']
      )}

<<<<<<< Updated upstream
      {renderCard(
        <Download className="h-5 w-5 icon-info" />,
=======
      {/* Export Parquet */}
      {renderCard(
        <Download className="h-5 w-5 text-cyan-600" />,
>>>>>>> Stashed changes
        "Export Parquet",
        "Export data to Parquet format with specified parameters.",
        "exportParquet",
        "Export to Parquet",
        () => handleApiCall('export-parquet', 'exportParquet', {
          outputDir: states.exportParquet.outputDir,
          startHeight: parseInt(states.exportParquet.startHeight) || 0,
          endHeight: parseInt(states.exportParquet.endHeight) || 0,
          maxFileRows: parseInt(states.exportParquet.maxFileRows) || 0
        }),
        [
          {
            id: 'export-output-dir',
            label: 'Output Directory',
            value: states.exportParquet.outputDir,
            onChange: (e) => updateStateField('exportParquet', 'outputDir', e.target.value),
            placeholder: 'e.g., /tmp/parquet-export',
            required: true
          },
          {
            id: 'export-start-height',
            label: 'Start Height',
            value: states.exportParquet.startHeight,
            onChange: (e) => updateStateField('exportParquet', 'startHeight', e.target.value),
            placeholder: 'e.g., 0',
            required: true
          },
          {
            id: 'export-end-height',
            label: 'End Height',
            value: states.exportParquet.endHeight,
            onChange: (e) => updateStateField('exportParquet', 'endHeight', e.target.value),
            placeholder: 'e.g., 1000',
            required: true
          },
          {
            id: 'export-max-file-rows',
            label: 'Max File Rows',
            value: states.exportParquet.maxFileRows,
            onChange: (e) => updateStateField('exportParquet', 'maxFileRows', e.target.value),
            placeholder: 'e.g., 10000',
            required: true
          }
        ],
        ['outputDir', 'startHeight', 'endHeight', 'maxFileRows']
      )}

<<<<<<< Updated upstream
      {renderCard(
        <FileSearch className="h-5 w-5 icon-info" />,
=======
      {/* Export Parquet Status */}
      {renderCard(
        <FileSearch className="h-5 w-5 text-cyan-600" />,
>>>>>>> Stashed changes
        "Export Parquet Status",
        "Get Parquet export status.",
        "exportStatus",
        "Get Export Status",
        () => handleApiCall('export-parquet-status', 'exportStatus')
      )}

<<<<<<< Updated upstream
      {renderCard(
        <Trash2 className="h-5 w-5 icon-error" />,
=======
      {/* Prune Stable Data Items */}
      {renderCard(
        <Trash2 className="h-5 w-5 text-red-600" />,
>>>>>>> Stashed changes
        "Prune Stable Data Items",
        "Prune stable data items indexed before the specified timestamp.",
        "pruneData",
        "Prune Data Items",
        () => handleApiCall('prune-stable-data-items', 'pruneData', {
          indexedAtThreshold: parseInt(states.pruneData.indexedAtThreshold) || 0
        }),
        [
          {
            id: 'prune-indexed-threshold',
            label: 'Indexed At Threshold (Unix Timestamp)',
            value: states.pruneData.indexedAtThreshold,
            onChange: (e) => updateStateField('pruneData', 'indexedAtThreshold', e.target.value),
            placeholder: 'e.g., 1677721600 (March 1, 2023)',
            required: true
          }
        ],
        ['indexedAtThreshold']
      )}
    </div>
  )
}
