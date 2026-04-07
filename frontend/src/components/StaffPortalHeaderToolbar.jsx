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
            className="md:hidden fixed inset-0 z-[75] bg-black/40"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div className="md:hidden fixed top-0 right-0 bottom-0 z-[80] w-[min(100%,20rem)] bg-white shadow-xl flex flex-col border-l border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <span className="text-sm font-semibold text-gray-900">Menu</span>
              <button
                type="button"
                onClick={closeMenu}
                className="header-icon-btn p-2 text-gray-500 hover:text-gray-800 rounded-full"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-lg font-bold">
                    {userInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{userTitle}</p>
                    <p className="text-xs text-gray-500 truncate">{userSubtitle}</p>
                    {userExtra ? <div className="mt-1">{userExtra}</div> : null}
                  </div>
                </div>
              </div>

              <nav className="py-2" aria-label="Portal navigation">
                <button
                  type="button"
                  onClick={goHome}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 border-b border-gray-50"
                >
                  <Home className="w-5 h-5 text-gray-500 shrink-0" />
                  Dashboard home
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onProfile();
                    closeMenu();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 border-b border-gray-50"
                >
                  <User className="w-5 h-5 text-gray-500 shrink-0" />
                  My profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    closeMenu();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  Logout
                </button>
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
