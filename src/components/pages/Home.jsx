// src/components/pages/Home.jsx

import React, { useEffect, useState, useRef } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  doc,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [commentCounts, setCommentCounts] = useState({});
  const [votePercents, setVotePercents] = useState({});
  const [authorData, setAuthorData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortOrder, setSortOrder] = useState("최신순");
  const [activeHotTab, setActiveHotTab] = useState("일간");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [weeklyPopularPosts, setWeeklyPopularPosts] = useState([]);
  const [monthlyPopularPosts, setMonthlyPopularPosts] = useState([]);

  const bottomRef = useRef(null);
  const navigate = useNavigate();
  const POSTS_PER_PAGE = 10;

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
    const postList = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    setPosts((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...postList.filter((p) => !ids.has(p.id))];
    });

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    setPageCursors((prev) => {
      const newC = [...prev];
      newC[pageNumber - 1] = lastVisible;
      return newC;
    });
    setHasNextPage(snapshot.docs.length === POSTS_PER_PAGE);

    const counts = {};
    const percents = {};
    const authors = {};

    for (const post of postList) {
      const commentSnap = await getDocs(
        query(collection(db, "comments"), where("postId", "==", post.id))
      );
      counts[post.id] = commentSnap.size;

      if (Array.isArray(post.options)) {
        const total = post.options.reduce((sum, o) => sum + (o.votes || 0), 0);
        percents[post.id] = post.options.reduce((obj, o) => {
          const label = o.label || o.text || "옵션";
          obj[label] = total > 0 ? Math.round(((o.votes || 0) / total) * 100) : 0;
          return obj;
        }, {});
      }

      if (post.authorUid) {
        const userSnap = await getDoc(doc(db, "users", post.authorUid));
        authors[post.id] = userSnap.exists() ? userSnap.data().name || "익명" : "익명";
      }
    }

    setCommentCounts((prev) => ({ ...prev, ...counts }));
    setVotePercents((prev) => ({ ...prev, ...percents }));
    setAuthorData((prev) => ({ ...prev, ...authors }));
  };
  const isToday = (timestamp) => {
  const createdDate = timestamp instanceof Timestamp ? timestamp.toDate() : new Date();
  const today = new Date();
  return (
    createdDate.getFullYear() === today.getFullYear() &&
    createdDate.getMonth() === today.getMonth() &&
    createdDate.getDate() === today.getDate()
  );
};


  const filterPopularPosts = (days) => {
    const cutoff = new Date(Date.now() - days * 86400000);
    return posts
      .filter((post) => {
        const date = post.createdAt instanceof Timestamp ? post.createdAt.toDate() : new Date();
        return date >= cutoff;
      })
      .sort(
        (a, b) =>
          (commentCounts[b.id] || 0) * 3 + (b.views || 0) -
          ((commentCounts[a.id] || 0) * 3 + (a.views || 0))
      )
      .slice(0, 5);
  };

  useEffect(() => {
    fetchPostsByPage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    setWeeklyPopularPosts(filterPopularPosts(7));
    setMonthlyPopularPosts(filterPopularPosts(30));
  }, [posts, commentCounts]);

  const getDateLimit = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (activeHotTab === "주간") return new Date(today - 7 * 86400000);
    if (activeHotTab === "월간") return new Date(today - 30 * 86400000);
    return today;
  };

  const filteredPopular = posts
    .filter((post) => {
      const date = post.createdAt instanceof Timestamp ? post.createdAt.toDate() : new Date();
      return (
        date >= getDateLimit() &&
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedCategory === "전체" || post.category === selectedCategory)
      );
    })
    .sort(
      (a, b) =>
        (commentCounts[b.id] || 0) * 3 + (b.views || 0) -
        ((commentCounts[a.id] || 0) * 3 + (a.views || 0))
    )
    .slice(0, 10);

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isFixed && !b.isFixed) return -1;
    if (!a.isFixed && b.isFixed) return 1;
    const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date();
    const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date();
    if (sortOrder === "최신순") return dateB - dateA;
    return (
      (commentCounts[b.id] || 0) * 3 + (b.views || 0) -
      ((commentCounts[a.id] || 0) * 3 + (a.views || 0))
    );
  });

  useEffect(() => {
    if (!bottomRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage) setCurrentPage((prev) => prev + 1);
      },
      { threshold: 1 }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasNextPage]);

