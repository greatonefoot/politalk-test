import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
} from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { uploadImageAndGetURL } from "../../utils/uploadImage";

const MyProfilePage = () => {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 50, y: 50 });
  const imageRef = useRef(null);

  const [myPosts, setMyPosts] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [commentPostTitles, setCommentPostTitles] = useState({});
  const [votedPosts, setVotedPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [showAllPosts, setShowAllPosts] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showAllVotes, setShowAllVotes] = useState(false);
  const [showAllNotis, setShowAllNotis] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }
      setUser(currentUser);
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setNickname(data.name || "");
        setProfilePic(data.profilePic || "");
        setDragPosition(data.profilePicPosition || { x: 50, y: 50 });
      }
      await fetchMyContent(currentUser.uid);
      await fetchVotedPosts();
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("receiverId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notis = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const sorted = notis.sort(
        (a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()
      );
      setNotifications(sorted);
    });

    return () => unsubscribe();
  }, [user]);

  const fetchMyContent = async (uid) => {
    const postsSnap = await getDocs(
      query(collection(db, "posts"), where("authorUid", "==", uid))
    );
    const commentsSnap = await getDocs(
      query(collection(db, "comments"), where("authorUid", "==", uid))
    );
    const comments = commentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const titlesMap = {};
    await Promise.all(
      comments.map(async (comment) => {
        if (!titlesMap[comment.postId]) {
          const postDoc = await getDoc(doc(db, "posts", comment.postId));
          titlesMap[comment.postId] = postDoc.exists()
            ? postDoc.data().title
            : "삭제된 글";
        }
      })
    );
    setMyPosts(postsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    setMyComments(comments);
    setCommentPostTitles(titlesMap);
  };

  const fetchVotedPosts = async () => {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("voted-")
    );
    const ids = keys.map((k) => k.replace("voted-", ""));
    const promises = ids.map((id) => getDoc(doc(db, "posts", id)));
    const results = await Promise.all(promises);
    const data = results
      .map((snap, i) => ({ id: ids[i], ...snap.data() }))
      .filter(Boolean);
    setVotedPosts(data);
  };
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    let uploadedUrl = profilePic;

    if (imageFile) {
      try {
        uploadedUrl = await uploadImageAndGetURL(imageFile, `profilePics/${user.uid}`);
        setProfilePic(uploadedUrl);
      } catch (err) {
        console.error("이미지 업로드 실패", err);
        alert("이미지 업로드에 실패했습니다.");
        return;
      }
    }

    await updateDoc(doc(db, "users", user.uid), {
      name: nickname,
      profilePic: uploadedUrl,
      profilePicPosition: dragPosition,
    });

    alert("프로필이 업데이트되었습니다!");
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      {/* 프로필 정보 */}
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">👤 내 프로필</h1>
        <div
          className="w-24 h-24 mx-auto mb-2 rounded-full overflow-hidden relative cursor-move border"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startY = e.clientY;

            const handleMouseMove = (moveEvent) => {
              const dx = moveEvent.clientX - startX;
              const dy = moveEvent.clientY - startY;

              const newX = Math.min(100, Math.max(0, dragPosition.x + dx / 2));
              const newY = Math.min(100, Math.max(0, dragPosition.y + dy / 2));

              setDragPosition({ x: newX, y: newY });
            };

            const handleMouseUp = () => {
              document.removeEventListener("mousemove", handleMouseMove);
              document.removeEventListener("mouseup", handleMouseUp);
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
          }}
        >
          <img
            ref={imageRef}
            src={previewUrl || profilePic || "https://via.placeholder.com/100"}
            alt="프로필"
            className="w-full h-full object-cover"
            style={{ objectPosition: `${dragPosition.x}% ${dragPosition.y}%` }}
            draggable={false}
          />
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="mb-2"
        />
        <input
          type="text"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full sm:w-3/4 border p-2 rounded mb-4"
        />
        <button
          onClick={handleUpdateProfile}
          className="w-full sm:w-1/2 bg-blue-500 text-white py-2 rounded mb-2 font-semibold"
        >
          프로필 업데이트
        </button>

        <div className="flex flex-col sm:flex-row justify-center gap-2">
          <button
            onClick={async () => {
              if (user?.email) {
                await sendPasswordResetEmail(auth, user.email);
                alert("비밀번호 재설정 이메일을 보냈습니다.");
              }
            }}
            className="w-full sm:w-1/2 bg-yellow-500 text-white py-2 rounded font-semibold"
          >
            비밀번호 변경
          </button>
          <button
            onClick={async () => {
              if (window.confirm("정말로 회원 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.")) {
                await deleteDoc(doc(db, "users", user.uid));
                const posts = await getDocs(query(collection(db, "posts"), where("authorUid", "==", user.uid)));
                await Promise.all(posts.docs.map(d => deleteDoc(d.ref)));
                const comments = await getDocs(query(collection(db, "comments"), where("authorUid", "==", user.uid)));
                await Promise.all(comments.docs.map(d => deleteDoc(d.ref)));
                const notis = await getDocs(query(collection(db, "notifications"), where("targetUid", "==", user.uid)));
                await Promise.all(notis.docs.map(d => deleteDoc(d.ref)));
                await deleteUser(user);
                alert("회원 탈퇴가 완료되었습니다.");
                navigate("/login");
              }
            }}
            className="w-full sm:w-1/2 bg-red-600 text-white py-2 rounded font-semibold"
          >
            회원 탈퇴
          </button>
        </div>
      </div>
      {/* 알림 */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🔔 내 알림</h2>
        {notifications.length > 0 && (
          <div className="flex justify-end gap-4 mb-4 text-sm">
            <button
              onClick={async () => {
                const unread = notifications.filter(n => !n.isRead);
                await Promise.all(
                  unread.map(noti => updateDoc(doc(db, "notifications", noti.id), { isRead: true }))
                );
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
              }}
              className="text-blue-600 hover:underline"
            >
              📖 모두 읽음 처리
            </button>
            <button
              onClick={async () => {
                const ids = notifications.map(n => n.id);
                await Promise.all(ids.map(id => deleteDoc(doc(db, "notifications", id))));
                setNotifications([]);
              }}
              className="text-red-500 hover:underline"
            >
              🗑 전체 삭제
            </button>
          </div>
        )}
        {notifications.length === 0 ? (
          <p className="text-gray-500">알림이 없습니다.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {(showAllNotis ? notifications : notifications.slice(0, 5)).map((noti) => (
                <li
                  key={noti.id}
                  className={`p-3 border rounded flex justify-between items-start hover:bg-gray-50 ${noti.isRead ? "text-gray-400" : "font-semibold"}`}
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={async () => {
                      if (!noti.isRead) {
                        await updateDoc(doc(db, "notifications", noti.id), { isRead: true });
                        setNotifications(prev =>
                          prev.map(n => n.id === noti.id ? { ...n, isRead: true } : n)
                        );
                      }
                      navigate(`/post/${noti.postId}`);
                    }}
                  >
                    <div>{noti.message || "알림 내용 없음"}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(noti.createdAt?.toDate()).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await deleteDoc(doc(db, "notifications", noti.id));
                      setNotifications(prev => prev.filter(n => n.id !== noti.id));
                    }}
                    className="text-red-500 text-sm ml-4"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
            {notifications.length > 5 && (
              <button
                onClick={() => setShowAllNotis(!showAllNotis)}
                className="mt-2 text-blue-500 hover:underline text-sm"
              >
                {showAllNotis ? "▲ 접기" : "▼ 더보기"}
              </button>
            )}
          </>
        )}
      </div>

      {/* 내가 쓴 글 */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📝 내가 쓴 글</h2>
        {myPosts.length === 0 ? (
          <p className="text-gray-500">작성한 글이 없습니다.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {(showAllPosts ? myPosts : myPosts.slice(0, 5)).map(post => (
                <li key={post.id}>
                  <Link to={`/post/${post.id}`} className="text-blue-600 hover:underline">
                    📄 {post.title} <span className="text-sm text-gray-500">({post.views || 0} 조회)</span>
                  </Link>
                </li>
              ))}
            </ul>
            {myPosts.length > 5 && (
              <button
                onClick={() => setShowAllPosts(!showAllPosts)}
                className="mt-2 text-blue-500 hover:underline text-sm"
              >
                {showAllPosts ? "▲ 접기" : "▼ 더보기"}
              </button>
            )}
          </>
        )}
      </div>

      {/* 내가 투표한 글 */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🗳️ 내가 투표한 글</h2>
        {votedPosts.length === 0 ? (
          <p className="text-gray-500">투표한 글이 없습니다.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {(showAllVotes ? votedPosts : votedPosts.slice(0, 5)).map(post => (
                <li key={post.id}>
                  <Link to={`/post/${post.id}`} className="text-green-700 hover:underline">
                    ✔️ {post.title} <span className="text-sm text-gray-500">({post.views || 0} 조회)</span>
                  </Link>
                </li>
              ))}
            </ul>
            {votedPosts.length > 5 && (
              <button
                onClick={() => setShowAllVotes(!showAllVotes)}
                className="mt-2 text-blue-500 hover:underline text-sm"
              >
                {showAllVotes ? "▲ 접기" : "▼ 더보기"}
              </button>
            )}
          </>
        )}
      </div>
      {/* 내가 쓴 댓글 */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">💬 내가 쓴 댓글</h2>
        {myComments.length === 0 ? (
          <p className="text-gray-500">작성한 댓글이 없습니다.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {(showAllComments ? myComments : myComments.slice(0, 5)).map(comment => (
                <li key={comment.id}>
                  <Link to={`/post/${comment.postId}`} className="hover:underline">
                    <p className="text-gray-800">💬 {comment.text}</p>
                    <p className="text-sm text-gray-500">↪ 글: {commentPostTitles[comment.postId]}</p>
                  </Link>
                </li>
              ))}
            </ul>
            {myComments.length > 5 && (
              <button
                onClick={() => setShowAllComments(!showAllComments)}
                className="mt-2 text-blue-500 hover:underline text-sm"
              >
                {showAllComments ? "▲ 접기" : "▼ 더보기"}
              </button>
            )}
          </>
        )}
        <div className="text-center">
          <button
            onClick={() => navigate("/")}
            className="mt-6 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded transition"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyProfilePage;
