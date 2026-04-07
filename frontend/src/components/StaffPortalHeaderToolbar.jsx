import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Home, User, LogOut, Search } from 'lucide-react';
import GlobalHeaderSearch from './GlobalHeaderSearch';
import HeaderNotificationBell from './HeaderNotificationBell';

/**
 * Desktop (md+): icon row only (search lives in StaffPortalHeaderRow center).
 * Mobile: search icon opens slide-down panel; hamburger opens side menu (no duplicate search in menu).
 */
export default function StaffPortalHeaderToolbar({
  searchRole,
  dashboardPath,
  userInitial,
  userTitle,
  userSubtitle,
  userExtra,
  onProfile,
  onLogout
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchSliderOpen, setSearchSliderOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen && !searchSliderOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen, searchSliderOpen]);

  useEffect(() => {
    if (!searchSliderOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setSearchSliderOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searchSliderOpen]);

  const closeMenu = () => setMenuOpen(false);
  const closeSearchSlider = () => setSearchSliderOpen(false);

  const goHome = () => {
    navigate(dashboardPath);
    closeMenu();
  };

  const openMenu = () => {
    setSearchSliderOpen(false);
    setMenuOpen(true);
  };

  const openSearchSlider = () => {
    setMenuOpen(false);
    setSearchSliderOpen(true);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
      <div className="hidden md:flex items-center gap-2 lg:gap-4 layout-header-actions">
        <button
          type="button"
          onClick={() => navigate(dashboardPath)}
          className="header-icon-btn p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
          title="Dashboard Home"
        >
          <Home className="w-5 h-5 shrink-0" />
        </button>
        <HeaderNotificationBell />
        <div className="hidden md:flex items-center space-x-3 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 max-w-[14rem]">
          <div className="h-8 w-8 shrink-0 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-sm font-bold">
            {userInitial}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-gray-900 truncate">{userTitle}</span>
            <span className="text-xs text-gray-500 truncate">{userSubtitle}</span>
            {userExtra}
          </div>
        </div>
        <button
          type="button"
          onClick={onProfile}
          className="header-icon-btn p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
          title="My Profile"
        >
          <User className="w-5 h-5 shrink-0" />
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="header-icon-btn p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center"
          title="Logout"
        >
          <LogOut className="w-5 h-5 shrink-0" />
        </button>
      </div>

      <div className="md:hidden flex items-center gap-0.5">
        <HeaderNotificationBell elevatedDropdown />
        <button
          type="button"
          className="header-icon-btn p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center shrink-0"
          onClick={() => (searchSliderOpen ? closeSearchSlider() : openSearchSlider())}
          aria-expanded={searchSliderOpen}
          aria-label={searchSliderOpen ? 'Close search' : 'Open search'}
        >
          {searchSliderOpen ? <X className="w-5 h-5 shrink-0" /> : <Search className="w-5 h-5 shrink-0" />}
        </button>
        <button
          type="button"
          className="header-icon-btn p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center shrink-0"
          onClick={() => (menuOpen ? closeMenu() : openMenu())}
          aria-expanded={menuOpen}
          aria-label="Open navigation menu"
        >
          {menuOpen ? <X className="w-6 h-6 shrink-0" /> : <Menu className="w-6 h-6 shrink-0" />}
        </button>
      </div>

      {searchSliderOpen && (
        <>
          <button
            type="button"
            className="md:hidden fixed inset-0 top-16 z-[84] bg-black/35"
            aria-label="Close search"
            onClick={closeSearchSlider}
          />
          <div className="md:hidden fixed left-0 right-0 top-16 z-[85] bg-white border-b border-gray-200 shadow-lg animate-header-search-slide">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-900">Global search</span>
                <button
                  type="button"
                  onClick={closeSearchSlider}
                  className="header-icon-btn p-2 text-gray-500 hover:text-gray-800 rounded-full"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <GlobalHeaderSearch
                role={searchRole}
                embeddedInMenu
                onAfterSelect={closeSearchSlider}
              />
            </div>
          </div>
        </>
      )}

      {menuOpen && (
        <>
          <button
            type="button"
            className="md:hidden fixed inset-0 z-[75] bg-black/20 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div className="md:hidden fixed top-16 right-4 z-[80] w-64 bg-white/95 backdrop-blur-md shadow-2xl flex flex-col border border-gray-100 rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-base font-bold">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{userTitle}</p>
                  <p className="text-[10px] text-gray-500 truncate uppercase tracking-wider font-medium">{userSubtitle}</p>
                </div>
              </div>
            </div>

            <nav className="py-1.5" aria-label="Portal navigation">
              <button
                type="button"
                onClick={goHome}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-primary-50/50 hover:text-primary-700 transition-colors"
              >
                <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-white">
                  <Home className="w-4 h-4 text-gray-500 shrink-0" />
                </div>
                Dashboard 
              </button>

              <button
                type="button"
                onClick={() => {
                  onProfile();
                  closeMenu();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-primary-50/50 hover:text-primary-700 transition-colors"
              >
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <User className="w-4 h-4 text-gray-500 shrink-0" />
                </div>
                My Profile
              </button>

              <div className="my-1 border-t border-gray-100"></div>

              <button
                type="button"
                onClick={() => {
                  onLogout();
                  closeMenu();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <div className="p-1.5 bg-red-50 rounded-lg">
                  <LogOut className="w-4 h-4 text-red-600 shrink-0" />
                </div>
                Logout
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
