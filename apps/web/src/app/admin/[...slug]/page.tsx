import { redirect } from 'next/navigation';

export default async function AdminSlugFallbackPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  let path = slug && slug.length > 0 ? slug.join('/') : '';
  if (path === 'calender' || path === 'master-calendar' || path === 'master-calender') {
    path = 'calendar';
  }
  redirect(`/hotelflora/admin${path ? `/${path}` : ''}`);
}
