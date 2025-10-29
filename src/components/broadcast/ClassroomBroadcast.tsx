'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { BroadcastService } from '../../lib/broadcast/BroadcastService';

interface ClassroomBroadcastProps {
  signalingUrl?: string;
  cudaServerUrl?: string;
}

interface SessionInfo {
  sessionId: string;
  role: 'teacher' | 'student';
  classroomName: string;
  studentCount?: number;
}

export const ClassroomBroadcast: React.FC<ClassroomBroadcastProps> = ({
  signalingUrl = 'https://us-central1-your-project.cloudfunctions.net/webrtc-signaling',
  cudaServerUrl = 'https://your-gpu-server.googleapis.com'
}) => {
  const [broadcastService] = useState(() => new BroadcastService(signalingUrl));
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  
  // Form states
  const [teacherId, setTeacherId] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [sessionIdToJoin, setSessionIdToJoin] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  
  // Heavy mode state
  const [heavyModeEnabled, setHeavyModeEnabled] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * Create new classroom session as teacher
   */
  const handleCreateSession = useCallback(async () => {
    if (!teacherId.trim()) {
      alert('Please enter your teacher ID');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('Creating session...');

    try {
      const sessionId = await broadcastService.createSession(teacherId, classroomName || undefined);
      
      setSessionInfo({
        sessionId,
        role: 'teacher',
        classroomName: classroomName || `Classroom ${sessionId.slice(0, 8)}`,
        studentCount: 0
      });

      setIsConnected(true);
      setConnectionStatus('Session created - Ready to broadcast');

      // Initialize broadcast with canvas
      if (canvasRef.current) {
        await broadcastService.initializeBroadcast(canvasRef.current, {});
        setConnectionStatus('Broadcasting active');
      }

    } catch (error) {
      console.error('Failed to create session:', error);
      setConnectionStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  }, [teacherId, classroomName, broadcastService]);

  /**
   * Start polling for WebRTC signaling messages
   */
  const startMessagePolling = useCallback(async () => {
    if (isConnected) {
      await broadcastService.pollForMessages();
      setTimeout(() => startMessagePolling(), 1000); // Poll every second
    }
  }, [isConnected, broadcastService]);

  /**
   * Join existing classroom session as student
   */
  const handleJoinSession = useCallback(async () => {
    if (!sessionIdToJoin.trim() || !studentId.trim()) {
      alert('Please enter session ID and your student ID');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('Joining session...');

    try {
      await broadcastService.joinSession(sessionIdToJoin, studentId, studentName || undefined);
      
      setSessionInfo({
        sessionId: sessionIdToJoin,
        role: 'student',
        classroomName: 'Joining classroom...'
      });

      setIsConnected(true);
      setConnectionStatus('Joined session - Waiting for stream');

      // Initialize receiver with video element
      if (videoRef.current) {
        await broadcastService.initializeReceiver(videoRef.current);
        setConnectionStatus('Receiving stream');
      }

      // Start polling for messages
      startMessagePolling();

    } catch (error) {
      console.error('Failed to join session:', error);
      setConnectionStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  }, [sessionIdToJoin, studentId, studentName, broadcastService, startMessagePolling]);

  /**
   * Enable heavy mode with CUDA rendering
   */
  const handleEnableHeavyMode = useCallback(async () => {
    if (sessionInfo?.role !== 'teacher') {
      alert('Heavy mode is only available for teachers');
      return;
    }

    try {
      setConnectionStatus('Enabling heavy mode...');
      await broadcastService.enableHeavyMode(cudaServerUrl);
      setHeavyModeEnabled(true);
      setConnectionStatus('Heavy mode enabled - CUDA rendering active');
    } catch (error) {
      console.error('Failed to enable heavy mode:', error);
      setConnectionStatus(`Heavy mode error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [sessionInfo, broadcastService, cudaServerUrl]);

  /**
   * Disconnect from session
   */
  const handleDisconnect = useCallback(async () => {
    try {
      await broadcastService.disconnect();
      setIsConnected(false);
      setSessionInfo(null);
      setConnectionStatus('Disconnected');
      setHeavyModeEnabled(false);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }, [broadcastService]);

  /**
   * Listen for parameter updates from teacher (student mode)
   */
  useEffect(() => {
    if (sessionInfo?.role === 'student') {
      const handleParameterUpdate = (event: Event) => {
        if (event instanceof CustomEvent && event.detail) {
          console.log('Parameter update:', event.detail);
        }
      };

      window.addEventListener('fractalParameterUpdate', handleParameterUpdate);

      return () => {
        window.removeEventListener('fractalParameterUpdate', handleParameterUpdate);
      };
    }
  }, [sessionInfo]);

  return (
    <div className="space-y-6">
      {/* Connection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Classroom Broadcasting
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {connectionStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Teacher Controls */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Create Session (Teacher)</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Your Teacher ID"
                    value={teacherId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeacherId(e.target.value)}
                  />
                  <Input
                    placeholder="Classroom Name (optional)"
                    value={classroomName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClassroomName(e.target.value)}
                  />
                  <Button 
                    onClick={handleCreateSession}
                    disabled={isConnecting}
                    className="w-full"
                  >
                    {isConnecting ? 'Creating...' : 'Create Session'}
                  </Button>
                </div>
              </div>

              {/* Student Controls */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Join Session (Student)</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Session ID"
                    value={sessionIdToJoin}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSessionIdToJoin(e.target.value)}
                  />
                  <Input
                    placeholder="Your Student ID"
                    value={studentId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentId(e.target.value)}
                  />
                  <Input
                    placeholder="Your Name (optional)"
                    value={studentName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentName(e.target.value)}
                  />
                  <Button 
                    onClick={handleJoinSession}
                    disabled={isConnecting}
                    className="w-full"
                  >
                    {isConnecting ? 'Joining...' : 'Join Session'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Connected State */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{sessionInfo?.classroomName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Session ID: {sessionInfo?.sessionId?.slice(0, 8)}...
                    {sessionInfo?.role === 'teacher' && sessionInfo.studentCount !== undefined && (
                      <span className="ml-2">• {sessionInfo.studentCount} students</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {sessionInfo?.role === 'teacher' && !heavyModeEnabled && (
                    <Button 
                      onClick={handleEnableHeavyMode}
                      variant="outline"
                      size="sm"
                    >
                      Enable Heavy Mode
                    </Button>
                  )}
                  <Button 
                    onClick={handleDisconnect}
                    variant="destructive"
                    size="sm"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>

              {heavyModeEnabled && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    🚀 Heavy Mode Active - Using CUDA GPU rendering for high-quality fractals
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fractal Display */}
      {sessionInfo?.role === 'teacher' ? (
        /* Teacher View - Interactive Fractal */
        <Card>
          <CardHeader>
            <CardTitle>Fractal Control (Broadcasting)</CardTitle>
          </CardHeader>
          <CardContent>
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full border border-gray-300 rounded-lg"
            />
          </CardContent>
        </Card>
      ) : sessionInfo?.role === 'student' ? (
        /* Student View - Received Stream */
        <Card>
          <CardHeader>
            <CardTitle>Receiving Fractal Stream</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-4xl rounded-lg border shadow-lg"
                style={{ aspectRatio: '4/3' }}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Receiving live fractal stream from teacher
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};