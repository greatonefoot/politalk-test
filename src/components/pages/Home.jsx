// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [commentCounts, setCommentCounts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortOrder, setSortOrder] = useState("최신순");
  const [activeHotTab, setActiveHotTab] = useState("일간");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const POSTS_PER_PAGE = 10;

  const navigate = useNavigate();

  const fetchPostsByPage = async (pageNumber) => {
    const postRef = collection(db, "posts");
    let q = query(postRef, orderBy("createdAt", "desc"), limit(POSTS_PER_PAGE));

    if (pageNumber > 1 && pageCursors[pageNumber - 2]) {
      q = query(
        postRef,
        orderBy("createdAt", "desc"),
        startAfter(pageCursors[pageNumber - 2]),
        limit(POSTS_PER_PAGE)
      );
    }

    const snapshot = await getDocs(q);
    const postList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setPosts(postList);

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    setPageCursors(prev => {
      const newCursors = [...prev];
      newCursors[pageNumber - 1] = lastVisible;
      return newCursors;
    });

    setHasNextPage(snapshot.docs.length === POSTS_PER_PAGE);

    const counts = {};
    for (const post of postList) {
      const commentQ = query(collection(db, "comments"), where("postId", "==", post.id));
      const commentSnap = await getDocs(commentQ);
      counts[post.id] = commentSnap.size;
    }
    setCommentCounts(counts);
  };

  useEffect(() => {
    fetchPostsByPage(currentPage);
  }, [currentPage]);

  const getDateLimit = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (activeHotTab === "일간") return now;
    if (activeHotTab === "주간") return new Date(now.getTime() - 7 * 86400000);
    return new Date(now.getTime() - 30 * 86400000);
  };

  const filteredPopularPosts = posts
    .filter(post => {
      const limit = getDateLimit();
      return (
        post.createdAt?.toDate?.() >= limit &&
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedCategory === "전체" || post.category === selectedCategory)
      );
    })
    .sort((a, b) => ((commentCounts[b.id] || 0) * 3 + (b.views || 0)) - ((commentCounts[a.id] || 0) * 3 + (a.views || 0)))
    .slice(0, 10);

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortOrder === "최신순") {
      return (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0);
    } else {
      return ((commentCounts[b.id] || 0) * 3 + (b.views || 0)) - ((commentCounts[a.id] || 0) * 3 + (a.views || 0));
    }
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        categories={[]}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <div className="max-w-3xl mx-auto px-4 pt-4">
        {/* 🔥 인기글 */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-medium flex items-center text-naver">🔥 인기글</h2>
            <div className="flex gap-2 text-sm">
              {["일간", "주간", "월간"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveHotTab(tab)}
                  className={`px-2 py-1 rounded-full border text-xs ${activeHotTab === tab ? "bg-naver text-white" : "border-naver text-naver"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          {filteredPopularPosts.map(post => (
            <Link to={`/post/${post.id}`} key={post.id}>
              <div className="bg-white p-4 rounded shadow-sm mb-4 hover:bg-gray-50 transition text-base">
                <div className="font-medium truncate">{post.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  댓글 {commentCounts[post.id] || 0}개 | 조회수 {post.views || 0}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ✏️ 주제 만들기 버튼 */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate("/create")}
            className="bg-naver hover:bg-naverDark text-white px-4 py-2 rounded text-sm"
          >
            ✏️ 주제 만들기
          </button>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border px-2 py-1 rounded text-sm"
          >
            <option value="최신순">최신순</option>
            <option value="인기순">인기순</option>
          </select>
        </div>

        {/* 📋 전체 게시글 */}
        <h2 className="text-xl font-medium mb-4 flex items-center text-naver">📋 전체 게시글</h2>
        {sortedPosts.map(post => (
          <Link to={`/post/${post.id}`} key={post.id}>
            <div className="bg-white p-4 rounded shadow-sm mb-4 hover:bg-gray-50 transition text-base">
              <div className="font-medium truncate">{post.title}</div>
              <div className="text-sm text-gray-600 mt-1">
                댓글 {commentCounts[post.id] || 0}개 | 조회수 {post.views || 0}
              </div>
            </div>
          </Link>
        ))}

        {/* 페이지네이션 */}
        <div className="flex justify-center gap-2 mt-6">
          {[1, 2, 3, 4, 5].map(num => (
            <button
              key={num}
              onClick={() => setCurrentPage(num)}
              className={`px-3 py-1 rounded ${currentPage === num ? "bg-naver text-white" : "border border-naver text-naver"}`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
