import React, { useEffect, useState, useMemo, useRef } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { v4 as uuidv4 } from "uuid";
import { uploadImageAndGetURL } from "../../utils/uploadImage";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["image/jpg", "image/jpeg", "image/png", "image/webp"];
const EMOJI_REACTIONS = ["👍", "👎", "😢", "😡", "💪"];
const COMMENTS_PER_PAGE = 10;

function timeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (seconds < 60) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (weeks < 5) return `${weeks}주 전`;
  return `${months}달 전`;
}

const CommentSection = ({ postId, optionIndex, votePercent, myVote }) => {
 const getOrCreateAnonymousName = async (postId, authorId) => {
  // ✅ 로그인한 유저는 익명 이름 안 만듦
  if (currentUser?.uid) return null;

  const q = query(
    collection(db, "anonymousMap"),
    where("postId", "==", postId),
    where("authorId", "==", authorId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].data().anonymousName;

  const allSnap = await getDocs(query(collection(db, "anonymousMap"), where("postId", "==", postId)));
  const count = allSnap.size + 1;
  const newName = `익명${count}`;

  await addDoc(collection(db, "anonymousMap"), {
    postId,
    authorId,
    anonymousName: newName,
  });

  return newName;
};


  const [comments, setComments] = useState([]);
  const [bestComments, setBestComments] = useState([]);
  const [post, setPost] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [sortType, setSortType] = useState(localStorage.getItem("sortType") || "최신순");
  const [lastCommentTime, setLastCommentTime] = useState(0);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [openReplyMap, setOpenReplyMap] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [reactionMap, setReactionMap] = useState({});
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [anonMap, setAnonMap] = useState({});
  const [anonOrderMap, setAnonOrderMap] = useState({}); // ✅ 익명 고정 순서 저장

  const inputRef = useRef();
  const fileInputRef = useRef();
  const observerRef = useRef(); // ✅ 댓글 하단 요소 감지용


  const authorId = useMemo(() => {
    let id = localStorage.getItem("anon-id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("anon-id", id);
    }
    return id;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    fetchPost();
    fetchComments(true);
    fetchBestComments();
  }, [postId, optionIndex, sortType]);

  useEffect(() => {
  if (!observerRef.current || !hasMore) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loading) {
        fetchComments(false); // 👈 다음 댓글 자동 로딩
      }
    },
    { threshold: 1.0 }
  );

  observer.observe(observerRef.current);

  return () => observer.disconnect(); // 👈 정리
}, [observerRef, hasMore, loading]);


  const fetchPost = async () => {
    const postSnap = await getDoc(doc(db, "posts", postId));
    if (postSnap.exists()) setPost(postSnap.data());
  };

  const fetchBestComments = async () => {
    const q = query(
      collection(db, "comments"),
      where("postId", "==", postId),
      where("optionIndex", "==", optionIndex),
      where("parentId", "==", null),
      where("isBlind", "==", false),
      orderBy("score", "desc"),
      limit(3)
    );
    const snap = await getDocs(q);
    const best = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      score: doc.data().score ?? 0,
      reactions: doc.data().reactions ?? {},
    }));
    setBestComments(best);

    const uniqueUids = [...new Set(best.map(c => c.authorUid).filter(Boolean))];
    const newUserMap = {};
    for (const uid of uniqueUids) {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) newUserMap[uid] = snap.data();
    }
    setUserMap(prev => ({ ...prev, ...newUserMap }));

    const newReactionMap = {};
    best.forEach(c => {
      const saved = localStorage.getItem(`reaction-${c.id}`);
      newReactionMap[c.id] = saved && saved !== "none" ? saved : null;
    });
    setReactionMap(prev => ({ ...prev, ...newReactionMap }));
  };

  const fetchUserMap = async (commentsList) => {
    const uniqueUids = [...new Set(commentsList.map(c => c.authorUid).filter(Boolean))];
    const usersData = {};
    for (const uid of uniqueUids) {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) usersData[uid] = snap.data();
    }
    setUserMap(prev => ({ ...prev, ...usersData }));
  };

  const calculateScore = (reactions) => {
    const { "👍": up = 0, "👎": down = 0, "😢": sad = 0, "😡": angry = 0, "💪": strong = 0 } = reactions || {};
    return up * 3 + strong * 2 + sad - down * 2;
  };
 const fetchComments = async (isInitial = false) => {
  setLoading(true);

  const q = query(
    collection(db, "comments"),
    where("postId", "==", postId),
    where("optionIndex", "==", optionIndex),
    sortType === "공감순" ? orderBy("score", "desc") : orderBy("createdAt", "desc"),
    ...(lastVisible && !isInitial ? [startAfter(lastVisible)] : []),
    limit(COMMENTS_PER_PAGE)
  );

  const qs = await getDocs(q);
  const fetched = qs.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      score: data.score ?? 0,
      reactions: data.reactions ?? {},
      createdAt: data.createdAt?.toDate?.() || new Date()
    };
  });

  const updated = isInitial ? fetched : [...comments, ...fetched];
  setComments(updated);
  setLastVisible(qs.docs[qs.docs.length - 1] || null);
  setHasMore(qs.docs.length === COMMENTS_PER_PAGE);

 if (isInitial) {
  await fetchUserMap(fetched);

// 먼저 localStorage에 저장된 익명 맵이 있으면 그대로 사용
const savedMap = localStorage.getItem(`anonMap-${postId}`);
if (savedMap) {
  const parsed = JSON.parse(savedMap);
  setAnonMap(prev => ({ ...prev, [postId]: parsed }));
} else {
  // 없으면 직접 생성
  const all = [...fetched, ...bestComments].filter(
    (c) => !c.authorUid && c.postId === postId && c.createdAt
  );

  all.sort((a, b) => {
    const aDate = a.createdAt instanceof Date ? a.createdAt : a.createdAt.toDate();
    const bDate = b.createdAt instanceof Date ? b.createdAt : b.createdAt.toDate();
    return aDate - bDate;
  });

  const seen = new Set();
  const uniqueIds = [];
  for (const c of all) {
    if (!seen.has(c.authorId)) {
      seen.add(c.authorId);
      uniqueIds.push(c.authorId);
    }
  }

  const perPostMap = {};
  uniqueIds.forEach((id, idx) => {
    perPostMap[id] = "익명" + (idx + 1);
  });

  setAnonMap(prev => ({ ...prev, [postId]: perPostMap }));
  localStorage.setItem(`anonMap-${postId}`, JSON.stringify(perPostMap)); // ✅ 저장
}

}


  const newReactionMap = {};
  fetched.forEach(c => {
    const saved = localStorage.getItem(`reaction-${c.id}`);
    newReactionMap[c.id] = saved && saved !== "none" ? saved : null;
  });
  setReactionMap(prev => ({ ...prev, ...newReactionMap }));

  setLoading(false);
};

  const handleDelete = async (commentId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "comments", commentId));
    setLastVisible(null);
    fetchComments(true);
    fetchBestComments();
  };

  const handleReport = async (commentId) => {
    if (!window.confirm("해당 댓글을 신고하시겠습니까?")) return;
    const ref = doc(db, "comments", commentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const newCount = (data.reportCount || 0) + 1;
    const isBlind = newCount >= 5;

    await updateDoc(ref, {
      reportCount: newCount,
      isBlind,
    });

    alert(isBlind ? "블라인드 처리되었습니다." : "신고가 접수되었습니다.");
    fetchComments(true);
    fetchBestComments();
  };

  const canDelete = (comment) => {
    if (currentUser?.uid && comment.authorUid === currentUser.uid) return true;
    const anonId = localStorage.getItem("anon-id");
    if (!comment.authorUid && comment.authorId === anonId) return true;
    return false;
  };

  const canInteractWith = (comment, isReply = false) => {
    if (isReply) return true;
    if (post?.authorUid && currentUser?.uid === post.authorUid) return true;
    if (Number(myVote) === comment.optionIndex) return true;
    return false;
  };

  const handleEmojiReact = async (commentId, emoji) => {
    const reactionKey = `reaction-${commentId}`;
    const prev = localStorage.getItem(reactionKey);
    const ref = doc(db, "comments", commentId);

    setReactionMap(prevMap => ({
      ...prevMap,
      [commentId]: prev === emoji ? null : emoji
    }));

    let updatedReactions;
    setComments(prevComments =>
      prevComments.map(c => {
        if (c.id !== commentId) return c;
        updatedReactions = { ...c.reactions };
        if (prev && prev !== "none") updatedReactions[prev] = Math.max((updatedReactions[prev] || 1) - 1, 0);
        if (prev !== emoji) updatedReactions[emoji] = (updatedReactions[emoji] || 0) + 1;
        return { ...c, reactions: updatedReactions, score: calculateScore(updatedReactions) };
      })
    );

    setBestComments(prevBest =>
      prevBest.map(c => {
        if (c.id !== commentId) return c;
        const updatedReactions = { ...c.reactions };
        if (prev && prev !== "none") updatedReactions[prev] = Math.max((updatedReactions[prev] || 1) - 1, 0);
        if (prev !== emoji) updatedReactions[emoji] = (updatedReactions[emoji] || 0) + 1;
        return { ...c, reactions: updatedReactions, score: calculateScore(updatedReactions) };
      })
    );

    try {
      const updated = { ...updatedReactions };
      if (prev === emoji) {
        delete updated[emoji];
        await updateDoc(ref, { reactions: updated, score: calculateScore(updated) });
        localStorage.setItem(reactionKey, "none");
      } else {
        if (prev && prev !== "none") delete updated[prev];
        updated[emoji] = (updated[emoji] || 0) + 1;
        await updateDoc(ref, { reactions: updated, score: calculateScore(updated) });
        localStorage.setItem(reactionKey, emoji);
      }
    } catch (e) {
      console.error("이모지 반영 오류:", e);
    }
  };
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) return alert("5MB 이하만 가능");
    if (!ALLOWED_EXTENSIONS.includes(file.type)) return alert("지원되지 않는 포맷");
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = null;
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) {
      handleImageChange({ target: { files: [e.dataTransfer.files[0]] } });
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (optIndex, parentId = null) => {
    const text = parentId ? replyText.trim() : newComment.trim();
    if (!text) return;
    if (Date.now() - lastCommentTime < 3000) return alert("너무 빠르게 작성했습니다.");

    let imageUrls = [];
    if (imageFile) {
      const url = await uploadImageAndGetURL(imageFile);
      if (url) imageUrls.push(url);
    }

  const anonymousName = currentUser?.uid ? null : await getOrCreateAnonymousName(postId, authorId);


// 댓글 저장 후
const commentRef = await addDoc(collection(db, "comments"), {
  postId,
  optionIndex: optIndex,
  text,
  createdAt: Date.now(),
  authorUid: currentUser?.uid || null,
  authorId,
  anonymousName,
  parentId,
  imageUrls,
  reactions: {},
  score: 0,
  reportCount: 0,
  isBlind: false,
});

// 🔔 알림 생성
try {
  let targetUid = null;

  if (parentId) {
    const parentSnap = await getDoc(doc(db, "comments", parentId));
    targetUid = parentSnap.exists() ? parentSnap.data().authorUid : null;
  } else {
    targetUid = post?.authorUid;
  }

  // ✅ 로그인 여부와 상관없이 알림 생성 (단, 받는 사람이 로그인 유저일 때만)
  if (targetUid) {
    await addDoc(collection(db, "notifications"), {
      type: parentId ? "reply" : "comment",
      senderId: currentUser?.uid || null,
      receiverId: targetUid,
      postId,
      commentId: commentRef.id,
      postTitle: post?.title || "",
      message: parentId
        ? "내 댓글에 답글이 달렸습니다."
        : "내 게시글에 댓글이 달렸습니다.",
      isRead: false,
      createdAt: new Date(),
    });
  }
} catch (e) {
  console.error("🔔 알림 생성 실패:", e);
}



    setLastCommentTime(Date.now());
    if (parentId) {
      setReplyText("");
      setActiveReplyId(null);
      setTimeout(() => {
        setOpenReplyMap(prev => ({ ...prev, [parentId]: true }));
      }, 300);
    } else {
      setNewComment("");
      setImageFile(null);
      setPreviewUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    setLastVisible(null);
    fetchComments(true);
    fetchBestComments();
  };

  const renderEmojiButtons = (comment, isReply = false) => {
    if (!canInteractWith(comment, isReply) || comment.isBlind) return null;
    const selected = reactionMap[comment.id];
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {EMOJI_REACTIONS.map((emoji) => {
          const isSelected = selected && selected === emoji;
          return (
            <button
              key={emoji}
              onClick={() => handleEmojiReact(comment.id, emoji)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-sm border ${
                isSelected ? "bg-[#6B4D33] text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              <span className="text-sm">{emoji}</span>
              <span className="text-xs">{comment.reactions?.[emoji] || 0}</span>
            </button>
          );
        })}
      </div>
    );
  };
  const renderAuthorLabel = (c) => {
    const isWriter = c.authorUid === post?.authorUid;
    const user = c.authorUid ? userMap[c.authorUid] : null;
    const time = timeAgo(c.createdAt);

    return (
      <div className="flex items-center gap-2 text-sm mt-1">
        {user?.profilePic ? (
          <img src={user.profilePic} alt="프로필" className="w-5 h-5 rounded-full" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-300" />
        )}
        <span className="text-gray-700 font-semibold">
  {user?.name || c.anonymousName || "익명"}
</span>

        {isWriter && <span className="text-[#6B4D33] font-semibold text-xs ml-1">[작성자]</span>}
        <span className="ml-2 text-xs text-gray-400">{time}</span>
      </div>
    );
  };

  const bestCommentIds = useMemo(() => bestComments.map(c => c.id), [bestComments]);

  const parentComments = comments.filter(
    (c) => !c.parentId && !bestCommentIds.includes(c.id)
  );

  const childMap = comments.reduce((m, c) => {
    if (c.parentId) {
      m[c.parentId] = m[c.parentId] || [];
      m[c.parentId].push(c);
    }
    return m;
  }, {});

  return (
    <div className="p-4 bg-[#fdfaf6]">
      {/* 정렬 및 제목 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-[#6B4D33]">
          {post?.options[optionIndex]?.text} ({Math.round(votePercent)}%)
        </h3>
        <select
          value={sortType}
          onChange={(e) => {
            setSortType(e.target.value);
            localStorage.setItem("sortType", e.target.value);
            setLastVisible(null);
          }}
          className="text-sm border border-gray-300 p-1 rounded"
        >
          <option>최신순</option>
          <option>공감순</option>
        </select>
      </div>

{/* 베스트 댓글 */}
{bestComments.length > 0 && (
  <div className="mb-6">
    <h4 className="text-[#6B4D33] font-bold mb-2">🌟 베스트 댓글 TOP3</h4>
    <div className="space-y-3">
      {bestComments.map((c, i) => (
        <div key={c.id} className="p-2 border rounded bg-yellow-50 shadow">
          <div className="text-xs text-gray-500 font-bold">#{i + 1} · 점수: {c.score}</div>
          <p>{c.text}</p>
          {c.imageUrls?.map((url, i) => (
            <img key={i} src={url} alt="첨부" className="mt-2 max-h-40 rounded" />
          ))}
          {renderAuthorLabel(c)}
          <div className="flex gap-2 text-xs mt-1">
            {canDelete(c) && (
              <button onClick={() => handleDelete(c.id)} className="hover:underline text-gray-500">🗑 삭제</button>
            )}
            {!c.isBlind && (
              <>
                <button onClick={() => setActiveReplyId(c.id)} className="hover:underline text-[#6B4D33]">💬 답글</button>
                {canInteractWith(c, false) && (
                  <button onClick={() => handleReport(c.id)} className="hover:underline text-red-400">🚩 신고</button>
                )}
              </>
            )}
          </div>
          {!c.isBlind && renderEmojiButtons(c)}

          {/* ✅ 베스트 댓글 답글 입력창 */}
          {String(activeReplyId) === String(c.id) && (
            <div className="mt-2 ml-4">
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="답글 입력..."
                className="w-full border p-1 rounded text-sm mb-1"
              />
              <button
                onClick={() => handleSubmit(optionIndex, c.id)}
                className="bg-[#6B4D33] text-white px-2 py-1 text-sm rounded"
              >
                답글 작성
              </button>
            </div>
          )}

          {/* ✅ 베스트 댓글 답글 펼치기 */}
          {childMap[c.id] && (
            <>
              <button
                onClick={() => setOpenReplyMap(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                className="text-xs text-blue-500 hover:underline mt-2"
              >
                {openReplyMap[c.id]
                  ? `🔽 답글 숨기기`
                  : `💬 답글 ${childMap[c.id].length}개 보기`}
              </button>
              {openReplyMap[c.id] && childMap[c.id].map((r) => (
                <div key={r.id} className="ml-4 mt-2 p-2 border rounded bg-white">
                  {r.isBlind ? (
                    <p className="italic text-gray-400">🚫 블라인드된 댓글입니다.</p>
                  ) : (
                    <>
                      <p>{r.text}</p>
                      {r.imageUrls?.map((url, i) => (
                        <img key={i} src={url} alt="첨부" className="mt-2 max-h-40 rounded" />
                      ))}
                    </>
                  )}
                  {renderAuthorLabel(r)}
                  <div className="flex gap-2 text-xs mt-1">
                    {canDelete(r) && (
                      <button onClick={() => handleDelete(r.id)} className="hover:underline text-gray-500">🗑 삭제</button>
                    )}
                    {canInteractWith(r, true) && !r.isBlind && (
                      <button onClick={() => handleReport(r.id)} className="hover:underline text-red-400">🚩 신고</button>
                    )}
                  </div>
                  {!r.isBlind && renderEmojiButtons(r, true)}
                </div>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  </div>
)}




      {/* 일반 댓글 */}
      <div className="space-y-4">
        {parentComments.map((c) => (
 <div key={c.id} className="p-2 border rounded bg-[#f8f8f8] shadow">

            {c.isBlind ? (
              <p className="italic text-gray-400">🚫 블라인드된 댓글입니다.</p>
            ) : (
              <>
                <p>{c.text}</p>
                {c.imageUrls?.map((url, i) => (
                  <img key={i} src={url} alt="첨부" className="mt-2 max-h-40 rounded" />
                ))}
              </>
            )}
            {renderAuthorLabel(c)}
            <div className="flex gap-2 text-xs mt-1">
              {canDelete(c) && (
                <button onClick={() => handleDelete(c.id)} className="hover:underline text-gray-500">🗑 삭제</button>
              )}
              {!c.isBlind && (
                <>
                  <button onClick={() => setActiveReplyId(c.id)} className="hover:underline text-[#6B4D33]">💬 답글</button>
                  {canInteractWith(c, false) && (
                    <button onClick={() => handleReport(c.id)} className="hover:underline text-red-400">🚩 신고</button>
                  )}
                </>
              )}
            </div>
            {!c.isBlind && renderEmojiButtons(c)}
            {/* 답글 입력창 */}
            {String(activeReplyId) === String(c.id) && (
              <div className="mt-2 ml-4">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="답글 입력..."
                  className="w-full border p-1 rounded text-sm mb-1"
                />
                <button onClick={() => handleSubmit(optionIndex, c.id)} className="bg-[#6B4D33] text-white px-2 py-1 text-sm rounded">답글 작성</button>
              </div>
            )}
            {/* 답글 펼치기 */}
            {childMap[c.id] && (
              <>
                <button
                  onClick={() => setOpenReplyMap(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {openReplyMap[c.id]
                    ? `🔽 답글 숨기기`
                    : `💬 답글 ${childMap[c.id].length}개 보기`}
                </button>
                {openReplyMap[c.id] && childMap[c.id].map((r) => (
                  <div key={r.id} className="ml-4 mt-2 p-2 border rounded bg-[#f8f8f8] shadow-sm">
                    {r.isBlind ? (
                      <p className="italic text-gray-400">🚫 블라인드된 댓글입니다.</p>
                    ) : (
                      <>
                        <p>{r.text}</p>
                        {r.imageUrls?.map((url, i) => (
                          <img key={i} src={url} alt="첨부" className="mt-2 max-h-40 rounded" />
                        ))}
                      </>
                    )}
                    {renderAuthorLabel(r)}
                    <div className="flex gap-2 text-xs mt-1">
                      {canDelete(r) && (
                        <button onClick={() => handleDelete(r.id)} className="hover:underline text-gray-500">🗑 삭제</button>
                      )}
                      {canInteractWith(r, true) && !r.isBlind && (
                        <button onClick={() => handleReport(r.id)} className="hover:underline text-red-400">🚩 신고</button>
                      )}
                    </div>
                    {!r.isBlind && renderEmojiButtons(r, true)}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
        {loading && <div className="text-center text-sm text-gray-400">로딩 중...</div>}
        {hasMore && !loading && (
  <div ref={observerRef} className="h-10" />
)}

      </div>

      {/* 댓글 작성 창 */}
      {(Number(myVote) === optionIndex || (currentUser?.uid && currentUser.uid === post?.authorUid)) && (
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSubmit(optionIndex);
          }}
          className="mt-6"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="댓글 작성..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(optionIndex);
              }
            }}
            className="w-full border p-2 rounded text-sm mb-2"
          />
          <button
            type="button"
            onClick={() => setShowImageUpload(s => !s)}
            className="mb-2 text-sm text-[#6B4D33] hover:underline"
          >
            📷 이미지 첨부 {showImageUpload ? "닫기 ▲" : "열기 ▼"}
          </button>
          {showImageUpload && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="w-full border-dashed border-2 border-gray-300 rounded p-4 mb-2 text-center text-sm"
              >
                이미지를 드래그 앤 드롭하거나 선택하세요.
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="w-full mt-2" />
              </div>
              {previewUrl && (
                <div className="flex gap-2 mb-2">
                  <div className="relative inline-block">
                    <img src={previewUrl} alt="미리보기" className="w-20 h-20 object-cover rounded" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-0 right-0 text-white bg-black bg-opacity-70 rounded-full w-5 h-5 text-xs flex items-center justify-center"
                    >✕</button>
                  </div>
                </div>
              )}
            </>
          )}
          <button type="submit" className="w-full bg-[#6B4D33] hover:bg-[#533A26] text-white text-sm p-2 rounded">작성</button>
        </form>
      )}
    </div>
  );
};

export default CommentSection;
