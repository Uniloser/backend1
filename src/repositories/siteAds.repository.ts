import { getSupabaseAdmin } from '../config/supabase';

export async function findActiveAd() {
	const { data, error } = await getSupabaseAdmin()
		.from('site_ads')
		.select('id,title,message,bold_text,cta_text,cta_url,presentation')
		.eq('status', 'active')
		.lte('starts_at', new Date().toISOString())
		.or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) throw error;
	return data;
}

type ActiveSiteAd = {
 id: string;
 title: string;
 message: string;
 bold_text: string | null;
 cta_text: string;
 cta_url: string;
 presentation: unknown;
};

export async function findActiveAds(): Promise<ActiveSiteAd[]> {
 const now = new Date().toISOString();
 const { data, error } = await getSupabaseAdmin()
  .from('site_ads')
  .select('id,title,message,bold_text,cta_text,cta_url,presentation')
  .eq('status', 'active').lte('starts_at', now)
  .or(`ends_at.is.null,ends_at.gte.${now}`)
  .order('created_at', { ascending: false }).limit(20);
 if (error) throw error;
 return data ?? [];
}
