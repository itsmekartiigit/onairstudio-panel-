import { useCallback, useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import QRCode from 'qrcode'
import { Clock, Copy, Link2, QrCode, RefreshCw, Share2, ShieldOff } from 'lucide-react'
import { functions } from '../Firebase'
import { getAlbumViewUrl } from '../services/albumShareUrl'
import './AlbumShareManager.css'

interface Props {
  albumId: string
}

interface LinkStatus {
  hasLink: boolean
  status: string
  expiresAt: string | null
  createdAt?: string | null
}

const localLinkKey = (albumId: string) => `onair_album_share_url_${albumId}`

const getLocalDateTime = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function AlbumShareManager({ albumId }: Props) {
  const [linkStatus, setLinkStatus] = useState<LinkStatus | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [expiry, setExpiry] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const loadStatus = useCallback(async () => {
    try {
      const callable = httpsCallable<{ albumId: string }, LinkStatus>(functions, 'getAlbumShareLinkStatus')
      const result = await callable({ albumId })
      setLinkStatus(result.data)
      setExpiry(getLocalDateTime(result.data.expiresAt))
      if (result.data.status !== 'active') {
        setShareUrl('')
        localStorage.removeItem(localLinkKey(albumId))
      } else {
        const savedUrl = localStorage.getItem(localLinkKey(albumId)) ?? ''
        try {
          const albumViewUrl = getAlbumViewUrl(savedUrl)
          setShareUrl(albumViewUrl)
          localStorage.setItem(localLinkKey(albumId), albumViewUrl)
        } catch {
          setShareUrl('')
        }
      }
    } catch (cause) {
      console.error('Unable to load album link status:', cause)
      setMessage('Unable to load sharing settings.')
    }
  }, [albumId])

  useEffect(() => {
    setShareUrl('')
    setMessage('')
    setLinkStatus(null)
    void loadStatus()
  }, [albumId, loadStatus])

  useEffect(() => {
    let cancelled = false
    if (!shareUrl) {
      setQrCode('')
      return () => { cancelled = true }
    }
    void QRCode.toDataURL(shareUrl, { width: 240, margin: 2 })
      .then((dataUrl) => { if (!cancelled) setQrCode(dataUrl) })
      .catch(() => { if (!cancelled) setQrCode('') })
    return () => { cancelled = true }
  }, [shareUrl])

  const generateLink = async () => {
    if (loading) return
    setLoading(true)
    setMessage('')
    try {
      const callable = httpsCallable<
        { albumId: string; linkExpiresAt?: string },
        { success: boolean; url: string; expiresAt: string; accessMode: 'direct' }
      >(functions, 'generateAlbumShareLink')
      const result = await callable({ albumId, linkExpiresAt: expiry ? new Date(expiry).toISOString() : undefined })
      const albumViewUrl = getAlbumViewUrl(result.data.url)
      setShareUrl(albumViewUrl)
      localStorage.setItem(localLinkKey(albumId), albumViewUrl)
      setExpiry(getLocalDateTime(result.data.expiresAt))
      setMessage('New album link generated successfully.')
      await loadStatus()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to generate link.')
    } finally {
      setLoading(false)
    }
  }

  const updateExpiry = async () => {
    if (!expiry) {
      setMessage('Select a link expiration date and time.')
      return
    }
    if (loading) return
    setLoading(true)
    setMessage('')
    try {
      const callable = httpsCallable<
        { albumId: string; linkExpiresAt: string },
        { success: boolean; expiresAt: string }
      >(functions, 'updateAlbumShareLinkExpiry')
      const result = await callable({ albumId, linkExpiresAt: new Date(expiry).toISOString() })
      setExpiry(getLocalDateTime(result.data.expiresAt))
      setMessage('Link expiration updated successfully.')
      await loadStatus()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to update expiration.')
    } finally {
      setLoading(false)
    }
  }

  const disableLink = async () => {
    if (loading || !window.confirm('Disable this album sharing link?')) return
    setLoading(true)
    setMessage('')
    try {
      const callable = httpsCallable<{ albumId: string }, { success: boolean }>(functions, 'revokeAlbumShareLink')
      await callable({ albumId })
      setShareUrl('')
      localStorage.removeItem(localLinkKey(albumId))
      setMessage('Album sharing link disabled.')
      await loadStatus()
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to disable link.')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setMessage('Album link copied.')
    } catch {
      setMessage('Unable to copy the link. Check clipboard permissions.')
    }
  }

  const active = linkStatus?.status === 'active'
  const statusLabel = linkStatus?.status === 'active'
    ? 'Active'
    : linkStatus?.status === 'expired'
      ? 'Expired'
      : linkStatus?.status === 'revoked'
        ? 'Disabled'
        : 'Not generated'

  return (
    <section className="album-share-card">
      <div className="album-share-header">
        <div className="album-share-icon"><Link2 size={21} aria-hidden="true" /></div>
        <div>
          <h3>Album sharing</h3>
          <p>Manage your guest album access link</p>
        </div>
        <span className={`share-status ${active ? 'active' : 'inactive'}`}>{statusLabel}</span>
      </div>

      <div className="share-access-box">
        <div className="share-access-title">
          <span>Direct link access</span>
          <span className="direct-badge">No PIN required</span>
        </div>
        <p>Anyone with the active link can view this album.</p>
      </div>

      {shareUrl && active && (
        <div className="share-url-box">
          <span>{shareUrl}</span>
          <button type="button" onClick={() => void copyLink()} disabled={loading}>
            <Copy size={16} aria-hidden="true" /> Copy
          </button>
        </div>
      )}

      {shareUrl && active && (
        <div className="share-tools">
          {qrCode && <img className="share-qr" src={qrCode} alt="QR code for guest album link" />}
          <div className="share-actions">
            <button className="share-primary" type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')}>
              <Share2 size={16} aria-hidden="true" /> Share via WhatsApp
            </button>
            {qrCode && <a className="share-secondary" href={qrCode} download={`album-${albumId}-qr.png`}>
              <QrCode size={16} aria-hidden="true" /> Download QR code
            </a>}
          </div>
        </div>
      )}

      <div className="share-expiry">
        <label htmlFor={`album-link-expiry-${albumId}`}>
          <Clock size={16} aria-hidden="true" /> Link expiration date and time
        </label>
        <input
          id={`album-link-expiry-${albumId}`}
          type="datetime-local"
          value={expiry}
          onChange={(event) => setExpiry(event.target.value)}
          disabled={loading}
        />
        <small>Link expiry cannot be later than the album expiration date.</small>
      </div>

      <div className="share-actions">
        {active ? (
          <>
            <button className="share-primary" type="button" onClick={() => void updateExpiry()} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" /> Update expiration
            </button>
            {!shareUrl && <button className="share-primary" type="button" onClick={() => void generateLink()} disabled={loading}>
              <Link2 size={16} aria-hidden="true" /> Generate replacement link
            </button>}
            <button className="share-danger" type="button" onClick={() => void disableLink()} disabled={loading}>
              <ShieldOff size={16} aria-hidden="true" /> Disable link
            </button>
          </>
        ) : (
          <button className="share-primary" type="button" onClick={() => void generateLink()} disabled={loading}>
            <Link2 size={16} aria-hidden="true" /> {loading ? 'Please wait…' : 'Generate album link'}
          </button>
        )}
      </div>

      {message && <p className="share-message" role="status">{message}</p>}
    </section>
  )
}
