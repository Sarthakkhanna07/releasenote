"use client";

import React, { useState } from "react";
import {
  Button,
  TextField,
  Badge,
  TextArea,
} from "@/components/subframe-ui/ui";
import {
  FeatherLink,
  FeatherUpload,
  FeatherLoader,
  FeatherCheck,
  FeatherX,
  FeatherEye,
  FeatherEdit2,
  FeatherGithub,
  FeatherGlobe,
} from "@subframe/core";
import { toast } from "sonner";


interface SmartImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  onAnalysisComplete: (data: any) => void;
}

interface ImportStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  loading: boolean;
  error?: string;
}

interface AnalysisResult {
  extractedContent: any;
  analysis: any;
  suggestedTemplate: any;
}

export default function SmartImportModal({ open, onClose, onImportSuccess, onAnalysisComplete }: SmartImportModalProps) {
  const [currentStep, setCurrentStep] = useState<'input' | 'processing'>('input');
  const [url, setUrl] = useState('');
  const [importType, setImportType] = useState<'url' | 'file'>('url');
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [customizedTemplate, setCustomizedTemplate] = useState<any>(null);
  const [processing, setProcessing] = useState(false);


  const [steps, setSteps] = useState<ImportStep[]>([
    {
      id: 'extract',
      title: 'Extract Content',
      description: 'Reading content from the provided source',
      completed: false,
      loading: false
    },
    {
      id: 'analyze',
      title: 'AI Analysis',
      description: 'Analyzing and categorizing the content',
      completed: false,
      loading: false
    },
    {
      id: 'structure',
      title: 'Structure Template',
      description: 'Creating template structure and sections',
      completed: false,
      loading: false
    }
  ]);

  const updateStep = (stepId: string, updates: Partial<ImportStep>) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const handleSmartImport = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setProcessing(true);
    setCurrentStep('processing');

    try {
      // Step 1: Extract content
      updateStep('extract', { loading: true });
      console.log('🚀 Smart Import: Starting analysis for URL:', url.trim());

      const response = await fetch('/api/templates/smart-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();
      console.log('📊 Smart Import: API Response:', result);

      if (!response.ok) {
        console.error('❌ Smart Import: API Error:', result);
        throw new Error(result.error || 'Failed to import content');
      }

      updateStep('extract', { loading: false, completed: true });
      updateStep('analyze', { loading: true });

      // Simulate processing steps for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      updateStep('analyze', { loading: false, completed: true });
      updateStep('structure', { loading: true });

      await new Promise(resolve => setTimeout(resolve, 500));

      updateStep('structure', { loading: false, completed: true });

      console.log('🧠 Smart Import: Analysis Result:', result.analysis);
      console.log('📝 Smart Import: Suggested Template:', result.suggestedTemplate);
      console.log('📋 Smart Import: Sections Created:', result.analysis?.sections);

      setAnalysisResult(result);
      setCustomizedTemplate(result.suggestedTemplate);
      
      // Pass data to parent and close Smart Import modal
      console.log('🔄 Smart Import: Passing data to parent component');
      onAnalysisComplete(result);
      onClose();

    } catch (error: any) {
      console.error('Smart import error:', error);
      toast.error(error.message || 'Failed to import content');

      // Mark current step as failed
      const currentStepId = steps.find(s => s.loading)?.id;
      if (currentStepId) {
        updateStep(currentStepId, {
          loading: false,
          error: error.message || 'Import failed'
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleFileImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.templates || !Array.isArray(importData.templates)) {
        throw new Error("Invalid template file format");
      }

      // For file import, we'll use the existing logic
      // This maintains backward compatibility
      toast.success("File import functionality - redirecting to existing import");
      onClose();

    } catch (error: any) {
      toast.error(error.message || "Failed to import file");
    }
  };

  const handleSaveTemplate = async () => {
    if (!customizedTemplate) return;

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customizedTemplate),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save template');
      }

      toast.success('Template imported successfully!');
      onImportSuccess();
      onClose();

    } catch (error: any) {
      toast.error(error.message || 'Failed to save template');
    }
  };

  const handleCustomizeTemplate = (field: string, value: any) => {
    setCustomizedTemplate((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const renderInputStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-heading-2 font-heading-2 text-default-font mb-2">Import Template</h2>
        <p className="text-body font-body text-subtext-color">Import templates from URLs or files</p>
      </div>

      <div className="flex gap-2 p-1 bg-neutral-border rounded-lg">
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${importType === 'url'
            ? 'bg-default-background text-brand-600 shadow-sm'
            : 'text-subtext-color hover:text-default-font'
            }`}
          onClick={() => setImportType('url')}
        >
          <FeatherLink className="w-4 h-4 inline mr-2" />
          From URL
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${importType === 'file'
            ? 'bg-default-background text-brand-600 shadow-sm'
            : 'text-subtext-color hover:text-default-font'
            }`}
          onClick={() => setImportType('file')}
        >
          <FeatherUpload className="w-4 h-4 inline mr-2" />
          From File
        </button>
      </div>

      {importType === 'url' ? (
        <div className="space-y-4">
          <TextField
            className="w-full"
            variant="filled"
            label="Content URL"
            helpText="Enter a URL to GitHub releases, changelog, or documentation"
          >
            <TextField.Input
              placeholder="https://github.com/owner/repo/releases"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </TextField>

          <div className="bg-brand-50 p-4 rounded-lg">
            <h4 className="text-body font-body text-default-font mb-2">Supported Sources:</h4>
            <div className="space-y-2 text-caption font-caption text-subtext-color">
              <div className="flex items-center gap-2">
                <FeatherGithub className="w-4 h-4" />
                <span>GitHub Releases & README files</span>
              </div>
              <div className="flex items-center gap-2">
                <FeatherGlobe className="w-4 h-4" />
                <span>Public changelog and documentation pages</span>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            variant="brand"
            onClick={handleSmartImport}
            disabled={!url.trim() || processing}
          >
            {processing ? (
              <>
                <FeatherLoader className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Content...
              </>
            ) : (
              <>
                <FeatherLink className="w-4 h-4 mr-2" />
                Import from URL
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-neutral-border rounded-lg p-6 text-center">
            <FeatherUpload className="w-8 h-8 mx-auto text-subtext-color mb-2" />
            <p className="text-body font-body text-subtext-color mb-2">Drop a JSON file here or click to browse</p>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="file-input"
            />
            <Button
              variant="neutral-tertiary"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              Choose File
            </Button>
            {file && (
              <p className="text-caption font-caption text-subtext-color mt-2">Selected: {file.name}</p>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleFileImport}
            disabled={!file}
          >
            <FeatherUpload className="w-4 h-4 mr-2" />
            Import from File
          </Button>
        </div>
      )}
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-heading-2 font-heading-2 text-default-font mb-2">Processing Content</h2>
        <p className="text-body font-body text-subtext-color">Analyzing and structuring your content...</p>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border border-neutral-border">
            <div className="flex-shrink-0">
              {step.loading ? (
                <FeatherLoader className="w-5 h-5 animate-spin text-brand-600" />
              ) : step.completed ? (
                <FeatherCheck className="w-5 h-5 text-success-600" />
              ) : step.error ? (
                <FeatherX className="w-5 h-5 text-error-600" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-neutral-border" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-body font-body text-default-font">{step.title}</h4>
              <p className="text-caption font-caption text-subtext-color">{step.description}</p>
              {step.error && (
                <p className="text-caption font-caption text-error-600 mt-1">{step.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );





  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-neutral-border">
          <h1 className="text-heading-2 font-heading-2 text-default-font">Smart Import</h1>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-50 rounded"
          >
            <FeatherX className="w-5 h-5 text-subtext-color" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {currentStep === 'input' && renderInputStep()}
          {currentStep === 'processing' && renderProcessingStep()}
        </div>
      </div>


    </div>
  );
}