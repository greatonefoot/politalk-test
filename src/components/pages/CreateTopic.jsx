
import React, { useState, useEffect, useCallback, useRef } from "react";
import { db, auth } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { uploadImageAndGetURL } from "../../utils/uploadImage";
import { v4 as uuidv4 } from "uuid";

const MAX_MAIN_IMAGES = 8;

const CreateTopic = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [options, setOptions] = useState([
    { text: "", file: null, previewUrl: null, position: { x: 50, y: 50 } },
    { text: "", file: null, previewUrl: null, position: { x: 50, y: 50 } }
  ]);
  const [mainImages, setMainImages] = useState([]);
  const [mainPreview, setMainPreview] = useState([]);
  const [imagePositions, setImagePositions] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const dragData = useRef({ index: null, startX: 0, startY: 0, targetType: null });

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      for (let item of items) {
        if (item.type.indexOf("image") !== -1 && mainImages.length < MAX_MAIN_IMAGES) {
          const file = item.getAsFile();
          if (!mainImages.some(f => f.name === file.name)) {
            const url = URL.createObjectURL(file);
            setMainImages(prev => [...prev, file]);
            setMainPreview(prev => [...prev, url]);
            setImagePositions(prev => [...prev, { x: 50, y: 50 }]);
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
      mainPreview.forEach(url => URL.revokeObjectURL(url));
      options.forEach(opt => {
        if (opt.previewUrl && opt.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(opt.previewUrl);
        }
      });
      if (thumbnailPreview && thumbnailPreview.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [mainImages, mainPreview, options, thumbnailPreview]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith("image/"));
    const remaining = MAX_MAIN_IMAGES - mainImages.length;
    const validFiles = files.slice(0, remaining).filter(file => !mainImages.some(f => f.name === file.name));
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setMainImages(prev => [...prev, ...validFiles]);
    setMainPreview(prev => [...prev, ...newPreviews]);
    setImagePositions(prev => [...prev, ...validFiles.map(() => ({ x: 50, y: 50 }))]);
  }, [mainImages]);

  const handleImageMouseDown = (e, index, targetType = "main") => {
    e.preventDefault();
    e.stopPropagation();
    dragData.current = { index, startX: e.clientX, startY: e.clientY, targetType };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const { index, startX, startY, targetType } = dragData.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (targetType === "main") {
      setImagePositions(prev => {
        const updated = [...prev];
        const pos = { ...updated[index] };
        pos.x = Math.max(0, Math.min(100, pos.x + dx * 0.2));
        pos.y = Math.max(0, Math.min(100, pos.y + dy * 0.2));
        updated[index] = pos;
        return updated;
      });
    } else {
      setOptions(prev => {
        const updated = [...prev];
        const pos = { ...updated[index].position };
        pos.x = Math.max(0, Math.min(100, pos.x + dx * 0.2));
        pos.y = Math.max(0, Math.min(100, pos.y + dy * 0.2));
        updated[index].position = pos;
        return updated;
      });
    }
    dragData.current.startX = e.clientX;
    dragData.current.startY = e.clientY;
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const handleAddOption = () => {
    // ✅ 선택지 삭제 함수
const handleRemoveOption = (index) => {
  if (options.length <= 2) {
    alert("선택지는 최소 2개 이상이어야 합니다.");
    return;
  }
  const updated = [...options];
  updated.splice(index, 1);
  setOptions(updated);
};

    if (options.length < 6) {
      setOptions(prev => [...prev, { text: "", file: null, previewUrl: null, position: { x: 50, y: 50 } }]);
    } else {
      alert("선택지는 최대 6개까지 가능합니다.");
    }
  };
// ✅ 2/2: form 나머지 및 제출 로직
const handleOptionTextChange = (i, value) => {
  setOptions(prev => {
    const updated = [...prev];
    updated[i].text = value;
    return updated;
  });
};

const handleOptionImageChange = (i, file) => {
  if (!file || !(file instanceof Blob)) {
    console.warn(`❌ 선택지 ${i + 1} 이미지가 유효하지 않음`, file);
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  setOptions(prev => {
    const updated = [...prev];
    updated[i] = { ...updated[i], file, previewUrl, position: { x: 50, y: 50 } };
    return updated;
  });
};


const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const handleMainImageChange = (e) => {
  const files = Array.from(e.target.files);
  const uniqueFiles = files.filter(file => !mainImages.some(f => f.name === file.name));
  const selected = uniqueFiles.slice(0, MAX_MAIN_IMAGES - mainImages.length);

  const filtered = selected.filter((file) => {
    if (file.size > MAX_IMAGE_SIZE) {
      alert(`❌ ${file.name} 파일은 5MB를 초과하여 업로드할 수 없습니다.`);
      return false;
    }
    return true;
  });

  setMainImages(prev => [...prev, ...filtered]);
  setMainPreview(prev => [...prev, ...filtered.map(f => URL.createObjectURL(f))]);
  setImagePositions(prev => [...prev, ...filtered.map(() => ({ x: 50, y: 50 }))]);
};


const handleThumbnailChange = (e) => {
  const file = e.target.files[0];

  if (!file || !(file instanceof Blob)) {
    console.warn("❌ 썸네일 이미지가 유효하지 않음", file);
    return;
  }

  setThumbnail(file);
  setThumbnailPreview(URL.createObjectURL(file));
};


const handleSubmit = async (e) => {
  e.preventDefault();
  if (!title.trim() || !content.trim() || options.filter(opt => opt.text.trim()).length < 2) {
    alert("제목, 내용, 선택지 2개 이상을 입력해주세요.");
    return;
  }

  try {
    setIsUploading(true);
    setUploadProgress(0);
    const user = auth.currentUser;
    const authorUid = user ? user.uid : "anonymous";

    let progress = 0;
    const totalUploads = (thumbnail ? 1 : 0) + mainImages.length + options.filter(o => o.file).length;
    const step = totalUploads > 0 ? 100 / totalUploads : 100;

    const uploadAndTrack = async (file) => {
      const url = await uploadImageAndGetURL(file, authorUid);
      progress += step;
      setUploadProgress(Math.min(100, Math.round(progress)));
      return url;
    };

const uploadedThumbnail = thumbnail ? await uploadAndTrack(thumbnail) : null;

const uploadedMainImages = [];

for (const file of mainImages) {
  if (!file) continue;
  try {
    const url = await uploadImageAndGetURL(file, authorUid); // 이 함수가 실패하면 throw
    if (url) uploadedMainImages.push(url);
  } catch (e) {
    console.warn("❌ 본문 이미지 업로드 실패, 건너뜀", file.name, e);
  }
}


const uploadedOptionImages = await Promise.all(
  options.map(opt => opt.file ? uploadAndTrack(opt.file) : Promise.resolve(""))
);


    const filteredOptionData = options.map((opt, idx) => ({
      text: opt.text,
      label: opt.text || `옵션 ${idx + 1}`,
      imageUrl: uploadedOptionImages[idx],
      imagePosition: uploadedOptionImages[idx] ? opt.position : null,
      votes: 0
    }));

const postData = {
  title,
  content,
  createdAt: new Date(),
  views: 0,
  reports: 0,
  isFixed: false,
  authorUid,
  mainImages: uploadedMainImages,
  imagePositions: imagePositions.slice(0, uploadedMainImages.length),
  options: filteredOptionData,
};

// 썸네일이 있을 때만 추가
if (uploadedThumbnail) {
  postData.thumbnail = uploadedThumbnail;
}

await addDoc(collection(db, "posts"), postData);


    alert("주제가 등록되었습니다!");
    window.location.href = "/";
  } catch (error) {
    console.error("업로드 중 오류 발생:", error);
    alert("업로드 중 오류가 발생했습니다.");
  } finally {
    setIsUploading(false);
  }
};

return (
  <div
    className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 space-y-6"
    onDrop={handleDrop}
    onDragOver={e => e.preventDefault()}
  >
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-full max-w-md space-y-4 relative">
      {isUploading && (
        <div className="absolute top-0 left-0 w-full p-4 bg-white bg-opacity-75">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all bg-blue-500"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-center text-sm mt-1">{uploadProgress}% 업로드 중...</p>
        </div>
      )}

      <h2 className="text-xl font-bold text-center">📝 주제 만들기</h2>

      <input
        type="text"
        placeholder="제목을 입력하세요"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <textarea
        placeholder="본문 내용을 입력하세요"
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={4}
        className="w-full border p-2 rounded"
      />

      <label className="text-sm font-semibold">🌟 썸네일 이미지 업로드</label>
      <input
        type="file"
        accept="image/*"
        onChange={handleThumbnailChange}
        className="w-full border p-2 rounded"
      />
    {thumbnailPreview && (
  <div className="w-full h-32 bg-gray-100 rounded overflow-hidden relative">
    <img src={thumbnailPreview} alt="썸네일 미리보기" className="w-full h-full object-cover" />
    <button
      type="button"
      onClick={() => {
        setThumbnail(null);
        setThumbnailPreview(null);
      }}
      className="absolute top-1 right-1 bg-white text-red-500 px-2 py-1 text-xs rounded shadow"
    >
      삭제
    </button>
  </div>
)}

        <label className="text-sm font-semibold">📷 본문 이미지 업로드 (최대 {MAX_MAIN_IMAGES}개)</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleMainImageChange}
          className="w-full border p-2 rounded"
        />

      <div className="grid grid-cols-2 gap-2">
       {mainPreview.map((url, i) => (
  <div key={i} className="relative group overflow-hidden w-full h-32 bg-gray-100 rounded">
    <img
      src={url}
      draggable={false}
      onMouseDown={e => handleImageMouseDown(e, i, "main")}
      style={{
        position: "absolute",
        top: `${50 - (imagePositions[i]?.y || 50)}%`,
        left: `${50 - (imagePositions[i]?.x || 50)}%`,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        cursor: "grab"
      }}
      alt={`main-${i}`}
    />
    <button
      type="button"
      onClick={() => {
        const updatedImages = [...mainImages];
        const updatedPreview = [...mainPreview];
        const updatedPositions = [...imagePositions];
        updatedImages.splice(i, 1);
        updatedPreview.splice(i, 1);
        updatedPositions.splice(i, 1);
        setMainImages(updatedImages);
        setMainPreview(updatedPreview);
        setImagePositions(updatedPositions);
      }}
      className="absolute top-1 right-1 bg-white text-red-500 px-2 py-1 text-xs rounded shadow"
    >
      삭제
    </button>
  </div>
))}

      </div>

      {options.map((opt, idx) => (
  <div key={idx} className="space-y-2 border p-2 rounded bg-gray-50">

          <label className="text-sm font-semibold">🎯 선택지 {idx + 1}</label>
          <input
            type="text"
            placeholder={`선택지 ${idx + 1}`}
            value={opt.text}
            onChange={e => handleOptionTextChange(idx, e.target.value)}
            className="w-full border p-2 rounded"
          />
          <input
            type="file"
            accept="image/*"
            onChange={e => handleOptionImageChange(idx, e.target.files[0])}
            className="w-full border p-2 rounded"
          />
          {opt.previewUrl && (
  <div className="relative group overflow-hidden w-full h-32 bg-gray-100 rounded">
    <img
      src={opt.previewUrl}
      draggable={false}
      onMouseDown={e => handleImageMouseDown(e, idx, "option")}
      style={{
        position: "absolute",
        top: `${50 - opt.position.y}%`,
        left: `${50 - opt.position.x}%`,
        height: "100%",
        cursor: "grab"
      }}
      alt={`opt-${idx}`}
    />
    <button
      type="button"
      onClick={() => {
        const updated = [...options];
        updated[idx] = { ...updated[idx], file: null, previewUrl: null, position: { x: 50, y: 50 } };
        setOptions(updated);
      }}
      className="absolute top-1 right-1 bg-white text-red-500 px-2 py-1 text-xs rounded shadow"
    >
      삭제
    </button>
  </div>
)}
{idx >= 2 && (
  <button
    type="button"
    onClick={() => handleRemoveOption(idx)}
    className="mt-1 text-red-500 text-sm underline"
  >
  삭제
  </button>
)}

</div>

))}   


      <button
        type="button"
        onClick={handleAddOption}
        className="w-full bg-gray-100 border rounded py-2"
      >
        + 선택지 추가 (최대 6개)
      </button>

      <div className="flex justify-between gap-2">
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded">
          생성하기
        </button>
        <button
          type="button"
          className="w-full bg-gray-300 text-black py-2 rounded"
          onClick={() => (window.location.href = "/")}
        >
          홈으로 돌아가기
        </button>
      </div>
    </form>
  </div>
);
};

export default CreateTopic;