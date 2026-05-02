import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { auth } from '../firebase.js';
import client from '../api/client';

const SkillMapContext = createContext(null);

const mapDetailCache = new Map();

export function SkillMapProvider({ children }) {
  const [skills, setSkills] = useState([]);
  const [currentSkill, setCurrentSkill] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [skillMapProgress, setSkillMapProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapViewLoading, setMapViewLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapDetailError, setMapDetailError] = useState(null);
  const loadingSkillIdRef = useRef(null);
  const hasAutoLoadedRef = useRef(false); // Track if we've auto-loaded skills

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  };

  const invalidateSkillMapDetailCache = useCallback((skillId) => {
    if (skillId) mapDetailCache.delete(skillId);
  }, []);

  const applyFullResponse = useCallback((skillId, { skill_map, nodes: nList, progress }) => {
    const skillRow = {
      _id: skill_map.id,
      name: skill_map.title,
      icon: skill_map.icon,
      color: skill_map.color,
      description: skill_map.description,
      goal: skill_map.goal,
      status: skill_map.status,
      fromTemplate: skill_map.fromTemplate || false,
      publishStatus: skill_map.publishStatus || 'draft',
      publishedAt: skill_map.publishedAt || null,
      authorCredit: skill_map.authorCredit || '',
      nodeCount: nList.length,
      completionPercentage: progress.percent,
      completedNodes: progress.completed
    };
    setCurrentSkill(skillRow);
    setNodes(nList);
    setSkillMapProgress(progress);
    mapDetailCache.set(skillId, {
      skill_map,
      nodes: nList,
      progress,
      cachedAt: Date.now()
    });
    setSkills((prev) =>
      prev.map((s) => (String(s._id) === String(skillId) ? {
        ...s,
        completedNodes: progress.completed,
        completionPercentage: progress.percent,
        nodeCount: nList.length
      } : s))
    );
  }, []);

  const loadSkillMapFull = useCallback(async (skillId, options = {}) => {
    const { background = false } = options;
    if (!skillId) return;

    loadingSkillIdRef.current = skillId;
    const cached = mapDetailCache.get(skillId);

    if (!background) {
      setMapDetailError(null);
      if (cached) {
        applyFullResponse(skillId, {
          skill_map: cached.skill_map,
          nodes: cached.nodes,
          progress: cached.progress
        });
        setMapViewLoading(false);
      } else {
        setMapViewLoading(true);
        setCurrentSkill(null);
        setNodes([]);
        setSkillMapProgress(null);
      }
    }

    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      let response;
      try {
        response = await client.get(`/skills/maps/${skillId}/full`, { headers });
      } catch (e) {
        if (e.response?.status === 404) {
          response = await client.get(`/skill-maps/${skillId}/full`, { headers });
        } else {
          throw e;
        }
      }

      if (loadingSkillIdRef.current !== skillId) return;

      const payload = response.data;
      applyFullResponse(skillId, payload);
    } catch (err) {
      if (loadingSkillIdRef.current !== skillId) return;
      const message = err.response?.data?.message || err.message || 'Failed to load skill map';
      if (!cached) {
        setMapDetailError(message);
        setError(message);
      }
      console.error('Error loading skill map full:', err);
    } finally {
      if (loadingSkillIdRef.current === skillId && !background) {
        setMapViewLoading(false);
      }
    }
  }, [applyFullResponse]);

  const loadSkillNodes = useCallback(async (skillId) => {
    await loadSkillMapFull(skillId, { background: false });
  }, [loadSkillMapFull]);

  const createSkillMap = useCallback(async (payload) => {
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      let response;
      try {
        response = await client.post('/skills/maps', payload, { headers });
      } catch (e) {
        if (e.response?.status === 404) {
          response = await client.post('/skill-maps', payload, { headers });
        } else {
          throw e;
        }
      }
      const { skill, nodes } = response.data;
      setSkills((prev) => [{
        ...skill,
        completedNodes: 0,
        completionPercentage: 0,
        nodeCount: nodes?.length || skill.nodeCount
      }, ...prev]);
      return { skill, nodes };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create skill map';
      throw new Error(errorMessage);
    }
  }, []);

  const loadSkills = useCallback(async (subscriptionLimits = null) => {
    console.log('📥 loadSkills called with:', subscriptionLimits);
    
    // Prevent duplicate auto-loads - only allow explicit calls or first auto-load
    if (subscriptionLimits && hasAutoLoadedRef.current) {
      console.log('⏭️ Skipping duplicate auto-load, already loaded');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);

      const token = await getAuthToken();
      console.log('🔑 Got auth token');
      const response = await client.get('/skills', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📦 Received skills response:', response.data);

      let skillsData = response.data.skills || [];
      console.log('📊 Skills data:', skillsData.length, 'skills');
      
      // Apply locking logic if subscription limits are provided
      if (subscriptionLimits && subscriptionLimits.isFree !== undefined) {
        console.log('🔒 Applying locking logic');
        const { maxSkillMaps, isFree } = subscriptionLimits;
        const maxAllowed = maxSkillMaps === -1 ? Infinity : (maxSkillMaps ?? 3);
        
        // Sort by creation date (newest first) to identify which skill maps are accessible
        const sortedSkills = [...skillsData].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // Mark skill maps as locked if user is on free plan and has exceeded limit
        // The newest N skill maps (index < maxAllowed) are unlocked
        skillsData = skillsData.map((skill) => {
          const skillIndex = sortedSkills.findIndex(s => s._id === skill._id);
          const isLocked = isFree && skillIndex >= maxAllowed;
          
          return {
            ...skill,
            locked: isLocked
          };
        });
        
        // Mark that we've completed an auto-load
        hasAutoLoadedRef.current = true;
      }

      console.log('✅ Setting skills:', skillsData.length, 'skills');
      setSkills(skillsData);
    } catch (err) {
      console.error('❌ Error loading skills:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load skills';
      setError(errorMessage);
      console.error('Error loading skills:', err);
    } finally {
      console.log('🏁 loadSkills finished, setting isLoading to false');
      setIsLoading(false);
    }
  }, []);

  const deleteSkill = useCallback(async (skillId) => {
    const previousSkills = [...skills];
    const previousCurrentSkill = currentSkill;
    const previousNodes = [...nodes];

    try {
      setError(null);
      invalidateSkillMapDetailCache(skillId);

      setSkills((prev) => prev.filter((skill) => skill._id !== skillId));

      if (currentSkill?._id === skillId) {
        setCurrentSkill(null);
        setNodes([]);
        setSkillMapProgress(null);
      }

      const token = await getAuthToken();
      await client.delete(`/skills/${skillId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      setSkills(previousSkills);
      setCurrentSkill(previousCurrentSkill);
      setNodes(previousNodes);

      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete skill';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentSkill, skills, nodes, invalidateSkillMapDetailCache]);

  const updateNodeStatus = useCallback(async (nodeId, status) => {
    const previousNodes = [...nodes];
    const previousSkills = [...skills];

    try {
      setError(null);
      const sid = currentSkill?._id;

      const targetNode = nodes.find((n) => n._id === nodeId);
      if (!targetNode) {
        throw new Error('Node not found');
      }

      let predictedNextNode = null;
      if (status === 'Completed') {
        const nextOrder = targetNode.order + 1;
        predictedNextNode = nodes.find((n) => n.order === nextOrder && n.status === 'Locked');
      }

      setNodes((prev) => prev.map((node) => {
        if (node._id === nodeId) {
          return { ...node, status };
        }
        if (predictedNextNode && node._id === predictedNextNode._id) {
          return { ...node, status: 'Unlocked' };
        }
        return node;
      }));

      if (currentSkill) {
        const optimisticNodes = nodes.map((node) => {
          if (node._id === nodeId) return { ...node, status };
          if (predictedNextNode && node._id === predictedNextNode._id) return { ...node, status: 'Unlocked' };
          return node;
        });

        const completedCount = optimisticNodes.filter((n) => n.status === 'Completed').length;
        const completionPercentage = optimisticNodes.length
          ? (completedCount / optimisticNodes.length) * 100
          : 0;

        setSkills((prev) => prev.map((skill) =>
          skill._id === currentSkill._id
            ? { ...skill, completedNodes: completedCount, completionPercentage }
            : skill
        ));
      }

      const token = await getAuthToken();
      const response = await client.patch(`/nodes/${nodeId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedNode = response.data.node;
      const nextNode = response.data.nextNode;

      setNodes((prev) => prev.map((node) => {
        if (node._id === nodeId) {
          return updatedNode;
        }
        if (nextNode && node._id === nextNode._id) {
          return nextNode;
        }
        return node;
      }));

      if (currentSkill) {
        const actualNodes = nodes.map((node) => {
          if (node._id === nodeId) return updatedNode;
          if (nextNode && node._id === nextNode._id) return nextNode;
          return node;
        });

        const completedCount = actualNodes.filter((n) => n.status === 'Completed').length;
        const completionPercentage = actualNodes.length
          ? (completedCount / actualNodes.length) * 100
          : 0;

        setSkills((prev) => prev.map((skill) =>
          skill._id === currentSkill._id
            ? { ...skill, completedNodes: completedCount, completionPercentage }
            : skill
        ));
      }

      if (sid) {
        invalidateSkillMapDetailCache(sid);
        loadSkillMapFull(sid, { background: true });
      }

      return { node: updatedNode, nextNode, skillMapXpAwarded: response.data.skillMapXpAwarded };
    } catch (err) {
      setNodes(previousNodes);
      setSkills(previousSkills);

      const errorMessage = err.response?.data?.message || err.message || 'Failed to update node status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentSkill, nodes, skills, invalidateSkillMapDetailCache, loadSkillMapFull]);

  const updateNodeContent = useCallback(async (nodeId, { title, description }) => {
    const previousNodes = [...nodes];

    try {
      setError(null);

      // Build update payload with only defined values
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;

      // Optimistic update with only the fields being changed
      setNodes((prev) => prev.map((node) =>
        node._id === nodeId ? { ...node, ...updates } : node
      ));

      const token = await getAuthToken();
      const response = await client.patch(`/nodes/${nodeId}/content`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedNode = response.data.node;

      setNodes((prev) => prev.map((node) =>
        node._id === nodeId ? updatedNode : node
      ));

      const sid = currentSkill?._id;
      if (sid) {
        invalidateSkillMapDetailCache(sid);
        loadSkillMapFull(sid, { background: true });
      }

      return updatedNode;
    } catch (err) {
      setNodes(previousNodes);

      const errorMessage = err.response?.data?.message || err.message || 'Failed to update node content';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [nodes, currentSkill, invalidateSkillMapDetailCache, loadSkillMapFull]);

  const createNode = useCallback(async (skillId, { title, description }) => {
    try {
      setError(null);

      const token = await getAuthToken();
      const response = await client.post(`/skills/${skillId}/nodes`,
        { title, description: description || '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newNode = response.data.node;

      // Refresh the full skill map to get updated nodes with correct order
      if (currentSkill && currentSkill._id === skillId) {
        invalidateSkillMapDetailCache(skillId);
        await loadSkillMapFull(skillId, { background: false });
        
        // Update node count
        setCurrentSkill((prev) => ({ ...prev, nodeCount: (prev.nodeCount || 0) + 1 }));
        setSkills((prev) => prev.map((skill) =>
          skill._id === skillId
            ? { ...skill, nodeCount: (skill.nodeCount || 0) + 1 }
            : skill
        ));
      }

      return newNode;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create node';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentSkill, invalidateSkillMapDetailCache, loadSkillMapFull]);

  const deleteNode = useCallback(async (nodeId) => {
    try {
      setError(null);

      const token = await getAuthToken();
      const response = await client.delete(`/nodes/${nodeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNodes((prev) => {
        const filtered = prev.filter((node) => node._id !== nodeId);
        return filtered.sort((a, b) => a.order - b.order);
      });

      if (currentSkill) {
        const newNodeCount = nodes.length - 1;
        setCurrentSkill((prev) => ({ ...prev, nodeCount: newNodeCount }));
        setSkills((prev) => prev.map((skill) =>
          skill._id === currentSkill._id
            ? { ...skill, nodeCount: newNodeCount }
            : skill
        ));
        invalidateSkillMapDetailCache(currentSkill._id);
        loadSkillMapFull(currentSkill._id, { background: true });
      }

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete node';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentSkill, nodes, invalidateSkillMapDetailCache, loadSkillMapFull]);

  const startSession = useCallback(async (nodeId) => {
    const previousNodes = [...nodes];

    try {
      setError(null);

      const targetNode = nodes.find((n) => n._id === nodeId);
      if (targetNode && targetNode.status === 'Unlocked') {
        setNodes((prev) => prev.map((node) =>
          node._id === nodeId
            ? { ...node, status: 'In_Progress' }
            : node
        ));
      }

      const token = await getAuthToken();
      const response = await client.post(`/nodes/${nodeId}/sessions`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const session = response.data;

      if (session.nodeStatusUpdated) {
        setNodes((prev) => prev.map((node) =>
          node._id === nodeId
            ? { ...node, status: 'In_Progress' }
            : node
        ));
      }

      const sid = currentSkill?._id;
      if (sid) {
        invalidateSkillMapDetailCache(sid);
        loadSkillMapFull(sid, { background: true });
      }

      return session;
    } catch (err) {
      setNodes(previousNodes);

      const errorMessage = err.response?.data?.message || err.message || 'Failed to start session';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [nodes, currentSkill, invalidateSkillMapDetailCache, loadSkillMapFull]);

  const getNodeDetails = useCallback(async (nodeId) => {
    try {
      setError(null);

      const token = await getAuthToken();
      const response = await client.get(`/nodes/${nodeId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load node details';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateSkillMap = useCallback(async (skillId, updates) => {
    const previousSkills = [...skills];
    const previousCurrentSkill = currentSkill;

    try {
      setError(null);

      // Optimistic update
      if (currentSkill?._id === skillId) {
        setCurrentSkill((prev) => ({ ...prev, ...updates }));
      }
      setSkills((prev) => prev.map((skill) =>
        skill._id === skillId ? { ...skill, ...updates } : skill
      ));

      const token = await getAuthToken();
      const response = await client.patch(`/skills/${skillId}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedSkill = response.data.skill;

      // Update with server response
      if (currentSkill?._id === skillId) {
        setCurrentSkill((prev) => ({ ...prev, ...updatedSkill }));
      }
      setSkills((prev) => prev.map((skill) =>
        skill._id === skillId ? { ...skill, ...updatedSkill } : skill
      ));

      invalidateSkillMapDetailCache(skillId);
      loadSkillMapFull(skillId, { background: true });

      return updatedSkill;
    } catch (err) {
      setSkills(previousSkills);
      setCurrentSkill(previousCurrentSkill);

      const errorMessage = err.response?.data?.message || err.message || 'Failed to update skill map';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentSkill, skills, invalidateSkillMapDetailCache, loadSkillMapFull]);

  const clearError = useCallback(() => {
    setError(null);
    setMapDetailError(null);
  }, []);
  
  const forceReloadSkills = useCallback(async (subscriptionLimits = null) => {
    console.log('🔄 Force reloading skills');
    hasAutoLoadedRef.current = false; // Reset the flag to allow reload
    await loadSkills(subscriptionLimits);
  }, [loadSkills]);

  const value = {
    skills,
    currentSkill,
    nodes,
    skillMapProgress,
    isLoading,
    mapViewLoading,
    error,
    mapDetailError,
    createSkillMap,
    loadSkills,
    forceReloadSkills,
    loadSkillNodes,
    loadSkillMapFull,
    deleteSkill,
    updateSkillMap,
    updateNodeStatus,
    updateNodeContent,
    createNode,
    deleteNode,
    startSession,
    getNodeDetails,
    clearError,
    invalidateSkillMapDetailCache
  };

  return (
    <SkillMapContext.Provider value={value}>
      {children}
    </SkillMapContext.Provider>
  );
}

export function useSkillMap() {
  const context = useContext(SkillMapContext);
  if (!context) {
    throw new Error('useSkillMap must be used within SkillMapProvider');
  }
  return context;
}
