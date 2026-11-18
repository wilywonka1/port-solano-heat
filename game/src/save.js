// localStorage persistence for Solano Heat.
import { SAVE_KEY } from './config.js';
export function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
export function writeSave(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
