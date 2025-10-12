// Centralized Loading Overlay Component
// Renders a loading overlay as a DIV (not inside the SVG), with dots layered behind the text
// Renewed implementation - supports per-dashboard instances

/**
 * Resolve the container element for the loading overlay
 * @param {Object} svgSelection - D3 selection or DOM element (the SVG)
 * @returns {HTMLElement} The parent element of the SVG
 */
function resolveLoadingContainer(svgSelection) {
  const svgNode = svgSelection && svgSelection.node ? svgSelection.node() : svgSelection;
  
  if (!svgNode || !svgNode.parentElement) {
    console.error('❌ resolveLoadingContainer() - SVG or its parent element not found');
    throw new Error('Loading overlay requires SVG with a parent element');
  }
  
  console.log('🎯 resolveLoadingContainer() - Using SVG parent element:', svgNode.parentElement);
  return svgNode.parentElement;
}

/**
 * LoadingOverlay class for per-dashboard loading overlay instances
 * Each dashboard creates its own overlay instance
 */
export class LoadingOverlay {
  constructor(hostElement) {
    this.hostElement = hostElement;
    this.el = null;
    this.dotsEl = null;
    this.textEl = null;
    this.timerEl = null;
    this.stageHistoryEl = null;
    this.timer = null;
    this.displayTimer = null;
    this.baseText = 'initializing';
    this.shownAt = 0;
    this.totalStartTime = 0;
    this.stageStartTime = 0;
    this.currentStage = 'initializing';
    this.stageHistory = [];
    this.MIN_VISIBLE_MS = 2000; // Updated to 2 seconds as per requirements
    this.containerCreated = false;
  }
  
  /**
   * Create overlay container within the host element
   */
  createContainer() {
    if (!this.hostElement) {
      console.warn('⚠️ LoadingOverlay.createContainer() - No host element');
      return null;
    }
    
    console.log('🔧 LoadingOverlay.createContainer() - Creating overlay container in host:', this.hostElement);
    
    // Ensure host has position: relative for absolute positioning
    try {
      const cs = window.getComputedStyle ? window.getComputedStyle(this.hostElement) : null;
      if (cs && cs.position === 'static') {
        this.hostElement.style.position = 'relative';
      }
    } catch {}
    
    // Create overlay container
    const container = document.createElement('div');
    container.className = 'flowdash-loading-container';
    container.style.position = 'absolute';
    container.style.inset = '0';
    container.style.pointerEvents = 'none'; // Allow clicks through container
    container.style.zIndex = '20000';
    
    this.hostElement.appendChild(container);
    this.containerCreated = true;
    
    return container;
  }
  
  /**
   * Remove overlay container
   */
  removeContainer() {
    if (this.el && this.el.parentElement) {
      this.el.parentElement.remove();
      this.containerCreated = false;
    }
  }

  /**
   * Ensure overlay elements exist
   * Creates them if needed
   * @returns {HTMLElement} The overlay element
   */
  ensure() {
    if (!this.hostElement) {
      console.warn('⚠️ LoadingOverlay.ensure() - No host element');
      return null;
    }
    
    // Create container if needed
    if (!this.containerCreated) {
      this.createContainer();
    }
    
    // Create overlay element if needed
    if (!this.el && this.hostElement) {
      const container = this.hostElement.querySelector('.flowdash-loading-container');
      if (!container) {
        console.warn('⚠️ LoadingOverlay.ensure() - No container found');
        return null;
      }
      
      const wrapper = document.createElement('div');
      wrapper.id = 'flowdash-loading';
      wrapper.className = 'flowdash-loading';
      wrapper.setAttribute('role', 'status');
      wrapper.setAttribute('aria-live', 'polite');
      wrapper.style.pointerEvents = 'auto'; // Modal mode

      const text = document.createElement('span');
      text.className = 'flowdash-loading__text';
      text.textContent = 'initializing';

      const dots = document.createElement('span');
      dots.className = 'flowdash-loading__dots';

      const timer = document.createElement('span');
      timer.className = 'flowdash-loading__timer';
      timer.textContent = '';

      const stageHistory = document.createElement('div');
      stageHistory.className = 'flowdash-loading__history';
      stageHistory.textContent = '';

      wrapper.appendChild(text);
      wrapper.appendChild(dots);
      wrapper.appendChild(timer);
      wrapper.appendChild(stageHistory);
      
      container.appendChild(wrapper);

      this.el = wrapper;
      this.dotsEl = dots;
      this.textEl = text;
      this.timerEl = timer;
      this.stageHistoryEl = stageHistory;
      
      console.log('🔧 LoadingOverlay.ensure() - Created overlay element');
    }
    
    return this.el;
  }

