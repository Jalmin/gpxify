import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Github, Heart, Send, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { API_BASE_URL } from '@/services/api';

export function Footer() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/contact/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Erreur envoi');

      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur mt-12">
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-semibold mb-3">GPX Ninja</h3>
            <p className="text-sm text-muted-foreground">
              L'outil tout-en-un pour analyser, fusionner et optimiser vos traces GPX de trail.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-3">Liens utiles</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/faq" className="text-muted-foreground hover:text-primary transition-colors">
                  FAQ / Aide
                </Link>
              </li>
              <li>
                <Link to="/legal" className="text-muted-foreground hover:text-primary transition-colors">
                  Mentions légales & Confidentialité
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Jalmin/gpxify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  <Github className="w-4 h-4" />
                  Code source
                </a>
              </li>
            </ul>
          </div>

          {/* Open Source */}
          <div>
            <h3 className="font-semibold mb-3">Projet Open Source</h3>
            <p className="text-sm text-muted-foreground mb-3">
              GPX Ninja est gratuit, sans publicité et respectueux de votre vie privée.
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Fait avec <Heart className="w-4 h-4 text-red-500 fill-red-500" /> pour la communauté trail
            </p>
          </div>

          {/* Contact Form */}
          <div>
            <h3 className="font-semibold mb-3">Nous contacter</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Votre nom"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="email"
                placeholder="Votre email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <textarea
                placeholder="Votre message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                rows={3}
                className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />

              {submitStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <Check className="w-4 h-4" />
                  <span>Message envoyé !</span>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Erreur d'envoi</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                size="sm"
                className="w-full gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Send className="w-4 h-4 animate-pulse" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} GPX Ninja - Tous droits réservés</p>
        </div>
      </div>
    </footer>
  );
}
