// Core data models for the fractal platform

export interface FractalParams {
  [key: string]: number | string | boolean | ComplexNumber | ColorScheme | Record<string, unknown>;
}

export interface ComplexNumber {
  real: number;
  imaginary: number;
}

export interface FractalConfig {
  id: string;
  name: string;
  type: 'mandelbrot' | 'julia' | 'l-system' | 'ifs' | 'attractor';
  params: FractalParams;
  colorScheme: ColorScheme;
  iterations: number;
  zoom: number;
  center: ComplexNumber;
  quality: 'draft' | 'normal' | 'high' | 'ultra';
}

export interface ColorScheme {
  id: string;
  name: string;
  colors: string[];
  smooth: boolean;
  histogram: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  sections: Section[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Section {
  id: string;
  title: string;
  type: 'fractal' | 'text' | 'interactive' | 'video';
  content: Record<string, unknown>;
  scenes: Scene[];
}

export interface Scene {
  id: string;
  type: 'mandelbrot' | 'julia' | 'l-system' | 'ifs' | 'attractor';
  params: FractalParams;
  codeRef?: string;
  duration?: number;
  animations?: Animation[];
}

export interface Animation {
  id: string;
  property: string;
  keyframes: Keyframe[];
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface Keyframe {
  time: number;
  value: number | string | boolean;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  sceneId: string;
  params: FractalParams;
  owner: string;
  public: boolean;
  createdAt: Date;
}

export interface RenderJob {
  id: string;
  sceneId: string;
  params: FractalParams;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  outputUrl?: string;
  progress: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultQuality: 'draft' | 'normal' | 'high' | 'ultra';
  autoPlay: boolean;
  showMath: boolean;
  notifications: boolean;
}

export interface WebGPUCapabilities {
  supported: boolean;
  features: string[];
  limits: Record<string, number>;
}

export interface RenderStats {
  fps: number;
  renderTime: number;
  iterations: number;
  pixelsProcessed: number;
}
