"use client"

/**
 * Custom Logo for Payload Admin branding (Faza 30e).
 * Renders the Langlion brand mark in the admin login screen and sidebar.
 */
export function AdminLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="28" height="28" rx="6" fill="currentColor" />
        <text
          x="14"
          y="19"
          textAnchor="middle"
          fill="white"
          fontSize="14"
          fontWeight="700"
          fontFamily="system-ui"
        >
          L
        </text>
      </svg>
      <span className="text-base font-semibold">Langlion CMS</span>
    </div>
  )
}
