import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Heart, Download, RefreshCw, Share2, Sparkles, X, Film, Aperture, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * LOVEStruck Photo Booth
 * A romantic, real-time photo booth application.
 * Features:
 * - Webcam integration
 * - Real-time filters (CSS based)
 * - 3-Photo Sequence with Countdown
 * - Automatic Photo Strip generation (Canvas)
 */

const FILTERS = [
  { id: 'normal', name: 'Natural', class: '', canvasFilter: 'none' },
  { id: 'warm', name: 'Golden Hour', class: 'sepia-[.3] contrast-110 saturate-125 hue-rotate-[-10deg]', canvasFilter: 'sepia(30%) contrast(110%) saturate(125%) hue-rotate(-10deg)' },
  { id: 'vintage', name: 'Vintage', class: 'sepia-[.6] contrast-90 brightness-90 saturate-85', canvasFilter: 'sepia(60%) contrast(90%) brightness(90%) saturate(85%)' },
  { id: 'bw', name: 'Classic B&W', class: 'grayscale contrast-110 brightness-110', canvasFilter: 'grayscale(100%) contrast(110%) brightness(110%)' },
  { id: 'noir', name: 'Noir', class: 'grayscale contrast-150 brightness-90', canvasFilter: 'grayscale(100%) contrast(150%) brightness(90%)' },
  { id: 'soft', name: 'Pastel', class: 'contrast-90 brightness-110 saturate-85', canvasFilter: 'contrast(90%) brightness(110%) saturate(85%)' },
  { id: 'cyber', name: 'Cyberpunk', class: 'contrast-125 saturate-150 hue-rotate-[180deg] brightness-110', canvasFilter: 'contrast(125%) saturate(150%) hue-rotate(180deg) brightness(110%)' },
  { id: 'cool', name: 'Cool Tone', class: 'hue-rotate-[30deg] saturate-90 contrast-110', canvasFilter: 'hue-rotate(30deg) saturate(90%) contrast(110%)' },
];

const OVERLAYS = [
  { id: 'none', name: 'None', icon: <X size={16} /> },
  { id: 'hearts', name: 'Hearts', icon: <Heart size={16} /> },
  { id: 'sparkles', name: 'Sparkles', icon: <Sparkles size={16} /> },
  { id: 'vignette', name: 'Vignette', icon: <Aperture size={16} /> },
  { id: 'grain', name: 'Film Grain', icon: <Film size={16} /> },
];

const PROMPTS = [
  "Lean in close...",
  "Give a gentle hug!",
  "Big smiles!",
  "Look at each other...",
  "Blow a kiss!",
  "Make a silly face!",
  "Strike a pose!",
  "Chin up, smile!",
];

