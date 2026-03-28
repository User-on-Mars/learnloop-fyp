# Skill Map Management Design Document

## Overview

The Skill Map Management feature enables users to visually organize their learning journey through an interactive canvas-based interface. Users can create skills (high-level learning topics) and break them down into interconnected skill nodes (smaller learning steps), arranging them spatially and connecting them to show prerequisite relationships.

This feature extends the existing LearnLoop dashboard with two new views:
1. **Skill List View**: A card-based gallery displaying all user skills
2. **Skill Canvas View**: An interactive workspace for arranging and connecting skill nodes within a specific skill

The design leverages React Flow (a production-ready React library for node-based UIs) for the canvas implementation, MongoDB for data persistence, and follows the established LearnLoop design patterns for consistency.

### Key Design Decisions

**Canvas Library Selection**: After evaluating options (React Flow, React Diagrams, custom SVG), React Flow was selected because:
- Production-ready with extensive documentation
- Built-in features: drag-and-drop, zoom/pan, connection handling
- Customizable node and edge components
- Active maintenance and community support
- Performance optimized for large graphs

**Data Model**: Skills and nodes are separate collections to enable:
- Independent querying and updates
- Efficient loading (load skill metadata without all nodes)
- Scalability for users with many skills and nodes


## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────────┐    │
│  │  Skill List View │         │  Skill Canvas View   │    │
│  │  (/skill-map)    │────────▶│  (/skill-map/:id)    │    │
│  └──────────────────┘         └──────────────────────┘    │
│         │                              │                    │
│         │                              │                    │
│         ▼                              ▼                    │
│  ┌──────────────────────────────────────────────────┐     │
│  │         Skill Map API Service Layer              │     │
│  │  (frontend/src/services/skillMapAPI.js)          │     │
│  └──────────────────────────────────────────────────┘     │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │         Skill Map Routes                         │     │
│  │  /api/skills                                     │     │
│  │  /api/skills/:id/nodes                           │     │
│  │  /api/skills/:id/connections                     │     │
│  └──────────────────────────────────────────────────┘     │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────┐     │
│  │         Mongoose Models                          │     │
│  │  - Skill                                         │     │
│  │  - SkillNode                                     │     │
│  │  - NodeConnection                                │     │
│  └──────────────────────────────────────────────────┘     │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   MongoDB   │
                    │  Database   │
                    └─────────────┘
```

### Technology Stack

**Frontend**:
- React 18.2.0 - UI framework
- React Router DOM 6.28.0 - Client-side routing
- React Flow 11.11.0 - Canvas/node-based UI library
- Tailwind CSS 3.4.13 - Styling
- Axios 1.7.2 - HTTP client
- Lucide React 0.553.0 - Icons

**Backend**:
- Express.js - REST API server
- Mongoose - MongoDB ODM
- Zod - Schema validation
- Firebase Auth - User authentication

**Database**:
- MongoDB - Document database


### Component Hierarchy

**Skill List View**:
```
SkillMapList (Page)
├── Sidebar (Shared)
├── Header Section
│   ├── Page Title
│   └── Create Skill Button
└── Skills Grid
    └── SkillCard (Component) × N
        ├── Skill Name
        ├── Node Count Badge
        ├── Last Updated
        └── Delete Button
```

**Skill Canvas View**:
```
SkillCanvas (Page)
├── Sidebar (Shared)
├── Canvas Header
│   ├── Back Button
│   ├── Skill Name
│   └── Add Node Button
├── React Flow Canvas
│   ├── SkillNodeComponent (Custom Node) × N
│   │   ├── Node Title
│   │   ├── Node Description
│   │   ├── Status Badge
│   │   └── Edit/Delete Actions
│   └── ConnectionEdge (Custom Edge) × N
│       └── Directional Arrow
└── Modals
    ├── CreateNodeModal
    ├── EditNodeModal
    └── DeleteConfirmationModal
```

### State Management

**Local Component State**:
- UI state (modals, loading, errors)
- Form inputs (skill name, node data)
- Canvas viewport (zoom, pan position)

**API State**:
- Skills list
- Current skill nodes
- Node connections

**React Flow State** (managed by library):
- Node positions
- Edge connections
- Viewport transformations
- Selection state


## Components and Interfaces

### 1. SkillMapList Page Component

**File**: `frontend/src/pages/SkillMapList.jsx`

**Purpose**: Display all user skills in a card-based layout with create/delete functionality

**Props**: None (uses authentication context)

**State**:
```javascript
{
  skills: Array<Skill>,
  isLoading: boolean,
  error: string | null,
  showCreateModal: boolean,
  newSkillName: string
}
```

**Key Methods**:
- `fetchSkills()` - Load all user skills from API
- `handleCreateSkill(name)` - Create new skill
- `handleDeleteSkill(id)` - Delete skill with confirmation
- `handleSkillClick(id)` - Navigate to skill canvas

**Layout**:
```jsx
<div className="flex min-h-screen bg-gray-50">
  <Sidebar />
  <main className="flex-1 overflow-y-auto">
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Skill Map</h1>
        <button onClick={openCreateModal} className="...">
          Create Skill
        </button>
      </div>
      
      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map(skill => (
          <SkillCard key={skill._id} skill={skill} />
        ))}
      </div>
    </div>
  </main>
