// src/components/CategoryTabs.jsx
import { useState } from "react";

function CategoryTabs({ selectedCategory, setSelectedCategory }) {
  const categories = ["전체", "정치", "사회", "경제", "국제", "연예", "스포츠", "기타"];

  return (
    <div className="flex gap-2 px-4 py-2 bg-white shadow-sm">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => setSelectedCategory(cat)}
          className={`px-4 py-2 rounded-full text-sm ${
            selectedCategory === cat ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

export default CategoryTabs;
