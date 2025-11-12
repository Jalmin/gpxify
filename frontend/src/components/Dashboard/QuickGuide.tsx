export function QuickGuide() {
  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4">
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="text-xl sm:text-2xl flex-shrink-0">💡</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Que voulez-vous faire ?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-start sm:items-center gap-2">
              <span className="text-primary font-medium whitespace-nowrap">📊 Analyser :</span>
              <span className="text-muted-foreground">Stats, carte, profil</span>
            </div>
            <div className="flex items-start sm:items-center gap-2">
              <span className="text-primary font-medium whitespace-nowrap">🔀 Fusionner :</span>
              <span className="text-muted-foreground">Combinez plusieurs traces</span>
            </div>
            <div className="flex items-start sm:items-center gap-2">
              <span className="text-primary font-medium whitespace-nowrap">⏱️ Prévisions :</span>
              <span className="text-muted-foreground">Tableau ravitaillements</span>
            </div>
            <div className="flex items-start sm:items-center gap-2">
              <span className="text-primary font-medium whitespace-nowrap">🔋 Sauve :</span>
              <span className="text-muted-foreground">Batterie vide ?</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
