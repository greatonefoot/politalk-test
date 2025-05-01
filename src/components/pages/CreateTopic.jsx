import React, { useState } from "react";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { uploadImageAndGetURL } from "../../utils/uploadImage";

const CreateTopic = () => {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [file, setFile] = useState(null);
  const [deadline, setDeadline] = useState("");

  const handleAddOption = () => setOptions([...options, ""]);
  const handleChangeOption = (i, v) => {
    const newOptions = [...options];
    newOptions[i] = v;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || options.some(opt => !opt.trim())) {
      alert("모든 필드를 채워주세요.");
      return;
    }

    let imageUrl = "";
    if (file) {
      imageUrl = await uploadImageAndGetURL(file, "images");
    }

    await addDoc(collection(db, "posts"), {
      title,
      options: options.map((text) => ({ text, votes: 0 })),
      imageUrl,
      createdAt: new Date(),
      deadline: deadline ? new Date(deadline) : null,
      views: 0,
      reports: 0,
      isFixed: false
    });

    alert("주제가 등록되었습니다!");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold text-center mb-4">📝 주제 만들기</h2>

        <input
          type="text"
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
        />

        {options.map((opt, idx) => (
          <input
            key={idx}
            type="text"
            placeholder={`선택지 ${idx + 1}`}
            value={opt}
            onChange={(e) => handleChangeOption(idx, e.target.value)}
            className="w-full border p-2 rounded"
          />
        ))}

        <button type="button" onClick={handleAddOption} className="w-full bg-gray-100 border rounded py-2">
          + 선택지 추가
        </button>

        <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full border p-2 rounded" />

        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded">
          생성하기
        </button>
      </form>
    </div>
  );
};

export default CreateTopic;
