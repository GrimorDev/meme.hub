
import React, { useState } from 'react';
import { Monitor, Download, Shield, Zap, Star, ArrowLeft, CheckCircle2, Info, AlertTriangle, ChevronDown, ChevronUp, PartyPopper } from 'lucide-react';

// Sprawdź czy uruchomione jako Electron desktop
const isDesktopApp = () => navigator.userAgent.includes('MemsterDesktop');

interface DownloadsPageProps {
  onBack: () => void;
}

const DownloadsPage: React.FC<DownloadsPageProps> = ({ onBack }) => {
  const [smartscreenOpen, setSmartscreenOpen] = useState(false);
  const desktop = isDesktopApp();

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = '/downloads/Memster-Setup.exe';
    a.download = 'Memster-Setup.exe';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Powrót */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 text-sm font-bold"
      >
        <ArrowLeft size={16} />
        Wróć do feedu
      </button>

      {/* Banner gdy uruchomione jako Electron */}
      {desktop && (
        <div className="bg-purple-950/30 border border-purple-700/40 rounded-2xl p-6 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center shrink-0">
            <PartyPopper size={24} className="text-purple-400" />
          </div>
          <div>
            <p className="text-base font-black text-purple-200">Już masz aplikację desktopową!</p>
            <p className="text-xs text-purple-500 mt-1">
              Korzystasz właśnie z Memster Desktop. Nie musisz nic pobierać — jesteś w domu 🏠
            </p>
          </div>
        </div>
      )}

      {/* Nagłówek */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-1">
          Aplikacja desktopowa
        </h1>
        <p className="text-zinc-400">
          {desktop
            ? 'Informacje o aplikacji Memster Desktop.'
            : 'Pobierz Memster na swój komputer i korzystaj z pełnej funkcjonalności.'}
        </p>
      </div>

      {/* Główna karta pobierania */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
        {/* Ikona + nazwa */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center shrink-0">
            <Monitor size={32} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Memster dla Windows</h2>
            <p className="text-zinc-400 text-sm">Wersja 1.0.0 &bull; Windows 10 / 11 (x64)</p>
          </div>
        </div>

        {/* Cechy */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <FeatureBadge icon={<Shield size={15} />} text="Bezpieczna instalacja" />
          <FeatureBadge icon={<Zap size={15} />} text="Szybkie działanie" />
          <FeatureBadge icon={<Star size={15} />} text="Pełna funkcjonalność" />
        </div>

        {/* Przycisk pobierania — ukryty gdy już na desktopie */}
        {!desktop ? (
          <>
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white py-4 rounded-xl font-black text-base transition-all shadow-lg shadow-blue-600/25"
            >
              <Download size={20} />
              Pobierz Memster-Setup.exe
            </button>
            <p className="text-center text-zinc-600 text-xs mt-3">
              Instalator NSIS · ok. 80 MB
            </p>
          </>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 bg-zinc-800/50 text-zinc-500 py-4 rounded-xl font-bold text-sm border border-zinc-700/50">
            <CheckCircle2 size={16} className="text-purple-500" />
            Aplikacja już zainstalowana i uruchomiona
          </div>
        )}
      </div>

      {/* SmartScreen — ostrzeżenie i instrukcja */}
      <div className="bg-amber-950/20 border border-amber-700/40 rounded-2xl mb-4 overflow-hidden">
        <button
          onClick={() => setSmartscreenOpen(p => !p)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-amber-950/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-black text-amber-300">Windows może wyświetlić ostrzeżenie SmartScreen</p>
              <p className="text-xs text-amber-700 mt-0.5">Dowiedz się, jak bezpiecznie uruchomić aplikację</p>
            </div>
          </div>
          {smartscreenOpen
            ? <ChevronUp size={16} className="text-amber-600 shrink-0" />
            : <ChevronDown size={16} className="text-amber-600 shrink-0" />}
        </button>

        {smartscreenOpen && (
          <div className="px-5 pb-5 border-t border-amber-700/30">
            <p className="text-xs text-amber-200/70 mt-4 mb-4 leading-relaxed">
              Aplikacja <strong className="text-amber-200">Memster</strong> nie posiada płatnego certyfikatu podpisu kodu (kosztuje kilkaset dolarów rocznie),
              przez co Windows SmartScreen może wyświetlić komunikat „Nieznany wydawca" lub
              „Ta aplikacja może zaszkodzić urządzeniu". To <strong className="text-amber-200">normalne zachowanie</strong> dla
              darmowych aplikacji open-source. Poniżej instrukcja jak uruchomić mimo to:
            </p>

            <div className="space-y-3">
              <SmartscreenStep
                num={1}
                title='Kliknij „Więcej informacji"'
                desc='W dolnej części okna SmartScreen znajdziesz link „Więcej informacji" (More info). Kliknij go.'
                color="amber"
              />
              <SmartscreenStep
                num={2}
                title='Kliknij „Uruchom mimo to"'
                desc='Po rozwinięciu pojawi się przycisk „Uruchom mimo to" (Run anyway). Kliknij go, aby kontynuować instalację.'
                color="amber"
              />
              <SmartscreenStep
                num={3}
                title="Potwierdź w UAC (jeśli wymagane)"
                desc='Jeśli pojawi się okno Kontroli konta użytkownika (UAC), kliknij „Tak", aby zezwolić na instalację.'
                color="amber"
              />
            </div>

            <div className="mt-4 bg-amber-950/30 border border-amber-800/40 rounded-xl p-3">
              <p className="text-[11px] text-amber-600 leading-relaxed">
                <strong className="text-amber-500">Alternatywa:</strong> Możesz też korzystać z Memster bezpośrednio
                w przeglądarce pod adresem <strong className="text-amber-400">memster.pl</strong> — bez żadnej instalacji.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Instrukcja instalacji */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
          <Info size={14} />
          Jak zainstalować?
        </h3>
        <ol className="space-y-2.5">
          {[
            'Kliknij „Pobierz Memster-Setup.exe" powyżej',
            'Jeśli pojawi się SmartScreen — kliknij „Więcej informacji" → „Uruchom mimo to"',
            'Postępuj zgodnie z instrukcjami instalatora',
            'Uruchom Memster ze skrótu na pulpicie lub z menu Start',
            'Zaloguj się na swoje konto – sesja jest zapamiętywana',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
              <div className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-black text-blue-400">{i + 1}</span>
              </div>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Wymagania systemowe */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5">
        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
          <CheckCircle2 size={14} />
          Wymagania systemowe
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Req label="System" value="Windows 10 / 11" />
          <Req label="Architektura" value="64-bit (x64)" />
          <Req label="RAM" value="min. 512 MB" />
          <Req label="Dysk" value="ok. 250 MB" />
          <Req label="Internet" value="Wymagany" />
          <Req label="Aktualizacje" value="Automatyczne" />
        </div>
      </div>

      <p className="text-center text-zinc-700 text-xs mt-6">
        Aplikacja Memster jest bezpłatna i tworzona przez społeczność.
      </p>
    </div>
  );
};

const FeatureBadge: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-800/60 p-3 rounded-xl">
    <span className="text-blue-400 shrink-0">{icon}</span>
    <span className="text-xs font-bold text-zinc-300 leading-tight">{text}</span>
  </div>
);

const Req: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between bg-zinc-950/40 px-3 py-2 rounded-xl">
    <span className="text-zinc-500 text-xs font-bold">{label}</span>
    <span className="text-zinc-200 text-xs font-bold">{value}</span>
  </div>
);

const SmartscreenStep: React.FC<{ num: number; title: string; desc: string; color: string }> = ({ num, title, desc }) => (
  <div className="flex items-start gap-3">
    <div className="w-6 h-6 rounded-full bg-amber-700/30 border border-amber-600/40 flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-[10px] font-black text-amber-400">{num}</span>
    </div>
    <div>
      <p className="text-xs font-black text-amber-300">{title}</p>
      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default DownloadsPage;
