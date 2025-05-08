import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

export const uploadThumbnail = async (file) => {
  const storage = getStorage();
  const fileRef = ref(storage, `thumbnails/${uuidv4()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
};
