// Wird bei jeder Navigation neu gemountet -> sanfter Fade-In des Seiteninhalts.
// (Header/Nav liegen im Layout und bleiben stabil.)
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
