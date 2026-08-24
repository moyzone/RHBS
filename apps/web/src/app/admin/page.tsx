import { redirect } from 'next/navigation';

export default function AdminFallbackPage() {
  redirect('/hotelflora/admin');
}
