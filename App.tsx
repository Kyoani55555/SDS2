import React from 'react';
import Scene from './components/Scene';
import GestureController from './components/GestureController';
import PhotoUploader from './components/PhotoUploader';

const App: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Scene />
      </div>

      {/* Headless Controller & Camera Preview */}
      <GestureController />

      {/* Upload Control */}
      <PhotoUploader />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-8 z-10 pointer-events-none flex justify-between items-start">
        <div className="flex flex-col items-start ml-4 mt-4">
            {/* 
                Updated Font to Pinyon Script (font-christmas).
                Reduced text size to prevent blocking the tree (text-5xl/7xl).
                Added "11" to the title.
            */}
            <h1 className="text-5xl md:text-7xl font-christmas text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-yellow-600 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pr-4 pb-2">
                Merry Christmas 11
            </h1>
            <p className="mt-0 text-yellow-100/80 font-christmas text-2xl md:text-4xl pl-2 drop-shadow-md">
                from Bobby
            </p>
        </div>
      </div>

      {/* Decorative Border */}
      <div className="absolute inset-0 border-[1px] border-yellow-500/20 pointer-events-none m-4" />
      <div className="absolute inset-0 border-[1px] border-yellow-500/10 pointer-events-none m-6" />

    </div>
  );
};

export default App;