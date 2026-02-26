
export type AppView = 'FEED' | 'STUDIO' | 'ROAST' | 'DETAIL' | 'PROFILE' | 'ADMIN' | 'DOWNLOADS' | 'MESSAGES' | 'SETTINGS';

export type SliderMode = 'SIMPLE' | 'RUNNER' | 'GRAVITY' | 'MATH' | 'VOICE' | 'DICE' | 'SHAKE';

export interface UserSettings {
  defaultSort: 'HOT' | 'TOP' | 'NOWE';
  accentColor: 'purple' | 'green' | 'orange' | 'blue';
  hideLikeCounts: boolean;
  showJoinDate: boolean;
  enableNotifications: boolean;
}

export interface MemeSubcategory {
  id: string;
  label: string;
}

export interface MemeCategoryType {
  id: string;
  label: string;
  emoji: string;
  subcategories: MemeSubcategory[];
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
  usernameChangedAt?: string | null;
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

export const MEME_CATEGORIES: MemeCategoryType[] = [
  {
    id: 'humor', label: 'Humor', emoji: '😂',
    subcategories: [
      { id: 'humor-obrazkowy', label: 'Obrazkowy' },
      { id: 'humor-czarny', label: 'Czarny humor' },
      { id: 'humor-absurd', label: 'Absurd' },
      { id: 'humor-relatable', label: 'Relatable' },
    ],
  },
  {
    id: 'filmy', label: 'Filmy', emoji: '🎬',
    subcategories: [
      { id: 'filmy-akcja', label: 'Akcja' },
      { id: 'filmy-horror', label: 'Horror' },
      { id: 'filmy-anime', label: 'Anime' },
      { id: 'filmy-seriale', label: 'Seriale' },
    ],
  },
  {
    id: 'gry', label: 'Gry', emoji: '🎮',
    subcategories: [
      { id: 'gry-pc', label: 'PC' },
      { id: 'gry-konsole', label: 'Konsole' },
      { id: 'gry-mobile', label: 'Mobile' },
      { id: 'gry-retro', label: 'Retro' },
    ],
  },
  {
    id: 'polityka', label: 'Polityka', emoji: '🏛️',
    subcategories: [
      { id: 'polityka-polska', label: 'Polska' },
      { id: 'polityka-swiat', label: 'Świat' },
      { id: 'polityka-memy', label: 'Memy polityczne' },
    ],
  },
  {
    id: 'sport', label: 'Sport', emoji: '⚽',
    subcategories: [
      { id: 'sport-pilka', label: 'Piłka nożna' },
      { id: 'sport-koszykowka', label: 'Koszykówka' },
      { id: 'sport-esport', label: 'Esport' },
      { id: 'sport-inne', label: 'Inne sporty' },
    ],
  },
  {
    id: 'wypadki', label: 'Wypadki', emoji: '💥',
    subcategories: [
      { id: 'wypadki-epicki', label: 'Epickie faile' },
      { id: 'wypadki-codzienne', label: 'Codzienne' },
    ],
  },
  {
    id: 'zwierzeta', label: 'Zwierzęta', emoji: '🐾',
    subcategories: [
      { id: 'zwierzeta-psy', label: 'Psy' },
      { id: 'zwierzeta-koty', label: 'Koty' },
      { id: 'zwierzeta-inne', label: 'Inne' },
    ],
  },
  {
    id: 'technologia', label: 'Technologia', emoji: '💻',
    subcategories: [
      { id: 'technologia-ai', label: 'AI' },
      { id: 'technologia-programowanie', label: 'Programowanie' },
      { id: 'technologia-gadgety', label: 'Gadżety' },
      { id: 'technologia-it', label: 'Memy IT' },
    ],
  },
  {
    id: 'szkola', label: 'Szkoła', emoji: '📚',
    subcategories: [
      { id: 'szkola-podstawowa', label: 'Podstawówka' },
      { id: 'szkola-liceum', label: 'Liceum' },
      { id: 'szkola-studia', label: 'Studia' },
    ],
  },
  {
    id: 'praca', label: 'Praca', emoji: '💼',
    subcategories: [
      { id: 'praca-biuro', label: 'Biuro' },
      { id: 'praca-zdalna', label: 'Zdalna' },
      { id: 'praca-szef', label: 'Szef vs pracownik' },
    ],
  },
  {
    id: 'relacje', label: 'Relacje', emoji: '❤️',
    subcategories: [
      { id: 'relacje-zwiazki', label: 'Związki' },
      { id: 'relacje-rodzina', label: 'Rodzina' },
      { id: 'relacje-przyjaciele', label: 'Przyjaciele' },
    ],
  },
  {
    id: 'random', label: 'Random', emoji: '🎲',
    subcategories: [
      { id: 'random-cringe', label: 'Cringe' },
      { id: 'random-nostalgia', label: 'Nostalgia' },
      { id: 'random-inne', label: 'Inne' },
    ],
  },
];

export interface Comment {
  id: string;
  postId: string;
  author: string;
  authorAvatarColor?: string;
  authorAvatarUrl?: string;
  text: string;
  imageUrl?: string;
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
  featured?: boolean;
  isNsfw?: boolean;
  isSaved?: boolean;
}

export interface PaginatedPosts {
  posts: MemePost[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AppNotification {
  id: string;
  type: 'comment' | 'reply' | 'featured' | 'message';
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderUsername: string;
  senderAvatarColor: string;
  senderAvatarUrl?: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  userId: string;
  username: string;
  avatarColor: string;
  avatarUrl?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface AdminStats {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  totalPosts: number;
  newPosts7d: number;
  newPosts1d: number;
  totalComments: number;
  newComments7d: number;
  totalLikes: number;
  pendingPosts: number;
  bannedUsers: number;
  registrationsChart: { day: string; count: number }[];
  postsChart: { day: string; count: number }[];
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
