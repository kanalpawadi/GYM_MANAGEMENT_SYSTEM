import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { useAuth } from '../../context/AuthContext';
import { uploadAvatar } from '../../services/portal';

/** The signed-in user's photo with a camera button to upload a new one. */
export const ProfilePhotoPicker: React.FC<{ size?: 'md' | 'lg' | 'xl'; showError?: boolean }> = ({ size = 'xl', showError = true }) => {
  const { profile, refreshProfile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file?: File) => {
    if (!file || !profile) return;
    setError('');
    setUploading(true);
    try {
      await uploadAvatar(profile.id, file);
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Could not upload photo');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <Avatar src={profile?.avatar_url} name={profile?.full_name} size={size} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gold-gradient text-black shadow-lg disabled:opacity-60"
          aria-label="Change profile photo"
          title="Change profile photo"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Upload profile photo"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {showError && error && <span role="alert" className="text-xs text-gym-danger max-w-[220px] text-center">{error}</span>}
    </div>
  );
};
