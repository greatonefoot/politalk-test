import React from "react";
import { Link } from "react-router-dom";

const PostCard = ({ post }) => {
  return (
    <Link to={`/post/${post.id}`}>
      <div className="border p-4 rounded hover:bg-gray-100">
        <div className="font-bold">{post.title}</div>
        <div className="text-sm text-gray-500">{post.category} | {post.date}</div>
        <div className="text-sm">{post.commentCount || 0}개의 댓글</div>
      </div>
    </Link>
  );
};

export default PostCard;
