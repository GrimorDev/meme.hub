export function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Teraz';
  if (minutes < 60) return `${minutes}m temu`;
  if (hours < 24) return `${hours}h temu`;
  return `${days}d temu`;
}

export function formatPost(post: any, currentUserId?: string) {
  return {
    id: post.id,
    url: post.url,
    caption: post.caption,
    description: post.description ?? undefined,
    author: post.author.username,
    authorId: post.author.id,
    authorRole: post.author.role ?? 'user',
    avatarColor: post.author.avatarColor,
    avatarUrl: post.author.avatarUrl ?? undefined,
    timeAgo: formatTimeAgo(post.createdAt),
    timestamp: post.createdAt.getTime(),
    likes: post._count.likes,
    commentsCount: post._count.comments,
    tags: post.tags.map((pt: any) => pt.tag.name),
    likedBy: post.likes.map((l: any) => l.userId),
  };
}

export function formatUser(user: any) {
  const { password, ...rest } = user;
  return {
    ...rest,
    settings:
      typeof rest.settings === 'string'
        ? JSON.parse(rest.settings)
        : rest.settings,
  };
}
