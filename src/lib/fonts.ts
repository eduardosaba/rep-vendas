export const SYSTEM_FONTS = [
  {
    name: 'Inter',
    family:
      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    stylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&display=swap',
  },
  {
    name: 'Roboto',
    family: 'Roboto, sans-serif',
    stylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700;900&display=swap',
  },
  {
    name: 'Open Sans',
    family: 'Open Sans, sans-serif',
    stylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;700;800&display=swap',
  },
  {
    name: 'Montserrat',
    family: 'Montserrat, sans-serif',
    stylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;900&display=swap',
  },
  {
    name: 'Poppins',
    family: 'Poppins, sans-serif',
    stylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;700;900&display=swap',
  },
  {
    name: 'Lato',
    family: 'Lato, sans-serif',
    stylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap',
  },
  {
    name: 'Raleway',
    family: 'Raleway, sans-serif',
    stylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;700;900&display=swap',
  },
  {
    name: 'Ubuntu',
    family: 'Ubuntu, sans-serif',
    stylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;700&display=swap',
  },
  {
    name: 'Bebas Neue',
    family: 'Bebas Neue, sans-serif',
    stylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
  },
  {
    name: 'Playfair Display',
    family: 'Playfair Display, serif',
    stylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap',
  },
];

export type SystemFont = (typeof SYSTEM_FONTS)[number];

export function getFontStylesheetUrl(fontName?: string | null) {
  if (!fontName) return null;

  const font = SYSTEM_FONTS.find(
    (item) => item.name.toLowerCase() === fontName.toLowerCase()
  );

  return font?.stylesheetUrl || null;
}

export function getFontFamily(fontName?: string | null) {
  if (!fontName) {
    return SYSTEM_FONTS[0].family;
  }

  const font = SYSTEM_FONTS.find(
    (item) => item.name.toLowerCase() === fontName.toLowerCase()
  );

  return font?.family || SYSTEM_FONTS[0].family;
}
