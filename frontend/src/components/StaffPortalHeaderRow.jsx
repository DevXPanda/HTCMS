import GlobalHeaderSearch from './GlobalHeaderSearch';
import StaffPortalHeaderToolbar from './StaffPortalHeaderToolbar';

/**
 * Full portal header: logo, centered full-width global search (desktop), toolbar (actions + mobile menu / search slider).
 */
export default function StaffPortalHeaderRow({
  searchRole,
  dashboardPath,
  userInitial,
  userTitle,
  userSubtitle,
  userExtra,
  onProfile,
  onLogout
}) {
  return (
    <div className="flex items-center gap-2 md:gap-4 h-16 min-h-[4rem] w-full min-w-0">
      <div className="flex min-w-0 flex-1 md:flex-none md:shrink-0 items-center gap-2 sm:gap-3">
        <img src="/ULB Logo.png" alt="ULB Logo" className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0" />
        <h1 className="layout-header-title">Urban Local Bodies</h1>
      </div>

      <div className="hidden md:flex flex-1 min-w-0 justify-center px-2 lg:px-6">
        <div className="w-full max-w-4xl xl:max-w-5xl min-w-0">
          <GlobalHeaderSearch role={searchRole} variant="centered" />
        </div>
      </div>

      <StaffPortalHeaderToolbar
        searchRole={searchRole}
        dashboardPath={dashboardPath}
        userInitial={userInitial}
        userTitle={userTitle}
        userSubtitle={userSubtitle}
        userExtra={userExtra}
        onProfile={onProfile}
        onLogout={onLogout}
      />
    </div>
  );
}
