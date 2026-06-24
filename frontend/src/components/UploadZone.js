import React, { useState, useRef } from 'react';

function UploadZone({ onFileUpload, onRawTextUpload, isProcessing, error }) {
  const [isDragging, setIsDragging] = useState(false);
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState('file');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const handleRawTextSubmit = () => {
    if (rawText.trim()) {
      onRawTextUpload(rawText);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('file')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'file'
              ? 'bg-soc-accent text-soc-darker'
              : 'bg-soc-dark text-gray-400 hover:text-white'
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'text'
              ? 'bg-soc-accent text-soc-darker'
              : 'bg-soc-dark text-gray-400 hover:text-white'
          }`}
        >
          Paste Raw Logs
        </button>
      </div>

      {/* File Upload Zone */}
      {activeTab === 'file' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-soc-accent bg-soc-accent/10'
              : 'border-gray-700 hover:border-soc-accent/50 bg-soc-dark'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".log,.txt"
          />
          
          <svg
            className="mx-auto h-16 w-16 text-gray-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          
          <p className="text-lg text-white mb-2">
            {isDragging ? 'Drop your log file here' : 'Drag and drop your log file'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to browse
          </p>
          <p className="text-xs text-gray-600">
            Supports: Nginx access.log, Apache logs, and raw .txt files
          </p>
        </div>
      )}

      {/* Raw Text Input */}
      {activeTab === 'text' && (
        <div className="bg-soc-dark rounded-lg p-6 border border-gray-800">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Paste Raw Log Lines
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste your log lines here, one per line..."
            className="w-full h-64 px-4 py-3 bg-soc-darker border border-gray-700 rounded-lg focus:outline-none focus:border-soc-accent text-white font-mono text-sm resize-none"
          />
          <button
            onClick={handleRawTextSubmit}
            disabled={!rawText.trim() || isProcessing}
            className="mt-4 bg-soc-accent hover:bg-soc-accent/80 text-soc-darker font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Analyze Logs
          </button>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 text-soc-accent">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-medium">Processing logs...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-6 bg-soc-danger/10 border border-soc-danger text-soc-danger px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-soc-dark rounded-lg p-4 border border-gray-800">
          <div className="flex items-center space-x-3 mb-2">
            <svg className="w-6 h-6 text-soc-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="font-medium text-white">SQL Injection</h4>
          </div>
          <p className="text-sm text-gray-500">Detects UNION SELECT, OR 1=1, and other SQLi patterns</p>
        </div>

        <div className="bg-soc-dark rounded-lg p-4 border border-gray-800">
          <div className="flex items-center space-x-3 mb-2">
            <svg className="w-6 h-6 text-soc-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h4 className="font-medium text-white">XSS Attacks</h4>
          </div>
          <p className="text-sm text-gray-500">Identifies script tags, event handlers, and JavaScript injection</p>
        </div>

        <div className="bg-soc-dark rounded-lg p-4 border border-gray-800">
          <div className="flex items-center space-x-3 mb-2">
            <svg className="w-6 h-6 text-soc-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h4 className="font-medium text-white">Path Traversal</h4>
          </div>
          <p className="text-sm text-gray-500">Finds ../ patterns, /etc/passwd, and file system access attempts</p>
        </div>
      </div>
    </div>
  );
}

export default UploadZone;
