# Replit Prompt: CommonWell Document Query UI - EXTENSION

## Document Download Feature using Binary Retrieve API

This prompt EXTENDS the previous CommonWell Document Query UI to add full document download capabilities using the CommonWell FHIR R4 Binary Retrieve API.

---

## Overview

After querying DocumentReference resources, users need the ability to download the actual document content. CommonWell provides a Binary resource endpoint that returns the document data (base64 encoded or raw bytes).

---

## Binary Retrieve API Reference

### Endpoint

```
GET /v2/R4/Binary/{documentId}
```

### Base URLs

```typescript
const BINARY_ENDPOINTS = {
  integration: 'https://api.integration.commonwellalliance.lkopera.com/v2/R4/Binary',
  production: 'https://api.commonwellalliance.lkopera.com/v2/R4/Binary'
};
```

### Document ID Source

The document ID comes from the DocumentReference response:
- **Option 1**: `DocumentReference.content[0].attachment.url` - Full URL to Binary resource
- **Option 2**: `DocumentReference.masterIdentifier.value` - Document unique ID

### Response Structure

```json
{
  "resourceType": "Binary",
  "id": "eyJEb2NJZCI6IkJpbmFyeS9wYXRpZW50bm90ZTQw...",
  "contentType": "application/xml",
  "data": "PD94bWwgdmVyc2lvbj0iMS4wIj8+DQo8Q2xpbmljYWxEb2N1bWVudC..."
}
```

**Key Fields:**
- `contentType`: MIME type of the document
- `data`: Base64-encoded document content

---

## UI Extensions

### 1. Enhanced Document Card with Download Button

Update each document card in the results to include download functionality:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📄 Document #1                                          [⬇️ Download] │
│ ───────────────────────────────────────────────────────────────────── │
│ Unique ID: eyJEb2NJZCI6IkJpbmFyeS9wYXRp...         [📋 Copy]        │
│ Type: Clinical Note (clinical-note)                                  │
│ Content Type: application/xml                                        │
│ Status: current                                                      │
│ Source: Oswego Health System                                         │
│ Source Patient ID: T1-22198900                                       │
│                                                                      │
│ Download URL:                                                        │
│ https://api.commonwellalliance.lkopera.com/v2/R4/Binary/eyJEb2...   │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │ [📋 Copy ID] [🔗 Copy URL] [👁️ Preview] [⬇️ Download] [💾 Save] │  │
│ └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Button Actions:**
- **Copy ID**: Copy masterIdentifier.value to clipboard
- **Copy URL**: Copy full Binary URL to clipboard
- **Preview**: Open preview modal (for supported types)
- **Download**: Fetch Binary and trigger browser download
- **Save**: Save to browser's IndexedDB for offline access

### 2. Bulk Download Section

Add a bulk download toolbar above the documents list:

