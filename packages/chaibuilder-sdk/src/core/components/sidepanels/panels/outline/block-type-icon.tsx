import { get } from "lodash-es";
import React from "react";
import { useRegisteredChaiBlocks } from "~/runtime";

type Props = {
  type: string;
};

const ICON_CLASS = "h-4 w-4 flex-shrink-0";

const OutlineIcon = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 16 16" className={ICON_CLASS} fill="currentColor" aria-hidden="true">
    {children}
  </svg>
);

const logoIcon = (
  <>
    <path d="M3 4.25c0-.69.56-1.25 1.25-1.25h2a.75.75 0 0 0 0-1.5h-2a2.75 2.75 0 0 0-2.75 2.75v2a.75.75 0 0 0 1.5 0z" />
    <path d="M11.75 3c.69 0 1.25.56 1.25 1.25v2a.75.75 0 0 0 1.5 0v-2a2.75 2.75 0 0 0-2.75-2.75h-2a.75.75 0 0 0 0 1.5z" />
    <path d="M11.75 13c.69 0 1.25-.56 1.25-1.25v-2a.75.75 0 0 1 1.5 0v2a2.75 2.75 0 0 1-2.75 2.75h-2a.75.75 0 0 1 0-1.5z" />
    <path d="M4.25 13c-.69 0-1.25-.56-1.25-1.25v-2a.75.75 0 0 0-1.5 0v2a2.75 2.75 0 0 0 2.75 2.75h2a.75.75 0 0 0 0-1.5z" />
  </>
);

const linkIcon = (
  <path
    fillRule="evenodd"
    d="M13.842 2.176a3.746 3.746 0 0 0-5.298 0l-2.116 2.116a3.75 3.75 0 0 0 .01 5.313l.338.337a.751.751 0 0 0 1.057-1.064l-.339-.338a2.25 2.25 0 0 1-.005-3.187l2.116-2.117a2.247 2.247 0 1 1 3.173 3.18l-1.052 1.048a.749.749 0 1 0 1.057 1.063l1.053-1.047a3.745 3.745 0 0 0 .006-5.304m-11.664 11.67a3.75 3.75 0 0 0 5.304 0l2.121-2.122a3.75 3.75 0 0 0 0-5.303l-.362-.362a.749.749 0 1 0-1.06 1.06l.361.363c.88.878.88 2.303 0 3.182l-2.12 2.121a2.25 2.25 0 0 1-3.183-3.182l1.07-1.069a.75.75 0 0 0-1.062-1.06l-1.069 1.068a3.75 3.75 0 0 0 0 5.304"
  />
);

const folderIcon = (
  <path
    fillRule="evenodd"
    d="M3.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25v-4.5c0-.69-.56-1.25-1.25-1.25h-3.382a1.75 1.75 0 0 1-1.565-.967l-.171-.342a1.25 1.25 0 0 0-1.118-.691zm-2.75 1.25a2.75 2.75 0 0 1 2.75-2.75h2.264c1.042 0 1.994.589 2.46 1.52l.17.342c.043.084.13.138.224.138h3.382a2.75 2.75 0 0 1 2.75 2.75v4.5a2.75 2.75 0 0 1-2.75 2.75h-8.5a2.75 2.75 0 0 1-2.75-2.75z"
  />
);

const textAlignLeftIcon = (
  <>
    <path d="M1.75 2a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5z" />
    <path d="M2 5.5a.75.75 0 0 0 0 1.5h8a.75.75 0 0 0 0-1.5z" />
    <path d="M1 9.75a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5h-12.5a.75.75 0 0 1-.75-.75" />
    <path d="M2 12.5a.75.75 0 0 0 0 1.5h8a.75.75 0 0 0 0-1.5z" />
  </>
);

