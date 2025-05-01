// ✅ src/components/AdminRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const AdminRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        setIsAdmin(snap.exists() && snap.data().role === "admin");
      }
      setChecking(false);
    };
    checkAdmin();
  }, [user]);

  if (loading || checking) return <div className="text-center py-10">로딩 중...</div>;

  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return children;
};

export default AdminRoute;