```
┌─────────────────────────────────────────────────────────────────────┐
│ BULK ACTIONS                                                        │
├─────────────────────────────────────────────────────────────────────┤
│ ☑️ Select All (47 documents)                                        │
│                                                                      │
│ Selected: 12 documents                                               │
│                                                                      │
│ [⬇️ Download Selected] [📦 Download as ZIP] [📋 Export Metadata CSV] │
│                                                                      │
│ Download Progress:                                                   │
│ ████████████░░░░░░░░░░░░░░░░░░░░ 8/12 (67%)                        │
│ Currently downloading: Document #9 - CCD_2025_01_15.xml             │
│ Speed: 1.2 MB/s | ETA: 45 seconds                                   │
│                                                                      │
│ [⏸️ Pause] [❌ Cancel]                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Download Progress Modal

When downloading multiple documents, show a progress modal:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📥 Downloading Documents                                    [✕]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Overall Progress: 8 of 12 documents                                  │
│ ████████████████████░░░░░░░░░░░░░░░░░░░░ 67%                        │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ✅ Document #1 - CCD_patient123_2025-01-10.xml (245 KB)         │ │
│ │ ✅ Document #2 - DischargeSum_2025-01-08.xml (128 KB)           │ │
│ │ ✅ Document #3 - ProgressNote_2025-01-05.pdf (89 KB)            │ │
│ │ ✅ Document #4 - Consultation_2024-12-20.xml (156 KB)           │ │
│ │ ✅ Document #5 - LabReport_2024-12-15.pdf (234 KB)              │ │
│ │ ✅ Document #6 - Imaging_2024-12-10.pdf (1.2 MB)                │ │
│ │ ✅ Document #7 - Referral_2024-12-01.xml (67 KB)                │ │
│ │ ⏳ Document #8 - CCD_2024-11-25.xml (downloading... 45%)        │ │
│ │ ⏸️ Document #9 - ProcedureNote_2024-11-20.xml (pending)         │ │
│ │ ⏸️ Document #10 - H&P_2024-11-15.xml (pending)                  │ │
│ │ ⏸️ Document #11 - DischargeSum_2024-11-10.xml (pending)         │ │
│ │ ⏸️ Document #12 - CCD_2024-11-01.xml (pending)                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Total Size: 2.8 MB downloaded of ~4.2 MB                            │
│ Time Elapsed: 1m 23s | Estimated Remaining: 45s                     │
│                                                                      │
│ [⏸️ Pause All] [❌ Cancel All] [📂 Open Download Folder]            │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Document Preview Modal

For previewable document types, show inline preview:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📄 Document Preview                                         [✕]     │
│ CCD_patient123_2025-01-15.xml                                       │
├─────────────────────────────────────────────────────────────────────┤
│ [Raw XML] [Formatted View] [Sections]              [⬇️ Download]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ <?xml version="1.0" encoding="UTF-8"?>                              │
│ <ClinicalDocument xmlns="urn:hl7-org:v3">                           │
│   <realmCode code="US"/>                                            │
│   <typeId root="2.16.840.1.113883.1.3"                             │
│          extension="POCD_HD000040"/>                                │
│   <templateId root="2.16.840.1.113883.10.20.22.1.1"/>              │
│   <id root="2.16.840.1.113883.19.5.99999.1"                        │
│       extension="TT988"/>                                           │
│   <code code="34133-9"                                              │
│         codeSystem="2.16.840.1.113883.6.1"                         │
│         displayName="Summarization of Episode Note"/>               │
│   ...                                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Preview Support by Content Type:**

| Content Type | Preview Method |
|--------------|----------------|
| application/xml, text/xml | Syntax-highlighted XML viewer |
| application/pdf | Embedded PDF viewer (iframe or pdf.js) |
| text/plain | Plain text viewer |
| image/jpeg, image/png, image/gif | Image viewer with zoom |
| image/tiff | Convert to viewable format or show thumbnail |
| application/dicom | Show metadata only (full DICOM viewer out of scope) |

---

## Download Service Implementation

### Core Download Function

```typescript
interface DownloadResult {
  success: boolean;
  documentId: string;
  filename: string;
  contentType: string;
  size: number;
  blob?: Blob;
  error?: string;
}

interface BinaryResponse {
  resourceType: 'Binary';
  id: string;
  contentType: string;
  data: string; // Base64 encoded
}

async function downloadDocument(
  documentUrl: string,
  jwtToken: string,
  onProgress?: (progress: number) => void
): Promise<DownloadResult> {
  try {
    const response = await fetch(documentUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Accept': 'application/fhir+json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const binaryResource: BinaryResponse = await response.json();
    
    // Decode base64 data
    const binaryData = atob(binaryResource.data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: binaryResource.contentType });
    const filename = generateFilename(binaryResource);
    
    return {
      success: true,
      documentId: binaryResource.id,
      filename,
      contentType: binaryResource.contentType,
      size: blob.size,
      blob
    };
  } catch (error) {
    return {
      success: false,
      documentId: extractDocumentId(documentUrl),
      filename: 'unknown',
      contentType: 'unknown',
      size: 0,
      error: error.message
    };
  }
}
```

### Filename Generation

```typescript
function generateFilename(
  binaryResource: BinaryResponse,
  documentMetadata?: DocumentMetadata
): string {
  const extension = getExtensionFromMimeType(binaryResource.contentType);
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Try to create meaningful filename from metadata
  if (documentMetadata) {
    const docType = documentMetadata.category || 'Document';
    const patientId = documentMetadata.sourcePatientId || 'unknown';
    return `${docType}_${patientId}_${timestamp}.${extension}`;
  }
  
  // Fallback to document ID
  const shortId = binaryResource.id.substring(0, 8);
  return `Document_${shortId}_${timestamp}.${extension}`;
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExtension: Record<string, string> = {
    'application/xml': 'xml',
    'text/xml': 'xml',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/dicom': 'dcm',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/tiff': 'tiff',
    'application/x-hl7': 'hl7',
    'application/rtf': 'rtf',
    'text/html': 'html'
  };
  
  return mimeToExtension[mimeType] || 'bin';
}
```

### Trigger Browser Download

```typescript
function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

