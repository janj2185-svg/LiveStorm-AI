'use client';

import { useCallback, useEffect, useState } from 'react';
import { PostCard, type FeedPost } from '@/components/PostCard';
import { PostComposer } from '@/components/PostComposer';

type FeedViewProps = {
  labels: {
    composePlaceholder: string;
    publish: string;
    empty: string;
    like: string;
    comment: string;
    follow: string;
    commentPlaceholder: string;
    submitComment: string;
  };
};

export function FeedView({ labels }: FeedViewProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/feed');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return (
    <div className="feed">
      <PostComposer
        placeholder={labels.composePlaceholder}
        submitLabel={labels.publish}
        onPosted={loadFeed}
      />
      {loading && <p className="phase-note">{labels.empty}…</p>}
      {!loading && posts.length === 0 && <p className="phase-note">{labels.empty}</p>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} labels={labels} onUpdate={loadFeed} />
      ))}
    </div>
  );
}
