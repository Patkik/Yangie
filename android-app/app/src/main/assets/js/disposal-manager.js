/**
 * disposal-manager.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Kiro's Cosmic Haven — Unified Resource Deallocation & VRAM Disposal Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Tracks, manages, and atomically disposes Three.js WebGL objects (geometries,
 * materials, textures, render targets) and DOM event listeners. Eliminates
 * VRAM and heap retention across scenes, minigames, and view transitions.
 */

export class DisposalManager {
  constructor() {
    this.geometries = new Set();
    this.materials = new Set();
    this.textures = new Set();
    this.renderTargets = new Set();
    this.eventListeners = [];
    this.moduleRegistry = new Map(); // moduleName -> Set of objects
    this.isDisposed = false;
  }

  /**
   * Automatically inspects and tracks a Three.js resource or object hierarchy
   * @param {any} resource 
   * @param {string} [moduleName='global']
   */
  track(resource, moduleName = 'global') {
    if (!resource) return resource;

    if (!this.moduleRegistry.has(moduleName)) {
      this.moduleRegistry.set(moduleName, new Set());
    }
    const moduleSet = this.moduleRegistry.get(moduleName);

    if (resource.isBufferGeometry || resource.type?.includes('Geometry')) {
      this.geometries.add(resource);
      moduleSet.add(resource);
    } else if (resource.isMaterial || resource.type?.includes('Material')) {
      this.materials.add(resource);
      moduleSet.add(resource);
      // Also track embedded textures if any
      for (const key of Object.keys(resource)) {
        const val = resource[key];
        if (val && (val.isTexture || val.type?.includes('Texture'))) {
          this.track(val, moduleName);
        }
      }
    } else if (resource.isTexture || resource.type?.includes('Texture')) {
      this.textures.add(resource);
      moduleSet.add(resource);
    } else if (resource.isWebGLRenderTarget) {
      this.renderTargets.add(resource);
      moduleSet.add(resource);
    } else if (resource.isObject3D) {
      // Recursively traverse object trees
      resource.traverse((node) => {
        if (node.geometry) this.track(node.geometry, moduleName);
        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach((mat) => this.track(mat, moduleName));
          } else {
            this.track(node.material, moduleName);
          }
        }
      });
      moduleSet.add(resource);
    }

    return resource;
  }

  /**
   * Tracks a DOM event listener so it can be cleanly detached later
   */
  trackEventListener(target, type, listener, options, moduleName = 'global') {
    if (!target || !type || !listener) return;
    const record = { target, type, listener, options, moduleName };
    this.eventListeners.push(record);
    target.addEventListener(type, listener, options);
    return () => this.untrackEventListener(record);
  }

  untrackEventListener(record) {
    const idx = this.eventListeners.indexOf(record);
    if (idx !== -1) {
      const { target, type, listener, options } = record;
      target.removeEventListener(type, listener, options);
      this.eventListeners.splice(idx, 1);
    }
  }

  /**
   * Safely disposes a specific resource
   */
  dispose(resource) {
    if (!resource) return;

    try {
      if (typeof resource.dispose === 'function') {
        resource.dispose();
      }
    } catch (e) {
      console.warn('[DisposalManager] Error disposing resource:', e);
    }

    this.geometries.delete(resource);
    this.materials.delete(resource);
    this.textures.delete(resource);
    this.renderTargets.delete(resource);

    for (const set of this.moduleRegistry.values()) {
      set.delete(resource);
    }
  }

  /**
   * Atomically disposes all resources registered under a specific module
   * @param {string} moduleName 
   */
  disposeModule(moduleName) {
    if (!this.moduleRegistry.has(moduleName)) return;

    const set = this.moduleRegistry.get(moduleName);
    for (const res of set) {
      this.dispose(res);
    }
    this.moduleRegistry.delete(moduleName);

    // Detach all event listeners bound to this module
    const remainingListeners = [];
    for (const record of this.eventListeners) {
      if (record.moduleName === moduleName) {
        try {
          record.target.removeEventListener(record.type, record.listener, record.options);
        } catch (e) {}
      } else {
        remainingListeners.push(record);
      }
    }
    this.eventListeners = remainingListeners;
  }

  /**
   * Purges all tracked resources and event listeners across the entire engine
   */
  disposeAll() {
    for (const geo of this.geometries) {
      try { geo.dispose(); } catch (e) {}
    }
    for (const mat of this.materials) {
      try { mat.dispose(); } catch (e) {}
    }
    for (const tex of this.textures) {
      try { tex.dispose(); } catch (e) {}
    }
    for (const rt of this.renderTargets) {
      try { rt.dispose(); } catch (e) {}
    }

    this.geometries.clear();
    this.materials.clear();
    this.textures.clear();
    this.renderTargets.clear();
    this.moduleRegistry.clear();

    for (const record of this.eventListeners) {
      try {
        record.target.removeEventListener(record.type, record.listener, record.options);
      } catch (e) {}
    }
    this.eventListeners = [];
    this.isDisposed = true;
  }

  /**
   * Responds to Android ComponentCallbacks2 low memory alerts
   */
  handleLowMemory(level = 80) {
    console.warn(`[DisposalManager] Handling Android low-memory event (level: ${level}). Evicting detached resources.`);
    // Prune unreferenced textures and render targets
    for (const tex of this.textures) {
      if (tex.source && !tex.source.data) {
        this.dispose(tex);
      }
    }
  }

  /**
   * Diagnostic inspection summary for TelemetryHUD and memory leak detection
   */
  getDiagnostics() {
    return {
      geometries: this.geometries.size,
      materials: this.materials.size,
      textures: this.textures.size,
      renderTargets: this.renderTargets.size,
      eventListeners: this.eventListeners.length,
      modulesTracked: this.moduleRegistry.size
    };
  }
}

export const disposalManager = new DisposalManager();

if (typeof window !== 'undefined') {
  window.disposalManager = disposalManager;
}