const buttonIcon = (
  <>
    <path d="M4.75 2a3.75 3.75 0 0 0-3.75 3.75v2.5a3.75 3.75 0 0 0 3.75 3.75h1.5a.75.75 0 0 0 0-1.5h-1.5a2.25 2.25 0 0 1-2.25-2.25v-2.5a2.25 2.25 0 0 1 2.25-2.25h6.5a2.25 2.25 0 0 1 2.25 2.25v.5a.75.75 0 0 0 1.5 0v-.5a3.75 3.75 0 0 0-3.75-3.75z" />
    <path d="M7.464 6.464a.75.75 0 0 1 .78-.176l6.01 2.12a.752.752 0 0 1 .282 1.238l-1.238 1.238 1.414 1.414a.75.75 0 0 1 0 1.06l-.353.354a.75.75 0 0 1-1.06 0l-1.415-1.414-1.238 1.238a.75.75 0 0 1-.696.2.75.75 0 0 1-.541-.481l-2.121-6.01a.75.75 0 0 1 .176-.78Z" />
  </>
);

const layoutBlockIcon = (
  <>
    <path d="M3 4.25c0-.69.56-1.25 1.25-1.25h2a.75.75 0 0 0 0-1.5h-2a2.75 2.75 0 0 0-2.75 2.75v2a.75.75 0 0 0 1.5 0z" />
    <path d="M11.75 3c.69 0 1.25.56 1.25 1.25v2a.75.75 0 0 0 1.5 0v-2a2.75 2.75 0 0 0-2.75-2.75h-2a.75.75 0 0 0 0 1.5z" />
    <path d="M11.75 13c.69 0 1.25-.56 1.25-1.25v-2a.75.75 0 0 1 1.5 0v2a2.75 2.75 0 0 1-2.75 2.75h-2a.75.75 0 0 1 0-1.5z" />
    <path d="M4.25 13c-.69 0-1.25-.56-1.25-1.25v-2a.75.75 0 0 0-1.5 0v2a2.75 2.75 0 0 0 2.75 2.75h2a.75.75 0 0 0 0-1.5z" />
  </>
);

const imageIcon = (
  <path
    fillRule="evenodd"
    d="M2.5 2A1.5 1.5 0 0 0 1 3.5v9A1.5 1.5 0 0 0 2.5 14h11a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 13.5 2zm.5 1.5h10a.5.5 0 0 1 .5.5v.69l-2.72-2.72-2.19 2.19-1.37-1.37L2.5 6.31v-2.81a.5.5 0 0 1 .5-.5m-1 5.81 2.72-2.72 4.1 4.1 2.47-2.47 2.21 2.21v.57a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5zM6 5.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"
  />
);

/**
 * Shopify-style icon set for common block types, mirroring the reference
 * sidebar tree. Falls back to the registered block icon, then to a generic
 * layout icon (used for newly added blocks).
 */
const OUTLINE_TYPE_ICONS: Record<string, React.ReactNode> = {
  Logo: logoIcon,
  Navbar: linkIcon,
  Nav: linkIcon,
  Navigation: linkIcon,
  Menu: linkIcon,
  Link: linkIcon,
  Box: folderIcon,
  Container: folderIcon,
  Group: folderIcon,
  Row: folderIcon,
  Column: folderIcon,
  Heading: textAlignLeftIcon,
  Text: textAlignLeftIcon,
  Paragraph: textAlignLeftIcon,
  RichText: textAlignLeftIcon,
  Button: buttonIcon,
  Image: imageIcon,
};

export const TypeIcon: React.FC<Props> = (props) => {
  const mapped = OUTLINE_TYPE_ICONS[props.type];
  if (mapped) {
    return <OutlineIcon>{mapped}</OutlineIcon>;
  }

  const allChaiBlocks = useRegisteredChaiBlocks();
  const blockIcon: any = get(allChaiBlocks, [props.type, "icon"]);

  if (blockIcon) {
    return React.createElement(blockIcon, { className: ICON_CLASS });
  }

  // * Fallback Icon
  return <OutlineIcon>{layoutBlockIcon}</OutlineIcon>;
};