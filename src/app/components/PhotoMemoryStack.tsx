/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

type Props = {
  photos: string[];
  mainPhotoIndex: number;
  asciiArt: string;
  complete: boolean;
  /** Change this to restart both the ASCII reveal and photo sequence. */
  replayKey: number;
};

const SLIDE_INTERVAL_MS = 3500;

/** Always reveals the chosen image first, then loops all photos as a deck of cards. */
export default function PhotoMemoryStack({ photos, mainPhotoIndex, asciiArt, complete, replayKey }: Props) {
  const [active, setActive] = useState(mainPhotoIndex);
  const [paused, setPaused] = useState(false);

  // Replay changes the component key in the parent, resetting the selected photo.
  // The interval only starts when the typing animation is complete.
  useEffect(() => {
    if (!complete || paused || photos.length < 2) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % photos.length), SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [complete, paused, photos.length, replayKey]);

  const hasColor = photos.length > 0;
  return (
    <div className={`ascii-art-frame memory-stack-frame${complete && hasColor ? " photo-revealed" : ""}`}>
      <div className="ascii-top">
        <span>{complete && hasColor ? "a stack of sweet memories" : "your little picture, in letters"}</span>
        <span>{complete && hasColor ? `♡ MEMORY ${active + 1} / ${photos.length}` : "♡ ASCII MEMORY"}</span>
      </div>
      <div className={`ascii-visual-frame${photos.length > 1 ? " has-photo-stack" : ""}`}>
        <pre role="img" aria-label="Main picture represented as ASCII characters" aria-hidden={complete && hasColor}>{asciiArt}</pre>
        {photos.length > 0 && (
          <div className={`memory-stack ${complete ? "is-revealed" : ""}`} aria-label="Looping photo memory slideshow">
            {photos.map((src, index) => {
              const distance = (index - active + photos.length) % photos.length;
              const layer = Math.min(distance, 3);
              return (
                <img key={`${index}-${src.slice(0, 36)}`} className={`memory-stack-photo${distance === 0 ? " is-front" : ""}`}
                  src={src} alt={`Memory ${index + 1} of ${photos.length}${index === mainPhotoIndex ? ", selected main picture" : ""}`}
                  aria-hidden={!complete || distance !== 0}
                  style={{
                    zIndex: photos.length - distance,
                    opacity: complete ? (distance < 4 ? 1 : 0) : 0,
                    transform: `translate(${layer * 7}px, ${layer * -6}px) rotate(${distance === 0 ? -1.5 : layer * 2.5}deg) scale(${1 - layer * 0.038})`,
                  }} />
              );
            })}
          </div>
        )}
      </div>
      {photos.length > 1 && complete && (
        <div className="memory-stack-controls" role="group" aria-label="Photo slideshow controls">
          <button type="button" aria-label="Previous memory" onClick={() => setActive((index) => (index - 1 + photos.length) % photos.length)}><ChevronLeft size={16}/></button>
          <span aria-live="off">{active + 1} of {photos.length}</span>
          <button type="button" aria-label={paused ? "Resume slideshow" : "Pause slideshow"} onClick={() => setPaused((value) => !value)}>{paused ? <Play size={15}/> : <Pause size={15}/>}</button>
          <button type="button" aria-label="Next memory" onClick={() => setActive((index) => (index + 1) % photos.length)}><ChevronRight size={16}/></button>
        </div>
      )}
    </div>
  );
}
