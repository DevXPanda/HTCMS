import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, X, Check } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'HTCMS/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.address) {
      const a = data.address;
      const parts = [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village, a.state, a.country].filter(Boolean);
      return parts.join(', ') || data.display_name || null;
    }
    return data?.display_name || null;
  } catch {
    return null;
  }
};

const drawLocationOnCanvas = (ctx, canvas, location, address) => {
  const { latitude, longitude } = location;
  const h = 56;
  const y = canvas.height - h;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, y, canvas.width, h);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Lat: ${Number(latitude).toFixed(6)}  Lng: ${Number(longitude).toFixed(6)}`, 8, y + 18);
  ctx.fillText(address || 'Location captured', 8, y + 34);
  ctx.fillText(new Date().toLocaleString(), 8, y + 50);
};

export default function MrfProofCapture({ onSubmit, onCancel, submitLabel = 'Submit proof', submitDisabled = false }) {
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [cameraType, setCameraType] = useState(null);
  const [stream, setStream] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const startCamera = async (type) => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      setCameraType(type);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = s;
      }, 100);
    } catch (err) {
      console.error(err);
      toast.error('Camera access denied or unavailable.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraType(null);
  };

  const captureWithLocation = async (type) => {
    if (!videoRef.current || !stream) return;
    setCapturing(true);
    try {
      const location = await getCurrentLocation();
      toast.loading('Getting address...', { id: 'geo' });
      const address = await reverseGeocode(location.latitude, location.longitude);
      toast.dismiss('geo');

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      drawLocationOnCanvas(ctx, canvas, location, address);

      const blob = await new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.9));
      if (!blob) throw new Error('Failed to create image');

      setUploading(true);
      const formData = new FormData();
      formData.append('photo', blob, `mrf-proof-${type}-${Date.now()}.jpg`);
      const { data } = await api.post('/upload/toilet-photo', formData);
      const url = data?.data?.url || data?.url;
      if (!url) throw new Error('No URL returned');

      const proofItem = {
        photo_url: url,
        lat: location.latitude,
        lng: location.longitude,
        address: address || undefined
      };
      if (type === 'before') setBefore(proofItem);
      else setAfter(proofItem);
      stopCamera();
      toast.success(`${type === 'before' ? 'Before' : 'After'} photo captured with location`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Capture failed. Enable location and camera.');
    } finally {
      setCapturing(false);
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!before || !after) {
      toast.error('Please capture both before and after photos with location');
      return;
    }
    onSubmit({
      before: { photo_url: before.photo_url, lat: before.lat, lng: before.lng, address: before.address },
      after: { photo_url: after.photo_url, lat: after.lat, lng: after.lng, address: after.address },
      remarks: remarks.trim() || undefined
    });
  };

  return (
    <div className="space-y-4">
      {/* Before photo */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Before photo (with live location)</label>
        {before ? (
          <div className="relative inline-block rounded-lg overflow-hidden border border-gray-200">
            <img src={before.photo_url} alt="Before" className="max-h-32 object-cover" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-1.5">
              <div>Lat: {Number(before.lat).toFixed(5)} Lng: {Number(before.lng).toFixed(5)}</div>
              {before.address && <div className="truncate">{before.address}</div>}
            </div>
            <button type="button" onClick={() => setBefore(null)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => startCamera('before')} className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600">
            <Camera className="w-5 h-5" /> Capture before photo
          </button>
        )}
      </div>

      {/* After photo */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">After photo (with live location)</label>
        {after ? (
          <div className="relative inline-block rounded-lg overflow-hidden border border-gray-200">
            <img src={after.photo_url} alt="After" className="max-h-32 object-cover" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-1.5">
              <div>Lat: {Number(after.lat).toFixed(5)} Lng: {Number(after.lng).toFixed(5)}</div>
              {after.address && <div className="truncate">{after.address}</div>}
            </div>
            <button type="button" onClick={() => setAfter(null)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => startCamera('after')} className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600">
            <Camera className="w-5 h-5" /> Capture after photo
          </button>
        )}
      </div>

      {/* Single camera view when capturing */}
      {cameraType && (
        <div className="space-y-2 rounded-lg border border-gray-200 p-2 bg-gray-50">
          <p className="text-xs font-medium text-gray-600">Capturing {cameraType} photo — location will be on image</p>
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => captureWithLocation(cameraType)} disabled={capturing || uploading} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              <Camera className="w-4 h-4" /> {capturing || uploading ? 'Capturing...' : 'Capture with location'}
            </button>
            <button type="button" onClick={stopCamera} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Remarks (optional)</label>
        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Additional notes..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[60px]" rows={2} />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
        <button type="button" onClick={handleSubmit} disabled={!before || !after || submitDisabled} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          <Check className="w-4 h-4" /> {submitLabel}
        </button>
      </div>
    </div>
  );
}
