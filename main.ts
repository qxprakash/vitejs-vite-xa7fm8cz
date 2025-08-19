import Uppy from '@uppy/core';
import Dashboard from '@uppy/dashboard';
import RemoteSources from '@uppy/remote-sources';
import Webcam from '@uppy/webcam';
import Audio from '@uppy/audio';
import ScreenCapture from '@uppy/screen-capture';
import GoldenRetriever from '@uppy/golden-retriever';
import Tus from '@uppy/tus';
import XHRUpload from '@uppy/xhr-upload';
import ImageEditor from '@uppy/image-editor';
import DropTarget from '@uppy/drop-target';
import Compressor from '@uppy/compressor';

import type {
  FileProgressNotStarted,
  FileProgressStarted,
} from '@uppy/utils/lib/FileProgress';


import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';
import '@uppy/audio/dist/style.css';
import '@uppy/screen-capture/dist/style.css';
import '@uppy/image-editor/dist/style.css';

// Extend Window interface to include uppy
declare global {
  interface Window {
    uppy: Uppy;
  }
}

type UploaderType = 'tus' | 'xhr';

const UPLOADER: UploaderType = 'tus';
const COMPANION_URL = 'http://companion.uppy.io';
const companionAllowedHosts: string[] = [];
const TUS_ENDPOINT = 'https://tusd.tusdemo.net/files/';
const XHR_ENDPOINT = '';

const RESTORE = false;

// Progress tracking functions using imported FileProgress types
interface FileWithProgress {
  name: string;
  size: number;
  progress: FileProgressNotStarted | FileProgressStarted;
}

// Type guard to check if progress has started
function isProgressStarted(progress: FileProgressNotStarted | FileProgressStarted): progress is FileProgressStarted {
  return 'bytesUploaded' in progress;
}

function handleFileProgressNotStarted(file: FileWithProgress, progress: FileProgressNotStarted): void {
  console.log(`📁 File "${file.name}" added - Status: ${progress.uploadStarted ? 'Ready' : 'Waiting'}`);
  console.log(`   Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Upload started: ${progress.uploadStarted}`);
}

function handleFileProgressStarted(file: FileWithProgress, progress: FileProgressStarted): void {
  const bytesTotal = progress.bytesTotal || 1; // Fallback to 1 to avoid division by zero
  const percentage = Math.round((progress.bytesUploaded / bytesTotal) * 100);
  console.log(`🚀 Uploading "${file.name}" - ${percentage}% complete`);
  console.log(`   Progress: ${(progress.bytesUploaded / 1024 / 1024).toFixed(2)} MB / ${(bytesTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Upload started: ${progress.uploadStarted}`);
  console.log(`   Upload complete: ${progress.uploadComplete}`);

  if (progress.uploadStarted && progress.uploadComplete) {
    console.log(`✅ Upload completed for "${file.name}"`);
  }
}

// Helper function to determine progress type and handle accordingly using type guard
function handleFileProgress(file: FileWithProgress): void {
  const progress = file.progress;

  if (isProgressStarted(progress)) {
    // TypeScript now knows this is FileProgressStarted
    handleFileProgressStarted(file, progress);
  } else {
    // TypeScript now knows this is FileProgressNotStarted
    handleFileProgressNotStarted(file, progress);
  }
}

const uppyDashboard = new Uppy({ debug: true })
  .use(Dashboard, {
    inline: true,
    target: '#app',
    showProgressDetails: true,
    proudlyDisplayPoweredByUppy: true,
  })
  .use(RemoteSources, {
    companionUrl: COMPANION_URL,
    sources: [
      'Box',
      'Dropbox',
      'Facebook',
      'GoogleDrive',
      'Instagram',
      'OneDrive',
      'Unsplash',
      'Url',
    ],
    companionAllowedHosts,
  })
  .use(Webcam, {
    showVideoSourceDropdown: true,
    showRecordingLength: true,
  })
  .use(Audio)
  .use(ScreenCapture)
  .use(ImageEditor)
  .use(DropTarget, {
    target: document.body,
  })
  .use(Compressor);

switch (UPLOADER) {
  case 'tus':
    uppyDashboard.use(Tus, { endpoint: TUS_ENDPOINT, limit: 6 });
    break;
  case 'xhr':
    uppyDashboard.use(XHRUpload, {
      endpoint: XHR_ENDPOINT,
      limit: 6,
      bundle: true,
    });
    break;
  default:
    break;
}

if (RESTORE) {
  uppyDashboard.use(GoldenRetriever, { serviceWorker: true });
}

window.uppy = uppyDashboard;

// Event listeners utilizing the FileProgress types
uppyDashboard.on('file-added', (file) => {
  console.log('📁 File added:', file.name);
  handleFileProgress(file as FileWithProgress);
});

uppyDashboard.on('upload-progress', (file, progress) => {
  // Handle progress updates with typed progress information
  if (file && progress && file.name && file.size !== null) {
    const typedFile: FileWithProgress = {
      name: file.name,
      size: file.size,
      progress: progress as FileProgressStarted
    };
    handleFileProgressStarted(typedFile, progress as FileProgressStarted);
  }
});

uppyDashboard.on('upload-success', (file, response) => {
  console.log(`🎉 Successfully uploaded: ${file?.name}`);
  console.log('Response:', response);
});

uppyDashboard.on('upload-error', (file, error, response) => {
  console.error(`❌ Error uploading ${file?.name}:`, error);
  if (response) {
    console.error('Error response:', response);
  }
});

uppyDashboard.on('complete', (result) => {
  if (result.failed && result.failed.length === 0) {
    console.log('Upload successful ✅');
  } else {
    console.warn('Upload failed ❌');
  }
  console.log('successful files:', result.successful);
  console.log('failed files:', result.failed);
});
