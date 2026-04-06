import React, { useEffect, useRef } from 'react';

interface VideoStreamProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
  onLoadedMetadata?: () => void;
}

export const VideoStream: React.FC<VideoStreamProps> = ({
  stream,
  muted = false,
  mirror = false,
  className = '',
  onLoadedMetadata,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
    } else {
      video.srcObject = null;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline   // Required for iOS Safari
      muted={muted}
      onLoadedMetadata={onLoadedMetadata}
      className={`${mirror ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
};

export default VideoStream;
