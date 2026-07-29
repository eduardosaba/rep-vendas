export class SlugService {
  /**
   * Generates a normalized slug from a text string.
   * Example: "Ótica São José" -> "otica-sao-jose"
   */
  static generate(text: string): string {
    return text
      .toString()
      .normalize('NFD') // split an accented letter in the base letter and the accent
      .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 -]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
      .replace(/\s+/g, '-') // separator
      .replace(/-+/g, '-'); // replace multiple slashes with one
  }

  /**
   * Normalizes an existing slug to ensure it follows the correct format.
   * Mostly for sanitization.
   */
  static normalize(slug: string): string {
    return this.generate(slug);
  }

  /**
   * Ensures a slug is unique by appending a suffix if it already exists.
   * Example: "otica-sao-jose" -> "otica-sao-jose-2" -> "otica-sao-jose-3"
   */
  static async ensureUnique(
    baseSlug: string,
    checkExists: (slug: string) => Promise<boolean>
  ): Promise<string> {
    const slug = this.normalize(baseSlug);
    let isUnique = !(await checkExists(slug));
    
    if (isUnique) {
      return slug;
    }

    let suffix = 2;
    let newSlug = `${slug}-${suffix}`;
    isUnique = !(await checkExists(newSlug));

    while (!isUnique) {
      suffix++;
      newSlug = `${slug}-${suffix}`;
      isUnique = !(await checkExists(newSlug));
    }

    return newSlug;
  }
}
