import api from './client';
import type { BlindStructure, BlindLevel } from 'shared';

export const fetchBlindStructures = () =>
  api.get<BlindStructure[]>('/blind-structures').then((r) => r.data);

export const fetchBlindStructure = (id: number) =>
  api.get<BlindStructure>(`/blind-structures/${id}`).then((r) => r.data);

export const createBlindStructure = (name: string, levels: Partial<BlindLevel>[]) =>
  api.post<BlindStructure>('/blind-structures', { name, levels }).then((r) => r.data);

export const updateBlindLevels = (id: number, levels: Partial<BlindLevel>[]) =>
  api.put<BlindStructure>(`/blind-structures/${id}/levels`, { levels }).then((r) => r.data);

export const updateBlindStructureName = (id: number, name: string) =>
  api.patch<BlindStructure>(`/blind-structures/${id}`, { name }).then((r) => r.data);

export const deleteBlindStructure = (id: number) =>
  api.delete(`/blind-structures/${id}`);
