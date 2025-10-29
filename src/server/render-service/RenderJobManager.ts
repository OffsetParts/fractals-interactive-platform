import { RenderJob, FractalParams } from '../../types';

interface QueueJobRequest {
  sceneId: string;
  params: FractalParams;
  priority: 'low' | 'normal' | 'high';
  userId: string;
}

interface JobStatus {
  id: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  progress: number;
  estimatedTimeRemaining?: number;
  outputUrl?: string;
  error?: string;
}

export class RenderJobManager {
  private jobs: Map<string, RenderJob> = new Map();
  private queue: string[] = [];
  private activeJobs: Set<string> = new Set();
  private maxConcurrentJobs = 3;

  async queueJob(request: QueueJobRequest): Promise<RenderJob> {
    const job: RenderJob = {
      id: this.generateJobId(),
      sceneId: request.sceneId,
      params: request.params,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    this.queue.push(job.id);

    // Start processing if we have capacity
    this.processQueue();

    return job;
  }

  async getJob(id: string): Promise<RenderJob | null> {
    return this.jobs.get(id) || null;
  }

  async getJobStatus(id: string): Promise<JobStatus | null> {
    const job = this.jobs.get(id);
    if (!job) return null;

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      estimatedTimeRemaining: this.estimateTimeRemaining(job),
      outputUrl: job.outputUrl,
      error: job.status === 'failed' ? 'Render failed' : undefined
    };
  }

  async cancelJob(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job || job.status === 'completed') {
      return false;
    }

    if (job.status === 'queued') {
      // Remove from queue
      const queueIndex = this.queue.indexOf(id);
      if (queueIndex >= 0) {
        this.queue.splice(queueIndex, 1);
      }
    }

    job.status = 'failed';
    this.activeJobs.delete(id);
    
    return true;
  }

  private async processQueue(): Promise<void> {
    if (this.activeJobs.size >= this.maxConcurrentJobs || this.queue.length === 0) {
      return;
    }

    const jobId = this.queue.shift();
    if (!jobId) return;

    const job = this.jobs.get(jobId);
    if (!job) return;

    this.activeJobs.add(jobId);
    job.status = 'rendering';

    try {
      await this.renderJob(job);
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      job.status = 'failed';
    } finally {
      this.activeJobs.delete(jobId);
      // Process next job in queue
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private async renderJob(job: RenderJob): Promise<void> {
    // Simulate rendering process
    const totalSteps = 10;
    
    for (let step = 0; step < totalSteps; step++) {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      job.progress = Math.round((step + 1) / totalSteps * 100);
      
      // Simulate potential failure
      if (Math.random() < 0.05) { // 5% chance of failure
        throw new Error('Render process failed');
      }
    }

    // Generate output URL (in real implementation, this would be actual rendered content)
    job.outputUrl = `/api/renders/${job.id}/output.png`;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateTimeRemaining(job: RenderJob): number | undefined {
    if (job.status !== 'rendering') return undefined;
    
    const elapsed = Date.now() - job.createdAt.getTime();
    const totalEstimated = elapsed / (job.progress / 100);
    
    return Math.max(0, totalEstimated - elapsed);
  }

  // Admin methods
  async getQueueStatus(): Promise<{
    queueLength: number;
    activeJobs: number;
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
  }> {
    const allJobs = Array.from(this.jobs.values());
    
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs.size,
      totalJobs: allJobs.length,
      completedJobs: allJobs.filter(j => j.status === 'completed').length,
      failedJobs: allJobs.filter(j => j.status === 'failed').length,
    };
  }

  async clearCompletedJobs(): Promise<number> {
    let cleared = 0;
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [id, job] of this.jobs) {
      if (job.status === 'completed' && job.completedAt && job.completedAt.getTime() < cutoffTime) {
        this.jobs.delete(id);
        cleared++;
      }
    }
    
    return cleared;
  }
}