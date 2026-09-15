import { permanentRedirect } from 'next/navigation';

export default function LongVideosAliasPage() {
  permanentRedirect('/videos');
}
