import RumorRoom from '@/components/Game';
export default function Home() {
  const liveEnabled =
    process.env.RUMOR_STATIC_EXPORT !== '1' &&
    process.env.AI_ENABLED === 'true' &&
    !!process.env.OPENROUTER_API_KEY &&
    !!process.env.APP_ORIGIN;
  return <RumorRoom liveEnabled={liveEnabled} />;
}
