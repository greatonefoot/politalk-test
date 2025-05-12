import React from "react";
import { Link } from "react-router-dom";

const PostCard = ({ post }) => {
  return (
    <Link to={`/post/${post.id}`}>
      <div className="border p-4 rounded hover:bg-gray-100 flex gap-4">
        {/* 썸네일 이미지 영역 */}
        {post.thumbnail && (
          <div className="w-28 h-20 flex justify-center items-center overflow-hidden rounded bg-white">
            <img
              src={post.thumbnail}
              alt="썸네일"
              className="h-full object-contain"
            />
          </div>
        )}

        {/* 텍스트 정보 */}
        <div className="flex flex-col justify-between">
          <div className="font-bold">{post.title}</div>
          <div className="text-sm text-gray-500">
            {post.category} | {post.date}
          </div>
          <div className="text-sm">{post.commentCount || 0}개의 댓글</div>
        </div>
      </div>
    </Link>
  );
};

export default PostCard;
