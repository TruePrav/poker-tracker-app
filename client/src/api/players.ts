import api from './client';
import type { Player, CreatePlayerDTO } from 'shared';

export const fetchPlayers = () => api.get<Player[]>('/players').then((r) => r.data);
export const fetchPlayer = (id: number) => api.get<Player>(`/players/${id}`).then((r) => r.data);
export const createPlayer = (data: CreatePlayerDTO) => api.post<Player>('/players', data).then((r) => r.data);
export const updatePlayer = (id: number, data: Partial<CreatePlayerDTO>) => api.patch<Player>(`/players/${id}`, data).then((r) => r.data);
export const deletePlayer = (id: number) => api.delete(`/players/${id}`);