### Bulk Download with ZIP

```typescript
import JSZip from 'jszip';

interface BulkDownloadOptions {
  documents: DocumentMetadata[];
  jwtToken: string;
  onProgress: (current: number, total: number, currentDoc: string) => void;
  onDocumentComplete: (doc: DocumentMetadata, result: DownloadResult) => void;
  concurrency?: number; // Max parallel downloads (default: 3)
}

async function bulkDownloadAsZip(options: BulkDownloadOptions): Promise<Blob> {
  const { documents, jwtToken, onProgress, onDocumentComplete, concurrency = 3 } = options;
  
  const zip = new JSZip();
  const results: DownloadResult[] = [];
  
  // Process in batches for controlled concurrency
  for (let i = 0; i < documents.length; i += concurrency) {
    const batch = documents.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(async (doc, batchIndex) => {
        const globalIndex = i + batchIndex;
        onProgress(globalIndex + 1, documents.length, doc.documentUniqueId);
        
        const result = await downloadDocument(doc.documentUrl, jwtToken);
        onDocumentComplete(doc, result);
        
        if (result.success && result.blob) {
          // Add to ZIP with folder organization by content type
          const folder = getFolderName(result.contentType);
          zip.file(`${folder}/${result.filename}`, result.blob);
        }
        
        return result;
      })
    );
    
    results.push(...batchResults);
  }
  
  // Generate ZIP file
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  return zipBlob;
}

function getFolderName(contentType: string): string {
  if (contentType.includes('xml')) return 'XML_Documents';
  if (contentType.includes('pdf')) return 'PDF_Documents';
  if (contentType.includes('image')) return 'Images';
  if (contentType.includes('dicom')) return 'DICOM';
  return 'Other';
}
```

---

## Download Queue Manager

Implement a download queue to manage multiple downloads:

