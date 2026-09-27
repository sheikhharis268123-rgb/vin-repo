import React, { useState, useEffect } from 'react';
import { VinWheelerLogo } from './VinWheelerLogo';
import { ShieldCheck, ChevronDown, ChevronUp, Menu, X, Check } from 'lucide-react';
import { adminStore, CountryMarketConfig } from '../services/adminStore';

interface NavbarProps {
  onNavigate: (page: string) => void;
  activePage: string;
  onGetStarted: () => void;
  savedReportsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  activePage,
  onGetStarted,
}) => {
  const [markets, setMarkets] = useState<CountryMarketConfig[]>(() => adminStore.getCurrencySettings().markets);
  const [selectedCountry, setSelectedCountry] = useState<CountryMarketConfig>(() => adminStore.getActiveMarket());
  const [currencyMode, setCurrencyMode] = useState<'auto_country' | 'forced_currency'>(
    () => adminStore.getCurrencySettings().mode
  );
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Auto-detect visitor country by Geo-IP on first visit if in auto mode
    adminStore.detectVisitorCountryByGeo().then((detected) => {
      setSelectedCountry(detected);
    });

    const syncCurrency = () => {
      const settings = adminStore.getCurrencySettings();
      setMarkets(settings.markets);
      setCurrencyMode(settings.mode);
      setSelectedCountry(adminStore.getActiveMarket());
    };

    window.addEventListener('wc_currency_updated', syncCurrency);
    window.addEventListener('wc_packages_updated', syncCurrency);
    return () => {
      window.removeEventListener('wc_currency_updated', syncCurrency);
      window.removeEventListener('wc_packages_updated', syncCurrency);
    };
  }, []);

  const handleSelectMarket = (market: CountryMarketConfig) => {
    if (currencyMode === 'forced_currency') {
      // If admin had forced a currency, switching in navbar switches the visitor country & sets mode to auto_country so visitor can see their country's pricing
      const currentSettings = adminStore.getCurrencySettings();
      adminStore.saveCurrencySettings({
        ...currentSettings,
        mode: 'auto_country',
      });
    }
    adminStore.setVisitorCountryCode(market.countryCode);
    setSelectedCountry(market);
    setIsCountryOpen(false);
  };

  return (
    <header className="relative w-full z-40 bg-black/40 backdrop-blur-md border-b border-white/5">
      {/* Top micro bar: NETWORK LIVE | OFFICIAL DATA NODE */}
      <div className="w-full px-4 sm:px-8 py-1.5 flex items-center justify-end sm:justify-between text-[11px] font-mono tracking-wider text-slate-300/80 border-b border-white/5">
        <div className="hidden sm:flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            NETWORK LIVE
          </span>
          <span className="text-white/20">|</span>
          <span className="flex items-center gap-1 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
            OFFICIAL DATA NODE: {selectedCountry.countryCode} • {selectedCountry.currencyCode} ({selectedCountry.currencySymbol.trim()})
          </span>
        </div>

        {/* Country & Currency Selector */}
        <div className="relative">
          <button
            onClick={() => setIsCountryOpen(!isCountryOpen)}
            className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#272a33] hover:bg-[#323642] border border-white/10 text-white transition-all shadow-sm cursor-pointer"
          >
            <span className="text-sm">{selectedCountry.flag}</span>
            <span className="font-black tracking-wider text-[11px] sm:text-xs text-white uppercase">
              {selectedCountry.countryName}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-400 font-mono font-bold text-[10px] border border-yellow-400/30">
              {selectedCountry.currencyCode}
            </span>
            {isCountryOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-yellow-400 stroke-[3]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-yellow-400 stroke-[3]" />
            )}
          </button>

          {isCountryOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#14161b] border border-white/10 rounded-2xl shadow-2xl p-3.5 sm:p-4 z-50 animate-fadeIn max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  SELECT COUNTRY &amp; CURRENCY
                </span>
                <span className="text-[10px] font-mono text-yellow-400 font-bold">
                  {selectedCountry.currencyCode} ({selectedCountry.currencySymbol.trim()})
                </span>
              </div>
              <div className="h-[1px] bg-white/10 mb-2.5" />
              <div className="space-y-1.5">
                {markets.map((market) => {
                  const isSelected = selectedCountry.countryCode === market.countryCode;
                  return (
                    <button
                      key={market.countryCode}
                      onClick={() => handleSelectMarket(market)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-black tracking-wider uppercase transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'border border-yellow-500/70 bg-[#1e2017] text-yellow-400 shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-base">{market.flag}</span>
                        <span className="truncate">{market.countryName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-200">
                          {market.currencyCode} ({market.currencySymbol.trim()})
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-yellow-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Brand Zone */}
        <VinWheelerLogo onClick={() => onNavigate('home')} />

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-8 text-[13px] font-bold tracking-widest text-slate-200">
          <button
            onClick={() => onNavigate('history')}
            className={`hover:text-yellow-400 transition-colors uppercase ${
              activePage === 'history' ? 'text-yellow-400' : ''
            }`}
          >
            HISTORY
          </button>
          <button
            onClick={() => onNavigate('pricing')}
            className={`hover:text-yellow-400 transition-colors uppercase ${
              activePage === 'pricing' ? 'text-yellow-400' : ''
            }`}
          >
            PRICING
          </button>
          <button
            onClick={() => onNavigate('faq')}
            className={`hover:text-yellow-400 transition-colors uppercase ${
              activePage === 'faq' ? 'text-yellow-400' : ''
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => onNavigate('support')}
            className={`hover:text-yellow-400 transition-colors uppercase ${
              activePage === 'support' ? 'text-yellow-400' : ''
            }`}
          >
            SUPPORT
          </button>
        </nav>

        {/* Primary Action Button: GET STARTED */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={onGetStarted}
            className="px-6 py-2.5 rounded-full bg-white hover:bg-yellow-400 text-black font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-yellow-400/20 active:scale-95"
          >
            GET STARTED
          </button>
        </div>

        {/* Mobile menu hamburger */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={onGetStarted}
            className="px-3.5 py-1.5 rounded-full bg-white text-black font-bold text-xs uppercase"
          >
            START
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0c121d] border-b border-white/10 px-6 py-4 space-y-3 font-semibold text-sm">
          <button
            onClick={() => {
              onNavigate('history');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-slate-200 hover:text-yellow-400"
          >
            HISTORY
          </button>
          <button
            onClick={() => {
              onNavigate('pricing');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-slate-200 hover:text-yellow-400"
          >
            PRICING
          </button>
          <button
            onClick={() => {
              onNavigate('faq');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-slate-200 hover:text-yellow-400"
          >
            FAQ
          </button>
          <button
            onClick={() => {
              onNavigate('support');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-slate-200 hover:text-yellow-400"
          >
            SUPPORT
          </button>
        </div>
      )}
    </header>
  );
};
