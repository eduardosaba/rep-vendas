import { parseCSV, generateCSVTemplate } from '@/lib/csv-parser';

describe('csv-parser', () => {
  describe('parseCSV', () => {
    it('parses simple CSV with headers', () => {
      const csv = 'name,price,brand\nProduct A,100.50,Brand X\nProduct B,200.00,Brand Y';
      const result = parseCSV(csv);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Product A',
        price: '100.50',
        brand: 'Brand X',
      });
      expect(result[1]).toEqual({
        name: 'Product B',
        price: '200.00',
        brand: 'Brand Y',
      });
    });

    it('handles quoted fields with commas', () => {
      const csv = 'name,description\n"Product, With Comma","Description with, comma"';
      const result = parseCSV(csv);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Product, With Comma');
      expect(result[0].description).toBe('Description with, comma');
    });

    it('handles empty lines', () => {
      const csv = 'name,price\n\nProduct A,100\n\nProduct B,200\n';
      const result = parseCSV(csv);
      
      expect(result).toHaveLength(2);
    });

    it('handles different case headers', () => {
      const csv = 'NAME,PRICE,BRAND\nProduct A,100,Brand X';
      const result = parseCSV(csv);
      
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('price');
      expect(result[0]).toHaveProperty('brand');
    });

    it('returns empty array for empty CSV', () => {
      const result = parseCSV('');
      expect(result).toEqual([]);
    });

    it('returns empty array for headers only', () => {
      const result = parseCSV('name,price');
      expect(result).toEqual([]);
    });

    it('trims whitespace from values', () => {
      const csv = 'name , price \n Product A , 100 ';
      const result = parseCSV(csv);
      
      expect(result[0].name).toBe('Product A');
      expect(result[0].price).toBe('100');
    });

    it('handles escaped quotes', () => {
      const csv = 'name,description\n"Product ""Quoted""","Desc"';
      const result = parseCSV(csv);
      
      expect(result[0].name).toBe('Product "Quoted"');
    });
  });

  describe('generateCSVTemplate', () => {
    it('generates template with expected headers', () => {
      const template = generateCSVTemplate();
      const lines = template.trim().split('\n');
      
      expect(lines).toHaveLength(2);
      
      const headers = lines[0].split(',');
      expect(headers).toContain('name');
      expect(headers).toContain('reference_code');
      expect(headers).toContain('price');
      expect(headers).toContain('cost');
      expect(headers).toContain('brand');
      expect(headers).toContain('category');
    });

    it('includes example row', () => {
      const template = generateCSVTemplate();
      const lines = template.trim().split('\n');
      
      const example = lines[1].split(',');
      expect(example[0]).toBe('Armação Ray Vision RV001');
    });
  });
});