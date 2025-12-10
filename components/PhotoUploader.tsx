import React, { useRef } from 'react';
import { useStore } from '../store';

const PhotoUploader: React.FC = () => {
  const { photos, setPhotos } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_PHOTOS = 25;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      
      const currentCount = photos.length;
      const remainingSlots = MAX_PHOTOS - currentCount;
      
      if (remainingSlots <= 0) return;

      const filesToProcess = newFiles.slice(0, remainingSlots);
      
      // Create Blob URLs for zero compression/alteration.
      const newPhotoUrls = filesToProcess.map((file) => URL.createObjectURL(file as Blob));
      
      setPhotos([...photos, ...newPhotoUrls]);

      // Reset input
      event.target.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = (indexToRemove: number) => {
      // Revoke the object URL to free memory
      if (photos[indexToRemove]) {
          URL.revokeObjectURL(photos[indexToRemove]);
      }
      
      // Remove from state
      const newPhotos = photos.filter((_, idx) => idx !== indexToRemove);
      setPhotos(newPhotos);
  };

  return (
    <div className="absolute bottom-8 left-8 z-50 pointer-events-auto flex flex-col gap-4 w-full max-w-[320px]">
      
      {/* Custom Scrollbar Styles for this component */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.4);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(234, 179, 8, 0.4);
          border-radius: 4px;
          border: 1px solid rgba(0,0,0,0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(234, 179, 8, 0.8);
        }
      `}</style>

      {/* Thumbnails Strip */}
      {photos.length > 0 && (
        <div 
            className="
                flex gap-3 overflow-x-auto pb-4 pt-2 px-3 items-end 
                custom-scrollbar
                bg-black/60 backdrop-blur-md border border-yellow-500/20 rounded-xl shadow-2xl
            "
            onWheel={(e) => {
                // Enable horizontal scroll with vertical wheel for better UX
                if (e.deltaY !== 0) {
                   e.currentTarget.scrollLeft += e.deltaY;
                }
            }}
        >
            {photos.map((photo, index) => (
                <div 
                    key={`${index}-${photo}`} 
                    className="relative group shrink-0 w-16 h-20 border border-yellow-500/30 bg-black/80 transition-all hover:scale-105 hover:z-10 hover:border-yellow-400 rounded-sm overflow-visible"
                >
                    <img 
                        src={photo} 
                        alt={`Memory ${index + 1}`} 
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    
                    {/* Delete Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto(index);
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-900 border border-red-500 text-white flex items-center justify-center rounded-full text-xs opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-[0_0_10px_rgba(255,0,0,0.5)] cursor-pointer z-20 hover:scale-110"
                        title="Remove photo"
                    >
                        ×
                    </button>

                    {/* Number badge */}
                    <div className="absolute bottom-0 right-0 bg-black/70 text-[9px] text-yellow-500 px-1.5 py-0.5 font-mono backdrop-blur-sm border-t border-l border-yellow-500/20">
                        {index + 1}
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Upload Controls */}
      <div className="flex flex-col items-start pl-1">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            className="hidden"
        />
        <button
            onClick={handleButtonClick}
            disabled={photos.length >= MAX_PHOTOS}
            className={`
                group relative px-6 py-3 
                bg-black/60 border border-yellow-500/50 
                text-yellow-400 font-serif tracking-widest text-sm uppercase
                transition-all duration-300
                hover:bg-yellow-900/40 hover:border-yellow-400 hover:text-yellow-200
                disabled:opacity-50 disabled:cursor-not-allowed
                backdrop-blur-md overflow-hidden rounded-sm
            `}
        >
            <span className="relative z-10 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {photos.length >= MAX_PHOTOS ? 'Collection Full' : 'Upload Memories'}
            </span>
            
            {/* Luxury Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </button>
        
        <div className="mt-2 text-xs text-yellow-500/60 font-mono text-center w-full flex justify-between px-2">
            <span>{photos.length} / {MAX_PHOTOS}</span>
            <span>MAX CAP.</span>
        </div>
      </div>
    </div>
  );
};

export default PhotoUploader;