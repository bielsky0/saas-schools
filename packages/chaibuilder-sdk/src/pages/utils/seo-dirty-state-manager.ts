/**
 * SEO Form Dirty State Manager
 * 
 * Manages unsaved changes tracking for SEO forms across different pages and languages.
 * Uses global in-memory state to track dirty state per page and language.
 * Provides methods to track, check, and reset dirty state.
 */

interface SeoFormData {
  [key: string]: any;
}

interface SeoDirtyState {
  initial: SeoFormData;
  current: SeoFormData;
}

class SeoDirectyStateManager {
  private static instance: SeoDirectyStateManager;
  // State is now a nested object: { [pageId: string]: { [language: string]: SeoDirtyState } }
  private state: Record<string, Record<string, SeoDirtyState>> = {};
  
  // Track the current page ID to handle page changes
  private currentPageId: string | null = null;

  private constructor() {}

  static getInstance(): SeoDirectyStateManager {
    if (!SeoDirectyStateManager.instance) {
      SeoDirectyStateManager.instance = new SeoDirectyStateManager();
    }
    return SeoDirectyStateManager.instance;
  }

  /**
   * Initialize form values for a page and language and mark as clean state
   * @param pageId - ID of the current page
   * @param language - Language code (e.g., 'en', 'fr')
   * @param formData - SEO form data to set as initial values
   */
  setInitialValues(pageId: string, language: string, formData: SeoFormData): void {
    if (!this.state[pageId]) {
      this.state[pageId] = {};
    }
    
    this.state[pageId][language] = {
      initial: { ...formData },
      current: { ...formData }
    };
    
    this.currentPageId = pageId;
  }

  /**
   * Update current form values to track changes
   * @param pageId - ID of the current page
   * @param language - Language code
   * @param formData - Current form data
   */
  updateCurrentValues(pageId: string, language: string, formData: SeoFormData): void {
    if (!this.state[pageId] || !this.state[pageId][language]) {
      this.setInitialValues(pageId, language, formData);
      return;
    }
    
    this.state[pageId][language].current = { ...formData };
    this.currentPageId = pageId;
  }

  /**
   * Check if a page and language has unsaved changes
   * @param pageId - ID of the page to check
   * @param language - Language code to check
   * @returns true if there are unsaved changes
   */
  isDirty(pageId: string, language: string): boolean {
    if (!this.state[pageId] || !this.state[pageId][language]) {
      return false;
    }
    
    const pageState = this.state[pageId][language];
    return JSON.stringify(pageState.initial) !== JSON.stringify(pageState.current);
  }

  /**
   * Mark a page and language as clean (no unsaved changes)
   * @param pageId - ID of the page to mark as clean
   * @param language - Language code to mark as clean
   */
  markClean(pageId: string, language: string): void {
    if (this.state[pageId]?.[language]) {
      this.state[pageId][language].initial = { ...this.state[pageId][language].current };
    }
  }

  /**
   * Get initial values for a page and language
   * @param pageId - ID of the page
   * @param language - Language code
   * @returns Initial form values or null if not found
   */
  getInitialValues(pageId: string, language: string): SeoFormData | null {
    return this.state[pageId]?.[language]?.initial || null;
  }

  /**
   * Clear dirty state for a specific page and language
   * @param pageId - ID of the page to clear
   * @param language - Language code to clear (optional, clears all languages if not provided)
   */
  clearLanguage(pageId: string, language?: string): void {
    if (!this.state[pageId]) return;
    
    if (language) {
      delete this.state[pageId][language];
    } else {
      delete this.state[pageId];
    }
  }

  /**
   * Clear all dirty states
   */
  clearAll(): void {
    this.state = {};
    this.currentPageId = null;
  }
  
  /**
   * Clear dirty state when switching pages
   * @param newPageId - ID of the new page being loaded
   */
  onPageChange(newPageId: string): void {
    if (this.currentPageId && this.currentPageId !== newPageId) {
      // Clear the previous page's state if it's different from the new page
      this.clearLanguage(this.currentPageId);
    }
    this.currentPageId = newPageId;
  }
}

// Export singleton instance
export const seoDirectyStateManager = SeoDirectyStateManager.getInstance();
