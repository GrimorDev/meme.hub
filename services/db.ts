import { MemePost, User, Comment, AdminUser, AdminReport, AdminUserReport, CommunityTemplate, PaginatedPosts, AppNotification, DirectMessage, Conversation } from '../types';

const API_BASE =
  (import.meta as any).env?.VITE_API_URL !== undefined &&
  (import.meta as any).env?.VITE_API_URL !== ''
    ? (import.meta as any).env.VITE_API_URL
    : '/api';

class ApiError extends Error {
  data: Record<string, unknown>;
  constructor(message: string, data: Record<string, unknown>) {
    super(message);
    this.data = data;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Błąd sieci' }));
    throw new ApiError((err as any).error || 'Błąd sieci', err as Record<string, unknown>);
  }
  return res.json() as Promise<T>;
}

class ApiClient {
  async register(userData: {
    username: string;
    email: string;
    password: string;
    avatarColor?: string;
  }): Promise<{ pending: true; email: string; message: string }> {
    return request<{ pending: true; email: string; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(username: string, password: string): Promise<User> {
    return request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async logout(): Promise<void> {
    await request('/auth/logout', { method: 'POST' });
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      return await request<User>('/auth/me');
    } catch {
      return null;
    }
  }

  async getUser(username: string): Promise<User | undefined> {
    try {
      return await request<User>(`/users/${username}`);
    } catch {
      return undefined;
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    try {
      return await request<User>(`/users/id/${id}`);
    } catch {
      return undefined;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      return await request<User>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      return null;
    }
  }

  async getUserStats(
    username: string,
  ): Promise<{ postCount: number; totalLikes: number }> {
    return request(`/users/${username}/stats`);
  }

  async getUserPosts(username: string): Promise<MemePost[]> {
    return request(`/users/${username}/posts`);
  }

  async getPosts(
    sort: 'HOT' | 'FRESH' | 'TOP' | 'NOWE' = 'HOT',
    tag?: string | null,
    q?: string,
    page: number = 1,
  ): Promise<PaginatedPosts> {
    const params = new URLSearchParams({ sort, page: String(page) });
    if (tag) params.set('tag', tag);
    if (q) params.set('q', q);
    return request<PaginatedPosts>(`/posts?${params.toString()}`);
  }

  async getPost(id: string): Promise<MemePost | null> {
    try {
      return await request<MemePost>(`/posts/${id}`);
    } catch {
      return null;
    }
  }

  async createPost(post: {
    url: string;
    caption: string;
    author: string;
    avatarColor: string;
    tags: string[];
    timeAgo: string;
    description?: string;
  }): Promise<MemePost> {
    return request<MemePost>('/posts', {
      method: 'POST',
      body: JSON.stringify(post),
    });
  }

  async deletePost(id: string): Promise<boolean> {
    try {
      await request(`/posts/${id}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  }

  async updatePost(
    id: string,
    updates: Partial<MemePost>,
  ): Promise<MemePost | null> {
    try {
      return await request<MemePost>(`/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      return null;
    }
  }

  async toggleLike(postId: string, _userId: string): Promise<boolean> {
    const result = await request<{ liked: boolean }>(
      `/posts/${postId}/like`,
      { method: 'POST' },
    );
    return result.liked;
  }

  async getComments(postId: string): Promise<Comment[]> {
    return request(`/posts/${postId}/comments`);
  }

  async addComment(comment: {
    postId: string;
    author: string;
    text: string;
    parentId?: string | null;
  }): Promise<Comment> {
    return request<Comment>(`/posts/${comment.postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        text: comment.text,
        parentId: comment.parentId,
      }),
    });
  }

  async toggleCommentLike(
    commentId: string,
    _userId: string,
  ): Promise<boolean> {
    const result = await request<{ liked: boolean }>(
      `/comments/${commentId}/like`,
      { method: 'POST' },
    );
    return result.liked;
  }

  async search(query: string): Promise<{
    posts: MemePost[];
    users: User[];
    tags: string[];
  }> {
    if (!query || query.length < 2) {
      return { posts: [], users: [], tags: [] };
    }
    return request(`/search?q=${encodeURIComponent(query)}`);
  }

  async submitReport(postId: string, reason: string): Promise<void> {
    await request('/admin/reports', {
      method: 'POST',
      body: JSON.stringify({ postId, reason }),
    });
  }

  // Admin
  async adminGetPosts(): Promise<(MemePost & { reportCount: number })[]> {
    return request('/admin/posts');
  }
  async adminGetReports(): Promise<AdminReport[]> {
    return request('/admin/reports');
  }
  async adminGetUsers(): Promise<AdminUser[]> {
    return request('/admin/users');
  }
  async adminDeletePost(id: string): Promise<void> {
    await request(`/admin/posts/${id}`, { method: 'DELETE' });
  }
  async adminDeleteReport(id: string): Promise<void> {
    await request(`/admin/reports/${id}`, { method: 'DELETE' });
  }
  async adminBanUser(id: string): Promise<{ banned: boolean }> {
    return request(`/admin/users/${id}/ban`, { method: 'POST' });
  }
  async adminSetRole(id: string, role: 'user' | 'admin'): Promise<{ role: string }> {
    return request(`/admin/users/${id}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }
  async submitUserReport(targetUserId: string, reason: string): Promise<void> {
    await request('/admin/user-reports', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, reason }),
    });
  }
  async adminGetUserReports(): Promise<AdminUserReport[]> {
    return request('/admin/user-reports');
  }
  async adminDeleteUserReport(id: string): Promise<void> {
    await request(`/admin/user-reports/${id}`, { method: 'DELETE' });
  }
  async adminFeaturePost(id: string): Promise<{ featured: boolean }> {
    return request(`/admin/posts/${id}/feature`, { method: 'POST' });
  }
  async getTopConfig(): Promise<{ topMetric: string; topPeriod: number }> {
    return request('/admin/config');
  }
  async setTopConfig(config: { topMetric: string; topPeriod: number }): Promise<void> {
    await request('/admin/config', { method: 'PUT', body: JSON.stringify(config) });
  }

  // Templates
  async getTemplates(scope: 'public' | 'mine'): Promise<CommunityTemplate[]> {
    return request(`/templates?scope=${scope}`);
  }
  async addTemplate(name: string, url: string, isPublic: boolean): Promise<CommunityTemplate> {
    return request('/templates', {
      method: 'POST',
      body: JSON.stringify({ name, url, isPublic }),
    });
  }
  async deleteTemplate(id: string): Promise<void> {
    await request(`/templates/${id}`, { method: 'DELETE' });
  }
  async toggleTemplatePublic(id: string): Promise<{ isPublic: boolean }> {
    return request(`/templates/${id}/publish`, { method: 'PATCH' });
  }

  // ── Powiadomienia ─────────────────────────────────────────────
  async getNotifications(): Promise<AppNotification[]> {
    try { return await request<AppNotification[]>('/notifications'); }
    catch { return []; }
  }

  async getNotificationUnreadCount(): Promise<number> {
    try {
      const { count } = await request<{ count: number }>('/notifications/unread-count');
      return count;
    } catch { return 0; }
  }

  async markAllNotificationsRead(): Promise<void> {
    try { await request('/notifications/read-all', { method: 'PUT' }); } catch {}
  }

  async markNotificationRead(id: string): Promise<void> {
    try { await request(`/notifications/${id}/read`, { method: 'PUT' }); } catch {}
  }

  // ── Wiadomości prywatne ───────────────────────────────────────
  async getConversations(): Promise<Conversation[]> {
    try { return await request<Conversation[]>('/messages/conversations'); }
    catch { return []; }
  }

  async getMessageUnreadCount(): Promise<number> {
    try {
      const { count } = await request<{ count: number }>('/messages/unread-count');
      return count;
    } catch { return 0; }
  }

  async getMessages(userId: string): Promise<DirectMessage[]> {
    try { return await request<DirectMessage[]>(`/messages/${userId}`); }
    catch { return []; }
  }

  async sendMessage(userId: string, text: string): Promise<DirectMessage> {
    return request<DirectMessage>(`/messages/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async markMessagesRead(userId: string): Promise<void> {
    try { await request(`/messages/${userId}/read`, { method: 'PUT' }); } catch {}
  }

  // ── Zmiana hasła + usunięcie konta ───────────────────────────
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async deleteAccount(): Promise<void> {
    await request('/auth/delete-account', { method: 'DELETE' });
  }

  // ── Weryfikacja email + reset hasła ──────────────────────────
  async verifyEmail(email: string, code: string): Promise<import('../types').User> {
    return request<import('../types').User>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async resendVerification(email: string): Promise<void> {
    await request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email: string): Promise<void> {
    await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyResetCode(email: string, code: string): Promise<void> {
    await request('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<import('../types').User> {
    return request<import('../types').User>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  }

  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload nieudany' }));
      throw new Error((err as any).error || 'Upload nieudany');
    }
    const data = (await res.json()) as { url: string };
    return data.url;
  }
}

export const db = new ApiClient();
