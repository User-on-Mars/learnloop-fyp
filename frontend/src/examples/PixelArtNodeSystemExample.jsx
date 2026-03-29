import React, { useState } from 'react';
import PixelArtNodeComponent from '../components/PixelArtNodeComponent';
import PixelArtNodeRenderer from '../services/PixelArtNodeRenderer.js';
import SessionProgressIndicator from '../components/SessionProgressIndicator';

/**
 * Example demonstrating the integration of all three pixel-art UI components
 * This shows how they work together as a cohesive system
 */
function PixelArtNodeSystemExample() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [showReflection, setShowReflection] = useState(false);

  // Sample node data
  const nodes = [
    {
      id: 'start-node',
      title: 'Getting Started',
      description: 'Introduction to the topic',
      status: 'completed'
    },
    {
      id: 'content-1',
      title: 'Basic Concepts',
      description: 'Learn the fundamentals',
      status: 'completed'
    },
    {
      id: 'content-2',
      title: 'Advanced Topics',
      description: 'Deep dive into complex areas',
      status: 'in_progress'
    },
    {
      id: 'content-3',
      title: 'Practice Exercises',
      description: 'Apply what you learned',
      status: 'not_started'
    },
    {
      id: 'goal-node',
      title: 'Mastery',
      description: 'Complete understanding',
      status: 'locked'
    }
  ];

  // Sample session data
  const sessionData = {
    id: 'session-123',
    nodeTitle: selectedNode?.title || 'No active session',
    status: 'active',
    startTime: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    progress: 65
  };

  const handleNodeClick = (nodeId, nodeData) => {
    if (nodeData.status === 'locked') return;
    
    setSelectedNode(nodeData);
    
    // Start a session if node is not completed
    if (nodeData.status !== 'completed') {
      setActiveSession({
        ...sessionData,
        nodeTitle: nodeData.title
      });
    }
  };

  const handleNodeHover = (nodeId, nodeData, isHovered) => {
    // Handle hover effects
    console.log(`Node ${nodeId} ${isHovered ? 'hovered' : 'unhovered'}`);
  };

  const handleReflectionSubmit = async (reflectionData) => {
    console.log('Reflection submitted:', reflectionData);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update node status to completed
    const nodeIndex = nodes.findIndex(n => n.id === selectedNode?.id);
    if (nodeIndex !== -1) {
      nodes[nodeIndex].status = 'completed';
    }
    
    setShowReflection(false);
    setActiveSession(null);
    alert('Session completed successfully!');
  };

  const handleSessionEnd = () => {
    setActiveSession(null);
    setShowReflection(false);
  };

  const startReflection = () => {
    setShowReflection(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Pixel-Art Node System Demo
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Node Map Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Learning Path
            </h2>
            
            <div className="relative bg-gray-50 rounded-lg p-8 min-h-96">
              {nodes.map((node, index) => (
                <PixelArtNodeComponent
                  key={node.id}
                  id={node.id}
                  data={node}
                  position={{ 
                    x: 50 + (index % 2) * 200, 
                    y: 50 + Math.floor(index / 2) * 120 
                  }}
                  onNodeClick={handleNodeClick}
                  onNodeHover={handleNodeHover}
                />
              ))}
              
              {/* Connection lines (simplified) */}
              <svg className="absolute inset-0 pointer-events-none">
                {nodes.slice(0, -1).map((_, index) => (
                  <line
                    key={index}
                    x1={50 + (index % 2) * 200 + 32}
                    y1={50 + Math.floor(index / 2) * 120 + 32}
                    x2={50 + ((index + 1) % 2) * 200 + 32}
                    y2={50 + Math.floor((index + 1) / 2) * 120 + 32}
                    stroke="#9CA3AF"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                ))}
              </svg>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Instructions:</strong> Click on unlocked nodes to start learning sessions.</p>
              <p>Complete sessions to unlock the next node in the sequence.</p>
            </div>
          </div>

          {/* Session Progress Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Session Progress
            </h2>
            
            {activeSession ? (
              <div>
                <SessionProgressIndicator
                  sessionData={activeSession}
                  onReflectionSubmit={handleReflectionSubmit}
                  onSessionEnd={handleSessionEnd}
                  showReflectionForm={showReflection}
                />
                
                {!showReflection && (
                  <div className="mt-4">
                    <button
                      onClick={startReflection}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                      Complete Session & Reflect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No active session</p>
                <p className="text-sm mt-2">Click on a node to start learning</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Selected Node: {selectedNode.title}
            </h2>
            <p className="text-gray-600 mb-2">{selectedNode.description}</p>
            <p className="text-sm">
              <span className="font-medium">Status:</span>{' '}
              <span className={`
                px-2 py-1 rounded text-xs font-medium
                ${selectedNode.status === 'completed' ? 'bg-green-100 text-green-700' :
                  selectedNode.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                  selectedNode.status === 'not_started' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'}
              `}>
                {selectedNode.status.replace('_', ' ')}
              </span>
            </p>
          </div>
        )}

        {/* Component Information */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">
            Pixel-Art UI Components
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded p-4">
              <h3 className="font-semibold text-blue-700 mb-2">PixelArtNodeComponent</h3>
              <ul className="text-gray-600 space-y-1">
                <li>• Canvas-based pixel rendering</li>
                <li>• Status-based sprite states</li>
                <li>• Hover and click interactions</li>
                <li>• 60fps animations</li>
              </ul>
            </div>
            <div className="bg-white rounded p-4">
              <h3 className="font-semibold text-blue-700 mb-2">PixelArtNodeRenderer</h3>
              <ul className="text-gray-600 space-y-1">
                <li>• Theme support</li>
                <li>• Sprite caching</li>
                <li>• Connection rendering</li>
                <li>• Performance optimization</li>
              </ul>
            </div>
            <div className="bg-white rounded p-4">
              <h3 className="font-semibold text-blue-700 mb-2">SessionProgressIndicator</h3>
              <ul className="text-gray-600 space-y-1">
                <li>• Real-time progress tracking</li>
                <li>• Pixel-art progress bars</li>
                <li>• Reflection form integration</li>
                <li>• Session timer display</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PixelArtNodeSystemExample;