</div>
```


### 2. SkillCard Component

**File**: `frontend/src/components/SkillCard.jsx`

**Purpose**: Display individual skill information with actions

**Props Interface**:
```javascript
{
  skill: {
    _id: string,
    name: string,
    nodeCount: number,
    updatedAt: Date
  },
  onDelete: (id: string) => void,
  onClick: (id: string) => void
}
```

**Visual Design**:
```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
  <div className="flex justify-between items-start mb-4">
    <h3 className="text-xl font-semibold text-gray-900">{skill.name}</h3>
    <button onClick={handleDelete} className="text-gray-400 hover:text-red-600">
      <Trash2 className="w-5 h-5" />
    </button>
  </div>
  
  <div className="flex items-center gap-4 text-sm text-gray-600">
    <div className="flex items-center gap-1">
      <Network className="w-4 h-4" />
      <span>{skill.nodeCount} nodes</span>
    </div>
    <div className="flex items-center gap-1">
      <Clock className="w-4 h-4" />
      <span>{formatDate(skill.updatedAt)}</span>
    </div>
  </div>
</div>
```

**Styling**:
- Card: `bg-white rounded-xl shadow-sm border border-gray-200 p-6`
- Hover: `hover:shadow-md transition-shadow`
- Title: `text-xl font-semibold text-gray-900`
- Metadata: `text-sm text-gray-600`


### 3. SkillCanvas Page Component

**File**: `frontend/src/pages/SkillCanvas.jsx`

**Purpose**: Interactive canvas for arranging and connecting skill nodes

**Props**: None (uses route params for skill ID)

**State**:
```javascript
{
  skill: Skill | null,
  nodes: Array<ReactFlowNode>,
  edges: Array<ReactFlowEdge>,
  isLoading: boolean,
  error: string | null,
  showNodeModal: boolean,
  editingNode: SkillNode | null,
  selectedNode: string | null
}
```

**React Flow Integration**:
```javascript
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node types
const nodeTypes = {
  skillNode: SkillNodeComponent
};

// Custom edge types
const edgeTypes = {
  default: ConnectionEdge
};
```

**Key Methods**:
- `fetchSkillData(skillId)` - Load skill, nodes, and connections
- `handleNodesChange(changes)` - Update node positions
- `handleConnect(connection)` - Create new connection between nodes
- `handleNodeClick(node)` - Open edit modal
- `handleAddNode()` - Open create node modal
- `handleDeleteNode(nodeId)` - Delete node and its connections
- `saveNodePosition(nodeId, position)` - Persist position to backend

**Layout**:
```jsx
<div className="flex min-h-screen bg-gray-50">
  <Sidebar />
  <main className="flex-1 flex flex-col">
    {/* Header */}
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center gap-4">
        <button onClick={goBack}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{skill?.name}</h1>
        <button onClick={openAddNodeModal} className="ml-auto">
          Add Node
        </button>
      </div>
    </div>
    
    {/* Canvas */}
    <div className="flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  </main>
</div>
```


### 4. SkillNodeComponent (Custom React Flow Node)

**File**: `frontend/src/components/SkillNodeComponent.jsx`

**Purpose**: Custom node component for React Flow with skill-specific styling and actions

**Props Interface** (from React Flow):
```javascript
{
  id: string,
  data: {
    title: string,
    description: string,
    status: 'not_started' | 'in_progress' | 'completed',
    onEdit: (id: string) => void,
    onDelete: (id: string) => void
  },
  selected: boolean
}
```

**Visual Design**:
```jsx
<div className={`
  bg-white rounded-lg border-2 p-4 shadow-md min-w-[250px] max-w-[300px]
  ${selected ? 'border-indigo-600' : 'border-gray-300'}
  hover:shadow-lg transition-shadow
`}>
  {/* Status Badge */}
  <div className="flex items-center justify-between mb-2">
    <span className={`
      px-2 py-1 rounded-full text-xs font-medium
      ${statusColors[data.status]}
    `}>
      {statusLabels[data.status]}
    </span>
    <div className="flex gap-1">
      <button onClick={() => data.onEdit(id)}>
        <Edit2 className="w-4 h-4 text-gray-500 hover:text-indigo-600" />
      </button>
      <button onClick={() => data.onDelete(id)}>
        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
      </button>
    </div>
  </div>
  
  {/* Title */}
  <h4 className="font-semibold text-gray-900 mb-2">{data.title}</h4>
  
  {/* Description */}
  <p className="text-sm text-gray-600 line-clamp-3">{data.description}</p>
  
  {/* React Flow Handles */}
  <Handle type="target" position={Position.Top} />
  <Handle type="source" position={Position.Bottom} />
</div>
```

**Status Colors**:
```javascript
const statusColors = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700'
};

