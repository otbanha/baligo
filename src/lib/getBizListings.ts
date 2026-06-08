export interface BizListing {
  category: string;
  nameZh: string;
  nameEn: string;
  area: string;
  address?: string;
  description: string;
  photoUrl: string;
  googleMap: string;
  contactType: string;
  contactVal: string;
  whatsapp: string;
  instagram: string;
  hours: string;
  featured: boolean;
  chineseServices: string[];
}

export async function getBizListings(): Promise<BizListing[]> {
  const url = import.meta.env.BIZ_API_URL;
  if (!url) return [];
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as unknown;
    return Array.isArray(data) ? (data as BizListing[]) : [];
  } catch {
    return [];
  }
}
