const { v4: uuidv4 } = require('uuid');

// In-memory storage for demo (use Firestore/Redis in production)
const broadcastSessions = new Map();
const connectedPeers = new Map();

/**
 * Cloud Function for WebRTC signaling in classroom broadcasts
 * Handles teacher-to-students streaming coordination
 */
exports.handleSignaling = (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { action, sessionId, peerId, role, offer, answer, candidate } = req.body;

  try {
    switch (action) {
      case 'create-session':
        return handleCreateSession(req, res);
      
      case 'join-session':
        return handleJoinSession(req, res);
      
      case 'leave-session':
        return handleLeaveSession(req, res);
      
      case 'send-offer':
        return handleSendOffer(req, res);
      
      case 'send-answer':
        return handleSendAnswer(req, res);
      
      case 'send-candidate':
        return handleSendCandidate(req, res);
      
      case 'get-session-info':
        return handleGetSessionInfo(req, res);
      
      default:
        res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Signaling error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function handleCreateSession(req, res) {
  const { teacherId, classroomName } = req.body;
  
  if (!teacherId) {
    return res.status(400).json({ error: 'Teacher ID required' });
  }

  const sessionId = uuidv4();
  const session = {
    sessionId,
    teacherId,
    classroomName: classroomName || `Classroom ${sessionId.slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    students: new Set(),
    isActive: true
  };

  broadcastSessions.set(sessionId, session);

  res.json({
    success: true,
    sessionId,
    classroomName: session.classroomName,
    signalingUrl: `https://${req.get('host')}/webrtc-signaling`,
    stunServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  });
}

function handleJoinSession(req, res) {
  const { sessionId, studentId, studentName } = req.body;
  
  if (!sessionId || !studentId) {
    return res.status(400).json({ error: 'Session ID and student ID required' });
  }

  const session = broadcastSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!session.isActive) {
    return res.status(403).json({ error: 'Session is not active' });
  }

  // Add student to session
  session.students.add({
    studentId,
    studentName: studentName || `Student ${studentId.slice(0, 8)}`,
    joinedAt: new Date().toISOString()
  });

  // Store peer connection info
  connectedPeers.set(studentId, {
    sessionId,
    role: 'student',
    peerId: studentId
  });

  res.json({
    success: true,
    sessionId,
    role: 'student',
    teacherId: session.teacherId,
    studentCount: session.students.size,
    stunServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  });
}

function handleLeaveSession(req, res) {
  const { sessionId, peerId } = req.body;
  
  const session = broadcastSessions.get(sessionId);
  if (session) {
    // Remove student from session
    session.students = new Set([...session.students].filter(s => s.studentId !== peerId));
    
    // If teacher leaves, end session
    if (peerId === session.teacherId) {
      session.isActive = false;
    }
  }

  connectedPeers.delete(peerId);

  res.json({ success: true });
}

function handleSendOffer(req, res) {
  const { sessionId, fromPeer, offer } = req.body;
  
  const session = broadcastSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // In a real implementation, this would use WebSockets or Server-Sent Events
  // For now, we'll store the offer for polling
  session.pendingOffer = {
    fromPeer,
    offer,
    timestamp: Date.now()
  };

  res.json({ success: true, message: 'Offer queued for delivery' });
}

function handleSendAnswer(req, res) {
  const { sessionId, fromPeer, answer } = req.body;
  
  const session = broadcastSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.pendingAnswer = {
    fromPeer,
    answer,
    timestamp: Date.now()
  };

  res.json({ success: true, message: 'Answer queued for delivery' });
}

function handleSendCandidate(req, res) {
  const { sessionId, fromPeer, candidate } = req.body;
  
  const session = broadcastSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!session.iceCandidates) {
    session.iceCandidates = [];
  }

  session.iceCandidates.push({
    fromPeer,
    candidate,
    timestamp: Date.now()
  });

  // Keep only recent candidates (last 50)
  if (session.iceCandidates.length > 50) {
    session.iceCandidates = session.iceCandidates.slice(-50);
  }

  res.json({ success: true, message: 'ICE candidate stored' });
}

function handleGetSessionInfo(req, res) {
  const { sessionId, peerId } = req.query;
  
  const session = broadcastSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const response = {
    sessionId,
    isActive: session.isActive,
    studentCount: session.students.size,
    classroomName: session.classroomName
  };

  // Include pending messages for this peer
  if (session.pendingOffer && session.pendingOffer.timestamp > Date.now() - 30000) {
    response.pendingOffer = session.pendingOffer;
  }

  if (session.pendingAnswer && session.pendingAnswer.timestamp > Date.now() - 30000) {
    response.pendingAnswer = session.pendingAnswer;
  }

  if (session.iceCandidates && session.iceCandidates.length > 0) {
    response.iceCandidates = session.iceCandidates.filter(
      candidate => candidate.timestamp > Date.now() - 30000
    );
  }

  res.json(response);
}

// Cleanup old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of broadcastSessions) {
    const age = now - new Date(session.createdAt).getTime();
    
    // Remove sessions older than 4 hours
    if (age > 4 * 60 * 60 * 1000) {
      broadcastSessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Run every hour