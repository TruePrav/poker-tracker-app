import api from './client';

export interface Announcement {
  id: number;
  tournamentId: number;
  kind: 'TTS' | 'AUDIO';
  text: string | null;
  audioKey: string | null;
  createdAt: string;
  playedAt: string | null;
}

export const fetchPendingAnnouncements = (tournamentId: number) =>
  api.get<Announcement[]>(`/tournaments/${tournamentId}/announcements/pending`).then((r) => r.data);

export const queueSpeech = (tournamentId: number, text: string) =>
  api
    .post<Announcement>(`/tournaments/${tournamentId}/announcements`, { kind: 'TTS', text })
    .then((r) => r.data);

export const queueClip = (tournamentId: number, audioKey: string) =>
  api
    .post<Announcement>(`/tournaments/${tournamentId}/announcements`, { kind: 'AUDIO', audioKey })
    .then((r) => r.data);

export const markAnnouncementPlayed = (tournamentId: number, announcementId: number) =>
  api.post(`/tournaments/${tournamentId}/announcements/${announcementId}/played`);

export const clearPendingAnnouncements = (tournamentId: number) =>
  api
    .delete<{ clearedCount: number }>(`/tournaments/${tournamentId}/announcements/pending`)
    .then((r) => r.data);