```typescript
interface QueuedDownload {
  id: string;
  document: DocumentMetadata;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  progress: number;
  result?: DownloadResult;
  error?: string;
  startTime?: number;
  endTime?: number;
}

interface DownloadQueueState {
  queue: QueuedDownload[];
  isRunning: boolean;
  isPaused: boolean;
  currentIndex: number;
  totalSize: number;
  downloadedSize: number;
  startTime: number | null;
}

class DownloadQueueManager {
  private state: DownloadQueueState;
  private jwtToken: string;
  private concurrency: number;
  private onStateChange: (state: DownloadQueueState) => void;

  constructor(
    jwtToken: string,
    onStateChange: (state: DownloadQueueState) => void,
    concurrency: number = 3
  ) {
    this.jwtToken = jwtToken;
    this.onStateChange = onStateChange;
    this.concurrency = concurrency;
    this.state = {
      queue: [],
      isRunning: false,
      isPaused: false,
      currentIndex: 0,
      totalSize: 0,
      downloadedSize: 0,
      startTime: null
    };
  }

  addToQueue(documents: DocumentMetadata[]): void {
    const newItems: QueuedDownload[] = documents.map(doc => ({
      id: doc.documentUniqueId,
      document: doc,
      status: 'pending',
      progress: 0
    }));
    
    this.state.queue.push(...newItems);
    this.notifyStateChange();
  }

  async start(): Promise<void> {
    if (this.state.isRunning) return;
    
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.startTime = Date.now();
    this.notifyStateChange();

    await this.processQueue();
  }

  pause(): void {
    this.state.isPaused = true;
    this.notifyStateChange();
  }

  resume(): void {
    this.state.isPaused = false;
    this.processQueue();
    this.notifyStateChange();
  }

  cancel(): void {
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.queue.forEach(item => {
      if (item.status === 'pending' || item.status === 'downloading') {
        item.status = 'failed';
        item.error = 'Cancelled by user';
      }
    });
    this.notifyStateChange();
  }

  private async processQueue(): Promise<void> {
    while (this.state.isRunning && !this.state.isPaused) {
      const pendingItems = this.state.queue.filter(item => item.status === 'pending');
      
      if (pendingItems.length === 0) {
        this.state.isRunning = false;
        break;
      }

      // Process batch
      const batch = pendingItems.slice(0, this.concurrency);
      
      await Promise.all(
        batch.map(item => this.downloadItem(item))
      );
    }
    
    this.notifyStateChange();
  }

  private async downloadItem(item: QueuedDownload): Promise<void> {
    item.status = 'downloading';
    item.startTime = Date.now();
    this.notifyStateChange();

    const result = await downloadDocument(
      item.document.documentUrl,
      this.jwtToken,
      (progress) => {
        item.progress = progress;
        this.notifyStateChange();
      }
    );

    item.endTime = Date.now();
    item.result = result;

    if (result.success) {
      item.status = 'completed';
      this.state.downloadedSize += result.size;
      
      // Auto-trigger browser download
      if (result.blob) {
        triggerBrowserDownload(result.blob, result.filename);
      }
    } else {
      item.status = 'failed';
      item.error = result.error;
    }

    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.onStateChange({ ...this.state });
  }

  getStatistics(): DownloadStatistics {
    const completed = this.state.queue.filter(i => i.status === 'completed');
    const failed = this.state.queue.filter(i => i.status === 'failed');
    const totalTime = this.state.startTime 
      ? Date.now() - this.state.startTime 
      : 0;

    return {
      total: this.state.queue.length,
      completed: completed.length,
      failed: failed.length,
      pending: this.state.queue.filter(i => i.status === 'pending').length,
      totalSize: this.state.downloadedSize,
      totalTime,
      averageSpeed: totalTime > 0 
        ? this.state.downloadedSize / (totalTime / 1000) 
        : 0
    };
  }
}
```

---

## React Components

### DownloadButton Component

```typescript
interface DownloadButtonProps {
  document: DocumentMetadata;
  jwtToken: string;
  variant?: 'icon' | 'button' | 'link';
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ 
  document, 
  jwtToken,
  variant = 'button' 
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await downloadDocument(
        document.documentUrl,
        jwtToken,
        setProgress
      );

      if (result.success && result.blob) {
        triggerBrowserDownload(result.blob, result.filename);
      } else {
        setError(result.error || 'Download failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="p-2 hover:bg-gray-100 rounded"
        title="Download document"
      >
        {isDownloading ? (
          <Spinner size="sm" />
        ) : (
          <DownloadIcon className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {isDownloading ? (
        <>
          <Spinner size="sm" />
          <span>Downloading... {progress}%</span>
        </>
      ) : (
        <>
          <DownloadIcon className="w-4 h-4" />
          <span>Download</span>
        </>
      )}
    </button>
  );
};
```

### BulkDownloadToolbar Component

