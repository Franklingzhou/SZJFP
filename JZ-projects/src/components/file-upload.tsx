'use client';

import { useState, useRef, useCallback } from 'react';

interface FileUploadProps {
  category: 'avatar' | 'idcard' | 'photo' | 'general';
  label: string;
  currentUrl?: string;
  onUploaded: (data: { key: string; url: string }) => void;
  accept?: string;
  disabled?: boolean;
}

export function FileUpload({
  category,
  label,
  currentUrl,
  onUploaded,
  accept = 'image/jpeg,image/png,image/webp',
  disabled = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(currentUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError('');
      setUploading(true);

      try {
        // Show local preview immediately
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || '上传失败');
        }

        // Use the presigned URL from server response
        setPreviewUrl(data.data.url);
        onUploaded({ key: data.data.key, url: data.data.url });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '上传失败';
        setError(message);
        // Revert preview
        setPreviewUrl(currentUrl || '');
      } finally {
        setUploading(false);
      }
    },
    [category, currentUrl, onUploaded]
  );

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-3">
        {previewUrl && (
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
            <img
              src={previewUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={uploading || disabled}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? '上传中...' : previewUrl ? '更换' : '选择文件'}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
