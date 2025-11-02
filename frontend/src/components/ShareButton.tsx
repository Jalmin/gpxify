import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import pako from 'pako';

interface ShareButtonProps {
  appState: Record<string, any>;
  className?: string;
}

/**
 * Compress and encode app state into URL-safe string
 * Uses pako (zlib) for compression and base64url encoding
 */
function encodeState(state: Record<string, any>): string {
  try {
    // Convert to JSON string
    const jsonStr = JSON.stringify(state);

    // Compress using deflate
    const compressed = pako.deflate(jsonStr, { level: 9 });

    // Convert to base64url (URL-safe base64)
    const base64 = btoa(String.fromCharCode(...compressed));
    const base64url = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return base64url;
  } catch (error) {
    console.error('Failed to encode state:', error);
    throw new Error('Impossible de compresser les données');
  }
}

export function ShareButton({ appState, className }: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setIsSharing(true);
    setError(null);

    try {
      // Encode state into URL parameter
      const encoded = encodeState(appState);

      // Check if URL is too long (browsers typically support ~2000 chars)
      const fullUrl = `${window.location.origin}/share?state=${encoded}`;
      if (fullUrl.length > 2000) {
        throw new Error('État trop volumineux pour être partagé par URL. Essayez de supprimer certains fichiers.');
      }

      setShareUrl(fullUrl);
      setIsModalOpen(true);
    } catch (err: any) {
      console.error('Share error:', err);
      setError(err.message || 'Erreur lors de la création du lien');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setShareUrl('');
    setCopied(false);
    setError(null);
  };

  return (
    <>
      <Button
        onClick={handleShare}
        disabled={isSharing}
        variant="outline"
        className={className}
      >
        <Share2 className="w-4 h-4 mr-2" />
        {isSharing ? 'Sauvegarde...' : 'Partager'}
      </Button>

      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive max-w-md">
          {error}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title="Partager votre travail"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Votre travail a été sauvegardé ! Partagez ce lien pour y accéder :
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-muted border border-border rounded-md text-sm font-mono"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button onClick={handleCopy} variant="outline" className="gap-2">
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copier
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
            <strong>Note :</strong> Ce lien contient l'intégralité de votre travail encodé dans l'URL.
            Aucune donnée n'est stockée sur nos serveurs. Le lien ne nécessite pas de compte pour y accéder.
          </div>
        </div>
      </Modal>
    </>
  );
}
