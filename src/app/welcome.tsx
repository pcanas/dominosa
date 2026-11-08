import { TutorialScreen } from '@/ui/tutorial/TutorialScreen';

/** The tutorial the first time the app opens (the home screen opens it, see `useTutorialDue`). */
export default function WelcomeRoute() {
  return <TutorialScreen mode="welcome" />;
}
