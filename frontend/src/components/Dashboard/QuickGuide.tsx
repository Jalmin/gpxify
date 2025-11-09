export function QuickGuide() {
  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">💡</div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-2">Que voulez-vous faire ?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-primary font-medium">📊 Analyser :</span>
              <span className="text-muted-foreground">Stats, carte, profil</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary font-medium">🔀 Fusionner :</span>
              <span className="text-muted-foreground">Combinez plusieurs traces</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary font-medium">⏱️ Prévisions :</span>
              <span className="text-muted-foreground">Tableau ravitaillements</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary font-medium">🔋 Sauve ma course :</span>
              <span className="text-muted-foreground">Batterie vide ?</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