```typescript
interface BulkDownloadToolbarProps {
  documents: DocumentMetadata[];
  selectedIds: Set<string>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  jwtToken: string;
}

const BulkDownloadToolbar: React.FC<BulkDownloadToolbarProps> = ({
  documents,
  selectedIds,
  onSelectAll,
  onDeselectAll,
  jwtToken
}) => {
  const [queueState, setQueueState] = useState<DownloadQueueState | null>(null);
  const [downloadManager, setDownloadManager] = useState<DownloadQueueManager | null>(null);

  const selectedDocuments = documents.filter(d => selectedIds.has(d.documentUniqueId));

  const handleBulkDownload = () => {
    const manager = new DownloadQueueManager(jwtToken, setQueueState);
    manager.addToQueue(selectedDocuments);
    manager.start();
    setDownloadManager(manager);
  };

  const handleDownloadAsZip = async () => {
    const zipBlob = await bulkDownloadAsZip({
      documents: selectedDocuments,
      jwtToken,
      onProgress: (current, total, currentDoc) => {
        // Update UI
      },
      onDocumentComplete: (doc, result) => {
        // Update UI
      }
    });

    const timestamp = new Date().toISOString().split('T')[0];
    triggerBrowserDownload(zipBlob, `CommonWell_Documents_${timestamp}.zip`);
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === documents.length}
              onChange={selectedIds.size === documents.length ? onDeselectAll : onSelectAll}
            />
            <span>Select All ({documents.length} documents)</span>
          </label>
          <span className="text-gray-600">
            Selected: {selectedIds.size} documents
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkDownload}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            ⬇️ Download Selected
          </button>
          <button
            onClick={handleDownloadAsZip}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            📦 Download as ZIP
          </button>
          <button
            onClick={() => exportMetadataCSV(selectedDocuments)}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            📋 Export Metadata CSV
          </button>
        </div>
      </div>

      {/* Progress Section */}
      {queueState && queueState.isRunning && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span>
              Downloading: {queueState.queue.filter(i => i.status === 'completed').length} / {queueState.queue.length}
            </span>
            <span>
              {formatBytes(queueState.downloadedSize)} downloaded
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{
                width: `${(queueState.queue.filter(i => i.status === 'completed').length / queueState.queue.length) * 100}%`
              }}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            {queueState.isPaused ? (
              <button
                onClick={() => downloadManager?.resume()}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm"
              >
                ▶️ Resume
              </button>
            ) : (
              <button
                onClick={() => downloadManager?.pause()}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm"
              >
                ⏸️ Pause
              </button>
            )}
            <button
              onClick={() => downloadManager?.cancel()}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm"
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

### DocumentPreviewModal Component

```typescript
interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentMetadata;
  jwtToken: string;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  jwtToken
}) => {
  const [content, setContent] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'raw' | 'formatted' | 'sections'>('raw');

  useEffect(() => {
    if (isOpen && !content) {
      loadContent();
    }
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen]);

  const loadContent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await downloadDocument(document.documentUrl, jwtToken);
      
      if (result.success && result.blob) {
        // For text-based content, read as text
        if (isTextContent(document.contentType)) {
          const text = await result.blob.text();
          setContent(text);
        }
        
        // Create blob URL for preview
        const url = URL.createObjectURL(result.blob);
        setBlobUrl(url);
      } else {
        setError(result.error || 'Failed to load document');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreview = () => {
    if (isLoading) {
      return <div className="flex justify-center p-8"><Spinner /></div>;
    }

    if (error) {
      return <div className="text-red-600 p-4">{error}</div>;
    }

    const contentType = document.contentType;

    // PDF Preview
    if (contentType === 'application/pdf' && blobUrl) {
      return (
        <iframe
          src={blobUrl}
          className="w-full h-[600px] border-0"
          title="PDF Preview"
        />
      );
    }

    // Image Preview
    if (contentType.startsWith('image/') && blobUrl) {
      return (
        <div className="flex justify-center p-4">
          <img
            src={blobUrl}
            alt="Document Preview"
            className="max-w-full max-h-[600px] object-contain"
          />
        </div>
      );
    }

    // XML/Text Preview
    if (isTextContent(contentType) && content) {
      return (
        <div className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-[600px]">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {formatXml(content)}
          </pre>
        </div>
      );
    }

    return (
      <div className="text-gray-600 p-4">
        Preview not available for this content type ({contentType}).
        <button
          onClick={() => triggerBrowserDownload(new Blob([content || '']), document.documentUniqueId)}
          className="ml-2 text-blue-600 underline"
        >
          Download instead
        </button>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[90vw] max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Document Preview</h2>
            <p className="text-sm text-gray-600">{document.contentType}</p>
          </div>
          <div className="flex items-center gap-2">
            <DownloadButton document={document} jwtToken={jwtToken} variant="button" />
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
              ✕
            </button>
          </div>
        </div>

        {/* Tabs for XML content */}
        {isTextContent(document.contentType) && (
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-4 py-2 ${activeTab === 'raw' ? 'border-b-2 border-blue-600' : ''}`}
            >
              Raw
            </button>
            <button
              onClick={() => setActiveTab('formatted')}
              className={`px-4 py-2 ${activeTab === 'formatted' ? 'border-b-2 border-blue-600' : ''}`}
            >
              Formatted
            </button>
            {document.contentType.includes('xml') && (
              <button
                onClick={() => setActiveTab('sections')}
                className={`px-4 py-2 ${activeTab === 'sections' ? 'border-b-2 border-blue-600' : ''}`}
              >
                Sections
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-auto">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

function isTextContent(contentType: string): boolean {
  return (
    contentType.includes('xml') ||
    contentType.includes('text') ||
    contentType.includes('json') ||
    contentType.includes('hl7')
  );
}

function formatXml(xml: string): string {
  // Basic XML formatting - in production, use a proper XML formatter
  let formatted = '';
  let indent = 0;
  const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
  
  lines.forEach(line => {
    if (line.match(/^<\/\w/)) indent--;
    formatted += '  '.repeat(Math.max(0, indent)) + line.trim() + '\n';
    if (line.match(/^<\w[^>]*[^\/]>$/)) indent++;
  });
  
  return formatted;
}
```

---

## Error Handling for Downloads

```typescript
interface DownloadError {
  code: string;
  message: string;
  suggestion: string;
}

const DOWNLOAD_ERRORS: Record<number, DownloadError> = {
  400: {
    code: 'BAD_REQUEST',
    message: 'Invalid document request',
    suggestion: 'Check that the document ID is valid'
  },
  401: {
    code: 'UNAUTHORIZED',
    message: 'JWT token is invalid or expired',
    suggestion: 'Generate a new JWT token and try again'
  },
  403: {
    code: 'FORBIDDEN',
    message: 'Access denied to this document',
    suggestion: 'Verify you have permission to access this patient\'s documents'
  },
  404: {
    code: 'NOT_FOUND',
    message: 'Document not found',
    suggestion: 'The document may have been deleted or the ID is incorrect'
  },
  408: {
    code: 'TIMEOUT',
    message: 'Request timed out',
    suggestion: 'The document may be large. Try downloading again.'
  },
  500: {
    code: 'SERVER_ERROR',
    message: 'CommonWell server error',
    suggestion: 'Try again in a few minutes. If the problem persists, contact support.'
  }
};

function getDownloadError(statusCode: number): DownloadError {
  return DOWNLOAD_ERRORS[statusCode] || {
    code: 'UNKNOWN',
    message: `Unexpected error (${statusCode})`,
    suggestion: 'Try again or contact support'
  };
}
```

---

## Utility Functions

```typescript
// Format bytes to human readable
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// Format duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

// Export metadata as CSV
function exportMetadataCSV(documents: DocumentMetadata[]): void {
  const headers = [
    'Document ID',
    'Content Type',
    'Category',
    'Status',
    'Source Organization',
    'Source Patient ID',
    'Download URL'
  ];
  
  const rows = documents.map(doc => [
    doc.documentUniqueId,
    doc.contentType,
    doc.category,
    doc.status,
    doc.organizationName,
    doc.sourcePatientId,
    doc.documentUrl
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const timestamp = new Date().toISOString().split('T')[0];
  triggerBrowserDownload(blob, `CommonWell_Documents_${timestamp}.csv`);
}
```

---

## NPM Dependencies to Add

```json
{
  "dependencies": {
    "jszip": "^3.10.1",
    "file-saver": "^2.0.5"
  }
}
```

---

## Timeout Configuration

Per CommonWell Specification V4.4 Appendix B:

```typescript
const DOWNLOAD_CONFIG = {
  // Individual document retrieve timeout
  timeout: 60000, // 60 seconds (per spec)
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000, // 1 second initial delay
  retryBackoff: 2, // Exponential backoff multiplier
  
  // Concurrency for bulk downloads
  maxConcurrent: 3,
  
  // Max file size to preview (larger files skip preview)
  maxPreviewSize: 10 * 1024 * 1024 // 10 MB
};
```

---

## Summary

This extension adds:

1. **Single Document Download** - Download button on each document card
2. **Bulk Download** - Select multiple documents and download individually or as ZIP
3. **Download Queue** - Managed queue with pause/resume/cancel
4. **Progress Tracking** - Real-time progress for individual and bulk downloads
5. **Document Preview** - In-browser preview for PDF, images, XML, and text
6. **Error Handling** - Comprehensive error messages with suggestions
7. **Export Options** - Download as ZIP, export metadata as CSV

The implementation uses the CommonWell Binary Retrieve API endpoint:
```
GET /v2/R4/Binary/{documentId}
```

Which returns base64-encoded document content that is decoded and offered for download.
