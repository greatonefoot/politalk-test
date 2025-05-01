// ✅ 최종 CommentSection.jsx (5초 제한 + 투표 진영만 댓글/공감 가능 + 투표 취소 제한 연동)
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  increment
} from "firebase/firestore";

const CommentSection = ({ postId, optionIndex, votePercent }) => {
  const [comments, setComments] = useState([]);
  const [post, setPost] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [myVote, setMyVote] = useState(null);
  const [sortType, setSortType] = useState("최신순");
  const [lastCommentTime, setLastCommentTime] = useState(0);

  useEffect(() => {
    fetchPostAndComments();

    const votedOption = localStorage.getItem(`voted-${postId}`);
    if (votedOption !== null) {
      setMyVote(Number(votedOption));
    }
  }, [postId]);

  const fetchPostAndComments = async () => {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      setPost(postSnap.data());
    }

    const q = query(collection(db, "comments"), where("postId", "==", postId));
    const querySnapshot = await getDocs(q);
    const commentData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setComments(commentData);
  };

  const handleSubmit = async (optionIndex, parentId = null) => {
    const now = Date.now();
    if (now - lastCommentTime < 5000) {
      alert("5초 뒤에 다시 작성해주세요.");
      return;
    }
    if (!newComment.trim()) return;
    if (myVote !== optionIndex) {
      alert("투표한 선택지에만 댓글을 작성할 수 있습니다.");
      return;
    }

    await addDoc(collection(db, "comments"), {
      postId,
      optionIndex,
      text: newComment,
      likes: 0,
      dislikes: 0,
      reports: 0,
      createdAt: new Date(),
      parentId: parentId || null,
      author: "익명"
    });

    // ✅ 댓글 작성하면 투표 취소 불가 처리
    localStorage.setItem(`commented-${postId}`, "true");

    setNewComment("");
    setLastCommentTime(now);
    fetchPostAndComments();
  };

  const handleLike = async (commentId) => {
    if (myVote !== optionIndex) return alert("자신이 투표한 진영의 댓글에만 공감할 수 있습니다.");

    const likeKey = `like-${commentId}`;
    const dislikeKey = `dislike-${commentId}`;
    const hasLiked = localStorage.getItem(likeKey) === "true";
    const hasDisliked = localStorage.getItem(dislikeKey) === "true";
    const commentRef = doc(db, "comments", commentId);

    if (hasLiked) {
      await updateDoc(commentRef, { likes: increment(-1) });
      localStorage.removeItem(likeKey);
    } else {
      await updateDoc(commentRef, { likes: increment(1) });
      localStorage.setItem(likeKey, "true");
      if (hasDisliked) {
        await updateDoc(commentRef, { dislikes: increment(-1) });
        localStorage.removeItem(dislikeKey);
      }
    }
    fetchPostAndComments();
  };

  const handleDislike = async (commentId) => {
    if (myVote !== optionIndex) return alert("자신이 투표한 진영의 댓글에만 비공감할 수 있습니다.");

    const likeKey = `like-${commentId}`;
    const dislikeKey = `dislike-${commentId}`;
    const hasLiked = localStorage.getItem(likeKey) === "true";
    const hasDisliked = localStorage.getItem(dislikeKey) === "true";
    const commentRef = doc(db, "comments", commentId);

    if (hasDisliked) {
      await updateDoc(commentRef, { dislikes: increment(-1) });
      localStorage.removeItem(dislikeKey);
    } else {
      await updateDoc(commentRef, { dislikes: increment(1) });
      localStorage.setItem(dislikeKey, "true");
      if (hasLiked) {
        await updateDoc(commentRef, { likes: increment(-1) });
        localStorage.removeItem(likeKey);
      }
    }
    fetchPostAndComments();
  };

  const handleReport = async (commentId) => {
    if (window.confirm("이 댓글을 신고하시겠습니까?")) {
      await updateDoc(doc(db, "comments", commentId), { reports: increment(1) });
      alert("신고가 접수되었습니다.");
      fetchPostAndComments();
    }
  };

  const sortComments = (commentList) => {
    return [...commentList].sort((a, b) => {
      if (sortType === "최신순") {
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      } else if (sortType === "추천순") {
        return (b.likes || 0) - (a.likes || 0);
      } else if (sortType === "비추천순") {
        return (b.dislikes || 0) - (a.dislikes || 0);
      }
      return 0;
    });
  };

  if (!post) return null;

  const parentComments = comments.filter(c => c.optionIndex === optionIndex && !c.parentId);
  const childMap = comments.reduce((map, comment) => {
    if (comment.parentId) {
      if (!map[comment.parentId]) map[comment.parentId] = [];
      map[comment.parentId].push(comment);
    }
    return map;
  }, {});

  return (
    <div
      className="p-4 bg-white border shadow rounded flex flex-col"
      style={{ width: `${votePercent}%`, minWidth: "120px" }}
    >
      <h3 className="font-bold text-center mb-2">
        {post.options[optionIndex]?.text} ({Math.round(votePercent)}%)
      </h3>

      <div className="flex justify-end mb-2">
        <select
          value={sortType}
          onChange={(e) => setSortType(e.target.value)}
          className="border p-1 rounded text-sm"
        >
          <option value="최신순">최신순</option>
          <option value="추천순">추천순</option>
          <option value="비추천순">비추천순</option>
        </select>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-80">
        {sortComments(parentComments).map(comment => (
          <div key={comment.id} className="border p-2 rounded bg-gray-50">
            {comment.reports >= 5 ? (
              <p className="text-red-500 font-semibold">🚫 신고 누적으로 숨김</p>
            ) : (
              <>
                <p>{comment.text}</p>
                <div className="flex items-center gap-2 text-xs mt-1">
                  <span className="text-gray-600">{comment.author}</span>
                  <button onClick={() => handleLike(comment.id)} className="text-naver hover:underline">👍 {comment.likes || 0}</button>
                  <button onClick={() => handleDislike(comment.id)} className="text-red-500 hover:underline">👎 {comment.dislikes || 0}</button>
                  <button onClick={() => handleReport(comment.id)} className="text-gray-400 hover:underline">🚩 신고</button>
                </div>
                {childMap[comment.id]?.map(reply => (
                  <div key={reply.id} className="ml-4 mt-2 p-2 bg-white border rounded">
                    <p>{reply.text}</p>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="text-gray-600">{reply.author}</span>
                      <button onClick={() => handleLike(reply.id)} className="text-naver hover:underline">👍 {reply.likes || 0}</button>
                      <button onClick={() => handleDislike(reply.id)} className="text-red-500 hover:underline">👎 {reply.dislikes || 0}</button>
                      <button onClick={() => handleReport(reply.id)} className="text-gray-400 hover:underline">🚩 신고</button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parentId = newComment.startsWith("@") ? newComment.slice(1).split(" ")[0] : null;
          const text = newComment.startsWith("@") ? newComment.split(" ").slice(1).join(" ") : newComment;
          setNewComment("");
          handleSubmit(optionIndex, parentId, text);
        }}
        className="mt-4"
      >
        <input
          type="text"
          placeholder="댓글 또는 답글 작성..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="w-full border p-2 rounded text-sm"
        />
        <button
          type="submit"
          className="w-full mt-2 bg-naver hover:bg-naverDark text-white text-sm p-2 rounded"
        >
          작성
        </button>
      </form>
    </div>
  );
};

export default CommentSection;
