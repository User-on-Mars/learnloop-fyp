/**
 * AnimationSystemExample - Demonstrates the complete animation system
 * 
 * Shows unlock animations, progress animations, and audio management
 */

import React, { useState, useRef, useEffect } from 'react';
import useAnimationSystem from '../hooks/useAnimationSystem.js';
import '../styles/animations.css';

const AnimationSystemExample = () => {
  const {
    isInitialized,
    settings,
    performanceStats,
    unlockNode,
    updateProgress,
    celebrateCompletion,
    animateStateTransition,
    playSound,
    toggleAnimations,
    toggleSounds,
    toggleParticles,
    setMasterVolume,
    testAllSystems,
    getPerformanceReport
  } = useAnimationSystem();

  const [progress, setProgress] = useState(0);
  const [nodeStates, setNodeStates] = useState({
    node1: 'locked',
    node2: 'locked', 
    node3: 'locked'
  });
  const [testResults, setTestResults] = useState(null);

  // Test the animation system
  const handleTestSystem = async () => {
    const results = await testAllSystems();
    setTestResults(results);
  };

  // Unlock a node with animation
  const handleUnlockNode = async (nodeId) => {
    const success = await unlockNode(nodeId, {
      title: `Node ${nodeId}`,
      status: 'locked'
    });
    
    if (success) {
      setNodeStates(prev => ({
        ...prev,
        [nodeId]: 'not_started'
      }));
    }
  };

  // Animate progress update
  const handleProgressUpdate = async () => {
    const newProgress = Math.min(progress + 25, 100);
    await updateProgress('demo-progress', progress, newProgress);
    setProgress(newProgress);
  };

  // Trigger celebration
  const handleCelebration = async () => {
    await celebrateCompletion('demo-session', {
      reflection: {
        understanding: 5,
        difficulty: 3
      },
      duration: 1800000 // 30 minutes
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Animation System Demo</h1>
      
      {/* System Status */}
      <div className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Initialized:</strong> {isInitialized ? '✅' : '❌'}</p>
            <p><strong>Animations:</strong> {settings.enableAnimations ? '✅' : '❌'}</p>
            <p><strong>Sounds:</strong> {settings.enableSounds ? '✅' : '❌'}</p>
            <p><strong>Particles:</strong> {settings.enableParticles ? '✅' : '❌'}</p>
          </div>
          <div>
            <p><strong>Performance Mode:</strong> {settings.performanceMode}</p>
            <p><strong>Master Volume:</strong> {Math.round(settings.masterVolume * 100)}%</p>
            {performanceStats && (
              <p><strong>Total Animations:</strong> {performanceStats.system?.totalAnimations || 0}</p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Controls</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={toggleAnimations}
            className={`px-4 py-2 rounded ${settings.enableAnimations ? 'bg-green-500 text-white' : 'bg-gray-300'}`}
          >
            Toggle Animations
          </button>
          <button
            onClick={toggleSounds}
            className={`px-4 py-2 rounded ${settings.enableSounds ? 'bg-green-500 text-white' : 'bg-gray-300'}`}
          >
            Toggle Sounds
          </button>
          <button
            onClick={toggleParticles}
            className={`px-4 py-2 rounded ${settings.enableParticles ? 'bg-green-500 text-white' : 'bg-gray-300'}`}
          >
            Toggle Particles
          </button>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Master Volume</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default AnimationSystemExample;
      {/* Node Unlock Demo */}
      <div className="mb-8 p-4 bg-green-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Node Unlock Animations</h2>
        <div className="flex gap-4 mb-4">
          {Object.entries(nodeStates).map(([nodeId, state]) => (
            <div key={nodeId} className="text-center">
              <div
                data-node-id={nodeId}
                className={`
                  w-16 h-16 rounded-lg border-2 cursor-pointer transition-all duration-300
                  ${state === 'locked' ? 'bg-gray-300 border-gray-400' : 
                    state === 'not_started' ? 'bg-blue-300 border-blue-500 glow-effect' :
                    'bg-green-300 border-green-500'}
                `}
                onClick={() => state === 'locked' && handleUnlockNode(nodeId)}
              >
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {nodeId === 'node1' ? '1' : nodeId === 'node2' ? '2' : '3'}
                </div>
              </div>
              <p className="text-sm mt-2 capitalize">{state.replace('_', ' ')}</p>
              {state === 'locked' && (
                <button
                  onClick={() => handleUnlockNode(nodeId)}
                  className="mt-1 px-2 py-1 text-xs bg-blue-500 text-white rounded"
                >
                  Unlock
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress Animation Demo */}
      <div className="mb-8 p-4 bg-yellow-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Progress Animations</h2>
        <div className="mb-4">
          <div className="progress-container" id="demo-progress">
            <div 
              className="progress-bar animated"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-2">Progress: {progress}%</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleProgressUpdate}
            disabled={progress >= 100}
            className="px-4 py-2 bg-yellow-500 text-white rounded disabled:bg-gray-300"
          >
            Add 25% Progress
          </button>
          <button
            onClick={() => {
              setProgress(0);
              updateProgress('demo-progress', progress, 0);
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Reset Progress
          </button>
        </div>
      </div>

      {/* Celebration Demo */}
      <div className="mb-8 p-4 bg-purple-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Celebration Effects</h2>
        <button
          onClick={handleCelebration}
          className="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold"
        >
          🎉 Trigger Celebration
        </button>
      </div>

      {/* Sound Demo */}
      <div className="mb-8 p-4 bg-red-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Sound Effects</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => playSound('unlock')}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            🔓 Unlock Sound
          </button>
          <button
            onClick={() => playSound('progress')}
            className="px-4 py-2 bg-yellow-500 text-white rounded"
          >
            📈 Progress Sound
          </button>
          <button
            onClick={() => playSound('completion')}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            ✅ Completion Sound
          </button>
          <button
            onClick={() => playSound('celebration')}
            className="px-4 py-2 bg-purple-500 text-white rounded"
          >
            🎊 Celebration Sound
          </button>
        </div>
      </div>

      {/* System Testing */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">System Testing</h2>
        <button
          onClick={handleTestSystem}
          className="px-4 py-2 bg-site-accent text-white rounded mb-4"
        >
          Test All Systems
        </button>
        
        {testResults && (
          <div className="mt-4 p-4 bg-white rounded border">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <ul className="space-y-1">
              <li>Unlock System: {testResults.unlock ? '✅' : '❌'}</li>
              <li>Progress System: {testResults.progress ? '✅' : '❌'}</li>
              <li>Audio System: {testResults.audio ? '✅' : '❌'}</li>
              <li>Overall: {testResults.overall ? '✅ All systems working' : '❌ Some systems failed'}</li>
            </ul>
          </div>
        )}
      </div>

      {/* Performance Stats */}
      {performanceStats && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Performance Statistics</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold">System:</h3>
              <p>Total Animations: {performanceStats.system?.totalAnimations || 0}</p>
              <p>Frame Drops: {performanceStats.system?.frameDrops || 0}</p>
              <p>Avg Frame Time: {Math.round(performanceStats.system?.averageFrameTime || 0)}ms</p>
            </div>
            <div>
              <h3 className="font-semibold">Audio:</h3>
              <p>Sounds Played: {performanceStats.audio?.soundsPlayed || 0}</p>
              <p>Sounds Loaded: {performanceStats.audio?.loadedSounds || 0}</p>
              <p>Active Sounds: {performanceStats.audio?.activeSounds || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Instructions</h2>
        <ul className="space-y-2 text-sm">
          <li>• Click "Unlock" buttons to see node unlock animations with particles and sound</li>
          <li>• Use "Add 25% Progress" to see smooth progress bar animations</li>
          <li>• Click "Trigger Celebration" to see confetti and celebration effects</li>
          <li>• Test individual sound effects with the sound buttons</li>
          <li>• Toggle animations, sounds, and particles to see the difference</li>
          <li>• Adjust master volume to control audio levels</li>
          <li>• Use "Test All Systems" to verify everything is working</li>
        </ul>
      </div>
    </div>
  );
};

export default AnimationSystemExample;