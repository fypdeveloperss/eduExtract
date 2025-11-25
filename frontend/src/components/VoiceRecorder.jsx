import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Square, 
  X, 
  Loader2, 
  Play, 
  Pause, 
  RotateCcw, 
  Check,
  AlertCircle,
  Volume2
} from 'lucide-react';
import api from '../utils/axios';

const VoiceRecorder = ({ isOpen = true, onClose, onTranscriptReady }) => {
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  
  // Transcription states
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  
  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  
  // Audio visualization
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioElementRef = useRef(null);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError('');
      setTranscript('');
      setAudioBlob(null);
      setAudioUrl(null);
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      
      // Set up audio visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Start visualization loop
      const visualize = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
        
        animationFrameRef.current = requestAnimationFrame(visualize);
      };
      visualize();
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access to record audio.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Failed to start recording. Please check your microphone settings.');
      }
    }
  };

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioLevel(0);
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  }, [isRecording]);

  // Pause/Resume recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    setIsPaused(!isPaused);
  };

  // Reset recording
  const resetRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscript('');
    setRecordingTime(0);
    setError('');
    setPlaybackTime(0);
    audioChunksRef.current = [];
  };

  // Play/Pause audio
  const togglePlayback = () => {
    if (!audioElementRef.current) return;
    
    if (isPlaying) {
      audioElementRef.current.pause();
    } else {
      audioElementRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Transcribe audio
  const transcribeAudio = async () => {
    if (!audioBlob) {
      setError('No audio recorded. Please record audio first.');
      return;
    }
    
    setIsTranscribing(true);
    setError('');
    
    try {
      // Create form data with audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Send to backend for transcription using api utility
      const response = await api.post('/transcribe-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success && response.data.transcript) {
        setTranscript(response.data.transcript);
      } else {
        throw new Error(response.data.error || 'No transcript received');
      }
      
    } catch (err) {
      console.error('Transcription error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to transcribe audio. Please try again.';
      setError(errorMessage);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle using the transcript
  const handleUseTranscript = () => {
    if (transcript && onTranscriptReady) {
      onTranscriptReady(transcript);
      handleClose();
    }
  };

  // Close and cleanup
  const handleClose = useCallback(() => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscript('');
    setRecordingTime(0);
    setError('');
    setPlaybackTime(0);
    onClose();
  }, [stopRecording, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Handle audio element events
  useEffect(() => {
    if (audioElementRef.current) {
      const audio = audioElementRef.current;
      
      const handleTimeUpdate = () => {
        setPlaybackTime(Math.floor(audio.currentTime));
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
      };
      
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioUrl]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="bg-white dark:bg-[#171717] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-[#fafafa1a]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#fafafa1a]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <Mic className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#171717] dark:text-[#fafafa]">
                  Voice Recorder
                </h2>
                <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                  Record and transcribe audio
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#fafafa1a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
              >
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </motion.div>
            )}

            {/* Recording Interface */}
            <div className="text-center">
              {/* Timer Display */}
              <div className="mb-6">
                <span className="text-5xl font-mono font-bold text-[#171717] dark:text-[#fafafa]">
                  {formatTime(recordingTime)}
                </span>
                {recordingTime >= 300 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    Maximum 5 minutes recording recommended
                  </p>
                )}
              </div>

              {/* Audio Visualization */}
              {isRecording && !isPaused && (
                <div className="flex items-center justify-center gap-1 h-16 mb-6">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 bg-orange-500 dark:bg-orange-400 rounded-full"
                      animate={{
                        height: `${Math.max(8, audioLevel * 64 * (0.5 + Math.random() * 0.5))}px`
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  ))}
                </div>
              )}

              {/* Recording Controls */}
              <div className="flex items-center justify-center gap-4">
                {!isRecording && !audioBlob && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startRecording}
                    className="w-20 h-20 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 transition-colors"
                  >
                    <Mic className="w-8 h-8 text-white" />
                  </motion.button>
                )}

                {isRecording && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={togglePause}
                      className="w-14 h-14 bg-gray-200 dark:bg-[#2a2a2a] hover:bg-gray-300 dark:hover:bg-[#333] rounded-full flex items-center justify-center transition-colors"
                    >
                      {isPaused ? (
                        <Play className="w-6 h-6 text-[#171717] dark:text-[#fafafa]" />
                      ) : (
                        <Pause className="w-6 h-6 text-[#171717] dark:text-[#fafafa]" />
                      )}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={stopRecording}
                      className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors"
                    >
                      <Square className="w-8 h-8 text-white" />
                    </motion.button>
                  </>
                )}

                {audioBlob && !isRecording && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={resetRecording}
                      className="w-14 h-14 bg-gray-200 dark:bg-[#2a2a2a] hover:bg-gray-300 dark:hover:bg-[#333] rounded-full flex items-center justify-center transition-colors"
                    >
                      <RotateCcw className="w-6 h-6 text-[#171717] dark:text-[#fafafa]" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={togglePlayback}
                      className="w-16 h-16 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-7 h-7 text-white" />
                      ) : (
                        <Play className="w-7 h-7 text-white ml-1" />
                      )}
                    </motion.button>
                  </>
                )}
              </div>

              {/* Audio Element for Playback */}
              {audioUrl && (
                <audio ref={audioElementRef} src={audioUrl} className="hidden" />
              )}

              {/* Playback Progress */}
              {audioBlob && !isRecording && (
                <div className="mt-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                  {isPlaying ? `Playing: ${formatTime(playbackTime)}` : `Duration: ${formatTime(recordingTime)}`}
                </div>
              )}
            </div>

            {/* Transcription Section */}
            {audioBlob && !isRecording && (
              <div className="space-y-4">
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={transcribeAudio}
                  disabled={isTranscribing}
                  className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Transcribing...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5" />
                      <span>Transcribe Audio</span>
                    </>
                  )}
                </motion.button>

                {/* Transcript Display */}
                {transcript && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#fafafa1a]">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          Transcription Complete
                        </span>
                      </div>
                      <p className="text-sm text-[#171717] dark:text-[#fafafa] max-h-40 overflow-y-auto leading-relaxed">
                        {transcript}
                      </p>
                      <p className="text-xs text-[#171717aa] dark:text-[#fafafaaa] mt-2">
                        {transcript.split(/\s+/).length} words
                      </p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUseTranscript}
                      className="w-full py-3 px-4 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      <span>Use This Transcript</span>
                    </motion.button>
                  </motion.div>
                )}
              </div>
            )}

            {/* Instructions */}
            {!isRecording && !audioBlob && (
              <div className="text-center text-sm text-[#171717cc] dark:text-[#fafafacc] space-y-2">
                <p>Click the microphone button to start recording</p>
                <p className="text-xs">
                  Supports lectures, meetings, voice notes, and more
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceRecorder;