const statusLabels = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed'
};
```


### 5. NodeModal Component

**File**: `frontend/src/components/NodeModal.jsx`

**Purpose**: Modal for creating/editing skill nodes

**Props Interface**:
```javascript
{
  isOpen: boolean,
  onClose: () => void,
  onSave: (nodeData: NodeData) => void,
  initialData?: {
    title: string,
    description: string,
    status: string
  },
  mode: 'create' | 'edit'
}
```

**Form Fields**:
```jsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
    <h2 className="text-2xl font-bold mb-4">
      {mode === 'create' ? 'Add New Node' : 'Edit Node'}
    </h2>
    
    <form onSubmit={handleSubmit}>
      {/* Title Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Node Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={e => setFormData({...formData, title: e.target.value})}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
          required
          maxLength={100}
        />
      </div>
      
      {/* Description Textarea */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
          rows={4}
          maxLength={500}
        />
      </div>
      
      {/* Status Select */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          value={formData.status}
          onChange={e => setFormData({...formData, status: e.target.value})}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
        >
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      
      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {mode === 'create' ? 'Create Node' : 'Save Changes'}
        </button>
      </div>
    </form>
  </div>
</div>
```


### 6. API Service Layer

**File**: `frontend/src/services/skillMapAPI.js`

**Purpose**: Centralized API calls for skill map functionality

**Implementation**:
```javascript
import axios from 'axios';
import { auth } from '../firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Get auth token
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return await user.getIdToken();
};

// Create axios instance with auth
const createAuthRequest = async () => {
  const token = await getAuthToken();
  return axios.create({
    baseURL: API_BASE,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

export const skillMapAPI = {
  // Skills
  getSkills: async () => {
    const api = await createAuthRequest();
    return api.get('/api/skills');
  },
  
  createSkill: async (name) => {
    const api = await createAuthRequest();
    return api.post('/api/skills', { name });
  },
  
  deleteSkill: async (skillId) => {
    const api = await createAuthRequest();
    return api.delete(`/api/skills/${skillId}`);
  },
  
  // Nodes
  getNodes: async (skillId) => {
    const api = await createAuthRequest();
    return api.get(`/api/skills/${skillId}/nodes`);
  },
  
  createNode: async (skillId, nodeData) => {
    const api = await createAuthRequest();
    return api.post(`/api/skills/${skillId}/nodes`, nodeData);
  },
  
  updateNode: async (skillId, nodeId, nodeData) => {
    const api = await createAuthRequest();
    return api.put(`/api/skills/${skillId}/nodes/${nodeId}`, nodeData);
  },
  
  deleteNode: async (skillId, nodeId) => {
    const api = await createAuthRequest();
    return api.delete(`/api/skills/${skillId}/nodes/${nodeId}`);
  },
  
  // Connections
  getConnections: async (skillId) => {
    const api = await createAuthRequest();
    return api.get(`/api/skills/${skillId}/connections`);
  },
  
  createConnection: async (skillId, connectionData) => {
    const api = await createAuthRequest();
    return api.post(`/api/skills/${skillId}/connections`, connectionData);
  },
  
  deleteConnection: async (skillId, connectionId) => {
    const api = await createAuthRequest();
    return api.delete(`/api/skills/${skillId}/connections/${connectionId}`);
  }
};
```


## Data Models

### Skill Model

**File**: `backend/src/models/Skill.js`

**Schema**:
```javascript
import mongoose from 'mongoose';

const SkillSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  nodeCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Index for efficient user queries
SkillSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model('Skill', SkillSchema);
```

**TypeScript Interface**:
```typescript
interface Skill {
  _id: string;
  userId: string;
  name: string;
  nodeCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```


### SkillNode Model

**File**: `backend/src/models/SkillNode.js`

**Schema**:
```javascript
import mongoose from 'mongoose';

const SkillNodeSchema = new mongoose.Schema({
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  position: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Compound index for efficient skill queries
SkillNodeSchema.index({ skillId: 1, userId: 1 });

export default mongoose.model('SkillNode', SkillNodeSchema);
```

**TypeScript Interface**:
```typescript
interface SkillNode {
  _id: string;
  skillId: string;
  userId: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  position: {
    x: number;
    y: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```


### NodeConnection Model

**File**: `backend/src/models/NodeConnection.js`

**Schema**:
```javascript
import mongoose from 'mongoose';

const NodeConnectionSchema = new mongoose.Schema({
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  sourceNodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SkillNode',
    required: true
  },
  targetNodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SkillNode',
    required: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
NodeConnectionSchema.index({ skillId: 1, userId: 1 });

// Prevent duplicate connections
NodeConnectionSchema.index(
  { sourceNodeId: 1, targetNodeId: 1 },
  { unique: true }
);

export default mongoose.model('NodeConnection', NodeConnectionSchema);
```

**TypeScript Interface**:
```typescript
interface NodeConnection {
  _id: string;
  skillId: string;
  userId: string;
  sourceNodeId: string;
  targetNodeId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### React Flow Data Transformation

**Converting Database Models to React Flow Format**:

```javascript
// Transform SkillNode to React Flow Node
const toReactFlowNode = (skillNode) => ({
  id: skillNode._id,
  type: 'skillNode',
  position: skillNode.position,
  data: {
    title: skillNode.title,
    description: skillNode.description,
    status: skillNode.status,
    onEdit: handleEditNode,
    onDelete: handleDeleteNode
  }
});

// Transform NodeConnection to React Flow Edge
const toReactFlowEdge = (connection) => ({
  id: connection._id,
  source: connection.sourceNodeId,
  target: connection.targetNodeId,
  type: 'default',
  animated: false,
  style: { stroke: '#6366f1', strokeWidth: 2 }
});
```


## API Endpoints

### Skill Endpoints

#### GET /api/skills
**Description**: Get all skills for authenticated user

**Authentication**: Required (Bearer token)

**Response**:
```json
{
  "skills": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "firebase_uid_123",
      "name": "React Development",
      "nodeCount": 5,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-16T14:20:00Z"
    }
  ]
}
```

#### POST /api/skills
**Description**: Create new skill

**Authentication**: Required

**Request Body**:
```json
{
  "name": "React Development"
}
```

**Validation**:
- `name`: required, string, 1-100 characters, trimmed

**Response**: 201 Created
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "firebase_uid_123",
  "name": "React Development",
  "nodeCount": 0,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### DELETE /api/skills/:id
**Description**: Delete skill and all associated nodes and connections

**Authentication**: Required

**Response**: 200 OK
```json
{
  "message": "Skill deleted successfully",
  "deletedNodes": 5,
  "deletedConnections": 3
}
```


### Node Endpoints

#### GET /api/skills/:skillId/nodes
**Description**: Get all nodes for a specific skill

**Authentication**: Required

**Response**:
```json
{
  "nodes": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "skillId": "507f1f77bcf86cd799439011",
      "userId": "firebase_uid_123",
      "title": "Learn Hooks",
      "description": "Understand useState, useEffect, and custom hooks",
      "status": "in_progress",
      "position": { "x": 100, "y": 200 },
      "createdAt": "2025-01-15T10:35:00Z",
      "updatedAt": "2025-01-16T14:20:00Z"
    }
  ]
}
```

#### POST /api/skills/:skillId/nodes
**Description**: Create new node in skill

**Authentication**: Required

**Request Body**:
```json
{
  "title": "Learn Hooks",
  "description": "Understand useState, useEffect, and custom hooks",
  "status": "not_started",
  "position": { "x": 100, "y": 200 }
}
```

**Validation**:
- `title`: required, string, 1-100 characters
- `description`: optional, string, max 500 characters
- `status`: optional, enum ['not_started', 'in_progress', 'completed'], default 'not_started'
- `position`: optional, object with x and y numbers, default { x: 0, y: 0 }

**Response**: 201 Created
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "skillId": "507f1f77bcf86cd799439011",
  "userId": "firebase_uid_123",
  "title": "Learn Hooks",
  "description": "Understand useState, useEffect, and custom hooks",
  "status": "not_started",
  "position": { "x": 100, "y": 200 },
  "createdAt": "2025-01-15T10:35:00Z",
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

#### PUT /api/skills/:skillId/nodes/:nodeId
**Description**: Update node (title, description, status, or position)

**Authentication**: Required

**Request Body** (all fields optional):
```json
{
  "title": "Master React Hooks",
  "description": "Deep dive into hooks patterns",
  "status": "in_progress",
  "position": { "x": 150, "y": 250 }
}
```

**Response**: 200 OK (returns updated node)

#### DELETE /api/skills/:skillId/nodes/:nodeId
**Description**: Delete node and all its connections

**Authentication**: Required

**Response**: 200 OK
```json
{
  "message": "Node deleted successfully",
  "deletedConnections": 2
}
```


### Connection Endpoints

#### GET /api/skills/:skillId/connections
**Description**: Get all connections for a specific skill

**Authentication**: Required

**Response**:
```json
{
  "connections": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "skillId": "507f1f77bcf86cd799439011",
      "userId": "firebase_uid_123",
      "sourceNodeId": "507f1f77bcf86cd799439012",
      "targetNodeId": "507f1f77bcf86cd799439014",
      "createdAt": "2025-01-15T10:40:00Z",
      "updatedAt": "2025-01-15T10:40:00Z"
    }
  ]
}
```

#### POST /api/skills/:skillId/connections
**Description**: Create new connection between nodes

**Authentication**: Required

**Request Body**:
```json
{
  "sourceNodeId": "507f1f77bcf86cd799439012",
  "targetNodeId": "507f1f77bcf86cd799439014"
}
```

**Validation**:
- `sourceNodeId`: required, valid ObjectId, must exist and belong to skill
- `targetNodeId`: required, valid ObjectId, must exist and belong to skill
- Connection must not already exist (enforced by unique index)

**Response**: 201 Created
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "skillId": "507f1f77bcf86cd799439011",
  "userId": "firebase_uid_123",
  "sourceNodeId": "507f1f77bcf86cd799439012",
  "targetNodeId": "507f1f77bcf86cd799439014",
  "createdAt": "2025-01-15T10:40:00Z",
  "updatedAt": "2025-01-15T10:40:00Z"
}
```

#### DELETE /api/skills/:skillId/connections/:connectionId
**Description**: Delete connection

**Authentication**: Required

**Response**: 200 OK
```json
{
  "message": "Connection deleted successfully"
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, I identified several areas of redundancy:

**Redundancy Analysis**:
1. Properties 3.1, 3.2, 3.3 (display title, description, status) can be combined into a single comprehensive property about node rendering
2. Properties 10.1, 10.2, 10.3 (persist skill, node, connection) are all round-trip persistence properties that can be consolidated
3. Properties 10.4, 10.5 (retrieve skills, retrieve nodes/connections) are covered by the round-trip properties
4. Properties 4.3 and 7.3 (persist updates, persist position) are both about update persistence and can be combined
5. Properties 7.4 is subsumed by 7.3 (if position persists on release, it will persist across sessions)
6. Properties 5.2 and 5.3 (delete node, delete connections) can be combined into cascade deletion property
7. Properties 4.4 and 5.4 (cancel edit, cancel delete) are both about cancel behavior and can be combined

**Consolidated Properties**:
After reflection, the following properties provide unique validation value without redundancy.


### Property 1: Skill Creation and Retrieval Round Trip

For any valid skill name, creating a skill and then retrieving the user's skills should return a list containing a skill with that name.

**Validates: Requirements 1.3, 10.1, 10.4**

### Property 2: Skill Cascade Deletion

For any skill with associated nodes and connections, deleting the skill should remove the skill, all its nodes, and all its connections from the database.

**Validates: Requirements 1.5, 5.2, 5.3**

### Property 3: Node Creation with Default Status

For any valid node data (title and description), creating a node should result in a node with status "not_started" and a valid position on the canvas.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 4: Node Data Persistence Round Trip

For any created node, updating its title, description, status, or position and then retrieving it should return the node with the updated values.

**Validates: Requirements 4.2, 4.3, 7.3, 7.4, 10.2**

### Property 5: Node Rendering Completeness

For any skill node, the rendered output should contain the node's title, description, and status with distinct visual indicators for each status value.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 6: Connection Creation and Retrieval Round Trip

For any two valid nodes in a skill, creating a connection between them and then retrieving the skill's connections should return a list containing that connection.

**Validates: Requirements 6.2, 10.3, 10.5**

### Property 7: Connection Visual Update on Node Movement

For any node with connections, changing the node's position should result in all connected edges updating their visual paths to maintain continuity.

**Validates: Requirements 6.5, 7.2**

### Property 8: Node Cascade Deletion

For any node with connections, deleting the node should remove both the node and all connections where it is either the source or target.

**Validates: Requirements 5.2, 5.3**

### Property 9: Cancel Operation Preserves State

For any edit or delete operation, cancelling the operation should leave the original data unchanged in the database.

**Validates: Requirements 4.4, 5.4**

### Property 10: Connection Directionality

For any connection between two nodes, the visual representation should clearly indicate the direction from source to target node.

**Validates: Requirements 6.4**

### Property 11: Navigation State Preservation

For any skill canvas with unsaved changes, navigating back to the skill list should persist all changes before navigation.

**Validates: Requirements 9.2**

### Property 12: Skill List Completeness

For any user with N skills in the database, loading the skill list view should display exactly N skill cards.

**Validates: Requirements 9.3**


## Error Handling

### Network Errors

**API Call Failures**:
- Display toast notifications for failed requests
- Show specific error messages (e.g., "Failed to create skill", "Failed to load nodes")
- Provide retry buttons for failed operations
- Implement exponential backoff for retries

**Loading States**:
- Show skeleton loaders while fetching skills/nodes
- Display loading spinner on canvas while data loads
- Disable action buttons during operations to prevent duplicate requests

**Offline Handling**:
- Detect offline state and show appropriate message
- Queue operations for retry when connection restored (future enhancement)
- Cache last successful data in localStorage as fallback

### Authentication Errors

**Token Expiration**:
- Catch 401 responses and redirect to login
- Refresh Firebase token automatically before expiration
- Show "Session expired" message to user

**Permission Errors**:
- Validate user owns skill/node before operations
- Return 403 for unauthorized access attempts
- Display "Access denied" message

### Validation Errors

**Client-Side Validation**:
- Validate skill name length (1-100 characters)
- Validate node title length (1-100 characters)
- Validate node description length (max 500 characters)
- Validate status enum values
- Show inline error messages on form fields

**Server-Side Validation**:
- Use Zod schemas for request validation
- Return 400 with detailed error messages
- Display validation errors to user

**Business Logic Errors**:
- Prevent duplicate connections between same nodes
- Prevent self-connections (node to itself)
- Validate node belongs to skill before creating connection
- Show user-friendly error messages

### Data Integrity Errors

**Cascade Deletion**:
- Wrap skill deletion in transaction to ensure all nodes/connections deleted
- Handle partial deletion failures gracefully
- Log errors for debugging

**Concurrent Updates**:
- Use optimistic locking with version numbers (future enhancement)
- Handle conflicts by showing "Data changed" message
- Provide option to reload and retry

### React Flow Errors

**Canvas Rendering Errors**:
- Catch React Flow errors with error boundary
- Display fallback UI if canvas fails to render
- Log errors to console for debugging

**Invalid Node/Edge Data**:
- Validate data before passing to React Flow
- Provide default values for missing fields
- Handle malformed position data gracefully

### Error Boundary Component

```jsx
// frontend/src/components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- UI component rendering with specific props
- User interactions (clicks, form submissions)
- Error handling scenarios
- Integration between components

**Property Tests**: Verify universal properties across all inputs
- CRUD operations with random valid data
- Data persistence round trips
- Cascade deletion behavior
- State preservation across operations

### Unit Testing

**Component Tests** (React Testing Library):

```javascript
// frontend/src/components/__tests__/SkillCard.test.jsx
describe('SkillCard', () => {
  it('should display skill name and metadata', () => {
    const skill = {
      _id: '123',
      name: 'React Development',
      nodeCount: 5,
      updatedAt: new Date()
    };
    render(<SkillCard skill={skill} />);
    expect(screen.getByText('React Development')).toBeInTheDocument();
    expect(screen.getByText('5 nodes')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    const onClick = jest.fn();
    render(<SkillCard skill={mockSkill} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(mockSkill._id);
  });

  it('should show delete confirmation on delete button click', () => {
    render(<SkillCard skill={mockSkill} />);
    fireEvent.click(screen.getByLabelText('Delete skill'));
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });
});
```

**Page Tests**:

```javascript
// frontend/src/pages/__tests__/SkillMapList.test.jsx
describe('SkillMapList', () => {
  it('should display create skill button', () => {
    render(<SkillMapList />);
    expect(screen.getByText('Create Skill')).toBeInTheDocument();
  });

  it('should show empty state when no skills exist', async () => {
    mockAPI.getSkills.mockResolvedValue({ data: { skills: [] } });
    render(<SkillMapList />);
    await waitFor(() => {
      expect(screen.getByText(/no skills yet/i)).toBeInTheDocument();
    });
  });

  it('should display skills in grid layout', async () => {
    const skills = [
      { _id: '1', name: 'Skill 1', nodeCount: 3 },
      { _id: '2', name: 'Skill 2', nodeCount: 5 }
    ];
    mockAPI.getSkills.mockResolvedValue({ data: { skills } });
    render(<SkillMapList />);
    await waitFor(() => {
      expect(screen.getByText('Skill 1')).toBeInTheDocument();
      expect(screen.getByText('Skill 2')).toBeInTheDocument();
    });
  });
});
```

**API Integration Tests**:

```javascript
// frontend/src/services/__tests__/skillMapAPI.test.js
describe('skillMapAPI', () => {
  it('should create skill with valid name', async () => {
    const mockResponse = { data: { _id: '123', name: 'Test Skill' } };
    axios.post.mockResolvedValue(mockResponse);
    
    const result = await skillMapAPI.createSkill('Test Skill');
    
    expect(axios.post).toHaveBeenCalledWith(
      '/api/skills',
      { name: 'Test Skill' }
    );
    expect(result.data.name).toBe('Test Skill');
  });

  it('should handle network errors gracefully', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));
    
    await expect(skillMapAPI.getSkills()).rejects.toThrow('Network error');
  });
});
```


### Property-Based Testing

**Configuration**:
- Library: fast-check (JavaScript property-based testing library)
- Minimum iterations: 100 per property test
- Each test tagged with: **Feature: skill-map-management, Property {number}: {property_text}**

**Backend Property Tests** (using fast-check):

```javascript
// backend/src/routes/__tests__/skills.property.test.js
import fc from 'fast-check';
import request from 'supertest';
import app from '../../server.js';

describe('Property Tests: Skill CRUD', () => {
  // Property 1: Skill Creation and Retrieval Round Trip
  it('Feature: skill-map-management, Property 1: For any valid skill name, creating and retrieving should return the skill', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (skillName) => {
          const token = await getTestAuthToken();
          
          // Create skill
          const createRes = await request(app)
            .post('/api/skills')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: skillName.trim() });
          
          expect(createRes.status).toBe(201);
          const skillId = createRes.body._id;
          
          // Retrieve skills
          const getRes = await request(app)
            .get('/api/skills')
            .set('Authorization', `Bearer ${token}`);
          
          expect(getRes.status).toBe(200);
          const foundSkill = getRes.body.skills.find(s => s._id === skillId);
          expect(foundSkill).toBeDefined();
          expect(foundSkill.name).toBe(skillName.trim());
          
          // Cleanup
          await request(app)
            .delete(`/api/skills/${skillId}`)
            .set('Authorization', `Bearer ${token}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 2: Skill Cascade Deletion
  it('Feature: skill-map-management, Property 2: Deleting a skill removes all nodes and connections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ maxLength: 500 })
        }), { minLength: 1, maxLength: 5 }),
        async (skillName, nodes) => {
          const token = await getTestAuthToken();
          
          // Create skill
          const skillRes = await request(app)
            .post('/api/skills')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: skillName.trim() });
          const skillId = skillRes.body._id;
          
          // Create nodes
          const nodeIds = [];
          for (const node of nodes) {
            const nodeRes = await request(app)
              .post(`/api/skills/${skillId}/nodes`)
              .set('Authorization', `Bearer ${token}`)
              .send(node);
            nodeIds.push(nodeRes.body._id);
          }
          
          // Create connections if multiple nodes
          if (nodeIds.length > 1) {
            await request(app)
              .post(`/api/skills/${skillId}/connections`)
              .set('Authorization', `Bearer ${token}`)
              .send({
                sourceNodeId: nodeIds[0],
                targetNodeId: nodeIds[1]
              });
          }
          
          // Delete skill
          const deleteRes = await request(app)
            .delete(`/api/skills/${skillId}`)
            .set('Authorization', `Bearer ${token}`);
          
          expect(deleteRes.status).toBe(200);
          
          // Verify skill is gone
          const getSkillRes = await request(app)
            .get('/api/skills')
            .set('Authorization', `Bearer ${token}`);
          const foundSkill = getSkillRes.body.skills.find(s => s._id === skillId);
          expect(foundSkill).toBeUndefined();
          
          // Verify nodes are gone
          const getNodesRes = await request(app)
            .get(`/api/skills/${skillId}/nodes`)
            .set('Authorization', `Bearer ${token}`);
          expect(getNodesRes.status).toBe(404);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 3: Node Creation with Default Status
  it('Feature: skill-map-management, Property 3: New nodes have default status "not_started"', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ maxLength: 500 })
        }),
        async (nodeData) => {
          const token = await getTestAuthToken();
          
          // Create skill first
          const skillRes = await request(app)
            .post('/api/skills')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Test Skill' });
          const skillId = skillRes.body._id;
          
          // Create node
          const nodeRes = await request(app)
            .post(`/api/skills/${skillId}/nodes`)
            .set('Authorization', `Bearer ${token}`)
            .send(nodeData);
          
          expect(nodeRes.status).toBe(201);
          expect(nodeRes.body.status).toBe('not_started');
          expect(nodeRes.body.position).toBeDefined();
          expect(typeof nodeRes.body.position.x).toBe('number');
          expect(typeof nodeRes.body.position.y).toBe('number');
          
          // Cleanup
          await request(app)
            .delete(`/api/skills/${skillId}`)
            .set('Authorization', `Bearer ${token}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 4: Node Data Persistence Round Trip
  it('Feature: skill-map-management, Property 4: Node updates persist correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ maxLength: 500 }),
          status: fc.constantFrom('not_started', 'in_progress', 'completed'),
          position: fc.record({
            x: fc.integer({ min: -1000, max: 1000 }),
            y: fc.integer({ min: -1000, max: 1000 })
          })
        }),
        async (updateData) => {
          const token = await getTestAuthToken();
          
          // Create skill and node
          const skillRes = await request(app)
            .post('/api/skills')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Test Skill' });
          const skillId = skillRes.body._id;
          
          const nodeRes = await request(app)
            .post(`/api/skills/${skillId}/nodes`)
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Original', description: 'Original' });
          const nodeId = nodeRes.body._id;
          
          // Update node
          const updateRes = await request(app)
            .put(`/api/skills/${skillId}/nodes/${nodeId}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateData);
          
          expect(updateRes.status).toBe(200);
          
          // Retrieve and verify
          const getRes = await request(app)
            .get(`/api/skills/${skillId}/nodes`)
            .set('Authorization', `Bearer ${token}`);
          
          const updatedNode = getRes.body.nodes.find(n => n._id === nodeId);
          expect(updatedNode.title).toBe(updateData.title.trim());
          expect(updatedNode.description).toBe(updateData.description.trim());
          expect(updatedNode.status).toBe(updateData.status);
          expect(updatedNode.position.x).toBe(updateData.position.x);
          expect(updatedNode.position.y).toBe(updateData.position.y);
          
          // Cleanup
          await request(app)
            .delete(`/api/skills/${skillId}`)
            .set('Authorization', `Bearer ${token}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```


**Frontend Property Tests**:

```javascript
// frontend/src/utils/__tests__/reactFlowTransform.property.test.js
import fc from 'fast-check';
import { toReactFlowNode, toReactFlowEdge } from '../reactFlowTransform';

describe('Property Tests: React Flow Transformations', () => {
  // Property 5: Node Rendering Completeness
  it('Feature: skill-map-management, Property 5: Rendered nodes contain all required data', () => {
    fc.assert(
      fc.property(
        fc.record({
          _id: fc.string(),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ maxLength: 500 }),
          status: fc.constantFrom('not_started', 'in_progress', 'completed'),
          position: fc.record({
            x: fc.integer(),
            y: fc.integer()
          })
        }),
        (skillNode) => {
          const reactFlowNode = toReactFlowNode(skillNode);
          
          expect(reactFlowNode.id).toBe(skillNode._id);
          expect(reactFlowNode.data.title).toBe(skillNode.title);
          expect(reactFlowNode.data.description).toBe(skillNode.description);
          expect(reactFlowNode.data.status).toBe(skillNode.status);
          expect(reactFlowNode.position).toEqual(skillNode.position);
          
          // Verify distinct status indicators
          const statusColors = {
            not_started: 'bg-gray-100',
            in_progress: 'bg-yellow-100',
            completed: 'bg-green-100'
          };
          expect(statusColors[skillNode.status]).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 6: Connection Creation and Retrieval Round Trip
  it('Feature: skill-map-management, Property 6: Connection transformation preserves data', () => {
    fc.assert(
      fc.property(
        fc.record({
          _id: fc.string(),
          sourceNodeId: fc.string(),
          targetNodeId: fc.string()
        }),
        (connection) => {
          const reactFlowEdge = toReactFlowEdge(connection);
          
          expect(reactFlowEdge.id).toBe(connection._id);
          expect(reactFlowEdge.source).toBe(connection.sourceNodeId);
          expect(reactFlowEdge.target).toBe(connection.targetNodeId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**End-to-End Workflow Tests**:

```javascript
// e2e/skillMap.spec.js (using Playwright or Cypress)
describe('Skill Map E2E', () => {
  it('should complete full skill creation workflow', async () => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Navigate to skill map
    await page.click('text=Skill Map');
    await expect(page).toHaveURL('/skill-map');
    
    // Create skill
    await page.click('text=Create Skill');
    await page.fill('[name="skillName"]', 'React Testing');
    await page.click('text=Create');
    
    // Verify skill appears
    await expect(page.locator('text=React Testing')).toBeVisible();
    
    // Open skill canvas
    await page.click('text=React Testing');
    await expect(page).toHaveURL(/\/skill-map\/.+/);
    
    // Add node
    await page.click('text=Add Node');
    await page.fill('[name="title"]', 'Learn Hooks');
    await page.fill('[name="description"]', 'Master useState and useEffect');
    await page.click('text=Create Node');
    
    // Verify node appears on canvas
    await expect(page.locator('text=Learn Hooks')).toBeVisible();
    
    // Navigate back
    await page.click('[aria-label="Back"]');
    await expect(page).toHaveURL('/skill-map');
    
    // Verify skill still exists
    await expect(page.locator('text=React Testing')).toBeVisible();
  });
});
```

### Performance Testing

**Load Testing**:
- Test canvas performance with 50+ nodes
- Test connection rendering with 100+ edges
- Measure API response times for bulk operations
- Test scroll/zoom performance on large canvases

**Metrics to Track**:
- Initial page load time: < 2s
- Canvas render time: < 500ms
- Node drag responsiveness: < 16ms (60fps)
- API response time: < 200ms

### Accessibility Testing

**Keyboard Navigation**:
- Tab through all interactive elements
- Test Enter/Space for button activation
- Test Escape for modal dismissal
- Test arrow keys for canvas navigation (future enhancement)

**Screen Reader Compatibility**:
- Verify ARIA labels on all buttons
- Test form field labels and descriptions
- Verify error messages are announced
- Test focus management in modals

**Color Contrast**:
- Verify all text meets WCAG AA standards (4.5:1 ratio)
- Test status badges for sufficient contrast
- Verify focus indicators are visible

### Test Coverage Goals

- Unit test coverage: > 80%
- Property test coverage: All 12 properties implemented
- Integration test coverage: All critical user flows
- E2E test coverage: Happy path + error scenarios


## Implementation Notes

### React Flow Setup

**Installation**:
```bash
npm install reactflow
```

**Basic Configuration**:
```javascript
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';

// In component
const [nodes, setNodes, onNodesChange] = useNodesState([]);
const [edges, setEdges, onEdgesChange] = useEdgesState([]);

const onConnect = useCallback((params) => {
  setEdges((eds) => addEdge(params, eds));
  // Also save to backend
  saveConnection(params);
}, []);
```

**Custom Styling**:
- Override React Flow CSS variables for theme consistency
- Use Tailwind classes in custom node components
- Match LearnLoop color palette (indigo-600 for primary)

### State Management Patterns

**Optimistic Updates**:
```javascript
const handleUpdateNode = async (nodeId, updates) => {
  // Update UI immediately
  setNodes(nodes => nodes.map(n => 
    n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
  ));
  
  try {
    // Persist to backend
    await skillMapAPI.updateNode(skillId, nodeId, updates);
  } catch (error) {
    // Revert on error
    setNodes(originalNodes);
    showError('Failed to update node');
  }
};
```

**Debounced Position Updates**:
```javascript
import { debounce } from 'lodash';

const debouncedSavePosition = useCallback(
  debounce((nodeId, position) => {
    skillMapAPI.updateNode(skillId, nodeId, { position });
  }, 500),
  [skillId]
);

const onNodeDragStop = (event, node) => {
  debouncedSavePosition(node.id, node.position);
};
```

### Database Indexing Strategy

**Critical Indexes**:
```javascript
// Skill queries by user
SkillSchema.index({ userId: 1, updatedAt: -1 });

// Node queries by skill
SkillNodeSchema.index({ skillId: 1, userId: 1 });

// Connection queries by skill
NodeConnectionSchema.index({ skillId: 1, userId: 1 });

// Prevent duplicate connections
NodeConnectionSchema.index(
  { sourceNodeId: 1, targetNodeId: 1 },
  { unique: true }
);
```

### Performance Optimizations

**Frontend**:
- Lazy load React Flow library with React.lazy()
- Memoize custom node components with React.memo()
- Use React Flow's built-in virtualization for large graphs
- Debounce position updates to reduce API calls
- Cache skill list in component state

**Backend**:
- Use lean() queries for read-only operations
- Implement pagination for large skill lists (future)
- Use aggregation pipeline for complex queries
- Add Redis caching for frequently accessed data (future)

### Security Considerations

**Authorization**:
- Verify userId matches authenticated user on all operations
- Validate skill ownership before node/connection operations
- Use parameterized queries to prevent injection

**Input Validation**:
- Sanitize all user inputs
- Enforce length limits on all text fields
- Validate ObjectId formats
- Prevent XSS with proper escaping

**Rate Limiting** (future enhancement):
- Limit skill creation to 10 per minute
- Limit node creation to 50 per minute
- Limit API calls to 100 per minute per user

### Browser Compatibility

**Target Browsers**:
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions

**Polyfills**:
- React Flow handles most compatibility issues
- Use core-js for older browser support if needed

### Accessibility Enhancements

**Keyboard Shortcuts** (future):
- `Ctrl/Cmd + N`: Create new node
- `Delete`: Delete selected node/connection
- `Ctrl/Cmd + Z`: Undo (future)
- `Ctrl/Cmd + S`: Save (auto-save makes this optional)

**Focus Management**:
- Trap focus in modals
- Return focus to trigger element on modal close
- Provide skip links for canvas navigation

### Deployment Considerations

**Environment Variables**:
```bash
# Frontend (.env)
VITE_API_URL=https://api.learnloop.com

# Backend (.env)
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
```

**Build Optimization**:
- Code splitting for React Flow
- Tree shaking for unused Lucide icons
- Minification and compression
- CDN for static assets

### Future Enhancements

**Phase 2 Features**:
- Undo/redo functionality
- Node templates (common learning patterns)
- Export skill map as image/PDF
- Collaborative editing (real-time updates)
- Node notes and attachments
- Progress tracking integration with practice logs
- AI-suggested learning paths

**Technical Debt**:
- Add comprehensive error logging service
- Implement proper state management (Redux/Zustand)
- Add offline support with service workers
- Implement real-time sync with WebSockets

