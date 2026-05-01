import { useState, useEffect, useRef, useCallback } from 'react';
import { memo } from 'react';

const PIXEL_FONT_SIZE = 8;
const PROGRESS_BAR_HEIGHT = 16;
const TIMER_HEIGHT = 24;

function SessionProgressIndicator({
  sessionData,
  onReflectionSubmit,
  onSessionEnd,
  theme = 'default',
  showReflectionForm = false
}) {
  const canvasRef = useRef(null);
  const timerCanvasRef = useRef(null);
  const animationRef = useRef(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(sessionData?.progress || 0);
  const [animationFrame, setAnimationFrame] = useState(0);
  
  // Reflection form state
  const [understanding, setUnderstanding] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate session duration
  useEffect(() => {
    if (!sessionData?.startTime) return;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - new Date(sessionData.startTime)) / 1000);
      setCurrentTime(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sessionData?.startTime]);

  // Update progress from session data
  useEffect(() => {
    if (sessionData?.progress !== undefined) {
      setProgress(sessionData.progress);
    }
  }, [sessionData?.progress]);

  // Format time for display
  const formatTime = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Draw pixel-art progress bar
  const drawProgressBar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = PROGRESS_BAR_HEIGHT;
    
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;

    // Draw background (empty progress)
    ctx.fillStyle = '#374151';
    for (let x = 0; x < width; x += 2) {
      for (let y = 0; y < height; y += 2) {
        if ((x + y) % 4 === 0) {
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    // Draw progress fill
    const progressWidth = Math.floor((progress / 100) * width);
    const progressColor = progress >= 100 ? '#10B981' : '#3B82F6';
    
    ctx.fillStyle = progressColor;
    for (let x = 0; x < progressWidth; x += 2) {
      for (let y = 2; y < height - 2; y += 2) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Add animated sparkles for completed progress
    if (progress >= 100) {
      const sparklePositions = [
        { x: progressWidth - 10, y: 4 },
        { x: progressWidth - 20, y: 8 },
        { x: progressWidth - 6, y: 12 }
      ];
      
      sparklePositions.forEach((pos, index) => {
        const sparkleFrame = (animationFrame + index * 20) % 60;
        if (sparkleFrame < 20) {
          const alpha = Math.sin((sparkleFrame / 20) * Math.PI);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fillRect(pos.x, pos.y, 2, 2);
          ctx.fillRect(pos.x - 2, pos.y, 2, 2);
          ctx.fillRect(pos.x + 2, pos.y, 2, 2);
          ctx.fillRect(pos.x, pos.y - 2, 2, 2);
          ctx.fillRect(pos.x, pos.y + 2, 2, 2);
        }
      });
    }

    // Draw border
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
  }, [progress, animationFrame]);

  // Draw pixel-art timer display
  const drawTimer = useCallback(() => {
    const canvas = timerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = TIMER_HEIGHT;
    
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;

    // Draw timer background
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, width, height);

    // Draw pixel font time
    const timeText = formatTime(currentTime);
    drawPixelText(ctx, timeText, 4, 4, '#10B981');

    // Draw session status indicator
    const statusColor = sessionData?.status === 'active' ? '#10B981' : '#6B7280';
    ctx.fillStyle = statusColor;
    
    // Animated status dot
    const pulseSize = 2 + Math.sin(animationFrame * 0.1);
    ctx.fillRect(width - 8, 4, pulseSize, pulseSize);
  }, [currentTime, animationFrame, sessionData?.status, formatTime]);

  // Draw pixel-style text
  const drawPixelText = (ctx, text, x, y, color) => {
    ctx.fillStyle = color;
    
    // Simple pixel font mapping (simplified for demo)
    const charWidth = 6;
    const charHeight = 8;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charX = x + (i * charWidth);
      
      // Draw character pixels (simplified representation)
      if (char !== ' ' && char !== ':') {
        // Draw a simple rectangular character
        ctx.fillRect(charX, y, 4, charHeight);
        ctx.fillRect(charX + 1, y + 1, 2, charHeight - 2);
      } else if (char === ':') {
        // Draw colon as two dots
        ctx.fillRect(charX + 1, y + 2, 2, 2);
        ctx.fillRect(charX + 1, y + 5, 2, 2);
      }
    }
  };

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationFrame(prev => (prev + 1) % 120);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Render canvases when dependencies change
  useEffect(() => {
    drawProgressBar();
  }, [drawProgressBar]);

  useEffect(() => {
    drawTimer();
  }, [drawTimer]);

  // Handle reflection form submission
  const handleReflectionSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const reflectionData = {
        understanding,
        difficulty,
        notes: notes.trim(),
        timeSpent: currentTime,
        completionConfidence: Math.round((understanding + (6 - difficulty)) / 2)
      };

      await onReflectionSubmit(reflectionData);
    } catch (error) {
      console.error('Error submitting reflection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pixel-art styled rating component
  const PixelRating = ({ value, onChange, label, max = 5 }) => (
    <div className="mb-4">
      <label className="block text-sm font-bold mb-2 text-gray-800 pixel-font">
        {label}
      </label>
      <div className="flex gap-1">
        {[...Array(max)].map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onChange(index + 1)}
            className={`
              min-w-[44px] min-h-[44px] w-11 h-11 border-2 transition-colors pixel-button
              ${index < value 
                ? 'bg-blue-500 border-blue-600' 
                : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
              }
            `}
            style={{ imageRendering: 'pixelated' }}
          >
            <span className="text-xs font-bold text-white">
              {index + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-900 p-4 rounded-lg border-2 border-gray-700 pixel-container">
      {/* Session Timer */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white mb-2 pixel-font">
          Session Time
        </h3>
        <canvas
          ref={timerCanvasRef}
          width={200}
          height={TIMER_HEIGHT}
          className="pixelated border border-gray-600"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-white pixel-font">
            Progress
          </h3>
          <span className="text-xs text-gray-300 pixel-font">
            {Math.round(progress)}%
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width={300}
          height={PROGRESS_BAR_HEIGHT}
          className="pixelated border border-gray-600"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Session Info */}
      <div className="mb-4 text-xs text-gray-300 pixel-font">
        <div>Node: {sessionData?.nodeTitle || 'Unknown'}</div>
        <div>Status: {sessionData?.status || 'Unknown'}</div>
      </div>

      {/* Reflection Form */}
      {showReflectionForm && (
        <div className="mt-6 p-4 bg-gray-800 rounded border border-gray-600">
          <h3 className="text-lg font-bold text-white mb-4 pixel-font">
            Session Reflection
          </h3>
          
          <form onSubmit={handleReflectionSubmit}>
            <PixelRating
              value={understanding}
              onChange={setUnderstanding}
              label="Understanding (1-5)"
            />
            
            <PixelRating
              value={difficulty}
              onChange={setDifficulty}
              label="Difficulty (1-5)"
            />
            
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2 text-gray-800 pixel-font">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                className="w-full p-2 border-2 border-gray-600 bg-gray-700 text-white rounded pixel-input"
                rows={3}
                placeholder="What did you learn? Any challenges?"
                maxLength={500}
              />
              <div className="text-xs text-gray-400 mt-1">
                {notes.length}/500 characters
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 border-2 border-green-700 disabled:border-gray-700 transition-colors pixel-button"
              >
                {isSubmitting ? 'Saving...' : 'Complete Session'}
              </button>
              
              <button
                type="button"
                onClick={onSessionEnd}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 border-2 border-gray-700 transition-colors pixel-button"
              >
                End Session
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        .pixel-font {
          font-family: 'Courier New', monospace;
          font-weight: bold;
          text-rendering: optimizeSpeed;
        }
        
        .pixel-button {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
        
        .pixel-input {
          font-family: 'Courier New', monospace;
          image-rendering: pixelated;
        }
        
        .pixel-container {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
        
        .pixelated {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
}

export default memo(SessionProgressIndicator);