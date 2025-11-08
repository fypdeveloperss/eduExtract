/**
 * Playlist Job Service
 * Handles background processing of large playlists with real-time progress updates
 */

const EventEmitter = require('events');
const { spawn } = require('child_process');
const path = require('path');

class PlaylistJobManager extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map(); // jobId -> job data
    this.activeJobs = new Map(); // jobId -> process
    this.socketManager = null; // Will be set from server.js
  }

  /**
   * Set socket manager for real-time updates
   */
  setSocketManager(socketManager) {
    this.socketManager = socketManager;
    
    // Listen to job events and emit socket updates
    this.on('jobStarted', (data) => {
      this.emitToUser(data.userId, 'playlist:job:started', data);
    });
    
    this.on('jobProgress', (data) => {
      this.emitToUser(data.userId, 'playlist:job:progress', data);
    });
    
    this.on('jobCompleted', (data) => {
      this.emitToUser(data.userId, 'playlist:job:completed', data);
    });
    
    this.on('jobFailed', (data) => {
      this.emitToUser(data.userId, 'playlist:job:failed', data);
    });
    
    this.on('jobCancelled', (data) => {
      this.emitToUser(data.userId, 'playlist:job:cancelled', data);
    });
  }

  /**
   * Emit socket event to specific user
   */
  emitToUser(userId, event, data) {
    if (this.socketManager && this.socketManager.io) {
      // Emit to all sockets connected by this user
      this.socketManager.io.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Create a new playlist processing job
   * @param {string} userId - User ID
   * @param {Array} videoIds - Array of video IDs
   * @param {Object} options - Processing options
   * @returns {string} jobId
   */
  createJob(userId, videoIds, options = {}) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      userId,
      videoIds,
      totalVideos: videoIds.length,
      status: 'pending', // pending, processing, completed, failed
      progress: 0,
      processedVideos: 0,
      successfulVideos: 0,
      failedVideos: 0,
      transcripts: {},
      errors: [],
      startedAt: null,
      completedAt: null,
      options: {
        delay: options.delay || this.getOptimalDelay(videoIds.length),
        chunkSize: options.chunkSize || this.getOptimalChunkSize(videoIds.length),
        useAdvanced: videoIds.length > 10, // Use advanced script for 10+ videos
      }
    };

    this.jobs.set(jobId, job);
    return jobId;
  }

  /**
   * Get optimal delay based on number of videos
   */
  getOptimalDelay(videoCount) {
    if (videoCount <= 5) return 3;      // Fast for small batches
    if (videoCount <= 10) return 5;     // Medium for 10 videos
    if (videoCount <= 20) return 8;     // Slower for 20 videos
    return 10;                           // Conservative for 20+ videos
  }

  /**
   * Get optimal chunk size based on number of videos
   */
  getOptimalChunkSize(videoCount) {
    if (videoCount <= 10) return videoCount; // No chunking for ≤10
    if (videoCount <= 30) return 5;           // 5 at a time for 10-30
    return 4;                                 // 4 at a time for 30+
  }

  /**
   * Start processing a job
   */
  async startJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'processing') {
      throw new Error('Job already processing');
    }

    job.status = 'processing';
    job.startedAt = new Date();
    this.emit('jobStarted', { jobId, userId: job.userId });

    try {
      // Use advanced script for better handling
      const scriptPath = job.options.useAdvanced 
        ? path.join(__dirname, '../get_batch_transcripts_advanced.py')
        : path.join(__dirname, '../get_batch_transcripts.py');

      const args = job.options.useAdvanced
        ? [
            scriptPath,
            `--delay=${job.options.delay}`,
            `--chunk-size=${job.options.chunkSize}`,
            ...job.videoIds
          ]
        : [
            scriptPath,
            `--delay=${job.options.delay}`,
            ...job.videoIds
          ];

      const pythonProcess = spawn('python', args);
      this.activeJobs.set(jobId, pythonProcess);

      let dataString = '';
      let errorString = '';

      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        const message = data.toString();
        errorString += message;

        // Parse progress updates
        const progressMatch = message.match(/Progress: (\d+)\/(\d+)/);
        if (progressMatch) {
          job.processedVideos = parseInt(progressMatch[1]);
          job.progress = Math.round((job.processedVideos / job.totalVideos) * 100);
          
          this.emit('jobProgress', {
            jobId,
            userId: job.userId,
            progress: job.progress,
            processedVideos: job.processedVideos,
            totalVideos: job.totalVideos
          });
        }

        // Parse success/failure messages
        if (message.includes('✓ Success:')) {
          job.successfulVideos++;
        } else if (message.includes('✗ Failed:')) {
          job.failedVideos++;
        }
      });

      pythonProcess.on('close', (code) => {
        this.activeJobs.delete(jobId);

        if (code !== 0) {
          job.status = 'failed';
          job.errors.push(`Process exited with code ${code}: ${errorString}`);
          this.emit('jobFailed', { jobId, userId: job.userId, error: errorString });
        } else {
          try {
            const result = JSON.parse(dataString);
            job.transcripts = result.transcripts || {};
            job.successfulVideos = result.successful || 0;
            job.failedVideos = result.failed || 0;
            job.status = 'completed';
            job.progress = 100;
            job.completedAt = new Date();
            
            this.emit('jobCompleted', {
              jobId,
              userId: job.userId,
              successful: job.successfulVideos,
              failed: job.failedVideos,
              transcripts: job.transcripts
            });
          } catch (error) {
            job.status = 'failed';
            job.errors.push(`Failed to parse results: ${error.message}`);
            this.emit('jobFailed', { jobId, userId: job.userId, error: error.message });
          }
        }
      });

    } catch (error) {
      job.status = 'failed';
      job.errors.push(error.message);
      this.emit('jobFailed', { jobId, userId: job.userId, error: error.message });
    }
  }

  /**
   * Get job status
   */
  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for a user
   */
  getUserJobs(userId) {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const process = this.activeJobs.get(jobId);
    if (process) {
      process.kill();
      this.activeJobs.delete(jobId);
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.emit('jobCancelled', { jobId, userId: job.userId });
  }

  /**
   * Clean up old jobs (older than 24 hours)
   */
  cleanupOldJobs() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < oneDayAgo) {
        this.jobs.delete(jobId);
      }
    }
  }
}

// Singleton instance
const playlistJobManager = new PlaylistJobManager();

// Clean up old jobs every hour
setInterval(() => {
  playlistJobManager.cleanupOldJobs();
}, 60 * 60 * 1000);

module.exports = playlistJobManager;
