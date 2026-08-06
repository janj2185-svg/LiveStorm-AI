'use client';

import { useState } from 'react';

export type FeedPost = {
  id: string;
  body: string;
  author: { id: string; handle: string; display_name: string };
  reaction_count: number;
  comment_count: number;
  viewer_reacted: boolean;
  created_at: string;
};

type PostCardProps = {
  post: FeedPost;
  labels: {
    like: string;
    comment: string;
    follow: string;
    commentPlaceholder: string;
    submitComment: string;
  };
  onUpdate: () => void;
};

export function PostCard({ post, labels, onUpdate }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<
    Array<{ id: string; body: string; author: { display_name: string; handle: string } }>
  >([]);
  const [commentBody, setCommentBody] = useState('');
  const [reacted, setReacted] = useState(post.viewer_reacted);
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);

  async function toggleLike() {
    const response = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: 'post', target_id: post.id, kind: 'like' }),
    });
    if (response.ok) {
      const data = await response.json();
      setReacted(data.reacted);
      setReactionCount(data.reaction_count);
    }
  }

  async function loadComments() {
    const response = await fetch(`/api/posts/${post.id}/comments`);
    if (response.ok) setComments(await response.json());
  }

  async function toggleComments() {
    if (!showComments) await loadComments();
    setShowComments((v) => !v);
  }

  async function submitComment() {
    if (!commentBody.trim()) return;
    const response = await fetch(`/api/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentBody.trim() }),
    });
    if (response.ok) {
      setCommentBody('');
      setCommentCount((c) => c + 1);
      await loadComments();
      onUpdate();
    }
  }

  async function followAuthor() {
    await fetch(`/api/users/${post.author.handle}/follow`, { method: 'POST' });
    onUpdate();
  }

  return (
    <article className="post-card sy-glass">
      <header className="post-header">
        <div>
          <strong>{post.author.display_name}</strong>
          <span className="post-handle">@{post.author.handle}</span>
        </div>
        <button type="button" className="btn-text" onClick={followAuthor}>
          {labels.follow}
        </button>
      </header>
      <p className="post-body">{post.body}</p>
      <footer className="post-actions">
        <button
          type="button"
          className={reacted ? 'btn-chip active' : 'btn-chip'}
          onClick={toggleLike}
        >
          {labels.like} · {reactionCount}
        </button>
        <button type="button" className="btn-chip" onClick={toggleComments}>
          {labels.comment} · {commentCount}
        </button>
      </footer>
      {showComments && (
        <div className="comments">
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <strong>{c.author.display_name}</strong>
              <span>@{c.author.handle}</span>
              <p>{c.body}</p>
            </div>
          ))}
          <div className="comment-form">
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder={labels.commentPlaceholder}
            />
            <button type="button" className="btn btn-glass" onClick={submitComment}>
              {labels.submitComment}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
