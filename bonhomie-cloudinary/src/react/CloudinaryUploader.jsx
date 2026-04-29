import React, { useRef, useState, useEffect } from 'react';
import useCloudinaryUpload from './useCloudinaryUpload';
import './cloudinary-uploader.css';

export default function CloudinaryUploader(props) {
  const { images, progress, uploading, errors, upload, removeImage, reorderImages } =
    useCloudinaryUpload(props);

  const fileInput = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState(null);
  // at top of file
  const [dragIndex, setDragIndex] = useState(null);

  // new handlers:
  const handleDragStart = (index) => () => {
    setDragIndex(index);
  };

  const handleDragEnter = (index) => (e) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const newOrder = [...images];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, moved);
    reorderImages(newOrder);
    setDragIndex(index);
  };

  const handleDropReorder = (e) => {
    e.preventDefault();
    setDragIndex(null);
  };

  useEffect(() => {
    if (!errors || errors.length === 0) return;
    const last = errors[errors.length - 1];
    setToast(last);
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [errors]);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    upload(files);
  };

  const triggerFile = () => {
    if (fileInput.current) fileInput.current.click();
  };

  const onSelectFiles = (e) => {
    const files = e.target.files;
    upload(files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="bon-cloud-container">
      {/* Toast */}
      {toast && <div className="bon-toast">{toast}</div>}

      {/* Drop Zone */}
      <div
        className={`bon-dropzone ${isDragging ? 'bon-dropzone--active' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={triggerFile}
      >
        <p className="bon-dropzone-text">
          Drag & Drop or <span className="bon-dropzone-highlight">Click</span>{' '}
          to Upload
        </p>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={onSelectFiles}
          accept="image/*"
        />
      </div>

      {/* Progress */}
      {uploading && (
        <div className="bon-progress">
          <div className="bon-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Static error list (optional) */}
      {errors.length > 0 && (
        <div className="bon-errors">
          {errors.map((err, i) => (
            <p key={i} className="bon-error-item">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Image Grid */}
      <div
        className="bon-grid"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropReorder}
      >
        {images.map((img, i) => (
          <div
            key={img.publicId || i}
            className="bon-item"
            draggable
            onDragStart={handleDragStart(i)}
            onDragEnter={handleDragEnter(i)}
          >
            <img
              src={img.thumbnail || img.url}
              alt=""
              className="bon-item-img"
            />
            {img.warnings && img.warnings.length > 0 && (
              <div className="bon-item-warnings">
                {img.warnings.map((w, idx) => (
                  <span key={idx} className="bon-warning-badge">
                    {w}
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => removeImage(img.publicId)}
              className="bon-remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
