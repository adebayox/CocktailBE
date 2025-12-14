/**
 * Image Generation Job Queue using Bull
 * 
 * This provides reliable background processing for image generation.
 * For this to work, you need:
 * 1. Install Bull: npm install bull ioredis
 * 2. Have Redis running (locally or via Redis Cloud, etc.)
 * 3. Set REDIS_URL in your .env file
 * 
 * If Redis is not available, this falls back to simple in-memory processing.
 */

let Queue;
let imageQueue = null;
let isQueueEnabled = false;

// Try to load Bull - if not installed, we'll use a fallback
try {
  Queue = require('bull');
  isQueueEnabled = !!process.env.REDIS_URL;
} catch (error) {
  console.log('[Queue] Bull not installed - using in-memory fallback');
  isQueueEnabled = false;
}

// In-memory job tracking for fallback mode
const inMemoryJobs = new Map();
let jobIdCounter = 0;

/**
 * Initialize the queue if Redis is available
 */
const initializeQueue = () => {
  if (!isQueueEnabled || !Queue) {
    console.log('[Queue] Running in fallback mode (no Redis)');
    return null;
  }

  try {
    imageQueue = new Queue('image-generation', process.env.REDIS_URL, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50       // Keep last 50 failed jobs
      }
    });

    // Event handlers
    imageQueue.on('completed', (job, result) => {
      console.log(`[Queue] Job ${job.id} completed for cocktail: ${job.data.recipe.name}`);
    });

    imageQueue.on('failed', (job, err) => {
      console.error(`[Queue] Job ${job.id} failed:`, err.message);
    });

    imageQueue.on('error', (error) => {
      console.error('[Queue] Queue error:', error);
    });

    console.log('[Queue] Bull queue initialized with Redis');
    return imageQueue;
  } catch (error) {
    console.error('[Queue] Failed to initialize Bull queue:', error);
    isQueueEnabled = false;
    return null;
  }
};

/**
 * Add an image generation job to the queue
 * @param {Object} recipe - The recipe object
 * @returns {Promise<Object>} - Job info
 */
const queueImageGeneration = async (recipe) => {
  if (isQueueEnabled && imageQueue) {
    // Use Bull queue
    const job = await imageQueue.add('generate-image', { recipe }, {
      priority: 1,
      attempts: 3
    });

    console.log(`[Queue] Added job ${job.id} for: ${recipe.name}`);
    return { jobId: job.id, queued: true };
  } else {
    // Fallback: Track in memory and process immediately
    const jobId = `mem-${++jobIdCounter}`;
    inMemoryJobs.set(jobId, { 
      recipe, 
      status: 'pending',
      createdAt: new Date()
    });

    console.log(`[Queue] Added in-memory job ${jobId} for: ${recipe.name}`);
    return { jobId, queued: false, inMemory: true };
  }
};

/**
 * Get job status
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} - Job status
 */
const getJobStatus = async (jobId) => {
  if (isQueueEnabled && imageQueue && !jobId.startsWith('mem-')) {
    const job = await imageQueue.getJob(jobId);
    if (!job) return { status: 'not_found' };

    const state = await job.getState();
    return {
      id: job.id,
      status: state,
      progress: job.progress(),
      data: job.data,
      failedReason: job.failedReason
    };
  } else {
    // In-memory fallback
    const job = inMemoryJobs.get(jobId);
    if (!job) return { status: 'not_found' };
    return { id: jobId, ...job };
  }
};

/**
 * Get queue statistics
 * @returns {Promise<Object>} - Queue stats
 */
const getQueueStats = async () => {
  if (isQueueEnabled && imageQueue) {
    const [waiting, active, completed, failed] = await Promise.all([
      imageQueue.getWaitingCount(),
      imageQueue.getActiveCount(),
      imageQueue.getCompletedCount(),
      imageQueue.getFailedCount()
    ]);

    return {
      enabled: true,
      type: 'bull',
      waiting,
      active,
      completed,
      failed
    };
  } else {
    // In-memory stats
    let pending = 0, processing = 0, done = 0, failed = 0;
    for (const job of inMemoryJobs.values()) {
      if (job.status === 'pending') pending++;
      else if (job.status === 'processing') processing++;
      else if (job.status === 'complete') done++;
      else if (job.status === 'failed') failed++;
    }

    return {
      enabled: false,
      type: 'in-memory',
      waiting: pending,
      active: processing,
      completed: done,
      failed
    };
  }
};

/**
 * Set up queue processor (call this in your worker or main app)
 * @param {Function} processor - The function to process jobs
 */
const setupProcessor = (processor) => {
  if (isQueueEnabled && imageQueue) {
    imageQueue.process('generate-image', async (job) => {
      console.log(`[Queue] Processing job ${job.id}`);
      job.progress(10);

      const result = await processor(job.data.recipe);
      
      job.progress(100);
      return result;
    });

    console.log('[Queue] Processor registered');
  }
};

/**
 * Process in-memory job (for fallback mode)
 * Call this after adding a job in fallback mode
 * @param {string} jobId - The job ID
 * @param {Function} processor - The function to process the job
 */
const processInMemoryJob = async (jobId, processor) => {
  const job = inMemoryJobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  try {
    await processor(job.recipe);
    job.status = 'complete';
    job.completedAt = new Date();
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    job.failedAt = new Date();
  }
};

/**
 * Graceful shutdown
 */
const shutdown = async () => {
  if (imageQueue) {
    await imageQueue.close();
    console.log('[Queue] Queue closed');
  }
};

module.exports = {
  initializeQueue,
  queueImageGeneration,
  getJobStatus,
  getQueueStats,
  setupProcessor,
  processInMemoryJob,
  shutdown,
  isQueueEnabled: () => isQueueEnabled
};