const renderMainImages = (post) =>
  post.mainImages?.length > 0 && (
    <div className="grid grid-cols-2 gap-1 mb-1">
      {post.mainImages.map((url, i) => (
        <div key={i} className="relative w-full h-16 rounded overflow-hidden">
          <img src={url} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Header
        categories={[]}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      <div className="w-full flex justify-start px-4 pt-4">
        <div className="flex flex-col lg:flex-row gap-4 w-full max-w-6xl">

          {/* 사이드바 */}
          <div className="w-full lg:w-1/4 space-y-4 hidden sm:block">
            <div className="bg-white p-3 rounded border border-gray-300">
              <h3 className="text-sm font-bold mb-2 text-[#4B3621]">📅 주간 인기글</h3>
              <ul className="text-xs space-y-1">
                {weeklyPopularPosts.map((p) => (
                  <li key={p.id}>
                    <Link to={`/post/${p.id}`} className="truncate block">
                      {p.title} [{commentCounts[p.id] || 0}]
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-3 rounded border border-gray-300">
              <h3 className="text-sm font-bold mb-2 text-[#4B3621]">🗓 월간 인기글</h3>
              <ul className="text-xs space-y-1">
                {monthlyPopularPosts.map((p) => (
                  <li key={p.id}>
                    <Link to={`/post/${p.id}`} className="truncate block">
                      {p.title} [{commentCounts[p.id] || 0}]
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* 본문 영역 */}
          <div className="w-full lg:w-3/4">
            {/* 인기글 탭 */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-[#4B3621] flex items-center gap-1">
                🔥 인기글
              </h2>
              <div className="flex gap-2">
                {["일간", "주간", "월간"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveHotTab(tab)}
                    className={`px-2 py-1 rounded text-sm ${
                      activeHotTab === tab
                        ? "bg-[#4B3621] text-white font-semibold"
                        : "bg-white text-gray-600 border"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* 인기글 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {filteredPopular.map((p) => (
               <Link to={`/post/${p.id}`} key={p.id}>
  <div className="p-3 rounded border-2 border-[#4B3621] hover:bg-[#fdf8f3] transition">

{p.thumbnail && (
  <div className="w-full h-20 flex items-center justify-center overflow-hidden rounded mb-1 bg-white">
    <img
      src={p.thumbnail}
      alt=""
      className="h-full object-contain"
    />
  </div>
)}


    <div className="text-sm font-bold truncate">{p.title}</div>

    <div className="text-xs text-gray-600 mb-1">
      {authorData[p.id] || "익명"} · 댓글 {commentCounts[p.id] || 0} · 조회 {p.views || 0}
    </div>

    {votePercents[p.id] &&
      Object.entries(votePercents[p.id]).map(([opt, per]) => (
        <div key={opt} className="mb-1">
          <div className="text-[10px]">{opt}: {per}%</div>
          <div className="w-full h-1 bg-gray-300 rounded">
            <div
              className="h-full"
              style={{ width: `${per}%`, backgroundColor: '#D2B48C' }}
            />
          </div>
        </div>
      ))}
  </div>
</Link>

              ))}
            </div>

            {/* 전체 게시물 */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700">📋 전체 게시물</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/create")}
                  className="bg-[#4B3621] hover:bg-[#3A2A1A] text-white px-3 py-1 rounded text-sm"
                >
                  ✏️ 주제 만들기
                </button>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                >
                  <option value="최신순">최신순</option>
                  <option value="인기순">인기순</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedPosts.map((p) => (
                <Link to={`/post/${p.id}`} key={p.id}>
<div className="relative overflow-visible bg-white p-3 pt-6 rounded border border-gray-300 hover:bg-gray-50 transition">

{isToday(p.createdAt) && (
  <div className="absolute top-2 right-2 bg-[#EADDC6] text-[#4B3621] text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
    NEW
  </div>
)}


                 {p.thumbnail && (
  <div className="w-full h-20 flex items-center justify-center overflow-hidden rounded mb-1 bg-white">
    <img
      src={p.thumbnail}
      alt=""
      className="h-full object-contain"
    />
  </div>
)}

<div className="text-sm font-bold truncate">{p.title}</div>
                    <div className="text-xs text-gray-600 mb-1">
                      {authorData[p.id] || "익명"} · 댓글 {commentCounts[p.id] || 0} · 조회 {p.views || 0}
                    </div>
                    {votePercents[p.id] &&
                      Object.entries(votePercents[p.id]).map(([opt, per]) => (
                        <div key={opt} className="mb-1">
                          <div className="text-[10px]">{opt}: {per}%</div>
                          <div className="w-full h-1 bg-gray-300 rounded">
                            <div className="h-full bg-[#D2B48C]" style={{ width: `${per}%` }} />
                          </div>
                        </div>
                      ))}
                  </div>
                </Link>
              ))}
            </div>

            <div ref={bottomRef} className="h-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
