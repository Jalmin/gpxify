import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { shareApi } from '@/services/api';

interface ShareButtonProps {
  appState: Record<string, any>;
  className?: string;
}

export function ShareButton({ appState, className }: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setIsSharing(true);
    setError(null);

    try {
      const response = await shareApi.saveState(appState);

      if (response.success) {
        // Build full URL with current origin
        const fullUrl = `${window.location.origin}/share/${response.share_id}`;
        setShareUrl(fullUrl);
        setExpiresAt(new Date(response.expires_at).toLocaleDateString('fr-FR'));
        setIsModalOpen(true);
      }
    } catch (err: any) {
      console.error('Share error:', err);
      setError(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
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
    setExpiresAt('');
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
            <strong>Note :</strong> Ce lien expirera le {expiresAt}. Aucun compte n'est
            nécessaire pour y accéder.
          </div>
        </div>
      </Modal>
    </>
  );
}
