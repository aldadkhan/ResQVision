import React, { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function CameraCapture({ onCapture }) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(0);

  const close = () => {
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setOpen(false);
    setOpening(false);
    setReady(false);
    setError('');
  };

  useEffect(() => {
    if (!open || opening || !streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
  }, [open, opening]);

  useEffect(() => () => {
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const startCamera = async () => {
    const request = ++requestRef.current;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setOpen(true);
    setOpening(true);
    setReady(false);
    setError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setOpening(false);
      setError('Camera access is unavailable. Open this site on localhost or over HTTPS.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } }
      });
      if (request !== requestRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      setOpening(false);
    } catch (cameraError) {
      if (request !== requestRef.current) return;
      setOpening(false);
      if (cameraError.name === 'NotAllowedError' || cameraError.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. Allow camera access in your browser settings, then try again.');
      } else if (cameraError.name === 'NotFoundError' || cameraError.name === 'DevicesNotFoundError') {
        setError('No camera was found on this device.');
      } else {
        setError(`Could not start the camera: ${cameraError.message || 'Please check camera access and try again.'}`);
      }
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setError('The camera is not ready yet. Please wait a moment and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('Could not access the photo canvas. Please try again.');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) {
        setError('Could not capture the photo. Please try again.');
        return;
      }
      onCapture(new File([blob], `animal-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      close();
    }, 'image/jpeg', 0.9);
  };

  return (
    <>
      <button type="button" className="capture-btn" onClick={startCamera}>
        <Camera /> Capture with camera
      </button>
      {open && createPortal(
        <div className="modal-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget) close();
        }}>
          <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="camera-title" style={{ width: 'min(100%, 560px)' }}>
            <div className="modal-head">
              <div>
                <h2 id="camera-title">Capture a photo</h2>
                <p>Allow camera access, then take a clear photo of the animal.</p>
              </div>
              <button type="button" className="icon-btn" onClick={close} aria-label="Close camera">
                <X />
              </button>
            </div>
            {opening && <p role="status">Starting camera…</p>}
            {error && <div className="error" role="alert">{error}</div>}
            {!error && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                onCanPlay={() => setReady(true)}
                style={{ width: '100%', maxHeight: '60vh', borderRadius: 10, background: '#111', objectFit: 'contain' }}
              />
            )}
            <div className="modal-actions">
              {error
                ? <button type="button" className="outline-btn" onClick={startCamera}>Try again</button>
                : <button type="button" className="outline-btn" onClick={close}>Cancel</button>}
              {!error && <button type="button" className="primary" onClick={takePhoto} disabled={!ready}>Take photo</button>}
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