  /**
   * Start animated dots
   */
  startDots() {
    this.stopDots();
    let i = 0;
    this.timer = setInterval(() => {
      if (!this.dotsEl) return;
      i = (i + 1) % 4;
      this.dotsEl.textContent = i === 0 ? '' : Array.from({ length: i }).map(() => '.').join(' ');
    }, 450);
  }

  /**
   * Stop animated dots
   */
  stopDots() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.dotsEl) {
      this.dotsEl.textContent = '';
    }
  }

  /**
   * Start display timer
   */
  startDisplayTimer() {
    this.stopDisplayTimer();
    this.displayTimer = setInterval(() => {
      this.updateTimerDisplay();
    }, 100);
  }

  /**
   * Stop display timer
   */
  stopDisplayTimer() {
    if (this.displayTimer) {
      clearInterval(this.displayTimer);
      this.displayTimer = null;
    }
  }

  /**
   * Update timer display
   */
  updateTimerDisplay() {
    if (!this.timerEl || !this.totalStartTime) return;
    
    const now = Date.now();
    const totalMs = now - this.totalStartTime;
    const stageMs = now - this.stageStartTime;
    
    const formatTime = (ms) => {
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(1)}s`;
    };
    
    let timerText = '';
    if (stageMs === totalMs) {
      timerText = `(${formatTime(totalMs)})`;
    } else {
      timerText = `(${formatTime(stageMs)} / ${formatTime(totalMs)})`;
    }
    
    this.timerEl.textContent = timerText;
    
    // Update ARIA for accessibility
    if (this.el) {
      this.el.setAttribute('aria-label', `Loading: ${this.baseText} ${timerText}`);
    }
  }

  /**
   * Set loading stage
   * @param {string} stageName - Name of the stage
   */
  setLoadingStage(stageName) {
    const now = Date.now();
    
    if (this.currentStage && this.stageStartTime) {
      const stageDuration = now - this.stageStartTime;
      const totalDuration = now - this.totalStartTime;
      console.log(`⏱️ Stage "${this.currentStage}" completed in ${stageDuration}ms (total: ${totalDuration}ms)`);
      
      this.stageHistory.push({
        name: this.currentStage,
        duration: stageDuration,
        endTime: now
      });
      
      requestAnimationFrame(() => {
        this.updateStageHistoryDisplay();
      });
    }
    
    this.currentStage = stageName;
    this.stageStartTime = now;
    console.log(`⏱️ Starting stage "${stageName}"`);
    
    if (this.textEl) {
      this.textEl.textContent = stageName;
    }
    this.baseText = stageName;
    
    if (this.el) {
      this.el.setAttribute('aria-label', `Loading: ${stageName}`);
    }
  }

  /**
   * Set progress message
   * @param {string} progressMessage - Progress message (e.g., "5 / 20 nodes")
   */
  setProgress(progressMessage) {
    if (!progressMessage) return;
    
    const message = `${this.currentStage} (${progressMessage})`;
    if (this.textEl) {
      this.textEl.textContent = message;
    }
    
    console.log(`📊 Progress: ${progressMessage}`);
    
    if (this.el) {
      this.el.setAttribute('aria-label', `Loading: ${message}`);
    }
  }

  /**
   * Set loading message
   * @param {string} message - Message to display
   */
  setLoadingMessage(message) {
    if (this.textEl) {
      this.textEl.textContent = message;
    }
    this.baseText = message;
    
    if (this.el) {
      this.el.setAttribute('aria-label', `Loading: ${message}`);
    }
  }

  /**
   * Update stage history display
   */
  updateStageHistoryDisplay() {
    if (!this.stageHistoryEl) return;
    
    const formatTime = (ms) => {
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(1)}s`;
    };
    
    const historyHtml = this.stageHistory.map(stage => 
      `<div class="stage-entry">${stage.name} - ${formatTime(stage.duration)}</div>`
    ).join('');
    
    this.stageHistoryEl.innerHTML = historyHtml;
  }

  /**
   * Show loading overlay
   */
  showLoading() {
    console.log('🔵 LoadingOverlay.showLoading() called');
    
    const el = this.ensure();
    if (!el) {
      console.warn('⚠️ LoadingOverlay.showLoading() - No element created');
      return;
    }
    
    const now = Date.now();
    this.shownAt = now;
    
    if (!this.totalStartTime) {
      this.totalStartTime = now;
      this.stageStartTime = now;
      this.currentStage = this.baseText;
      this.stageHistory = [];
      console.log('⏱️ LoadingOverlay.showLoading() - Starting total timer');
    }
    
    // Show container
    const container = this.hostElement.querySelector('.flowdash-loading-container');
    if (container) {
      container.style.display = 'block';
      container.style.pointerEvents = 'auto'; // Modal mode
    }
    
    el.style.display = 'flex';
    
    if (this.textEl) {
      this.textEl.textContent = this.baseText;
    }
    
    this.startDots();
    this.startDisplayTimer();
    
    if (this.el) {
      this.el.setAttribute('aria-label', `Loading: ${this.baseText}`);
    }
    
    console.log('🔵 LoadingOverlay.showLoading() - Complete');
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    console.log('🔴 LoadingOverlay.hideLoading() called');
    
    if (!this.el) {
      console.warn('⚠️ LoadingOverlay.hideLoading() - No element to hide');
      return;
    }
    
    const elapsed = Date.now() - this.shownAt;
    const delay = Math.max(0, this.MIN_VISIBLE_MS - elapsed);
    console.log('🔴 LoadingOverlay.hideLoading() - Elapsed:', elapsed, 'ms, delay:', delay, 'ms');
    
    setTimeout(() => {
      if (!this.el) return;
      
      if (this.totalStartTime) {
        const now = Date.now();
        const totalDuration = now - this.totalStartTime;
        const stageDuration = now - this.stageStartTime;
        console.log(`⏱️ Final stage "${this.currentStage}" completed in ${stageDuration}ms`);
        console.log(`⏱️ Total loading duration: ${totalDuration}ms`);
        
        this.stageHistory.push({
          name: this.currentStage,
          duration: stageDuration,
          endTime: now
        });
        
        this.totalStartTime = 0;
        this.stageStartTime = 0;
        this.currentStage = 'initializing';
      }
      
      console.log('🔴 LoadingOverlay.hideLoading() timeout - Hiding overlay');
      
      // Hide container
      const container = this.hostElement.querySelector('.flowdash-loading-container');
      if (container) {
        container.style.display = 'none';
        container.style.pointerEvents = 'none';
      }
      
      this.el.style.display = 'none';
      
      this.stopDots();
      this.stopDisplayTimer();
      
      if (this.timerEl) this.timerEl.textContent = '';
      if (this.stageHistoryEl) this.stageHistoryEl.innerHTML = '';
      
      console.log('🔴 LoadingOverlay.hideLoading() timeout - Complete');
    }, delay);
  }

}

export { resolveLoadingContainer };


