import { Preset } from '../../types';
import fs from 'fs/promises';
import path from 'path';

export class PresetManager {
  private presetsFile = path.join(process.cwd(), 'public', 'presets', 'fractals.json');
  private presets: Map<string, Preset> = new Map();

  constructor() {
    this.loadPresets();
  }

  private async loadPresets(): Promise<void> {
    try {
      const data = await fs.readFile(this.presetsFile, 'utf-8');
      const presetsArray = JSON.parse(data);
      
      for (const preset of presetsArray) {
        this.presets.set(preset.id, {
          ...preset,
          createdAt: new Date(preset.createdAt || Date.now()),
          public: preset.public !== false,
          owner: preset.owner || 'system'
        });
      }
      
      console.log(`Loaded ${this.presets.size} presets`);
    } catch (error) {
      console.error('Error loading presets:', error);
      // Initialize with empty presets if file doesn't exist
      this.presets = new Map();
    }
  }

  private async savePresets(): Promise<void> {
    try {
      const presetsArray = Array.from(this.presets.values());
      await fs.writeFile(this.presetsFile, JSON.stringify(presetsArray, null, 2));
    } catch (error) {
      console.error('Error saving presets:', error);
      throw new Error('Failed to save presets');
    }
  }

  async getPublicPresets(): Promise<Preset[]> {
    return Array.from(this.presets.values())
      .filter(preset => preset.public)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserPresets(userId: string): Promise<Preset[]> {
    return Array.from(this.presets.values())
      .filter(preset => preset.owner === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPreset(id: string): Promise<Preset | null> {
    return this.presets.get(id) || null;
  }

  async createPreset(presetData: Partial<Preset>): Promise<Preset> {
    if (!presetData.name || !presetData.params) {
      throw new Error('Preset name and params are required');
    }

    const preset: Preset = {
      id: this.generatePresetId(),
      name: presetData.name,
      description: presetData.description || '',
      sceneId: presetData.sceneId || `scene_${Date.now()}`,
      params: presetData.params,
      owner: presetData.owner || 'anonymous',
      public: presetData.public || false,
      createdAt: new Date(),
    };

    this.presets.set(preset.id, preset);
    await this.savePresets();

    return preset;
  }

  async updatePreset(id: string, updates: Partial<Preset>): Promise<Preset | null> {
    const existing = this.presets.get(id);
    if (!existing) {
      return null;
    }

    const updated: Preset = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      createdAt: existing.createdAt, // Preserve creation date
    };

    this.presets.set(id, updated);
    await this.savePresets();

    return updated;
  }

  async deletePreset(id: string, userId?: string): Promise<boolean> {
    const preset = this.presets.get(id);
    if (!preset) {
      return false;
    }

    // Only allow deletion by owner or admin
    if (userId && preset.owner !== userId && userId !== 'admin') {
      throw new Error('Unauthorized to delete this preset');
    }

    this.presets.delete(id);
    await this.savePresets();

    return true;
  }

  async searchPresets(query: string, includePrivate = false): Promise<Preset[]> {
    const searchTerm = query.toLowerCase();
    
    return Array.from(this.presets.values())
      .filter(preset => {
        if (!includePrivate && !preset.public) {
          return false;
        }
        
        return preset.name.toLowerCase().includes(searchTerm) ||
               preset.description.toLowerCase().includes(searchTerm) ||
               preset.sceneId.toLowerCase().includes(searchTerm);
      })
      .sort((a, b) => {
        // Prioritize name matches over description matches
        const aNameMatch = a.name.toLowerCase().includes(searchTerm);
        const bNameMatch = b.name.toLowerCase().includes(searchTerm);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  async getPresetsByType(type: string): Promise<Preset[]> {
    return Array.from(this.presets.values())
      .filter(preset => preset.sceneId.includes(type) || 
                       (preset.params as any).type === type)
      .filter(preset => preset.public)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private generatePresetId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Admin methods
  async getStats(): Promise<{
    totalPresets: number;
    publicPresets: number;
    privatePresets: number;
    presetsByOwner: Record<string, number>;
  }> {
    const allPresets = Array.from(this.presets.values());
    const presetsByOwner: Record<string, number> = {};
    
    for (const preset of allPresets) {
      presetsByOwner[preset.owner] = (presetsByOwner[preset.owner] || 0) + 1;
    }
    
    return {
      totalPresets: allPresets.length,
      publicPresets: allPresets.filter(p => p.public).length,
      privatePresets: allPresets.filter(p => !p.public).length,
      presetsByOwner,
    };
  }

  async exportPresets(): Promise<string> {
    const allPresets = Array.from(this.presets.values());
    return JSON.stringify(allPresets, null, 2);
  }

  async importPresets(presetsJson: string, overwrite = false): Promise<number> {
    try {
      const importedPresets = JSON.parse(presetsJson);
      let imported = 0;
      
      for (const preset of importedPresets) {
        if (!overwrite && this.presets.has(preset.id)) {
          continue; // Skip existing presets if not overwriting
        }
        
        this.presets.set(preset.id, {
          ...preset,
          createdAt: new Date(preset.createdAt),
        });
        imported++;
      }
      
      await this.savePresets();
      return imported;
    } catch (error) {
      console.error('Error importing presets:', error);
      throw new Error('Invalid presets JSON format');
    }
  }
}