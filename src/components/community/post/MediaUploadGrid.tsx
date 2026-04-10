import React, { useRef } from 'react';
import { X, ImagePlus, Video } from 'lucide-react';

interface MediaUploadGridProps {
  files: File[];
  previews: string[];
  hasVideo: boolean;
  onChange: (files: File[], previews: string[]) => void;
  maxImages?: number;
}

export const MediaUploadGrid: React.FC<MediaUploadGridProps> = ({
  files, previews, hasVideo, onChange, maxImages = 4,
}) => {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  const handleImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, maxImages - files.length);
    const newFiles = [...files, ...selected].slice(0, maxImages);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    onChange(newFiles, newPreviews);
    e.target.value = '';
  };

  const handleVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange([file], [URL.createObjectURL(file)]);
    e.target.value = '';
  };

  const removeItem = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    onChange(newFiles, newPreviews);
  };

  return (
    <div>
      {previews.length > 0 && (
        <div className={`grid gap-1.5 mb-2 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {previews.map((url, i) => (
            <div key={url} className="relative rounded-xl overflow-hidden aspect-square bg-black">
              {hasVideo ? (
                <video src={url} className="w-full h-full object-cover" />
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => removeItem(i)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {previews.length === 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => imgInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2
              border-dashed border-gray-200 dark:border-gray-700 hover:border-[#2ECC71] transition-colors text-gray-400 hover:text-[#2ECC71]"
          >
            <ImagePlus size={22} />
            <span className="text-xs">Até {maxImages} fotos</span>
          </button>
          <button
            onClick={() => vidInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2
              border-dashed border-gray-200 dark:border-gray-700 hover:border-[#2ECC71] transition-colors text-gray-400 hover:text-[#2ECC71]"
          >
            <Video size={22} />
            <span className="text-xs">1 vídeo (60s)</span>
          </button>
        </div>
      )}

      {previews.length > 0 && !hasVideo && previews.length < maxImages && (
        <button
          onClick={() => imgInputRef.current?.click()}
          className="w-full py-2 text-xs text-[#2ECC71] font-medium hover:underline"
        >
          + Adicionar foto ({previews.length}/{maxImages})
        </button>
      )}

      <input ref={imgInputRef} type="file" accept="image/*" multiple hidden onChange={handleImagesSelected} />
      <input ref={vidInputRef} type="file" accept="video/*" hidden onChange={handleVideoSelected} />
    </div>
  );
};
