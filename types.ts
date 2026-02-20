
export type AppView = 'FEED' | 'STUDIO' | 'ROAST' | 'DETAIL' | 'PROFILE' | 'ADMIN';

export type SliderMode = 'SIMPLE' | 'RUNNER' | 'GRAVITY' | 'MATH' | 'VOICE' | 'DICE' | 'SHAKE';

export interface UserSettings {
  defaultSort: 'HOT' | 'FRESH' | 'TOP';
  accentColor: 'purple' | 'green' | 'orange' | 'blue';
  hideLikeCounts: boolean;
  showJoinDate: boolean;
  enableNotifications: boolean;
}

export interface User {
  id: string;
  username: string;
  avatarColor: string;
  avatarUrl?: string;
  bannerUrl?: string;
  description?: string;
  password?: string;
  email?: string;
  settings?: UserSettings;
  createdAt?: string;
  role?: 'user' | 'admin';
  banned?: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  banned: boolean;
  avatarColor: string;
  avatarUrl?: string;
  createdAt: string;
  _count: { posts: number };
}

export interface AdminReport {
  id: string;
  reason: string;
  createdAt: string;
  reporter: string;
  post: MemePost & { reportCount?: number };
}

export interface AdminUserReport {
  id: string;
  reason: string;
  createdAt: string;
  reporter: string;
  targetUser: {
    id: string;
    username: string;
    avatarColor: string;
    avatarUrl?: string;
    role: string;
    banned: boolean;
  };
}

export interface MemeTemplate {
  id: string;
  name: string;
  url: string;
}

export interface CommunityTemplate {
  id: string;
  name: string;
  url: string;
  isPublic: boolean;
  createdAt: string;
  uploader: { username: string; avatarColor: string; avatarUrl?: string };
}

export const MEME_CATEGORIES = [
  { id: 'humor', label: 'Humor', emoji: '😂' },
  { id: 'filmy', label: 'Filmy', emoji: '🎬' },
  { id: 'gry', label: 'Gry', emoji: '🎮' },
  { id: 'polityka', label: 'Polityka', emoji: '🏛️' },
  { id: 'sport', label: 'Sport', emoji: '⚽' },
  { id: 'wypadki', label: 'Wypadki', emoji: '💥' },
  { id: 'zwierzeta', label: 'Zwierzęta', emoji: '🐾' },
  { id: 'technologia', label: 'Technologia', emoji: '💻' },
  { id: 'szkola', label: 'Szkoła', emoji: '📚' },
  { id: 'praca', label: 'Praca', emoji: '💼' },
  { id: 'relacje', label: 'Relacje', emoji: '❤️' },
  { id: 'random', label: 'Random', emoji: '🎲' },
] as const;

export interface Comment {
  id: string;
  postId: string;
  author: string;
  text: string;
  timeAgo: string;
  timestamp: number;
  likes: number;
  likedBy?: string[];
  parentId?: string | null;
}

export interface MemePost {
  id: string;
  url: string;
  caption: string;
  likes: number;
  commentsCount: number;
  author: string;
  authorId?: string;
  authorRole?: 'user' | 'admin';
  timeAgo: string;
  timestamp: number;
  avatarColor: string;
  avatarUrl?: string;
  tags?: string[];
  description?: string;
  likedBy?: string[];
}

export interface MemeTextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  outlineColor: string;
  outlineWidth: number;
  width: number;
  fontFamily: string;
  isBold: boolean;
}
