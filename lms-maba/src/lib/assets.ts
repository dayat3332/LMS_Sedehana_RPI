/**
 * Centralized 2D RPG asset paths and URL resolver.
 */

export const HERO_BG_SRC = "/public/assets/background_login dan register.jpeg";
export const LOBBY_BG_SRC = "/public/assets/background lobby/castle bg full 1000x740px.png";

export const UI_BUTTON_SHEET = "/public/assets/asset/20251029darkDwellersButtonB1-Sheet.png";
export const UI_SCROLL_BANNER_SHEET = "/public/assets/asset/20251029darkDwellersButtonD1-Sheet.png";
export const UI_HEADER_PURPLE = "/public/assets/asset/20251117darkDwellersHeaderA.png";
export const UI_HEADER_GOTHIC_BLUE = "/public/assets/asset/20251117darkDwellersHeaderB.png";
export const UI_HEADER_GOTHIC_SLATE = "/public/assets/asset/20251117darkDwellersHeaderC.png";
export const UI_HEADER_GOTHIC_GOLD = "/public/assets/asset/20251117darkDwellersHeaderD.png";
export const UI_HEADER_GOTHIC_CRIMSON = "/public/assets/asset/20251117darkDwellersHeaderE.png";
export const UI_SKULL_BAR = "/public/assets/asset/20251118darkDwellersBarE.png";
export const UI_PORTRAIT_ARCH = "/public/assets/asset/20251125portraitFrameC.png";
export const UI_PANEL_9SLICE = "/public/assets/asset/20251029darkDwellers9SlicesE.png";
export const UI_PANEL_9SLICE_ALT = "/public/assets/asset/20251029darkDwellers9SlicesC.png";
export const UI_CLOSE_BTN_SHEET = "/public/assets/asset/20251125closeButton1-Sheet.png";
export const UI_TARGET_FRAME_SHEET = "/public/assets/asset/20251118darkDwellersCursourA1-Sheet.png";
export const UI_CURSOR_HORIZ_SHEET =
  "/public/assets/asset/20251118darkDwellersHorizontalCursourD1-Sheet.png";
export const UI_CURSOR_VERT_SHEET =
  "/public/assets/asset/20251118darkDwellersVerticalCursourD1-Sheet.png";
export const UI_COMPASS = "/public/assets/asset/20251125compass.png";

export const CHECKBOX_CHECKED =
  "/public/assets/DEMO_Cozy_UI_Pack_doboui/Checkboxes/Checkbox2_checked.png";
export const CHECKBOX_CHECKED_ALT =
  "/public/assets/DEMO_Cozy_UI_Pack_doboui/Checkboxes/Checkbox2_checked2.png";
export const CHECKBOX_UNCHECKED =
  "/public/assets/DEMO_Cozy_UI_Pack_doboui/Checkboxes/Checkbox2_unchecked.png";

/**
 * Resolves `/public/assets/...` or `/assets/...` to a browser-ready URL
 * with spaces encoded.
 */
export const resolveAssetSrc = (src: string): string =>
  encodeURI(src.replace(/^\/public(?=\/)/, ""));
