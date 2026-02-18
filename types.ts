
export type AppView = 'FEED' | 'STUDIO' | 'ROAST' | 'DETAIL' | 'PROFILE';

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
}

export interface MemeTemplate {
  id: string;
  name: string;
  url: string;
}

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
  timeAgo: string;
  timestamp: number;
  avatarColor: string;
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