export default function App() {
  // State
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('idle'); // idle, countdown, capturing, review
  const [photos, setPhotos] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [currentFilter, setCurrentFilter] = useState(FILTERS[0]);
  const [currentOverlay, setCurrentOverlay] = useState(OVERLAYS[0]);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [flashActive, setFlashActive] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const stripCanvasRef = useRef(null);
  const filterScrollRef = useRef(null);

  // Initialize Camera
  useEffect(() => {
    let currentStream = null;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user"
          },
          audio: false
        });
        currentStream = mediaStream;
        setStream(mediaStream);
        setError(null);
      } catch (err) {
        setError("Unable to access camera. Please allow camera permissions to use the booth.");
        console.error(err);
      }
    };

    startCamera();

    // Cleanup on unmount
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Connect Stream to Video Element
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, mode]);

  // Capture Logic
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Match canvas size to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip horizontally for mirror effect if needed
    context.translate(canvas.width, 0);
    context.scale(-1, 1);

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    // Trigger Flash
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    return dataUrl;
  }, []);

  const startSequence = () => {
    setMode('countdown');
    setPhotos([]);
    runSequence(0);
  };

  const runSequence = (count) => {
    if (count >= 3) {
      setMode('review');
      return;
    }

    // Set a random prompt
    setCurrentPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

    let timer = 3;
    setCountdown(timer);

    const interval = setInterval(() => {
      timer--;
      setCountdown(timer);
      if (timer === 0) {
        clearInterval(interval);
        const photo = capturePhoto();
        setPhotos(prev => [...prev, photo]);
        
        // Small delay before next shot
        setTimeout(() => {
          runSequence(count + 1);
        }, 1000); 
      }
    }, 1000);
  };

  const resetBooth = () => {
    setPhotos([]);
    setMode('idle');
    setCountdown(null);
  };

  // UI Helper: Scroll Filters
  const scrollFilters = (direction) => {
    if (filterScrollRef.current) {
      const scrollAmount = 100;
      filterScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Generate Strip for Download
  const downloadStrip = () => {
    if (!stripCanvasRef.current || photos.length === 0) return;
    const link = document.createElement('a');
    link.download = `photo-strip-${Date.now()}.png`;
    link.href = stripCanvasRef.current.toDataURL();
    link.click();
  };

  // Render the Photo Strip on a hidden canvas to enable download
  useEffect(() => {
    if (mode === 'review' && photos.length === 3 && stripCanvasRef.current) {
      const canvas = stripCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const photoWidth = 600;
      const photoHeight = 450; // 4:3 Aspect Ratio
      const gap = 30;
      const sidePadding = 80; // Space for sprocket holes
      const topPadding = 60;
      const bottomPadding = 100;

      // Strip Dimensions
      const totalWidth = photoWidth + (sidePadding * 2);
      const totalHeight = topPadding + (photoHeight * 3) + (gap * 2) + bottomPadding;

      canvas.width = totalWidth;
      canvas.height = totalHeight;

      // 1. Draw Film Strip Background
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // 2. Draw Sprocket Holes
      const sprocketWidth = 20;
      const sprocketHeight = 30;
      const sprocketGap = 40;
      const sprocketColor = '#e5e5e5';
      
      // Draw left and right sprockets
      for (let y = 20; y < totalHeight; y += sprocketGap + sprocketHeight) {
        // Left hole
        ctx.fillStyle = sprocketColor;
        ctx.beginPath();
        ctx.roundRect(15, y, sprocketWidth, sprocketHeight, 4);
        ctx.fill();

        // Right hole
        ctx.beginPath();
        ctx.roundRect(totalWidth - 15 - sprocketWidth, y, sprocketWidth, sprocketHeight, 4);
        ctx.fill();
      }

      // 3. Draw Photos
      photos.forEach((photoData, i) => {
        const img = new Image();
        img.onload = () => {
          const yPos = topPadding + i * (photoHeight + gap);
          
          ctx.save();
          
          // Apply Filter
          if (currentFilter.canvasFilter) {
            ctx.filter = currentFilter.canvasFilter;
          }
          
          // Aspect Fit/Crop Calculation
          const sWidth = img.width;
          const sHeight = img.height;
          const sRatio = sWidth / sHeight;
          const dRatio = photoWidth / photoHeight;
          
          let sx, sy, sW, sH;
          if (sRatio > dRatio) {
             sH = sHeight;
             sW = sH * dRatio;
             sx = (sWidth - sW) / 2;
             sy = 0;
          } else {
             sW = sWidth;
             sH = sW / dRatio;
             sx = 0;
             sy = (sHeight - sH) / 2;
          }

          // Draw the photo
          ctx.drawImage(img, sx, sy, sW, sH, sidePadding, yPos, photoWidth, photoHeight);

          // Apply Overlay to Canvas
          if (currentOverlay.id === 'vignette') {
             const gradient = ctx.createRadialGradient(
               sidePadding + photoWidth/2, yPos + photoHeight/2, photoHeight * 0.3, 
               sidePadding + photoWidth/2, yPos + photoHeight/2, photoHeight * 0.8
             );
             gradient.addColorStop(0, 'rgba(0,0,0,0)');
             gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
             ctx.fillStyle = gradient;
             ctx.fillRect(sidePadding, yPos, photoWidth, photoHeight);
          } else if (currentOverlay.id === 'hearts') {
             ctx.filter = 'none'; // reset filter for text/icons
             ctx.fillStyle = 'rgba(255, 150, 150, 0.7)';
             ctx.font = '40px serif';
             ctx.fillText("♥", sidePadding + 20, yPos + 50);
             ctx.fillText("♥", sidePadding + photoWidth - 50, yPos + photoHeight - 20);
          }

          ctx.restore();

          // 4. Footer Text (Only once)
          if (i === 2) {
             ctx.fillStyle = '#ffffff';
             ctx.font = 'bold 32px Courier New'; // Mono font for film look
             ctx.textAlign = 'center';
             ctx.fillText("MEMORIES", totalWidth / 2, totalHeight - 50);
             
             ctx.fillStyle = '#888888';
             ctx.font = '16px Courier New';
             ctx.fillText(new Date().toLocaleDateString().toUpperCase(), totalWidth / 2, totalHeight - 25);
          }
        };
        img.src = photoData;
      });
    }
  }, [mode, photos, currentFilter, currentOverlay]);


  // -- UI COMPONENTS --

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white p-8 text-center">
        <div className="max-w-md bg-neutral-800 p-8 rounded-2xl shadow-2xl border border-neutral-700">
          <Camera size={48} className="mx-auto mb-4 text-rose-400" />
          <h2 className="text-2xl font-serif mb-2">Camera Access Required</h2>
          <p className="text-neutral-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-rose-500 hover:bg-rose-600 rounded-full font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-rose-500/30 overflow-hidden flex flex-col">
      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar {
              display: none;
          }
          .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
          }
        `}
      </style>

      {/* Hidden Elements */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={stripCanvasRef} className="hidden" />

      {/* Main Viewport */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        
        {/* Flash Overlay */}
        <div 
          className={`absolute inset-0 bg-white pointer-events-none z-50 transition-opacity duration-150 ${flashActive ? 'opacity-100' : 'opacity-0'}`} 
        />

        {/* --- IDLE / CAPTURE MODE --- */}
        {mode !== 'review' && (
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
            
            {/* Live Video Feed */}
            {stream ? (
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 transition-all duration-500 ${currentFilter.class}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-500 animate-pulse">
                Initializing camera...
              </div>
            )}

            {/* Overlays (HTML/CSS) */}
            <div className="absolute inset-0 pointer-events-none">
              {currentOverlay.id === 'hearts' && (
                <>
                  <Heart className="absolute top-8 left-8 text-rose-400/60 animate-bounce-slow" size={48} fill="currentColor" />
                  <Heart className="absolute bottom-8 right-8 text-rose-400/60 animate-bounce-slow delay-700" size={48} fill="currentColor" />
                </>
              )}
              {currentOverlay.id === 'sparkles' && (
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-screen" />
              )}
              {currentOverlay.id === 'vignette' && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.7)_100%)]" />
              )}
              {currentOverlay.id === 'grain' && (
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] mix-blend-overlay" />
              )}
              
              {/* Grid Lines (Optional - visible on hover) */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 grid grid-cols-3 grid-rows-3">
                 <div className="border-r border-white/50 h-full w-full col-start-1" />
                 <div className="border-r border-white/50 h-full w-full col-start-2" />
                 <div className="border-b border-white/50 h-full w-full row-start-1 col-span-3 absolute top-1/3 left-0" />
                 <div className="border-b border-white/50 h-full w-full row-start-2 col-span-3 absolute top-2/3 left-0" />
              </div>
            </div>

            {/* UI: Countdown & Prompts */}
            {mode === 'countdown' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px]">
                <div className="text-[12rem] font-bold text-white drop-shadow-2xl animate-ping-short">
                  {countdown}
                </div>
                {currentPrompt && countdown > 1 && (
                  <div className="mt-8 px-8 py-4 bg-black/60 backdrop-blur-md rounded-full text-2xl md:text-3xl font-serif text-rose-200 animate-fade-in-up">
                    {currentPrompt}
                  </div>
                )}
              </div>
            )}

            {/* UI: Controls (Only visible in idle) */}
            {mode === 'idle' && (
              <div className="absolute bottom-0 inset-x-0 p-6 md:p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col md:flex-row items-center justify-between gap-6 transition-opacity duration-300">
                
                {/* Left: Filters Carousel */}
                <div className="flex items-center gap-2 w-full max-w-[320px] md:w-auto relative group/filters">
                  <button 
                    onClick={() => scrollFilters('left')}
                    className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors shrink-0"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div 
                    ref={filterScrollRef}
                    className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-1 flex-nowrap w-full"
                  >
                    {FILTERS.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setCurrentFilter(f)}
                        className={`flex flex-col items-center gap-2 min-w-[64px] group py-1 shrink-0`}
                      >
                        <div className={`w-14 h-14 rounded-full border-2 overflow-hidden transition-all duration-300 ${currentFilter.id === f.id ? 'border-rose-500 ring-2 ring-rose-500/30 scale-100' : 'border-white/20 group-hover:border-white/60 scale-90'}`}>
                           <div className={`w-full h-full bg-neutral-400 ${f.class}`} />
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider font-bold transition-colors ${currentFilter.id === f.id ? 'text-rose-400' : 'text-neutral-400 group-hover:text-neutral-200'}`}>
                          {f.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => scrollFilters('right')}
                    className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors shrink-0"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* Center: Main Trigger */}
                <button 
                  onClick={startSequence}
                  className="relative group scale-100 hover:scale-105 transition-transform"
                >
                  <div className="absolute inset-0 bg-rose-500 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="relative w-20 h-20 md:w-24 md:h-24 bg-white rounded-full border-4 border-rose-500 flex items-center justify-center shadow-2xl">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-500 rounded-full group-hover:bg-rose-600 transition-colors" />
                    <Camera className="absolute text-white w-8 h-8 md:w-10 md:h-10" />
                  </div>
                </button>

                {/* Right: Overlays */}
                <div className="flex gap-2 bg-black/40 p-2 rounded-full backdrop-blur-sm overflow-x-auto scrollbar-hide">
                   {OVERLAYS.map(o => (
                     <button
                        key={o.id}
                        onClick={() => setCurrentOverlay(o)}
                        className={`p-3 rounded-full transition-all shrink-0 ${currentOverlay.id === o.id ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                        title={o.name}
                     >
                       {o.icon}
                     </button>
                   ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- REVIEW MODE --- */}
        {mode === 'review' && (
          <div className="w-full max-w-6xl h-full flex flex-col md:flex-row gap-8 items-center justify-center animate-fade-in">
            
            {/* Rendered Strip Preview */}
            <div className="relative bg-neutral-900 p-1 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500 max-h-[85vh] overflow-y-auto scrollbar-hide border border-neutral-800">
               {/* UI Visual Preview of the Film Strip */}
               <div className="flex flex-col items-center bg-[#111] p-6 w-[280px] md:w-[320px] relative overflow-hidden">
                  
                  {/* Sprocket Holes Left */}
                  <div className="absolute left-2 top-0 bottom-0 w-6 flex flex-col gap-8 py-4">
                     {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="w-4 h-6 bg-neutral-200/80 rounded-[2px]" />
                     ))}
                  </div>
                  {/* Sprocket Holes Right */}
                  <div className="absolute right-2 top-0 bottom-0 w-6 flex flex-col gap-8 py-4">
                     {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="w-4 h-6 bg-neutral-200/80 rounded-[2px]" />
                     ))}
                  </div>

                  {photos.map((src, i) => (
                    <div key={i} className="relative w-full aspect-[4/3] overflow-hidden bg-black mb-4 mx-8 border border-white/5">
                      <img 
                        src={src} 
                        alt={`Capture ${i}`} 
                        className={`w-full h-full object-cover ${currentFilter.class}`}
                      />
                      {currentOverlay.id === 'vignette' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />}
                      {currentOverlay.id === 'grain' && <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] mix-blend-overlay pointer-events-none" />}
                      {currentOverlay.id === 'hearts' && <div className="absolute bottom-2 right-2 text-rose-500 opacity-60">♥</div>}
                    </div>
                  ))}
                  
                  <div className="mt-4 font-mono text-xl text-white tracking-[0.2em] font-bold">MEMORIES</div>
                  <div className="mb-2 font-mono text-xs text-neutral-500 mt-2">{new Date().toLocaleDateString()}</div>
               </div>
            </div>

            {/* Action Panel */}
            <div className="flex flex-col gap-4 min-w-[280px]">
              <div className="text-center md:text-left mb-4">
                <h2 className="text-3xl font-serif text-white mb-2">Moments Captured</h2>
                <p className="text-neutral-400">Your session is complete. Download your cinematic keepsake.</p>
              </div>

              <button 
                onClick={downloadStrip}
                className="w-full py-4 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10"
              >
                <Download size={20} />
                Download Film Strip
              </button>

              <div className="grid grid-cols-2 gap-3">
                 <button 
                  onClick={resetBooth} // Usually share logic goes here
                  className="py-4 bg-neutral-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors border border-neutral-700"
                >
                  <Share2 size={18} />
                  Share
                </button>
                <button 
                  onClick={resetBooth}
                  className="py-4 bg-neutral-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors border border-neutral-700"
                >
                  <RefreshCw size={18} />
                  New Session
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
      
      {/* Footer Instructions */}
      {mode === 'idle' && (
        <div className="p-4 text-center text-neutral-500 text-sm font-medium tracking-wide uppercase">
          Align yourself • Choose a vibe • Tap camera
        </div>
      )}
    </div>
  );
}