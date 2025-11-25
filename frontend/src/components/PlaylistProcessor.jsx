/**
 * Example: Background Playlist Processing Component
 * Shows how to use the new background job system for playlists with 10+ videos
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useCustomAlerts } from '../hooks/useCustomAlerts';
import io from 'socket.io-client';

function PlaylistProcessor() {
  const { user } = useAuth();
  const { success, error } = useCustomAlerts();
  const [url, setUrl] = useState('');
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [socket, setSocket] = useState(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000');
      
      newSocket.on('connect', () => {
        console.log('Connected to server');
        // Join user room for receiving job updates
        newSocket.emit('join', { userId: user.uid });
      });

      // Listen for job progress updates
      newSocket.on('playlist:job:progress', (data) => {
        console.log('Progress update:', data);
        setProgress(data.progress);
        setJobStatus({
          ...jobStatus,
          progress: data.progress,
          processedVideos: data.processedVideos
        });
      });

      // Listen for job completion
      newSocket.on('playlist:job:completed', (data) => {
        console.log('Job completed:', data);
        setJobStatus({
          status: 'completed',
          successful: data.successful,
          failed: data.failed
        });
        // Fetch final results
        fetchJobResults(data.jobId);
      });

      // Listen for job failures
      newSocket.on('playlist:job:failed', (data) => {
        console.log('Job failed:', data);
        setJobStatus({
          status: 'failed',
          error: data.error
        });
      });

      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, [user]);

  // Start playlist processing
  const handleStartProcessing = async () => {
    try {
      const token = await user.getIdToken();
      
      const response = await fetch('http://localhost:5000/playlist/start-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      
      if (data.success) {
        setJobId(data.jobId);
        setJobStatus({
          status: 'processing',
          totalVideos: data.total_videos,
          estimatedTime: data.estimated_time
        });
        
        success(`Processing started! Job ID: ${data.jobId}. Estimated time: ${data.estimated_time} minutes`, 'Processing Started');
      } else {
        error('Failed to start processing: ' + data.error, 'Processing Failed');
      }
    } catch (err) {
      console.error('Error:', err);
      error('Failed to start processing', 'Connection Error');
    }
  };

  // Fetch job results when complete
  const fetchJobResults = async (jobIdToFetch) => {
    try {
      const token = await user.getIdToken();
      
      const response = await fetch(`http://localhost:5000/playlist/job/${jobIdToFetch}/results`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Combined transcript:', data.combined_transcript);
        // Now you can use this transcript to generate content
        // For example, redirect to blog generation with the transcript
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  return (
    <div className="playlist-processor">
      <h2>Process Large Playlist (Background)</h2>
      
      <div className="input-section">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter YouTube playlist URL"
          className="border px-4 py-2 rounded-lg w-full"
        />
        <button
          onClick={handleStartProcessing}
          disabled={!url || jobStatus?.status === 'processing'}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg mt-2 disabled:opacity-50"
        >
          {jobStatus?.status === 'processing' ? 'Processing...' : 'Start Background Processing'}
        </button>
      </div>

      {jobStatus && (
        <div className="status-section mt-6 p-4 border rounded-lg">
          <h3 className="font-bold mb-2">Job Status</h3>
          
          {jobStatus.status === 'processing' && (
            <div>
              <p>Status: Processing in background...</p>
              <p>Total Videos: {jobStatus.totalVideos}</p>
              <p>Processed: {jobStatus.processedVideos || 0}/{jobStatus.totalVideos}</p>
              <p>Estimated Time: ~{jobStatus.estimatedTime} minutes</p>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                >
                  <span className="text-xs text-white px-2">{progress}%</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mt-2">
                💡 You can close this page - you'll get notified when it's done!
              </p>
            </div>
          )}

          {jobStatus.status === 'completed' && (
            <div className="text-green-600">
              <p>✅ Processing Complete!</p>
              <p>Successful: {jobStatus.successful}</p>
              <p>Failed: {jobStatus.failed}</p>
              <button
                onClick={() => fetchJobResults(jobId)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg mt-2"
              >
                Get Results & Generate Content
              </button>
            </div>
          )}

          {jobStatus.status === 'failed' && (
            <div className="text-red-600">
              <p>❌ Processing Failed</p>
              <p>Error: {jobStatus.error}</p>
            </div>
          )}
        </div>
      )}

      <div className="info-section mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-bold mb-2">ℹ️ How it works:</h4>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Click "Start Background Processing" - get instant response</li>
          <li>Processing happens in the background (no waiting!)</li>
          <li>Real-time progress updates via WebSocket</li>
          <li>Notification when complete</li>
          <li>Optimal delays applied automatically (faster for small playlists)</li>
          <li>For 10-20 videos: ~8-12 minutes (but you don't have to wait!)</li>
        </ul>
      </div>
    </div>
  );
}

export default PlaylistProcessor;
