import { api } from './apiClient';

export const measurementDefinitionsApi = {
  /**
   * Get measurement definitions (filtered by category, active status)
   */
  getDefinitions: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/measurement-definitions${query ? `?${query}` : ''}`);
  },

  /**
   * Create a new custom measurement definition
   */
  createDefinition: (data) => api.post('/measurement-definitions', data),

  /**
   * Update an existing definition
   */
  updateDefinition: (id, data) => api.put(`/measurement-definitions/${id}`, data),

  /**
   * Toggle or set active status
   */
  toggleStatus: (id, isActive) =>
    api.patch(`/measurement-definitions/${id}/status`, { isActive }),

  /**
   * Batch update display orders
   */
  reorderDefinitions: (items) => api.put('/measurement-definitions/reorder', { items }),
};
