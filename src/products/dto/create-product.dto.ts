export class CreateProductDto {
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  slug: string;
  categoryIds: string[];
  brand?: string;
  images?: string[];
  variants: {
    sku: string;
    attributes: { size?: string; color?: string };
    price: number;
    compareAtPrice?: number;
    stock: number;
  }[];
}
