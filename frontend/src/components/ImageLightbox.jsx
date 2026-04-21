import { useState, useEffect, useCallback } from 'react'

/**
 * ImageLightbox - Full-screen overlay when clicking thread/reply images.
 * Usage: <ImageLightbox src={url} alt={text} />
 */
const ImageLightbox = ({ src, alt, className, style }) => {
  const [isOpen, setIsOpen] = useState(false)

  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, close])

  return (
    <>
      <img
        src={src}
        alt={alt || ''}
        className={className}
        style={{ ...style, cursor: 'pointer' }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(true)
        }}
      />
      {isOpen && (
        <div className="lightbox-overlay" onClick={close}>
          <button className="lightbox-close" onClick={close}>X</button>
          <img
            src={src}
            alt={alt || ''}
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

export default ImageLightbox
